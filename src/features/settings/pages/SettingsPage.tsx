import { useLocale } from "../../../i18n/LocaleProvider";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useEffect, useRef } from "react";
import { useAccount } from "../../auth/components/AccountProvider";
import { Link, useLocation } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { useUserSettings } from "../hooks/useUserSettings";
import { MyPollsSection } from "../../polls/pages/MyPollsPage";
import { useParticipant } from "../../auth/utils/useParticipant";

export function SettingsPage() {
  const { t } = useLocale();
  const { settings, error } = useUserSettings();
  const participant = useParticipant();
  const auth = useAccount();
  const location = useLocation();
  const pollsRef = useRef<HTMLDivElement>(null);

  const user = auth.user;
  const hasMatchingProfile = Boolean(user?.email && settings.email.toLowerCase() === user.email.toLowerCase());
  const metadataNickname = typeof user?.user_metadata.nickname === "string" ? user.user_metadata.nickname.trim() : "";
  const nickname = hasMatchingProfile ? settings.nickname : metadataNickname || user?.email?.split("@")[0] || t("profile.signedIn");
  const avatar = hasMatchingProfile ? settings.avatar : typeof user?.user_metadata.avatar === "string" ? user.user_metadata.avatar : nickname.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (location.hash === "#my-polls") {
      pollsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <PageShell title={t("nav.profile")} showHeaderTitle headerAction={<Link className="settings-nav-button" to="/settings/preferences" aria-label={t("profile.settings")}><AppIcon name="setting" size={23} /></Link>}>
      <section className="settings-profile-intro">
        <div className="settings-section-heading"></div>
        {user && error && <p className="settings-feedback" role="alert">{t("profile.failed")}</p>}
        {auth.loading ? (
          <div className="profile-summary" role="status"><div className="profile-avatar profile-avatar-empty" aria-hidden="true"><AppIcon name="my" size={28} /></div><div className="profile-summary-copy"><span>{t("profile.checking")}</span></div></div>
        ) : user ? (
          <div className="profile-summary">
            <div className="profile-avatar" aria-label={t("profile.currentAvatar", { avatar })}>{avatar}</div>
            <div className="profile-summary-copy"><strong>{nickname}</strong><span>{user.email ?? ""}</span></div>
          </div>
        ) : participant ? (
          <div className="profile-summary">
            <div className="profile-avatar" aria-label={t("profile.voterAvatar")}>{participant.avatar}</div>
            <div className="profile-summary-copy"><strong>{participant.nickname}</strong><span>{t("profile.voterSaved")}</span></div>
          </div>
        ) : (
          <div className="profile-summary profile-summary-empty">
            <div className="profile-avatar profile-avatar-empty" aria-hidden="true"><AppIcon name="my" size={28} /></div>
            <div className="profile-summary-copy"><strong>{t("profile.signedOut")}</strong><span>{t("profile.signInToView")}</span></div>
            <Link className="profile-login-link" to="/auth?returnTo=%2Fsettings">{t("auth.loginRegister")}</Link>
          </div>
        )}
      </section>
      <div ref={pollsRef} id="my-polls" style={{ scrollMarginTop: 80 }}>
        <MyPollsSection showCreateButton={false} personalPageStyle />
      </div>
    </PageShell>
  );
}
