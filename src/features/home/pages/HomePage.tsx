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
import { isPollOpen } from "../../../components/ui/StatusPill";
import { pollPath } from "../../polls/utils/navigation";
import type { Poll } from "../../../types/poll";
import { useParticipant } from "../../auth/utils/useParticipant";

function RetryIconButton({ onClick }: { onClick: () => void }) {
  return <button className="home-retry-icon" type="button" aria-label="重试加载" title="重试加载" onClick={onClick}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.93 9h-2.02A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>
  </button>;
}

export function HomePage() {
  const { polls, loading, error, syncError, refresh, removePoll, updatePoll } = usePolls({ recent: true });
  const { polls: squarePolls, loading: squareLoading, error: squareError, syncError: squareSyncError, refresh: refreshSquare, removePoll: removeSquarePoll, updatePoll: updateSquarePoll } = usePolls({ square: true });
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [ending, setEnding] = useState<Poll | null>(null);
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const [toast, setToast] = useState("");
  const { user: accountUser, loading: accountLoading } = useAccount();
  const participant = useParticipant();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const recent = accountUser || participant ? polls : [];
  const [tab, setTab] = useState<"recent" | "square">("recent");

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await (polls.some((item) => item.id === deleting.id) ? removePoll : removeSquarePoll)(deleting.id);
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
      await (polls.some((item) => item.id === poll.id) ? updatePoll : updateSquarePoll)(poll.id, (current) => ({ ...current, status: "closed" }));
      void refreshSquare();
      setExpandedPollId(null);
      setToast("投票已结束");
    } catch (error) {
      console.error("Could not end poll.", error);
      setToast("结束投票失败，请稍后重试");
    }
  };

  return (
    <PageShell>
      {!accountLoading && !accountUser && !bannerDismissed && <aside className="home-auth-banner" aria-label="注册或登录提示">
        <button className="home-auth-banner-close" type="button" aria-label="关闭注册提示" onClick={() => setBannerDismissed(true)}>×</button>
        <p>{participant ? "喜欢和朋友一起做选择？注册账号，发起自己的投票。" : "现在就加入 BothPls，和朋友一起做决定。"}</p>
        <Link to="/auth" className="home-auth-banner-link">注册或登录 <span aria-hidden="true">↗</span></Link>
      </aside>}
      <section className="home-welcome">
        <span className="eyebrow">HELLO, FRIENDS</span>
        <h1>一个人难选？<br />我们一起选。</h1>
        <p>把纠结交给朋友，让每个小决定都变得好玩。</p>
        <Link to="/create" className="purple-button">发起一个投票 <span>↗</span></Link>
        {accountUser ? <Link to="/settings" className="auth-quick-link">个人中心 →</Link> : participant ? <Link to="/settings" className="auth-quick-link"><span aria-hidden="true">{participant.avatar}</span> {participant.nickname} · 投票者</Link> : <Link to="/auth" className="auth-quick-link">登录 / 注册 →</Link>}
      </section>
      <section className="home-steps">
        <div className="section-title-row"><div><span className="eyebrow">简单三步</span><h2>把选择交给大家</h2></div></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><span className="step-icon"><AppIcon name="edit" size={24} /></span><h3>添加选项</h3><p>把你正在纠结的选择放进来。</p></article>
          <article className="step-card"><span className="step-number">02</span><span className="step-icon"><AppIcon name="share" size={24} /></span><h3>分享给朋友</h3><p>发出链接，听听大家怎么想。</p></article>
          <article className="step-card"><span className="step-number">03</span><span className="step-icon"><AppIcon name="heart" size={26} /></span><h3>查看结果</h3><p>投票和评论，帮你理清思路。</p></article>
        </div>
      </section>
      <div className="filter-tabs home-poll-tabs" role="tablist" aria-label="投票列表" onKeyDown={(event) => {
        const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? "recent" : event.key === "End" ? "square" : tab === "recent" ? "square" : "recent";
        setTab(next); setExpandedPollId(null);
        event.currentTarget.querySelector<HTMLButtonElement>(next === "recent" ? "#home-recent-tab" : "#home-square-tab")?.focus();
      }}>
        <button id="home-recent-tab" type="button" role="tab" aria-selected={tab === "recent"} aria-controls="home-recent-panel" tabIndex={tab === "recent" ? 0 : -1} className={tab === "recent" ? "active" : ""} onClick={() => { setTab("recent"); setExpandedPollId(null); }}>最近</button>
        <button id="home-square-tab" type="button" role="tab" aria-selected={tab === "square"} aria-controls="home-square-panel" tabIndex={tab === "square" ? 0 : -1} className={tab === "square" ? "active" : ""} onClick={() => { setTab("square"); setExpandedPollId(null); }}>广场</button>
      </div>
      <section className="home-recent" id="home-recent-panel" role="tabpanel" aria-labelledby="home-recent-tab" hidden={tab !== "recent"}>
        <div className="section-title-row"><div><span className="eyebrow">一起做决定</span><h2>最近投票</h2></div></div>
        {loading ? <p className="empty-inline">正在加载投票…</p> : error ? <p className="settings-feedback" role="alert">投票加载失败，请稍后重试。<RetryIconButton onClick={() => void refresh()} /></p> : recent.length ? <><div className="poll-card-list">{recent.map((poll) => <PollCard key={poll.id} poll={poll} to={pollPath(poll.id, isPollOpen(poll) && !isPollOwner(poll, accountUser?.id ?? "") ? "vote" : "results", "/")} returnTo="/" expanded={expandedPollId === poll.id} onExpand={(next) => setExpandedPollId(next ? poll.id : null)} onDelete={(item) => { setExpandedPollId(null); setDeleting(item); }} onEnd={setEnding} />)}</div>{syncError && <p className="settings-feedback" role="status">投票加载失败，请稍后重试。<RetryIconButton onClick={() => void refresh()} /></p>}</> : (
          <div className="empty-state home-recent-empty"><div className="empty-art" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M17 44h29a11 11 0 0 0 1-22 16 16 0 0 0-30-3A13 13 0 0 0 17 44Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M24 50c3 3 7 4 11 4s8-1 11-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></div><h3>还没有最近投票</h3><p>创建投票或参与一次投票后，会显示在这里。</p><Link to="/create" className="purple-button">发起一个投票</Link></div>
        )}
      </section>
      <section className="home-recent home-square" id="home-square-panel" role="tabpanel" aria-labelledby="home-square-tab" hidden={tab !== "square"}>
        <div className="section-title-row"><div><span className="eyebrow">发现大家的选择</span><h2>广场</h2><p className="home-square-description">公开投票会展示在这里，让更多人一起参与。仅通过链接分享的投票不会进入广场。</p></div></div>
        {squareLoading ? <p className="empty-inline">正在加载广场…</p> : squareError ? <p className="settings-feedback" role="alert">广场加载失败，请稍后重试。<RetryIconButton onClick={() => void refreshSquare()} /></p> : squarePolls.length ? <><div className="poll-card-list">{squarePolls.map((poll) => <PollCard key={poll.id} poll={poll} surface="square" to={pollPath(poll.id, "vote", "/")} returnTo="/" expanded={expandedPollId === poll.id} onExpand={(next) => setExpandedPollId(next ? poll.id : null)} onDelete={(item) => { setExpandedPollId(null); setDeleting(item); }} onEnd={setEnding} />)}</div>{squareSyncError && <p className="settings-feedback" role="status">广场加载失败，请稍后重试。<RetryIconButton onClick={() => void refreshSquare()} /></p>}</> : <div className="empty-state home-recent-empty"><div className="empty-art" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M17 44h29a11 11 0 0 0 1-22 16 16 0 0 0-30-3A13 13 0 0 0 17 44Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M24 50c3 3 7 4 11 4s8-1 11-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></div><h3>广场还没有公开投票</h3><p>投票发起者选择公开后，会出现在这里。</p></div>}
      </section>
      {ending && <Modal title="确定结束这次投票吗？" onClose={() => setEnding(null)} actions={<><button className="button-soft" onClick={() => setEnding(null)}>取消</button><button className="danger-button" onClick={() => { const selected = ending; setEnding(null); void endPoll(selected); }}>确认结束</button></>}><p>结束后不能继续投票或修改选择，结果和评论将公开。</p></Modal>}
      {deleting && <Modal title="确定删除这条投票吗？" onClose={() => setDeleting(null)} actions={<><button className="button-soft" onClick={() => setDeleting(null)}>再想想</button><button className="danger-button" onClick={confirmDelete}>删除投票</button></>}><p>删除后「{deleting.title}」及其投票和评论将一并移除。</p></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </PageShell>
  );
}
