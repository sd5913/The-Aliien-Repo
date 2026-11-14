import { useState } from "react";
import type { PollComment, PollOption } from "../../../types/poll";
import { useUserSettings } from "../../settings/hooks/useUserSettings";

const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#f59e0b", "#22c55e"];

interface CommentListProps {
  comments: PollComment[];
  options: PollOption[];
  currentVoterId?: string;
  isPollOwner?: boolean;
  onEdit?: (comment: PollComment, text: string) => void;
  onDelete?: (comment: PollComment) => void;
}

export function CommentList({ comments, options, currentVoterId, isPollOwner = false, onEdit, onDelete }: CommentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { settings } = useUserSettings();

  if (!comments.length) return <p className="empty-inline">还没有评论，朋友们的想法会显示在这里。</p>;

  const startEdit = (comment: PollComment) => {
    setEditingId(comment.id);
    setDraft(comment.text);
  };

  const saveEdit = (comment: PollComment) => {
    const text = draft.trim();
    if (!text || text.length > 200 || !onEdit) return;
    onEdit(comment, text);
    setEditingId(null);
  };

  return (
    <div className="comments-list">
      {comments.map((comment) => {
        const optionIndex = options.findIndex((option) => option.id === comment.optionId);
        const date = new Date(comment.createdAt);
        const editing = editingId === comment.id;
        const isAuthor = currentVoterId === comment.voter.id;
        const canEdit = Boolean(onEdit && isAuthor);
        const canDelete = Boolean(onDelete && (isPollOwner || isAuthor));
        return (
          <article className="comment-row" key={comment.id}>
            <div className="comment-avatar">{comment.voter.nickname.slice(0, 1)}</div>
            <div className="comment-copy">
              <div className="comment-meta"><strong>{settings.showNickname ? comment.voter.nickname : "匿名朋友"}</strong><time>{Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</time></div>
              {editing ? (
                <div className="comment-editor">
                  <textarea className="text-input textarea" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={200} aria-label="修改评论" autoFocus />
                  <div className="comment-editor-actions"><button className="button-soft" onClick={() => setEditingId(null)}>取消</button><button className="purple-button" disabled={!draft.trim() || draft.trim().length > 200} onClick={() => saveEdit(comment)}>保存</button></div>
                </div>
              ) : <p>{comment.text}</p>}
            </div>
            {!editing && optionIndex >= 0 && <span className="comment-color-dot" style={{ background: colors[optionIndex % colors.length] }} title={options[optionIndex].name} />}
            {!editing && (canEdit || canDelete) && <div className="comment-management-actions">
              {canEdit && <button aria-label={`修改${comment.voter.nickname}的评论`} onClick={() => startEdit(comment)}>修改</button>}
              {canDelete && <button className="comment-delete-button" aria-label={`删除${comment.voter.nickname}的评论`} onClick={() => onDelete?.(comment)}>删除</button>}
            </div>}
          </article>
        );
      })}
    </div>
  );
}
