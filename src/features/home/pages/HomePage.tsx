import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useAccount } from "../../auth/components/AccountProvider";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { PollCard } from "../../polls/components/PollCard";
import { usePolls } from "../../polls/hooks/usePolls";
import { isPollOwner } from "../../polls/utils/voting";
import type { Poll } from "../../../types/poll";
import { useParticipant } from "../../auth/utils/useParticipant";

export function HomePage() {
  const { t } = useLocale();
  const { polls, loading, error, removePoll, updatePoll } = usePolls({ recent: true });
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [ending, setEnding] = useState<Poll | null>(null);
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const [toast, setToast] = useState<MessageKey | "">("");
  const { user: accountUser } = useAccount();
  const participant = useParticipant();
  // Keep the polls this device created at the top so their owner can always reach
  // the manage/edit entry from the home list.
  // 本机发起的投票排在前面，保证发起者能直接从首页进入管理与编辑。
  const recent = [
    ...polls.filter((poll) => isPollOwner(poll, accountUser?.id ?? "")),
    ...polls.filter((poll) => !isPollOwner(poll, accountUser?.id ?? "")),
  ].slice(0, 5);

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

  return (
    <PageShell>
      <section className="home-welcome">
        <span className="eyebrow">{t("home.eyebrow")}</span>
        <h1>{t("home.headlineOne")}<br />{t("home.headlineTwo")}</h1>
        <p>{t("home.intro")}</p>
        <Link to="/create" className="purple-button">{t("home.startPoll")} <span>↗</span></Link>
        {accountUser ? <Link to="/settings" className="auth-quick-link">{t("home.profile")}</Link> : participant ? <Link to="/settings" className="auth-quick-link"><span aria-hidden="true">{participant.avatar}</span> {participant.nickname} · {t("home.voter")}</Link> : <Link to="/auth" className="auth-quick-link">{t("home.login")}</Link>}
        <div className="welcome-sticker" aria-hidden="true">✦</div>
      </section>
      <section className="home-steps">
        <div className="section-title-row"><div><span className="eyebrow">{t("home.steps")}</span><h2>{t("home.chooseTogether")}</h2></div><span className="steps-sparkle" aria-hidden="true">✦</span></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><span className="step-icon"><AppIcon name="edit" size={24} /></span><h3>{t("home.stepOptions")}</h3><p>{t("home.stepOptionsDetails")}</p></article>
          <article className="step-card"><span className="step-number">02</span><span className="step-icon"><AppIcon name="share" size={24} /></span><h3>{t("home.stepShare")}</h3><p>{t("home.stepShareDetails")}</p></article>
          <article className="step-card"><span className="step-number">03</span><span className="step-icon"><AppIcon name="heart" size={26} /></span><h3>{t("home.stepResults")}</h3><p>{t("home.stepResultsDetails")}</p></article>
        </div>
      </section>
      <section className="home-recent">
        <div className="section-title-row"><div><span className="eyebrow">{t("home.decideTogether")}</span><h2>{t("home.recent")}</h2></div><Link className="subtle-link" to="/settings#my-polls">{t("home.seeAll")}</Link></div>
        {loading ? <p className="empty-inline">{t("poll.loading")}</p> : error ? <p className="settings-feedback" role="alert">{t("poll.loadFailed")}</p> : recent.length ? <div className="poll-card-list">{recent.map((poll) => <PollCard key={poll.id} poll={poll} to={`/poll/${poll.id}/results`} returnTo="/" expanded={expandedPollId === poll.id} onExpand={(next) => setExpandedPollId(next ? poll.id : null)} onDelete={(item) => { setExpandedPollId(null); setDeleting(item); }} onEnd={setEnding} />)}</div> : (
          <div className="empty-state"><div className="empty-art" aria-hidden="true"><span>☁</span><i>♡</i></div><h3>{t("poll.empty")}</h3><p>{t("poll.emptyDetails")}</p><Link className="purple-button" to="/create">{t("home.createFirst")}</Link></div>
        )}
      </section>
      {ending && <Modal title={t("poll.endQuestion")} onClose={() => setEnding(null)} actions={<><button className="button-soft" onClick={() => setEnding(null)}>{t("common.cancel")}</button><button className="danger-button" onClick={() => { const selected = ending; setEnding(null); void endPoll(selected); }}>{t("poll.endConfirm")}</button></>}><p>{t("poll.endDetails")}</p></Modal>}
      {deleting && <Modal title={t("poll.deleteQuestion")} onClose={() => setDeleting(null)} actions={<><button className="button-soft" onClick={() => setDeleting(null)}>{t("poll.keep")}</button><button className="danger-button" onClick={confirmDelete}>{t("poll.delete")}</button></>}><p>{t("poll.deleteDetails", { title: deleting.title })}</p></Modal>}
      {toast && <Toast message={t(toast)} onClose={() => setToast("")} />}
    </PageShell>
  );
}
