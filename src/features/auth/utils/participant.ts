import type { VoterIdentity } from "../../../types/poll";
import { VOTER_STORAGE_KEY, readLocalJson, writeLocalJson } from "../../../lib/storage/localStorage";
import { getVoter } from "../../polls/utils/voting";
import { supabase } from "../../../lib/supabase/client";

export const PARTICIPANT_AVATARS = ["🐱", "🐰", "🐻", "🐼", "🦊", "🐨"] as const;
export type ParticipantProfile = VoterIdentity & { participantReady: true; avatar: string; participantToken: string };

export function readParticipant(): ParticipantProfile | null {
  return readLocalJson<ParticipantProfile | null>(VOTER_STORAGE_KEY, null,
    (value: unknown): value is ParticipantProfile => {
      if (!value || typeof value !== "object") return false;
      const profile = value as Partial<ParticipantProfile>;
      return typeof profile.id === "string" && !!profile.id &&
        typeof profile.nickname === "string" && Array.from(profile.nickname.trim()).length >= 2 &&
        Array.from(profile.nickname.trim()).length <= 12 &&
        profile.participantReady === true && typeof profile.avatar === "string" &&
        typeof profile.participantToken === "string" && /^[a-f0-9]{64}$/.test(profile.participantToken);
    });
}

export async function saveParticipant(nickname: string, avatar: string): Promise<ParticipantProfile> {
  const clean = nickname.trim();
  if (Array.from(clean).length < 2 || Array.from(clean).length > 12) {
    throw new Error("昵称需要 2–12 个字符");
  }
  const existing = readParticipant();
  // Existing capability identities survive reloads and profile changes. Legacy
  // browser IDs cannot be claimed using their public ID alone.
  const token = existing?.participantToken ?? Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const { data, error } = await supabase.rpc("register_participant", { p_token: token });
  if (error || typeof data !== "string") throw error ?? new Error("无法建立投票者身份");
  const profile: ParticipantProfile = { ...getVoter(), id: data, nickname: clean, avatar, participantReady: true, participantToken: token };
  writeLocalJson(VOTER_STORAGE_KEY, profile);
  return profile;
}
