import { setSessionPersistence, supabase } from "../../../lib/supabase/client";
import { accountReturnTo } from "../utils/navigation";

function authCallbackUrl(returnTo: string) {
  return `${window.location.origin}/auth?returnTo=${encodeURIComponent(accountReturnTo(returnTo))}`;
}

export function signInWithGitHub(returnTo = "/") {
  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: authCallbackUrl(returnTo) },
  });
}

export function signInWithGoogle(returnTo = "/") {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authCallbackUrl(returnTo) },
  });
}

export function signInWithApple(returnTo = "/") {
  return supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: authCallbackUrl(returnTo) },
  });
}

export function signUpWithEmailPassword(email: string, password: string, nickname: string, returnTo = "/", rememberMe = true) {
  setSessionPersistence(rememberMe);
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: authCallbackUrl(returnTo), data: { nickname } },
  });
}

export function signInWithEmailPassword(email: string, password: string, rememberMe: boolean) {
  setSessionPersistence(rememberMe);
  return supabase.auth.signInWithPassword({ email, password });
}

export function sendPasswordRecoveryEmail(email: string, returnTo = "/") {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: authCallbackUrl(returnTo) });
}

export function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function requireAccountId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw new Error("请先登录。");
  return data.user.id;
}

export async function signOut() {
  return supabase.auth.signOut();
}
