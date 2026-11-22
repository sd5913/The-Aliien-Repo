import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAccount } from "../components/AccountProvider";
import { accountReturnTo } from "../utils/navigation";
import { PageShell } from "../../../components/layout/PageShell";
import { sendMagicLink, signInWithApple, signInWithGitHub } from "../services/auth";
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
  const [pending, setPending] = useState<"email" | "github" | "apple" | null>(null);
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

        {providerError && <p className="auth-feedback" role="alert">{t(providerError)}</p>}
        {feedback && <p className="auth-feedback" role="status">{t(feedback)}</p>}
        <p className="auth-legal">{t("auth.legal")}</p>
      </section>
    </PageShell>
  );
}
