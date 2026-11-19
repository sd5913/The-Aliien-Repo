import { useLocale } from "../../../i18n/LocaleProvider";
// Compact visual status indicator for a poll. / 投票状态的紧凑型视觉提示。
import type { Poll } from "../../../types/poll";
import { isPollOpen } from "../utils/voting";

export function StatusPill({ poll }: { poll: Poll }) {
  const { t } = useLocale();
  const open = isPollOpen(poll);
  return <span className={`status-pill ${open ? "status-open" : "status-closed"}`}>{open ? t("poll.open") : t("poll.closed")}</span>;
}
