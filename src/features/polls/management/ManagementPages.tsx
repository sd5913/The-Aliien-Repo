import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill } from "../../../components/ui/StatusPill";
import { usePolls } from "../../../hooks/usePolls";
import { isPollOpen } from "../../../lib/voting";

export function MyPollsPage() {
  const { polls } = usePolls();
  return (
    <PageShell title="我的投票">
      <section className="form-intro"><span className="eyebrow">都在这里</span><h1>我的投票</h1><p>你在此浏览器创建或参与的原型投票。</p></section>
      {polls.length ? <div className="poll-list">{polls.map((poll) => <Link className="poll-card" key={poll.id} to={`/polls/${poll.id}/manage`}><div className="poll-card-copy"><StatusPill poll={poll} /><h3>{poll.title}</h3><p>{poll.options.length} 个选项 · {poll.votes.length} 人参与 · {poll.comments.length} 条评论</p></div><span className="card-arrow">↗</span></Link>)}</div> :
        <div className="empty-card"><span className="empty-illustration">☁</span><h3>这里还空空的</h3><p>创建一个投票，开始听听大家的想法。</p><Link className="button button-dark" to="/polls/new">创建投票 <span>↗</span></Link></div>}
    </PageShell>
  );
}

export function PollManagementPage() {
  const { pollId = "" } = useParams();
  const navigate = useNavigate();
  const { polls, updatePoll } = usePolls();
  const [feedback, setFeedback] = useState("");
  const poll = polls.find((item) => item.id === pollId);
  if (!poll) return <PageShell title="找不到投票"><div className="empty-card"><h2>没有找到这次投票</h2><p>它可能已被清除，或不在当前浏览器中。</p><Link className="button button-dark" to="/polls">回到我的投票</Link></div></PageShell>;

  const copyLink = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label}已复制`);
    } catch {
      setFeedback("复制失败，请检查浏览器剪贴板权限。");
    }
  };

  const closePoll = () => {
    try {
      updatePoll(poll.id, (current) => ({ ...current, status: "closed" }));
      setFeedback("投票已结束。");
    } catch {
      setFeedback("暂时无法保存更改，请检查浏览器存储设置。");
    }
  };

  const publicUrl = `${window.location.origin}/polls/${poll.id}/vote`;
  const managementUrl = `${window.location.origin}/polls/${poll.id}/manage`;
  const open = isPollOpen(poll);

  return (
    <PageShell title="投票管理">
      <section className="management-heading"><span className="eyebrow">你的投票空间</span><div className="title-with-status"><h1>{poll.title}</h1><StatusPill poll={poll} /></div>{poll.description && <p>{poll.description}</p>}</section>
      <div className="stats-grid"><div className="stat-card"><strong>{poll.votes.length}</strong><span>参与人数</span></div><div className="stat-card"><strong>{poll.comments.length}</strong><span>条评论</span></div><div className="stat-card"><strong>{poll.options.length}</strong><span>个选项</span></div></div>
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">邀请朋友</span><h2>分享投票</h2></div><span className="share-icon">↗</span></div>
        <div className="share-block"><div><strong>公开投票链接</strong><p>朋友可以打开并提交或修改投票。</p></div><button className="button button-soft button-small" onClick={() => void copyLink(publicUrl, "公开链接")}>复制链接</button></div>
        <div className="share-block"><div><strong>管理链接</strong><p>仅作原型演示，不具备真实访问控制能力。</p></div><button className="button button-outline button-small" onClick={() => void copyLink(managementUrl, "管理链接")}>复制链接</button></div>
      </section>
      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">随时查看</span><h2>投票概览</h2></div></div>
        <div className="management-actions"><Link className="button button-dark" to={`/polls/${poll.id}/results`}>查看结果与评论 <span>→</span></Link>{open && <button className="button button-outline" onClick={closePoll}>结束投票</button>}</div>
      </section>
      {feedback && <p className="feedback-message" role="status">{feedback}</p>}
      <div className="subtle-links"><Link to="/polls">← 我的投票</Link><button onClick={() => navigate("/")}>回到首页</button></div>
      <p className="prototype-note">这是保存在当前浏览器的前端原型。管理链接不是密码，也不能阻止其他人访问或修改数据。</p>
    </PageShell>
  );
}
