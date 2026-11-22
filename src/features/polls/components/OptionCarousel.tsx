import { useEffect, useState, type CSSProperties } from "react";
import type { PollOption } from "../../../types/poll";
import { Modal } from "../../../components/ui/Modal";
import { optionColors } from "../utils/optionColors";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useLocale } from "../../../i18n/LocaleProvider";

export function OptionCarousel({ options, activeId, onBrowse }: { options: PollOption[]; activeId: string; onBrowse: (id: string) => void }) {
  const { t } = useLocale();
  const [index, setIndex] = useState(Math.max(0, options.findIndex((option) => option.id === activeId)));
  const [lightbox, setLightbox] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const activeIndex = options.findIndex((option) => option.id === activeId);
    if (activeIndex >= 0) setIndex(activeIndex);
  }, [options, activeId]);

  const browseIndex = (next: number) => {
    const normalized = (next + options.length) % options.length;
    setIndex(normalized);
    onBrowse(options[normalized].id);
  };
  const option = options[index];
  if (!option) return null;
  // Derive presentation from saved options so existing text-only polls work
  // without adding a type field or rewriting any published poll data.
  const textOnly = options.every((item) => !item.imageUrl?.trim());

  return (
    <>
      <section className="option-carousel" onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX;
        if (touchStart !== null && end !== undefined && Math.abs(end - touchStart) > 40) browseIndex(index + (end < touchStart ? 1 : -1));
        setTouchStart(null);
      }}>
        <div className={textOnly ? "carousel-text-wrap" : "carousel-image-wrap"}>
          {textOnly ? <div className="text-option-bottle" style={{ "--option-liquid-color": optionColors[index % optionColors.length] } as CSSProperties}>
            <span className="text-option-cap" aria-hidden="true" />
            <span className="text-option-neck" aria-hidden="true" />
            <div className="text-option-bottle-body">
              <div className="text-option-content" aria-live="polite" aria-atomic="true">
                <span className="text-option-letter">{t("image.optionLetter", { letter: String.fromCharCode(65 + index) })}</span>
                <strong>{option.name || t("image.option", { index: index + 1 })}</strong>
              </div>
            </div>
          </div> : option.imageUrl ? <img src={option.imageUrl} alt={option.name} /> : <div className="carousel-image-fallback">✦</div>}
          <button className="carousel-arrow carousel-arrow-previous" aria-label={t("image.previous")} onClick={() => browseIndex(index - 1)}><AppIcon name="chevronLeft" size={26} /></button>
          <button className="carousel-arrow carousel-arrow-next" aria-label={t("image.next")} onClick={() => browseIndex(index + 1)}><AppIcon name="chevronRight" size={26} /></button>
          <span className="carousel-count">{index + 1}/{options.length}</span>
          {!textOnly && <><span className="carousel-zoom-hint">{t("image.zoomHint")}</span>
          <button className="zoom-button" aria-label={t("image.zoom")} onClick={() => setLightbox(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" /></svg></button></>}
        </div>
        <div className="carousel-option-label"><span>{String.fromCharCode(65 + index)}</span><strong>{textOnly ? t("image.swipeText") : option.name || t("image.option", { index: index + 1 })}</strong></div>
        <div className="carousel-controls"><div>{options.map((item, dotIndex) => <button key={item.id} aria-label={t("image.view", { index: dotIndex + 1 })} className={index === dotIndex ? "active" : ""} onClick={() => browseIndex(dotIndex)} />)}</div></div>
      </section>
      {!textOnly && lightbox && <Modal title={option.name} onClose={() => setLightbox(false)}><div className="lightbox-image">{option.imageUrl ? <img src={option.imageUrl} alt={option.name} /> : <span>✦</span>}</div></Modal>}
    </>
  );
}
