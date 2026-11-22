import { test, expect } from '@playwright/test';
import { mockApp, owner, pollId } from './fixtures.mjs';

for (const accountId of [null, '10000000-0000-4000-8000-000000000099']) {
  test(`square cards only offer voting: ${accountId ?? 'guest'}`, async ({ page }) => {
    await mockApp(page, { accountId });
    await page.goto('/');
    await page.getByRole('tab', { name: '广场', exact: true }).click();
    const square = page.locator('.home-square');
    await expect(square.getByRole('link', { name: '去投票' })).toBeVisible();
    await expect(square.getByRole('button', { name: '分享投票' })).toHaveCount(0);
    await expect(square.locator('.swipe-actions')).toHaveCount(0);
    await expect(square.getByText('进行中 · 0 人参与', { exact: true })).toBeVisible();
    await square.getByRole('link', { name: '去投票' }).click();
    await expect(page).toHaveURL(url => [`/poll/${pollId}`, `/poll/${pollId}/join`].includes(url.pathname) && url.searchParams.get("returnTo") === "/");
    await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toHaveCount(0);
  });
}

test('non-owner cannot share public polls via voting, results or recent lists', async ({ page }) => {
  const state = await mockApp(page, { accountId: '10000000-0000-4000-8000-000000000099' });
  await page.goto(`/poll/${pollId}`);
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '分享投票' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '分享投票' })).toHaveCount(0);
  await page.getByRole('button', { name: '选择当前选项 A', exact: false }).click();
  await page.getByRole('button', { name: '提交我的选择' }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
  await expect(page.getByRole('button', { name: '分享结果' })).toHaveCount(0);
  await page.goto(`/poll/${pollId}/results?share=1`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toHaveCount(0);
  await page.goto('/');
  const recent = page.locator('.home-recent:not(.home-square)');
  await expect(recent.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await expect(recent.getByRole('button', { name: '分享投票' })).toHaveCount(0);
  expect(state.calls.some((call) => call.name === 'submit_ballot')).toBe(true);
});

test('another formal account has no public poll share action', async ({ page }) => {
  await mockApp(page, { accountId: '10000000-0000-4000-8000-000000000099' });
  await page.goto(`/poll/${pollId}`);
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '分享投票' })).toHaveCount(0);
});

test('owner square card opens results and exposes management and sharing, never voting', async ({ page }) => {
  await mockApp(page);
  await page.goto('/');
  await page.getByRole('tab', { name: '广场', exact: true }).click();
  const square = page.locator('.home-square');
  await expect(square.getByText('我建的')).toBeVisible();
  await expect(square.getByRole('link', { name: '查看结果' })).toBeVisible();
  await expect(square.getByRole('link', { name: '去投票' })).toHaveCount(0);
  await expect(square.locator('.swipe-actions')).toHaveCount(1);
  await square.getByRole('button', { name: '分享投票' }).click();
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toBeVisible();
  await page.getByRole('button', { name: '关闭分享' }).click();
  await square.getByRole('link', { name: '查看结果' }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
  await expect(page.locator('.result-vote-button')).toHaveCount(0);
  await expect(page.locator('#vote-comment')).toHaveCount(0);
  await page.getByRole('button', { name: '管理投票' }).click();
  const menu = page.getByRole('dialog', { name: '管理投票' });
  await expect(menu.getByRole('button', { name: '分享投票' })).toBeVisible();
  await expect(menu.getByRole('button', { name: '复制为新投票' })).toHaveCount(0);
  await menu.getByRole('button', { name: '分享投票' }).click();
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toBeVisible();
});

test('owner opening a vote link is redirected to results', async ({ page }) => {
  await mockApp(page);
  await page.goto(`/poll/${pollId}`);
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
  await expect(page.locator('.result-vote-button')).toHaveCount(0);
  await expect(page.locator('.vote-cup-submit')).toHaveCount(0);
  await expect(page.locator('#vote-comment')).toHaveCount(0);
});

test('taking a poll off the square does not give its participant a share entry', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  await page.goto(`/poll/${pollId}`);
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '分享投票' })).toHaveCount(0);
  state.polls[0].is_public = false;
  await page.reload();
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '分享投票' })).toHaveCount(0);
  await page.goto(`/poll/${pollId}/share`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await expect(page.getByRole('button', { name: /分享|复制链接/ })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toHaveCount(0);
});

test('non-owner legacy share route and ended results have no sharing entry or clipboard writes', async ({ page }) => {
  await mockApp(page, { accountId: null, closed: true });
  await page.goto(`/poll/${pollId}/share`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await expect(page.getByRole('button', { name: /分享|复制链接/ })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toHaveCount(0);
  expect(await page.evaluate(() => window.shareClipboardWrites)).toEqual([]);
});
