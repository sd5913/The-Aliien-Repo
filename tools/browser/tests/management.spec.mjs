import { test, expect } from '@playwright/test';
import { mockApp, pollId, optionA, optionB } from './fixtures.mjs';

test('ending requires confirmation and cancel never calls the API', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto(`/poll/${pollId}/results`);
  await page.getByRole('button', { name: '管理投票', exact: true }).click();
  await page.getByRole('button', { name: '结束投票', exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  expect(state.calls.filter((call) => call.name === 'close_poll')).toHaveLength(0);
  await page.getByRole('button', { name: '结束投票', exact: true }).click();
  await page.getByRole('button', { name: '确认结束', exact: true }).click();
  await expect(page.getByText('投票已结束，不能再提交或修改选择', { exact: false })).toBeVisible();
  expect(state.calls.filter((call) => call.name === 'close_poll')).toHaveLength(1);
});

test('copy publishes a new open poll with fresh option IDs and opens sharing', async ({ page }) => {
  const state = await mockApp(page, { closed: true });
  await page.goto(`/create?copy=${pollId}`);
  await expect(page.getByLabel('投票标题')).toHaveValue('浏览器测试投票');
  await page.getByRole('button', { name: '创建投票', exact: false }).click();
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toBeVisible();
  const saved = state.calls.find((call) => call.name === 'save_poll').body.p_poll;
  expect(saved.id).not.toBe(pollId);
  expect(saved.options.map((o) => o.id)).not.toContain(optionA);
  expect(saved.options.map((o) => o.id)).not.toContain(optionB);
  expect(saved.status).toBe('open'); expect(saved.votes).toEqual([]); expect(saved.comments).toEqual([]);
});

test('foreign account never receives the owner menu', async ({ page }) => {
  await mockApp(page, { accountId: '10000000-0000-4000-8000-000000000002' });
  await page.goto(`/poll/${pollId}/results`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await expect(page.getByRole('button', { name: '管理投票', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '分享结果' })).toHaveCount(0);
});

test('only the owner sees the bottom result share action and uploaded option photos', async ({ page }) => {
  const state = await mockApp(page);
  state.polls[0].poll_options[0].image_url = 'https://example.invalid/cat.png';
  await page.goto(`/poll/${pollId}/results`);
  const share = page.getByRole('button', { name: '分享结果' });
  await expect(share).toBeVisible();
  await expect(page.locator('.result-option-row').first().locator('img.result-option-image')).toHaveAttribute('src', 'https://example.invalid/cat.png');
  await expect(page.locator('.result-option-row').nth(1).locator('.result-color')).toBeVisible();
  await share.click();
  await expect(page.getByText('结果链接已复制')).toBeVisible();
});

test('foreign account cannot open result sharing via the creation query', async ({ page }) => {
  await mockApp(page, { accountId: '10000000-0000-4000-8000-000000000002' });
  await page.goto(`/poll/${pollId}/results?share=1`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '分享结果' })).toHaveCount(0);
});
