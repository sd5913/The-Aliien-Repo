import { useAccount } from "../components/AccountProvider";
import { readParticipant } from "./participant";

export function useParticipant() {
  useAccount();
  return readParticipant();
}
