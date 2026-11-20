import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../../components/ui/Modal";
import { uploadPollImage } from "../services/images";

function recentPhotos(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter(url => typeof url === "string").slice(0, 8) : [];
  } catch { return []; }
}

export function OptionImageInput({ url, index, ownerId, name, onNameChange, onChange, onBusy }: {
  ownerId?: string; name: string; onNameChange: (text: string) => void;
  url?: string; index: number; onChange: (url?: string) => void; onBusy: (busy: boolean) => void;
}) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
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
    catch (cause) { setError(cause instanceof Error ? cause.message : "图片上传失败，请重试。"); }
    finally { setBusy(false); onBusy(false); }
  };
  const close = () => { setOpen(false); };
  return <div className="option-photo-input">
    <button className="option-photo-trigger" type="button" disabled={busy} aria-label={`添加选项 ${index + 1} 信息`} onClick={() => { setPhotos(ownerId ? recentPhotos(historyKey) : []); setOpen(true); }}>
      {url ? <img className="option-editor-image" src={url} alt="" /> : <span className="option-editor-image option-photo-empty" aria-hidden="true">＋</span>}
    </button>
    <input ref={gallery} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={`选项 ${index + 1} 图片文件`} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={camera} hidden type="file" accept="image/*" capture="environment" aria-label={`选项 ${index + 1} 相机文件`} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    {busy && <span role="status">上传中…</span>}{error && <span className="form-error" role="alert">{error}</span>}
    {open && createPortal(<Modal title="添加抉择信息" onClose={close}>
      <div className="option-media-menu" onKeyDown={event => { if (event.key === "Escape") close(); }}>
        <div className="option-photo-strip" aria-label="最近使用的照片">
          <button autoFocus type="button" aria-label="拍照" onClick={() => { close(); camera.current?.click(); }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          {photos.map((photo, i) => <button key={photo} type="button" aria-label={"使用最近照片 " + (i + 1)} onClick={() => { onChange(photo); close(); }}><img src={photo} alt="" /></button>)}
          {!photos.length && <small>最近使用的照片会显示在这里</small>}
        </div>
        <button className="option-gallery-row" type="button" onClick={() => { close(); gallery.current?.click(); }}><strong>照片</strong><small>从你的相册中选择</small></button>
        <label>文本<textarea className="text-input" value={name} maxLength={60} onChange={event => onNameChange(event.target.value)} placeholder="输入文本" /></label>
        {url && <button type="button" onClick={() => { onChange(undefined); close(); }}>移除当前内容</button>}
      </div>
    </Modal>, document.querySelector(".app-shell") ?? document.body)}
  </div>;
}
