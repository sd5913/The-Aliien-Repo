import type { PollOption } from "../../../types/poll";

const colors = ["#c4b5fd", "#f9a8d4", "#93c5fd", "#fcd34d", "#86efac"];

export function ResultBubbles({ options, counts, total }: { options: PollOption[]; counts: Map<string, number>; total: number }) {
  return (
    <div className="result-bubbles">
      {options.map((option, index) => {
        const count = counts.get(option.id) ?? 0;
        const percent = total ? Math.round((count / total) * 100) : 0;
        const size = 76 + Math.round((total ? count / total : 1 / options.length) * 48);
        return <div className="result-bubble" key={option.id} style={{ width: size, height: size, background: colors[index % colors.length] }}><strong>{String.fromCharCode(65 + index)}</strong><span>{percent}%</span></div>;
      })}
    </div>
  );
}
