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
import { signInWithApple, signInWithGitHub, signInWithGoogle } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase/client";
import { AppIcon } from "../../../components/ui/AppIcon";
import packageJson from "../../../../package.json";
import type { Locale } from "../../../i18n/locale";
import { profileDraftFromUser } from "../utils/profile";

interface ChangelogEntry {
  version: string;
  text: Record<Locale, string>;
}

function isChangelogEntries(value: unknown): value is ChangelogEntry[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const record = entry as Record<string, unknown>;
    const text = record.text;
    if (typeof record.version !== "string" || !text || typeof text !== "object") return false;
    const localized = text as Record<string, unknown>;
    return ["en-US", "zh-CN", "ko-KR"].every((locale) => typeof localized[locale] === "string");
  });
}

type ProviderId = "google" | "github" | "apple";

const BINDING_PROVIDERS: { id: ProviderId; label: string; icon: ProviderId }[] = [
  { id: "google", label: "Google", icon: "google" },
  { id: "github", label: "GitHub", icon: "github" },
  { id: "apple", label: "Apple", icon: "apple" },
];

function ProviderRow({ service, icon, status, bound = false, action, onAction }: {
  service: string;
  icon: ProviderId;
  status: string;
  bound?: boolean;
  action?: string;
  onAction?: () => void;
}) {
  const content = (
    <>
      <span className="settings-tile"><AppIcon name={icon} size={20} /></span>
      <span className="settings-row-label">{service}</span>
      <span className={`settings-pill${bound ? " is-bound" : ""}`}>{status}</span>
    </>
  );
  if (action && onAction) {
    return <button className="settings-row settings-provider-row" type="button" aria-label={`${action} · ${service}`} onClick={onAction}>{content}</button>;
  }
  return <div className="settings-row settings-provider-row">{content}</div>;
}

export function SettingsPreferencesPage() {
  const { t, locale } = useLocale();
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
  const [version, setVersion] = useState(packageJson.version);
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[] | null>(null);

  useEffect(() => {
    if (user) setNickname(profileDraftFromUser(user).nickname || settings.nickname);
  }, [user, settings.nickname]);

  useEffect(() => {
    let active = true;
    void fetch(`${import.meta.env.BASE_URL}changelog.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Changelog request failed with status ${response.status}.`);
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("entries" in payload) || !isChangelogEntries(payload.entries)) {
          throw new Error("Changelog data is invalid.");
        }
        if (active) {
          setChangelogEntries(payload.entries);
          setVersion(payload.entries[0].version);
        }
      })
      .catch((cause: unknown) => {
        console.error("Could not load changelog.", cause);
        if (active) setChangelogEntries(null);
      });
    return () => { active = false; };
  }, []);

  const identities = user?.identities?.map((identity) => identity.provider) ?? [];
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const bindingStatus = (provider: ProviderId) => {
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

  const bind = async (provider: ProviderId) => {
    setFeedback("");
    const returnTo = "/settings/preferences";
    const result = provider === "google"
      ? await signInWithGoogle(returnTo)
      : provider === "github"
        ? await signInWithGitHub(returnTo)
        : await signInWithApple(returnTo);
    if (result.error) setFeedback("settings.bindFailed");
  };

  return (
    <PageShell title={t("settings.title")} showHeaderTitle backTo="/settings" showNavigation={false}>
      <div className="settings-v2">
        <section className="settings-group">
          <h2 className="settings-group-title">{t("settings.account")}</h2>
          {user && (
            <div className="settings-block">
              <button className="settings-row" type="button" onClick={() => navigate("/edit-profile?from=settings")}>
                <span className="settings-tile"><AppIcon name="person" size={20} /></span>
                <span className="settings-row-label">{t("settings.profile")}</span>
                <span className="settings-chevron"><AppIcon name="chevronRight" size={18} /></span>
              </button>
            </div>
          )}
          <div className="settings-block">
            <div className="settings-row settings-row-head">
              <span className="settings-tile"><AppIcon name="key" size={20} /></span>
              <span className="settings-row-label">{t("settings.binding")}</span>
            </div>
            {BINDING_PROVIDERS.map((provider) => (
              <ProviderRow
                key={provider.id}
                service={provider.label}
                icon={provider.icon}
                status={bindingStatus(provider.id)}
                bound={Boolean(user && identities.includes(provider.id))}
                action={bindingAction}
                onAction={user ? undefined : () => void bind(provider.id)}
              />
            ))}
          </div>
          <div className="settings-block">
            {user ? (
              <button className="settings-row settings-row-danger" type="button" onClick={() => setConfirmDelete(true)}>
                <span className="settings-tile"><AppIcon name="binAlert" size={20} /></span>
                <span className="settings-row-label">{t("settings.deleteAccount")}</span>
              </button>
            ) : (
              <button className="settings-row settings-row-danger" type="button" onClick={() => setConfirmClear(true)}>
                <span className="settings-tile"><AppIcon name="binAlert" size={20} /></span>
                <span className="settings-row-label">{t("settings.clearLocal")}</span>
              </button>
            )}
          </div>
        </section>

        <section className="settings-group">
          <h2 className="settings-group-title">{t("settings.general")}</h2>
          <div className="settings-row settings-row-select">
            <span className="settings-tile"><AppIcon name="globe" size={20} /></span>
            <span className="settings-row-label">{t("app.language")}</span>
            <LanguageSelect />
          </div>
          {isIOS && (
            <button className="settings-row" type="button" onClick={() => void requestNotificationPermission()}>
              <span className="settings-tile"><AppIcon name="bell" size={20} /></span>
              <span className="settings-row-label">{t("settings.notifications")}</span>
              <span className="settings-chevron"><AppIcon name="chevronRight" size={18} /></span>
            </button>
          )}
        </section>

        <section className="settings-group">
          <h2 className="settings-group-title">{t("settings.about")}</h2>
          <div className="settings-row settings-row-static">
            <span className="settings-tile"><AppIcon name="version" size={20} /></span>
            <span className="settings-row-label">{t("settings.version")}</span>
            <span className="settings-version">{version}</span>
          </div>
          {changelogEntries && <>
            <button className="settings-row" type="button" aria-expanded={changelogOpen} aria-controls="settings-changelog" onClick={() => setChangelogOpen((open) => !open)}>
              <span className="settings-tile"><AppIcon name="changelog" size={20} /></span>
              <span className="settings-row-label">{t("settings.changelog")}</span>
              <span className="settings-chevron"><AppIcon name={changelogOpen ? "chevronUp" : "chevronDown"} size={18} /></span>
            </button>
            {changelogOpen && <div className="settings-changelog" id="settings-changelog">
              {changelogEntries.map((entry, index) => <div className="settings-changelog-version" key={entry.version}>
                <strong>{entry.version}</strong>{index === 0 && <span>{t("settings.changelog.latest")}</span>}
                <p>{entry.text[locale]}</p>
              </div>)}
            </div>}
          </>}
        </section>

        {error && <p className="settings-feedback" role="alert">{t("settings.loadFailed")}</p>}
        {feedback && <p className="settings-feedback" role="status">{t(feedback)}</p>}
        {user && <button className="logout-button" type="button" onClick={() => void handleSignOut()} disabled={loggingOut}>{loggingOut ? t("settings.signingOut") : t("settings.logout")}</button>}
      </div>
      {confirmClear && <Modal title={t("settings.clearLocal")} onClose={() => setConfirmClear(false)} actions={<><button className="button-soft" type="button" onClick={() => setConfirmClear(false)}>{t("settings.cancel")}</button><button className="danger-button" type="button" onClick={clearLocalData}>{t("settings.confirm")}</button></>}><p>{t("settings.clearConfirm")}</p></Modal>}
      {confirmDelete && <Modal title={t("settings.deleteAccount")} onClose={() => { setConfirmDelete(false); setDeleteName(""); }} actions={<><button className="button-soft" type="button" onClick={() => setConfirmDelete(false)}>{t("settings.cancel")}</button><button className="danger-button" type="button" onClick={() => void deleteAccount()}>{t("settings.confirm")}</button></>}><p>{t("settings.deleteConfirm")}</p><input className="text-input" value={deleteName} onChange={(event) => setDeleteName(event.target.value)} placeholder={nickname} /></Modal>}
    </PageShell>
  );
}
