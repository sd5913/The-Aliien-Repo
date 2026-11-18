import { readParticipant } from "../../auth/utils/participant";
// Supabase persistence for polls, aligned with the normalized three-table schema.
// 投票数据对接 Supabase 三表：polls / poll_options / votes。
import type { Poll, PollComment, PollStatus, Vote } from "../../../types/poll";
import { supabase } from "../../../lib/supabase/client";

interface PollRow {
  id: string;
  title: string;
  description: string | null;
  status: PollStatus;
  author_name: string | null;
  owner_id: string | null;
  is_public: boolean | null;
  emoji: string | null;
  created_at: string;
  closed_at: string | null;
  poll_options: OptionRow[] | null;
}

interface OptionRow {
  id: string;
  poll_id: string;
  label: string;
  image_url: string | null;
  position: number | null;
  created_at: string;
}

interface VoteRow {
  id: string;
  poll_id: string;
  voter_id: string;
  ranking: string[] | null;
  created_at: string;
}

function toVoteView(row: VoteRow): Vote {
  const ranking = row.ranking ?? [];
  return {
    id: row.id,
    voter: { id: row.voter_id, nickname: "朋友" },
    selectedOptionId: ranking[0],
    ranking,
    submittedAt: row.created_at,
  };
}

interface CommentRow {
  id: string; poll_id: string; voter_id: string; nickname: string; avatar: string;
  body: string; option_id: string | null; created_at: string;
}

function toCommentView(row: CommentRow): PollComment {
  return { id: row.id, voter: { id: row.voter_id, nickname: row.nickname, avatar: row.avatar },
    text: row.body, optionId: row.option_id ?? undefined, createdAt: row.created_at };
}

function toPollView(row: PollRow, votes: VoteRow[], comments: CommentRow[]): Poll {
  const options = [...(row.poll_options ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((option) => ({
      id: option.id,
      name: option.label,
      imageUrl: option.image_url ?? undefined,
    }));


  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at,
    creatorId: row.owner_id ?? undefined,
    ...(row.closed_at ? { endsAt: row.closed_at } : {}),
    status: row.status,
    options,
    votes: votes.map(toVoteView),
    comments: comments.map(toCommentView),
  };
}

const POLL_SELECT =
  "id,title,description,status,author_name,owner_id,is_public,emoji,created_at,closed_at,poll_options(id,label,image_url,position,created_at)";

export async function fetchRecentPolls(ownerId?: string): Promise<Poll[]> {
  const latestQuery = supabase.from("polls").select(POLL_SELECT)
    .order("created_at", { ascending: false }).limit(3);
  const [latestResult, ownedResult] = await Promise.all([
    latestQuery,
    ownerId ? supabase.from("polls").select(POLL_SELECT).eq("owner_id", ownerId)
      .order("created_at", { ascending: false }).limit(3) : Promise.resolve({ data: [], error: null }),
  ]);
  if (latestResult.error) throw latestResult.error;
  if (ownedResult.error) throw ownedResult.error;

  const rows = [...(ownedResult.data ?? []), ...(latestResult.data ?? [])] as unknown as PollRow[];
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  const owned = unique.filter((row) => row.owner_id === ownerId);
  const others = unique.filter((row) => row.owner_id !== ownerId);
  const selected = [...owned, ...others].slice(0, 3);
  const counts = await Promise.all(selected.map(async (row) => {
    const { count, error } = await supabase.from("votes").select("id", { count: "exact", head: true }).eq("poll_id", row.id);
    if (error) throw error;
    return count ?? 0;
  }));
  return selected.map((row, index) => ({ ...toPollView(row, [], []), voteCount: counts[index] }));
}

export async function fetchPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from("polls")
    .select(POLL_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const pollRows = (data ?? []) as unknown as PollRow[];
  const pollIds = pollRows.map((row) => row.id);

  let voteRows: VoteRow[] = [];
  let commentRows: CommentRow[] = [];
  if (pollIds.length > 0) {
    const participant = readParticipant();
    const [votesResult, commentsResult, ownResult] = await Promise.all([
      supabase.from("votes").select("id,poll_id,voter_id,ranking,created_at").in("poll_id", pollIds),
      supabase.from("poll_comments").select("id,poll_id,voter_id,nickname,avatar,body,option_id,created_at").in("poll_id", pollIds).order("created_at"),
      participant ? supabase.rpc("own_comments", { p_voter_id: participant.id, p_token: participant.participantToken }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (votesResult.error) throw votesResult.error;
    if (commentsResult.error) throw commentsResult.error;
    if (ownResult.error) throw ownResult.error;
    voteRows = (votesResult.data ?? []) as VoteRow[];
    const merged = new Map<string, CommentRow>();
    for (const comment of [...(commentsResult.data ?? []), ...(ownResult.data ?? [])] as CommentRow[]) merged.set(comment.id, comment);
    commentRows = [...merged.values()].sort((a,b) => a.created_at.localeCompare(b.created_at));
  }

  return pollRows.map((row) =>
    toPollView(row, voteRows.filter((vote) => vote.poll_id === row.id), commentRows.filter((comment) => comment.poll_id === row.id)),
  );
}

// Atomic RPCs set ownership from auth.uid() and enforce permissions server-side.
export async function createPoll(poll: Poll): Promise<void> {
  const { error } = await supabase.rpc("save_poll", { p_poll: poll });
  if (error) throw error;
}

export async function updatePollMeta(poll: Poll): Promise<void> {
  if (poll.status === "closed") {
    await setPollStatus(poll.id, "closed", poll.endsAt ?? null);
    return;
  }
  const { error } = await supabase.rpc("save_poll", { p_poll: poll });
  if (error) throw error;
}

export async function submitVote(pollId: string, voterId: string, ranking: string[], comment = ""): Promise<void> {
  const participant = readParticipant();
  if (!participant || participant.id !== voterId) throw new Error("请先完成软登录。");
  const { error } = await supabase.rpc("submit_ballot", {
    p_poll_id: pollId, p_voter_id: participant.id,
    p_token: participant.participantToken, p_ranking: ranking,
    p_comment: comment, p_nickname: participant.nickname, p_avatar: participant.avatar,
  });
  if (error) throw error;
}

export async function setPollStatus(pollId: string, status: PollStatus, _closedAt: string | null): Promise<void> {
  if (status !== "closed") throw new Error("已结束投票不能重新开放。");
  const { error } = await supabase.rpc("close_poll", { p_poll_id: pollId });
  if (error) throw error;
}

export async function deletePollRemote(pollId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_poll", { p_poll_id: pollId });
  if (error) throw error;
}

export async function updateCommentRemote(commentId: string, text: string): Promise<void> {
  const participant = readParticipant();
  if (!participant) throw new Error("请先完成软登录。");
  const { error } = await supabase.rpc("update_comment", { p_comment_id: commentId,
    p_voter_id: participant.id, p_token: participant.participantToken, p_body: text });
  if (error) throw error;
}

export async function deleteCommentRemote(commentId: string): Promise<void> {
  const participant = readParticipant();
  const { error } = await supabase.rpc("delete_comment", { p_comment_id: commentId,
    p_voter_id: participant?.id ?? null, p_token: participant?.participantToken ?? null });
  if (error) throw error;
}
