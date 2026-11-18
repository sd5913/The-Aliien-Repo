import { useRef, useState } from "react";
import { uploadPollImage } from "../services/images";

export function OptionImageInput({ url, index, onChange, onBusy }: {
  url?: string; index: number; onChange: (url?: string) => void; onBusy: (busy: boolean) => void;
}) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); onBusy(true); setError("");
    try { onChange(await uploadPollImage(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "图片上传失败，请重试。"); }
    finally { setBusy(false); onBusy(false); }
  };
  return <div className="option-photo-input">
    {url ? <img className="option-editor-image" src={url} alt={`选项 ${index + 1} 图片预览`} /> : <span className="option-editor-image option-photo-empty" aria-hidden="true">✦</span>}
    <div className="option-photo-actions">
      <button type="button" disabled={busy} aria-label={`选项 ${index + 1} 相册选图`} onClick={() => gallery.current?.click()}>相册</button>
      <button type="button" disabled={busy} aria-label={`选项 ${index + 1} 拍照`} onClick={() => camera.current?.click()}>拍照</button>
      {url && <button type="button" disabled={busy} aria-label={`移除选项 ${index + 1} 图片`} onClick={() => onChange(undefined)}>移除</button>}
    </div>
    <input ref={gallery} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={`选项 ${index + 1} 图片文件`} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={camera} hidden type="file" accept="image/*" capture="environment" aria-label={`选项 ${index + 1} 相机文件`} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    {busy && <span role="status">上传中…</span>}{error && <span className="form-error" role="alert">{error}</span>}
  </div>;
}
