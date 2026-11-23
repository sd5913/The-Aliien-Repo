import { supabase } from "../../../lib/supabase/client";

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
}

/**
 * The profiles table ships with its own migration and may not be applied on every
 * environment yet. Detect "table not deployed" so profile editing keeps working
 * instead of failing the whole save.
 */
export function isMissingProfilesTable(error: { code?: string | null; message?: string | null } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  return /could not find the table '.*profiles'/i.test(error.message ?? "");
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("id,nickname,avatar_url,bio").eq("id", userId).maybeSingle();
  if (error) {
    if (isMissingProfilesTable(error)) return null;
    throw error;
  }
  return data as Profile | null;
}

/** Mirrors the account profile into the profiles table. Returns false when the table is not deployed. */
export async function saveProfile(profile: Profile): Promise<boolean> {
  const { error } = await supabase.from("profiles").upsert({
    id: profile.id,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (isMissingProfilesTable(error)) {
      console.warn("BothPls: profiles table is not deployed; profile kept in account metadata only.");
      return false;
    }
    throw error;
  }
  return true;
}
