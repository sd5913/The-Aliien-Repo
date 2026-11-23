import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase/client";
import { useAccount } from "../components/AccountProvider";
import { accountReturnTo } from "../utils/navigation";
import { PageShell } from "../../../components/layout/PageShell";
import { sendPasswordRecoveryEmail, signInWithApple, signInWithEmailPassword, signInWithGitHub, signInWithGoogle, signUpWithEmailPassword, updatePassword } from "../services/auth";
import { AppleWebSignInButton } from "../components/AppleWebSignInButton";

type AuthMode = "login" | "register" | "reset";
const validPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,32}$/.test(value);

function getAuthErrorKey(message: string, mode: AuthMode): MessageKey {
  const normalized = message.toLowerCase();
  if (normalized.includes("email rate limit") || normalized.includes("rate limit")) return "auth.rateLimit";
  if (normalized.includes("email not authorized")) return "auth.emailUnauthorized";
  if (normalized.includes("invalid login credentials")) return "auth.invalidCredentials";
  if (normalized.includes("already registered") || normalized.includes("already been registered")) return "auth.emailRegistered";
  return mode === "reset" ? "auth.resetFailed" : "auth.emailFailed";
}

export function AuthPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const mode: AuthMode = requestedMode === "login" || requestedMode === "reset" ? requestedMode : "register";
  const returnTo = accountReturnTo(searchParams.get("returnTo"));
  const { user, loading: accountLoading } = useAccount();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [recoveryActive, setRecoveryActive] = useState(false);
  const [pending, setPending] = useState<"email" | "github" | "google" | "apple" | null>(null);
  const [providerError, setProviderError] = useState<MessageKey | "">(() => {
    const fragment = new URLSearchParams(hash.slice(1));
    return ["error", "error_code", "error_description"].some((key) => searchParams.has(key) || fragment.has(key)) ? "auth.notCompleted" : "";
  });
  const [feedback, setFeedback] = useState<MessageKey | "">("");

  useEffect(() => { if (!accountLoading && user && mode !== "reset") navigate(returnTo, { replace: true }); }, [accountLoading, user, navigate, returnTo, mode]);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { setRecoveryActive(true); setFeedback(""); }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const restoreAppleButton = (event: PageTransitionEvent) => { if (event.persisted) setPending((current) => current === "apple" ? null : current); };
    window.addEventListener("pageshow", restoreAppleButton);
    return () => window.removeEventListener("pageshow", restoreAppleButton);
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextMode === "register") nextParams.delete("mode"); else nextParams.set("mode", nextMode);
    setSearchParams(nextParams); setFeedback(""); setProviderError(""); setPassword(""); setConfirmation("");
    if (nextMode !== "reset") setRecoveryActive(false);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (pending) return;
    setProviderError("");
    const cleanEmail = email.trim(), cleanNickname = nickname.trim();
    if (!cleanEmail) return setFeedback("auth.emailRequired");
    if (mode === "register" && Array.from(cleanNickname).length < 2) return setFeedback("auth.nicknameRequired");
    if (mode !== "reset" || recoveryActive) {
      if (!validPassword(password)) return setFeedback("auth.passwordInvalid");
      if ((mode === "register" || recoveryActive) && password !== confirmation) return setFeedback("auth.passwordMismatch");
    }
    setPending("email"); setFeedback("");
    try {
      if (mode === "register") {
        const result = await signUpWithEmailPassword(cleanEmail, password, cleanNickname, returnTo, rememberMe);
        if (result.error) throw result.error;
        setFeedback(result.data.session ? "auth.registered" : "auth.confirmEmail");
      } else if (mode === "login") {
        const result = await signInWithEmailPassword(cleanEmail, password, rememberMe);
        if (result.error) throw result.error;
      } else if (recoveryActive) {
        const result = await updatePassword(password);
        if (result.error) throw result.error;
        setFeedback("auth.passwordUpdated"); setPassword(""); setConfirmation("");
      } else {
        const result = await sendPasswordRecoveryEmail(cleanEmail, returnTo);
        if (result.error) throw result.error;
        setFeedback("auth.resetSent");
      }
    } catch (error) { setFeedback(getAuthErrorKey(error instanceof Error ? error.message : "", mode)); } finally { setPending(null); }
  };
  const submitProvider = async (provider: "github" | "google" | "apple") => {
    if (pending) return;
    setPending(provider); setFeedback(""); setProviderError("");
    try {
      const signIn = provider === "github" ? signInWithGitHub : provider === "google" ? signInWithGoogle : signInWithApple;
      const { data, error } = await signIn(returnTo);
      if (error || !data.url) throw new Error(`${provider} sign-in did not start`);
    } catch { setProviderError(`auth.${provider}Failed` as MessageKey); setPending(null); }
  };
  const isPasswordForm = mode !== "reset" || recoveryActive;
  const heading = mode === "reset" ? (recoveryActive ? "auth.chooseNewPassword" : "auth.resetPassword") : mode === "login" ? "auth.welcome" : "auth.join";
  const intro = mode === "reset" ? (recoveryActive ? "auth.chooseNewPasswordIntro" : "auth.resetPasswordIntro") : mode === "login" ? "auth.loginIntro" : "auth.registerIntro";
  const submitLabel = pending === "email" ? "auth.submitting" : mode === "reset" ? recoveryActive ? "auth.updatePassword" : "auth.sendResetLink" : mode === "login" ? "auth.login" : "auth.register";

  return <PageShell showNavigation={false} headerAction={<Link className="auth-back-home" to="/">{t("auth.browse")}</Link>}><section className="auth-page">
    <span className="eyebrow">WELCOME TO BOTHPLS</span><h1>{t(heading)}</h1><p className="auth-subtitle">{t(intro)}</p>
    {mode !== "reset" && <div className="auth-tabs" role="tablist" aria-label={t("auth.tabs")}><button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} disabled={pending !== null} onClick={() => switchMode("login")}>{t("auth.login")}</button><button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} disabled={pending !== null} onClick={() => switchMode("register")}>{t("auth.register")}</button></div>}
    <form className="auth-form" onSubmit={submit}>
      {mode === "register" && <><label className="field-label" htmlFor="auth-nickname">{t("common.nickname")} <span className="optional">{t("profile.required")}</span></label><input id="auth-nickname" className="text-input" required value={nickname} onChange={(event) => setNickname(Array.from(event.target.value).slice(0, 20).join(""))} placeholder={t("auth.nicknameHint")} autoComplete="nickname" /></>}
      {!recoveryActive && <><label className="field-label" htmlFor="auth-email">{t("common.email")}</label><input id="auth-email" className="text-input" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" autoComplete="email" /></>}
      {isPasswordForm && <><label className="field-label" htmlFor="auth-password">{t("auth.password")}</label><input id="auth-password" className="text-input" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={32} placeholder={t("auth.passwordHint")} autoComplete={mode === "login" ? "current-password" : "new-password"} />{(mode === "register" || recoveryActive) && <><label className="field-label" htmlFor="auth-confirmation">{t("auth.confirmPassword")}</label><input id="auth-confirmation" className="text-input" required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={32} autoComplete="new-password" /></>}{(mode === "login" || mode === "register") && <label className="auth-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> <span>{t("auth.rememberMe")}</span></label>}</>}
      <button className="purple-button button-full auth-submit" type="submit" disabled={pending !== null}>{t(submitLabel)}</button>
      {mode === "login" && <button className="auth-forgot-password" type="button" disabled={pending !== null} onClick={() => switchMode("reset")}>{t("auth.forgotPassword")}</button>}
      {mode === "reset" && !recoveryActive && <p className="auth-mode-prompt"><button type="button" disabled={pending !== null} onClick={() => switchMode("login")}>{t("auth.backToLogin")}</button></p>}
      {mode !== "reset" && <p className="auth-mode-prompt">{t(mode === "register" ? "auth.haveAccount" : "auth.noAccount")} <button type="button" disabled={pending !== null} onClick={() => switchMode(mode === "register" ? "login" : "register")}>{t(mode === "register" ? "auth.goLogin" : "auth.goRegister")}</button></p>}
    </form>
    {mode !== "reset" && <><div className="auth-divider" aria-hidden="true">{t("auth.or")}</div><AppleWebSignInButton busy={pending === "apple"} disabled={pending !== null} onClick={() => void submitProvider("apple")} /><button className="auth-github button-full" type="button" onClick={() => void submitProvider("github")} disabled={pending !== null}>{pending === "github" ? t("auth.githubPending") : t("auth.github")}</button><button className="auth-google button-full" type="button" onClick={() => void submitProvider("google")} disabled={pending !== null}>{pending === "google" ? t("auth.googlePending") : t("auth.google")}</button></>}
    {providerError && <p className="auth-feedback" role="alert">{t(providerError)}</p>}{feedback && <p className="auth-feedback" role={feedback === "auth.registered" || feedback === "auth.confirmEmail" || feedback === "auth.resetSent" || feedback === "auth.passwordUpdated" ? "status" : "alert"}>{t(feedback)}</p>}<p className="auth-legal">{t("auth.legal")}</p>
  </section></PageShell>;
}
