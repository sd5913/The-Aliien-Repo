import { AppIcon } from "../../../components/ui/AppIcon";
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
    <PageShell title="个人" showHeaderTitle headerAction={<Link className="settings-nav-button" to="/settings/preferences" aria-label="设置"><AppIcon name="setting" size={23} /></Link>}>
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
