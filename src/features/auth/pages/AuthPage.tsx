import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase/client";
import { PageShell } from "../../../components/layout/PageShell";
import { sendMagicLink } from "../services/auth";

type AuthMode = "login" | "register";

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("email rate limit") || normalized.includes("rate limit")) return "登录链接发送太频繁，请稍等一会儿再试。";
  if (normalized.includes("email not authorized")) return "当前邮箱还没有加入 Supabase 项目团队，暂时无法接收测试邮件。";
  return "登录链接发送失败，请检查邮箱或稍后重试。";
}

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: AuthMode = searchParams.get("mode") === "register" ? "register" : "login";
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/";
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate(returnTo, { replace: true });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate(returnTo, { replace: true });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate, returnTo]);

  const switchMode = (nextMode: AuthMode) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextMode === "register") nextParams.set("mode", "register");
    else nextParams.delete("mode");
    setSearchParams(nextParams);
    setFeedback("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    const cleanNickname = nickname.trim();
    if (!cleanEmail || (mode === "register" && !cleanNickname)) {
      setFeedback(mode === "register" ? "请填写昵称和邮箱。" : "请填写邮箱。");
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const result = await sendMagicLink(cleanEmail, mode === "register" ? cleanNickname : undefined);
      if (result.error) throw result.error;
      setFeedback("登录链接已发送，请打开邮箱并点击邮件中的链接。链接只能使用一次，有效期为一小时。 ");
    } catch (error) {
      setFeedback(getAuthErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell showNavigation={false} headerAction={<Link className="auth-back-home" to={returnTo}>先逛逛</Link>}>
      <section className="auth-page">
        <div className="auth-hero" aria-hidden="true"><span>✦</span><i>♡</i><b>✧</b></div>
        <span className="eyebrow">WELCOME TO BOTHPLS</span>
        <h1>{mode === "login" ? "欢迎回来！" : "加入 BothPls"}</h1>
        <p className="auth-subtitle">{mode === "login" ? "打开邮箱中的登录链接，继续和朋友一起做决定。" : "注册一个账号，把每次选择都变得更轻松。"}</p>

        <div className="auth-tabs" role="tablist" aria-label="登录或注册">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>注册</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && <><label className="field-label" htmlFor="auth-nickname">昵称</label><input id="auth-nickname" className="text-input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} placeholder="朋友们会这样称呼你" autoComplete="nickname" /></>}
          <label className="field-label" htmlFor="auth-email">邮箱</label>
          <input id="auth-email" className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" autoComplete="email" />
          <button className="purple-button button-full auth-submit" type="submit" disabled={loading}>{loading ? "发送中…" : "发送登录链接"}</button>
        </form>

        {feedback && <p className="auth-feedback" role="status">{feedback}</p>}
        <p className="auth-legal">我们会向你的邮箱发送一次性登录链接，不需要设置密码。参与朋友投票无需登录。</p>
      </section>
    </PageShell>
  );
}
