import { useLocale } from "../../../i18n/LocaleProvider";
import type { PollOption } from "../../../types/poll";

import { optionColor } from "../utils/optionColors";

export function ResultBubbles({ options, counts, total }: { options: PollOption[]; counts: Map<string, number>; total: number }) {
  const { percent } = useLocale();
  return (
    <div className="result-bubbles">
      {options.map((option, index) => {
        const count = counts.get(option.id) ?? 0;
        const ratio = total ? count / total : 0;
        const size = 76 + Math.round((total ? count / total : 1 / options.length) * 48);
        return <div className="result-bubble" key={option.id} style={{ width: size, height: size, background: optionColor(option, index) }}><strong>{String.fromCharCode(65 + index)}</strong><span>{percent(ratio)}</span></div>;
      })}
    </div>
  );
}
