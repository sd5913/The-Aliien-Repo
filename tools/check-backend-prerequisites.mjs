import { pathToFileURL } from 'node:url';

// Read-only probes use the public client key and never fetch feedback rows.
export async function checkBackend({ url, anonKey, fetchImpl = fetch }) {
  if (!url || !anonKey) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' };
  const probes = [
    ['feedback table', '/rest/v1/user_feedback?select=id&limit=0', { method: 'GET' }],
    ['recent pagination RPC', '/rest/v1/rpc/recent_polls', { method: 'POST', body: JSON.stringify({ p_page: 0 }) }],
  ];
  for (const [name, path, init] of probes) {
    const response = await fetchImpl(new URL(path, url), { ...init, headers, signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    // Both resources must exist but deny anonymous reads/execution.
    if (![401, 403].includes(response.status) || body.code !== '42501') {
      throw new Error(`Backend prerequisite failed: ${name} (HTTP ${response.status}, ${body.code ?? 'unexpected response'}). Apply the documented Supabase migrations before deploying.`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkBackend({ url: process.env.VITE_SUPABASE_URL, anonKey: process.env.VITE_SUPABASE_ANON_KEY });
  console.log('Passed: feedback table and recent pagination RPC exist with restricted access.');
}
