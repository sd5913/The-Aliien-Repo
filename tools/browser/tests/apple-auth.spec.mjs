import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { mockApp, owner, pollId } from './fixtures.mjs';

const authorizeUrl = 'https://*.supabase.co/auth/v1/authorize**';
const tokenUrl = 'https://*.supabase.co/auth/v1/token?grant_type=id_token';
const appleLabel = '使用 Apple 登录';
const publicAppOrigin = process.env.VITE_PUBLIC_APP_ORIGIN ?? 'https://bothpls.example';

test('Apple web sign-in is hidden until enabled', async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_APPLE_WEB_AUTH === 'true');
  await mockApp(page, { accountId: null });
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: '使用 GitHub 登录' })).toBeVisible();
  await expect(page.getByRole('button', { name: appleLabel })).toHaveCount(0);
});

test.describe('configured Apple web sign-in', () => {
  test.skip(process.env.VITE_ENABLE_APPLE_WEB_AUTH !== 'true');

  test('starts OAuth with the existing same-origin return path', async ({ page }) => {
    const destination = '/create?id=example#options';
    await mockApp(page, { accountId: null });
    const consent = 'http://127.0.0.1:5180/mock-apple-consent';
    await page.route(authorizeUrl, route =>
      route.fulfill({ status: 302, headers: { location: consent } }));

    await page.goto('/auth?returnTo=' + encodeURIComponent(destination));
    const request = page.waitForRequest(authorizeUrl);
    await page.getByRole('button', { name: appleLabel }).click();
    const url = new URL((await request).url());
    expect(url.searchParams.get('provider')).toBe('apple');
    const redirect = new URL(url.searchParams.get('redirect_to'));
    expect(redirect.origin).toBe(new URL(page.url()).origin);
    expect(redirect.pathname).toBe('/auth');
    expect(redirect.searchParams.get('returnTo')).toBe(destination);
    await expect(page).toHaveURL(consent);
  });

  test('uses safe fallback and generic feedback after a cancelled callback', async ({ page }) => {
    await mockApp(page, { accountId: null });
    await page.route(authorizeUrl, route => {
      const redirect = new URL(new URL(route.request().url()).searchParams.get('redirect_to'));
      expect(redirect.searchParams.get('returnTo')).toBe('/');
      redirect.hash = 'error=access_denied&error_description=Private+provider+detail';
      return route.fulfill({ status: 302, headers: { location: redirect.href } });
    });

    await page.goto('/auth?returnTo=' + encodeURIComponent('/nested/..//outside.invalid'));
    await page.getByRole('button', { name: appleLabel }).click();
    await expect(page.getByRole('alert')).toHaveText('登录未完成，请重试。');
    await expect(page.getByRole('button', { name: appleLabel })).toBeEnabled();
    await expect(page.getByRole('button', { name: '发送登录链接' })).toBeEnabled();
    await expect(page.getByText('Private provider detail')).toHaveCount(0);
  });
});

async function mockNativeBridge(page, responses) {
  await page.addInitScript(values => {
    window.CapacitorCustomPlatform = { name: 'ios' };
    window.Capacitor = {
      PluginHeaders: [{ name: 'AppleSignIn', methods: [{ name: 'authorize', rtype: 'promise' }] }],
      nativePromise: async (plugin, method) => {
        if (plugin !== 'AppleSignIn' || method !== 'authorize') throw new Error('Unexpected call');
        return values.shift();
      },
    };
  }, responses);
}

test('the iOS adapter can cancel, retry, exchange the raw nonce, and restore its session', async ({ page }) => {
  const destination = '/settings?source=apple#account';
  const nonce = '1a'.repeat(32);
  const digest = createHash('sha256').update(nonce).digest('hex');
  const jwt = (claims) => [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'synthetic-signature'].join('.');
  const identityToken = jwt({ nonce: digest, aud: 'org.sd5913.bothpls' });
  await mockNativeBridge(page, [{ status: 'cancelled' }, { status: 'authorized', identityToken, nonce }]);
  await mockApp(page, { accountId: null });
  const grant = [];
  await page.route(tokenUrl, route => {
    grant.push(route.request().postDataJSON());
    return route.fulfill({ json: {
      access_token: jwt({ exp: Math.floor(Date.now() / 1000) + 3600, sub: owner }),
      refresh_token: 'synthetic-refresh-token', token_type: 'bearer', expires_in: 3600,
      user: { id: owner, email: 'apple@example.invalid', user_metadata: {}, app_metadata: {} },
    } });
  });
  const oauth = [];
  page.on('request', request => {
    if (request.url().includes('/auth/v1/authorize')) oauth.push(request.url());
  });

  await page.goto('/auth?returnTo=' + encodeURIComponent(destination));
  const apple = page.getByRole('button', { name: appleLabel });
  await apple.click();
  await expect(apple).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(grant).toHaveLength(0);
  await apple.click();
  await expect(page).toHaveURL(destination);
  expect(grant).toEqual([expect.objectContaining({ provider: 'apple', id_token: identityToken, nonce })]);
  expect(oauth).toHaveLength(0);

  await page.goto('/auth?returnTo=' + encodeURIComponent(destination));
  await expect(page).toHaveURL(destination);
  expect(grant).toHaveLength(1);
});

test('iOS points email and GitHub to an HTTPS browser session with a sanitized return path', async ({ page, context }) => {
  await mockNativeBridge(page, []);
  await mockApp(page, { accountId: null });
  await page.goto('/auth?returnTo=' + encodeURIComponent('//outside.invalid'));
  await expect(page.getByRole('button', { name: appleLabel })).toBeVisible();
  await expect(page.getByRole('button', { name: '使用 GitHub 登录' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '发送登录链接' })).toHaveCount(0);
  const browserLink = page.getByRole('link', { name: '在浏览器中使用邮箱或 GitHub' });
  const callback = new URL(await browserLink.getAttribute('href'));
  expect(callback.origin).toBe(publicAppOrigin);
  expect(callback.pathname).toBe('/auth');
  expect(callback.searchParams.get('returnTo')).toBe('/');
  await expect(browserLink).toHaveAttribute('target', '_blank');
  await context.route(callback.href, route => route.fulfill({ body: 'Mock BothPls website' }));
  const popup = context.waitForEvent('page');
  await browserLink.click();
  await expect(await popup).toHaveURL(callback.href);
  await expect(page).toHaveURL(/127\.0\.0\.1:5180\/auth/);
  await expect(page.getByRole('button', { name: appleLabel })).toBeEnabled();
});

test('iOS poll shares point to the public website', async ({ page }) => {
  await mockNativeBridge(page, []);
  await mockApp(page);
  await page.goto('/poll/' + pollId + '/results');
  await page.getByRole('button', { name: '分享投票' }).click();
  await expect(page.getByRole('textbox', { name: '投票分享链接' }))
    .toHaveValue(publicAppOrigin + '/poll/' + pollId);
});
