// Reusable voting mode, status, scoring, and identity helpers. / 可复用的投票模式、状态、计分和身份工具。
import type { Poll, PollOption, VoterIdentity, VotingMode } from "../../../types/poll";
import { VOTER_STORAGE_KEY, readLocalJson, writeLocalJson } from "../../../lib/storage/localStorage";

export interface RankedOptionResult {
  option: PollOption;
  score: number;
  rank: number;
  tied: boolean;
}

export function getVotingMode(options: PollOption[]): VotingMode {
  return options.length === 2 ? "choice" : "ranking";
}

export function isPollOpen(poll: Poll, now = Date.now()): boolean {
  return poll.status === "open" && (!poll.endsAt || new Date(poll.endsAt).getTime() > now);
}

export function getVoter(): VoterIdentity {
  const isIdentity = (value: unknown): value is VoterIdentity => Boolean(value && typeof value === "object" && "id" in value && "nickname" in value && typeof value.id === "string" && typeof value.nickname === "string");
  const stored = readLocalJson(VOTER_STORAGE_KEY, null, isIdentity);
  if (stored) return stored;
  const voter = { id: crypto.randomUUID(), nickname: "朋友" };
  writeLocalJson(VOTER_STORAGE_KEY, voter);
  return voter;
}

// polls.author_name doubles as the creator id: new polls store the voter UUID,
// older rows store a display name such as "bothpls friend". A non-UUID value can
// never match the local voter id, so it is treated as an unclaimed creator and the
// first successful edit writes the current voter UUID back into that column.
// polls.author_name 兼作发起者标识：新投票写入投票者 UUID，旧数据写入昵称，
// 非 UUID 的旧值永远无法匹配本机 voter id，因此视为「未认领」，允许编辑并在保存时写回 UUID。
const VOTER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPollOwner(poll: Poll, voterId: string): boolean {
  const creatorId = poll.creatorId?.trim();
  if (!creatorId) return true;
  if (!VOTER_ID_PATTERN.test(creatorId)) return true;
  return creatorId === voterId;
}

export function getBordaResults(poll: Poll): RankedOptionResult[] {
  const scores = new Map(poll.options.map((option) => [option.id, 0]));
  for (const vote of poll.votes) {
    vote.ranking.forEach((optionId, index) => {
      if (scores.has(optionId)) {
        scores.set(optionId, (scores.get(optionId) ?? 0) + poll.options.length - index);
      }
    });
  }

  const sorted = poll.options
    .map((option) => ({ option, score: scores.get(option.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);

  let rank = 0;
  let previousScore: number | undefined;
  return sorted.map((result, index) => {
    if (result.score !== previousScore) rank = index + 1;
    previousScore = result.score;
    const tied =
      (index > 0 && sorted[index - 1].score === result.score) ||
      (index < sorted.length - 1 && sorted[index + 1].score === result.score);
    return { ...result, rank, tied };
  });
}

export function getRandomNickname(): string {
  const names = ["小太阳", "软糖", "奶茶", "小橘子", "云朵", "糯米团"];
  return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(10 + Math.random() * 90)}`;
}
