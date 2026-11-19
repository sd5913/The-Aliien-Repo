import { test, expect } from '@playwright/test';
import { mockApp, owner } from './fixtures.mjs';

test('image upload previews the photo and removal only clears the form reference', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/create');
  await expect(page.getByLabel('投票標題')).toBeVisible();
  const data = await page.evaluate(() => { const c = document.createElement('canvas'); c.width=20;c.height=20; c.getContext('2d').fillRect(0,0,20,20); return c.toDataURL('image/png').split(',')[1]; });
  state.image = Buffer.from(data, 'base64');
  await page.getByLabel('選項 1 的圖片檔案', { exact: true }).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: state.image });
  await expect(page.getByAltText('選項 1 圖片預覽')).toBeVisible();
  expect(state.calls.find((call) => call.name === 'image_upload').path).toContain(`/poll-images/${owner}/`);
  await expect(page.getByLabel('選項 1 的相機檔案')).toHaveAttribute('capture', 'environment');
  await page.getByRole('button', { name: '移除選項 1 的圖片' }).click();
  await expect(page.getByAltText('選項 1 圖片預覽')).toHaveCount(0);
  expect(state.calls.filter((call) => call.name === 'image_upload')).toHaveLength(1);
});

test('non-image files fail without making an upload request', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/create');
  await page.getByLabel('選項 1 的圖片檔案', { exact: true }).setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('not a photo') });
  await expect(page.getByRole('alert')).toContainText('請選擇 JPG');
  expect(state.calls.some((call) => call.name === 'image_upload')).toBe(false);
});
