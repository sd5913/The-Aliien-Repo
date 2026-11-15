import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase/client";
import { PageShell } from "../../../components/layout/PageShell";
import {
  signInWithPassword,
  signInWithSocialProvider,
  signUpWithPassword,
  type SocialProvider,
} from "../services/auth";

type AuthMode = "login" | "register";

const providerLabels: Record<SocialProvider, string> = {
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "邮箱或密码不正确。";
  if (normalized.includes("user already registered")) return "这个邮箱已经注册过了，请直接登录。";
  if (normalized.includes("password should be at least")) return "密码至少需要 6 位。";
  if (normalized.includes("email not confirmed")) return "邮箱还没有完成验证，请先查看收件箱。";
  if (normalized.includes("provider is not enabled")) return "该登录方式尚未在 Supabase 中启用。";
  return "操作失败，请检查输入或稍后重试。";
}

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate("/", { replace: true });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/", { replace: true });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    const cleanEmail = email.trim();
    const cleanNickname = nickname.trim();
    if (!cleanEmail || !password || (mode === "register" && !cleanNickname)) {
      setFeedback(mode === "register" ? "请填写昵称、邮箱和密码。" : "请填写邮箱和密码。");
      return;
    }
    setLoading(true);
    try {
      const result = mode === "login"
        ? await signInWithPassword(cleanEmail, password)
        : await signUpWithPassword(cleanEmail, password, cleanNickname);
      if (result.error) throw result.error;
      if (mode === "register" && !result.data.session) {
        setFeedback("注册成功！请先查收验证邮件，再回来登录。邮箱验证可在 Supabase Auth 设置中关闭。 ");
      }
    } catch (error) {
      setFeedback(getAuthErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  };

  const continueWithProvider = async (provider: SocialProvider) => {
    setFeedback("");
    setBusyProvider(provider);
    const { error } = await signInWithSocialProvider(provider);
    if (error) setFeedback(getAuthErrorMessage(error.message));
    setBusyProvider(null);
  };

  return (
    <PageShell showNavigation={false} headerAction={<Link className="auth-back-home" to="/">先逛逛</Link>}>
      <section className="auth-page">
        <div className="auth-hero" aria-hidden="true"><span>✦</span><i>♡</i><b>✧</b></div>
        <span className="eyebrow">WELCOME TO BOTHPLS</span>
        <h1>{mode === "login" ? "欢迎回来！" : "加入 BothPls"}</h1>
        <p className="auth-subtitle">{mode === "login" ? "登录后继续和朋友一起做决定。" : "注册一个账号，把每次选择都变得更轻松。"}</p>

        <div className="auth-tabs" role="tablist" aria-label="登录或注册">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setFeedback(""); }}>登录</button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setFeedback(""); }}>注册</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && <><label className="field-label" htmlFor="auth-nickname">昵称</label><input id="auth-nickname" className="text-input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} placeholder="朋友们会这样称呼你" autoComplete="nickname" /></>}
          <label className="field-label" htmlFor="auth-email">邮箱</label>
          <input id="auth-email" className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" />
          <label className="field-label" htmlFor="auth-password">密码</label>
          <input id="auth-password" className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} placeholder="至少 6 位字符" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          <button className="purple-button button-full auth-submit" type="submit" disabled={loading}>{loading ? "处理中…" : mode === "login" ? "登录 BothPls" : "创建账号"}</button>
        </form>

        <div className="auth-divider"><span>或者使用</span></div>
        <div className="social-login-grid">{(Object.keys(providerLabels) as SocialProvider[]).map((provider) => <button type="button" className="social-login-button" key={provider} disabled={loading || busyProvider !== null} onClick={() => continueWithProvider(provider)}><span className={`social-mark social-${provider}`} aria-hidden="true">{provider === "google" ? "G" : provider === "apple" ? "●" : "⌘"}</span>{busyProvider === provider ? "跳转中…" : providerLabels[provider]}</button>)}</div>
        {feedback && <p className="auth-feedback" role="status">{feedback}</p>}
        <p className="auth-legal">继续使用即表示你同意 BothPls 的使用规则。参与朋友投票无需登录。</p>
      </section>
    </PageShell>
  );
}

