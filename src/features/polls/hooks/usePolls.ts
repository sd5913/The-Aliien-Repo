// React state and updates for Supabase-backed polls.
// 投票主链路落三表；评论与评论可见性留本地。
import { useCallback, useEffect, useRef, useState } from "react";
import type { Poll } from "../../../types/poll";
import {
  createPoll,
  deletePollRemote,
  fetchPolls,
  persistLocalComments,
  persistLocalCommentsPublic,
  submitVote,
  updatePollMeta,
} from "../services/polls";
import { clearComments } from "../../../lib/storage/pollLocal";
import { getVoter } from "../utils/voting";

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
    const exists = pollsRef.current.some((item) => item.id === poll.id);
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

      if (metaChanged(current, updated)) {
        await updatePollMeta(updated);
      }

      if (updated.votes !== current.votes) {
        const voter = getVoter();
        const ownVote = updated.votes.find((vote) => vote.voter.id === voter.id);
        if (ownVote) {
          await submitVote(pollId, voter.id, ownVote.ranking);
        }
      }

      if (updated.comments !== current.comments) {
        persistLocalComments(pollId, updated.comments);
      }
      if (updated.commentsPublic !== current.commentsPublic) {
        persistLocalCommentsPublic(pollId, updated.commentsPublic !== false);
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
    await deletePollRemote(pollId);
    clearComments(pollId);
    const next = pollsRef.current.filter((poll) => poll.id !== pollId);
    pollsRef.current = next;
    setPolls(next);
  }, []);

  return { polls, loading, error, savePoll, updatePoll, removePoll };
}
