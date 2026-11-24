import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useAccount } from "../../auth/components/AccountProvider";
import { useParticipant } from "../../auth/utils/useParticipant";
import { canSharePoll, isPollOwner } from "../utils/voting";
import { useSharePoll } from "../components/ShareProvider";
import { PollOptionPreviews } from "../components/PollOptionPreviews";
import { AppIcon } from "../../../components/ui/AppIcon";
import { LoadingState, LoadingSpinner } from "../../../components/ui/LoadingState";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { isPollOpen } from "../../../components/ui/StatusPill";
import { usePolls } from "../hooks/usePolls";
import type { Poll } from "../../../types/poll";
import { setPollVisibility } from "../services/polls";

const filters = { all: "poll.all", active: "poll.open", ended: "poll.closed" } as const;
type Filter = keyof typeof filters;
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
  const { t, locale, votes } = useLocale();
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
      ? deadlineDate.toLocaleString(locale, {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : t("common.notSet");

  return (
    <div className={`swipe-card${expanded ? " swipe-card-expanded" : ""}`}>
      <div className="swipe-actions" style={{ clipPath: `inset(0 0 0 calc(100% + ${offset}px))`, transition: dragOffset === null ? undefined : "none" }} aria-label={t("poll.actions")} aria-hidden={!expanded}>
        <button className="swipe-action swipe-edit" disabled={!isPollOpen(poll)} tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); navigate(`/create?id=${poll.id}&returnTo=${encodeURIComponent("/settings")}`); }}>
          <AppIcon name="edit" size={20} />
          <span>{t("common.edit")}</span>
        </button>
        <button className="swipe-action swipe-delete" tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); onDelete(poll); }}>
          <AppIcon name="bin" size={20} />
          <span>{t("common.delete")}</span>
        </button>
        <button className="swipe-action swipe-end" tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); onEnd(poll); }} disabled={!isPollOpen(poll)}>
          <AppIcon name="finished" size={20} />
          <span>{t("poll.endShort")}</span>
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
        <PollOptionPreviews options={poll.options} />
        <div className="my-poll-ticket-copy">
          <Link className="my-poll-ticket-main" to={`/poll/${poll.id}/results`} state={{ returnTo: "/settings" }}>
            <h3>{poll.title}</h3>
          </Link>
          <p className="my-poll-ticket-status">
            {isPollOpen(poll) ? t("poll.open") : t("poll.closed")} · {votes(poll.voteCount ?? poll.votes.length)}
          </p>
          <p className="my-poll-deadline">{t("poll.deadlineValue", { date: deadline })}</p>
          <p className="my-poll-visibility">{poll.isPublic ? t("poll.visibilityPublic") : t("poll.visibilityPrivate")}</p>
          {poll.visibilityReviewedAt === null && Date.parse(poll.createdAt) < Date.parse("2026-11-19T16:00:00Z") && <div className="legacy-visibility-review" onClick={(event) => event.stopPropagation()}><p>{t("poll.legacyReview")}</p><div><button type="button" onClick={() => onVisibilityChange(poll, false)}>{t("poll.keepPrivate")}</button><button type="button" onClick={() => onVisibilityChange(poll, true)}>{t("poll.publishSquare")}</button></div></div>}
          {shareAllowed && <button className="my-poll-share" onClick={share} aria-label={t("poll.share")}>
            <AppIcon name="share" size={20} />
          </button>}
        </div>
      </article>
    </div>
  );
}

export function MyPollsSection({ showCreateButton = true, personalPageStyle = false }: { showCreateButton?: boolean; personalPageStyle?: boolean }) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const { user: accountUser } = useAccount();
  const participant = useParticipant();
  const identityQuery = accountUser
    ? { owned: true as const, ownedFilter: filter === "all" ? undefined : filter }
    : participant
      ? { voted: true as const, votedFilter: filter === "all" ? undefined : filter }
      : { owned: true as const, ownedFilter: undefined };
  const { polls, loading, loadingMore, hasMore, loadMore, error, syncError, refresh, removePoll, updatePoll } = usePolls(identityQuery);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [ending, setEnding] = useState<Poll | null>(null);
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const location = useLocation();
  const [toast, setToast] = useState<MessageKey | "">(typeof location.state?.toast === "string" ? location.state.toast as MessageKey : "");
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
      setToast("poll.deleted");
    } catch (error) {
      console.error("Could not delete poll.", error);
      setToast("poll.deleteFailed");
    } finally {
      setDeleting(null);
    }
  };

  const endPoll = async (poll: Poll) => {
    try {
      await updatePoll(poll.id, (current) => ({ ...current, status: "closed" }));
      setExpandedPollId(null);
      setToast("poll.ended");
    } catch (error) {
      console.error("Could not end poll.", error);
      setToast("poll.endFailed");
    }
  };

  const changeVisibility = async (poll: Poll, isPublic: boolean) => {
    try {
      await setPollVisibility(poll.id, isPublic);
      await refresh();
      setToast(isPublic ? "poll.visibilityPublicToast" : "poll.visibilityPrivateToast");
    } catch (error) {
      console.error("Could not update poll visibility.", error);
      setToast("poll.visibilityFailed");
    }
  };

  return (
    <section className={personalPageStyle ? "settings-my-polls" : undefined}>
      <div className="page-heading my-heading"><div><span className="eyebrow">{t("poll.collection")}</span><h1>{t("poll.mine")}</h1></div>{showCreateButton && <Link to="/create" className="purple-button create-shortcut">＋ {t("poll.create")}</Link>}</div>
      <div className="filter-tabs" role="tablist">{(Object.keys(filters) as Filter[]).map((tab) => <button key={tab} role="tab" aria-selected={filter === tab} className={filter === tab ? "active" : ""} onClick={() => { setExpandedPollId(null); setFilter(tab); }}>{t(filters[tab])}</button>)}</div>
      {loading ? <LoadingState /> : error ? <p className="settings-feedback" role="alert">{t("home.recentLoadFailed")}</p> : filtered.length ? <div className="my-poll-list">{filtered.map((poll) => <MyPollCard key={poll.id} poll={poll} expanded={expandedPollId === poll.id} onExpand={(next) => setExpandedPollId(next ? poll.id : null)} onDelete={(item) => { setExpandedPollId(null); setDeleting(item); }} onEnd={setEnding} onVisibilityChange={(item, value) => void changeVisibility(item, value)} />)}</div> : <div className="empty-state"><div className="empty-art">☁</div><h3>{ownedPolls.length ? t("poll.emptyFilter") : t("poll.empty")}</h3><p>{t("poll.emptyDetails")}</p>{showCreateButton && <Link to="/create" className="purple-button">＋ {t("poll.create")}</Link>}</div>}
      {hasMore && <div ref={loadMoreRef} className="my-poll-load-more"><button type="button" className="button-soft" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore && <LoadingSpinner />}{loadingMore ? t("poll.moreLoading") : t("poll.more")}</button></div>}
      {syncError && <p className="settings-feedback" role="alert">{t("poll.moreFailed")}</p>}
      {ending && <Modal title={t("poll.endQuestion")} onClose={() => setEnding(null)} actions={<><button className="button-soft" onClick={() => setEnding(null)}>{t("common.cancel")}</button><button className="danger-button" onClick={() => { const selected = ending; setEnding(null); void endPoll(selected); }}>{t("poll.endConfirm")}</button></>}><p>{t("poll.endDetails")}</p></Modal>}
      {deleting && <Modal title={t("poll.deleteQuestion")} onClose={() => setDeleting(null)} actions={<><button className="button-soft" onClick={() => setDeleting(null)}>{t("poll.keep")}</button><button className="danger-button" onClick={confirmDelete}>{t("poll.delete")}</button></>}><p>{t("poll.deleteDetails", { title: deleting.title })}</p></Modal>}
      {toast && <Toast message={t(toast)} onClose={() => setToast("")} />}
    </section>
  );
}
