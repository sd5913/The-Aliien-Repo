import { test, expect } from '@playwright/test';
import { mockApp, pollId } from './fixtures.mjs';

const publicOrigin = new URL(process.env.VITE_PUBLIC_APP_ORIGIN ?? 'https://bothpls.example').origin;
const pollPath = `/poll/${pollId}`;
const copiedUrl = publicOrigin + pollPath;

async function mockSharingBridge(page, value) {
  await page.addInitScript(value => {
    window.CapacitorCustomPlatform = { name: 'ios' };
    const clipboard = window.mockPollClipboard = { value, revision: 1, reads: [], shares: [] };
    window.Capacitor = {
      PluginHeaders: [{ name: 'PollSharing', methods: [
        ...['detectLink', 'readLink', 'share', 'removeListener'].map(name => ({ name, rtype: 'promise' })),
        { name: 'addListener', rtype: 'callback' },
      ] }],
      nativeCallback: (_plugin, _method, _options, callback) => {
        clipboard.foreground = callback;
        return Promise.resolve('foreground-listener');
      },
      nativePromise: async (_plugin, method, options) => {
        if (method === 'detectLink') return { hasLink: !!clipboard.value, revision: clipboard.revision };
        if (method === 'readLink') {
          clipboard.reads.push(options.revision);
          return options.revision === clipboard.revision ? { value: clipboard.value } : { changed: true };
        }
        if (method === 'share') clipboard.shares.push(options);
      },
    };
  }, value);
}

test('dismiss leaves the clipboard unread, and a new link opens only after consent', async ({ page }) => {
  await mockSharingBridge(page, copiedUrl);
  await mockApp(page, { accountId: null });
  await page.goto('/');
  const read = page.getByRole('button', { name: '读取并打开' });
  await expect(read).toBeVisible();
  await page.getByRole('button', { name: '暂不读取' }).click();
  await page.evaluate(() => window.mockPollClipboard.foreground());
  await expect(read).toHaveCount(0);
  expect(await page.evaluate(() => window.mockPollClipboard.reads)).toEqual([]);

  await page.evaluate(url => {
    window.mockPollClipboard.value = url + '?returnTo=//untrusted.invalid#fragment';
    window.mockPollClipboard.revision++;
    window.mockPollClipboard.foreground();
  }, copiedUrl);
  await read.click();
  await expect(page).toHaveURL(url => url.pathname === pollPath && !url.hash && !url.search);
  expect(await page.evaluate(() => window.mockPollClipboard.reads)).toEqual([2]);
});

test('outside URLs leave the current page open', async ({ page }) => {
  await mockSharingBridge(page, 'https://untrusted.invalid' + pollPath);
  await mockApp(page, { accountId: null });
  await page.goto('/');
  await page.getByRole('button', { name: '读取并打开' }).click();
  await expect(page.getByText('无法读取有效的 BothPls 投票链接。')).toBeVisible();
  await expect(page).toHaveURL('/');
});

test('iOS shares the public link and PNG through the system bridge', async ({ page }) => {
  await mockSharingBridge(page, null);
  await mockApp(page);
  await page.goto(pollPath + '/results');
  await page.getByRole('button', { name: '管理投票' }).click();
  await page.getByRole('button', { name: '分享投票' }).click();
  await page.getByRole('button', { name: '分享链接' }).click();
  await page.getByRole('button', { name: '分享票根' }).click();
  const shares = await page.evaluate(() => window.mockPollClipboard.shares);
  expect(shares).toEqual([{ url: copiedUrl }, { png: expect.stringMatching(/^iVBORw0KGgo/) }]);
  expect(await page.evaluate(() => window.shareClipboardWrites)).toEqual([]);
});
