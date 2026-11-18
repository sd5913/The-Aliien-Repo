export const owner = '10000000-0000-4000-8000-000000000001';
export const pollId = '20000000-0000-4000-8000-000000000001';
export const optionA = '30000000-0000-4000-8000-000000000001';
export const optionB = '30000000-0000-4000-8000-000000000002';

// Browser/API contract tests use synthetic sessions and intercept every external
// request; they never authenticate or mutate production data.
export async function mockApp(page, { accountId = owner, closed = false } = {}) {
  const user = accountId ? { id: accountId, aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid',
    user_metadata: { nickname: '测试账号' }, app_metadata: {}, is_anonymous: false, created_at: '2026-01-01T00:00:00Z' } : null;
  const state = { calls: [], polls: [{ id: pollId, title: '浏览器测试投票', description: '测试说明', owner_id: owner,
    author_name: owner, status: closed ? 'closed' : 'open', is_public: true, closed_at: null, created_at: '2026-01-01T00:00:00Z',
    poll_options: [{ id: optionA, poll_id: pollId, label: '选项甲', position: 0 }, { id: optionB, poll_id: pollId, label: '选项乙', position: 1 }] }] };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: accountId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })}.${Buffer.from('synthetic-test-signature').toString('base64url')}`;
  await page.addInitScript(({ user, token }) => {
    if (user) localStorage.setItem('sb-zptfqvufzsvlzmkdcfeb-auth-token', JSON.stringify({ access_token: token,
      refresh_token: 'synthetic-refresh-token', expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: 'bearer', user }));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
  }, { user, token });
  await page.route('**/*', async (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    if (!url.hostname.endsWith('.supabase.co')) return route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    const reply = (data) => route.fulfill({ status: 200, headers, body: JSON.stringify(data) });
    if (url.pathname.startsWith('/storage/v1/object/') && request.method() === 'POST') {
      state.calls.push({ name: 'image_upload', path: url.pathname });
      return reply({ Key: url.pathname.split('/object/')[1] });
    }
    if (url.pathname.startsWith('/storage/v1/object/public/')) return route.fulfill({ status: 200, body: state.image ?? Buffer.alloc(0), contentType: 'image/png' });
    if (url.pathname === '/auth/v1/user') return reply(user);
    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.split('/').at(-1), body = request.postDataJSON();
      state.calls.push({ name, body });
      if (name === 'save_poll') {
        const poll = body.p_poll;
        state.polls = [{ ...poll, owner_id: accountId, author_name: accountId, created_at: poll.createdAt, closed_at: poll.endsAt ?? null,
          poll_options: poll.options.map((o,i) => ({ id: o.id, poll_id: poll.id, label: o.name, image_url: o.imageUrl, position: i })) }];
        return reply(poll.id);
      }
      if (name === 'close_poll') state.polls[0].status = 'closed';
      return reply(name === 'own_comments' ? [] : null);
    }
    if (url.pathname === '/rest/v1/polls') return reply(state.polls);
    if (url.pathname === '/rest/v1/votes') return reply(state.votes ?? []);
    return reply([]);
  });
  return state;
}
