import { formatNumber, type MessageKey } from "../../../i18n/catalog";
import { useLocale } from "../../../i18n/LocaleProvider";
import { useRef, useState } from "react";
import { ImageUploadError, uploadPollImage } from "../services/images";

export function OptionImageInput({ url, index, onChange, onBusy }: {
  url?: string; index: number; onChange: (url?: string) => void; onBusy: (busy: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | "">("");
  const pick = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); onBusy(true); setError("");
    try { onChange(await uploadPollImage(file)); }
    catch (cause) { setError(cause instanceof ImageUploadError ? cause.key : "image.uploadFailed"); }
    finally { setBusy(false); onBusy(false); }
  };
  return <div className="option-photo-input">
    {url ? <img className="option-editor-image" src={url} alt={t("image.preview", { index: index + 1 })} /> : <span className="option-editor-image option-photo-empty" aria-hidden="true">✦</span>}
    <div className="option-photo-actions">
      <button type="button" disabled={busy} aria-label={t("image.gallery", { index: index + 1 })} onClick={() => gallery.current?.click()}>{t("common.photos")}</button>
      <button type="button" disabled={busy} aria-label={t("image.camera", { index: index + 1 })} onClick={() => camera.current?.click()}>{t("image.take")}</button>
      {url && <button type="button" disabled={busy} aria-label={t("image.removeFor", { index: index + 1 })} onClick={() => onChange(undefined)}>{t("image.remove")}</button>}
    </div>
    <input ref={gallery} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("image.file", { index: index + 1 })} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={camera} hidden type="file" accept="image/*" capture="environment" aria-label={t("image.cameraFile", { index: index + 1 })} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    {busy && <span role="status">{t("image.uploading")}</span>}{error && <span className="form-error" role="alert">{t(error, { size: formatNumber(locale, error === "image.originalSize" ? 10 : 5, { style: "unit", unit: "megabyte" }) })}</span>}
  </div>;
}
