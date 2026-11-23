import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

test('personal page and profile editor show the same account profile', async ({ page }) => {
  await mockApp(page);
  await page.goto('/settings');
  await expect(page.getByText('测试账号', { exact: true })).toBeVisible();
  await page.goto('/edit-profile');
  await expect(page.getByLabel('昵称')).toHaveValue('测试账号');
});

test('profile saves even when the profiles table is not deployed', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/edit-profile');
  await expect(page.getByLabel('昵称')).toHaveValue('测试账号');
  await page.getByLabel('昵称').fill('更新的昵称');
  await page.getByLabel('简介').fill('更新的简介');
  await page.getByRole('button', { name: '保存个人资料' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText('更新的昵称', { exact: true })).toBeVisible();
  await expect(page.locator('.settings-feedback')).toHaveCount(0);
  expect(state.profileWrites.length).toBeGreaterThan(0);
  await page.locator('.profile-edit-entry').click();
  await expect(page.getByLabel('昵称')).toHaveValue('更新的昵称');
  await expect(page.getByLabel('简介')).toHaveValue('更新的简介');
});

test('uploaded avatar renders as an image on the personal page', async ({ page }) => {
  await mockApp(page, { avatar: 'https://cdn.example.com/avatar.png' });
  await page.goto('/settings');
  await expect(page.locator('.profile-avatar-image')).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');
});

test('tapping the avatar itself opens the picker and the upload lands in the profile', async ({ page }) => {
  await mockApp(page);
  await page.goto('/edit-profile');
  const avatarButton = page.getByRole('button', { name: '更换头像' });
  await expect(avatarButton).toBeVisible();
  await expect(page.getByText('选择头像', { exact: true })).toHaveCount(0);
  const chooserPromise = page.waitForEvent('filechooser');
  await avatarButton.click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'avatar.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await expect(page.locator('.avatar-edit-button img.profile-avatar')).toHaveAttribute('src', /\/poll-images\//);
  await page.getByRole('button', { name: '保存个人资料' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('.profile-avatar-image')).toHaveAttribute('src', /\/poll-images\//);
});
