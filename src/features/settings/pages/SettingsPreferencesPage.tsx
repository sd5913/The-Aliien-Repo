import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useAccount } from "../../auth/components/AccountProvider";
import { useParticipant } from "../../auth/utils/useParticipant";
import { clearParticipant } from "../../auth/utils/participant";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { signOut } from "../../auth/services/auth";
import { useUserSettings } from "../hooks/useUserSettings";
import { ProfileSettingsSection } from "../components/ProfileSettingsSection";

export function SettingsPreferencesPage() {
  const { t } = useLocale();
  const { settings, loading, error, save } = useUserSettings();
  const navigate = useNavigate();
  const { user } = useAccount();
  const participant = useParticipant();
  const [feedback, setFeedback] = useState<MessageKey | "">("");
  const [loggingOut, setLoggingOut] = useState(false);

  const toggleSetting = async (key: "cameraEnabled" | "photosEnabled" | "showNickname") => {
    const next = { ...settings, [key]: !settings[key] };
    try {
      await save(next);
      setFeedback("settings.updated");
    } catch (error) {
      console.error("BothPls: could not save user settings.", error);
      setFeedback("settings.saveFailed");
    }
  };

  const handleSignOut = async () => {
    setFeedback("");
    setLoggingOut(true);
    try {
      if (user) {
        const { error: signOutError } = await signOut();
        if (signOutError) throw signOutError;
      }
      clearParticipant();
      navigate("/", { replace: true });
    } catch (cause) {
      console.error("BothPls: could not sign out.", cause);
      setFeedback("settings.signOutFailed");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <PageShell title={t("profile.settings")} showHeaderTitle backTo="/settings">
      <ProfileSettingsSection />
      <section className="settings-card">
        <div className="settings-section-heading"><div><h2>{t("settings.permissions")}</h2></div><span className="settings-heading-icon">✿</span></div>
        <p className="settings-helper">{t("settings.permissionNote")}</p>
        <SettingToggle disabled={loading || Boolean(error)} title={t("settings.camera")} checked={settings.cameraEnabled} onChange={() => void toggleSetting("cameraEnabled")} />
        <SettingToggle disabled={loading || Boolean(error)} title={t("common.photos")} checked={settings.photosEnabled} onChange={() => void toggleSetting("photosEnabled")} />
      </section>

      <section className="settings-card privacy-card">
        <div className="settings-section-heading"><div><h2>{t("settings.privacy")}</h2></div><span className="settings-heading-icon">♡</span></div>
        <SettingToggle disabled={loading || Boolean(error)} title={t("settings.showNickname")} description={t("settings.showNicknameHelp")} checked={settings.showNickname} onChange={() => void toggleSetting("showNickname")} />
        <div className="privacy-note"><span>🔒</span><p>{t("settings.storageNote")}</p></div>
      </section>
      {error && <p className="settings-feedback" role="alert">{t("settings.loadFailed")}</p>}
      {feedback && <p className="settings-feedback" role="status">{t(feedback)}</p>}
      {(user || participant) && <button className="logout-button" type="button" onClick={() => void handleSignOut()} disabled={loggingOut}>
        {loggingOut ? t("settings.signingOut") : user ? t("settings.signOut") : t("settings.leaveVoter")}
      </button>}
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
