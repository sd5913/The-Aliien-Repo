import type { CSSProperties } from "react";
import type { PollOption } from "../../../types/poll";
import { optionColors } from "../utils/optionColors";

export function PollOptionPreviews({ options }: { options: PollOption[] }) {
  const textOnly = options.length > 0 && options.every((option) => !option.imageUrl?.trim());
  return <div className="my-poll-thumbnails" role={textOnly ? "group" : undefined}
    aria-label={textOnly ? "选项预览" : undefined} aria-hidden={textOnly ? undefined : true}>
    {options.slice(0, 2).map((option, index) => textOnly ? (
      <div className="poll-preview-bottle" key={option.id} role="img"
        aria-label={`选项 ${String.fromCharCode(65 + index)}：${option.name}`}
        title={option.name} style={{ "--option-liquid-color": optionColors[index % optionColors.length] } as CSSProperties}>
        <span className="poll-preview-cap" aria-hidden="true" />
        <div className="poll-preview-body" aria-hidden="true">
          <span className="poll-preview-label">{option.name || `选项 ${index + 1}`}</span>
        </div>
      </div>
    ) : <img key={option.id} src={option.imageUrl ?? `https://picsum.photos/seed/bothpls-option-${index}/180/180`} alt="" draggable="false" />)}
  </div>;
}
