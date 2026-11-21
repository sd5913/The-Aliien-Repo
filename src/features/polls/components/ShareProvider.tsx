import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Toast } from "../../../components/ui/Toast";
import type { Poll } from "../../../types/poll";
import { copyPollLink, pollUrl, renderShareTicket } from "../utils/share";

type SharePage = "vote" | "results";
type ShareRequest = { poll: Poll; page: SharePage };
const ShareContext = createContext<(poll: Poll, page?: SharePage) => void>(() => {});
export const useSharePoll = () => useContext(ShareContext);

function ShareDialog({ poll, page, onClose, feedback, clearFeedback }: { poll: Poll; page: SharePage; onClose: () => void; feedback: string; clearFeedback: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => {
    const element = dialog.current!;
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; focused?.focus(); };
  }, []);
  useEffect(() => {
    let active = true;
    renderShareTicket(poll, page).then((url) => { if (active) setImage(url); }).catch(() => {
      if (active) setError("图片生成失败，请关闭后重试。你仍可复制链接。");
    });
    return () => { active = false; };
  }, [poll, page]);
  const copy = async () => {
    try { await copyPollLink(poll.id, page); setToast("链接已复制"); }
    catch { setToast("复制失败，请长按下方链接手动复制"); }
  };
  return <dialog ref={dialog} className="share-dialog" aria-labelledby="share-dialog-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="share-dialog-content">
      <div className="share-dialog-heading"><div><span className="eyebrow">{page === "results" ? "SHARE THE RESULT" : "SEND THE QUESTION"}</span><h2 id="share-dialog-title">{page === "results" ? "分享投票结果" : "把选择分享出去"}</h2></div><button className="share-close" onClick={onClose} aria-label="关闭分享">×</button></div>
      <div className="share-ticket-preview" aria-busy={!image && !error}>
        {image ? <img src={image} alt={`${poll.title}，${poll.options.length} 个选项的分享票根`} /> : <p role="status">{error || "正在生成你的分享票根…"}</p>}
      </div>
      <div className="share-dialog-actions">
        <button className="purple-button" onClick={() => void copy()}>复制链接 ↗</button>
        <a className={`button-soft${image ? "" : " is-disabled"}`} href={image || undefined} download={`BothPls-${poll.title.replace(/[<>:"/\\|?*]/g, "").slice(0, 50) || "投票"}.png`} aria-disabled={!image} onClick={(event) => { if (!image) event.preventDefault(); }}>↓ 下载图片</a>
      </div>
      <input className="share-selectable-url" aria-label={page === "results" ? "结果分享链接" : "投票分享链接"} value={pollUrl(poll.id, page)} readOnly onFocus={(event) => event.target.select()} />
      <p className="share-dialog-note">{page === "results" ? "把结果票根分享给朋友" : "把票根发给朋友，听听大家怎么选"}</p>
      {(toast || feedback) && <Toast message={toast || feedback} onClose={() => { setToast(""); clearFeedback(); }} />}
    </div>
  </dialog>;
}

export function ShareProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ShareRequest | null>(null);
  const [toast, setToast] = useState("");
  const open = (selected: Poll, page: SharePage = "vote") => {
    setRequest({ poll: selected, page });
    // Begin inside the click gesture: browsers require user activation for clipboard writes.
    void copyPollLink(selected.id, page).then(() => setToast("链接已复制")).catch(() => setToast("复制失败，可在浮窗中重试或手动复制链接"));
  };
  return <ShareContext.Provider value={open}>{children}{request && <ShareDialog key={`${request.poll.id}:${request.page}`} poll={request.poll} page={request.page} feedback={toast} clearFeedback={() => setToast("")} onClose={() => { setRequest(null); setToast(""); }} />}</ShareContext.Provider>;
}
