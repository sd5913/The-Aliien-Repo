import { useAccount } from "../../auth/components/AccountProvider";
import { useParticipant } from "../../auth/utils/useParticipant";
import { canSharePoll, isPollOwner } from "../utils/voting";
import { useSharePoll } from "../components/ShareProvider";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { isPollOpen } from "../../../components/ui/StatusPill";
import { usePolls } from "../hooks/usePolls";
import type { Poll } from "../../../types/poll";
import { setPollVisibility } from "../services/polls";

type Filter = "全部" | "进行中" | "已结束";
const ACTION_WIDTH = 192;

function MyPollCard({
  poll,
  expanded,
  onExpand,
  onDelete,
  onEnd,
  onVisibilityChange,
}: {
  poll: Poll;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  onDelete: (poll: Poll) => void;
  onEnd: (poll: Poll) => void;
  onVisibilityChange: (poll: Poll, isPublic: boolean) => void;
}) {
  const { user: accountUser } = useAccount();
  const shareAllowed = canSharePoll(poll, accountUser?.id ?? "");
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

  const openShare = useSharePoll();
  const share = () => { if (shareAllowed) openShare(poll); };

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
    navigate(`/poll/${poll.id}/results`, { state: { returnTo: "/settings" } });
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
        <button className="swipe-action swipe-edit" disabled={!isPollOpen(poll)} tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); navigate(`/create?id=${poll.id}`); }}>
          <AppIcon name="edit" size={20} />
          <span>编辑</span>
        </button>
        <button className="swipe-action swipe-delete" tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); onDelete(poll); }}>
          <AppIcon name="bin" size={20} />
          <span>删除</span>
        </button>
        <button className="swipe-action swipe-end" tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); onEnd(poll); }} disabled={!isPollOpen(poll)}>
          <AppIcon name="finished" size={20} />
          <span>结束</span>
        </button>
      </div>
      <article
        className="my-poll-card"
        data-ticket-tone={(parseInt(poll.id.slice(-1), 16) || 0) % 3}
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
          <Link className="my-poll-ticket-main" to={`/poll/${poll.id}/results`} state={{ returnTo: "/settings" }}>
            <h3>{poll.title}</h3>
          </Link>
          <p className="my-poll-ticket-status">
            {isPollOpen(poll) ? "进行中" : "已结束"} · {poll.voteCount ?? poll.votes.length} 票
          </p>
          <p className="my-poll-deadline">截止时间：{deadline}</p>
          <p className="my-poll-visibility">{poll.isPublic ? "公开 · 展示在广场" : "不公开 · 可通过链接分享"}</p>
          {poll.visibilityReviewedAt === null && Date.parse(poll.createdAt) < Date.parse("2026-11-19T16:00:00Z") && <div className="legacy-visibility-review" onClick={(event) => event.stopPropagation()}><p>这条旧投票目前不在广场展示。请选择是否公开。</p><div><button type="button" onClick={() => onVisibilityChange(poll, false)}>保持不公开</button><button type="button" onClick={() => onVisibilityChange(poll, true)}>公开到广场</button></div></div>}
          {shareAllowed && <button className="my-poll-share" onClick={share} aria-label="分享投票">
            <AppIcon name="share" size={20} />
          </button>}
        </div>
      </article>
    </div>
  );
}

export function MyPollsSection({ showCreateButton = true, personalPageStyle = false }: { showCreateButton?: boolean; personalPageStyle?: boolean }) {
  const [filter, setFilter] = useState<Filter>("全部");
  const { user: accountUser } = useAccount();
  const participant = useParticipant();
  const identityQuery = accountUser
    ? { owned: true as const, ownedFilter: filter === "全部" ? undefined : filter === "进行中" ? "active" as const : "ended" as const }
    : participant
      ? { voted: true as const, votedFilter: filter === "全部" ? undefined : filter === "进行中" ? "active" as const : "ended" as const }
      : { owned: true as const, ownedFilter: undefined };
  const { polls, loading, loadingMore, hasMore, loadMore, error, syncError, refresh, removePoll, updatePoll } = usePolls(identityQuery);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [ending, setEnding] = useState<Poll | null>(null);
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const location = useLocation();
  const [toast, setToast] = useState(typeof location.state?.toast === "string" ? location.state.toast : "");
  const ownedPolls = polls.filter((poll) => isPollOwner(poll, accountUser?.id ?? ""));
  const filtered = ownedPolls;

  useEffect(() => {
    if (!hasMore || loading || loadingMore || syncError || !loadMoreRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "300px" });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, syncError, loadMore]);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await removePoll(deleting.id);
      setExpandedPollId(null);
      setToast("投票已删除");
    } catch (error) {
      console.error("Could not delete poll.", error);
      setToast("删除失败，请稍后重试");
    } finally {
      setDeleting(null);
    }
  };

  const endPoll = async (poll: Poll) => {
    try {
      await updatePoll(poll.id, (current) => ({ ...current, status: "closed" }));
      setExpandedPollId(null);
      setToast("投票已结束");
    } catch (error) {
      console.error("Could not end poll.", error);
      setToast("结束投票失败，请稍后重试");
    }
  };

  const changeVisibility = async (poll: Poll, isPublic: boolean) => {
    try {
      await setPollVisibility(poll.id, isPublic);
      await refresh();
      setToast(isPublic ? "投票已公开到广场" : "投票已保持不公开，仍可复制链接分享");
    } catch (error) {
      console.error("Could not update poll visibility.", error);
      setToast("可见性设置失败，请稍后重试");
    }
  };

  return (
    <section className={personalPageStyle ? "settings-my-polls" : undefined}>
      <div className="page-heading my-heading"><div><span className="eyebrow">收集每一个小想法</span><h1>我的投票</h1></div>{showCreateButton && <Link to="/create" className="purple-button create-shortcut">＋ 创建投票</Link>}</div>
      <div className="filter-tabs" role="tablist">{(["全部", "进行中", "已结束"] as Filter[]).map((tab) => <button key={tab} role="tab" aria-selected={filter === tab} className={filter === tab ? "active" : ""} onClick={() => { setExpandedPollId(null); setFilter(tab); }}>{tab}</button>)}</div>
      {loading ? <p className="empty-inline">正在加载投票…</p> : error ? <p className="settings-feedback" role="alert">投票加载失败，请稍后重试。</p> : filtered.length ? <div className="my-poll-list">{filtered.map((poll) => <MyPollCard key={poll.id} poll={poll} expanded={expandedPollId === poll.id} onExpand={(next) => setExpandedPollId(next ? poll.id : null)} onDelete={(item) => { setExpandedPollId(null); setDeleting(item); }} onEnd={setEnding} onVisibilityChange={(item, value) => void changeVisibility(item, value)} />)}</div> : <div className="empty-state"><div className="empty-art">☁</div><h3>{ownedPolls.length ? "这里暂时没有这类投票" : "还没有投票哦"}</h3><p>创建一个小问题，邀请朋友帮你选。</p>{showCreateButton && <Link to="/create" className="purple-button">＋ 创建投票</Link>}</div>}
      {hasMore && <div ref={loadMoreRef} className="my-poll-load-more"><button type="button" className="button-soft" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "正在加载更多…" : "加载更多投票"}</button></div>}
      {syncError && <p className="settings-feedback" role="alert">加载更多失败，请点击“加载更多投票”重试。</p>}
      {ending && <Modal title="确定结束这次投票吗？" onClose={() => setEnding(null)} actions={<><button className="button-soft" onClick={() => setEnding(null)}>取消</button><button className="danger-button" onClick={() => { const selected = ending; setEnding(null); void endPoll(selected); }}>确认结束</button></>}><p>结束后不能继续投票或修改选择，结果和评论将公开。</p></Modal>}
      {deleting && <Modal title="确定删除这条投票吗？" onClose={() => setDeleting(null)} actions={<><button className="button-soft" onClick={() => setDeleting(null)}>再想想</button><button className="danger-button" onClick={confirmDelete}>删除投票</button></>}><p>删除后「{deleting.title}」及其投票和评论将一并移除。</p></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </section>
  );
}
