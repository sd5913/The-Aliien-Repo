import { test, expect } from '@playwright/test';
import { mockApp, pollId } from './fixtures.mjs';

test('results request ballots and comments only for the selected poll', async ({ page }) => {
  const state = await mockApp(page);
  state.polls.push({ ...state.polls[0], id: '20000000-0000-4000-8000-000000000002' });
  await page.goto(`/poll/${pollId}/results`);
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();

  for (const [table, filter] of [['polls', 'id'], ['votes', 'poll_id'], ['poll_comments', 'poll_id']]) {
    const requests = state.requests.filter((request) => request.path === `/rest/v1/${table}`);
    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) {
      expect(new URLSearchParams(request.search).get(filter)).toBe(`eq.${pollId}`);
    }
  }
});

test('new polls render without fetching poll data, while editing reads metadata only', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/create');
  await expect(page.getByRole('textbox').first()).toBeVisible();
  expect(state.requests).toEqual([]);

  await page.goto(`/create?id=${pollId}`);
  await expect(page.getByRole('textbox').first()).toHaveValue('浏览器测试投票');
  expect(state.requests.length).toBeGreaterThan(0);
  for (const request of state.requests) {
    expect(request.path).toBe('/rest/v1/polls');
    expect(new URLSearchParams(request.search).get('id')).toBe(`eq.${pollId}`);
  }
});
