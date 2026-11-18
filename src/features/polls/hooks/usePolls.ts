import { useParticipant } from "../../auth/utils/useParticipant";
import { useAccount } from "../../auth/components/AccountProvider";
import { requireAccountId } from "../../auth/services/auth";
// React state and updates for Supabase-backed polls.
// Votes and comments are saved together by the server; visibility is enforced by RLS.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Poll } from "../../../types/poll";
import {
  createPoll,
  deletePollRemote,
  updateCommentRemote,
  deleteCommentRemote,
  fetchPolls,
  submitVote,
  updatePollMeta,
} from "../services/polls";
import { getVoter, isPollOwner, isPollOpen } from "../utils/voting";

function metaChanged(current: Poll, updated: Poll): boolean {
  return (
    current.title !== updated.title ||
    current.description !== updated.description ||
    current.endsAt !== updated.endsAt ||
    current.creatorId !== updated.creatorId ||
    current.status !== updated.status ||
    current.options !== updated.options
  );
}

export function usePolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollsRef = useRef<Poll[]>([]);
  const { user } = useAccount();
  const participant = useParticipant();
  const accountId = `${user?.id ?? ""}:${participant?.id ?? ""}`;
  const version = useRef(0);
  const requestSequence = useRef(0);
  const mounted = useRef(false);
  const initialized = useRef(false);
  const [syncError, setSyncError] = useState(false);

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const revision = version.current;
    try {
      const data = await fetchPolls();
      if (!mounted.current || sequence !== requestSequence.current || revision !== version.current) return;
      pollsRef.current = data; setPolls(data); setError(null); setSyncError(false); initialized.current = true;
    } catch (cause) {
      if (!mounted.current || sequence !== requestSequence.current) return;
      if (!initialized.current) setError(cause instanceof Error ? cause : new Error(String(cause)));
      else setSyncError(true);
    } finally {
      if (mounted.current && sequence === requestSequence.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    mounted.current = true; initialized.current = false; setLoading(true);
    pollsRef.current = []; setPolls([]);
    void refresh();
    const check = () => { if (!document.hidden && navigator.onLine) void refresh(); };
    const timer = window.setInterval(check, 10000);
    window.addEventListener("focus", check); window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      mounted.current = false; ++requestSequence.current; window.clearInterval(timer);
      window.removeEventListener("focus", check); window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [refresh]);

  useEffect(() => {
    const deadlines = polls.map((poll) => poll.endsAt ? Date.parse(poll.endsAt) - Date.now() : -1).filter((delay) => delay > 0);
    if (!deadlines.length) return;
    const timer = window.setTimeout(() => { setPolls([...pollsRef.current]); void refresh(); }, Math.min(...deadlines, 2147483000) + 50);
    return () => window.clearTimeout(timer);
  }, [polls, refresh]);

  const savePoll = useCallback(async (poll: Poll) => {
    version.current++;
    const existing = pollsRef.current.find((item) => item.id === poll.id);
    const exists = Boolean(existing);
    const accountId = await requireAccountId();
    if (!isPollOwner(existing ?? poll, accountId) || !isPollOwner(poll, accountId)) throw new Error("只有发起者可以保存投票内容。");
    if (exists) {
      await updatePollMeta(poll);
    } else {
      await createPoll(poll);
    }
    const next = [poll, ...pollsRef.current.filter((item) => item.id !== poll.id)];
    version.current++;
    pollsRef.current = next;
    setPolls(next);
  }, []);

  const updatePoll = useCallback(
    async (pollId: string, update: (poll: Poll) => Poll) => {
      version.current++;
      const current = pollsRef.current.find((poll) => poll.id === pollId);
      if (!current) throw new Error(`Poll "${pollId}" was not found.`);
      const updated = update(current);
      if (metaChanged(current, updated) || updated.commentsPublic !== current.commentsPublic) {
        const accountId = await requireAccountId();
        if (!isPollOwner(current, accountId) || !isPollOwner(updated, accountId)) throw new Error("只有发起者可以管理投票。");
      }

      if (metaChanged(current, updated)) {
        await updatePollMeta(updated);
      }

      if (updated.votes !== current.votes) {
        if (!isPollOpen(current)) throw new Error("投票已结束，不能提交或修改。");
        const voter = getVoter();
        const ownVote = updated.votes.find((vote) => vote.voter.id === voter.id);
        if (ownVote) {
          await submitVote(pollId, voter.id, ownVote.ranking, updated.comments.find((comment) => comment.voter.id === voter.id)?.text ?? "");
        }
      }

      const next = pollsRef.current.map((poll) =>
        poll.id === pollId ? updated : poll,
      );
      version.current++;
    pollsRef.current = next;
      setPolls(next);
    },
    [],
  );

  const removePoll = useCallback(async (pollId: string) => {
    version.current++;
    const poll = pollsRef.current.find((item) => item.id === pollId);
    const accountId = await requireAccountId();
    if (!poll || !isPollOwner(poll, accountId)) throw new Error("只有发起者可以删除投票。");
    await deletePollRemote(pollId);
    const next = pollsRef.current.filter((poll) => poll.id !== pollId);
    version.current++;
    pollsRef.current = next;
    setPolls(next);
  }, []);

  const editComment = useCallback(async (pollId: string, commentId: string, text: string) => {
    await updateCommentRemote(commentId, text);
    const next = pollsRef.current.map((poll) => poll.id === pollId ? { ...poll,
      comments: poll.comments.map((comment) => comment.id === commentId ? { ...comment, text: text.trim() } : comment) } : poll);
    version.current++;
    pollsRef.current = next;
    setPolls(next);
  }, []);

  const deleteComment = useCallback(async (pollId: string, commentId: string) => {
    await deleteCommentRemote(commentId);
    const next = pollsRef.current.map((poll) => poll.id === pollId ? { ...poll,
      comments: poll.comments.filter((comment) => comment.id !== commentId) } : poll);
    version.current++;
    pollsRef.current = next;
    setPolls(next);
  }, []);

  return { polls, loading, error, syncError, refresh, savePoll, updatePoll, removePoll, editComment, deleteComment };
}
