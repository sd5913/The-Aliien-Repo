import { useCallback, useEffect, useState } from "react";
import { getVoter } from "../../polls/utils/voting";
import {
  defaultUserSettings,
  fetchUserSettings,
  saveUserSettings,
  type UserSettings,
} from "../services/settings";

export function useUserSettings() {
  const [settings, setSettings] = useState(defaultUserSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const userId = getVoter().id;

  useEffect(() => {
    let active = true;
    fetchUserSettings(userId)
      .then((data) => {
        if (active) {
          setSettings(data);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        console.error("BothPls: failed to load user settings from Supabase.", cause);
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const save = useCallback(async (next: UserSettings) => {
    await saveUserSettings(userId, next);
    setSettings(next);
    setError(null);
  }, [userId]);

  return { settings, loading, error, save };
}
