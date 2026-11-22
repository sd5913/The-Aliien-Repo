import { useLocale } from "../../../i18n/LocaleProvider";
import { useAccount } from "../../auth/components/AccountProvider";
import { canSharePoll, isPollOwner } from "../utils/voting";
import { useSharePoll } from "./ShareProvider";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Poll } from "../../../types/poll";
import { isPollOpen } from "../../../components/ui/StatusPill";
import { PollOptionPreviews } from "./PollOptionPreviews";

const ACTION_WIDTH = 192;

interface PollCardProps {
  poll: Poll;
  to: string;
  compact?: boolean;
  surface?: "personal" | "square";
  returnTo?: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  onDelete: (poll: Poll) => void;
  onEnd: (poll: Poll) => void;
}

export function PollCard({
  poll,
  to,
  compact = false,
  surface = "personal",
  returnTo = "/",
  expanded,
  onExpand,
  onDelete,
  onEnd,
}: PollCardProps) {
  const { t, locale, votes } = useLocale();
  const { user: accountUser } = useAccount();
  const owner = surface !== "square" && isPollOwner(poll, accountUser?.id ?? "");
  const shareAllowed = surface !== "square" && canSharePoll(poll, accountUser?.id ?? "");
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
  const offset = owner ? dragOffset ?? (expanded ? -ACTION_WIDTH : 0) : 0;
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

  const openShare = useSharePoll();
  const share = () => { if (shareAllowed) openShare(poll); };

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!owner) return;
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
    if (owner && expanded) {
      event.preventDefault();
      onExpand(false);
      return;
    }
    if (target.closest("a")) return;
    navigate(to, { state: { returnTo } });
  };

  return (
    <div className={`swipe-card${owner && expanded ? " swipe-card-expanded" : ""}`}>
      {owner && <div className="swipe-actions" style={{ clipPath: `inset(0 0 0 calc(100% + ${offset}px))`, transition: dragOffset === null ? undefined : "none" }} aria-label={t("poll.actions")} aria-hidden={!expanded}>
        <button className="swipe-action swipe-edit" disabled={!isPollOpen(poll)} tabIndex={expanded ? 0 : -1} onClick={() => { onExpand(false); navigate(`/create?id=${poll.id}`); }}>
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
      </div>}
      <article
        className={`my-poll-card poll-card${compact ? " poll-card-compact" : ""}`}
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
          {surface !== "square" && (owner || poll.participatedByCurrentIdentity) && <div className="poll-identity-badges">{owner && <span>{t("poll.createdByMe")}</span>}{poll.participatedByCurrentIdentity && <span>{t("poll.votedByMe")}</span>}</div>}
          <Link className="my-poll-ticket-main" to={to} state={{ returnTo }}>
            <h3>{poll.title}</h3>
          </Link>
          <p className="my-poll-ticket-status">{t(isPollOpen(poll) ? "poll.open" : "poll.closed")} · {surface === "square" ? t("poll.squareParticipants", { count: poll.voteCount ?? poll.votes.length }) : votes(poll.voteCount ?? poll.votes.length)}</p>
          <p className="my-poll-deadline">{t("poll.deadlineValue", { date: deadline })}</p>
          {surface === "square" && <Link className="square-vote-link" to={to} state={{ returnTo }}>{t("poll.squareVote")} <span aria-hidden="true">↗</span></Link>}
          {shareAllowed && <button className="my-poll-share" onClick={share} aria-label={t("poll.share")}>
            <AppIcon name="share" size={20} />
          </button>}
        </div>
      </article>
    </div>
  );
}
