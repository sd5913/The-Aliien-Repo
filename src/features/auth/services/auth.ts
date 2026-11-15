import { supabase } from "../../../lib/supabase/client";

export async function sendEmailOtp(email: string, nickname?: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      ...(nickname ? { data: { nickname } } : {}),
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function verifyEmailOtp(email: string, token: string) {
  return supabase.auth.verifyOtp({ email, token, type: "email" });
}
