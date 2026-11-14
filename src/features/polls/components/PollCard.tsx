import { useState } from "react";
import { Link } from "react-router-dom";
import type { Poll } from "../../../types/poll";
import { Toast } from "../../../components/ui/Toast";
import { isPollOpen } from "../../../components/ui/StatusPill";

export function PollCard({ poll, to, compact = false, returnTo = "/" }: { poll: Poll; to: string; compact?: boolean; returnTo?: string }) {
  const [toast, setToast] = useState("");
  const deadlineDate = poll.endsAt ? new Date(poll.endsAt) : null;
  const deadline =
    deadlineDate && !Number.isNaN(deadlineDate.getTime())
      ? deadlineDate.toLocaleString("zh-CN", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "未设置";

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/poll/${poll.id}`);
      setToast("链接已复制");
    } catch (error) {
      console.error("Could not copy poll link.", error);
      setToast("复制失败，请检查剪贴板权限");
    }
  };

  return (
    <>
      <article className={`my-poll-card poll-card${compact ? " poll-card-compact" : ""}`}>
        <div className="my-poll-thumbnails" aria-hidden="true">
          {[poll.options[0], poll.options[1]].map((option, index) => (
            <img
              key={option?.id ?? index}
              src={option?.imageUrl ?? `https://picsum.photos/seed/bothpls-option-${index}/180/180`}
              alt=""
              draggable="false"
            />
          ))}
        </div>
        <div className="my-poll-ticket-copy">
          <Link className="my-poll-ticket-main" to={to} state={{ returnTo }}>
            <h3>{poll.title}</h3>
          </Link>
          <p className="my-poll-ticket-status">
            {isPollOpen(poll) ? "进行中" : "已结束"} · {poll.votes.length} 票
          </p>
          <p className="my-poll-deadline">截止时间：{deadline}</p>
          <button className="my-poll-share" onClick={() => void share()} aria-label="分享投票">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18c0-7 5-12 13-12h1m-5-4 5 4-5 4" /></svg>
          </button>
        </div>
      </article>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}
