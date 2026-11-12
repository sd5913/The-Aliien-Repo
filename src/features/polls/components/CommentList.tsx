import type { PollComment, PollOption } from "../../../types/poll";
import { readUserSettings } from "../../settings/services/settings";

const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#f59e0b", "#22c55e"];

export function CommentList({ comments, options }: { comments: PollComment[]; options: PollOption[] }) {
  if (!comments.length) return <p className="empty-inline">还没有评论，朋友们的想法会显示在这里。</p>;
  const showNickname = readUserSettings().showNickname;
  return (
    <div className="comments-list">
      {comments.map((comment) => {
        const optionIndex = options.findIndex((option) => option.id === comment.optionId);
        const date = new Date(comment.createdAt);
        return (
          <article className="comment-row" key={comment.id}>
            <div className="comment-avatar">{comment.voter.nickname.slice(0, 1)}</div>
            <div className="comment-copy">
              <div className="comment-meta"><strong>{showNickname ? comment.voter.nickname : "匿名朋友"}</strong><time>{Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</time></div>
              <p>{comment.text}</p>
            </div>
            {optionIndex >= 0 && <span className="comment-color-dot" style={{ background: colors[optionIndex % colors.length] }} title={options[optionIndex].name} />}
          </article>
        );
      })}
    </div>
  );
}
