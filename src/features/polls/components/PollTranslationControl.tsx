import { useLocale } from "../../../i18n/LocaleProvider";
import type { usePollTranslation } from "../hooks/usePollTranslation";

export function PollTranslationControl({ translation }: { translation: ReturnType<typeof usePollTranslation> }) {
  const { t } = useLocale();
  if (!translation.enabled) return null;
  return <div className="poll-translation" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <span role="status">{t(translation.status === "failed" ? "translation.failed" : translation.status === "loading" ? "translation.loading" : translation.original ? "translation.original" : "translation.notice")}</span>
    {translation.status === "ready" && <button type="button" className="button-soft" onClick={translation.toggle}>{t(translation.original ? "translation.translated" : "translation.showOriginal")}</button>}
    {translation.status === "failed" && <button type="button" className="button-soft" onClick={translation.retry}>{t("translation.retry")}</button>}
  </div>;
}
