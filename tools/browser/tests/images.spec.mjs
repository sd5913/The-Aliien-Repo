import { test, expect } from '@playwright/test';
import { mockApp, owner } from './fixtures.mjs';

test('image upload previews the photo and removal only clears the form reference', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/create');
  await expect(page.getByLabel('投票标题')).toBeVisible();
  const data = await page.evaluate(() => { const c = document.createElement('canvas'); c.width=20;c.height=20; c.getContext('2d').fillRect(0,0,20,20); return c.toDataURL('image/png').split(',')[1]; });
  state.image = Buffer.from(data, 'base64');
  await page.getByLabel('选项 1 图片文件', { exact: true }).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: state.image });
  await expect(page.getByAltText('选项 1 图片预览')).toBeVisible();
  expect(state.calls.find((call) => call.name === 'image_upload').path).toContain(`/poll-images/${owner}/`);
  await expect(page.getByLabel('选项 1 相机文件')).toHaveAttribute('capture', 'environment');
  await page.getByRole('button', { name: '移除选项 1 图片' }).click();
  await expect(page.getByAltText('选项 1 图片预览')).toHaveCount(0);
  expect(state.calls.filter((call) => call.name === 'image_upload')).toHaveLength(1);
});

test('non-image files fail without making an upload request', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/create');
  await page.getByLabel('选项 1 图片文件', { exact: true }).setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('not a photo') });
  await expect(page.getByRole('alert')).toContainText('请选择 JPG');
  expect(state.calls.some((call) => call.name === 'image_upload')).toBe(false);
});
