import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function cookie(request, name) {
  const match = (request.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export default async function handler(request, response) {
  if (request.method !== "GET") return response.status(405).end();
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Set-Cookie", [
    "wechat_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/wechat; Max-Age=0",
    "wechat_return=; HttpOnly; Secure; SameSite=Lax; Path=/api/wechat; Max-Age=0",
  ]);
  const origin = new URL(process.env.WECHAT_REDIRECT_URI || "https://invalid.example").origin;
  const destination = new URL("/auth", origin);
  const returnTo = cookie(request, "wechat_return");
  if (returnTo.startsWith("/") && !returnTo.startsWith("//") && !/[\\\u0000-\u001f]/.test(returnTo) && !/^\/(auth|login)(\/|\?|#|$)/.test(returnTo)) destination.searchParams.set("returnTo", returnTo);
  const fail = () => { destination.searchParams.set("error", "wechat_login_failed"); response.redirect(302, destination.toString()); };
  const expected = cookie(request, "wechat_state");
  const received = typeof request.query.state === "string" ? request.query.state : "";
  if (!expected || expected.length !== received.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return fail();
  const code = typeof request.query.code === "string" ? request.query.code : "";
  const { WECHAT_APP_ID, WECHAT_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL } = process.env;
  if (!code || !WECHAT_APP_ID || !WECHAT_APP_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !VITE_SUPABASE_URL) return fail();
  try {
    const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
    for (const [key, value] of Object.entries({ appid: WECHAT_APP_ID, secret: WECHAT_APP_SECRET, code, grant_type: "authorization_code" })) tokenUrl.searchParams.set(key, value);
    const tokenResponse = await fetch(tokenUrl);
    if (!tokenResponse.ok) return fail();
    const token = await tokenResponse.json();
    if (!token.openid || !token.access_token || token.errcode) return fail();
    const id = createHash("sha256").update(`${WECHAT_APP_ID}:${token.openid}`).digest("hex");
    const email = `wechat-${id}@users.bothpls.invalid`;
    const admin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data?.properties?.hashed_token) return fail();
    destination.searchParams.set("token_hash", data.properties.hashed_token);
    destination.searchParams.set("type", "magiclink");
    response.redirect(302, destination.toString());
  } catch {
    fail();
  }
}
