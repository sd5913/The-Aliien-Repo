import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { isPollOpen } from "../../../components/ui/StatusPill";
import type { Poll } from "../../../types/poll";

export function OwnerPollActions({ poll, onEnd, onDelete }: { poll: Poll; onEnd: () => Promise<void>; onDelete: () => Promise<void> }) {
  const [mode, setMode] = useState<"menu" | "end" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const navigate = useNavigate();
  const confirm = async () => {
    if (busy || (mode !== "end" && mode !== "delete")) return;
    setBusy(true);
    try {
      if (mode === "end") await onEnd(); else await onDelete();
      setFeedback(mode === "end" ? "投票已结束" : "投票已删除");
      setMode(null);
    } catch {
      setFeedback("操作失败，请检查网络或权限后重试。");
    } finally { setBusy(false); }
  };
  return <>
    <button className="settings-nav-button" aria-label="管理投票" onClick={() => setMode("menu")}>···</button>
    {mode === "menu" && <Modal title="管理投票" onClose={() => setMode(null)}>
      <div className="owner-action-menu">
        <button className="button-soft" disabled={!isPollOpen(poll)} onClick={() => navigate(`/create?id=${poll.id}`)}>编辑投票 / 截止时间</button>
        <button className="button-soft" onClick={() => navigate(`/create?copy=${poll.id}`)}>复制为新投票</button>
        <button className="button-soft" disabled={!isPollOpen(poll)} onClick={() => setMode("end")}>结束投票</button>
        <button className="danger-button" onClick={() => setMode("delete")}>删除投票</button>
      </div>
    </Modal>}
    {(mode === "end" || mode === "delete") && <Modal title={mode === "end" ? "确定结束这次投票吗？" : "确定删除这次投票吗？"}
      onClose={() => { if (!busy) setMode(null); }} actions={<>
        <button className="button-soft" disabled={busy} onClick={() => setMode("menu")}>取消</button>
        <button className="danger-button" disabled={busy} onClick={() => void confirm()}>{busy ? "处理中…" : mode === "end" ? "确认结束" : "确认删除"}</button>
      </>}><p>{mode === "end" ? "结束后不能继续投票或修改选择，结果和评论将公开。" : "投票、选票及评论将一并删除，删除后无法恢复。"}</p></Modal>}
    {feedback && <Toast message={feedback} onClose={() => setFeedback("")} />}
  </>;
}
