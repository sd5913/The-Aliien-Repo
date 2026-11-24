import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useAccount } from "../../auth/components/AccountProvider";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { PollCard } from "../../polls/components/PollCard";
import { usePolls } from "../../polls/hooks/usePolls";
import { isPollOwner } from "../../polls/utils/voting";
import { isPollOpen } from "../../../components/ui/StatusPill";
import { pollPath } from "../../polls/utils/navigation";
import type { Poll } from "../../../types/poll";

const AUTH_BANNER_DISMISSED_KEY = "bothpls:home-auth-banner:dismissed-at";
const AUTH_BANNER_DISMISSAL_MS = 7 * 24 * 60 * 60 * 1000;

function RetryIconButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <button
      className="home-retry-icon"
      type="button"
      aria-label={t("home.retry")}
      title={t("home.retry")}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.93 9h-2.02A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
      </svg>
    </button>
  );
}

export function HomePage() {
  const { t } = useLocale();
  const { polls, loading, error, syncError, refresh, removePoll, updatePoll, hasMore, loadingMore, loadMore } =
    usePolls({ recent: true });
  const {
    polls: squarePolls,
    loading: squareLoading,
    error: squareError,
    syncError: squareSyncError,
    refresh: refreshSquare,
    removePoll: removeSquarePoll,
    updatePoll: updateSquarePoll,
    hasMore: squareHasMore,
    loadingMore: squareLoadingMore,
    loadMore: loadMoreSquare,
  } = usePolls({ square: true });
  const squareLoadMoreRef = useRef<HTMLDivElement>(null);
  const recentLoadMoreRef = useRef<HTMLDivElement>(null);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [ending, setEnding] = useState<Poll | null>(null);
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const [toast, setToast] = useState<MessageKey | "">("");
  const { user: accountUser, loading: accountLoading } = useAccount();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      const dismissedAt = Number(window.localStorage.getItem(AUTH_BANNER_DISMISSED_KEY));
      const now = Date.now();
      if (Number.isFinite(dismissedAt) && dismissedAt > 0 && dismissedAt <= now && now - dismissedAt < AUTH_BANNER_DISMISSAL_MS) return true;
      window.localStorage.removeItem(AUTH_BANNER_DISMISSED_KEY);
      return false;
    } catch (error) {
      console.error("Could not read the home sign-in prompt dismissal.", error);
      return false;
    }
  });
  const recent = accountUser ? polls : [];
  const [tab, setTab] = useState<"recent" | "square">("square");

  useEffect(() => {
    if (accountLoading || accountUser || bannerDismissed) return;
    const showTimer = window.setTimeout(() => {
      setBannerVisible(true);
    }, 2000);
    return () => window.clearTimeout(showTimer);
  }, [accountLoading, accountUser, bannerDismissed]);

  useEffect(() => {
    const squareActive = tab === "square";
    const ref = squareActive ? squareLoadMoreRef.current : recentLoadMoreRef.current;
    const activeHasMore = squareActive ? squareHasMore : hasMore;
    const activeLoadingMore = squareActive ? squareLoadingMore : loadingMore;
    const activeSyncError = squareActive ? squareSyncError : syncError;
    if (!activeHasMore || activeLoadingMore || activeSyncError || !ref) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void (squareActive ? loadMoreSquare() : loadMore());
    }, { rootMargin: "300px" });
    observer.observe(ref);
    return () => observer.disconnect();
  }, [tab, squareHasMore, hasMore, squareLoadingMore, loadingMore, squareSyncError, syncError, loadMoreSquare, loadMore]);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await (
        polls.some((item) => item.id === deleting.id)
          ? removePoll
          : removeSquarePoll
      )(deleting.id);
      void refreshSquare();
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
      await (
        polls.some((item) => item.id === poll.id)
          ? updatePoll
          : updateSquarePoll
      )(poll.id, (current) => ({ ...current, status: "closed" }));
      void refreshSquare();
      setExpandedPollId(null);
      setToast("poll.ended");
    } catch (error) {
      console.error("Could not end poll.", error);
      setToast("poll.endFailed");
    }
  };

  const squareCards = squarePolls.map((poll) => {
    const owner = isPollOwner(poll, accountUser?.id ?? "");
    return (
      <PollCard
        key={poll.id}
        poll={poll}
        surface="square"
        to={pollPath(poll.id, owner || poll.participatedByCurrentIdentity ? "results" : "vote", "/")}
        returnTo="/"
        expanded={expandedPollId === poll.id}
        onExpand={(next) => setExpandedPollId(next ? poll.id : null)}
        onDelete={(item) => {
          setExpandedPollId(null);
          setDeleting(item);
        }}
        onEnd={setEnding}
      />
    );
  });

  return (
    <PageShell>
      {!accountLoading && !accountUser && bannerVisible && !bannerDismissed && (
        <aside className="home-auth-banner" aria-label={t("home.authPrompt")}>
          <button
            className="home-auth-banner-close"
            type="button"
            aria-label={t("home.closeAuthPrompt")}
            onClick={() => {
              setBannerVisible(false);
              setBannerDismissed(true);
              try {
                window.localStorage.setItem(AUTH_BANNER_DISMISSED_KEY, String(Date.now()));
              } catch (error) {
                console.error("Could not save the home sign-in prompt dismissal.", error);
              }
            }}
          >
            ×
          </button>
          <p>{t("home.authForGuest")}</p>
          <Link to="/auth" className="home-auth-banner-link">
            {t("auth.loginRegister")} <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      )}
      <section className="home-welcome">
        <span className="eyebrow">HELLO, FRIENDS</span>
        <h1>
          {t("home.headlineOne")}
          <br />
          {t("home.headlineTwo")}
        </h1>
        <p>{t("home.intro")}</p>
        <Link to="/create" className="purple-button">
          {t("home.startPoll")} <span>↗</span>
        </Link>
        {accountUser ? (
          <Link to="/settings" className="auth-quick-link">
            {t("home.profile")} <AppIcon name="chevronRight" size={15} />
          </Link>
        ) : (
          <Link to="/auth" className="auth-quick-link">
            {t("auth.loginRegister")} <AppIcon name="chevronRight" size={15} />
          </Link>
        )}
      </section>
      <section className="home-steps">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">{t("home.steps")}</span>
            <h2>{t("home.chooseTogether")}</h2>
          </div>
        </div>
        <div className="steps-grid">
          <article className="step-card">
            <span className="step-number">01</span>
            <span className="step-icon">
              <AppIcon name="edit" size={24} />
            </span>
            <h3>{t("home.stepOptions")}</h3>
            <p>{t("home.stepOptionsDetails")}</p>
          </article>
          <article className="step-card">
            <span className="step-number">02</span>
            <span className="step-icon">
              <AppIcon name="share" size={24} />
            </span>
            <h3>{t("home.stepShare")}</h3>
            <p>{t("home.stepShareDetails")}</p>
          </article>
          <article className="step-card">
            <span className="step-number">03</span>
            <span className="step-icon">
              <AppIcon name="heart" size={26} />
            </span>
            <h3>{t("home.stepResults")}</h3>
            <p>{t("home.stepResultsDetails")}</p>
          </article>
        </div>
      </section>
      <div
        className="filter-tabs home-poll-tabs"
        role="tablist"
        aria-label={t("home.pollList")}
        onKeyDown={(event) => {
          const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
          if (!keys.includes(event.key)) return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? "square"
              : event.key === "End"
                ? "recent"
                : tab === "recent"
                  ? "square"
                  : "recent";
          setTab(next);
          setExpandedPollId(null);
          event.currentTarget
            .querySelector<HTMLButtonElement>(
              next === "recent" ? "#home-recent-tab" : "#home-square-tab",
            )
            ?.focus();
        }}
      >
        <button
          id="home-square-tab"
          type="button"
          role="tab"
          aria-selected={tab === "square"}
          aria-controls="home-square-panel"
          tabIndex={tab === "square" ? 0 : -1}
          className={tab === "square" ? "active" : ""}
          onClick={() => {
            setTab("square");
            setExpandedPollId(null);
          }}
        >
          {t("home.tabSquare")}
        </button>
        <button
          id="home-recent-tab"
          type="button"
          role="tab"
          aria-selected={tab === "recent"}
          aria-controls="home-recent-panel"
          tabIndex={tab === "recent" ? 0 : -1}
          className={tab === "recent" ? "active" : ""}
          onClick={() => {
            setTab("recent");
            setExpandedPollId(null);
          }}
        >
          {t("home.tabRecent")}
        </button>
      </div>
      <section
        className="home-recent home-square"
        id="home-square-panel"
        role="tabpanel"
        aria-labelledby="home-square-tab"
        hidden={tab !== "square"}
      >
        <div className="section-title-row">
          <div>
            <span className="eyebrow">{t("home.squareEyebrow")}</span>
            <h2>{t("home.tabSquare")}</h2>
            <p className="home-square-description">
              {t("home.squareDescription")}
            </p>
          </div>
        </div>
        {squareLoading && (
          <p className="empty-inline">{t("home.squareLoading")}</p>
        )}
        {!squareLoading && squareError && (
          <p className="settings-feedback" role="alert">
            {t("home.squareLoadFailed")}
            <RetryIconButton onClick={() => void refreshSquare()} />
          </p>
        )}
        {!squareLoading && !squareError && squarePolls.length > 0 && (
          <>
            <div className="poll-card-list">{squareCards}</div>
            {squareHasMore && (
              <div ref={squareLoadMoreRef} className="my-poll-load-more">
                <button type="button" className="button-soft" disabled={squareLoadingMore} onClick={() => void loadMoreSquare()}>
                  {squareLoadingMore ? t("poll.moreLoading") : t("poll.more")}
                </button>
              </div>
            )}
            {squareSyncError && (
              <p className="settings-feedback" role="status">
                {t("home.squareLoadFailed")}
                <RetryIconButton onClick={() => void refreshSquare()} />
              </p>
            )}
          </>
        )}
        {!squareLoading && !squareError && squarePolls.length === 0 && (
          <div className="empty-state home-recent-empty">
            <div className="empty-art" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none">
                <path
                  d="M17 44h29a11 11 0 0 0 1-22 16 16 0 0 0-30-3A13 13 0 0 0 17 44Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 50c3 3 7 4 11 4s8-1 11-4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3>{t("home.squareEmpty")}</h3>
            <p>{t("home.squareEmptyDetails")}</p>
          </div>
        )}
      </section>
      <section
        className="home-recent"
        id="home-recent-panel"
        role="tabpanel"
        aria-labelledby="home-recent-tab"
        hidden={tab !== "recent"}
      >
        <div className="section-title-row">
          <div>
            <span className="eyebrow">{t("home.decideTogether")}</span>
            <h2>{t("home.recent")}</h2>
          </div>
        </div>
        {loading ? (
          <p className="empty-inline">{t("poll.loading")}</p>
        ) : error ? (
          <p className="settings-feedback" role="alert">
            {t("home.recentLoadFailed")}
            <RetryIconButton onClick={() => void refresh()} />
          </p>
        ) : recent.length ? (
          <>
            <div className="poll-card-list">
              {recent.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  to={pollPath(
                    poll.id,
                    isPollOpen(poll) &&
                      !isPollOwner(poll, accountUser?.id ?? "") &&
                      !poll.participatedByCurrentIdentity
                      ? "vote"
                      : "results",
                    "/",
                  )}
                  returnTo="/"
                  expanded={expandedPollId === poll.id}
                  onExpand={(next) => setExpandedPollId(next ? poll.id : null)}
                  onDelete={(item) => {
                    setExpandedPollId(null);
                    setDeleting(item);
                  }}
                  onEnd={setEnding}
                />
              ))}
            </div>
            {hasMore && (
              <div ref={recentLoadMoreRef} className="my-poll-load-more">
                <button type="button" className="button-soft" disabled={loadingMore} onClick={() => void loadMore()}>
                  {loadingMore ? t("poll.moreLoading") : t("poll.more")}
                </button>
              </div>
            )}
            {syncError && (
              <p className="settings-feedback" role="status">
                {t("home.recentLoadFailed")}
                <RetryIconButton onClick={() => void refresh()} />
              </p>
            )}
          </>
        ) : (
          <div className="empty-state home-recent-empty">
            <div className="empty-art" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none">
                <path
                  d="M17 44h29a11 11 0 0 0 1-22 16 16 0 0 0-30-3A13 13 0 0 0 17 44Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 50c3 3 7 4 11 4s8-1 11-4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3>{t("home.recentEmpty")}</h3>
            <p>{t("home.recentEmptyDetails")}</p>
            <Link to="/create" className="purple-button">
              {t("home.startPoll")}
            </Link>
          </div>
        )}
      </section>
      {ending && (
        <Modal
          title={t("poll.endQuestion")}
          onClose={() => setEnding(null)}
          actions={
            <>
              <button className="button-soft" onClick={() => setEnding(null)}>
                {t("common.cancel")}
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  const selected = ending;
                  setEnding(null);
                  void endPoll(selected);
                }}
              >
                {t("poll.endConfirm")}
              </button>
            </>
          }
        >
          <p>{t("poll.endDetails")}</p>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={t("poll.deleteQuestion")}
          onClose={() => setDeleting(null)}
          actions={
            <>
              <button className="button-soft" onClick={() => setDeleting(null)}>
                {t("poll.keep")}
              </button>
              <button className="danger-button" onClick={confirmDelete}>
                {t("poll.delete")}
              </button>
            </>
          }
        >
          <p>{t("poll.deleteDetails", { title: deleting.title })}</p>
        </Modal>
      )}
      {toast && <Toast message={t(toast)} onClose={() => setToast("")} />}
    </PageShell>
  );
}
