import { Link } from "react-router-dom";
import type { Poll } from "../../../types/poll";
import { StatusPill } from "../../../components/ui/StatusPill";

export function PollCard({ poll, to, compact = false }: { poll: Poll; to: string; compact?: boolean }) {
  const image = poll.options[0]?.imageUrl;
  return (
    <Link className={`poll-card${compact ? " poll-card-compact" : ""}`} to={to}>
      {image ? <img className="poll-card-image" src={image} alt="" /> : <div className="poll-card-image image-placeholder">✦</div>}
      <span className="poll-card-chevron" aria-hidden="true">↗</span>
      <div className="poll-card-copy">
        <StatusPill poll={poll} />
        <h3>{poll.title}</h3>
        <p>{poll.votes.length} 人参与 · {poll.options.length} 个选项</p>
      </div>
    </Link>
  );
}
