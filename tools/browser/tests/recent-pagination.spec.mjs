import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

async function seed(page) {
  const state = await mockApp(page, { closed: true });
  const base = state.polls[0];
  state.polls = Array.from({ length: 25 }, (_, index) => ({ ...base,
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    title: `历史投票 ${index + 1}`, created_at: new Date(Date.parse('2026-01-01') + index * 1000).toISOString(),
  }));
  return state;
}
const panel = page => page.locator('#home-recent-panel');

test('twenty-five owned polls use three replacement pages; focus retains the current page', async ({ page }) => {
  const state = await seed(page);
  await page.goto('/');
  await page.getByRole('tab', { name: '最近', exact: true }).click();
  await expect(panel(page).locator('.my-poll-card')).toHaveCount(10);
  await expect(panel(page).getByRole('button', { name: '上一页' })).toBeDisabled();
  await expect(panel(page).getByRole('link', { name: '历史投票 25', exact: true })).toBeVisible();
  await panel(page).getByRole('button', { name: '下一页' }).click();
  await expect(panel(page).getByText('第 2 页')).toBeVisible();
  await expect(panel(page).locator('.my-poll-card')).toHaveCount(10);
  await expect(panel(page).getByRole('link', { name: '历史投票 25', exact: true })).toHaveCount(0);
  await expect(panel(page).getByRole('link', { name: '历史投票 15', exact: true })).toBeVisible();
  const calls = state.calls.filter(call => call.name === 'recent_polls').length;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => state.calls.filter(call => call.name === 'recent_polls').length).toBeGreaterThan(calls);
  expect(state.calls.filter(call => call.name === 'recent_polls').at(-1).body.p_page).toBe(1);
  await expect(panel(page).getByText('第 2 页')).toBeVisible();
  await panel(page).getByRole('button', { name: '下一页' }).click();
  await expect(panel(page).locator('.my-poll-card')).toHaveCount(5);
  await expect(panel(page).getByRole('link', { name: '历史投票 1', exact: true })).toBeVisible();
  await expect(panel(page).getByRole('button', { name: '下一页' })).toBeDisabled();
  await panel(page).getByRole('button', { name: '上一页' }).click();
  await expect(panel(page).locator('.my-poll-card')).toHaveCount(10);
  await expect(panel(page).getByRole('link', { name: '历史投票 15', exact: true })).toBeVisible();
  expect(state.calls.filter(call => call.name === 'recent_polls').map(call => call.body.p_page)).toEqual([0, 1, 1, 2, 1]);
  expect(state.calls.filter(call => call.name === 'my_voted_polls')).toHaveLength(0);
});

test('a failed next page can retry that page or return to the previous page', async ({ page }) => {
  await seed(page);
  let fail = true;
  await page.route('**/rest/v1/rpc/recent_polls', route => {
    if (fail && route.request().postDataJSON().p_page === 1) return route.fulfill({
      status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'unavailable' }),
    });
    return route.fallback();
  });
  await page.goto('/');
  await page.getByRole('tab', { name: '最近', exact: true }).click();
  await panel(page).getByRole('button', { name: '下一页' }).click();
  await expect(panel(page).getByRole('alert')).toContainText('投票加载失败');
  fail = false;
  await panel(page).getByRole('button', { name: '重试加载' }).click();
  await expect(panel(page).locator('.my-poll-card')).toHaveCount(10);
  await expect(panel(page).getByText('第 2 页')).toBeVisible();
  await panel(page).getByRole('button', { name: '上一页' }).click();
  await expect(panel(page).getByText('第 1 页')).toBeVisible();
});

for (const [locale, next, pagination] of [['zh-CN', '下一页', '最近投票分页'], ['en-US', 'Next', 'Recent poll pages'], ['ko-KR', '다음', '최근 투표 페이지']]) {
  test(`pagination fits a 320px screen in ${locale}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await seed(page);
    await page.addInitScript(locale => localStorage.setItem('bothpls:locale', locale), locale);
    await page.goto('/');
    await page.locator('#home-recent-tab').click();
    const nav = page.getByRole('navigation', { name: pagination });
    await nav.getByRole('button', { name: next }).scrollIntoViewIfNeeded();
    await expect(nav).toBeVisible();
    expect(await nav.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('recent-pagination.png') });
  });
}
