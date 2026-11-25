import type { User } from "@supabase/supabase-js";
import { fetchProfile, type Profile } from "../services/profiles";

/** Avatar shown when an account has no avatar yet. Every profile surface uses this. */
export const DEFAULT_PROFILE_AVATAR = "🌷";

export interface ProfileDraft {
  nickname: string;
  avatar: string;
  bio: string;
}

function metadataText(user: User | null, key: string) {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Account metadata is the single display source for the personal page and the
 * profile editor, so the two pages cannot drift apart. The profiles table is only
 * a server-side mirror.
 */
export function profileDraftFromUser(user: User | null): ProfileDraft {
  if (!user) return { nickname: "", avatar: "", bio: "" };
  return {
    nickname: metadataText(user, "nickname") || user.email?.split("@")[0] || "",
    avatar: metadataText(user, "avatar"),
    bio: metadataText(user, "bio"),
  };
}

/** Loads the draft, filling fields that metadata is missing from the mirrored row. */
export async function loadProfileDraft(user: User | null): Promise<ProfileDraft> {
  const draft = profileDraftFromUser(user);
  if (!user) return draft;
  try {
    return mergeProfileRow(draft, await fetchProfile(user.id));
  } catch (cause) {
    console.warn("BothPls: could not read the profiles row, using account metadata.", cause);
    return draft;
  }
}

export function mergeProfileRow(draft: ProfileDraft, row: Profile | null): ProfileDraft {
  if (!row) return draft;
  return {
    nickname: draft.nickname || row.nickname?.trim() || "",
    avatar: draft.avatar || row.avatar_url || "",
    bio: draft.bio || row.bio || "",
  };
}

export function displayAvatar(avatar: string) {
  return avatar || DEFAULT_PROFILE_AVATAR;
}

export function isImageAvatar(avatar: string) {
  return avatar.startsWith("http");
}
