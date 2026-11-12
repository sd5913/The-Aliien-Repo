import { useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { readUserSettings, USER_SETTINGS_STORAGE_KEY, type UserSettings } from "../services/settings";
import { MyPollsSection } from "../../polls/pages/MyPollsPage";
const avatars = ["🌷", "🐰", "🧸", "🍑", "🐱", "☁️"];


export function SettingsPage() {
  const [settings, setSettings] = useState(readUserSettings);
  const [draft, setDraft] = useState({ nickname: settings.nickname, email: settings.email, avatar: settings.avatar });
  const [editingProfile, setEditingProfile] = useState(false);
  const [feedback, setFeedback] = useState("");

  const saveSettings = (next: UserSettings, message: string) => {
    try {
      window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
      setSettings(next);
      setFeedback(message);
      return true;
    } catch (error) {
      console.error("BothPls: could not save user settings.", error);
      setFeedback("保存失败，请检查浏览器存储设置。");
      return false;
    }
  };

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nickname = draft.nickname.trim();
    const email = draft.email.trim();
    if (!nickname || !email) {
      setFeedback("昵称和邮箱都需要填写。");
      return;
    }
    if (saveSettings({ ...settings, nickname, email, avatar: draft.avatar }, "个人资料已保存")) {
      setEditingProfile(false);
    }
  };

  const editProfile = () => {
    setDraft({ nickname: settings.nickname, email: settings.email, avatar: settings.avatar });
    setEditingProfile((current) => !current);
    setFeedback("");
  };

  const cancelProfileEdit = () => {
    setDraft({ nickname: settings.nickname, email: settings.email, avatar: settings.avatar });
    setEditingProfile(false);
    setFeedback("");
  };

  return (
    <PageShell title="设置" showHeaderTitle headerAction={<Link className="settings-nav-button" to="/settings/preferences" aria-label="权限和隐私设置"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.1 3.5a8.6 8.6 0 0 0-.1-1.3l1.5-1.2-1.5-2.6-1.9.7a8.7 8.7 0 0 0-2.2-1.3L15.6 4h-3.1l-.3 2.3A8.7 8.7 0 0 0 10 7.6l-1.9-.7-1.5 2.6 1.5 1.2a8.6 8.6 0 0 0 0 2.6l-1.5 1.2 1.5 2.6 1.9-.7a8.7 8.7 0 0 0 2.2 1.3l.3 2.3h3.1l.3-2.3a8.7 8.7 0 0 0 2.2-1.3l1.9.7 1.5-2.6-1.5-1.2a8.6 8.6 0 0 0 .1-1.3Z" /></svg></Link>}>
      <section className="settings-card profile-card">
        <div className="settings-section-heading"><div><h2>个人资料</h2></div><span className="profile-private-pill">本地保存</span></div>
        <div className="profile-summary">
          <div className="profile-avatar" aria-label={`当前头像 ${settings.avatar}`}>{settings.avatar}</div>
          <div className="profile-summary-copy"><strong>{settings.nickname}</strong><span>{settings.email}</span></div>
          <button className="edit-profile-button" type="button" aria-label={editingProfile ? "关闭编辑个人资料" : "编辑个人资料"} aria-expanded={editingProfile} onClick={editProfile}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z" /></svg>
          </button>
        </div>
        {editingProfile && <form className="profile-form profile-edit-card" onSubmit={saveProfile}>
          <span className="eyebrow">EDIT PROFILE</span>
          <div className="avatar-picker-row">
            <div className="profile-avatar" aria-label={`当前头像 ${draft.avatar}`}>{draft.avatar}</div>
            <div className="avatar-picker-copy"><strong>选择头像</strong><span>挑一个喜欢的糖果头像</span></div>
          </div>
          <div className="avatar-options" role="group" aria-label="选择头像">{avatars.map((avatar) => <button key={avatar} type="button" className={`avatar-option${draft.avatar === avatar ? " selected" : ""}`} aria-label={`选择头像 ${avatar}`} aria-pressed={draft.avatar === avatar} onClick={() => setDraft((current) => ({ ...current, avatar }))}>{avatar}</button>)}</div>
          <label className="field-label" htmlFor="settings-nickname">昵称</label>
          <input id="settings-nickname" className="text-input" value={draft.nickname} maxLength={24} onChange={(event) => setDraft((current) => ({ ...current, nickname: event.target.value }))} placeholder="输入昵称" />
          <label className="field-label" htmlFor="settings-email">邮箱</label>
          <input id="settings-email" className="text-input" type="email" value={draft.email} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" />
          <div className="profile-edit-actions"><button className="profile-cancel-button" type="button" onClick={cancelProfileEdit}>取消</button><button className="purple-button" type="submit">保存修改</button></div>
        </form>}
      </section>
      <MyPollsSection />
      {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
    </PageShell>
  );
}
