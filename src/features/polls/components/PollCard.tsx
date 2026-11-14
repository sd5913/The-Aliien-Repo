import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Poll } from "../../../types/poll";
import { isPollOpen } from "../../../components/ui/StatusPill";

const ACTION_WIDTH = 192;

interface PollCardProps {
  poll: Poll;
  to: string;
  compact?: boolean;
  returnTo?: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  onDelete: (poll: Poll) => void;
  onEnd: (poll: Poll) => void;
  notify: (message: string) => void;
}

export function PollCard({
  poll,
  to,
  compact = false,
  returnTo = "/",
  expanded,
  onExpand,
  onDelete,
  onEnd,
  notify,
}: PollCardProps) {
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const gesture = useRef<{
    startX: number;
    origin: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const navigate = useNavigate();
  const offset = dragOffset ?? (expanded ? -ACTION_WIDTH : 0);
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
      notify("链接已复制");
    } catch (error) {
      console.error("Could not copy poll link.", error);
      notify("复制失败，请检查剪贴板权限");
    }
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gesture.current = {
      startX: event.clientX,
      origin: expanded ? -ACTION_WIDTH : 0,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
    const interactiveTarget =
      event.target instanceof Element ? event.target.closest("a, button") : null;
    const captureTarget =
      interactiveTarget instanceof HTMLElement ? interactiveTarget : event.currentTarget;
    captureTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const activeGesture = gesture.current;
    if (!activeGesture) return;
    const delta = event.clientX - activeGesture.startX;
    if (Math.abs(delta) > 6) activeGesture.moved = true;
    if (activeGesture.moved) {
      const elapsed = Math.max(1, event.timeStamp - activeGesture.lastTime);
      activeGesture.velocity = (event.clientX - activeGesture.lastX) / elapsed;
      activeGesture.lastX = event.clientX;
      activeGesture.lastTime = event.timeStamp;
      setDragOffset(Math.max(-ACTION_WIDTH, Math.min(0, activeGesture.origin + delta)));
    }
  };

  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    const activeGesture = gesture.current;
    if (!activeGesture) return;
    gesture.current = null;
    if (activeGesture.moved) {
      const threshold = Math.min(ACTION_WIDTH, event.currentTarget.getBoundingClientRect().width / 3);
      const finalOffset = Math.max(
        -ACTION_WIDTH,
        Math.min(
          0,
          activeGesture.origin +
            event.clientX -
            activeGesture.startX +
            activeGesture.velocity * 110,
        ),
      );
      onExpand(finalOffset <= -threshold);
      setDragOffset(null);
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 250);
    }
  };

  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest(".my-poll-share")) return;
    if (expanded) {
      event.preventDefault();
      onExpand(false);
      return;
    }
    if (target.closest("a")) return;
    navigate(to, { state: { returnTo } });
  };

  return (
    <div className={`swipe-card${expanded ? " swipe-card-expanded" : ""}`}>
      <div className="swipe-actions" aria-label="投票操作" aria-hidden={!expanded}>
        <button className="swipe-action swipe-edit" tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); navigate(`/create?id=${poll.id}`); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z" /></svg>
          <span>编辑</span>
        </button>
        <button className="swipe-action swipe-delete" tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); onDelete(poll); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg>
          <span>删除</span>
        </button>
        <button className="swipe-action swipe-end" tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); onEnd(poll); }} disabled={!isPollOpen(poll)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>
          <span>结束</span>
        </button>
      </div>
      <article
        className={`my-poll-card poll-card${compact ? " poll-card-compact" : ""}`}
        style={{ transform: `translateX(${offset}px)`, transition: dragOffset === null ? undefined : "none" }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={handleCardClick}
      >
        <div className="my-poll-thumbnails" aria-hidden="true">
          {[poll.options[0], poll.options[1]].map((option, index) => (
            <img key={option?.id ?? index} src={option?.imageUrl ?? `https://picsum.photos/seed/bothpls-option-${index}/180/180`} alt="" draggable="false" />
          ))}
        </div>
        <div className="my-poll-ticket-copy">
          <Link className="my-poll-ticket-main" to={to} state={{ returnTo }}>
            <h3>{poll.title}</h3>
          </Link>
          <p className="my-poll-ticket-status">{isPollOpen(poll) ? "进行中" : "已结束"} · {poll.votes.length} 票</p>
          <p className="my-poll-deadline">截止时间：{deadline}</p>
          <button className="my-poll-share" onClick={() => void share()} aria-label="分享投票">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18c0-7 5-12 13-12h1m-5-4 5 4-5 4" /></svg>
          </button>
        </div>
      </article>
    </div>
  );
}
