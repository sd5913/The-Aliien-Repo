import { useLocale } from "../../../i18n/LocaleProvider";
import { LanguageSelect } from "../../../i18n/LanguageSelect";
import type { MessageKey } from "../../../i18n/catalog";
import { useAccount } from "../../auth/components/AccountProvider";
import { clearParticipant } from "../../auth/utils/participant";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { signOut } from "../../auth/services/auth";
import { useUserSettings } from "../hooks/useUserSettings";
import { Modal } from "../../../components/ui/Modal";
import { signInWithApple, signInWithGitHub } from "../../auth/services/auth";
import { fetchProfile } from "../services/profiles";
import { supabase } from "../../../lib/supabase/client";
import { AppIcon } from "../../../components/ui/AppIcon";

const CHANGELOG_140: MessageKey[] = [
  "settings.changelog.v140.item1",
  "settings.changelog.v140.item2",
  "settings.changelog.v140.item3",
];

const BINDING_PROVIDERS = [
  { id: "github", label: "GitHub" },
  { id: "apple", label: "Apple" },
] as const;

function BindingRow({ service, status, bound = false, action, onAction }: {
  service: string;
  status: string;
  bound?: boolean;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="settings-binding-row">
      <strong className="settings-binding-service">{service}</strong>
      <span className={`settings-binding-status${bound ? " is-bound" : ""}`}>{status}</span>
      {action && onAction && <button className="settings-binding-action" type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function SettingsPreferencesPage() {
  const { t } = useLocale();
  const { settings, error } = useUserSettings();
  const navigate = useNavigate();
  const { user } = useAccount();
  const [feedback, setFeedback] = useState<MessageKey | "">("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [nickname, setNickname] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    void fetchProfile(user.id).then((profile) => setNickname(profile?.nickname || settings.nickname)).catch(() => setNickname(settings.nickname));
  }, [user, settings.nickname]);

  const identities = user?.identities?.map((identity) => identity.provider) ?? [];
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const bindingStatus = (provider: "github" | "apple") => {
    if (!user) return t("settings.binding.signedOut");
    return identities.includes(provider) ? t("settings.binding.current") : t("settings.binding.notBound");
  };
  const bindingAction = user ? undefined : t("settings.binding.login");

  const clearLocalData = () => {
    Object.keys(window.localStorage).filter((key) => key.startsWith("bothpls:")).forEach((key) => window.localStorage.removeItem(key));
    clearParticipant();
    setConfirmClear(false);
    navigate("/", { replace: true });
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error("BothPls: notification permission request failed.", error);
    }
  };

  const deleteAccount = async () => {
    if (!user || deleteName.trim() !== nickname.trim()) {
      setFeedback("settings.nicknameMismatch");
      return;
    }
    try {
      const { error: deleteError } = await supabase.rpc("delete_account");
      if (deleteError) throw deleteError;
      await signOut();
      setConfirmDelete(false);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("BothPls: could not delete account.", error);
      setFeedback("settings.deleteFailed");
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

  const bind = async (provider: "github" | "apple") => {
    setFeedback("");
    const result = provider === "github" ? await signInWithGitHub("/settings/preferences") : await signInWithApple("/settings/preferences");
    if (result.error) setFeedback("settings.bindFailed");
  };

  return (
    <PageShell title={t("settings.title")} showHeaderTitle backTo="/settings" showNavigation={false}>
      <section className="settings-card">
        <div className="settings-section-heading"><h2>{t("settings.account")}</h2></div>
        {user && <button className="settings-row-button" type="button" onClick={() => navigate("/edit-profile")}>{t("settings.profile")} <AppIcon name="chevronRight" size={18} /></button>}
        <div className="settings-subheading">
          <strong>{t("settings.binding")}</strong>
          {!user && <span>{t("settings.binding.signedOut")}</span>}
        </div>
        <div className="settings-binding-list">
          {BINDING_PROVIDERS.map((provider) => (
            <BindingRow
              key={provider.id}
              service={provider.label}
              status={bindingStatus(provider.id)}
              bound={Boolean(user && identities.includes(provider.id))}
              action={bindingAction}
              onAction={user ? undefined : () => void bind(provider.id)}
            />
          ))}
        </div>
        {!user && <button className="settings-row-button" type="button" onClick={() => setConfirmClear(true)}>{t("settings.clearLocal")}</button>}
        {user && <button className="settings-row-button danger-text" type="button" onClick={() => setConfirmDelete(true)}>{t("settings.deleteAccount")}</button>}
      </section>

      <section className="settings-card">
        <div className="settings-section-heading"><h2>{t("settings.general")}</h2></div>
        <div className="settings-row-static settings-language-row"><strong>{t("app.language")}</strong><LanguageSelect /></div>
        {isIOS && <button className="settings-row-button" type="button" onClick={() => void requestNotificationPermission()}>{t("settings.notifications")} <AppIcon name="chevronRight" size={18} /></button>}
      </section>

      <section className="settings-card">
        <div className="settings-section-heading"><h2>{t("settings.about")}</h2></div>
        <div className="settings-row-static"><strong>{t("settings.version")}</strong><span>1.4.0</span></div>
        <button className="settings-row-button" type="button" aria-expanded={changelogOpen} aria-controls="settings-changelog" onClick={() => setChangelogOpen((open) => !open)}>
          {t("settings.changelog")} <AppIcon name={changelogOpen ? "chevronUp" : "chevronDown"} size={18} />
        </button>
        {changelogOpen && <div className="settings-changelog" id="settings-changelog">
          <div className="settings-changelog-version"><strong>1.4.0</strong><span>{t("settings.changelog.latest")}</span></div>
          <ul>{CHANGELOG_140.map((item) => <li key={item}>{t(item)}</li>)}</ul>
        </div>}
      </section>
      {confirmClear && <Modal title={t("settings.clearLocal")} onClose={() => setConfirmClear(false)} actions={<><button className="button-soft" type="button" onClick={() => setConfirmClear(false)}>{t("settings.cancel")}</button><button className="danger-button" type="button" onClick={clearLocalData}>{t("settings.confirm")}</button></>}><p>{t("settings.clearConfirm")}</p></Modal>}
      {confirmDelete && <Modal title={t("settings.deleteAccount")} onClose={() => { setConfirmDelete(false); setDeleteName(""); }} actions={<><button className="button-soft" type="button" onClick={() => setConfirmDelete(false)}>{t("settings.cancel")}</button><button className="danger-button" type="button" onClick={() => void deleteAccount()}>{t("settings.confirm")}</button></>}><p>{t("settings.deleteConfirm")}</p><input className="text-input" value={deleteName} onChange={(event) => setDeleteName(event.target.value)} placeholder={nickname} /></Modal>}
      {error && <p className="settings-feedback" role="alert">{t("settings.loadFailed")}</p>}
      {feedback && <p className="settings-feedback" role="status">{t(feedback)}</p>}
      {user && <button className="logout-button" type="button" onClick={() => void handleSignOut()} disabled={loggingOut}>{loggingOut ? t("settings.signingOut") : t("settings.logout")}</button>}
    </PageShell>
  );
}
