import { readParticipant } from "../../auth/utils/participant";
import type { ParticipantProfile } from "../../auth/utils/participant";
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
  visibility_reviewed_at?: string | null;
  emoji: string | null;
  created_at: string;
  closed_at: string | null;
  last_voted_at?: string;
  poll_options: OptionRow[] | null;
  votes?: { count: number }[] | null;
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
    isPublic: row.is_public ?? false,
    visibilityReviewedAt: row.visibility_reviewed_at ?? null,
    ...(row.closed_at ? { endsAt: row.closed_at } : {}),
    status: row.status,
    options,
    votes: votes.map(toVoteView),
    comments: comments.map(toCommentView),
  };
}

const POLL_SELECT =
  "id,title,description,status,author_name,owner_id,is_public,visibility_reviewed_at,emoji,created_at,closed_at,poll_options(id,label,image_url,position,created_at)";
const LEGACY_POLL_SELECT =
  "id,title,description,status,author_name,owner_id,is_public,emoji,created_at,closed_at,poll_options(id,label,image_url,position,created_at)";

const CARD_SELECT =
  "id,title,description,status,owner_id,is_public,visibility_reviewed_at,created_at,closed_at,poll_options(id,label,image_url,position),votes(count)";
const LEGACY_CARD_SELECT =
  "id,title,description,status,owner_id,is_public,created_at,closed_at,poll_options(id,label,image_url,position),votes(count)";

function isMissingVisibilityColumn(error: { code?: string; message?: string } | null): boolean {
  // Keep reads available while the frontend and database migration roll out independently.
  return Boolean(error && ["42703", "PGRST204"].includes(error.code ?? "")
    && error.message?.includes("visibility_reviewed_at"));
}

function toCard(row: PollRow): Poll {
  return { ...toPollView(row, [], []), voteCount: row.votes?.[0]?.count ?? 0 };
}

export const OWNED_POLL_PAGE_SIZE = 12;

export async function fetchSquarePolls(): Promise<Poll[]> {
  // PostgREST casts `now` to timestamptz on the server, so a device clock
  // cannot put expired polls back in the square. Filter before limiting.
  const runQuery = (columns: string) => supabase.from("polls").select(columns)
    .eq("is_public", true).eq("status", "open")
    .or("closed_at.is.null,closed_at.gt.now")
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(5);
  const initial = await runQuery(CARD_SELECT);
  const result = isMissingVisibilityColumn(initial.error)
    ? await runQuery(LEGACY_CARD_SELECT)
    : initial;
  const { data, error } = result;
  if (error) throw error;
  return ((data ?? []) as unknown as PollRow[]).map(toCard);
}

export async function setPollVisibility(pollId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_poll_visibility", { p_poll_id: pollId, p_public: isPublic });
  if (error) throw error;
}

export async function fetchOwnedPollsPage(ownerId: string, offset: number, filter?: "active" | "ended"): Promise<{ polls: Poll[]; hasMore: boolean }> {
  const now = new Date().toISOString();
  const runQuery = (columns: string) => {
    let query = supabase.from("polls").select(columns).eq("owner_id", ownerId)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + OWNED_POLL_PAGE_SIZE);
    if (filter === "active") query = query.eq("status", "open").or(`closed_at.is.null,closed_at.gt.${now}`);
    if (filter === "ended") query = query.or(`status.eq.closed,closed_at.lte.${now}`);
    return query;
  };
  let result = await runQuery(CARD_SELECT);
  if (isMissingVisibilityColumn(result.error)) result = await runQuery(LEGACY_CARD_SELECT);
  const { data, error } = result;
  if (error) throw error;
  const rows = (data ?? []) as unknown as PollRow[];
  return { polls: rows.slice(0, OWNED_POLL_PAGE_SIZE).map(toCard), hasMore: rows.length > OWNED_POLL_PAGE_SIZE };
}

export async function fetchVotedPollsPage(participant: ParticipantProfile, filter?: "active" | "ended"): Promise<{ polls: Poll[]; hasMore: boolean }> {
  const now = Date.now();
  const { data, error } = await supabase.rpc("my_voted_polls", {
    p_voter_id: participant.id,
    p_token: participant.participantToken,
  });
  if (error) throw error;
  let polls = ((data ?? []) as unknown as PollRow[])
    .map(toCard)
    .filter((poll) => isNotDeletedAndMatchesFilter(poll, filter, now));
  polls = polls.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { polls, hasMore: false };
}

function isNotDeletedAndMatchesFilter(poll: Poll, filter: "active" | "ended" | undefined, now: number): boolean {
  const active = poll.status === "open" && (!poll.endsAt || Date.parse(poll.endsAt) > now);
  if (filter === "active") return active;
  if (filter === "ended") return !active;
  return true;
}

export async function fetchRecentPolls(participant?: ParticipantProfile | null, ownerId?: string): Promise<Poll[]> {
  const [votedResult, ownedPage] = await Promise.all([
    participant ? supabase.rpc("my_voted_polls", { p_voter_id: participant.id, p_token: participant.participantToken }) : Promise.resolve({ data: [], error: null }),
    ownerId ? fetchOwnedPollsPage(ownerId, 0) : Promise.resolve({ polls: [], hasMore: false }),
  ]);
  if (votedResult.error) throw votedResult.error;
  const voted = (votedResult.data ?? []) as unknown as PollRow[];
  const voteActivity = new Map(voted.map((poll) => [poll.id, poll.last_voted_at]));
  const recent = [...voted.map(toCard), ...ownedPage.polls]
    .sort((a, b) => {
      const aTimestamp = voteActivity.get(a.id) ?? a.createdAt;
      const bTimestamp = voteActivity.get(b.id) ?? b.createdAt;
      return Date.parse(bTimestamp) - Date.parse(aTimestamp);
    });
  return [...new Map(recent.map((poll) => [poll.id, poll])).values()].slice(0, 5);
}

export async function fetchPoll(pollId: string, metadataOnly = false): Promise<Poll | null> {
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(pollId)) return null;

  const initial = await supabase.from("polls").select(POLL_SELECT).eq("id", pollId).maybeSingle();
  const result = isMissingVisibilityColumn(initial.error)
    ? await supabase.from("polls").select(LEGACY_POLL_SELECT).eq("id", pollId).maybeSingle()
    : initial;
  const { data, error } = result;
  if (error) throw error;
  if (!data) {
    const participant = readParticipant();
    const { data: linked, error: linkError } = await supabase.rpc("get_poll_by_link", {
      p_poll_id: pollId, p_voter_id: participant?.id ?? null, p_token: participant?.participantToken ?? null,
    });
    if (linkError) throw linkError;
    if (!linked) return null;
    const detail = linked as { poll: PollRow; votes: VoteRow[]; comments: CommentRow[] };
    return toPollView(detail.poll, metadataOnly ? [] : detail.votes, metadataOnly ? [] : detail.comments);
  }

  const row = data as unknown as PollRow;
  if (metadataOnly) return toPollView(row, [], []);

  const participant = readParticipant();
  const [votesResult, commentsResult, ownResult] = await Promise.all([
    supabase.from("votes").select("id,poll_id,voter_id,ranking,created_at").eq("poll_id", row.id),
    supabase.from("poll_comments").select("id,poll_id,voter_id,nickname,avatar,body,option_id,created_at").eq("poll_id", row.id),
    participant
      ? supabase.rpc("own_comments", { p_voter_id: participant.id, p_token: participant.participantToken }).eq("poll_id", row.id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (votesResult.error) throw votesResult.error;
  if (commentsResult.error) throw commentsResult.error;
  if (ownResult.error) throw ownResult.error;

  const merged = new Map<string, CommentRow>();
  for (const comment of [...(commentsResult.data ?? []), ...(ownResult.data ?? [])] as CommentRow[]) {
    merged.set(comment.id, comment);
  }
  const comments = [...merged.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return toPollView(row, (votesResult.data ?? []) as VoteRow[], comments);
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
