// Reusable voting mode, status, scoring, and identity helpers. / 可复用的投票模式、状态、计分和身份工具。
import type { Poll, PollOption, VoterIdentity, VotingMode } from "../../../types/poll";
import { readParticipant } from "../../auth/utils/participant";

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
  const account = readParticipant();
  return account ? { id: account.id, nickname: account.nickname } : { id: "", nickname: "朋友" };
}

// Ownership requires an explicit match; legacy or missing creators are read-only.
export function isPollOwner(poll: Poll, voterId: string): boolean {
  return Boolean(voterId && poll.creatorId?.trim() === voterId);
}

// PRD 1.4 section 6.5: sharing is an owner-only management action.
// Visibility, participation and navigation origin never grant sharing rights.
export function canSharePoll(poll: Poll, accountId: string): boolean {
  return isPollOwner(poll, accountId);
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
