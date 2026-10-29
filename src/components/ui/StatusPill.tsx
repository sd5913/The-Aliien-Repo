import type { Poll } from "../../types/poll";
import { isPollOpen } from "../../lib/voting";

export function StatusPill({ poll }: { poll: Poll }) {
  const open = isPollOpen(poll);
  return <span className={`status-pill ${open ? "status-open" : "status-closed"}`}>{open ? "进行中" : "已结束"}</span>;
}
