import { useEffect, useState } from "react";
import type { Poll } from "../../../types/poll";
import { pollSourceKey, translatePoll, type PollTranslation } from "../services/translation";

export function usePollTranslation(source: Poll | undefined) {
  const enabled = import.meta.env.VITE_POLL_TRANSLATION_ENABLED === "true";
  const sourceKey = source ? pollSourceKey(source) : "";
  const id = source?.id ?? "";
  const key = `${id}:${sourceKey}`;
  const [result, setResult] = useState<{ key: string; value?: PollTranslation; failed?: boolean }>();
  const [originalKey, setOriginalKey] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !id) return;
    let active = true;
    setResult(undefined);
    void translatePoll(id, sourceKey).then(value => {
      if (active) setResult({ key, value });
    }, () => { if (active) setResult({ key, failed: true }); });
    return () => { active = false; };
  }, [enabled, id, sourceKey, key, attempt]);
  const current = result?.key === key ? result : undefined;
  const original = originalKey === key;
  const value = enabled && !original ? current?.value : undefined;
  // Translation is presentation only: saves, drafts, comments and vote IDs keep the source data.
  const poll = source && value ? { ...source, title: value.title, description: value.description,
    options: source.options.map((option, i) => ({ ...option, name: value.options[i].name })) } : source;
  return { poll, enabled, original, status: current?.failed ? "failed" : current?.value ? "ready" : "loading",
    toggle: () => setOriginalKey(original ? "" : key), retry: () => setAttempt(n => n + 1) };
}
