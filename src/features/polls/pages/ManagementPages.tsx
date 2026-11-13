// Poll list and management pages for the local prototype. / 本地原型的投票列表与管理页面。
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { Modal } from "../../../components/ui/Modal";
import { StatusPill, isPollOpen } from "../../../components/ui/StatusPill";
import { Toast } from "../../../components/ui/Toast";
import type { PollComment } from "../../../types/poll";
import { CommentList } from "../components/CommentList";
import { usePolls } from "../hooks/usePolls";
import { getVoter, isPollOwner } from "../utils/voting";

export function PollManagementPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { polls, updatePoll } = usePolls();
  const [voter] = useState(getVoter);
  const [toast, setToast] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [deletingComment, setDeletingComment] = useState<PollComment | null>(null);
  const poll = polls.find((item) => item.id === id);
  const returnTo = location.state && typeof location.state === "object" && "returnTo" in location.state &&
    (location.state.returnTo === "/" || location.state.returnTo === "/settings")
    ? location.state.returnTo
    : "/";

  if (!poll) return <PageShell showNavigation={false} backTo={returnTo} title="投票详情" showHeaderTitle><div className="empty-state"><h2>没有找到这次投票</h2><p>它可能已被清除，或不在当前浏览器中。</p><Link className="purple-button" to={returnTo}>{returnTo === "/" ? "回到首页" : "回到个人页面"}</Link></div></PageShell>;

  const owner = isPollOwner(poll, voter.id);
  const open = isPollOpen(poll);
  const commentsPublic = poll.commentsPublic !== false;
  const visibleComments = owner || commentsPublic ? poll.comments : poll.comments.filter((comment) => comment.voter.id === voter.id);
  const deadlineDate = poll.endsAt ? new Date(poll.endsAt) : null;
  const deadline = deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate.toLocaleString("zh-CN", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "不设置";
  const publicUrl = `${window.location.origin}/poll/${poll.id}`;
  const managementUrl = `${window.location.origin}/poll/${poll.id}/manage`;

  const copyLink = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast(`${label}已复制`);
    } catch (error) {
      console.error("Could not copy poll link.", error);
      setToast("复制失败，请检查剪贴板权限");
    }
  };

  const closePoll = () => {
    try {
      updatePoll(poll.id, (current) => {
        if (!isPollOwner(current, voter.id)) throw new Error("Only the poll owner can close this poll.");
        return { ...current, status: "closed" };
      });
      setToast("投票已结束");
    } catch (error) {
      console.error("Could not close poll.", error);
      setToast("操作失败，请稍后重试");
    } finally {
      setConfirmClose(false);
    }
  };

  const toggleComments = () => {
    try {
      updatePoll(poll.id, (current) => {
        if (!isPollOwner(current, voter.id)) throw new Error("Only the poll owner can change comment visibility.");
        return { ...current, commentsPublic: !(current.commentsPublic !== false) };
      });
      setToast(commentsPublic ? "评论区已隐藏" : "评论区已公开");
    } catch (error) {
      console.error("Could not update comment visibility.", error);
      setToast("操作失败，请稍后重试");
    }
  };

  const editComment = (comment: PollComment, text: string) => {
    try {
      updatePoll(poll.id, (current) => {
        const target = current.comments.find((item) => item.id === comment.id);
        if (!target || target.voter.id !== voter.id) throw new Error("Only the comment author can edit this comment.");
        return { ...current, comments: current.comments.map((item) => item.id === comment.id ? { ...item, text } : item) };
      });
      setToast("评论已修改");
    } catch (error) {
      console.error("Could not edit comment.", error);
      setToast("评论修改失败，请稍后重试");
    }
  };

  const deleteComment = () => {
    if (!deletingComment) return;
    try {
      updatePoll(poll.id, (current) => {
        const target = current.comments.find((item) => item.id === deletingComment.id);
        if (!target || (!isPollOwner(current, voter.id) && target.voter.id !== voter.id)) throw new Error("This user cannot delete the comment.");
        return { ...current, comments: current.comments.filter((item) => item.id !== deletingComment.id) };
      });
      setToast("评论已删除");
    } catch (error) {
      console.error("Could not delete comment.", error);
      setToast("评论删除失败，请稍后重试");
    } finally {
      setDeletingComment(null);
    }
  };

  return (
    <PageShell
      showNavigation={false}
      backTo={returnTo}
      title="投票详情"
      showHeaderTitle
      headerAction={owner ? <Link className="management-edit-button" to={`/create?id=${poll.id}`} aria-label="编辑投票">✎ <span>编辑</span></Link> : undefined}
    >
      <section className="management-heading"><StatusPill poll={poll} /><h1>{poll.title}</h1>{poll.description && <p>{poll.description}</p>}</section>
      <section className="management-stats" aria-label="投票信息">
        <div className="management-stat"><strong>{poll.votes.length}</strong><span>参与人数</span></div>
        <div className="management-stat management-stat-deadline"><strong>{deadline}</strong><span>关闭时间</span></div>
        <div className="management-stat"><strong>{visibleComments.length}</strong><span>评论</span></div>
        <div className="management-stat"><strong>{poll.options.length}</strong><span>选项个数</span></div>
      </section>

      {owner && <section className="management-card"><div className="section-title-row"><div><span className="eyebrow">邀请朋友</span><h2>分享管理</h2></div></div>
        <div className="management-share-row"><div><strong>公开投票链接</strong><p>朋友可以打开并提交或修改投票。</p></div><button className="button-soft" onClick={() => void copyLink(publicUrl, "公开链接")}>复制链接</button></div>
        <div className="management-share-row"><div><strong>管理链接</strong><p>用于返回这个投票详情与管理页。</p></div><button className="button-soft" onClick={() => void copyLink(managementUrl, "管理链接")}>复制链接</button></div>
      </section>}

      <section className="management-card"><div className="section-title-row"><div><span className="eyebrow">随时查看</span><h2>投票管理</h2></div></div>
        <div className="management-actions"><Link className="purple-button" to={`/poll/${poll.id}/results`}>查看结果 <span>→</span></Link>{owner && open && <button className="button-soft" onClick={() => setConfirmClose(true)}>结束投票</button>}</div>
        {owner && <div className="setting-toggle-row management-comments-toggle"><div className="setting-toggle-copy"><strong>公开评论区</strong><span>{commentsPublic ? "当前公开" : "当前隐藏"}</span></div><button className={`toggle-switch${commentsPublic ? " checked" : ""}`} role="switch" aria-checked={commentsPublic} aria-label="公开评论区" onClick={toggleComments}><span /></button></div>}
      </section>

      <section className="comments-section management-comments"><div className="section-title-row"><div><span className="eyebrow">听听大家的理由</span><h2>评论 <span className="heading-count">{visibleComments.length} 条</span></h2></div></div>
        <CommentList comments={visibleComments} options={poll.options} currentVoterId={voter.id} isPollOwner={owner} onEdit={editComment} onDelete={setDeletingComment} />
      </section>

      {confirmClose && <Modal title="确定结束这次投票吗？" onClose={() => setConfirmClose(false)} actions={<><button className="button-soft" onClick={() => setConfirmClose(false)}>取消</button><button className="danger-button" onClick={closePoll}>结束投票</button></>}><p>结束后，朋友将不能继续提交或修改投票。</p></Modal>}
      {deletingComment && <Modal title="确定删除这条评论吗？" onClose={() => setDeletingComment(null)} actions={<><button className="button-soft" onClick={() => setDeletingComment(null)}>取消</button><button className="danger-button" onClick={deleteComment}>删除评论</button></>}><p>删除后无法恢复，对应的投票选择不会受影响。</p></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </PageShell>
  );
}
