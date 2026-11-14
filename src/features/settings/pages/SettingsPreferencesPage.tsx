import { useState } from "react";
import { PageShell } from "../../../components/layout/PageShell";
import { useUserSettings } from "../hooks/useUserSettings";
import { ProfileSettingsSection } from "../components/ProfileSettingsSection";

export function SettingsPreferencesPage() {
  const { settings, loading, error, save } = useUserSettings();
  const [feedback, setFeedback] = useState("");

  const toggleSetting = async (key: "cameraEnabled" | "photosEnabled" | "showNickname") => {
    const next = { ...settings, [key]: !settings[key] };
    try {
      await save(next);
      setFeedback("偏好设置已更新");
    } catch (error) {
      console.error("BothPls: could not save user settings.", error);
      setFeedback("保存失败，请稍后重试。");
    }
  };

  return (
    <PageShell title="设置" showHeaderTitle backTo="/settings">
      <ProfileSettingsSection />
      <section className="settings-card">
        <div className="settings-section-heading"><div><h2>应用权限</h2></div><span className="settings-heading-icon">✿</span></div>
        <p className="settings-helper">仅保存你的偏好；不会请求设备权限。</p>
        <SettingToggle disabled={loading || Boolean(error)} title="相机" checked={settings.cameraEnabled} onChange={() => void toggleSetting("cameraEnabled")} />
        <SettingToggle disabled={loading || Boolean(error)} title="相册" checked={settings.photosEnabled} onChange={() => void toggleSetting("photosEnabled")} />
      </section>

      <section className="settings-card privacy-card">
        <div className="settings-section-heading"><div><h2>隐私设置</h2></div><span className="settings-heading-icon">♡</span></div>
        <SettingToggle disabled={loading || Boolean(error)} title="在投票评论中显示昵称" description="关闭后，评论仅显示为匿名朋友" checked={settings.showNickname} onChange={() => void toggleSetting("showNickname")} />
        <div className="privacy-note"><span>🔒</span><p>个人资料和偏好会与此设备的匿名标识关联并保存在 Supabase。</p></div>
      </section>
      {error && <p className="settings-feedback" role="alert">设置加载失败，请检查 Supabase 配置后重试。</p>}
      {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
    </PageShell>
  );
}

function SettingToggle({ title, description, checked, onChange, disabled = false }: { title: string; description?: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="setting-toggle-row">
      <div className="setting-toggle-copy"><strong>{title}</strong>{description && <span>{description}</span>}</div>
      <button disabled={disabled} className={`toggle-switch${checked ? " checked" : ""}`} type="button" role="switch" aria-checked={checked} aria-label={title} onClick={onChange}><span /></button>
    </div>
  );
}
