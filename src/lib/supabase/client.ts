import { createClient } from "@supabase/supabase-js";
import { isIosApp } from "../platform";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url, anonKey, isIosApp ? { auth: { detectSessionInUrl: false } } : undefined);
