// Public poll voting page with choice and ranking interactions. / 支持选择与排序交互的公开投票页面。
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill } from "../components/StatusPill";
import { usePolls } from "../hooks/usePolls";
import { getRandomNickname, getVotingMode, isPollOpen } from "../utils/voting";
import { VOTER_STORAGE_KEY, readLocalJson, writeLocalJson } from "../../../lib/storage/localStorage";
import type { VoterIdentity } from "../../../types/poll";

function getIdentity(): VoterIdentity {
  const valid = (value: unknown): value is VoterIdentity =>
    Boolean(value && typeof value === "object" && "id" in value && "nickname" in value &&
      typeof value.id === "string" && typeof value.nickname === "string");
  const saved = readLocalJson(VOTER_STORAGE_KEY, null, valid);
  if (saved) return saved;
  const identity = { id: crypto.randomUUID(), nickname: getRandomNickname() };
  writeLocalJson(VOTER_STORAGE_KEY, identity);
  return identity;
}

export function VotingPage() {
  const { pollId = "" } = useParams();
  const { polls, updatePoll } = usePolls();
  const poll = polls.find((item) => item.id === pollId);
  const [identity, setIdentity] = useState<VoterIdentity>(() => getIdentity());
  const existingVote = poll?.votes.find((vote) => vote.voter.id === identity.id);
  const [selectedId, setSelectedId] = useState(existingVote?.selectedOptionId ?? "");
  const [ranking, setRanking] = useState<string[]>(existingVote?.ranking ?? poll?.options.map((option) => option.id) ?? []);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState("");
  const mode = poll ? getVotingMode(poll.options) : "choice";
  const open = poll ? isPollOpen(poll) : false;

  useEffect(() => {
    if (poll) setRanking(existingVote?.ranking ?? poll.options.map((option) => option.id));
    setSelectedId(existingVote?.selectedOptionId ?? "");
  }, [poll?.id, existingVote?.id]);

  const changeNickname = (nickname: string) => {
    const next = { ...identity, nickname };
    setIdentity(next);
    try { writeLocalJson(VOTER_STORAGE_KEY, next); }
    catch { setFeedback("昵称无法保存到此浏览器。"); }
  };

  if (!poll) return <PageShell showNavigation={false}><div className="empty-card"><h2>没有找到这次投票</h2><p>请确认链接来自当前浏览器中的原型数据。</p><Link className="button button-dark" to="/">回到首页</Link></div></PageShell>;

  const moveOption = (optionId: string, direction: -1 | 1) => {
    setRanking((current) => {
      const index = current.indexOf(optionId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const submitVote = () => {
    if (mode === "choice" && !selectedId) { setFeedback("先选一个你喜欢的选项吧。"); return; }
    if (mode === "ranking" && ranking.length !== poll.options.length) { setFeedback("请先为所有选项排序。"); return; }
    const now = new Date().toISOString();
    const voteId = existingVote?.id ?? crypto.randomUUID();
    try {
      updatePoll(poll.id, (current) => {
        const vote = { id: voteId, voter: identity, ...(mode === "choice" ? { selectedOptionId: selectedId } : {}), ranking: mode === "ranking" ? ranking : [selectedId], submittedAt: now };
        const votes = [...current.votes.filter((item) => item.voter.id !== identity.id), vote];
        const comments = comment.trim()
          ? [...current.comments.filter((item) => item.voteId !== voteId), { id: crypto.randomUUID(), voteId, voter: identity, text: comment.trim(), createdAt: now }]
          : current.comments;
        return { ...current, votes, comments };
      });
      setComment("");
      setFeedback(existingVote ? "你的投票已更新。" : "投票已提交，谢谢你！");
    } catch {
      setFeedback("投票暂时无法保存，请检查浏览器存储设置。");
    }
  };

  return (
    <PageShell showNavigation={false} backTo="/" title="朋友的选择">
      <section className="voting-heading"><span className="eyebrow">来帮忙做个决定</span><StatusPill poll={poll} /><h1>{poll.title}</h1>{poll.description && <p>{poll.description}</p>}{poll.endsAt && <p className="deadline-copy">截止时间：{new Date(poll.endsAt).toLocaleString()}</p>}</section>
      {!open && <div className="notice-banner">这次投票已结束，暂时不能提交或修改。</div>}
      <section className="content-card vote-options"><div className="field-row"><div><span className="eyebrow">{mode === "choice" ? "二选一" : "从喜欢到不喜欢"}</span><h2>{mode === "choice" ? "你更喜欢哪一个？" : "请给选项排个顺序"}</h2></div></div>
        {mode === "choice" ? poll.options.map((option) => <button key={option.id} className={`choice-card${selectedId === option.id ? " selected" : ""}`} disabled={!open} onClick={() => setSelectedId(option.id)}>{option.imageUrl && <img src={option.imageUrl} alt="" />}<span className="choice-check">{selectedId === option.id ? "✓" : ""}</span><strong>{option.name}</strong></button>) :
          <div className="rank-list">{ranking.map((id, index) => {
            const option = poll.options.find((item) => item.id === id);
            if (!option) return null;
            return <div className="rank-item" key={id}>{option.imageUrl && <img src={option.imageUrl} alt="" />}<span className="rank-number">{index + 1}</span><strong>{option.name}</strong><div className="rank-controls"><button aria-label={`将 ${option.name} 上移`} disabled={!open || index === 0} onClick={() => moveOption(id, -1)}>↑</button><button aria-label={`将 ${option.name} 下移`} disabled={!open || index === ranking.length - 1} onClick={() => moveOption(id, 1)}>↓</button></div></div>;
          })}</div>}
      </section>
      <section className="content-card voter-card"><div className="section-heading"><div><span className="eyebrow">轻松参与</span><h2>你想怎么称呼？</h2></div><span className="voter-emoji">☺</span></div>
        <label className="field-label" htmlFor="nickname">昵称</label><input id="nickname" className="text-input" value={identity.nickname} maxLength={24} onChange={(event) => changeNickname(event.target.value)} />
        <label className="field-label" htmlFor="vote-comment">留句话（可选）</label><textarea id="vote-comment" className="text-input textarea" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="说说你为什么这么选……" maxLength={280} rows={3} />
      </section>
      {feedback && <p className="feedback-message" role="status">{feedback}</p>}
      <div className="vote-submit-wrap"><button className="button button-dark button-wide" disabled={!open} onClick={submitVote}>{existingVote ? "更新我的投票" : "提交投票"} <span>↗</span></button>{existingVote && open && <p className="field-hint center-text">投票仍开放，你可以随时修改自己的选择。</p>}</div>
      <p className="prototype-note">这是本地前端原型，昵称和投票只保存在当前浏览器，不会同步给朋友。</p>
    </PageShell>
  );
}
