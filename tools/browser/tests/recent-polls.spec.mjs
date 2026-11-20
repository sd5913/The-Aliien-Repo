import { test, expect } from '@playwright/test';
import { mockApp, pollId } from './fixtures.mjs';

test('public square is visible to visitors, but viewing a poll does not put it in recent polls', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '还没有最近投票' })).toBeVisible();
  await expect(page.locator('.home-square').getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  expect(state.requests.some((request) => request.path === '/rest/v1/polls' && new URLSearchParams(request.search).get('is_public') === 'eq.true')).toBe(true);
  await page.goto(`/poll/${pollId}/results`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '还没有最近投票' })).toBeVisible();
  await expect(page.locator('.home-recent:not(.home-square)').getByRole('heading', { name: '浏览器测试投票' })).toHaveCount(0);
});

test('poll loading failures use the generic message and icon-only retry controls', async ({ page }) => {
  await mockApp(page);
  await page.route('**/rest/v1/polls*', (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'database unavailable' }),
  }));
  await page.goto('/');
  await expect(page.getByText('投票加载失败，请稍后重试。').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '重试加载' })).toHaveCount(2);
  await expect(page.getByText(/Supabase 配置/)).toHaveCount(0);
});

test('older polls stay out of the square until their owner chooses public', async ({ page }) => {
  const state = await mockApp(page);
  state.polls[0].is_public = false;
  state.polls[0].visibility_reviewed_at = null;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '广场还没有公开投票' })).toBeVisible();
  await expect(page.locator('.home-square .poll-card-list')).toHaveCount(0);
  await page.goto('/settings');
  await expect(page.getByText('这条旧投票目前不在广场展示。请选择是否公开。')).toBeVisible();
  await page.getByRole('button', { name: '公开到广场' }).click();
  await expect(page.getByText('投票已公开到广场')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.home-square').getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
});

test('personal page loads owned polls in pages and filters on the server', async ({ page }) => {
  const state = await mockApp(page);
  const example = state.polls[0];
  state.polls = Array.from({ length: 25 }, (_, index) => ({
    ...example,
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    title: `投票 ${index + 1}`,
    status: index === 24 ? 'closed' : 'open',
    closed_at: index === 23 ? '2025-01-01T00:00:00Z' : null,
    created_at: new Date(Date.parse('2026-01-01T00:00:00Z') + index * 1000).toISOString(),
  }));
  await page.goto('/settings');
  await expect(page.locator('.my-poll-card')).toHaveCount(12);
  await page.getByRole('button', { name: '加载更多投票' }).scrollIntoViewIfNeeded();
  await expect(page.locator('.my-poll-card')).toHaveCount(24);
  await page.getByRole('button', { name: '加载更多投票' }).scrollIntoViewIfNeeded();
  await expect(page.locator('.my-poll-card')).toHaveCount(25);
  expect(state.requests.filter((request) => request.path === '/rest/v1/polls' && new URLSearchParams(request.search).get('offset') === '12').length).toBeGreaterThan(0);
  await page.getByRole('tab', { name: '已结束' }).click();
  await expect(page.locator('.my-poll-card')).toHaveCount(2);
  expect(state.requests.some((request) => request.path === '/rest/v1/polls' && new URLSearchParams(request.search).get('or')?.includes('status.eq.closed'))).toBe(true);
});
