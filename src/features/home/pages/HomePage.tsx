import { Link } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { PollCard } from "../../polls/components/PollCard";
import { usePolls } from "../../polls/hooks/usePolls";

export function HomePage() {
  const { polls } = usePolls();
  const recent = polls.slice(0, 3);

  return (
    <PageShell>
      <section className="home-welcome">
        <span className="eyebrow">HELLO, FRIENDS ✨</span>
        <h1>一个人难选？<br />我们一起选。</h1>
        <p>把纠结交给朋友，让每个小决定都变得好玩。</p>
        <Link to="/create" className="purple-button">发起一个投票 <span>↗</span></Link>
        <div className="welcome-sticker" aria-hidden="true">✦</div>
      </section>
      <section className="home-steps">
        <div className="section-title-row"><div><span className="eyebrow">HOW IT WORKS</span><h2>三步轻松做决定</h2></div><span className="steps-sparkle" aria-hidden="true">✦</span></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><span className="step-icon" aria-hidden="true">✎</span><h3>添加选项</h3><p>把你正在纠结的选择放进来。</p></article>
          <article className="step-card"><span className="step-number">02</span><span className="step-icon" aria-hidden="true">↗</span><h3>分享给朋友</h3><p>发出链接，听听大家怎么想。</p></article>
          <article className="step-card"><span className="step-number">03</span><span className="step-icon" aria-hidden="true">♡</span><h3>看看结果</h3><p>投票和评论，帮你理清思路。</p></article>
        </div>
      </section>
      <section className="home-recent">
        <div className="section-title-row"><div><span className="eyebrow">一起做决定</span><h2>最近投票</h2></div><Link className="subtle-link" to="/settings#my-polls">查看全部 →</Link></div>
        {recent.length ? <div className="poll-card-list">{recent.map((poll) => <PollCard key={poll.id} poll={poll} to={`/poll/${poll.id}/manage`} />)}</div> : (
          <div className="empty-state"><div className="empty-art" aria-hidden="true"><span>☁</span><i>♡</i></div><h3>还没有投票哦</h3><p>创建一个小问题，邀请朋友帮你选。</p><Link className="purple-button" to="/create">开始创建</Link></div>
        )}
      </section>
    </PageShell>
  );
}
