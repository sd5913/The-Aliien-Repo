import { test, expect } from '@playwright/test';
import { mockApp, optionA, pollId } from './fixtures.mjs';

const language = (page) => page.getByRole('combobox').and(page.locator('.language-select'));
const sharedPoll = `/poll/${pollId}`;

test('changing language during editing keeps the route, account and original content', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto(`/create?id=${pollId}`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-HK');
  await expect(page.locator('#poll-title')).toHaveValue('浏览器测试投票');
  const draft = '午餐 {title} · 점심 <3';
  await page.locator('#poll-title').fill(draft);
  await language(page).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Edit poll' })).toBeVisible();
  await language(page).selectOption('ko-KR');
  await expect(page.getByRole('heading', { name: '투표 수정' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko-KR');
  await expect(page.locator('#poll-title')).toHaveValue(draft);
  await expect(page.getByRole('textbox', { name: '선택지 1 이름' })).toHaveValue('选项甲');
  await expect(page).toHaveURL(new RegExp(`/create\\?id=${pollId}$`));
  expect(state.calls.filter(({ name }) => name === 'save_poll')).toHaveLength(0);
  await page.getByRole('button', { name: /변경 사항 저장/ }).click();
  await expect.poll(() => state.calls.find(({ name }) => name === 'save_poll')?.body.p_poll.title).toBe(draft);
  expect(state.calls.find(({ name }) => name === 'save_poll').body.p_poll.options.map(({ name }) => name)).toEqual(['选项甲', '选项乙']);
});

test('a guest shared link retains language, nickname, vote and comment across switching and reload', async ({ page }, info) => {
  const state = await mockApp(page, { accountId: null });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(sharedPoll);
  await expect(page).toHaveURL(new RegExp(`${sharedPoll}/join\\?returnTo=%2F$`));
  await expect(page.getByRole('heading', { name: '以投票者身份參與' })).toBeVisible();
  await language(page).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Join as a voter' })).toBeVisible();
  await page.getByLabel('Nickname', { exact: true }).fill('茶💜둘');
  await language(page).selectOption('ko-KR');
  await expect(page.getByRole('heading', { name: '투표에 참여하기' })).toBeVisible();
  await expect(page.getByLabel('닉네임', { exact: true })).toHaveValue('茶💜둘');
  await expect(page.getByRole('button', { name: '참여하기', exact: true })).toBeInViewport();
  expect(await page.locator('html').evaluate((element) => element.scrollWidth)).toBe(320);
  await page.screenshot({ path: info.outputPath('guest-join-ko.png') });
  expect(state.calls).toHaveLength(0);
  await page.getByRole('button', { name: '참여하기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await page.getByRole('button', { name: '선택지 A 선택: 选项甲' }).click();
  const comment = '좋아요 {name} · 我喜歡';
  await page.locator('#vote-comment').fill(comment);
  await language(page).selectOption('en');
  await expect(page.getByRole('button', { name: 'Select option A: 选项甲' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#vote-comment')).toHaveValue(comment);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Select option A: 选项甲' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#vote-comment')).toHaveValue(comment);
  expect(state.calls.filter(({ name }) => name === 'submit_ballot')).toHaveLength(0);
  await page.getByRole('button', { name: 'Submit my vote' }).click();
  await expect.poll(() => state.calls.find(({ name }) => name === 'submit_ballot')?.body.p_comment).toBe(comment);
  expect(state.calls.find(({ name }) => name === 'submit_ballot').body).toMatchObject({
    p_nickname: '茶💜둘', p_ranking: [optionA],
  });
});

test('guest results localize dates and counts while displaying the original poll and comments', async ({ page }, info) => {
  const state = await mockApp(page, { accountId: null, closed: true });
  const comment = '따뜻한 색 · 暖色';
  const nickname = '明日 {name}';
  const createdAt = '2026-04-02T12:00:00Z';
  state.comments = [{
    id: 'comment-1', poll_id: pollId, voter_id: 'guest', nickname, avatar: '🐱',
    body: comment, option_id: optionA, created_at: createdAt,
  }];
  state.votes = [{ id: 'vote-1', poll_id: pollId, voter_id: 'guest', ranking: [optionA], created_at: createdAt }];

  await page.goto(sharedPoll);
  await expect(page).toHaveURL(new RegExp(`${sharedPoll}/results\\?returnTo=%2F$`));
  for (const [locale, resultTitle, participantCount, voteCount] of [
    ['zh-HK', '投票結果', '1 位朋友參與', '1 票'],
    ['en', 'Poll results', '1 friend voted', '1 vote'],
    ['ko-KR', '투표 결과', '친구 1명 참여', '1표'],
  ]) {
    await language(page).selectOption(locale);
    await expect(page.getByRole('heading', { name: resultTitle })).toBeVisible();
    await expect(page.getByText(participantCount, { exact: false })).toBeVisible();
    await expect(page.getByText(`${voteCount} · 100%`)).toBeVisible();
    await expect(page.getByText(comment, { exact: true })).toBeVisible();
    await expect(page.getByText(nickname, { exact: true })).toBeVisible();
    await expect(page.getByText('A 选项甲')).toBeVisible();
    const expectedDate = await page.evaluate(({ createdAt, locale }) =>
      new Date(createdAt).toLocaleDateString(locale, { month: 'numeric', day: 'numeric' }), { createdAt, locale });
    await expect(page.locator('time')).toHaveText(expectedDate);
  }
  await page.screenshot({ path: info.outputPath('results-ko.png') });
  expect(state.calls).toHaveLength(0);
});

test('the share PNG and its accessible text switch languages without changing the link or title', async ({ page }, info) => {
  await mockApp(page);
  await page.addInitScript(() => {
    window.ticketText = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, ...args) {
      if (this.canvas.width === 720) window.ticketText.push(String(value));
      return fillText.call(this, value, ...args);
    };
  });
  await page.goto(`${sharedPoll}/results?share=1`);
  const dialog = page.getByRole('dialog');
  const image = dialog.getByRole('img');
  await expect(image).toHaveAttribute('src', /^data:image\/png/);
  const originalImage = await image.getAttribute('src');
  await dialog.getByRole('combobox').selectOption('en');
  await expect(image).toHaveAccessibleName('Share ticket for “浏览器测试投票” with 2 options');
  await expect(image).not.toHaveAttribute('src', originalImage);
  await expect(dialog.getByRole('textbox', { name: 'Public poll link' })).toHaveValue(`http://127.0.0.1:5180${sharedPoll}`);
  await dialog.getByRole('combobox').selectOption('ko-KR');
  await expect(image).toHaveAccessibleName('‘浏览器测试投票’ 공유 티켓, 선택지 2개');
  expect(await page.evaluate(() => window.ticketText)).toEqual(expect.arrayContaining([
    '掃描二維碼，幫我選一選', 'Scan to help me choose', '스캔하고 골라 주세요', '浏览器测试投票', '选项甲', '选项乙',
  ]));
  await page.screenshot({ path: info.outputPath('share-ko.png') });
});

test('language persists from home to auth and updates metadata and validation', async ({ page }, info) => {
  await mockApp(page, { accountId: null });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await expect(page).toHaveTitle('BothPls — 和朋友一起選');
  await language(page).selectOption('en');
  await expect(page).toHaveTitle('BothPls — Decide with friends');
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /^Can't decide/);
  for (const heading of await page.locator('.step-card h3').all()) {
    expect(await heading.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
      await heading.evaluate((element) => element.clientWidth),
    );
  }
  await page.screenshot({ path: info.outputPath('home-en.png') });
  await page.getByRole('link', { name: /Sign in \/ Sign up/ }).click();
  await expect(page.getByRole('button', { name: 'Sign in with GitHub' })).toBeVisible();
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByRole('status')).toHaveText('Enter your email address.');
  await language(page).selectOption('ko-KR');
  await expect(page.getByRole('status')).toHaveText('이메일 주소를 입력해 주세요.');
  await expect(page).toHaveTitle('BothPls — 친구와 함께 골라요');
  await page.screenshot({ path: info.outputPath('auth-ko.png') });
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeVisible();
});
