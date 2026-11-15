import type { Provider } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";

export type SocialProvider = Extract<Provider, "google" | "apple" | "github">;

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, nickname: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
      emailRedirectTo: `${window.location.origin}/auth`,
    },
  });
}

export async function signInWithSocialProvider(provider: SocialProvider) {
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth` },
  });
}

