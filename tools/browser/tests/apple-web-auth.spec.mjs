import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

const authorizeUrl = 'https://*.supabase.co/auth/v1/authorize**';

test('Apple web button follows the HIG layout and starts Supabase OAuth', async ({ page }) => {
  await mockApp(page, { accountId: null });
  const consent = 'http://127.0.0.1:5180/mock-apple-consent';
  await page.route(authorizeUrl, route => route.fulfill({ status: 302, headers: { location: consent } }));
  await page.goto('/auth?returnTo=' + encodeURIComponent('/create?id=example'));

  const apple = page.getByRole('button', { name: '通过 Apple 登录' });
  const github = page.getByRole('button', { name: '使用 GitHub 登录' });
  await expect(apple).toBeVisible();
  await expect(apple).toBeInViewport();
  const appleBox = await apple.boundingBox();
  const githubBox = await github.boundingBox();
  expect(appleBox.width).toBeGreaterThanOrEqual(140);
  expect(appleBox.height).toBeGreaterThanOrEqual(30);
  expect(appleBox.height).toBeGreaterThanOrEqual(githubBox.height);
  expect(appleBox.y).toBeLessThan(githubBox.y);
  expect(await apple.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(0, 0, 0)');

  const request = page.waitForRequest(authorizeUrl);
  await apple.click();
  const url = new URL((await request).url());
  expect(url.searchParams.get('provider')).toBe('apple');
  const redirect = new URL(url.searchParams.get('redirect_to'));
  expect(redirect.origin).toBe(new URL(consent).origin);
  expect(redirect.pathname).toBe('/auth');
  expect(redirect.searchParams.get('returnTo')).toBe('/create?id=example');
});
