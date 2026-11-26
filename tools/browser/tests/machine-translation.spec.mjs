import { test, expect } from '@playwright/test';
import { mockApp, pollId, optionA, owner } from './fixtures.mjs';

async function setup(page, { locale = 'zh-CN', accountId = null } = {}) {
  const state = await mockApp(page, { accountId });
  state.polls[0].title = '週末の予定'; state.polls[0].description = '¿Qué prefieres?';
  state.polls[0].poll_options[0].label = '散步'; state.polls[0].poll_options[1].label = '커피';
  state.translationCalls = 0;
  await page.addInitScript(locale => localStorage.setItem('bothpls:locale', locale), locale);
  await page.route('**/functions/v1/translate-poll', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    state.translationCalls++;
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    const row = state.polls[0];
    const sourceKey = JSON.stringify({ title: row.title, description: row.description,
      options: row.poll_options.map(o => ({ id: o.id, name: o.label })) });
    await route.fulfill({ status: state.fail ? 502 : 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json',
      body: JSON.stringify(state.fail ? { error: 'TRANSLATION_FAILED' } : { sourceKey: state.stale ? 'old' : sourceKey,
        title: row.title === '新しい質問' ? 'Updated question' : 'Weekend plans', description: 'What do you prefer?',
        options: row.poll_options.map((o, i) => ({ id: o.id, name: i ? 'Coffee' : 'Take a walk' })) }) });
  });
  return state;
}
for (const locale of ['zh-CN', 'en-US', 'ko-KR']) {
  test(`automatic full English translation and original toggle with ${locale} UI`, async ({ page }, info) => {
    const state = await setup(page, { locale });
    await page.goto(`/poll/${pollId}`);
    await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('Weekend plans');
    await expect(page.locator('.voting-title p')).toHaveText('What do you prefer?');
    await expect(page.locator('.text-option-content strong')).toHaveText('Take a walk');
    await page.locator('.carousel-arrow-next').click();
    await expect(page.locator('.text-option-content strong')).toHaveText('Coffee');
    await page.locator('.poll-translation button').click();
    await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('週末の予定');
    await expect(page.locator('.text-option-content strong')).toHaveText('커피');
    await page.locator('.poll-translation button').click();
    await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('Weekend plans');
    expect(state.translationCalls).toBe(1);
    await page.screenshot({ path: info.outputPath(`translation-${locale}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
test('failure keeps original usable and retry succeeds', async ({ page }) => {
  const state = await setup(page); state.fail = true;
  await page.goto(`/poll/${pollId}`);
  await expect(page.locator('.poll-translation')).toContainText('翻译暂不可用');
  await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('週末の予定');
  state.fail = false; await page.getByRole('button', { name: '重试翻译' }).click();
  await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('Weekend plans');
});
test('stale provider response cannot replace current content', async ({ page }) => {
  const state = await setup(page); state.stale = true;
  await page.goto(`/poll/${pollId}`);
  await expect(page.locator('.poll-translation')).toContainText('翻译暂不可用');
  await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('週末の予定');
});
test('translated voting submits original option ID and results reuse translation', async ({ page }) => {
  const state = await setup(page, { accountId: '10000000-0000-4000-8000-000000000002' });
  await page.goto(`/poll/${pollId}`);
  await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('Weekend plans');
  await page.locator('.vote-cup-confirm').click();
  await page.locator('.vote-cup-submit').click();
  await expect(page).toHaveURL(/\/results(?:\?|$)/);
  await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('Weekend plans');
  await expect(page.locator('.result-option-row strong').first()).toContainText('Take a walk');
  expect(state.calls.find(c => c.name === 'submit_ballot').body.p_ranking).toEqual([optionA]);
  expect(state.calls.filter(c => c.name === 'save_poll')).toHaveLength(0);
  expect(state.translationCalls).toBe(1);
});
test('card translation toggle does not navigate and source edits invalidate cache', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.locator('.my-poll-card h3').first()).toHaveText('Weekend plans');
  await page.locator('.poll-translation button').first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.my-poll-card h3').first()).toHaveText('週末の予定');
  state.polls[0].title = '新しい質問';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.my-poll-card h3').first()).toHaveText('Updated question');
  expect(state.translationCalls).toBe(2);
});
test('translation pending does not block viewing or selecting an option', async ({ page }) => {
  const state = await setup(page, { accountId: '10000000-0000-4000-8000-000000000002' }); state.delay = 2500;
  await page.goto(`/poll/${pollId}`);
  await expect(page.locator('.poll-translation')).toContainText('正在翻译');
  await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('週末の予定');
  await page.locator('.vote-cup-confirm').click();
  await expect(page.locator('.vote-cup-submit')).toBeEnabled();
  await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('Weekend plans');
  await expect(page.locator('.vote-cup-confirm')).toHaveAttribute('aria-pressed', 'true');
});
test('owner edits original fields after viewing translated results', async ({ page }) => {
  const state = await setup(page, { accountId: owner });
  await page.goto(`/poll/${pollId}/results`);
  await expect(page.locator('.voting-title h1, .results-heading h1')).toHaveText('Weekend plans');
  await page.goto(`/create?id=${pollId}`);
  await expect(page.locator('#poll-title')).toHaveValue('週末の予定');
  expect(state.calls.filter(c => c.name === 'save_poll')).toHaveLength(0);
  expect(state.translationCalls).toBe(1);
});
