import { useCallback, useEffect, useState } from "react";
import type { Poll } from "../types/poll";
import { readPolls, writePolls } from "../lib/storage/polls";

export function usePolls() {
  const [polls, setPolls] = useState<Poll[]>(readPolls);

  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === null || event.key === "bothpls:polls:v1") setPolls(readPolls());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const savePoll = useCallback((poll: Poll) => {
    const current = readPolls();
    const next = [poll, ...current.filter((item) => item.id !== poll.id)];
    writePolls(next);
    setPolls(next);
  }, []);

  const updatePoll = useCallback((pollId: string, update: (poll: Poll) => Poll) => {
    const current = readPolls();
    const next = current.map((poll) => (poll.id === pollId ? update(poll) : poll));
    writePolls(next);
    setPolls(next);
  }, []);

  return { polls, savePoll, updatePoll };
}
