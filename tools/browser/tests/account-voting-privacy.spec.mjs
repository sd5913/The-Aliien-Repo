import { test, expect } from '@playwright/test';
import { mockApp, pollId } from './fixtures.mjs';

test('signed-in account votes without opening the participant login page', async ({ page }) => {
  const state = await mockApp(page, { accountId: '10000000-0000-4000-8000-000000000099' });
  await page.goto(`/poll/${pollId}`);
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}(\\?|$)`));
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  expect(state.calls.some((call) => call.name === 'register_participant')).toBe(false);
});

test('new poll is private, appears in my polls and recent polls as its creator', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/create');
  await expect(page.getByRole('checkbox', { name: '公开投票', exact: false })).not.toBeChecked();
  await page.getByLabel('投票标题').fill('仅自己可见的投票');
  await page.getByRole('button', { name: '建立投票', exact: false }).click();
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toBeVisible();
  await expect(page.getByRole('button', { name: '复制链接', exact: false })).toBeVisible();
  expect(state.calls.find((call) => call.name === 'save_poll')?.body.p_poll.isPublic).toBe(false);
  await page.getByRole('button', { name: '关闭分享' }).click();
  await page.goto('/');
  await expect(page.locator('.home-recent:not(.home-square)').getByRole('heading', { name: '仅自己可见的投票' })).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: '仅自己可见的投票' })).toBeVisible();
});

test('unlisted link permits voting and the voter sees that poll in recent polls', async ({ page }) => {
  const state = await mockApp(page, { accountId: '10000000-0000-4000-8000-000000000099' });
  state.polls[0].is_public = false;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toHaveCount(0);
  await page.goto(`/poll/${pollId}`);
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  await page.getByRole('button', { name: '选择当前选项 A', exact: false }).click();
  await page.getByRole('button', { name: '提交我的选择' }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
});
