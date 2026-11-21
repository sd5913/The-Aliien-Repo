import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getRandomNickname } from "../../polls/utils/voting";
import { PARTICIPANT_AVATARS, readParticipant, saveParticipant } from "../utils/participant";
import "./ParticipantLoginPage.css";

function DiceIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />{[[8,8],[16,8],[12,12],[8,16],[16,16]].map(([cx,cy]) => <circle key={cx + "-" + cy} cx={cx} cy={cy} r="1.4" fill="currentColor" />)}</svg>;
}

export function ParticipantGate({ children }: { children: ReactNode }) {
  const { id = "" } = useParams();
  const location = useLocation();
  if (!readParticipant()) {
    return <Navigate replace to={`/poll/${encodeURIComponent(id)}/join${location.search}${location.hash}`} />;
  }
  return <>{children}</>;
}

export function ParticipantLoginPage() {
  const { t, number } = useLocale();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [saved] = useState(readParticipant);
  const [nickname, setNickname] = useState(saved?.nickname ?? "");
  const [avatarIndex, setAvatarIndex] = useState(() => Math.max(0, PARTICIPANT_AVATARS.findIndex(item => item === saved?.avatar)));
  const [error, setError] = useState<MessageKey | "">("");
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState<{ nickname: string } | "avatar" | null>(null);
  const nicknameRange = `${number(2)}–${number(12)}`;
  const avatar = PARTICIPANT_AVATARS[avatarIndex];
  const target = id ? `/poll/${encodeURIComponent(id)}${location.search}${location.hash}` : "/";

  const randomNickname = () => {
    const next = getRandomNickname(t, nickname);
    setNickname(next);
    setError("");
    setAnnouncement({ nickname: next });
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const length = Array.from(nickname.trim()).length;
    if (length < 2 || length > 12) {
      setError("guest.invalidNickname");
      return;
    }
    try {
      setSaving(true);
      await saveParticipant(nickname, avatar);
      navigate(target, { replace: true, state: location.state });
    } catch {
      setError("guest.identityFailed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="participant-page">
      <header className="participant-brand">
        <Link to="/" aria-label={t("nav.brandHome")}><span className="participant-chat" aria-hidden="true"><i /><i /></span><strong>BothPls</strong></Link>
        <p>{t("guest.tagline")}</p>
      </header>
      <form className="participant-form" onSubmit={submit} noValidate>
        <section className="participant-ticket" aria-labelledby="participant-title">
          <h1 id="participant-title">{t("guest.heading")}</h1>
          <p className="participant-subtitle">{t("guest.intro")}</p>
          <div className="participant-avatar-row">
            <span className="participant-label">{t("guest.avatar")}</span>
            <div className="participant-avatar" role="img" aria-label={t("profile.currentAvatar", { avatar })} key={avatar}><span>{avatar}</span><b aria-hidden="true">✦</b></div>
            <button className="participant-dice" type="button" onClick={() => { setAvatarIndex(current => (current + 1 + Math.floor(Math.random() * (PARTICIPANT_AVATARS.length - 1))) % PARTICIPANT_AVATARS.length); setAnnouncement("avatar"); }}><DiceIcon /><span>{t("guest.randomAvatar")}</span></button>
          </div>
          <label className="participant-label" htmlFor="participant-nickname">{t("common.nickname")}</label>
          <div className="participant-nickname-row">
            <div className="participant-input-wrap"><svg width="21" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M4 22v-3a8 8 0 0 1 16 0v3" stroke="currentColor" strokeWidth="1.6"/></svg><input id="participant-nickname" value={nickname} onChange={event => { setNickname(event.target.value); setError(""); }} placeholder={t("guest.nicknameHint", { range: nicknameRange })} autoComplete="nickname" required aria-invalid={!!error} aria-describedby={error ? "participant-error participant-hint" : "participant-hint"} /></div>
            <button className="participant-dice" type="button" onClick={randomNickname}><DiceIcon /><span>{t("guest.randomNickname")}</span></button>
          </div>
          {error && <p id="participant-error" className="participant-error" role="alert">{t(error, { range: nicknameRange })}</p>}
        </section>
        <button className="participant-submit" type="submit" disabled={saving}>{saving ? t("guest.joining") : t("guest.join")}</button>
        <p className="participant-hint" id="participant-hint">{t("guest.remembered")}</p>
        <span className="participant-sr-only" role="status" aria-live="polite">{announcement === "avatar" ? t("guest.avatarChanged") : announcement && t("guest.nicknameGenerated", { name: announcement.nickname })}</span>
      </form>
      <div className="participant-landscape" aria-hidden="true"><i /><i /><div /></div>
    </main>
  );
}
