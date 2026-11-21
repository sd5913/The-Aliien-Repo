import { useEffect, useState } from "react";
import type { PollOption } from "../../../types/poll";
import { Modal } from "../../../components/ui/Modal";

export function OptionCarousel({ options, activeId, onBrowse }: { options: PollOption[]; activeId: string; onBrowse: (id: string) => void }) {
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
          {textOnly ? <div className="text-option-bottle">
            <span className="text-option-cap" aria-hidden="true" />
            <span className="text-option-neck" aria-hidden="true" />
            <div className="text-option-bottle-body">
              <div className="text-option-content" aria-live="polite" aria-atomic="true">
                <span className="text-option-letter">选项 {String.fromCharCode(65 + index)}</span>
                <strong>{option.name || `选项 ${index + 1}`}</strong>
              </div>
            </div>
          </div> : option.imageUrl ? <img src={option.imageUrl} alt={option.name} /> : <div className="carousel-image-fallback">✦</div>}
          <button className="carousel-arrow carousel-arrow-previous" aria-label="上一个选项" onClick={() => browseIndex(index - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button>
          <button className="carousel-arrow carousel-arrow-next" aria-label="下一个选项" onClick={() => browseIndex(index + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
          <span className="carousel-count">{index + 1}/{options.length}</span>
          {!textOnly && <><span className="carousel-zoom-hint">点击图片放大</span>
          <button className="zoom-button" aria-label="放大图片" onClick={() => setLightbox(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" /></svg></button></>}
        </div>
        <div className="carousel-option-label"><span>{String.fromCharCode(65 + index)}</span><strong>{textOnly ? "左右滑动，看看其他选项" : option.name || `选项 ${index + 1}`}</strong></div>
        <div className="carousel-controls"><div>{options.map((item, dotIndex) => <button key={item.id} aria-label={`查看选项 ${dotIndex + 1}`} className={index === dotIndex ? "active" : ""} onClick={() => browseIndex(dotIndex)} />)}</div></div>
      </section>
      {!textOnly && lightbox && <Modal title={option.name} onClose={() => setLightbox(false)}><div className="lightbox-image">{option.imageUrl ? <img src={option.imageUrl} alt={option.name} /> : <span>✦</span>}</div></Modal>}
    </>
  );
}
