import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../../components/ui/Modal";
import { ImageUploadError, uploadPollImage } from "../services/images";
import { useLocale } from "../../../i18n/LocaleProvider";

function recentPhotos(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter(url => typeof url === "string").slice(0, 8) : [];
  } catch { return []; }
}

function CameraIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 7h4l2-3h6l2 3h4v13H3z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function OptionImageInput({ url, index, ownerId, name, onNameChange, onChange, onBusy }: {
  ownerId?: string; name: string; onNameChange: (text: string) => void;
  url?: string; index: number; onChange: (url?: string) => void; onBusy: (busy: boolean) => void;
}) {
  const { t } = useLocale();
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const historyKey = "bothpls:recent-photos:" + ownerId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); onBusy(true); setError("");
    try {
      const photo = await uploadPollImage(file);
      onChange(photo);
      if (ownerId) {
        const history = [photo, ...recentPhotos(historyKey).filter(url => url !== photo)].slice(0, 8);
        try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch { /* Storage is optional. */ }
      }
    }
    catch (cause) { setError(cause instanceof ImageUploadError ? t(cause.key, { size: cause.key === "image.originalSize" ? "10 MB" : "5 MB" }) : t("image.uploadFailed")); }
    finally { setBusy(false); onBusy(false); }
  };
  const close = () => { setOpen(false); setSourceOpen(false); };
  const openSource = () => setSourceOpen(true);
  const chooseCamera = () => { setSourceOpen(false); camera.current?.click(); };
  const chooseGallery = () => { setSourceOpen(false); gallery.current?.click(); };
  const previewUrl = url ?? photos[0];
  const usePreview = () => { if (previewUrl && !url) { onChange(previewUrl); close(); } else { openSource(); } };
  return <div className="option-photo-input">
    <button className="option-photo-trigger" type="button" disabled={busy} aria-label={t("image.addInfo", { index: index + 1 })} onClick={() => { setPhotos(ownerId ? recentPhotos(historyKey) : []); setOpen(true); }}>
      {url ? <img className="option-editor-image" src={url} alt="" /> : <span className="option-editor-image option-photo-empty" aria-hidden="true">＋</span>}
    </button>
    <input ref={gallery} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("image.file", { index: index + 1 })} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={camera} hidden type="file" accept="image/*" capture="environment" aria-label={t("image.cameraFile", { index: index + 1 })} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    {busy && <span role="status">{t("image.uploading")}</span>}{error && <span className="form-error" role="alert">{error}</span>}
    {open && createPortal(<Modal title={t("image.addTitle")} onClose={close}>
      <div className="option-media-menu" onKeyDown={event => { if (event.key === "Escape") close(); }}>
        <div className="option-preview-row">
          <button type="button" className="option-preview-tile" aria-label={t("image.photo")} onClick={usePreview}>
            {previewUrl ? <img src={previewUrl} alt="" /> : <CameraIcon />}
          </button>
          <p className="option-preview-caption">{photos.length ? t("image.recentPhotos") : t("image.recentEmpty")}</p>
        </div>
        {photos.length > 1 && (
          <div className="option-recent-strip" aria-label={t("image.recentPhotos")}>
            {photos.slice(1).map((photo, i) => (
              <button key={photo} type="button" aria-label={t("image.useRecentPhoto", { index: i + 2 })} onClick={() => { onChange(photo); close(); }}>
                <img src={photo} alt="" />
              </button>
            ))}
          </div>
        )}
        <button className="option-gallery-row" type="button" onClick={openSource}><strong>{t("image.photo")}</strong><small>{t("image.chooseFromGallery")}</small></button>
        <label className="option-text-card"><span>{t("image.text")}</span><textarea className="text-input" value={name} maxLength={60} onChange={event => onNameChange(event.target.value)} placeholder={t("image.enterText")} /></label>
        {url && <button className="option-remove-row" type="button" onClick={() => { onChange(undefined); close(); }}>{t("image.removeCurrent")}</button>}
      </div>
    </Modal>, document.querySelector(".app-shell") ?? document.body)}
    {open && sourceOpen && createPortal(
      <div className="source-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSourceOpen(false); }}>
        <div className="source-sheet" role="dialog" aria-label={t("image.photo")} onKeyDown={event => { if (event.key === "Escape") setSourceOpen(false); }}>
          <div className="source-sheet-group">
            <button type="button" onClick={chooseCamera}>{t("image.take")}</button>
            <button type="button" onClick={chooseGallery}>{t("image.chooseFromAlbum")}</button>
          </div>
          <div className="source-sheet-group">
            <button type="button" onClick={() => setSourceOpen(false)}>{t("common.cancel")}</button>
          </div>
        </div>
      </div>,
      document.querySelector(".app-shell") ?? document.body,
    )}
  </div>;
}
