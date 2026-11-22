import { useAccount } from "../../auth/components/AccountProvider";
import { supabase } from "../../../lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
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
  const { user, loading: accountLoading } = useAccount();
  const userId = user ? `account:${user.id}` : "guest";
  const nickname = user ? (typeof user.user_metadata.nickname === "string" ? user.user_metadata.nickname : user.email?.split("@")[0] ?? "") : "";
  const avatar = user ? (typeof user.user_metadata.avatar === "string" ? user.user_metadata.avatar : "🌷") : "";
  const email = user?.email ?? "";

  useEffect(() => {
    if (accountLoading) return;
    let active = true;
    setLoading(true);
    setSettings(defaultUserSettings);
    fetchUserSettings(userId)
      .then((data) => {
        if (active) {
          setSettings({ ...data, nickname, avatar, email });
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
  }, [userId, accountLoading, nickname, avatar, email]);

  const save = useCallback(async (next: UserSettings) => {
    if (user && (next.nickname !== nickname || next.avatar !== avatar)) {
      const { error: updateError } = await supabase.auth.updateUser({ data: { nickname: next.nickname, avatar: next.avatar } });
      if (updateError) throw updateError;
    }
    const normalized = { ...next, email };
    await saveUserSettings(userId, normalized);
    setSettings(normalized);
    setError(null);
  }, [userId, user, nickname, avatar, email]);

  return { settings, loading, error, save };
}
