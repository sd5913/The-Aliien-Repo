import type { Poll } from "../../types/poll";
import { POLLS_STORAGE_KEY, readLocalJson, writeLocalJson } from "./localStorage";

function isPoll(value: unknown): value is Poll {
  if (!value || typeof value !== "object") return false;
  const poll = value as Record<string, unknown>;
  return (
    typeof poll.id === "string" &&
    typeof poll.title === "string" &&
    Array.isArray(poll.options) &&
    Array.isArray(poll.votes) &&
    Array.isArray(poll.comments)
  );
}

function isPollList(value: unknown): value is Poll[] {
  return Array.isArray(value) && value.every(isPoll);
}

export function readPolls(): Poll[] {
  return readLocalJson(POLLS_STORAGE_KEY, [], isPollList);
}

export function writePolls(polls: Poll[]): void {
  writeLocalJson(POLLS_STORAGE_KEY, polls);
}
