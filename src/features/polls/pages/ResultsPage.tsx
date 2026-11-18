import { useAccount } from "../../auth/components/AccountProvider";
import { pollPath, pollReturnTo } from "../utils/navigation";
import { useSharePoll } from "../components/ShareProvider";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill, isPollOpen } from "../../../components/ui/StatusPill";
import { usePolls } from "../hooks/usePolls";
import { SandResults } from "../components/SandResults";
import { sandColors } from "../utils/sandGeometry";
import { CommentList } from "../components/CommentList";
import { getVoter, isPollOwner } from "../utils/voting";
import { Modal } from "../../../components/ui/Modal";

export function ResultsPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { polls, loading, error } = usePolls();
  const poll = polls.find((item) => item.id === id);
  const openShare = useSharePoll();
  const [openedShare, setOpenedShare] = useState(false);
  useEffect(() => {
    if (poll && new URLSearchParams(location.search).get("share") === "1" && !openedShare) {
      setOpenedShare(true);
      openShare(poll);
    }
  }, [poll, location.search, openedShare, openShare]);
  const [voter] = useState(getVoter);
  const { user: accountUser } = useAccount();
  const [exitOpen, setExitOpen] = useState(false);
  const [closeHint, setCloseHint] = useState(false);
  const returnTo = pollReturnTo(location);
  const closeButton = (
    poll && isPollOwner(poll, accountUser?.id ?? "") ? <Link className="results-close-button" to={returnTo} aria-label="关闭结果">
      ×
    </Link> : <button className="results-close-button" type="button" onClick={() => { setCloseHint(false); setExitOpen(true); }} aria-label="关闭结果">×</button>
  );

  if (loading)
    return <PageShell showNavigation={false} title="投票结果" showHeaderTitle headerAction={closeButton}><p className="empty-inline">正在加载投票…</p></PageShell>;

  if (error)
    return <PageShell showNavigation={false} title="投票结果" showHeaderTitle headerAction={closeButton}><p className="settings-feedback" role="alert">投票加载失败，请检查 Supabase 配置后重试。</p></PageShell>;

  if (!poll)
    return (
      <PageShell showNavigation={false} title="投票结果" showHeaderTitle headerAction={closeButton}>
        <div className="empty-state">
          <h2>没有找到这次投票</h2>
          <Link to="/" className="purple-button">
            回到首页
          </Link>
        </div>
      </PageShell>
    );

  const counts = new Map(poll.options.map((option) => [option.id, 0]));
  poll.votes.forEach((vote) => {
    const optionId = vote.selectedOptionId;
    if (optionId && counts.has(optionId))
      counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  });
  const open = isPollOpen(poll);
  const owner = isPollOwner(poll, accountUser?.id ?? "");
  const commentsVisible = !open || owner;
  const validTotal = [...counts.values()].reduce((sum, count) => sum + count, 0);

  return (
    <PageShell showNavigation={false} title="投票结果" showHeaderTitle headerAction={closeButton}>
      <div className="results-redesign">
      <div className="results-heading">
        <StatusPill poll={poll} />
        <h1>{poll.title}</h1>
        <p>{poll.votes.length} 位朋友参与 · 结果随投票比例变化</p>
      </div>
      <SandResults options={poll.options} counts={counts} />
      <section className="results-card" aria-label="各选项票数">
        <div className="result-option-list">
          {poll.options.map((option, index) => {
            const count = counts.get(option.id) ?? 0;
            const percent = validTotal
              ? Math.round((count / validTotal) * 100)
              : 0;
            return (
              <div className="result-option-row" key={option.id}>
                <span
                  className="result-color"
                  style={{ background: sandColors[index % sandColors.length] }}
                />
                <strong>{String.fromCharCode(65 + index)} {option.name}</strong>
                <span>
                  {count} 票 · {percent}%
                </span>
              </div>
            );
          })}
        </div>
        {!poll.votes.length && (
          <p className="empty-inline">
            还没有人投票，分享链接邀请朋友来参与吧。
          </p>
        )}
      </section>
      {!commentsVisible && <p className="empty-inline">评论将在投票结束后公开</p>}
      {commentsVisible && (
        <section className="comments-section">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">{open && owner ? "仅发起者可见 · 结束后公开" : "听听大家的理由"}</span>
              <h2>
                评论{" "}
                <span className="heading-count">{poll.comments.length} 条</span>
              </h2>
            </div>
          </div>
          <CommentList comments={poll.comments} options={poll.options} />
        </section>
      )}
      {!open ? (
        <div className="locked-bottom">🔒 投票已结束，你只能查看结果和评论</div>
      ) : (
        <Link
          className="purple-button button-full result-vote-button"
          to={pollPath(poll.id, "vote", returnTo)}
        >
          {poll.votes.some((vote) => vote.voter.id === voter.id) ? "修改我的投票" : "参与投票"} <span>↗</span>
        </Link>
      )}
      </div>
      {exitOpen && <Modal title="本次投票已查看完毕" onClose={() => setExitOpen(false)} actions={<>
        <button className="button-soft" type="button" onClick={() => { setCloseHint(true); window.close(); }}>关闭页面</button>
        <Link className="purple-button" to="/">前往首页</Link>
      </>}><p>你可以关闭本页，或保留当前身份前往首页。</p>{closeHint && <p role="status">如果页面未关闭，请使用浏览器关闭当前标签页，或点击“前往首页”。</p>}</Modal>}
    </PageShell>
  );
}
