import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { isPollOpen } from "../../../components/ui/StatusPill";
import { usePolls } from "../hooks/usePolls";
import type { Poll } from "../../../types/poll";

type Filter = "全部" | "进行中" | "已结束";
const ACTION_WIDTH = 192;

function MyPollCard({
  poll,
  expanded,
  onExpand,
  onDelete,
  onEnd,
  notify,
}: {
  poll: Poll;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  onDelete: (poll: Poll) => void;
  onEnd: (poll: Poll) => void;
  notify: (message: string) => void;
}) {
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
      event.target instanceof Element
        ? event.target.closest("a, button")
        : null;
    const captureTarget =
      interactiveTarget instanceof HTMLElement
        ? interactiveTarget
        : event.currentTarget;
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
      const nextExpanded = finalOffset <= -threshold;
      onExpand(nextExpanded);
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
    navigate(`/poll/${poll.id}/manage`, { state: { returnTo: "/settings" } });
  };

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
        className="my-poll-card"
        style={{ transform: `translateX(${offset}px)`, transition: dragOffset === null ? undefined : "none" }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={handleCardClick}
      >
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
          <Link className="my-poll-ticket-main" to={`/poll/${poll.id}/manage`} state={{ returnTo: "/settings" }}>
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
    </div>
  );
}

export function MyPollsSection({ showCreateButton = true, personalPageStyle = false }: { showCreateButton?: boolean; personalPageStyle?: boolean }) {
  const { polls, removePoll, updatePoll } = usePolls();
  const [filter, setFilter] = useState<Filter>("全部");
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const location = useLocation();
  const [toast, setToast] = useState(typeof location.state?.toast === "string" ? location.state.toast : "");
  const filtered = polls.filter((poll) => filter === "全部" || (filter === "进行中" ? isPollOpen(poll) : !isPollOpen(poll)));

  const confirmDelete = () => {
    if (!deleting) return;
    try {
      removePoll(deleting.id);
      setExpandedPollId(null);
      setToast("投票已删除");
    } catch (error) {
      console.error("Could not delete poll.", error);
      setToast("删除失败，请稍后重试");
    } finally {
      setDeleting(null);
    }
  };

  const endPoll = (poll: Poll) => {
    try {
      updatePoll(poll.id, (current) => ({ ...current, status: "closed" }));
      setExpandedPollId(null);
      setToast("投票已结束");
    } catch (error) {
      console.error("Could not end poll.", error);
      setToast("结束投票失败，请稍后重试");
    }
  };

  return (
    <section id={personalPageStyle ? "my-polls" : undefined} className={personalPageStyle ? "settings-my-polls" : undefined}>
      <div className="page-heading my-heading"><div><span className="eyebrow">收集每一个小想法</span><h1>我的投票</h1></div>{showCreateButton && <Link to="/create" className="purple-button create-shortcut">＋ 创建投票</Link>}</div>
      <div className="filter-tabs" role="tablist">{(["全部", "进行中", "已结束"] as Filter[]).map((tab) => <button key={tab} role="tab" aria-selected={filter === tab} className={filter === tab ? "active" : ""} onClick={() => { setExpandedPollId(null); setFilter(tab); }}>{tab}</button>)}</div>
      {filtered.length ? <div className="my-poll-list">{filtered.map((poll) => <MyPollCard key={poll.id} poll={poll} expanded={expandedPollId === poll.id} onExpand={(next) => setExpandedPollId(next ? poll.id : null)} onDelete={(item) => { setExpandedPollId(null); setDeleting(item); }} onEnd={endPoll} notify={setToast} />)}</div> : <div className="empty-state"><div className="empty-art">☁</div><h3>{polls.length ? "这里暂时没有这类投票" : "还没有投票哦"}</h3><p>创建一个小问题，邀请朋友帮你选。</p>{showCreateButton && <Link to="/create" className="purple-button">＋ 创建投票</Link>}</div>}
      {deleting && <Modal title="确定删除这条投票吗？" onClose={() => setDeleting(null)} actions={<><button className="button-soft" onClick={() => setDeleting(null)}>再想想</button><button className="danger-button" onClick={confirmDelete}>删除投票</button></>}><p>删除后「{deleting.title}」及其投票和评论将一并移除。</p></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </section>
  );
}
