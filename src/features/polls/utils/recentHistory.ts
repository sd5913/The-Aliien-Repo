const KEY = "bothpls:recent-poll-ids:v1";
const MAX_HISTORY = 20;
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function readRecentPollIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && UUID.test(id)).slice(0, MAX_HISTORY) : [];
  } catch { return []; }
}

export function rememberViewedPoll(id: string): void {
  if (!UUID.test(id)) return;
  try {
    const next = [id, ...readRecentPollIds().filter((previous) => previous !== id)].slice(0, MAX_HISTORY);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* Browsing still works when storage is unavailable. */ }
}
