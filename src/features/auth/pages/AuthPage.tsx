import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAccount } from "../components/AccountProvider";
import { accountReturnTo } from "../utils/navigation";
import { PageShell } from "../../../components/layout/PageShell";
import { sendMagicLink, signInWithApple, signInWithGitHub, signInWithGoogle } from "../services/auth";
import { AppleWebSignInButton } from "../components/AppleWebSignInButton";

type AuthMode = "login" | "register";

function getAuthErrorKey(message: string): MessageKey {
  const normalized = message.toLowerCase();
  if (normalized.includes("email rate limit") || normalized.includes("rate limit")) return "auth.rateLimit";
  if (normalized.includes("email not authorized")) return "auth.emailUnauthorized";
  return "auth.emailFailed";
}

export function AuthPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: AuthMode = searchParams.get("mode") === "login" ? "login" : "register";
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = accountReturnTo(requestedReturnTo);
  const { user, loading: accountLoading } = useAccount();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [pending, setPending] = useState<"email" | "github" | "google" | "apple" | null>(null);
  const [providerError, setProviderError] = useState<MessageKey | "">(() => {
    const fragment = new URLSearchParams(hash.slice(1));
    return ["error", "error_code", "error_description"].some((key) => searchParams.has(key) || fragment.has(key))
      ? "auth.notCompleted"
      : "";
  });
  const [feedback, setFeedback] = useState<MessageKey | "">("");

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
    if (nextMode === "login") nextParams.set("mode", "login");
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
    if (!cleanEmail) {
      setFeedback("auth.emailRequired");
      return;
    }
    setPending("email");
    setFeedback("");
    try {
      const result = await sendMagicLink(cleanEmail, mode === "register" ? cleanNickname : undefined, returnTo);
      if (result.error) throw result.error;
      setFeedback("auth.sent");
    } catch (error) {
      setFeedback(getAuthErrorKey(error instanceof Error ? error.message : ""));
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
      setProviderError("auth.githubFailed");
      setPending(null);
    }
  };

  const submitGoogle = async () => {
    if (pending) return;
    setPending("google");
    setFeedback("");
    setProviderError("");
    try {
      const { data, error } = await signInWithGoogle(returnTo);
      if (error || !data.url) throw new Error("Google sign-in did not start");
    } catch {
      setProviderError("auth.googleFailed");
      setPending(null);
    }
  };

  const submitApple = async () => {
    if (pending) return;
    setPending("apple");
    setFeedback("");
    setProviderError("");
    try {
      const { data, error } = await signInWithApple(returnTo);
      if (error || !data.url) throw new Error("Apple OAuth did not start");
    } catch {
      setProviderError("auth.appleFailed");
      setPending(null);
    }
  };

  return (
    <PageShell showNavigation={false} headerAction={<Link className="auth-back-home" to="/">{t("auth.browse")}</Link>}>
      <section className="auth-page">
        <span className="eyebrow">WELCOME TO BOTHPLS</span>
        <h1>{t(mode === "login" ? "auth.welcome" : "auth.join")}</h1>
        <p className="auth-subtitle">{t(mode === "login" ? "auth.loginIntro" : "auth.registerIntro")}</p>

        <div className="auth-tabs" role="tablist" aria-label={t("auth.tabs")}>
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} disabled={pending !== null} onClick={() => switchMode("login")}>{t("auth.login")}</button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} disabled={pending !== null} onClick={() => switchMode("register")}>{t("auth.register")}</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && <><label className="field-label" htmlFor="auth-nickname">{t("common.nickname")} <span className="optional">{t("common.optional")}</span></label><input id="auth-nickname" className="text-input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} placeholder={t("auth.nicknameHint")} autoComplete="nickname" /></>}
          <label className="field-label" htmlFor="auth-email">{t("common.email")}</label>
          <input id="auth-email" className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" autoComplete="email" />
          <button className="purple-button button-full auth-submit" type="submit" disabled={pending !== null}>{t(pending === "email" ? "auth.sending" : "auth.continueEmail")}</button>
          <p className="auth-mode-prompt">{t(mode === "register" ? "auth.haveAccount" : "auth.noAccount")} <button type="button" disabled={pending !== null} onClick={() => switchMode(mode === "register" ? "login" : "register")}>{t(mode === "register" ? "auth.goLogin" : "auth.goRegister")}</button></p>
        </form>

        <div className="auth-divider" aria-hidden="true">{t("auth.or")}</div>
        <AppleWebSignInButton busy={pending === "apple"} disabled={pending !== null} onClick={submitApple} />
        <button className="auth-github button-full" type="button" onClick={submitGitHub} disabled={pending !== null}>
          {pending === "github" ? t("auth.githubPending") : t("auth.github")}
        </button>
        <button className="auth-google button-full" type="button" onClick={submitGoogle} disabled={pending !== null}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285f4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.2 13.7a6 6 0 0 1 0-3.5V7.6H2.9a10 10 0 0 0 0 8.8l3.3-2.7Z"/><path fill="#ea4335" d="M12 5.9c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17 2.8 14.7 2 12 2a10 10 0 0 0-9.1 5.6l3.3 2.6c.8-2.5 3.1-4.3 5.8-4.3Z"/></svg>
          {pending === "google" ? t("auth.googlePending") : t("auth.google")}
        </button>

        {providerError && <p className="auth-feedback" role="alert">{t(providerError)}</p>}
        {feedback && <p className="auth-feedback" role="status">{t(feedback)}</p>}
        <p className="auth-legal">{t("auth.legal")}</p>
      </section>
    </PageShell>
  );
}
