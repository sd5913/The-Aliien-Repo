import { requireAccountId } from "../../auth/services/auth";
// React state and updates for Supabase-backed polls.
// Votes and comments are saved together by the server; visibility is enforced by RLS.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Poll } from "../../../types/poll";
import {
  createPoll,
  deletePollRemote,
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

  useEffect(() => {
    let active = true;
    fetchPolls()
      .then((data) => {
        if (!active) return;
        pollsRef.current = data;
        setPolls(data);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        console.error("BothPls: failed to load polls from Supabase.", cause);
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const savePoll = useCallback(async (poll: Poll) => {
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
    pollsRef.current = next;
    setPolls(next);
  }, []);

  const updatePoll = useCallback(
    async (pollId: string, update: (poll: Poll) => Poll) => {
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
      pollsRef.current = next;
      setPolls(next);
    },
    [],
  );

  const removePoll = useCallback(async (pollId: string) => {
    const poll = pollsRef.current.find((item) => item.id === pollId);
    const accountId = await requireAccountId();
    if (!poll || !isPollOwner(poll, accountId)) throw new Error("只有发起者可以删除投票。");
    await deletePollRemote(pollId);
    const next = pollsRef.current.filter((poll) => poll.id !== pollId);
    pollsRef.current = next;
    setPolls(next);
  }, []);

  return { polls, loading, error, savePoll, updatePoll, removePoll };
}
