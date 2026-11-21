import { test, expect } from '@playwright/test';
import { mockApp, owner, pollId, optionA, optionB } from './fixtures.mjs';

test('create draft survives a reload and clears after successful publishing', async ({ page }) => {
  await mockApp(page);
  await page.goto('/create');
  await page.getByLabel('投票標題').fill('未提交的草稿');
  await page.getByLabel('选项 1 名称').fill('草稿选项甲');
  await page.getByLabel('选项 2 名称').fill('草稿选项乙');
  await page.reload();
  await expect(page.getByLabel('投票標題')).toHaveValue('未提交的草稿');
  await expect(page.getByLabel('选项 1 名称')).toHaveValue('草稿选项甲');
  await page.getByRole('button', { name: '建立投票', exact: false }).click();
  await expect(page.getByRole('dialog', { name: '把选择分享出去' })).toBeVisible();
  expect(await page.evaluate((id) => localStorage.getItem(`bothpls:draft:create:${id}:new`), owner)).toBeNull();
});

test('voter selection and optional comment survive a reload', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.addInitScript(() => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
    id: '70000000-0000-4000-8000-000000000001', nickname: '测试投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
  })));
  await page.goto(`/poll/${pollId}`);
  await page.getByRole('button', { name: '选择当前选项 A', exact: false }).click();
  await page.getByLabel('说说你为甚么喜欢这个选项', { exact: false }).fill('还没有提交的理由');
  await page.reload();
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('说说你为甚么喜欢这个选项', { exact: false })).toHaveValue('还没有提交的理由');
});

test('visible results refresh and announce ties and leaders', async ({ page }) => {
  await page.clock.install();
  const state = await mockApp(page);
  await page.goto(`/poll/${pollId}/results`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  const vote = (id, option) => ({ id, poll_id: pollId, voter_id: id, ranking: [option], created_at: '2026-01-01T00:00:00Z' });
  state.votes = [vote('a', optionA), vote('b', optionB)];
  await page.clock.fastForward(10050);
  await expect(page.getByText('A及B 並列領先')).toBeVisible();
  state.votes.push(vote('c', optionA));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('A 目前領先')).toBeVisible();
});

test('deadline changes the open result to a locked result without a reload', async ({ page }) => {
  await page.clock.install();
  const state = await mockApp(page);
  state.polls[0].closed_at = new Date(Date.now() + 2000).toISOString();
  await page.goto(`/poll/${pollId}/results`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await page.clock.fastForward(2500);
  await expect(page.getByText('投票已结束，不能提交或修改选择', { exact: false })).toBeVisible();
});
