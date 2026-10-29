// Compact visual status indicator for a poll. / 投票状态的紧凑型视觉提示。
import type { Poll } from "../../types/poll";
import { isPollOpen } from "../../lib/voting";

export function StatusPill({ poll }: { poll: Poll }) {
  const open = isPollOpen(poll);
  return <span className={`status-pill ${open ? "status-open" : "status-closed"}`}>{open ? "进行中" : "已结束"}</span>;
}
