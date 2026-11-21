import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { isPollOpen } from "../../../components/ui/StatusPill";
import type { Poll } from "../../../types/poll";

export function OwnerPollActions({ poll, onEnd, onDelete }: { poll: Poll; onEnd: () => Promise<void>; onDelete: () => Promise<void> }) {
  const { t } = useLocale();
  const [mode, setMode] = useState<"menu" | "end" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<MessageKey | "">("");
  const navigate = useNavigate();
  const confirm = async () => {
    if (busy || (mode !== "end" && mode !== "delete")) return;
    setBusy(true);
    try {
      if (mode === "end") await onEnd(); else await onDelete();
      setFeedback(mode === "end" ? "poll.ended" : "poll.deleted");
      setMode(null);
    } catch {
      setFeedback("poll.actionFailed");
    } finally { setBusy(false); }
  };
  return <>
    <button className="settings-nav-button" aria-label={t("poll.manage")} onClick={() => setMode("menu")}>···</button>
    {mode === "menu" && <Modal title={t("poll.manage")} onClose={() => setMode(null)}>
      <div className="owner-action-menu">
        <button className="button-soft" disabled={!isPollOpen(poll)} onClick={() => navigate(`/create?id=${poll.id}`)}>编辑投票 / 截止时间</button>
        <button className="button-soft" onClick={() => navigate(`/create?copy=${poll.id}`)}>复制为新投票</button>
        <button className="button-soft" disabled={!isPollOpen(poll)} onClick={() => setMode("end")}>结束投票</button>
        <button className="danger-button" onClick={() => setMode("delete")}>删除投票</button>
      </div>
    </Modal>}
    {(mode === "end" || mode === "delete") && <Modal title={mode === "end" ? t("poll.endQuestion") : t("poll.deleteQuestion")}
      onClose={() => { if (!busy) setMode(null); }} actions={<>
        <button className="button-soft" disabled={busy} onClick={() => setMode("menu")}>{t("common.cancel")}</button>
        <button className="danger-button" disabled={busy} onClick={() => void confirm()}>{busy ? t("poll.processing") : mode === "end" ? t("poll.endConfirm") : t("poll.deleteConfirm")}</button>
      </>}><p>{mode === "end" ? t("poll.endDetails") : t("poll.deletePermanent")}</p></Modal>}
    {feedback && <Toast message={t(feedback)} onClose={() => setFeedback("")} />}
  </>;
}
