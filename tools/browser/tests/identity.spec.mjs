import { test, expect } from '@playwright/test';
import { mockApp, pollId } from './fixtures.mjs';

test('guest settings never display sample personal data or a logout button', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.goto('/settings/preferences');
  await expect(page.getByText('未登录', { exact: true })).toBeVisible();
  await expect(page.getByText('hello@bothpls.app')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /退出/ })).toHaveCount(0);
});

test('soft profile editing retains identity and logout clears readiness', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.addInitScript(() => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
    id: '70000000-0000-4000-8000-000000000001', nickname: '原投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
  })));
  await page.goto('/settings/preferences');
  await expect(page.getByLabel('昵称', { exact: true })).toHaveValue('原投票者');
  await page.getByLabel('昵称', { exact: true }).fill('新的投票者');
  await page.getByRole('button', { name: '保存个人资料' }).click();
  await expect(page.getByText('个人资料已保存')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bothpls:voter:v1')).nickname)).toBe('新的投票者');
  await page.getByRole('button', { name: '退出投票者身份' }).click();
  await expect(page.getByRole('link', { name: '登录 / 注册 →' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bothpls:voter:v1'))?.participantReady ?? false)).toBe(false);
});

test('account profile uses the real email and saves nickname into the account', async ({ page }) => {
  await mockApp(page);
  await page.goto('/settings/preferences');
  await expect(page.getByLabel('邮箱', { exact: false })).toHaveValue('test@example.invalid');
  await expect(page.getByLabel('邮箱', { exact: false })).toBeDisabled();
  await expect(page.getByLabel('昵称', { exact: true })).toHaveValue('测试账号');
  await page.getByLabel('昵称', { exact: true }).fill('更新的账号');
  await page.getByRole('button', { name: '保存个人资料' }).click();
  await expect(page.getByText('个人资料已保存')).toBeVisible();
  await page.getByRole('link', { name: '返回', exact: true }).click();
  await expect(page.getByText('更新的账号', { exact: true })).toBeVisible();
});

test('missing result close returns home without an invisible exit dialog or login redirect', async ({ page }) => {
  const state = await mockApp(page, { accountId: null }); state.polls = [];
  await page.goto(`/poll/${pollId}/results`);
  await expect(page.getByText('没有找到这次投票')).toBeVisible();
  await page.getByRole('link', { name: '关闭结果' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5180/');
});
