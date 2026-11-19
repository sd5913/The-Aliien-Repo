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

export function HomePage() {
  const { polls, loading, error, removePoll, updatePoll } = usePolls({ recent: true });
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [ending, setEnding] = useState<Poll | null>(null);
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const [toast, setToast] = useState("");
  const { user: accountUser, loading: accountLoading } = useAccount();
  const participant = useParticipant();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const recent = polls;

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

  return (
    <PageShell>
      {!accountLoading && !accountUser && !bannerDismissed && <aside className="home-auth-banner" aria-label="注册或登录提示">
        <button className="home-auth-banner-close" type="button" aria-label="关闭注册提示" onClick={() => setBannerDismissed(true)}>×</button>
        <p>{participant ? "喜欢和朋友一起做选择？注册账号，发起自己的投票。" : "现在就加入 BothPls，和朋友一起做决定。"}</p>
        <Link to="/auth" className="home-auth-banner-link">注册或登录 <span aria-hidden="true">↗</span></Link>
      </aside>}
      <section className="home-welcome">
        <span className="eyebrow">HELLO, FRIENDS ✨</span>
        <h1>一个人难选？<br />我们一起选。</h1>
        <p>把纠结交给朋友，让每个小决定都变得好玩。</p>
        <Link to="/create" className="purple-button">发起一个投票 <span>↗</span></Link>
        {accountUser ? <Link to="/settings" className="auth-quick-link">个人中心 →</Link> : participant ? <Link to="/settings" className="auth-quick-link"><span aria-hidden="true">{participant.avatar}</span> {participant.nickname} · 投票者</Link> : <Link to="/auth" className="auth-quick-link">登录 / 注册 →</Link>}
        <div className="welcome-sticker" aria-hidden="true">✦</div>
      </section>
      <section className="home-steps">
        <div className="section-title-row"><div><span className="eyebrow">简单三步</span><h2>把选择交给大家</h2></div><span className="steps-sparkle" aria-hidden="true">✦</span></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><span className="step-icon"><AppIcon name="edit" size={24} /></span><h3>添加选项</h3><p>把你正在纠结的选择放进来。</p></article>
          <article className="step-card"><span className="step-number">02</span><span className="step-icon"><AppIcon name="share" size={24} /></span><h3>分享给朋友</h3><p>发出链接，听听大家怎么想。</p></article>
          <article className="step-card"><span className="step-number">03</span><span className="step-icon"><AppIcon name="heart" size={26} /></span><h3>查看结果</h3><p>投票和评论，帮你理清思路。</p></article>
        </div>
      </section>
      <section className="home-recent">
        <div className="section-title-row"><div><span className="eyebrow">一起做决定</span><h2>最近投票</h2></div><Link className="subtle-link" to="/settings#my-polls">查看全部 →</Link></div>
        {loading ? <p className="empty-inline">正在加载投票…</p> : error ? <p className="settings-feedback" role="alert">投票加载失败，请检查 Supabase 配置后重试。</p> : recent.length ? <div className="poll-card-list">{recent.map((poll) => <PollCard key={poll.id} poll={poll} to={pollPath(poll.id, isPollOpen(poll) && !isPollOwner(poll, accountUser?.id ?? "") ? "vote" : "results", "/")} returnTo="/" expanded={expandedPollId === poll.id} onExpand={(next) => setExpandedPollId(next ? poll.id : null)} onDelete={(item) => { setExpandedPollId(null); setDeleting(item); }} onEnd={setEnding} />)}</div> : (
          <div className="empty-state"><div className="empty-art" aria-hidden="true"><span>☁</span><i>♡</i></div><h3>还没有投票哦</h3><p>创建一个小问题，邀请朋友帮你选。</p><Link className="purple-button" to="/create">开始创建</Link></div>
        )}
      </section>
      {ending && <Modal title="确定结束这次投票吗？" onClose={() => setEnding(null)} actions={<><button className="button-soft" onClick={() => setEnding(null)}>取消</button><button className="danger-button" onClick={() => { const selected = ending; setEnding(null); void endPoll(selected); }}>确认结束</button></>}><p>结束后不能继续投票或修改选择，结果和评论将公开。</p></Modal>}
      {deleting && <Modal title="确定删除这条投票吗？" onClose={() => setDeleting(null)} actions={<><button className="button-soft" onClick={() => setDeleting(null)}>再想想</button><button className="danger-button" onClick={confirmDelete}>删除投票</button></>}><p>删除后「{deleting.title}」及其投票和评论将一并移除。</p></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </PageShell>
  );
}
