import { useEffect, useState } from "react";
import { readParticipant } from "./participant";

export function useParticipant() {
  const [participant, setParticipant] = useState(readParticipant);
  useEffect(() => {
    const update = () => setParticipant(readParticipant());
    window.addEventListener("storage", update);
    window.addEventListener("bothpls:participant-changed", update);
    return () => { window.removeEventListener("storage", update); window.removeEventListener("bothpls:participant-changed", update); };
  }, []);
  return participant;
}
