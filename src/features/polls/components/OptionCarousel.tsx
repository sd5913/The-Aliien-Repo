import { useEffect, useState } from "react";
import type { PollOption } from "../../../types/poll";
import { Modal } from "../../../components/ui/Modal";

export function OptionCarousel({ options, selectedId, onSelect }: { options: PollOption[]; selectedId: string; onSelect: (id: string) => void }) {
  const [index, setIndex] = useState(Math.max(0, options.findIndex((option) => option.id === selectedId)));
  const [lightbox, setLightbox] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const selectedIndex = options.findIndex((option) => option.id === selectedId);
    if (selectedIndex >= 0) setIndex(selectedIndex);
  }, [options, selectedId]);

  const selectIndex = (next: number) => {
    const normalized = (next + options.length) % options.length;
    setIndex(normalized);
    onSelect(options[normalized].id);
  };
  const option = options[index];
  if (!option) return null;

  return (
    <>
      <section className="option-carousel" onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX;
        if (touchStart !== null && end !== undefined && Math.abs(end - touchStart) > 40) selectIndex(index + (end < touchStart ? 1 : -1));
        setTouchStart(null);
      }}>
        <div className="carousel-image-wrap">
          {option.imageUrl ? <img src={option.imageUrl} alt={option.name} /> : <div className="carousel-image-fallback">✦</div>}
          <span className="carousel-count">{index + 1}/{options.length}</span>
          <button className="zoom-button" aria-label="放大图片" onClick={() => setLightbox(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" /></svg></button>
        </div>
        <div className="carousel-option-label"><span>{String.fromCharCode(65 + index)}</span><strong>{option.name || `选项 ${index + 1}`}</strong></div>
        <div className="carousel-controls"><button aria-label="上一个选项" onClick={() => selectIndex(index - 1)}>‹</button><div>{options.map((item, dotIndex) => <button key={item.id} aria-label={`查看选项 ${dotIndex + 1}`} className={index === dotIndex ? "active" : ""} onClick={() => selectIndex(dotIndex)} />)}</div><button aria-label="下一个选项" onClick={() => selectIndex(index + 1)}>›</button></div>
      </section>
      {lightbox && <Modal title={option.name} onClose={() => setLightbox(false)}><div className="lightbox-image">{option.imageUrl ? <img src={option.imageUrl} alt={option.name} /> : <span>✦</span>}</div></Modal>}
    </>
  );
}
