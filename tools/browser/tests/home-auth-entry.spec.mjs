import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

test('guest sees the registration banner and can dismiss it', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.goto('/');
  await expect(page.getByRole('complementary', { name: '注册或登录提示' })).toBeVisible();
  await page.getByRole('button', { name: '关闭注册提示' }).click();
  await expect(page.getByRole('complementary', { name: '注册或登录提示' })).toHaveCount(0);
});

test('soft participant sees the registration banner', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.addInitScript(() => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
    id: '70000000-0000-4000-8000-000000000001', nickname: '测试投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
  })));
  await page.goto('/');
  await expect(page.getByRole('complementary', { name: '注册或登录提示' })).toContainText('注册账号');
});

test('signed-in account does not see the registration banner', async ({ page }) => {
  await mockApp(page);
  await page.goto('/');
  await expect(page.getByRole('complementary', { name: '注册或登录提示' })).toHaveCount(0);
});

test('auth opens registration and one email submission sends one login or signup link', async ({ page }) => {
  await mockApp(page, { accountId: null });
  let otpRequests = 0;
  await page.route(/\/auth\/v1\/otp(?:\?|$)/, async (route) => {
    otpRequests++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/auth');
  await expect(page.getByRole('tab', { name: '注册' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('已有账户？')).toBeVisible();
  await page.getByRole('button', { name: '去登录' }).click();
  await expect(page.getByRole('tab', { name: '登录' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('还没有账户？')).toBeVisible();
  await page.getByRole('button', { name: '去注册' }).click();
  await page.getByLabel('邮箱').fill('friend@example.com');
  await page.getByRole('button', { name: '继续使用邮箱' }).click();
  await expect(page.getByRole('status')).toContainText('完成登录或注册');
  expect(otpRequests).toBe(1);
});
