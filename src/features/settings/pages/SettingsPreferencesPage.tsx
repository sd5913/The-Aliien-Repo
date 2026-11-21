import { useLocale } from "../../../i18n/LocaleProvider";
import { LanguageSelect } from "../../../i18n/LanguageSelect";
import type { MessageKey } from "../../../i18n/catalog";
import { useAccount } from "../../auth/components/AccountProvider";
import { useParticipant } from "../../auth/utils/useParticipant";
import { clearParticipant } from "../../auth/utils/participant";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { signOut } from "../../auth/services/auth";
import { useUserSettings } from "../hooks/useUserSettings";
import { getLocale, setLocale, t } from "../../../lib/i18n";
import { Modal } from "../../../components/ui/Modal";
import { signInWithApple, signInWithGitHub } from "../../auth/services/auth";
import { fetchProfile } from "../services/profiles";
import { supabase } from "../../../lib/supabase/client";
import { AppIcon } from "../../../components/ui/AppIcon";

export function SettingsPreferencesPage() {
  const { settings, error } = useUserSettings();
  const navigate = useNavigate();
  const { user } = useAccount();
  const participant = useParticipant();
  const [feedback, setFeedback] = useState<MessageKey | "">("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [nickname, setNickname] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [changelog, setChangelog] = useState<string[]>([]);
  const locale = getLocale();

  useEffect(() => {
    if (!user) return;
    void fetchProfile(user.id).then((profile) => setNickname(profile?.nickname || settings.nickname)).catch(() => setNickname(settings.nickname));
  }, [user, settings.nickname]);

  const identities = user?.identities?.map((identity) => identity.provider) ?? [];
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

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
      setFeedback("昵称不匹配，未注销账号。");
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
      setFeedback("注销账号失败，请稍后重试。");
    }
  };

  const openChangelog = async () => {
    setChangelogOpen(true);
    try {
      const response = await fetch("/changelog.json", { cache: "no-store" });
      if (!response.ok) throw new Error("changelog unavailable");
      const data = await response.json() as { entries?: Array<{ version?: string; text?: string }> };
      setChangelog((data.entries ?? []).filter((entry) => entry.version && entry.text).map((entry) => `${entry.version} · ${entry.text}`));
    } catch {
      setChangelog([]);
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
    if (result.error) setFeedback("绑定授权失败，请重试。");
  };

  return (
    <PageShell title={t("settings.title")} showHeaderTitle backTo="/settings" showNavigation={false}>
      <section className="settings-card">
        <div className="settings-section-heading"><h2>{t("settings.account")}</h2></div>
        {!user && !participant && (
          <><button className="settings-row-button" type="button" onClick={() => void bind("github")}>GitHub 登录</button><button className="settings-row-button" type="button" onClick={() => void bind("apple")}>Apple 登录</button></>
        )}
        {user && <>
          <button className="settings-row-button" type="button" onClick={() => navigate("/edit-profile")}>{t("settings.profile")} <AppIcon name="chevronRight" size={18} /></button>
          <div className="settings-row-static"><strong>{t("settings.binding")}</strong><span>{identities.length ? `${t("settings.binding.current")}：${identities.join(" / ")}` : t("settings.binding.current")}</span></div>
          <button className="settings-row-button danger-text" type="button" onClick={() => setConfirmDelete(true)}>{t("settings.deleteAccount")}</button>
        </>}
        {participant && !user && <>
          <button className="settings-row-button" type="button" onClick={() => navigate("/edit-profile")}>{t("settings.profile")} <AppIcon name="chevronRight" size={18} /></button>
          <div className="settings-row-static"><strong>{t("settings.binding")}</strong><span>软登录</span></div>
          <button className="settings-row-button" type="button" onClick={() => void bind("github")}>GitHub · {t("settings.binding.upgrade")}</button>
          <button className="settings-row-button" type="button" onClick={() => void bind("apple")}>Apple · {t("settings.binding.upgrade")}</button>
          <button className="settings-row-button" type="button" onClick={() => setConfirmClear(true)}>{t("settings.clearLocal")}</button>
        </>}
        {!user && !participant && <button className="settings-row-button" type="button" onClick={() => setConfirmClear(true)}>{t("settings.clearLocal")}</button>}
      </section>

      <section className="settings-card">
        <div className="settings-section-heading"><h2>{t("settings.general")}</h2></div>
        <button className="settings-row-button" type="button" onClick={() => setLanguageOpen(true)}><strong>{t("settings.language")}</strong><span>{locale === "zh-CN" ? "中文" : "English"} <AppIcon name="chevronRight" size={18} /></span></button>
        {isIOS && <button className="settings-row-button" type="button" onClick={() => void requestNotificationPermission()}>{t("settings.notifications")} <AppIcon name="chevronRight" size={18} /></button>}
      </section>

      <section className="settings-card">
        <div className="settings-section-heading"><h2>{t("settings.about")}</h2></div>
        <div className="settings-row-static"><strong>{t("settings.version")}</strong><span>1.4.0</span></div>
        <button className="settings-row-button" type="button" onClick={() => void openChangelog()}>{t("settings.changelog")} <AppIcon name="chevronRight" size={18} /></button>
      </section>
      {confirmClear && <Modal title={t("settings.clearLocal")} onClose={() => setConfirmClear(false)} actions={<><button className="button-soft" type="button" onClick={() => setConfirmClear(false)}>{t("settings.cancel")}</button><button className="danger-button" type="button" onClick={clearLocalData}>{t("settings.confirm")}</button></>}><p>{t("settings.clearConfirm")}</p></Modal>}
      {languageOpen && <Modal title={t("settings.language")} onClose={() => setLanguageOpen(false)}><div className="language-options" role="radiogroup" aria-label={t("settings.language")}><button className={`settings-row-button${locale === "zh-CN" ? " language-selected" : ""}`} type="button" role="radio" aria-checked={locale === "zh-CN"} onClick={() => setLocale("zh-CN")}>中文（简体）<span>{locale === "zh-CN" ? "✓" : ""}</span></button><button className={`settings-row-button${locale === "en-US" ? " language-selected" : ""}`} type="button" role="radio" aria-checked={locale === "en-US"} onClick={() => setLocale("en-US")}>English<span>{locale === "en-US" ? "✓" : ""}</span></button></div></Modal>}
      {confirmDelete && <Modal title={t("settings.deleteAccount")} onClose={() => { setConfirmDelete(false); setDeleteName(""); }} actions={<><button className="button-soft" type="button" onClick={() => setConfirmDelete(false)}>{t("settings.cancel")}</button><button className="danger-button" type="button" onClick={() => void deleteAccount()}>{t("settings.confirm")}</button></>}><p>{t("settings.deleteConfirm")}</p><input className="text-input" value={deleteName} onChange={(event) => setDeleteName(event.target.value)} placeholder={nickname} /></Modal>}
      {changelogOpen && <Modal title={t("settings.changelog")} onClose={() => setChangelogOpen(false)} actions={<button className="button-soft" type="button" onClick={() => setChangelogOpen(false)}>{t("settings.confirm")}</button>}><strong>1.4.0</strong>{changelog.length > 0 ? <ul>{changelog.map((item) => <li key={item}>{item}</li>)}</ul> : <p>暂无更新说明</p>}</Modal>}
      {error && <p className="settings-feedback" role="alert">设置加载失败，请检查 Supabase 配置后重试。</p>}
      {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
      {user && <button className="logout-button" type="button" onClick={() => void handleSignOut()} disabled={loggingOut}>{loggingOut ? "正在退出…" : t("settings.logout")}</button>}
    </PageShell>
  );
}
