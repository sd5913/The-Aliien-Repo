import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill, isPollOpen } from "../../../components/ui/StatusPill";
import { Toast } from "../../../components/ui/Toast";
import { VOTER_STORAGE_KEY, readLocalJson, writeLocalJson } from "../../../lib/storage/localStorage";
import type { VoterIdentity } from "../../../types/poll";
import { usePolls } from "../hooks/usePolls";
import { OptionCarousel } from "../components/OptionCarousel";

function getVoter(): VoterIdentity {
  const isIdentity = (value: unknown): value is VoterIdentity => Boolean(value && typeof value === "object" && "id" in value && "nickname" in value && typeof value.id === "string" && typeof value.nickname === "string");
  const stored = readLocalJson(VOTER_STORAGE_KEY, null, isIdentity);
  if (stored) return stored;
  const voter = { id: crypto.randomUUID(), nickname: "朋友" };
  writeLocalJson(VOTER_STORAGE_KEY, voter);
  return voter;
}

export function VotingPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { polls, updatePoll } = usePolls();
  const poll = polls.find((item) => item.id === id);
  const [voter] = useState(getVoter);
  const existingVote = poll?.votes.find((vote) => vote.voter.id === voter.id);
  const [activeId, setActiveId] = useState(existingVote?.selectedOptionId ?? poll?.options[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(existingVote?.selectedOptionId ?? "");
  const [comment, setComment] = useState(() => poll?.comments.find((item) => item.voteId === existingVote?.id)?.text ?? "");
  const [toast, setToast] = useState("");
  const open = poll ? isPollOpen(poll) : false;

  if (!poll) return <PageShell backTo="/" showNavigation={false}><div className="empty-state"><h2>没有找到这次投票</h2><p>这条投票可能已被删除。</p><Link className="purple-button" to="/">回到首页</Link></div></PageShell>;

  const activeIndex = Math.max(0, poll.options.findIndex((option) => option.id === activeId));
  const activeOption = poll.options[activeIndex];
  const otherOption = poll.options[(activeIndex + 1) % poll.options.length];
  const submitVote = () => {
    if (!selectedId) { setToast("先选择一个喜欢的选项吧"); return; }
    const now = new Date().toISOString();
    const voteId = existingVote?.id ?? crypto.randomUUID();
    try {
      updatePoll(poll.id, (current) => {
        const vote = { id: voteId, voter, selectedOptionId: selectedId, ranking: [selectedId], submittedAt: now };
        const comments = current.comments.filter((item) => item.voteId !== voteId);
        if (comment.trim()) comments.push({ id: crypto.randomUUID(), voteId, voter, text: comment.trim(), createdAt: now, optionId: selectedId });
        return { ...current, votes: [...current.votes.filter((item) => item.voter.id !== voter.id), vote], comments };
      });
      navigate(`/poll/${poll.id}/results`);
    } catch (error) {
      console.error("Could not save vote.", error);
      setToast("投票保存失败，请检查浏览器存储设置");
    }
  };

  return (
    <PageShell showNavigation={false} backTo="/" title="帮朋友做选择">
      <div className="voting-title"><div className="voting-meta"><StatusPill poll={poll} /><span>{poll.votes.length} 位朋友参与</span></div><h1>{poll.title}</h1>{poll.description && <p>{poll.description}</p>}</div>
      {!open && <div className="notice-banner">这次投票已结束，暂时不能提交或修改。</div>}
      <OptionCarousel options={poll.options} selectedId={activeId} onSelect={setActiveId} />
      <div className="vote-choice-controls">
        <button className={`vote-choice-primary${selectedId === activeOption?.id ? " selected" : ""}`} disabled={!open} onClick={() => setSelectedId(activeOption?.id ?? "")}>{selectedId === activeOption?.id ? "✓ 已选择此项" : "选择此项"}</button>
        {otherOption && <button className="vote-choice-secondary" disabled={!open} onClick={() => { setActiveId(otherOption.id); setSelectedId(otherOption.id); }}>{String.fromCharCode(65 + (activeIndex + 1) % poll.options.length)} 查看另一项</button>}
      </div>
      <div className="vote-progress"><div className="vote-progress-top"><span>朋友们已经参与</span><strong>已选 {poll.votes.length}</strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, poll.votes.length * 12)}%` }} /></div></div>
      <label className="field-label comment-input-label" htmlFor="vote-comment">留句话吧 <span className="optional">可选</span></label>
      <textarea id="vote-comment" className="text-input textarea vote-comment-input" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="说说你为什么喜欢它～" rows={2} maxLength={240} />
      {existingVote && open && <p className="field-hint">你之前已经投过票，可以在截止前回来修改。</p>}
      <button className="purple-button button-full submit-vote" disabled={!open} onClick={submitVote}>{existingVote ? "提交修改" : "提交我的选择"} <span>↗</span></button>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </PageShell>
  );
}
