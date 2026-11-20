import { AppIcon } from "../../../components/ui/AppIcon";
import { useEffect, useRef } from "react";
import { useAccount } from "../../auth/components/AccountProvider";
import { Link, useLocation } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { useUserSettings } from "../hooks/useUserSettings";
import { MyPollsSection } from "../../polls/pages/MyPollsPage";
import { useParticipant } from "../../auth/utils/useParticipant";

export function SettingsPage() {
  const { settings, error } = useUserSettings();
  const participant = useParticipant();
  const auth = useAccount();
  const location = useLocation();
  const pollsRef = useRef<HTMLDivElement>(null);

  const user = auth.user;
  const hasMatchingProfile = Boolean(user?.email && settings.email.toLowerCase() === user.email.toLowerCase());
  const metadataNickname = typeof user?.user_metadata.nickname === "string" ? user.user_metadata.nickname.trim() : "";
  const nickname = hasMatchingProfile ? settings.nickname : metadataNickname || user?.email?.split("@")[0] || "已登录";
  const avatar = hasMatchingProfile ? settings.avatar : typeof user?.user_metadata.avatar === "string" ? user.user_metadata.avatar : nickname.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (location.hash === "#my-polls") {
      pollsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <PageShell title="个人" showHeaderTitle headerAction={<Link className="settings-nav-button" to="/settings/preferences" aria-label="设置"><AppIcon name="setting" size={23} /></Link>}>
      <section className="settings-profile-intro">
        <div className="settings-section-heading"></div>
        {user && error && <p className="settings-feedback" role="alert">个人资料加载失败，请稍后重试。</p>}
        {auth.loading ? (
          <div className="profile-summary" role="status"><div className="profile-avatar profile-avatar-empty" aria-hidden="true"><AppIcon name="my" size={28} /></div><div className="profile-summary-copy"><span>正在确认登录状态…</span></div></div>
        ) : user ? (
          <div className="profile-summary">
            <div className="profile-avatar" aria-label={`当前头像 ${avatar}`}>{avatar}</div>
            <div className="profile-summary-copy"><strong>{nickname}</strong><span>{user.email ?? ""}</span></div>
          </div>
        ) : participant ? (
          <div className="profile-summary">
            <div className="profile-avatar" aria-label="投票者头像">{participant.avatar}</div>
            <div className="profile-summary-copy"><strong>{participant.nickname}</strong><span>投票者身份 · 已保存在当前浏览器</span></div>
          </div>
        ) : (
          <div className="profile-summary profile-summary-empty">
            <div className="profile-avatar profile-avatar-empty" aria-hidden="true"><AppIcon name="my" size={28} /></div>
            <div className="profile-summary-copy"><strong>未登录</strong><span>登录后查看个人信息</span></div>
            <Link className="profile-login-link" to="/auth?returnTo=%2Fsettings">登录 / 注册</Link>
          </div>
        )}
      </section>
      <div ref={pollsRef} id="my-polls" style={{ scrollMarginTop: 80 }}>
        <MyPollsSection showCreateButton={false} personalPageStyle />
      </div>
    </PageShell>
  );
}
