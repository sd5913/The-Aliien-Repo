import { AppIcon } from "../../../components/ui/AppIcon";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Toast } from "../../../components/ui/Toast";
import { usePolls } from "../hooks/usePolls";

function formatDeadline(value?: string) {
  if (!value) return "未设置截止时间";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "未设置截止时间"
    : date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function SharePage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { polls, loading, error } = usePolls();
  const [toast, setToast] = useState("");
  const poll = polls.find((item) => item.id === id);
  const returnTo =
    location.state && typeof location.state === "object" && "returnTo" in location.state &&
    typeof location.state.returnTo === "string"
      ? location.state.returnTo
      : `/poll/${id}/results`;
  const publicUrl = `${window.location.origin}/poll/${id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setToast("公开链接已复制");
    } catch (copyError) {
      console.error("Could not copy poll link.", copyError);
      setToast("复制失败，请检查剪贴板权限");
    }
  };

  const nativeShare = async () => {
    if (!poll) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: poll.title, text: poll.description || "邀请你帮忙选一选", url: publicUrl });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  if (loading) return <PageShell showNavigation={false} backTo={returnTo} title="分享投票" showHeaderTitle><p className="empty-inline">正在加载投票…</p></PageShell>;
  if (error) return <PageShell showNavigation={false} backTo={returnTo} title="分享投票" showHeaderTitle><p className="settings-feedback" role="alert">投票加载失败，请稍后重试。</p></PageShell>;
  if (!poll) return <PageShell showNavigation={false} backTo={returnTo} title="分享投票" showHeaderTitle><div className="empty-state"><h2>没有找到这次投票</h2><Link className="purple-button" to={returnTo}>返回上一页</Link></div></PageShell>;

  return (
    <PageShell showNavigation={false} backTo={returnTo} title="分享投票" showHeaderTitle>
      <section className="share-page-intro">
        <span className="eyebrow">SEND THE QUESTION</span>
        <h1>把这次选择分享出去</h1>
        <p>先看看分享卡片，再把公开链接发给朋友，大家可以直接打开参与投票。</p>
      </section>

      <section className="share-preview-card" aria-label="分享卡片预览">
        <div className="share-preview-topline"><span>BothPls</span><span>投票邀请</span></div>
        <div className="share-preview-images">
          {poll.options.slice(0, 3).map((option, index) => (
            <div className={`share-preview-image share-preview-image-${index + 1}`} key={option.id}>
              <img src={option.imageUrl ?? `https://picsum.photos/seed/bothpls-share-${option.id}/360/360`} alt="" />
            </div>
          ))}
        </div>
        <StatusPill poll={poll} />
        <h2>{poll.title}</h2>
        {poll.description && <p>{poll.description}</p>}
        <div className="share-preview-meta"><span>{poll.options.length} 个选项</span><span>{formatDeadline(poll.endsAt)}</span></div>
      </section>

      <section className="share-detail-card">
        <div className="share-detail-row"><span>公开链接</span><strong className="share-url">{publicUrl}</strong></div>
        <div className="share-detail-row"><span>参与方式</span><strong>打开链接即可投票，无需注册</strong></div>
        <div className="share-detail-row"><span>当前状态</span><strong>{poll.status === "open" ? "正在收集回答" : "投票已结束"}</strong></div>
      </section>

      <div className="share-page-actions">
        <button className="purple-button button-full" onClick={() => void nativeShare()}>分享给朋友 <AppIcon name="share" /></button>
        <button className="button-soft button-full" onClick={() => void copyLink()}>复制公开链接</button>
      </div>
      <p className="share-page-footnote">分享后，朋友可查看选项并提交自己的选择。</p>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </PageShell>
  );
}
