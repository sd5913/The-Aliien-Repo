import { test, expect } from '@playwright/test';
import { mockApp, owner, pollId } from './fixtures.mjs';

test('guest recent is empty, square is a separate panel, keyboard tabs work', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.goto('/');
  await expect(page.getByRole('tab', { name: '最近', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: '还没有最近投票' })).toBeVisible();
  await expect(page.locator('.home-square')).toBeHidden();
  await page.getByRole('tab', { name: '最近', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '广场', exact: true })).toBeFocused();
  await expect(page.locator('#home-recent-panel')).toBeHidden();
  await expect(page.getByRole('link', { name: '去投票', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '分享投票' })).toHaveCount(0);
  await page.keyboard.press('Home');
  await expect(page.getByRole('heading', { name: '还没有最近投票' })).toBeVisible();
});

test('recent merges created and voted polls with activity order, badges and no duplicate', async ({ page }) => {
  const state = await mockApp(page);
  const base = state.polls[0];
  const votedId = '20000000-0000-4000-8000-000000000002';
  state.polls.push({ ...base, id: votedId, owner_id: 'other', title: '旧题最近参与', created_at: '2025-01-01T00:00:00Z' });
  state.votes = [pollId, votedId].map((id, index) => ({ id: `vote-${index}`, poll_id: id,
    voter_id: '70000000-0000-4000-8000-000000000001', ranking: [],
    created_at: index ? '2026-11-22T00:00:00Z' : '2026-01-02T00:00:00Z' }));
  await page.addInitScript(() => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
    id: '70000000-0000-4000-8000-000000000001', nickname: '测试投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
  })));
  await page.goto('/');
  const cards = page.locator('#home-recent-panel .my-poll-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('旧题最近参与');
  await expect(cards.first()).toContainText('我投的');
  await expect(cards.last()).toContainText('我建的');
  await expect(cards.last()).toContainText('我投的');
  expect(base.owner_id).toBe(owner);
});

for (const soft of [false, true]) {
  test(`quick create returns through auth for ${soft ? 'soft identity' : 'guest'}`, async ({ page }) => {
    await mockApp(page, { accountId: null });
    if (soft) await page.addInitScript(() => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
      id: '70000000-0000-4000-8000-000000000001', nickname: '测试投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
    })));
    await page.goto('/');
    await page.locator('.home-welcome').getByRole('link', { name: '发起一个投票', exact: false }).click();
    await expect(page).toHaveURL(url => url.pathname === '/auth' && url.searchParams.get('returnTo') === '/create');
  });
}

test('square excludes private, manually ended and expired polls before publication ordering', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  const base = state.polls[0];
  state.polls = [
    { ...base, title: '较早公开', created_at: '2026-01-01T00:00:00Z' },
    { ...base, id: '20000000-0000-4000-8000-000000000002', title: '最新公开', created_at: '2026-02-01T00:00:00Z' },
    { ...base, id: '20000000-0000-4000-8000-000000000003', title: '非公开', is_public: false },
    { ...base, id: '20000000-0000-4000-8000-000000000004', title: '手动结束', status: 'closed' },
    { ...base, id: '20000000-0000-4000-8000-000000000005', title: '已过期', closed_at: '2025-01-01T00:00:00Z' },
  ];
  await page.goto('/');
  await page.getByRole('tab', { name: '广场', exact: true }).click();
  const cards = page.locator('.home-square .my-poll-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('最新公开');
  await expect(cards.last()).toContainText('较早公开');
  await expect(page.locator('.home-square').getByRole('link', { name: '去投票', exact: false })).toHaveCount(2);
});
