import { randomBytes } from "node:crypto";

export default function handler(request, response) {
  if (request.method !== "GET") return response.status(405).end();
  const { WECHAT_APP_ID, WECHAT_REDIRECT_URI } = process.env;
  if (!WECHAT_APP_ID || !WECHAT_REDIRECT_URI) return response.status(503).send("微信登录尚未配置");
  const state = randomBytes(24).toString("hex");
  const candidate = typeof request.query.returnTo === "string" ? request.query.returnTo : "/";
  const returnTo = candidate.startsWith("/") && !candidate.startsWith("//") && !/[\\\u0000-\u001f]/.test(candidate) && !/^\/(auth|login)(\/|\?|#|$)/.test(candidate) ? candidate : "/";
  response.setHeader("Set-Cookie", [
    `wechat_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/wechat; Max-Age=600`,
    `wechat_return=${encodeURIComponent(returnTo)}; HttpOnly; Secure; SameSite=Lax; Path=/api/wechat; Max-Age=600`,
  ]);
  response.setHeader("Cache-Control", "no-store");
  const url = new URL("https://open.weixin.qq.com/connect/qrconnect");
  url.searchParams.set("appid", WECHAT_APP_ID);
  url.searchParams.set("redirect_uri", WECHAT_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "snsapi_login");
  url.searchParams.set("state", state);
  response.redirect(302, `${url}#wechat_redirect`);
}
