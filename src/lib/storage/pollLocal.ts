// Local-only persistence for comments and comment visibility.
// 评论与评论可见性本期不落 Supabase，按投票 ID 存在浏览器本地。
import type { PollComment } from "../../types/poll";
import { readLocalJson, writeLocalJson } from "./localStorage";

const COMMENTS_KEY = "bothpls:comments:v1";
const VISIBILITY_KEY = "bothpls:comments-public:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCommentArray(value: unknown): value is PollComment[] {
  return (
    Array.isArray(value) &&
    value.every(
      (comment) =>
        comment &&
        typeof comment === "object" &&
        typeof (comment as PollComment).id === "string" &&
        typeof (comment as PollComment).text === "string",
    )
  );
}

export function readComments(pollId: string): PollComment[] {
  const map = readLocalJson<Record<string, unknown>>(COMMENTS_KEY, {}, isRecord);
  const stored = map[pollId];
  return isCommentArray(stored) ? stored : [];
}

export function writeComments(pollId: string, comments: PollComment[]): void {
  const map = readLocalJson<Record<string, unknown>>(COMMENTS_KEY, {}, isRecord);
  map[pollId] = comments;
  writeLocalJson(COMMENTS_KEY, map);
}

export function clearComments(pollId: string): void {
  const map = readLocalJson<Record<string, unknown>>(COMMENTS_KEY, {}, isRecord);
  delete map[pollId];
  writeLocalJson(COMMENTS_KEY, map);
}

export function readCommentsPublic(pollId: string): boolean {
  const map = readLocalJson<Record<string, unknown>>(VISIBILITY_KEY, {}, isRecord);
  return map[pollId] !== false;
}

export function writeCommentsPublic(pollId: string, visible: boolean): void {
  const map = readLocalJson<Record<string, unknown>>(VISIBILITY_KEY, {}, isRecord);
  map[pollId] = visible;
  writeLocalJson(VISIBILITY_KEY, map);
}
