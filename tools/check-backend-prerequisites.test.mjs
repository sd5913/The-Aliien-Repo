import assert from 'node:assert/strict';
import { checkBackend } from './check-backend-prerequisites.mjs';
const options = { url: 'https://example.invalid', anonKey: 'public-test-key' };
const denied = () => new Response(JSON.stringify({ code: '42501' }), { status: 401 });
await checkBackend({ ...options, fetchImpl: async () => denied() });
for (const missing of ['user_feedback', 'recent_polls']) {
  await assert.rejects(checkBackend({ ...options, fetchImpl: async url => url.pathname.includes(missing)
    ? new Response(JSON.stringify({ code: missing === 'user_feedback' ? 'PGRST205' : 'PGRST202' }), { status: 404 }) : denied() }), /Backend prerequisite failed/);
}
await assert.rejects(checkBackend({ ...options, fetchImpl: async () => new Response('[]', { status: 200 }) }), /Backend prerequisite failed/);
console.log('Passed: deployed permissions, missing table/RPC and accidental public access checks.');
