import { test, expect } from '@playwright/test';
import { mockApp, pollId, optionB } from './fixtures.mjs';

const voter = '10000000-0000-4000-8000-000000000098';

test('guest browses, selects B, logs in, reloads and explicitly confirms once', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  const target = '/poll/' + pollId + '?returnTo=%2Fsettings#choice';
  await page.goto(target);
  await expect(page.getByLabel('说说你为甚么喜欢这个选项')).toHaveCount(0);
  await expect(page.locator('#vote-comment')).toBeDisabled();
  await page.getByRole('button', { name: '下一个选项' }).click();
  await page.getByRole('button', { name: '选择当前选项 B', exact: false }).click();
  await expect(page).toHaveURL(url => url.pathname === '/auth' && url.searchParams.get('returnTo') === target);
  await page.reload(); // A cancelled/failed login never consumes the pending choice.
  expect(state.calls.some(c => c.name === 'submit_ballot')).toBe(false);
  await state.signIn(voter);
  await expect(page).toHaveURL('http://127.0.0.1:5180' + target);
  await expect(page.getByRole('button', { name: '选择当前选项 B', exact: false })).toHaveAttribute('aria-pressed', 'true');
  expect(state.calls.some(c => c.name === 'submit_ballot')).toBe(false);
  await page.reload();
  await expect(page.getByRole('button', { name: '选择当前选项 B', exact: false })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '提交我的选择' }).click();
  await expect(page).toHaveURL(new RegExp('/poll/' + pollId + '/results'));
  expect(state.calls.filter(c => c.name === 'submit_ballot')).toHaveLength(1);
  expect(state.votes[0]).toMatchObject({ voter_id: voter, ranking: [optionB] });
  expect(state.calls.some(c => c.name === 'register_participant')).toBe(false);
});

test('old soft identity is a guest and cannot edit its profile or comment', async ({ page }) => {
  const state = await mockApp(page, { accountId: null, closed: true });
  await page.addInitScript(() => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
    id: '70000000-0000-4000-8000-000000000001', nickname: '旧昵称', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
  })));
  state.comments = [{ id: '80000000-0000-4000-8000-000000000001', poll_id: pollId,
    voter_id: '70000000-0000-4000-8000-000000000001', nickname: '旧昵称', avatar: '🐱', body: '旧的评论', created_at: new Date().toISOString() }];
  await page.goto('/poll/' + pollId);
  await expect(page).toHaveURL(new RegExp('/results'));
  await expect(page.getByText('旧的评论', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /编辑留言|删除留言/ })).toHaveCount(0);
  await page.goto('/settings');
  await expect(page.getByText('未登录', { exact: true })).toBeVisible();
  await page.goto('/edit-profile');
  await expect(page).toHaveURL(url => url.pathname === '/auth');
  expect(state.calls.some(c => ['submit_ballot', 'register_participant', 'update_comment', 'delete_comment'].includes(c.name))).toBe(false);
});

test('a poll ending during login shows results without submitting', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  await page.goto('/poll/' + pollId);
  await page.getByRole('button', { name: '选择当前选项 A', exact: false }).click();
  await expect(page).toHaveURL(url => url.pathname === '/auth');
  state.polls[0].status = 'closed';
  await state.signIn(voter);
  await expect(page).toHaveURL(new RegExp('/results'));
  expect(state.calls.some(c => c.name === 'submit_ballot')).toBe(false);
});

test('a removed option is not restored or submitted after login', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  await page.goto('/poll/' + pollId);
  await page.getByRole('button', { name: '下一个选项' }).click();
  await page.getByRole('button', { name: '选择当前选项 B', exact: false }).click();
  await expect(page).toHaveURL(url => url.pathname === '/auth');
  state.polls[0].poll_options.pop();
  await state.signIn(voter);
  await expect(page.getByRole('button', { name: '提交我的选择' })).toBeDisabled();
  expect(state.calls.some(c => c.name === 'submit_ballot')).toBe(false);
});

test('legacy join links open public voting without issuing an identity', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  await page.goto('/poll/' + pollId + '/join?returnTo=%2Fsettings');
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toBeVisible();
  await expect(page).toHaveURL(url => url.pathname === '/poll/' + pollId && url.searchParams.get('returnTo') === '/settings');
  expect(state.calls.some(c => c.name === 'register_participant')).toBe(false);
});

test('blocked draft storage still returns from login with the selected option', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('bothpls:draft:vote:')) throw new Error('Storage blocked');
      return setItem.call(this, key, value);
    };
  });
  await page.goto('/poll/' + pollId);
  await page.getByRole('button', { name: '下一个选项' }).click();
  await page.getByRole('button', { name: '选择当前选项 B', exact: false }).click();
  await expect(page).toHaveURL(url => url.pathname === '/auth');
  await state.signIn(voter);
  await expect(page.getByRole('button', { name: '选择当前选项 B', exact: false })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(url => url.pathname === '/poll/' + pollId && !url.searchParams.has('pendingChoice'));
  expect(state.calls.some(c => c.name === 'submit_ballot')).toBe(false);
});

test('account switches keep separate vote and comment drafts', async ({ page }) => {
  const state = await mockApp(page, { accountId: voter });
  await page.goto('/poll/' + pollId);
  await page.getByRole('button', { name: '选择当前选项 A', exact: false }).click();
  await page.locator('#vote-comment').fill('Only account A');
  await state.signIn('10000000-0000-4000-8000-000000000099');
  await expect(page.locator('#vote-comment')).toHaveValue('');
  await expect(page.getByRole('button', { name: '提交我的选择' })).toBeDisabled();
  await state.signIn(voter);
  await expect(page.locator('#vote-comment')).toHaveValue('Only account A');
  await expect(page.getByRole('button', { name: '选择当前选项 A', exact: false })).toHaveAttribute('aria-pressed', 'true');
  expect(state.calls.some(c => c.name === 'submit_ballot')).toBe(false);
});

test('signed-in accounts can open poll cards while legacy read RPCs are still deployed', async ({ page }) => {
  const state = await mockApp(page, { legacyAccountReads: true });
  await page.goto('/');
  await expect(page.locator('.home-recent:not(.home-square)').getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  await page.getByRole('tab', { name: '广场', exact: true }).click();
  await page.locator('.home-square').getByRole('heading', { name: '浏览器测试投票' }).click();
  await expect(page).toHaveURL(new RegExp('/poll/' + pollId));
  await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
  expect(state.calls.some(c => c.name === 'my_voted_polls')).toBe(true);
  expect(state.calls.some(c => c.name === 'own_comments')).toBe(true);
});
