import type { User } from "@supabase/supabase-js";
import type { VoterIdentity } from "../../../types/poll";
import { VOTER_STORAGE_KEY } from "../../../lib/storage/localStorage";
import { displayAvatar } from "../../settings/utils/profile";

// Current account profile only. Browser-issued voter credentials are never read.
export type ParticipantProfile = VoterIdentity & { avatar: string };
let current: ParticipantProfile | null = null;
export function setAccountIdentity(user: User | null) {
  const nickname = Array.from(String(user?.user_metadata?.nickname || user?.email?.split("@")[0] || "朋友").trim()).slice(0, 20).join("");
  current = user && !user.is_anonymous ? {
    id: user.id,
    nickname: Array.from(nickname).length >= 2 ? nickname : "朋友",
    avatar: displayAvatar(String(user.user_metadata?.avatar ?? "")),
  } : null;
}
export function readParticipant(): ParticipantProfile | null { return current; }
export function clearParticipant() { window.localStorage.removeItem(VOTER_STORAGE_KEY); }
