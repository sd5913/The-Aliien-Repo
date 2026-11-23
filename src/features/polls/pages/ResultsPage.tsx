import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useAccount } from "../../auth/components/AccountProvider";
import { pollPath, pollReturnTo } from "../utils/navigation";
import { useSharePoll } from "../components/ShareProvider";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams, useNavigate } from "react-router-dom";
import { OwnerPollActions } from "../components/OwnerPollActions";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill, isPollOpen } from "../../../components/ui/StatusPill";
import { usePolls } from "../hooks/usePolls";
import { LiquidResults } from "../components/LiquidResults";
import { optionColors } from "../utils/optionColors";
import { CommentList } from "../components/CommentList";
import { getVoter, isPollOwner } from "../utils/voting";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import type { PollComment } from "../../../types/poll";
import { AppIcon } from "../../../components/ui/AppIcon";

export function ResultsPage() {
  const { t, locale, votes, participants, percent } = useLocale();
  const { id = "" } = useParams();
  const location = useLocation();
  const { polls, loading, error, syncError, editComment, deleteComment, updatePoll, removePoll } = usePolls({ pollId: id });
  const navigate = useNavigate();
  const poll = polls.find((item) => item.id === id);
  const { user: accountUser, loading: accountLoading } = useAccount();
  const openShare = useSharePoll();
  const [openedShare, setOpenedShare] = useState(false);
  useEffect(() => {
    if (poll && isPollOwner(poll, accountUser?.id ?? "") && new URLSearchParams(location.search).get("share") === "1" && !openedShare) {
      setOpenedShare(true);
      openShare(poll);
    }
  }, [poll, accountUser?.id, location.search, openedShare, openShare]);
  const voter = getVoter();
  const [deletingComment, setDeletingComment] = useState<PollComment | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState<MessageKey | "">(location.state?.published ? "results.published" : location.state?.saved ? "results.saved" : "");
  const shareResult = async () => {
    if (!poll || !isPollOwner(poll, accountUser?.id ?? "")) return;
    const url = `${window.location.origin}/poll/${encodeURIComponent(poll.id)}/results`;
    try {
      await navigator.clipboard.writeText(url);
      setCommentFeedback("results.resultLinkCopied");
    } catch {
      setCommentFeedback("results.resultLinkCopyFailed");
    }
  };
  const confirmCommentDelete = async () => {
    if (!deletingComment || commentBusy) return;
    setCommentBusy(true);
    try {
      await deleteComment(id, deletingComment.id);
      setDeletingComment(null);
      setCommentFeedback("comment.deleted");
    } catch {
      setCommentFeedback("comment.deleteFailed");
    } finally {
      setCommentBusy(false);
    }
  };
  const returnTo = pollReturnTo(location);
  const closeButton = (
    <>
    {poll && isPollOwner(poll, accountUser?.id ?? "") && <OwnerPollActions poll={poll} onShare={() => openShare(poll)}
      onEnd={() => updatePoll(poll.id, (current) => ({ ...current, status: "closed" }))}
      onDelete={async () => { await removePoll(poll.id); navigate(returnTo, { replace: true }); }} />}
    <Link className="results-close-button" to="/" aria-label={t("results.close")}>
      ×
    </Link>
    </>
  );

  if (accountLoading || loading)
    return <PageShell showNavigation={false} title={t("results.heading")} showHeaderTitle headerAction={closeButton}><p className="empty-inline">{t("poll.loading")}</p></PageShell>;

  if (!accountUser) return <Navigate replace to="/" />;

  if (error)
    return <PageShell showNavigation={false} title={t("results.heading")} showHeaderTitle headerAction={closeButton}><p className="settings-feedback" role="alert">{t("poll.loadFailed")}</p></PageShell>;

  if (!poll)
    return (
      <PageShell showNavigation={false} title={t("results.heading")} showHeaderTitle headerAction={closeButton}>
        <div className="empty-state">
          <h2>{t("poll.missing")}</h2>
          <Link to="/" className="purple-button">
            {t("common.home")}
          </Link>
        </div>
      </PageShell>
    );

  const counts = new Map(poll.options.map((option) => [option.id, 0]));
  poll.votes.forEach((vote) => {
    const optionId = vote.selectedOptionId;
    if (optionId && counts.has(optionId))
      counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  });
  const open = isPollOpen(poll);
  const owner = isPollOwner(poll, accountUser?.id ?? "");
  const commentsVisible = !open || owner;
  const validTotal = [...counts.values()].reduce((sum, count) => sum + count, 0);

  const highest = Math.max(0, ...counts.values());
  const leaders = poll.options.filter((option) => highest > 0 && counts.get(option.id) === highest);
  const leaderText = new Intl.ListFormat(locale).format(leaders.map((option) => String.fromCharCode(65 + poll.options.indexOf(option))));

  return (
    <PageShell showNavigation={false} title={t("results.heading")} showHeaderTitle headerAction={closeButton}>
      <div className="results-redesign">
      <div className="results-heading">
        <StatusPill poll={poll} />
        <h1>{poll.title}</h1>
        <p>{participants(poll.votes.length)} · {t("results.proportions")}</p>
      </div>
      {syncError && <p className="field-hint" role="status">{t("results.syncFailed")}</p>}
      {highest > 0 && <p className="result-leader-summary" role="status">{leaders.length > 1 ? t("results.tie", { leaders: leaderText }) : t(open ? "results.leading" : "results.winner", { leader: leaderText })}</p>}
      <LiquidResults options={poll.options} counts={counts} />
      <section className="results-card" aria-label={t("results.breakdown")}>
        <div className="result-option-list">
          {poll.options.map((option, index) => {
            const count = counts.get(option.id) ?? 0;
            const ratio = validTotal ? count / validTotal : 0;
            return (
              <div className="result-option-row" key={option.id}>
                {option.imageUrl && <img className="result-option-image" src={option.imageUrl} alt="" />}<span className="result-color" style={{ background: optionColors[index % optionColors.length] }} />
                <strong>{String.fromCharCode(65 + index)} {option.name}</strong>
                <span>
                  {votes(count)} · {percent(ratio)}
                </span>
              </div>
            );
          })}
        </div>
        {!poll.votes.length && (
          <p className="empty-inline">
            {t(owner ? "results.empty" : "results.emptyParticipant")}
          </p>
        )}
      </section>
      {!commentsVisible && <p className="empty-inline">{t("comment.afterClose")}</p>}
      {commentsVisible && (
        <section className="comments-section">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">{open && owner ? t("comment.ownerOnly") : t("comment.reasons")}</span>
              <h2>
                {t("comment.heading")}{" "}
                <span className="heading-count">{t("comment.count", { count: poll.comments.length })}</span>
              </h2>
            </div>
          </div>
          <CommentList comments={poll.comments} options={poll.options} currentVoterId={voter.id} isPollOwner={owner}
            onEdit={async (comment, text) => { await editComment(id, comment.id, text); setCommentFeedback("comment.updated"); }}
            onDelete={setDeletingComment} />
        </section>
      )}
      {!open ? (
        <div className="locked-bottom">{t("results.locked")}</div>
      ) : !owner && (
        <Link
          className="purple-button button-full result-vote-button"
          to={pollPath(poll.id, "vote", returnTo)}
        >
          {poll.votes.some((vote) => vote.voter.id === voter.id) ? t("results.changeVote") : t("results.join")} <span>↗</span>
        </Link>
      )}
      {owner && <button className="result-share-icon" type="button" onClick={() => void shareResult()} aria-label={t("results.shareResult")} title={t("results.shareResult")}><AppIcon name="share" size={24} /></button>}
      </div>
      {deletingComment && <Modal title={t("comment.deleteQuestion")} onClose={() => { if (!commentBusy) setDeletingComment(null); }} actions={<>
        <button className="button-soft" disabled={commentBusy} onClick={() => setDeletingComment(null)}>{t("common.cancel")}</button>
        <button className="danger-button" disabled={commentBusy} onClick={() => void confirmCommentDelete()}>{t(commentBusy ? "comment.deleting" : "comment.delete")}</button>
      </>}><p>{t("comment.deleteDetails")}</p></Modal>}
      {commentFeedback && <Toast message={t(commentFeedback)} onClose={() => setCommentFeedback("")} />}
    </PageShell>
  );
}
