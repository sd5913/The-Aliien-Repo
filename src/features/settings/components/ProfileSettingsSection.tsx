import { useEffect, useState } from "react";
import { useUserSettings } from "../hooks/useUserSettings";
import type { UserSettings } from "../services/settings";

const avatars = ["🌷", "🐰", "🧸", "🍑", "🐱", "☁️"];

export function ProfileSettingsSection() {
  const { settings, loading, error, save } = useUserSettings();
  const disabled = loading || Boolean(error);
  const [draft, setDraft] = useState({ nickname: settings.nickname, email: settings.email, avatar: settings.avatar });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setDraft({ nickname: settings.nickname, email: settings.email, avatar: settings.avatar });
  }, [settings]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nickname = draft.nickname.trim();
    const email = draft.email.trim();
    if (!nickname || !email) {
      setFeedback("昵称和邮箱都需要填写。");
      return;
    }

    const next: UserSettings = { ...settings, nickname, email, avatar: draft.avatar };
    try {
      await save(next);
      setFeedback("个人资料已保存");
    } catch (error) {
      console.error("BothPls: could not save user settings.", error);
      setFeedback("保存失败，请稍后重试。");
    }
  };

  return (
    <section className="settings-card profile-card">
      <div className="settings-section-heading"><div><h2>个人资料</h2></div></div>
      <form className="profile-form profile-edit-card" onSubmit={saveProfile}>
        <div className="avatar-picker-row">
          <div className="profile-avatar" aria-label={`当前头像 ${draft.avatar}`}>{draft.avatar}</div>
          <div className="avatar-picker-copy"><strong>选择头像</strong><span>挑一个喜欢的糖果头像</span></div>
        </div>
        <div className="avatar-options" role="group" aria-label="选择头像">{avatars.map((avatar) => <button disabled={disabled} key={avatar} type="button" className={`avatar-option${draft.avatar === avatar ? " selected" : ""}`} aria-label={`选择头像 ${avatar}`} aria-pressed={draft.avatar === avatar} onClick={() => setDraft((current) => ({ ...current, avatar }))}>{avatar}</button>)}</div>
        <label className="field-label" htmlFor="settings-nickname">昵称</label>
        <input disabled={disabled} id="settings-nickname" className="text-input" value={draft.nickname} maxLength={24} onChange={(event) => setDraft((current) => ({ ...current, nickname: event.target.value }))} placeholder="输入昵称" />
        <label className="field-label" htmlFor="settings-email">邮箱</label>
        <input disabled={disabled} id="settings-email" className="text-input" type="email" value={draft.email} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" />
        <button disabled={disabled} className="purple-button button-full" type="submit">保存个人资料</button>
      </form>
      {error && <p className="settings-feedback" role="alert">个人资料加载失败，请检查 Supabase 配置后重试。</p>}
      {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
    </section>
  );
}
