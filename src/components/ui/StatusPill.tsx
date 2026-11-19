import { useLocale } from "../../i18n/LocaleProvider";
import type { Poll } from "../../types/poll";

export function isPollOpen(poll: Poll): boolean {
  return poll.status === "open" && (!poll.endsAt || new Date(poll.endsAt).getTime() > Date.now());
}

export function StatusPill({ poll }: { poll: Poll }) {
  const { t } = useLocale();
  const open = isPollOpen(poll);
  return <span className={`status-pill${open ? " status-open" : " status-closed"}`}>{open ? t("poll.open") : t("poll.closed")}</span>;
}
