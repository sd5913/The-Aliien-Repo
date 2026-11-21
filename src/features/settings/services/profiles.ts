import { supabase } from "../../../lib/supabase/client";

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("id,nickname,avatar_url,bio").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const { error } = await supabase.from("profiles").upsert({
    id: profile.id,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
