import { supabase } from "../../../lib/supabase/client";
import { accountReturnTo } from "../utils/navigation";

export function authCallbackUrl(returnTo: string, origin = window.location.origin) {
  return `${origin}/auth?returnTo=${encodeURIComponent(accountReturnTo(returnTo))}`;
}

export function signInWithGitHub(returnTo = "/") {
  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: authCallbackUrl(returnTo) },
  });
}

export function signInWithApple(returnTo = "/") {
  return supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: authCallbackUrl(returnTo) },
  });
}

export async function sendMagicLink(email: string, nickname?: string, returnTo = "/") {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: authCallbackUrl(returnTo),
      ...(nickname ? { data: { nickname } } : {}),
    },
  });
}

export async function requireAccountId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw new Error("请先登录创建者账号。");
  return data.user.id;
}

export async function signOut() {
  return supabase.auth.signOut();
}
