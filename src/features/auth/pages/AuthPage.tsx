import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase/client";
import { PageShell } from "../../../components/layout/PageShell";
import { sendEmailOtp, verifyEmailOtp } from "../services/auth";

type AuthMode = "login" | "register";
type AuthStep = "email" | "code";

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid or expired otp") || normalized.includes("otp_expired")) return "验证码无效或已过期，请重新获取。";
  if (normalized.includes("email rate limit") || normalized.includes("rate limit")) return "验证码发送太频繁，请稍等一会儿再试。";
  if (normalized.includes("email not confirmed")) return "邮箱还没有完成验证，请先查看收件箱。";
  return "操作失败，请检查邮箱或稍后重试。";
}

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: AuthMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
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

  const switchMode = (nextMode: AuthMode) => {
    setSearchParams(nextMode === "register" ? { mode: "register" } : {});
    setStep("email");
    setCode("");
    setFeedback("");
  };

  const sendCode = async () => {
    const cleanEmail = email.trim();
    const cleanNickname = nickname.trim();
    if (!cleanEmail || (mode === "register" && !cleanNickname)) {
      setFeedback(mode === "register" ? "请填写昵称和邮箱。" : "请填写邮箱。");
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const result = await sendEmailOtp(cleanEmail, mode === "register" ? cleanNickname : undefined);
      if (result.error) throw result.error;
      setStep("code");
      setFeedback("验证码已发送，请查看你的邮箱。验证码有效期为一小时。 ");
    } catch (error) {
      setFeedback(getAuthErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setFeedback("请输入邮件中的六位数字验证码。");
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const result = await verifyEmailOtp(cleanEmail, cleanCode);
      if (result.error) throw result.error;
      navigate("/", { replace: true });
    } catch (error) {
      setFeedback(getAuthErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell showNavigation={false} headerAction={<Link className="auth-back-home" to="/">先逛逛</Link>}>
      <section className="auth-page">
        <div className="auth-hero" aria-hidden="true"><span>✦</span><i>♡</i><b>✧</b></div>
        <span className="eyebrow">WELCOME TO BOTHPLS</span>
        <h1>{mode === "login" ? "欢迎回来！" : "加入 BothPls"}</h1>
        <p className="auth-subtitle">{step === "email" ? "使用邮箱验证码，快速和朋友一起做决定。" : `验证码已发送到 ${email.trim()}。`}</p>

        <div className="auth-tabs" role="tablist" aria-label="登录或注册">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>注册</button>
        </div>

        {step === "email" ? (
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); void sendCode(); }}>
            {mode === "register" && <><label className="field-label" htmlFor="auth-nickname">昵称</label><input id="auth-nickname" className="text-input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} placeholder="朋友们会这样称呼你" autoComplete="nickname" /></>}
            <label className="field-label" htmlFor="auth-email">邮箱</label>
            <input id="auth-email" className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" autoComplete="email" />
            <button className="purple-button button-full auth-submit" type="submit" disabled={loading}>{loading ? "发送中…" : "发送验证码"}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={verifyCode}>
            <label className="field-label" htmlFor="auth-code">六位验证码</label>
            <input id="auth-code" className="text-input auth-code-input" type="text" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" autoFocus />
            <button className="purple-button button-full auth-submit" type="submit" disabled={loading}>{loading ? "验证中…" : "确认登录"}</button>
            <div className="auth-code-actions"><button type="button" onClick={() => { setStep("email"); setCode(""); setFeedback(""); }}>更换邮箱</button><button type="button" disabled={loading} onClick={() => { void sendCode(); }}>重新发送</button></div>
          </form>
        )}

        {feedback && <p className="auth-feedback" role="status">{feedback}</p>}
        <p className="auth-legal">我们会向你的邮箱发送一次性验证码，不需要设置密码。参与朋友投票无需登录。</p>
      </section>
    </PageShell>
  );
}
