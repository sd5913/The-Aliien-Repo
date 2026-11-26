type Source = { title: string; description: string; options: { id: string; name: string }[] };
type PollRow = { title: string; description: string | null; poll_options: { id: string; label: string; position: number | null }[] };
type Config = { url: string; anonKey: string; translationKey: string };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

// Bounded, short-lived worker cache for the pilot. Authorization is checked BEFORE cache lookup.
export function createHandler(config: Config, fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { expires: number; result: unknown }>();
  const pending = new Map<string, Promise<unknown>>();
  let windowStart = Date.now(), requests = 0;
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
    if (!config.translationKey || !config.url || !config.anonKey) return reply({ error: "TRANSLATION_UNAVAILABLE" }, 503);
    try {
      const body = await request.text();
      if (body.length > 256) return reply({ error: "INVALID_REQUEST" }, 400);
      const { pollId, target } = JSON.parse(body);
      if (!["zh-CN", "en", "ko"].includes(target)) return reply({ error: "INVALID_TARGET" }, 400);
      if (typeof pollId !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(pollId)) return reply({ error: "INVALID_REQUEST" }, 400);
      // Use the caller's existing link-access rules, never a service-role read.
      const pollResponse = await fetcher(`${config.url}/rest/v1/rpc/get_poll_by_link`, {
        method: "POST", headers: { apikey: config.anonKey,
          Authorization: request.headers.get("Authorization") || `Bearer ${config.anonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_poll_id: pollId, p_voter_id: null, p_token: null }), signal: AbortSignal.timeout(8000),
      });
      if (!pollResponse.ok) return reply({ error: "POLL_UNAVAILABLE" }, 403);
      const detail = await pollResponse.json();
      if (!detail?.poll) return reply({ error: "POLL_UNAVAILABLE" }, 404);
      const row = detail.poll as PollRow;
      const source: Source = { title: row.title, description: row.description ?? "",
        options: [...row.poll_options].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(o => ({ id: o.id, name: o.label })) };
      const texts = [source.title, source.description, ...source.options.map(o => o.name)];
      if (source.options.length < 2 || source.options.length > 5 || texts.some(t => typeof t !== "string") || texts.join("").length > 6000) return reply({ error: "INVALID_CONTENT" }, 422);
      const sourceKey = JSON.stringify(source);
      const key = `${pollId}:${target}:${sourceKey}`;
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) return reply(cached.result);
      if (!pending.has(key)) {
        // Worker-local guard, supplemented by a provider-side daily quota in deployment.
        if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); requests = 0; }
        if (++requests > 30) return reply({ error: "RATE_LIMITED" }, 429);
        const work = (async () => {
          const nonEmpty = texts.map((text, index) => ({ text, index })).filter(item => item.text.trim());
          const response = await fetcher("https://translation.googleapis.com/language/translate/v2", {
            method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": config.translationKey },
            // Omit source: detect each field's language, including mixed-language polls.
            body: JSON.stringify({ q: nonEmpty.map(item => item.text), target, format: "text" }), signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) throw new Error("PROVIDER_FAILURE");
          const data = await response.json();
          const translations = data?.data?.translations;
          if (!Array.isArray(translations) || translations.length !== nonEmpty.length || translations.some(t => typeof t.translatedText !== "string" || !t.translatedText.trim())) throw new Error("INVALID_TRANSLATION");
          const translated = [...texts];
          nonEmpty.forEach((item, i) => { translated[item.index] = translations[i].translatedText; });
          const result = { sourceKey, target, title: translated[0], description: translated[1],
            options: source.options.map((o, i) => ({ id: o.id, name: translated[i + 2] })) };
          if (cache.size >= 200) cache.delete(cache.keys().next().value!);
          cache.set(key, { expires: Date.now() + 3600000, result });
          return result;
        })();
        pending.set(key, work);
        // Clear failed and successful jobs without creating an unhandled rejected promise.
        void work.then(() => pending.delete(key), () => pending.delete(key));
      }
      return reply(await pending.get(key));
    } catch (error) {
      return reply({ error: error instanceof SyntaxError ? "INVALID_REQUEST" : "TRANSLATION_FAILED" }, error instanceof SyntaxError ? 400 : 502);
    }
  };
}
