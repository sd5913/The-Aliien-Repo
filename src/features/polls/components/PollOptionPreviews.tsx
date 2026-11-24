import type { CSSProperties } from "react";
import type { PollOption } from "../../../types/poll";
import { optionColor } from "../utils/optionColors";
import { useLocale } from "../../../i18n/LocaleProvider";

export function PollOptionPreviews({ options }: { options: PollOption[] }) {
  const { t } = useLocale();
  const textOnly = options.length > 0 && options.every((option) => !option.imageUrl?.trim());
  return <div className="my-poll-thumbnails" role={textOnly ? "group" : undefined}
    aria-label={textOnly ? t("poll.preview") : undefined} aria-hidden={textOnly ? undefined : true}>
    {options.slice(0, 2).map((option, index) => textOnly ? (
      <div className="poll-preview-bottle" key={option.id} role="img"
        aria-label={t("poll.previewOption", { letter: String.fromCharCode(65 + index), name: option.name })}
        title={option.name} style={{ "--option-liquid-color": optionColor(option, index) } as CSSProperties}>
        <span className="poll-preview-cap" aria-hidden="true" />
        <div className="poll-preview-body" aria-hidden="true">
          <span className="poll-preview-label">{option.name || t("image.option", { index: index + 1 })}</span>
        </div>
      </div>
    ) : <img key={option.id} src={option.imageUrl ?? `https://picsum.photos/seed/bothpls-option-${index}/180/180`} alt="" draggable="false" />)}
  </div>;
}
