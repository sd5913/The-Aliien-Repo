import { createHandler } from "./handler.ts";

Deno.serve(createHandler({
  url: Deno.env.get("SUPABASE_URL") ?? "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  translationKey: Deno.env.get("GOOGLE_TRANSLATE_API_KEY") ?? "",
}));
