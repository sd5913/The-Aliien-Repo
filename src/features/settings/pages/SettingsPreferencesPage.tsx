import { useState } from "react";
import { PageShell } from "../../../components/layout/PageShell";
import { readUserSettings, USER_SETTINGS_STORAGE_KEY } from "../services/settings";
import { ProfileSettingsSection } from "../components/ProfileSettingsSection";

export function SettingsPreferencesPage() {
  const [settings, setSettings] = useState(readUserSettings);
  const [feedback, setFeedback] = useState("");

  const toggleSetting = (key: "cameraEnabled" | "photosEnabled" | "showNickname") => {
    const next = { ...settings, [key]: !settings[key] };
    try {
      window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
      setSettings(next);
      setFeedback("偏好设置已更新");
    } catch (error) {
      console.error("BothPls: could not save user settings.", error);
      setFeedback("保存失败，请检查浏览器存储设置。");
    }
  };

  return (
    <PageShell title="设置" showHeaderTitle backTo="/settings">
      <ProfileSettingsSection />
      <section className="settings-card">
        <div className="settings-section-heading"><div><h2>应用权限</h2></div><span className="settings-heading-icon">✿</span></div>
        <p className="settings-helper">仅保存你的偏好；不会请求设备权限或上传资料。</p>
        <SettingToggle title="相机" checked={settings.cameraEnabled} onChange={() => toggleSetting("cameraEnabled")} />
        <SettingToggle title="相册" checked={settings.photosEnabled} onChange={() => toggleSetting("photosEnabled")} />
      </section>

      <section className="settings-card privacy-card">
        <div className="settings-section-heading"><div><h2>隐私设置</h2></div><span className="settings-heading-icon">♡</span></div>
        <SettingToggle title="在投票评论中显示昵称" description="关闭后，评论仅显示为匿名朋友" checked={settings.showNickname} onChange={() => toggleSetting("showNickname")} />
        <div className="privacy-note"><span>🔒</span><p>个人资料和这些偏好只保存在当前浏览器，不会发送到服务器。</p></div>
      </section>
      {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
    </PageShell>
  );
}

function SettingToggle({ title, description, checked, onChange }: { title: string; description?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="setting-toggle-row">
      <div className="setting-toggle-copy"><strong>{title}</strong>{description && <span>{description}</span>}</div>
      <button className={`toggle-switch${checked ? " checked" : ""}`} type="button" role="switch" aria-checked={checked} aria-label={title} onClick={onChange}><span /></button>
    </div>
  );
}
