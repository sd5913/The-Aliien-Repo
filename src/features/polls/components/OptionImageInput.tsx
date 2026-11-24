import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageUploadError, uploadPollImage } from "../services/images";
import { useLocale } from "../../../i18n/LocaleProvider";

export function OptionImageInput({ url, index, onChange, onBusy }: {
  url?: string; index: number; onChange: (url?: string) => void; onBusy: (busy: boolean) => void;
}) {
  const { t } = useLocale();
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); onBusy(true); setError("");
    try {
      const photo = await uploadPollImage(file);
      onChange(photo);
    }
    catch (cause) { setError(cause instanceof ImageUploadError ? t(cause.key, { size: cause.key === "image.originalSize" ? "10 MB" : "5 MB" }) : t("image.uploadFailed")); }
    finally { setBusy(false); onBusy(false); }
  };
  const close = () => setOpen(false);
  const chooseCamera = () => { close(); camera.current?.click(); };
  const chooseGallery = () => { close(); gallery.current?.click(); };
  return <div className="option-photo-input">
    <div className="option-photo-tile">
      <button className="option-photo-trigger" type="button" disabled={busy} aria-label={t("image.addInfo", { index: index + 1 })} onClick={() => setOpen(true)}>
        {url ? <img className="option-editor-image" src={url} alt="" /> : <span className="option-editor-image option-photo-empty" aria-hidden="true">＋</span>}
      </button>
      {url && <button className="option-photo-remove" type="button" aria-label={t("image.removeCurrent")} onClick={() => onChange(undefined)}>×</button>}
    </div>
    <input ref={gallery} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("image.file", { index: index + 1 })} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={camera} hidden type="file" accept="image/*" capture="environment" aria-label={t("image.cameraFile", { index: index + 1 })} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    {busy && <span role="status">{t("image.uploading")}</span>}{error && <span className="form-error" role="alert">{error}</span>}
    {open && createPortal(
      <div className="source-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className="source-sheet" role="dialog" aria-label={t("image.chooseFromAlbum")} onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
          <div className="source-sheet-group">
            <button type="button" onClick={chooseCamera}>{t("image.take")}</button>
            <button type="button" onClick={chooseGallery}>{t("image.chooseFromAlbum")}</button>
          </div>
        </div>
      </div>,
      document.querySelector(".app-shell") ?? document.body,
    )}
  </div>;
}
