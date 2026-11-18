import { useAccount } from "../../auth/components/AccountProvider";
import { pollPath, pollReturnTo } from "../utils/navigation";
import { useSharePoll } from "../components/ShareProvider";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { OwnerPollActions } from "../components/OwnerPollActions";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill, isPollOpen } from "../../../components/ui/StatusPill";
import { usePolls } from "../hooks/usePolls";
import { SandResults } from "../components/SandResults";
import { sandColors } from "../utils/sandGeometry";
import { CommentList } from "../components/CommentList";
import { getVoter, isPollOwner } from "../utils/voting";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import type { PollComment } from "../../../types/poll";

export function ResultsPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { polls, loading, error, syncError, editComment, deleteComment, updatePoll, removePoll } = usePolls();
  const navigate = useNavigate();
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
  const [deletingComment, setDeletingComment] = useState<PollComment | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState(location.state?.published ? "发布成功，分享给朋友来投票吧" : location.state?.saved ? "修改已保存" : "");
  const confirmCommentDelete = async () => {
    if (!deletingComment || commentBusy) return;
    setCommentBusy(true);
    try {
      await deleteComment(id, deletingComment.id);
      setDeletingComment(null);
      setCommentFeedback("评论已删除，投票选择保持不变");
    } catch {
      setCommentFeedback("删除失败，请检查网络或权限后重试。");
    } finally {
      setCommentBusy(false);
    }
  };
  const returnTo = pollReturnTo(location);
  const closeButton = (
    <>
    {poll && isPollOwner(poll, accountUser?.id ?? "") && <OwnerPollActions poll={poll}
      onEnd={() => updatePoll(poll.id, (current) => ({ ...current, status: "closed" }))}
      onDelete={async () => { await removePoll(poll.id); navigate(returnTo, { replace: true }); }} />}
    {
    (loading || error || !poll || isPollOwner(poll, accountUser?.id ?? "")) ? <Link className="results-close-button" to={returnTo} aria-label="关闭结果">
      ×
    </Link> : <button className="results-close-button" type="button" onClick={() => { setCloseHint(false); setExitOpen(true); }} aria-label="关闭结果">×</button>
    }</>
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

  const highest = Math.max(0, ...counts.values());
  const leaders = poll.options.filter((option) => highest > 0 && counts.get(option.id) === highest);
  const leaderText = leaders.map((option) => String.fromCharCode(65 + poll.options.indexOf(option))).join("、");

  return (
    <PageShell showNavigation={false} title="投票结果" showHeaderTitle headerAction={closeButton}>
      <div className="results-redesign">
      <div className="results-heading">
        <StatusPill poll={poll} />
        <h1>{poll.title}</h1>
        <p>{poll.votes.length} 位朋友参与 · 结果随投票比例变化</p>
      </div>
      {syncError && <p className="field-hint" role="status">结果更新暂时失败，已保留上次数据；网络恢复后会重试。</p>}
      {highest > 0 && <p className="result-leader-summary" role="status">{leaders.length > 1 ? `平票 · ${leaderText} 并列领先` : `${leaderText} ${open ? "当前领先" : "获得最多选择"}`}</p>}
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
          <CommentList comments={poll.comments} options={poll.options} currentVoterId={voter.id} isPollOwner={owner}
            onEdit={async (comment, text) => { await editComment(id, comment.id, text); setCommentFeedback("评论已更新，投票选择保持不变"); }}
            onDelete={setDeletingComment} />
        </section>
      )}
      {!open ? (
        <div className="locked-bottom">🔒 投票已结束，不能再提交或修改选择</div>
      ) : (
        <Link
          className="purple-button button-full result-vote-button"
          to={pollPath(poll.id, "vote", returnTo)}
        >
          {poll.votes.some((vote) => vote.voter.id === voter.id) ? "修改我的投票" : "参与投票"} <span>↗</span>
        </Link>
      )}
      </div>
      {deletingComment && <Modal title="确定删除这条评论吗？" onClose={() => { if (!commentBusy) setDeletingComment(null); }} actions={<>
        <button className="button-soft" disabled={commentBusy} onClick={() => setDeletingComment(null)}>取消</button>
        <button className="danger-button" disabled={commentBusy} onClick={() => void confirmCommentDelete()}>{commentBusy ? "删除中…" : "删除评论"}</button>
      </>}><p>删除后无法恢复，投票选择和统计结果不会改变。</p></Modal>}
      {commentFeedback && <Toast message={commentFeedback} onClose={() => setCommentFeedback("")} />}
      {exitOpen && <Modal title="本次投票已查看完毕" onClose={() => setExitOpen(false)} actions={<>
        <button className="button-soft" type="button" onClick={() => { setCloseHint(true); window.close(); }}>关闭页面</button>
        <Link className="purple-button" to="/">前往首页</Link>
      </>}><p>你可以关闭本页，或保留当前身份前往首页。</p>{closeHint && <p role="status">如果页面未关闭，请使用浏览器关闭当前标签页，或点击“前往首页”。</p>}</Modal>}
    </PageShell>
  );
}
