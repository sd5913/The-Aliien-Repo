// Reusable voting mode, status, scoring, and identity helpers. / 可复用的投票模式、状态、计分和身份工具。
import type { Poll, PollOption, VotingMode } from "../types/poll";

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
