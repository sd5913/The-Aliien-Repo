import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Modal } from "../../../components/ui/Modal";
import { Toast } from "../../../components/ui/Toast";
import { StatusPill, isPollOpen } from "../../../components/ui/StatusPill";
import { usePolls } from "../hooks/usePolls";
import type { Poll } from "../../../types/poll";

type Filter = "全部" | "进行中" | "已结束";

function MyPollCard({ poll, onDelete, notify }: { poll: Poll; onDelete: (poll: Poll) => void; notify: (message: string) => void }) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/poll/${poll.id}`);
      notify("链接已复制");
    } catch (error) {
      console.error("Could not copy poll link.", error);
      notify("复制失败，请检查剪贴板权限");
    }
  };

  return (
    <div className={`swipe-card${offset ? " swipe-card-active" : ""}`} onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => {
      const end = event.changedTouches[0]?.clientX;
      if (touchStart !== null && end !== undefined && Math.abs(end - touchStart) > 40) setOffset(end < touchStart ? -76 : 76);
      setTouchStart(null);
    }}>
      <button className={`swipe-action swipe-edit${offset < 0 ? " visible" : ""}`} onClick={() => navigate(`/create?id=${poll.id}`)}>编辑</button>
      <button className={`swipe-action swipe-delete${offset > 0 ? " visible" : ""}`} onClick={() => onDelete(poll)}>删除</button>
      <article className="my-poll-card" style={{ transform: `translateX(${-offset}px)` }}>
        <Link className="my-poll-main" to={`/poll/${poll.id}/manage`} state={{ returnTo: "/settings" }}>
          <img src={poll.options[0]?.imageUrl ?? "https://picsum.photos/seed/bothpls-cover/240/240"} alt="" />
          <div className="my-poll-info"><StatusPill poll={poll} /><h3>{poll.title}</h3><p>{poll.votes.length} 人参与</p></div>
        </Link>
        <div className="my-poll-actions"><Link to={`/poll/${poll.id}/manage`} state={{ returnTo: "/settings" }} aria-label="管理投票">⚙ <span>管理</span></Link><button onClick={() => void share()} aria-label="分享投票">↗ <span>分享</span></button></div>
      </article>
    </div>
  );
}

export function MyPollsSection({ showCreateButton = true, personalPageStyle = false }: { showCreateButton?: boolean; personalPageStyle?: boolean }) {
  const { polls, removePoll } = usePolls();
  const [filter, setFilter] = useState<Filter>("全部");
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const location = useLocation();
  const [toast, setToast] = useState(typeof location.state?.toast === "string" ? location.state.toast : "");
  const filtered = polls.filter((poll) => filter === "全部" || (filter === "进行中" ? isPollOpen(poll) : !isPollOpen(poll)));

  const confirmDelete = () => {
    if (!deleting) return;
    try {
      removePoll(deleting.id);
      setToast("投票已删除");
    } catch (error) {
      console.error("Could not delete poll.", error);
      setToast("删除失败，请稍后重试");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section id={personalPageStyle ? "my-polls" : undefined} className={personalPageStyle ? "settings-my-polls" : undefined}>
      <div className="page-heading my-heading"><div><span className="eyebrow">收集每一个小想法</span><h1>我的投票</h1></div>{showCreateButton && <Link to="/create" className="purple-button create-shortcut">＋ 创建投票</Link>}</div>
      <div className="filter-tabs" role="tablist">{(["全部", "进行中", "已结束"] as Filter[]).map((tab) => <button key={tab} role="tab" aria-selected={filter === tab} className={filter === tab ? "active" : ""} onClick={() => setFilter(tab)}>{tab}</button>)}</div>
      {filtered.length ? <div className="my-poll-list">{filtered.map((poll) => <MyPollCard key={poll.id} poll={poll} onDelete={setDeleting} notify={setToast} />)}</div> : <div className="empty-state"><div className="empty-art">☁</div><h3>{polls.length ? "这里暂时没有这类投票" : "还没有投票哦"}</h3><p>创建一个小问题，邀请朋友帮你选。</p>{showCreateButton && <Link to="/create" className="purple-button">＋ 创建投票</Link>}</div>}
      {deleting && <Modal title="确定删除这条投票吗？" onClose={() => setDeleting(null)} actions={<><button className="button-soft" onClick={() => setDeleting(null)}>再想想</button><button className="danger-button" onClick={confirmDelete}>删除投票</button></>}><p>删除后「{deleting.title}」及其投票和评论将一并移除。</p></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </section>
  );
}
