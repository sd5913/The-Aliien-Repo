import type { PollOption } from "../../../types/poll";

export interface CreateDraft { pollId: string; title: string; description: string; deadline: string; isPublic?: boolean; options: PollOption[] }
export interface VoteDraft { activeId: string; selectedId: string; comment: string }
export function readDraft<T>(key: string, validate: (value: unknown) => value is T): T | null {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    return stored?.version === 1 && Date.now() - stored.savedAt < 7 * 86400000 && validate(stored.value) ? stored.value : null;
  } catch { return null; }
}
export function saveDraft(key: string, value: CreateDraft | VoteDraft): boolean {
  try { localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now(), value })); return true; }
  catch { return false; }
}
export function clearDraft(key: string) { try { localStorage.removeItem(key); } catch { /* Storage may be blocked. */ } }
export function isCreateDraft(value: unknown): value is CreateDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as CreateDraft;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof draft.pollId === "string" && uuid.test(draft.pollId) && typeof draft.title === "string" && draft.title.length <= 100 &&
    typeof draft.description === "string" && draft.description.length <= 300 && ["none", "custom", "24", "72", "168"].includes(draft.deadline) &&
    (draft.isPublic === undefined || typeof draft.isPublic === "boolean") &&
    Array.isArray(draft.options) && draft.options.length >= 2 && draft.options.length <= 5 && draft.options.every((option) =>
      option && typeof option.id === "string" && uuid.test(option.id) && typeof option.name === "string" && option.name.length <= 60 && (option.imageUrl === undefined || typeof option.imageUrl === "string"));
}
export function isVoteDraft(value: unknown): value is VoteDraft {
  const draft = value as VoteDraft | null;
  return Boolean(draft && typeof draft.activeId === "string" && typeof draft.selectedId === "string" && typeof draft.comment === "string" && draft.comment.length <= 200);
}
