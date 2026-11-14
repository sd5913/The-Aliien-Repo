// Supabase persistence for polls, aligned with the normalized three-table schema.
// 投票数据对接 Supabase 三表：polls / poll_options / votes。
import type { Poll, PollComment, PollStatus, Vote } from "../../../types/poll";
import { supabase } from "../../../lib/supabase/client";
import {
  readComments,
  readCommentsPublic,
  writeComments,
  writeCommentsPublic,
} from "../../../lib/storage/pollLocal";

interface PollRow {
  id: string;
  title: string;
  description: string | null;
  status: PollStatus;
  author_name: string | null;
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

function toPollView(row: PollRow, votes: VoteRow[]): Poll {
  const options = [...(row.poll_options ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((option) => ({
      id: option.id,
      name: option.label,
      imageUrl: option.image_url ?? undefined,
    }));

  const comments = readComments(row.id);
  const commentsPublic = readCommentsPublic(row.id);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at,
    creatorId: row.author_name ?? undefined,
    commentsPublic,
    ...(row.closed_at ? { endsAt: row.closed_at } : {}),
    status: row.status,
    options,
    votes: votes.map(toVoteView),
    comments,
  };
}

const POLL_SELECT =
  "id,title,description,status,author_name,is_public,emoji,created_at,closed_at,poll_options(id,label,image_url,position,created_at)";

export async function fetchPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from("polls")
    .select(POLL_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const pollRows = (data ?? []) as unknown as PollRow[];
  const pollIds = pollRows.map((row) => row.id);

  let voteRows: VoteRow[] = [];
  if (pollIds.length > 0) {
    const votesResult = await supabase
      .from("votes")
      .select("id,poll_id,voter_id,ranking,created_at")
      .in("poll_id", pollIds);
    if (votesResult.error) throw votesResult.error;
    voteRows = (votesResult.data ?? []) as unknown as VoteRow[];
  }

  return pollRows.map((row) =>
    toPollView(row, voteRows.filter((vote) => vote.poll_id === row.id)),
  );
}

export async function createPoll(poll: Poll): Promise<void> {
  const { error: pollError } = await supabase.from("polls").insert({
    id: poll.id,
    title: poll.title,
    description: poll.description,
    status: poll.status,
    author_name: poll.creatorId ?? null,
    is_public: true,
    closed_at: poll.endsAt ?? null,
  });
  if (pollError) throw pollError;

  const optionRows = poll.options.map((option, index) => ({
    id: option.id,
    poll_id: poll.id,
    label: option.name,
    image_url: option.imageUrl ?? null,
    position: index,
  }));
  if (optionRows.length > 0) {
    const { error: optionError } = await supabase
      .from("poll_options")
      .insert(optionRows);
    if (optionError) throw optionError;
  }
}

export async function updatePollMeta(poll: Poll): Promise<void> {
  const { error: pollError } = await supabase
    .from("polls")
    .update({
      title: poll.title,
      description: poll.description,
      status: poll.status,
      author_name: poll.creatorId ?? null,
      closed_at: poll.endsAt ?? null,
    })
    .eq("id", poll.id);
  if (pollError) throw pollError;

  const { error: deleteError } = await supabase
    .from("poll_options")
    .delete()
    .eq("poll_id", poll.id);
  if (deleteError) throw deleteError;

  const optionRows = poll.options.map((option, index) => ({
    id: option.id,
    poll_id: poll.id,
    label: option.name,
    image_url: option.imageUrl ?? null,
    position: index,
  }));
  if (optionRows.length > 0) {
    const { error: optionError } = await supabase
      .from("poll_options")
      .insert(optionRows);
    if (optionError) throw optionError;
  }
}

export async function submitVote(
  pollId: string,
  voterId: string,
  ranking: string[],
): Promise<void> {
  const { error } = await supabase
    .from("votes")
    .upsert(
      { poll_id: pollId, voter_id: voterId, ranking },
      { onConflict: "poll_id,voter_id" },
    );
  if (error) throw error;
}

export async function setPollStatus(
  pollId: string,
  status: PollStatus,
  closedAt: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("polls")
    .update({ status, closed_at: closedAt })
    .eq("id", pollId);
  if (error) throw error;
}

export async function deletePollRemote(pollId: string): Promise<void> {
  const { error } = await supabase.from("polls").delete().eq("id", pollId);
  if (error) throw error;
}

// Local-only helpers used by the hook for comments and visibility.
export function persistLocalComments(pollId: string, comments: PollComment[]): void {
  writeComments(pollId, comments);
}

export function persistLocalCommentsPublic(pollId: string, visible: boolean): void {
  writeCommentsPublic(pollId, visible);
}
