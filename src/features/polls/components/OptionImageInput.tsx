import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../../components/ui/Modal";
import { uploadPollImage } from "../services/images";

const emojis = ["😀", "😍", "🥰", "😎", "🤔", "👍", "❤️", "✨", "🎉", "🌸", "🍀", "🍔", "☕", "🎁", "🏆", "🐱"];

function emojiImage(emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><text x="80" y="113" text-anchor="middle" font-size="110">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function OptionImageInput({ url, index, onChange, onBusy }: {
  url?: string; index: number; onChange: (url?: string) => void; onBusy: (busy: boolean) => void;
}) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); onBusy(true); setError("");
    try { onChange(await uploadPollImage(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "图片上传失败，请重试。"); }
    finally { setBusy(false); onBusy(false); }
  };
  const close = () => { setOpen(false); setShowEmojis(false); };
  return <div className="option-photo-input">
    <button className="option-photo-trigger" type="button" disabled={busy} aria-label={`添加选项 ${index + 1} 信息`} onClick={() => setOpen(true)}>
      {url ? <img className="option-editor-image" src={url} alt="" /> : <span className="option-editor-image option-photo-empty" aria-hidden="true">＋</span>}
    </button>
    <input ref={gallery} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={`选项 ${index + 1} 图片文件`} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={camera} hidden type="file" accept="image/*" capture="environment" aria-label={`选项 ${index + 1} 相机文件`} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
    {busy && <span role="status">上传中…</span>}{error && <span className="form-error" role="alert">{error}</span>}
    {open && createPortal(<Modal title="添加抉择信息" onClose={close}>
      <div className="option-media-menu">
        <button type="button" onClick={() => { close(); camera.current?.click(); }}>拍照</button>
        <button type="button" onClick={() => { close(); gallery.current?.click(); }}>相册</button>
        <button type="button" onClick={() => setShowEmojis((value) => !value)}>emoji</button>
        {showEmojis && <div className="option-emoji-grid" aria-label="选择 emoji">{emojis.map((emoji) => <button type="button" key={emoji} aria-label={`选择 ${emoji}`} onClick={() => { onChange(emojiImage(emoji)); close(); }}>{emoji}</button>)}</div>}
        {url && <button type="button" onClick={() => { onChange(undefined); close(); }}>移除当前内容</button>}
      </div>
    </Modal>, document.querySelector(".app-shell") ?? document.body)}
  </div>;
}
