import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useState } from "react";
import type { PollComment, PollOption } from "../../../types/poll";
import { useUserSettings } from "../../settings/hooks/useUserSettings";
import { displayAvatar, isImageAvatar } from "../../settings/utils/profile";
import { optionColor } from "../utils/optionColors";

function CommentAvatar({ avatar = "", nickname }: { avatar?: string; nickname: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const image = isImageAvatar(avatar);
  return (
    <div className="comment-avatar" aria-hidden="true">
      {image && failedSrc !== avatar ? (
        <img src={avatar} alt="" onError={() => setFailedSrc(avatar)} />
      ) : image ? displayAvatar("") : avatar || Array.from(nickname)[0] || displayAvatar("")}
    </div>
  );
}

interface CommentListProps {
  comments: PollComment[];
  options: PollOption[];
  currentVoterId?: string;
  isPollOwner?: boolean;
  onEdit?: (comment: PollComment, text: string) => Promise<void>;
  onDelete?: (comment: PollComment) => void;
}

export function CommentList({ comments, options, currentVoterId, isPollOwner = false, onEdit, onDelete }: CommentListProps) {
  const { t, locale } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<MessageKey | "">("");
  const { settings } = useUserSettings();

  if (!comments.length) return <p className="empty-inline">{t("comment.empty")}</p>;

  const startEdit = (comment: PollComment) => {
    setEditingId(comment.id);
    setDraft(comment.text);
    setFeedback("");
  };

  const saveEdit = async (comment: PollComment) => {
    const text = draft.trim();
    if (!text || text.length > 200 || !onEdit || saving) return;
    setSaving(true);
    setFeedback("");
    try {
      await onEdit(comment, text);
      setEditingId(null);
    } catch {
      setFeedback("comment.saveFailed");
    } finally {
      setSaving(false);
    }
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
            <CommentAvatar avatar={comment.voter.avatar} nickname={comment.voter.nickname} />
            <div className="comment-copy">
              <div className="comment-meta"><strong>{settings.showNickname ? comment.voter.nickname : t("comment.anonymous")}</strong><time>{Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale, { month: "numeric", day: "numeric" })}</time></div>
              {editing ? (
                <div className="comment-editor">
                  <textarea disabled={saving} className="text-input textarea" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={200} aria-label={t("comment.edit")} autoFocus />
                  {feedback && <p role="alert">{t(feedback)}</p>}
                  <div className="comment-editor-actions"><button disabled={saving} className="button-soft" onClick={() => setEditingId(null)}>{t("common.cancel")}</button><button className="purple-button" disabled={saving || !draft.trim() || draft.trim().length > 200} onClick={() => void saveEdit(comment)}>{saving ? t("common.saving") : t("common.save")}</button></div>
                </div>
              ) : <p>{comment.text}</p>}
            </div>
            {!editing && optionIndex >= 0 && <span className="comment-color-dot" style={{ background: optionColor(options[optionIndex], optionIndex) }} title={options[optionIndex].name} />}
            {!editing && (canEdit || canDelete) && <div className="comment-management-actions">
              {canEdit && <button disabled={saving} aria-label={t("comment.editBy", { name: comment.voter.nickname })} onClick={() => startEdit(comment)}><AppIcon name="edit" size={16} />{t("common.editShort")}</button>}
              {canDelete && <button disabled={saving} className="comment-delete-button" aria-label={t("comment.deleteBy", { name: comment.voter.nickname })} onClick={() => onDelete?.(comment)}><AppIcon name="bin" size={16} />{t("common.delete")}</button>}
            </div>}
          </article>
        );
      })}
    </div>
  );
}
