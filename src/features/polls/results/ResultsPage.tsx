import { Link, useParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill } from "../../../components/ui/StatusPill";
import { usePolls } from "../../../hooks/usePolls";
import { getBordaResults, getVotingMode } from "../../../lib/voting";

export function ResultsPage() {
  const { pollId = "" } = useParams();
  const { polls, updatePoll } = usePolls();
  const poll = polls.find((item) => item.id === pollId);
  if (!poll) return <PageShell title="投票结果"><div className="empty-card"><h2>没有找到这次投票</h2><Link to="/polls" className="button button-dark">回到我的投票</Link></div></PageShell>;

  const mode = getVotingMode(poll.options);
  const choiceCounts = new Map(poll.options.map((option) => [option.id, 0]));
  if (mode === "choice") poll.votes.forEach((vote) => {
    if (vote.selectedOptionId && choiceCounts.has(vote.selectedOptionId)) choiceCounts.set(vote.selectedOptionId, (choiceCounts.get(vote.selectedOptionId) ?? 0) + 1);
  });
  const tiedChoice = mode === "choice" && poll.options.length > 0 &&
    poll.options.every((option) => choiceCounts.get(option.id) === choiceCounts.get(poll.options[0].id));
  const bordaResults = mode === "ranking" ? getBordaResults(poll) : [];

  const deleteComment = (commentId: string) => {
    try {
      updatePoll(poll.id, (current) => ({ ...current, comments: current.comments.filter((item) => item.id !== commentId) }));
    } catch (error) {
      console.error("Could not delete the comment.", error);
    }
  };

  return (
    <PageShell title="结果与评论">
      <section className="management-heading"><span className="eyebrow">大家怎么想</span><div className="title-with-status"><h1>{poll.title}</h1><StatusPill poll={poll} /></div><p>{poll.votes.length} 人参与 · {mode === "choice" ? "二选一投票" : "Borda 排序计分"}</p></section>
      <section className="content-card results-card"><div className="section-heading"><div><span className="eyebrow">投票结果</span><h2>{mode === "choice" ? "大家的选择" : "排序得分"}</h2></div><span className="result-symbol">✦</span></div>
        {mode === "choice" ? <>{tiedChoice && poll.votes.length > 0 && <div className="notice-banner">目前是平票，没有单独的领先选项。</div>}{poll.options.map((option) => {
          const count = choiceCounts.get(option.id) ?? 0;
          const percent = poll.votes.length ? Math.round(count / poll.votes.length * 100) : 0;
          return <div className="result-row" key={option.id}><div className="result-label"><strong>{option.name}</strong><span>{count} 票 · {percent}%</span></div><div className="progress-track"><span style={{ width: `${percent}%` }} /></div></div>;
        })}</> :
          bordaResults.map((result) => <div className="borda-row" key={result.option.id}><span className="borda-rank">{result.rank}{result.tied ? "=" : ""}</span><div className="borda-copy"><strong>{result.option.name}</strong><span>{result.tied ? "并列" : "名次"} · {result.score} 分</span></div><span className="borda-score">{result.score}<small>分</small></span></div>)}
        {poll.votes.length === 0 && <p className="empty-inline">还没有人投票，分享链接邀请朋友来参与吧。</p>}
      </section>
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">听听理由</span><h2>朋友的评论 <span className="heading-count">{poll.comments.length}</span></h2></div></div>
        {poll.comments.length ? <div className="comments-list">{poll.comments.map((item) => <article className="comment-card" key={item.id}><div className="comment-avatar">{item.voter.nickname.slice(0, 1)}</div><div className="comment-body"><div className="comment-meta"><strong>{item.voter.nickname}</strong><time>{new Date(item.createdAt).toLocaleDateString()}</time></div><p>{item.text}</p></div><button className="icon-button comment-delete" aria-label={`删除 ${item.voter.nickname} 的评论`} onClick={() => deleteComment(item.id)}>×</button></article>)}</div> : <p className="empty-inline">还没有评论。理由和建议会显示在这里。</p>}
      </section>
      <div className="management-actions"><Link className="button button-dark" to={`/polls/${poll.id}/manage`}>返回投票管理 <span>→</span></Link><Link className="button button-outline" to={`/polls/${poll.id}/vote`}>打开投票页</Link></div>
      <p className="prototype-note">删除评论不会影响投票记录和统计结果。</p>
    </PageShell>
  );
}
