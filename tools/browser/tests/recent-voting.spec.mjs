import { test, expect } from '@playwright/test';
import { mockApp, pollId } from './fixtures.mjs';

test('recent active poll opens voting directly for a participant', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.addInitScript(() => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
    id: '70000000-0000-4000-8000-000000000001', nickname: '测试投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
  })));
  await page.goto('/');
  await page.getByRole('link', { name: '浏览器测试投票' }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}(\\?|$)`));
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
});

test('recent closed poll opens results', async ({ page }) => {
  await mockApp(page, { accountId: null, closed: true });
  await page.goto('/');
  await page.getByRole('link', { name: '浏览器测试投票' }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
});
