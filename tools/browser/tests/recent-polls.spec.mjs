import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

test('home limits recent polls and requests counts without loading comments or ballots', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();

  const pollRequests = state.requests.filter((request) => request.path === '/rest/v1/polls');
  expect(pollRequests.length).toBeGreaterThan(0);
  expect(pollRequests.every((request) => new URLSearchParams(request.search).get('limit') === '5')).toBe(true);
  expect(pollRequests.every((request) => new URLSearchParams(request.search).get('select')?.includes('votes(count)'))).toBe(true);
  expect(state.requests.some((request) => request.path === '/rest/v1/votes')).toBe(false);
  expect(state.requests.some((request) => request.path === '/rest/v1/poll_comments')).toBe(false);
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
