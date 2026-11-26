import type { Poll } from "../../../types/poll";
import { supabase } from "../../../lib/supabase/client";

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
    const { data, error } = await supabase.functions.invoke("translate-poll", {
      body: { pollId, target }, signal: AbortSignal.timeout(22000),
    });
    const source = JSON.parse(sourceKey);
    if (error || data?.sourceKey !== sourceKey || data.target !== target || typeof data.title !== "string" || typeof data.description !== "string"
      || !Array.isArray(data.options) || data.options.length !== source.options.length
      || data.options.some((o: { id?: string; name?: string }, i: number) => o.id !== source.options[i].id || typeof o.name !== "string")) {
      throw new Error("TRANSLATION_FAILED");
    }
    return data as PollTranslation;
  })();
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + 3600000, value });
  void value.catch(() => { if (cache.get(key)?.value === value) cache.delete(key); });
  return value;
}
