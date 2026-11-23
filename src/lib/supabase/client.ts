import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

const persistenceKey = "bothpls-auth-persistence";

function isSessionOnly() {
  return window.sessionStorage.getItem(persistenceKey) === "session";
}

const authStorage = {
  getItem(key: string) {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    const target = isSessionOnly() ? window.sessionStorage : window.localStorage;
    const other = target === window.localStorage ? window.sessionStorage : window.localStorage;
    target.setItem(key, value);
    other.removeItem(key);
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

/** Controls whether an email/password session survives closing the browser. Never stores a password. */
export function setSessionPersistence(rememberMe: boolean) {
  if (rememberMe) window.sessionStorage.removeItem(persistenceKey);
  else window.sessionStorage.setItem(persistenceKey, "session");
}

export const supabase = createClient(url, anonKey, { auth: { storage: authStorage } });
