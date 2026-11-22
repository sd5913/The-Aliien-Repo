export const owner = '10000000-0000-4000-8000-000000000001';
export const pollId = '20000000-0000-4000-8000-000000000001';
export const optionA = '30000000-0000-4000-8000-000000000001';
export const optionB = '30000000-0000-4000-8000-000000000002';

// Browser/API contract tests use synthetic sessions and intercept every external
// request; they never authenticate or mutate production data.
export async function mockApp(page, { accountId = owner, closed = false } = {}) {
  const user = accountId ? { id: accountId, aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid',
    user_metadata: { nickname: '测试账号' }, app_metadata: {}, is_anonymous: false, created_at: '2026-01-01T00:00:00Z' } : null;
  const state = { calls: [], requests: [], polls: [{ id: pollId, title: '浏览器测试投票', description: '测试说明', owner_id: owner,
    author_name: owner, status: closed ? 'closed' : 'open', is_public: true, visibility_reviewed_at: '2026-11-20T00:00:00Z', closed_at: null, created_at: '2026-01-01T00:00:00Z',
    poll_options: [{ id: optionA, poll_id: pollId, label: '选项甲', position: 0 }, { id: optionB, poll_id: pollId, label: '选项乙', position: 1 }] }] };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: accountId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })}.${Buffer.from('synthetic-test-signature').toString('base64url')}`;
  const project = new URL(process.env.VITE_SUPABASE_URL ?? 'https://zptfqvufzsvlzmkdcfeb.supabase.co').hostname.split('.')[0];
  const storageKey = 'sb-' + project + '-auth-token';
  await page.addInitScript(({ user, token, storageKey }) => {
    if (user) localStorage.setItem(storageKey, JSON.stringify({ access_token: token,
      refresh_token: 'synthetic-refresh-token', expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: 'bearer', user }));
    window.shareClipboardWrites = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value) => { window.shareClipboardWrites.push(value); },
    } });
  }, { user, token, storageKey });
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
    if (url.pathname === '/auth/v1/user') {
      if (request.method() === 'PUT' && user) user.user_metadata = { ...user.user_metadata, ...request.postDataJSON().data };
      return reply(user);
    }
    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.split('/').at(-1), body = request.postDataJSON();
      state.calls.push({ name, body });
      if (name === 'save_poll') {
        const poll = body.p_poll;
        state.polls = [{ ...poll, is_public: poll.isPublic ?? false, visibility_reviewed_at: new Date().toISOString(), owner_id: accountId, author_name: accountId, created_at: poll.createdAt, closed_at: poll.endsAt ?? null,
          poll_options: poll.options.map((o,i) => ({ id: o.id, poll_id: poll.id, label: o.name, image_url: o.imageUrl, position: i })) }];
        return reply(poll.id);
      }
      if (name === 'close_poll') state.polls[0].status = 'closed';
      if (name === 'set_poll_visibility') {
        const poll = state.polls.find((item) => item.id === body.p_poll_id && item.owner_id === accountId);
        if (poll) { poll.is_public = body.p_public; poll.visibility_reviewed_at = new Date().toISOString(); }
        return reply(null);
      }
      if (name === 'register_participant') return reply('70000000-0000-4000-8000-000000000001');
      if (name === 'get_poll_by_link') {
        const poll = state.polls.find((item) => item.id === body.p_poll_id);
        return reply(poll ? { poll, votes: (state.votes ?? []).filter((vote) => vote.poll_id === poll.id), comments: [] } : null);
      }
      if (name === 'my_voted_polls') {
        const votes = (state.votes ?? []).filter((vote) => vote.voter_id === body.p_voter_id);
        const latestVoteByPoll = new Map(votes.map((vote) => [vote.poll_id, vote.created_at]));
        return reply(state.polls.filter((poll) => latestVoteByPoll.has(poll.id)).map((poll) => ({
          ...poll, last_voted_at: latestVoteByPoll.get(poll.id),
          votes: [{ count: (state.votes ?? []).filter((vote) => vote.poll_id === poll.id).length }],
        })));
      }
      if (name === 'submit_ballot') {
        const vote = { id: '90000000-0000-4000-8000-000000000001', poll_id: body.p_poll_id, voter_id: body.p_voter_id, ranking: body.p_ranking, created_at: new Date().toISOString() };
        state.votes = [...(state.votes ?? []).filter((item) => item.poll_id !== vote.poll_id || item.voter_id !== vote.voter_id), vote];
        return reply(null);
      }
      return reply(name === 'own_comments' ? [] : null);
    }
    if (url.pathname.startsWith('/rest/v1/')) state.requests.push({ path: url.pathname, search: url.search, prefer: request.headers().prefer });
    if (url.pathname === '/rest/v1/polls') {
      let rows = state.polls;
      const idFilter = url.searchParams.get('id');
      if (idFilter?.startsWith('eq.')) rows = rows.filter((poll) => poll.id === idFilter.slice(3));
      const ownerFilter = url.searchParams.get('owner_id');
      const publicFilter = url.searchParams.get('is_public');
      const statusFilter = url.searchParams.get('status');
      const orFilter = url.searchParams.get('or');
      if (ownerFilter?.startsWith('eq.')) rows = rows.filter((poll) => poll.owner_id === ownerFilter.slice(3));
      rows = rows.filter((poll) => poll.is_public || poll.owner_id === accountId);
      if (publicFilter?.startsWith('eq.')) rows = rows.filter((poll) => String(poll.is_public) === publicFilter.slice(3));
      if (statusFilter?.startsWith('eq.')) rows = rows.filter((poll) => poll.status === statusFilter.slice(3));
      if (orFilter?.includes('status.eq.closed')) rows = rows.filter((poll) => poll.status === 'closed' || (poll.closed_at && Date.parse(poll.closed_at) <= Date.now()));
      if (orFilter?.includes('closed_at.is.null')) rows = rows.filter((poll) => !poll.closed_at || Date.parse(poll.closed_at) > Date.now());
      rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? rows.length);
      return reply(rows.slice(offset, offset + limit).map((poll) => ({ ...poll, votes: [{ count: (state.votes ?? []).filter((vote) => vote.poll_id === poll.id).length }] })));
    }
    if (url.pathname === '/rest/v1/votes') return reply(state.votes ?? []);
    if (url.pathname === '/rest/v1/poll_comments') return reply(state.comments ?? []);
    return reply([]);
  });
  return state;
}
