import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from './handler.ts';

const id = '20000000-0000-4000-8000-000000000001';
const request = (body = { pollId: id, target: 'en' }, headers = {}) => new Request('https://edge.test', {
  method: 'POST', body: JSON.stringify(body), headers,
});
function setup() {
  const state = { providerCalls: 0, reads: 0, denied: false, missing: false, providerFail: false, malformed: false,
    row: { title: '週末の予定', description: '¿Qué prefieres? 🥳', poll_options: [
      { id: 'b', label: '커피', position: 1 }, { id: 'a', label: '散步', position: 0 },
    ] } };
  const handler = createHandler({ url: 'https://db.test', anonKey: 'public-key', translationKey: 'server-secret' }, async (url, init) => {
    if (url.startsWith('https://db.test')) {
      state.reads++; state.authorization = init.headers.Authorization;
      assert.deepEqual(JSON.parse(init.body), { p_poll_id: id, p_voter_id: null, p_token: null });
      return Response.json(state.missing ? null : { poll: state.row }, { status: state.denied ? 403 : 200 });
    }
    state.providerCalls++; state.payload = JSON.parse(init.body);
    assert.equal(init.headers['X-goog-api-key'], 'server-secret');
    if (state.providerFail) return Response.json({}, { status: 429 });
    return Response.json({ data: { translations: state.malformed ? [] : state.payload.q.map((text) => ({ translatedText: `EN:${text}`, detectedSourceLanguage: 'auto' })) } });
  });
  return { state, handler };
}
test('all fields are translated in stable option order with automatic language detection', async () => {
  const { state, handler } = setup();
  const response = await handler(request()); const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(state.payload, { q: ['週末の予定', '¿Qué prefieres? 🥳', '散步', '커피'], target: 'en', format: 'text' });
  assert.deepEqual(result.options, [{ id: 'a', name: 'EN:散步' }, { id: 'b', name: 'EN:커피' }]);
  assert.equal(JSON.parse(result.sourceKey).title, state.row.title);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('empty description/optional image labels stay empty', async () => {
  const { state, handler } = setup(); state.row.description = ''; state.row.poll_options[0].label = '';
  const result = await (await handler(request())).json();
  assert.equal(result.description, ''); assert.equal(result.options[1].name, '');
  assert.equal(state.payload.q.length, 2);
});
test('cache and in-flight dedup avoid duplicate provider calls, edits invalidate', async () => {
  const { state, handler } = setup();
  await Promise.all([handler(request()), handler(request())]);
  await handler(request()); assert.equal(state.providerCalls, 1); assert.equal(state.reads, 3);
  state.row.title = 'Новый вопрос'; await handler(request()); assert.equal(state.providerCalls, 2);
});
test('permission is checked even on cache hit and caller token is forwarded', async () => {
  const { state, handler } = setup(); await handler(request()); state.denied = true;
  assert.equal((await handler(request(undefined, { Authorization: 'Bearer user-token' }))).status, 403);
  assert.equal(state.authorization, 'Bearer user-token'); assert.equal(state.providerCalls, 1);
});
test('deleted poll cannot be served from cache', async () => {
  const { state, handler } = setup(); await handler(request()); state.missing = true;
  assert.equal((await handler(request())).status, 404); assert.equal(state.providerCalls, 1);
});
test('provider failure is retriable and not cached', async () => {
  const { state, handler } = setup(); state.providerFail = true;
  assert.equal((await handler(request())).status, 502); state.providerFail = false;
  assert.equal((await handler(request())).status, 200); assert.equal(state.providerCalls, 2);
});
test('malformed translation never produces a partial result', async () => {
  const { state, handler } = setup(); state.malformed = true;
  assert.equal((await handler(request())).status, 502);
});
test('invalid IDs, large bodies and methods do not call provider', async () => {
  const { state, handler } = setup();
  assert.equal((await handler(request({ pollId: 'invalid' }))).status, 400);
  assert.equal((await handler(request({ pollId: id, text: 'a'.repeat(300) }))).status, 400);
  assert.equal((await handler(new Request('https://edge.test'))).status, 405);
  assert.equal((await handler(new Request('https://edge.test', { method: 'OPTIONS' }))).status, 204);
  assert.equal(state.reads, 0); assert.equal(state.providerCalls, 0);
});
test('oversize saved content is rejected before translation', async () => {
  const { state, handler } = setup(); state.row.title = 'a'.repeat(6001);
  assert.equal((await handler(request())).status, 422); assert.equal(state.providerCalls, 0);
});
test('unconfigured service fails closed without outbound requests', async () => {
  const handler = createHandler({ url: '', anonKey: '', translationKey: '' }, () => { throw new Error('unexpected'); });
  assert.equal((await handler(request())).status, 503);
});
test('worker quota rejects new work without additional paid requests', async () => {
  const { state, handler } = setup();
  for (let i = 0; i < 30; i++) { state.row.title = `question ${i}`; assert.equal((await handler(request())).status, 200); }
  state.row.title = 'over quota';
  assert.equal((await handler(request())).status, 429); assert.equal(state.providerCalls, 30);
  state.row.title = 'question 0'; assert.equal((await handler(request())).status, 200);
});
test('network timeouts are contained and return a retryable failure', async () => {
  const handler = createHandler({ url: 'https://db.test', anonKey: 'public', translationKey: 'secret' }, async () => {
    throw new DOMException('Timed out', 'TimeoutError');
  });
  assert.equal((await handler(request())).status, 502);
});
test('target languages are validated before reading saved content', async () => {
  const { state, handler } = setup();
  for (const target of [undefined, 'fr', 'zh-TW', null, {}, '']) {
    assert.equal((await handler(request({ pollId: id, target }))).status, 400);
  }
  assert.equal(state.reads, 0); assert.equal(state.providerCalls, 0);
});
test('each target gets its own provider call and cache entry', async () => {
  const { state, handler } = setup();
  for (const target of ['zh-CN', 'en', 'ko']) {
    const result = await (await handler(request({ pollId: id, target }))).json();
    assert.equal(state.payload.target, target); assert.equal(result.target, target);
  }
  assert.equal(state.providerCalls, 3);
  await handler(request({ pollId: id, target: 'zh-CN' }));
  assert.equal(state.providerCalls, 3);
});
