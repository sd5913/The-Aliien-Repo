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

export function isPollOwner(poll: Poll, voterId: string): boolean {
  return !poll.creatorId || poll.creatorId === voterId;
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
