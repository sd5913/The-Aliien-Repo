// Landing page with the product introduction and recent polls. / 展示产品介绍和最近投票的首页。
import { Link } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill } from "../../polls/components/StatusPill";
import { usePolls } from "../../polls/hooks/usePolls";

export function HomePage() {
  const { polls } = usePolls();
  const recent = polls.slice(0, 3);

  return (
    <PageShell>
      <section className="hero-card">
        <span className="eyebrow">一个人难选？一起决定。</span>
        <h1>选择太多？<br />和朋友一起选。</h1>
        <p>把纠结变成一次轻松的投票，朋友的想法都在这里。</p>
        <div className="hero-actions">
          <Link className="button button-dark" to="/polls/new">创建一个投票 <span aria-hidden="true">↗</span></Link>
          <Link className="text-link" to="/polls">查看我的投票</Link>
        </div>
        <span className="hero-doodle" aria-hidden="true">✳</span>
      </section>

      <section className="steps-section">
        <div className="section-heading"><div><span className="eyebrow">简单三步</span><h2>把选择交给大家</h2></div><span className="sparkle" aria-hidden="true">✦</span></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><span className="step-icon">✎</span><h3>添加选项</h3><p>把你正在纠结的选择放进来。</p></article>
          <article className="step-card"><span className="step-number">02</span><span className="step-icon">↗</span><h3>分享给朋友</h3><p>发出链接，听听大家怎么想。</p></article>
          <article className="step-card"><span className="step-number">03</span><span className="step-icon">♡</span><h3>看看结果</h3><p>投票和评论，帮你理清思路。</p></article>
        </div>
      </section>

      <section className="recent-section">
        <div className="section-heading"><div><span className="eyebrow">继续你的选择</span><h2>最近的投票</h2></div><Link className="text-link" to="/polls">查看全部 →</Link></div>
        {recent.length > 0 ? (
          <div className="poll-list">
            {recent.map((poll) => (
              <Link className="poll-card" key={poll.id} to={`/polls/${poll.id}/manage`}>
                <div className="poll-card-copy"><StatusPill poll={poll} /><h3>{poll.title}</h3><p>{poll.options.length} 个选项 · {poll.votes.length} 人参与</p></div>
                <span className="card-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-card"><span className="empty-illustration" aria-hidden="true">☁</span><h3>你的第一个选择，还在等你</h3><p>创建投票，和朋友一起找答案。</p><Link className="button button-soft" to="/polls/new">开始创建 <span aria-hidden="true">→</span></Link></div>
        )}
      </section>
    </PageShell>
  );
}
