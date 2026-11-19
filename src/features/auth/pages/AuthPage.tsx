import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAccount } from "../components/AccountProvider";
import { accountReturnTo } from "../utils/navigation";
import { PageShell } from "../../../components/layout/PageShell";
import { authCallbackUrl, sendMagicLink, signInWithApple, signInWithGitHub } from "../services/auth";
import { isIosApp, publicAppOrigin } from "../../../lib/platform";
import { signInWithNativeApple } from "../services/nativeApple";
import { AppleSignInButton } from "../components/AppleSignInButton";
import { appleAuthCopy } from "../components/appleAuthCopy";

type AuthMode = "login" | "register";

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("email rate limit") || normalized.includes("rate limit")) return "登录链接发送太频繁，请稍等一会儿再试。";
  if (normalized.includes("email not authorized")) return "当前邮箱还没有加入 Supabase 项目团队，暂时无法接收测试邮件。";
  return "登录链接发送失败，请检查邮箱或稍后重试。";
}

export function AuthPage() {
  const apple = appleAuthCopy(document.documentElement.lang);
  const showApple = isIosApp || import.meta.env.VITE_ENABLE_APPLE_WEB_AUTH === "true";
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: AuthMode = searchParams.get("mode") === "register" ? "register" : "login";
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = accountReturnTo(requestedReturnTo);
  const { user, loading: accountLoading } = useAccount();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [pending, setPending] = useState<"email" | "github" | "apple" | null>(null);
  const [providerError, setProviderError] = useState(() => {
    const fragment = new URLSearchParams(hash.slice(1));
    return ["error", "error_code", "error_description"].some((key) => searchParams.has(key) || fragment.has(key))
      ? "登录未完成，请重试。"
      : "";
  });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!accountLoading && user) navigate(returnTo, { replace: true });
  }, [accountLoading, user, navigate, returnTo]);

  useEffect(() => {
    const restoreAppleButton = (event: PageTransitionEvent) => {
      if (event.persisted) setPending((current) => current === "apple" ? null : current);
    };
    window.addEventListener("pageshow", restoreAppleButton);
    return () => window.removeEventListener("pageshow", restoreAppleButton);
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextMode === "register") nextParams.set("mode", "register");
    else nextParams.delete("mode");
    setSearchParams(nextParams);
    setFeedback("");
    setProviderError("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setProviderError("");
    const cleanEmail = email.trim();
    const cleanNickname = nickname.trim();
    if (!cleanEmail || (mode === "register" && !cleanNickname)) {
      setFeedback(mode === "register" ? "请填写昵称和邮箱。" : "请填写邮箱。");
      return;
    }
    setPending("email");
    setFeedback("");
    try {
      const result = await sendMagicLink(cleanEmail, mode === "register" ? cleanNickname : undefined, returnTo);
      if (result.error) throw result.error;
      setFeedback("登录链接已发送，请打开邮箱并点击邮件中的链接。链接只能使用一次，有效期为一小时。 ");
    } catch (error) {
      setFeedback(getAuthErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setPending(null);
    }
  };

  const submitGitHub = async () => {
    if (pending) return;
    setPending("github");
    setFeedback("");
    setProviderError("");
    try {
      const { data, error } = await signInWithGitHub(returnTo);
      if (error || !data.url) throw new Error("GitHub sign-in did not start");
    } catch {
      setProviderError("无法连接 GitHub，请稍后重试。");
      setPending(null);
    }
  };

  const submitApple = async () => {
    if (pending) return;
    setPending("apple");
    setFeedback("");
    setProviderError("");
    try {
      if (isIosApp) {
        await signInWithNativeApple();
        setPending(null);
      } else {
        const { data, error } = await signInWithApple(returnTo);
        if (error || !data.url) throw new Error("Apple sign-in did not start");
      }
    } catch {
      setProviderError(apple.failed);
      setPending(null);
    }
  };

  return (
    <PageShell showNavigation={false} headerAction={<Link className="auth-back-home" to="/">先逛逛</Link>}>
      <section className="auth-page">
        <div className="auth-hero" aria-hidden="true"><span>✦</span><i>♡</i><b>✧</b></div>
        <span className="eyebrow">WELCOME TO BOTHPLS</span>
        <h1>{isIosApp || mode === "login" ? "欢迎回来！" : "加入 BothPls"}</h1>
        <p className="auth-subtitle">{isIosApp ? apple.iosIntro : mode === "login" ? "使用邮箱或 GitHub 登录，继续和朋友一起做决定。" : "注册一个账号，把每次选择都变得更轻松。"}</p>

        {!isIosApp && <>
          <div className="auth-tabs" role="tablist" aria-label="登录或注册">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} disabled={pending !== null} onClick={() => switchMode("login")}>登录</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} disabled={pending !== null} onClick={() => switchMode("register")}>注册</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && <><label className="field-label" htmlFor="auth-nickname">昵称</label><input id="auth-nickname" className="text-input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} placeholder="朋友们会这样称呼你" autoComplete="nickname" /></>}
            <label className="field-label" htmlFor="auth-email">邮箱</label>
            <input id="auth-email" className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" autoComplete="email" />
            <button className="purple-button button-full auth-submit" type="submit" disabled={pending !== null}>{pending === "email" ? "发送中…" : "发送登录链接"}</button>
          </form>

          <div className="auth-divider" aria-hidden="true">或</div>
          <button className="auth-github button-full" type="button" onClick={submitGitHub} disabled={pending !== null}>
            {pending === "github" ? "正在前往 GitHub…" : "使用 GitHub 登录"}
          </button>
        </>}
        {showApple && <AppleSignInButton copy={apple} busy={pending === "apple"} disabled={pending !== null} onClick={submitApple} />}
        {isIosApp && <a className="auth-back-home auth-browser-link" href={authCallbackUrl(returnTo, publicAppOrigin)}
          target="_blank" rel="noopener noreferrer">{apple.browserLink}</a>}

        {providerError && <p className="auth-feedback" role="alert">{providerError}</p>}
        {feedback && <p className="auth-feedback" role="status">{feedback}</p>}
        <p className="auth-legal">{isIosApp ? apple.browserNote : "邮箱登录链接只能使用一次。参与朋友投票无需登录。"}</p>
      </section>
    </PageShell>
  );
}
