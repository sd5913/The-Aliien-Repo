import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

test('profile editor opened from the settings page returns to the settings page', async ({ page }) => {
  await mockApp(page);
  await page.goto('/settings/preferences');
  await page.getByText('个人资料', { exact: true }).click();
  await expect(page).toHaveURL(/\/edit-profile(\?.*)?$/);
  await page.getByRole('link', { name: '返回' }).click();
  await expect(page).toHaveURL(/\/settings\/preferences$/);
});

test('profile editor opened from the profile page returns to the profile page', async ({ page }) => {
  await mockApp(page);
  await page.goto('/settings');
  await page.locator('.profile-summary-editable').click();
  await expect(page).toHaveURL(/\/edit-profile(\?.*)?$/);
  await page.getByRole('link', { name: '返回' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test('saving the profile returns to the page the editor was opened from', async ({ page }) => {
  await mockApp(page);
  await page.goto('/settings/preferences');
  await page.getByText('个人资料', { exact: true }).click();
  await expect(page.getByLabel('昵称')).toHaveValue('测试账号');
  await page.getByLabel('昵称').fill('改过的昵称');
  await page.getByRole('button', { name: '保存个人资料' }).click();
  await expect(page).toHaveURL(/\/settings\/preferences$/);
});
