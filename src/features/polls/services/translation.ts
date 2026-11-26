import type { Poll } from "../../../types/poll";

const languages = { "zh-CN": "chinese_simplified", en: "english", ko: "korean" } as const;
let client: Promise<typeof import("i18n-jsautotranslate")["default"]> | undefined;
function getClient() {
  return client ??= import("i18n-jsautotranslate").then(({ default: translate }) => {
    translate.service.use("client.edge");
    // Edge rejects from=auto (HTTP 400); omitting from detects each text's
    // language. Keep the target placeholder used by translate.js.
    translate.service.edge.api.translate = "https://edge.microsoft.com/translate/translatetext?to={to}&isEnterpriseClient=false";
    // Only use the text request API: never scan or mutate React's DOM.
    return translate;
  }).catch(error => { client = undefined; throw error; });
}

async function translateTexts(texts: string[], target: keyof typeof languages): Promise<string[]> {
  const translate = await getClient();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TRANSLATION_TIMEOUT")), 22000);
    const fail = () => { clearTimeout(timer); reject(new Error("TRANSLATION_FAILED")); };
    try {
      // Avoid translateText's persistent hash cache and duplicate-text indexing.
      // Our bounded memory cache uses the full source text and target language.
      translate.request.post(translate.request.api.translate, {
        from: "auto", to: languages[target], text: encodeURIComponent(JSON.stringify(texts)),
      }, data => {
        if (data.result !== 1 || data.to !== languages[target] || !Array.isArray(data.text)
          || data.text.length !== texts.length || data.text.some(text => typeof text !== "string" || !text.trim())) {
          fail(); return;
        }
        clearTimeout(timer);
        resolve(data.text as string[]);
      }, fail);
    } catch { fail(); }
  });
}

export type PollTranslation = Pick<Poll, "title" | "description"> & {
  sourceKey: string; target: string; options: { id: string; name: string }[];
};
export function pollSourceKey(poll: Poll): string {
  return JSON.stringify({ title: poll.title, description: poll.description,
    options: poll.options.map(({ id, name }) => ({ id, name })) });
}
const cache = new Map<string, { expires: number; value: Promise<PollTranslation> }>();
export function translatePoll(pollId: string, sourceKey: string, target: "zh-CN" | "en" | "ko"): Promise<PollTranslation> {
  const key = `${pollId}:${target}:${sourceKey}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const value = (async () => {
    const source = JSON.parse(sourceKey) as Pick<Poll, "title" | "description" | "options">;
    const originals = [source.title, source.description, ...source.options.map(o => o.name)];
    const unique = [...new Set(originals.filter(text => text.trim()))];
    const translated = new Map<string, string>();
    // Stay below the library's internal split threshold (40,000 chars / 900
    // items), which can reorder equal-sized batches. Preserve field boundaries.
    while (unique.length) {
      const batch: string[] = [];
      let size = 0;
      while (unique.length && batch.length < 100 && size + unique[0].length <= 30000) {
        const text = unique.shift()!; batch.push(text); size += text.length;
      }
      if (!batch.length) throw new Error("TRANSLATION_TEXT_TOO_LONG");
      const results = await translateTexts(batch, target);
      batch.forEach((text, i) => translated.set(text, results[i]));
    }
    const display = originals.map(text => translated.get(text) ?? text);
    return { sourceKey, target, title: display[0], description: display[1],
      options: source.options.map((option, i) => ({ id: option.id, name: display[i + 2] })) };
  })();
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + 3600000, value });
  void value.catch(() => { if (cache.get(key)?.value === value) cache.delete(key); });
  return value;
}
