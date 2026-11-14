import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { useUserSettings } from "../hooks/useUserSettings";
import { MyPollsSection } from "../../polls/pages/MyPollsPage";

export function SettingsPage() {
  const { settings, error } = useUserSettings();
  const location = useLocation();
  const pollsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.hash === "#my-polls") {
      pollsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <PageShell title="个人" showHeaderTitle headerAction={<Link className="settings-nav-button" to="/settings/preferences" aria-label="设置"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.1 3.5a8.6 8.6 0 0 0-.1-1.3l1.5-1.2-1.5-2.6-1.9.7a8.7 8.7 0 0 0-2.2-1.3L15.6 4h-3.1l-.3 2.3A8.7 8.7 0 0 0 10 7.6l-1.9-.7-1.5 2.6 1.5 1.2a8.6 8.6 0 0 0 0 2.6l-1.5 1.2 1.5 2.6 1.9-.7a8.7 8.7 0 0 0 2.2 1.3l.3 2.3h3.1l.3-2.3a8.7 8.7 0 0 0 2.2-1.3l1.9.7 1.5-2.6-1.5-1.2a8.6 8.6 0 0 0 .1-1.3Z" /></svg></Link>}>
      <section className="settings-profile-intro">
        <div className="settings-section-heading"></div>
        {error && <p className="settings-feedback" role="alert">个人资料加载失败，请检查 Supabase 配置后重试。</p>}
        <div className="profile-summary">
          <div className="profile-avatar" aria-label={`当前头像 ${settings.avatar}`}>{settings.avatar}</div>
          <div className="profile-summary-copy"><strong>{settings.nickname}</strong><span>{settings.email}</span></div>
        </div>
      </section>
      <div ref={pollsRef} id="my-polls" style={{ scrollMarginTop: 80 }}>
        <MyPollsSection showCreateButton={false} personalPageStyle />
      </div>
    </PageShell>
  );
}
