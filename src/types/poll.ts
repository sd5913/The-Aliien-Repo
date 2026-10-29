// Core poll, option, vote, and voter types. / 投票、选项、投票记录及投票者的核心类型。
export type PollStatus = "open" | "closed";

export interface PollOption {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface VoterIdentity {
  id: string;
  nickname: string;
}

export interface Vote {
  id: string;
  voter: VoterIdentity;
  selectedOptionId?: string;
  ranking: string[];
  submittedAt: string;
}

export interface PollComment {
  id: string;
  voteId: string;
  voter: VoterIdentity;
  text: string;
  createdAt: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  endsAt?: string;
  status: PollStatus;
  options: PollOption[];
  votes: Vote[];
  comments: PollComment[];
}

export type VotingMode = "choice" | "ranking";
