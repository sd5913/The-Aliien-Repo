import { test, expect } from '@playwright/test';
import { mockApp, owner, pollId, optionB } from './fixtures.mjs';

const participantId = '70000000-0000-4000-8000-000000000001';
async function softIdentity(page) {
  await page.addInitScript(id => localStorage.setItem('bothpls:voter:v1', JSON.stringify({
    id, nickname: '测试投票者', avatar: '🐱', participantReady: true, participantToken: 'c'.repeat(64),
  })), participantId);
}

async function closeToHome(page) {
  const identity = await page.evaluate(() => localStorage.getItem('bothpls:voter:v1'));
  await page.evaluate(() => {
    window.resultCloseCalls = 0;
    window.close = () => { window.resultCloseCalls++; };
  });
  const close = page.getByRole('link', { name: '关闭结果', exact: true });
  await expect(close).toHaveAttribute('href', '/');
  await close.click();
  await expect(page).toHaveURL(url => url.pathname === '/' && !url.search);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.resultCloseCalls)).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('bothpls:voter:v1'))).toBe(identity);
}

for (const closed of [false, true]) {
  for (const identity of ['guest', 'soft', 'owner', 'other-account']) {
    test(`${identity} closes ${closed ? 'ended' : 'active'} results directly to Home`, async ({ page }) => {
      await mockApp(page, { closed, accountId: identity === 'owner' ? owner
        : identity === 'other-account' ? '10000000-0000-4000-8000-000000000099' : null });
      if (identity === 'soft') await softIdentity(page);
      // Origin is deliberately personal center: close must still go Home.
      await page.goto(`/poll/${pollId}/results?returnTo=%2Fsettings`);
      await expect(page.getByRole('heading', { name: '浏览器测试投票' })).toBeVisible();
      await closeToHome(page);
      if (identity === 'owner' || identity === 'other-account') {
        await expect(page.getByRole('link', { name: /个人中心/ })).toBeVisible();
      }
    });
  }
}

test('submit, change vote and close retains the submitted ballot and browser identity', async ({ page }) => {
  const state = await mockApp(page, { accountId: '10000000-0000-4000-8000-000000000099' });
  await page.goto(`/poll/${pollId}?returnTo=%2Fsettings`);
  await page.getByRole('button', { name: '选择当前选项 A', exact: false }).click();
  expect(state.calls.filter(call => call.name === 'submit_ballot')).toHaveLength(0);
  await page.getByRole('button', { name: '提交我的选择' }).click();
  await page.getByRole('link', { name: '修改我的投票', exact: false }).click();
  await page.getByRole('button', { name: '下一个选项' }).click();
  await page.getByRole('button', { name: '选择当前选项 B', exact: false }).click();
  await page.getByRole('button', { name: '提交修改' }).click();
  await expect(page).toHaveURL(new RegExp('/poll/' + pollId + '/results'));
  await expect.poll(() => state.calls.filter(c => c.name === 'submit_ballot').length).toBe(2);
  const calls = state.calls.length;
  await closeToHome(page);
  expect(state.calls.slice(calls).filter(call => ['submit_ballot', 'delete_poll', 'close_poll'].includes(call.name))).toHaveLength(0);
  expect(state.votes).toHaveLength(1);
  expect(state.votes[0].ranking).toEqual([optionB]);
});

test('missing results still close directly to Home', async ({ page }) => {
  const state = await mockApp(page, { accountId: null });
  state.polls = [];
  await page.goto(`/poll/${pollId}/results?returnTo=%2Fsettings`);
  await expect(page.getByRole('heading', { name: '没有找到这次投票' })).toBeVisible();
  await closeToHome(page);
});

test('failed result loading still closes directly to Home', async ({ page }) => {
  await mockApp(page, { accountId: null });
  await page.route('**/rest/v1/polls?**', route => route.fulfill({
    status: 400, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'denied' }),
  }));
  await page.goto(`/poll/${pollId}/results?returnTo=%2Fsettings`);
  await expect(page.getByRole('alert')).toContainText('无法载入投票');
  await closeToHome(page);
});

test('results can be closed before their data arrives', async ({ page }) => {
  await mockApp(page, { accountId: null });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/rest/v1/polls?**', async route => {
    await pending;
    await route.fallback();
  });
  try {
    await page.goto(`/poll/${pollId}/results?returnTo=%2Fsettings`);
    await expect(page.getByText('正在加载投票…', { exact: true })).toBeVisible();
    await closeToHome(page);
  } finally { release(); }
});
