import { AppIcon } from "../../../components/ui/AppIcon";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, useLocation } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { useUserSettings } from "../hooks/useUserSettings";
import { MyPollsSection } from "../../polls/pages/MyPollsPage";
import { supabase } from "../../../lib/supabase/client";

export function SettingsPage() {
  const { settings, error } = useUserSettings();
  const [auth, setAuth] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  const location = useLocation();
  const pollsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // INITIAL_SESSION restores the saved session; subsequent events also cover
    // signing in/out in another tab. Never show sample profile data while waiting.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth({ user: session?.user ?? null, loading: false });
    });
    return () => subscription.unsubscribe();
  }, []);

  const user = auth.user;
  const hasMatchingProfile = Boolean(user?.email && settings.email.toLowerCase() === user.email.toLowerCase());
  const metadataNickname = typeof user?.user_metadata.nickname === "string" ? user.user_metadata.nickname.trim() : "";
  const nickname = hasMatchingProfile ? settings.nickname : metadataNickname || user?.email?.split("@")[0] || "已登录";
  const avatar = hasMatchingProfile ? settings.avatar : nickname.slice(0, 1).toUpperCase();

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
