import type { VoterIdentity } from "../../../types/poll";
import { VOTER_STORAGE_KEY, readLocalJson, writeLocalJson } from "../../../lib/storage/localStorage";
import { getVoter } from "../../polls/utils/voting";

export const PARTICIPANT_AVATARS = ["🐱", "🐰", "🐻", "🐼", "🦊", "🐨"] as const;
export type ParticipantProfile = VoterIdentity & { participantReady: true; avatar: string };

export function readParticipant(): ParticipantProfile | null {
  return readLocalJson<ParticipantProfile | null>(VOTER_STORAGE_KEY, null,
    (value: unknown): value is ParticipantProfile => {
      if (!value || typeof value !== "object") return false;
      const profile = value as Partial<ParticipantProfile>;
      return typeof profile.id === "string" && !!profile.id &&
        typeof profile.nickname === "string" && Array.from(profile.nickname.trim()).length >= 2 &&
        Array.from(profile.nickname.trim()).length <= 12 &&
        profile.participantReady === true && typeof profile.avatar === "string";
    });
}

export function saveParticipant(nickname: string, avatar: string): ParticipantProfile {
  const clean = nickname.trim();
  if (Array.from(clean).length < 2 || Array.from(clean).length > 12) {
    throw new Error("昵称需要 2–12 个字符");
  }
  // Preserve the UUID used by existing votes and comments.
  const profile: ParticipantProfile = { ...getVoter(), nickname: clean, avatar, participantReady: true };
  writeLocalJson(VOTER_STORAGE_KEY, profile);
  return profile;
}
