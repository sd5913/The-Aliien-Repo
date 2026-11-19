import { test, expect } from '@playwright/test';
import { mockApp, pollId } from './fixtures.mjs';

test('recent active poll opens voting directly for a participant', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  state.votes = [{ id: '90000000-0000-4000-8000-000000000001', poll_id: pollId, voter_id: '70000000-0000-4000-8000-000000000001', created_at: new Date().toISOString() }];
  await page.addInitScript((id) => {
    localStorage.setItem('bothpls:voter:v1', JSON.stringify({
      id: '70000000-0000-4000-8000-000000000001', nickname: '测试投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
    }));
  });
  await page.goto('/');
  await page.locator('.home-recent:not(.home-square)').getByRole('link', { name: '浏览器测试投票' }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}(\\?|$)`));
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  const comment = page.getByLabel('留句话吧');
  const submit = page.getByRole('button', { name: '提交修改' });
  expect(await comment.evaluate((element) => element.compareDocumentPosition(document.querySelector('.vote-cup-submit')) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
  await expect(submit).toHaveCSS('background-image', /linear-gradient/);
});

test('recent closed poll opens results', async ({ page }) => {
  const state = await mockApp(page, { accountId: null, closed: true });
  state.votes = [{ id: '90000000-0000-4000-8000-000000000001', poll_id: pollId, voter_id: '70000000-0000-4000-8000-000000000001', created_at: new Date().toISOString() }];
  await page.addInitScript(() => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
    id: '70000000-0000-4000-8000-000000000001', nickname: '测试投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
  })));
  await page.goto('/');
  await page.locator('.home-recent:not(.home-square)').getByRole('link', { name: '浏览器测试投票' }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
});
