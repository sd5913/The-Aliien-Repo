import { test, expect } from '@playwright/test';
import { mockApp, pollId, optionA } from './fixtures.mjs';

const participant = '10000000-0000-4000-8000-000000000099';
const recent = page => page.locator('#home-recent-panel');
async function openRecent(page) {
  await page.getByRole('tab', { name: '最近', exact: true }).click();
}

for (const ending of ['manual', 'expired', 'unlisted']) {
  test(`participated poll stays in recent after ${ending} ending and reload`, async ({ page }) => {
    const state = await mockApp(page, { accountId: participant });
    state.votes = [{ id: 'vote', poll_id: pollId, voter_id: participant,
      ranking: [optionA], created_at: '2026-01-02T00:00:00Z' }];
    state.polls.push({ ...state.polls[0], id: '20000000-0000-4000-8000-000000000002',
      title: '未参与的已结束投票', status: 'closed' });
    await page.goto('/');
    await openRecent(page);
    await expect(recent(page).locator('.my-poll-card')).toHaveCount(1);
    await expect(recent(page)).toContainText('我投的');
    await expect(recent(page)).toContainText('进行中');

    if (ending === 'expired') state.polls[0].closed_at = '2020-01-01T00:00:00Z';
    else state.polls[0].status = 'closed';
    if (ending === 'unlisted') state.polls[0].is_public = false;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(recent(page)).toContainText('已结束');
    await expect(recent(page).locator('.my-poll-card')).toHaveCount(1);
    await page.reload();
    await openRecent(page);
    await expect(recent(page).locator('.my-poll-card')).toHaveCount(1);
    await expect(recent(page)).toContainText('已结束');
    await expect(recent(page)).toContainText('我投的');

    await page.getByRole('tab', { name: '广场', exact: true }).click();
    await expect(page.locator('#home-square-panel .my-poll-card')).toHaveCount(0);
    await openRecent(page);
    await recent(page).getByRole('link', { name: '浏览器测试投票' }).click();
    await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
    await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
    await expect(page.getByRole('link', { name: '修改我的投票', exact: false })).toHaveCount(0);
  });
}

test('older ended participation remains available past five records and across recent pages', async ({ page }) => {
  const state = await mockApp(page, { accountId: participant });
  const base = state.polls[0];
  state.polls = Array.from({ length: 13 }, (_, index) => ({ ...base,
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    title: `已参与投票 ${index}`, status: 'closed', is_public: index !== 0,
  }));
  state.votes = state.polls.map((poll, index) => ({ id: `vote-${index}`, poll_id: poll.id,
    voter_id: participant, ranking: [optionA], created_at: new Date(Date.parse('2026-01-02T00:00:00Z') + index * 1000).toISOString() }));
  await page.goto('/');
  await openRecent(page);
  await expect(recent(page).locator('.my-poll-card')).toHaveCount(10);
  await recent(page).getByRole('button', { name: '载入更多投票' }).scrollIntoViewIfNeeded();
  await expect(recent(page).locator('.my-poll-card')).toHaveCount(13);
  await expect(recent(page).locator('.my-poll-card').first()).toContainText('已参与投票 12');
  await expect(recent(page).locator('.my-poll-card').last()).toContainText('已参与投票 0');
  await recent(page).getByRole('link', { name: '已参与投票 0', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
  await expect(page.getByRole('heading', { name: '已参与投票 0' })).toBeVisible();
});
