import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { Link } from "react-router-dom";
import { useAccount } from "../../auth/components/AccountProvider";
import { useParticipant } from "../../auth/utils/useParticipant";
import { PARTICIPANT_AVATARS } from "../../auth/utils/participant";
import { useEffect, useState } from "react";
import { useUserSettings } from "../hooks/useUserSettings";
import type { UserSettings } from "../services/settings";

const avatars = ["🌷", "🐰", "🧸", "🍑", "🐱", "☁️"];

export function ProfileSettingsSection() {
  const { t } = useLocale();
  const { settings, loading, error, save } = useUserSettings();
  const { user } = useAccount();
  const participant = useParticipant();
  const choices = user ? avatars : PARTICIPANT_AVATARS;
  const disabled = loading || Boolean(error);
  const [draft, setDraft] = useState({ nickname: settings.nickname, email: settings.email, avatar: settings.avatar });
  const [feedback, setFeedback] = useState<MessageKey | "">("");

  useEffect(() => {
    setDraft({ nickname: settings.nickname, email: settings.email, avatar: settings.avatar });
  }, [settings]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nickname = draft.nickname.trim();
    const email = draft.email.trim();
    if (!nickname || (user && !email)) {
      setFeedback("profile.needDetails");
      return;
    }

    if (!user && Array.from(nickname).length > 12) { setFeedback("profile.nicknameTooLong"); return; }
    const next: UserSettings = { ...settings, nickname, email, avatar: draft.avatar };
    try {
      await save(next);
      setFeedback("profile.saved");
    } catch (error) {
      console.error("BothPls: could not save user settings.", error);
      setFeedback("settings.saveFailed");
    }
  };

  if (!user && !participant) return <section className="settings-card"><h2>{t("profile.heading")}</h2><p>{t("profile.signedOut")}</p><Link className="button-soft" to="/auth?returnTo=%2Fsettings">{t("auth.loginRegister")}</Link></section>;

  return (
    <section className="settings-card profile-card">
      <div className="settings-section-heading"><div><h2>{t("profile.heading")}</h2></div></div>
      <form className="profile-form profile-edit-card" onSubmit={saveProfile}>
        <div className="avatar-picker-row">
          <div className="profile-avatar" aria-label={t("profile.currentAvatar", { avatar: draft.avatar })}>{draft.avatar}</div>
          <div className="avatar-picker-copy"><strong>{t("profile.chooseAvatar")}</strong><span>{t("profile.avatarHint")}</span></div>
        </div>
        <div className="avatar-options" role="group" aria-label={t("profile.chooseAvatar")}>{choices.map((avatar) => <button disabled={disabled} key={avatar} type="button" className={`avatar-option${draft.avatar === avatar ? " selected" : ""}`} aria-label={t("profile.avatarOption", { avatar })} aria-pressed={draft.avatar === avatar} onClick={() => setDraft((current) => ({ ...current, avatar }))}>{avatar}</button>)}</div>
        <label className="field-label" htmlFor="settings-nickname">{t("common.nickname")}</label>
        <input disabled={disabled} id="settings-nickname" className="text-input" value={draft.nickname} maxLength={user ? 24 : 12} onChange={(event) => setDraft((current) => ({ ...current, nickname: event.target.value }))} placeholder={t("profile.nicknameHint")} />
        {user && <><label className="field-label" htmlFor="settings-email">{t("profile.emailLabel")}</label>
        <input disabled id="settings-email" className="text-input" type="email" value={draft.email} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" /></>}
        <button disabled={disabled} className="purple-button button-full" type="submit">{t("profile.save")}</button>
      </form>
      {error && <p className="settings-feedback" role="alert">{t("profile.loadFailed")}</p>}
      {feedback && <p className="settings-feedback" role="status">{t(feedback, { count: 12 })}</p>}
    </section>
  );
}
