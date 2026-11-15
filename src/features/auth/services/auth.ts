import { supabase } from "../../../lib/supabase/client";

export async function sendMagicLink(email: string, nickname?: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/auth`,
      ...(nickname ? { data: { nickname } } : {}),
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
