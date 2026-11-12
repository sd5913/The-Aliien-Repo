import type { Poll } from "../../types/poll";

export function isPollOpen(poll: Poll): boolean {
  return poll.status === "open" && (!poll.endsAt || new Date(poll.endsAt).getTime() > Date.now());
}

export function StatusPill({ poll }: { poll: Poll }) {
  const open = isPollOpen(poll);
  return <span className={`status-pill${open ? " status-open" : " status-closed"}`}>{open ? "进行中" : "已结束"}</span>;
}
