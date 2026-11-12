import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill, isPollOpen } from "../../../components/ui/StatusPill";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { usePolls } from "../hooks/usePolls";
import { ResultBubbles } from "../components/ResultBubbles";
import { CommentList } from "../components/CommentList";

export function ResultsPage() {
  const { id = "" } = useParams();
  const { polls } = usePolls();
  const poll = polls.find((item) => item.id === id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  const copyLink = async () => {
    if (!poll) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/poll/${poll.id}`);
      setMenuOpen(false);
      setToast("链接已复制");
    } catch (error) {
      console.error("Could not copy poll link.", error);
      setToast("复制失败，请检查剪贴板权限");
    }
  };

  if (!poll) return <PageShell showNavigation={false} backTo="/"><div className="empty-state"><h2>没有找到这次投票</h2><Link to="/" className="purple-button">回到首页</Link></div></PageShell>;

  const counts = new Map(poll.options.map((option) => [option.id, 0]));
  poll.votes.forEach((vote) => {
    const optionId = vote.selectedOptionId;
    if (optionId && counts.has(optionId)) counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  });
  const open = isPollOpen(poll);
  const colorList = ["#8b5cf6", "#ec4899", "#3b82f6", "#f59e0b", "#22c55e"];

  return (
    <PageShell showNavigation={false} backTo="/" title="投票结果">
      <div className="results-topline"><span className="eyebrow">大家的心意</span><button className="more-button" aria-label="更多操作" onClick={() => setMenuOpen(true)}>···</button></div>
      <div className="results-heading"><StatusPill poll={poll} /><h1>{poll.title}</h1><p>{poll.votes.length} 位朋友参与 · 结果随投票比例变化</p></div>
      <section className="results-card">
        <ResultBubbles options={poll.options} counts={counts} total={poll.votes.length} />
        <div className="result-option-list">{poll.options.map((option, index) => {
          const count = counts.get(option.id) ?? 0;
          const percent = poll.votes.length ? Math.round((count / poll.votes.length) * 100) : 0;
          return <div className="result-option-row" key={option.id}><span className="result-color" style={{ background: colorList[index % colorList.length] }} /><strong>{option.name}</strong><span>{count} 票 · {percent}%</span></div>;
        })}</div>
        {!poll.votes.length && <p className="empty-inline">还没有人投票，分享链接邀请朋友来参与吧。</p>}
      </section>
      <section className="comments-section"><div className="section-title-row"><div><span className="eyebrow">听听大家的理由</span><h2>评论 <span className="heading-count">{poll.comments.length} 条</span></h2></div></div><CommentList comments={poll.comments} options={poll.options} /></section>
      {!open ? <div className="locked-bottom">🔒 投票已结束，你只能查看结果和评论</div> : <Link className="purple-button button-full result-vote-button" to={`/poll/${poll.id}`}>改票 <span>↗</span></Link>}
      {menuOpen && <Modal title="分享这次投票" onClose={() => setMenuOpen(false)} actions={<><button className="button-soft" onClick={() => setMenuOpen(false)}>关闭</button><button className="purple-button" onClick={() => void copyLink()}>复制链接</button></>}><p>邀请朋友一起看看结果，也可以继续帮忙投票。</p></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </PageShell>
  );
}
