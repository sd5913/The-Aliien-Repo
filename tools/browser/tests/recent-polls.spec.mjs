import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

test('home limits recent polls and requests counts without loading comments or ballots', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();

  const pollRequests = state.requests.filter((request) => request.path === '/rest/v1/polls');
  expect(pollRequests).toHaveLength(2);
  expect(pollRequests.every((request) => new URLSearchParams(request.search).get('limit') === '3')).toBe(true);
  expect(state.requests.filter((request) => request.path === '/rest/v1/votes')).toEqual([
    expect.objectContaining({ prefer: expect.stringContaining('count=exact') }),
  ]);
  expect(state.requests.some((request) => request.path === '/rest/v1/poll_comments')).toBe(false);
});
