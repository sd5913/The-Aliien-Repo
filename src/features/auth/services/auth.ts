import { supabase } from "../../../lib/supabase/client";
import { accountReturnTo } from "../utils/navigation";

export async function sendMagicLink(email: string, nickname?: string, returnTo = "/") {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/auth?returnTo=${encodeURIComponent(accountReturnTo(returnTo))}`,
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
