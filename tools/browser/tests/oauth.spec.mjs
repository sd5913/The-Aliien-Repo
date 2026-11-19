import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

test('GitHub OAuth works without filling in the email form and preserves the return path', async ({ page }) => {
  const destination = '/create?id=example#options';
  await mockApp(page, { accountId: null });
  const consentUrl = 'http://127.0.0.1:5180/mock-github-consent';
  await page.route('https://*.supabase.co/auth/v1/authorize**', (route) =>
    route.fulfill({ status: 302, headers: { location: consentUrl } }));
  await page.goto('/auth?returnTo=' + encodeURIComponent(destination));
  const authorize = page.waitForRequest('https://*.supabase.co/auth/v1/authorize**');
  await page.getByRole('button', { name: '使用 GitHub 登录' }).click();
  const url = new URL((await authorize).url());
  expect(url.searchParams.get('provider')).toBe('github');
  const callback = new URL(url.searchParams.get('redirect_to'));
  expect(callback.origin).toBe('http://127.0.0.1:5180');
  expect(callback.pathname).toBe('/auth');
  expect(callback.searchParams.get('returnTo')).toBe(destination);
  await expect(page).toHaveURL(consentUrl);
});

test('GitHub cancellation displays retry feedback and keeps email sign-in available', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.route('https://*.supabase.co/auth/v1/authorize**', async (route) => {
    const url = new URL(route.request().url());
    const callback = new URL(url.searchParams.get('redirect_to'));
    expect(callback.searchParams.get('returnTo')).toBe('/');
    callback.hash = 'error=access_denied&error_description=Sensitive+provider+detail';
    await route.fulfill({ status: 302, headers: { location: callback.href } });
  });
  await page.goto('/auth?returnTo=' + encodeURIComponent('//evil.test'));
  await page.getByRole('button', { name: '使用 GitHub 登录' }).click();
  await expect(page.getByRole('alert')).toHaveText('登录未完成，请重试。');
  await expect(page.getByRole('button', { name: '使用 GitHub 登录' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '发送登录链接' })).toBeEnabled();
  await expect(page.getByText('Sensitive provider detail')).toHaveCount(0);
});
