import { useState } from "react";
import { PageShell } from "../../../components/layout/PageShell";
import { readUserSettings, USER_SETTINGS_STORAGE_KEY, type UserSettings } from "../services/settings";
const avatars = ["🌷", "🐰", "🧸", "🍑", "🐱", "☁️"];


export function SettingsPage() {
  const [settings, setSettings] = useState(readUserSettings);
  const [draft, setDraft] = useState({ nickname: settings.nickname, email: settings.email });
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
    saveSettings({ ...settings, nickname, email }, "个人资料已保存");
  };

  const toggleSetting = (key: "cameraEnabled" | "photosEnabled" | "showNickname") => {
    const next = { ...settings, [key]: !settings[key] };
    saveSettings(next, "偏好设置已更新");
  };

  const chooseAvatar = (avatar: string) => {
    saveSettings({ ...settings, avatar }, "头像已更新");
  };

  return (
    <PageShell>
      <div className="settings-heading"><span className="eyebrow">让 BothPls 更适合你</span><h1>设置</h1><p>管理你的个人资料与使用偏好。</p></div>
      <section className="settings-card profile-card">
        <div className="settings-section-heading"><div><span className="eyebrow">YOUR PROFILE</span><h2>个人资料</h2></div><span className="profile-private-pill">本地保存</span></div>
        <div className="avatar-picker-row">
          <div className="profile-avatar" aria-label={`当前头像 ${settings.avatar}`}>{settings.avatar}</div>
          <div className="avatar-picker-copy"><strong>选择你的头像</strong><span>挑一个喜欢的糖果头像</span></div>
        </div>
        <div className="avatar-options" role="group" aria-label="选择头像">{avatars.map((avatar) => <button key={avatar} type="button" className={`avatar-option${settings.avatar === avatar ? " selected" : ""}`} aria-label={`选择头像 ${avatar}`} aria-pressed={settings.avatar === avatar} onClick={() => chooseAvatar(avatar)}>{avatar}</button>)}</div>
        <form className="profile-form" onSubmit={saveProfile}>
          <label className="field-label" htmlFor="settings-nickname">昵称</label>
          <input id="settings-nickname" className="text-input" value={draft.nickname} maxLength={24} onChange={(event) => setDraft((current) => ({ ...current, nickname: event.target.value }))} placeholder="输入昵称" />
          <label className="field-label" htmlFor="settings-email">邮箱</label>
          <input id="settings-email" className="text-input" type="email" value={draft.email} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" />
          <button className="purple-button button-full" type="submit">保存个人资料</button>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-section-heading"><div><span className="eyebrow">APP PERMISSIONS</span><h2>应用权限</h2></div><span className="settings-heading-icon">✿</span></div>
        <p className="settings-helper">仅保存你的偏好；不会请求设备权限或上传资料。</p>
        <SettingToggle title="相机" description="允许在添加商品时使用相机" checked={settings.cameraEnabled} onChange={() => toggleSetting("cameraEnabled")} />
        <SettingToggle title="相册" description="允许从相册选择商品图片" checked={settings.photosEnabled} onChange={() => toggleSetting("photosEnabled")} />
      </section>

      <section className="settings-card privacy-card">
        <div className="settings-section-heading"><div><span className="eyebrow">PRIVACY</span><h2>隐私设置</h2></div><span className="settings-heading-icon">♡</span></div>
        <SettingToggle title="在投票评论中显示昵称" description="关闭后，评论仅显示为匿名朋友" checked={settings.showNickname} onChange={() => toggleSetting("showNickname")} />
        <div className="privacy-note"><span>🔒</span><p>个人资料和这些偏好只保存在当前浏览器，不会发送到服务器。</p></div>
      </section>
      {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
    </PageShell>
  );
}

function SettingToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="setting-toggle-row">
      <div className="setting-toggle-copy"><strong>{title}</strong><span>{description}</span></div>
      <button className={`toggle-switch${checked ? " checked" : ""}`} type="button" role="switch" aria-checked={checked} aria-label={title} onClick={onChange}><span /></button>
    </div>
  );
}
