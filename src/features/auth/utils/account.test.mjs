import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function load(path, replacements = []) {
  let source = readFileSync(new URL(path, import.meta.url), "utf8");
  for (const [pattern, value] of replacements) source = source.replace(pattern, value);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const navigation = await load("./navigation.ts");
const { accountReturnTo } = navigation;
for (const path of ["/create", "/create?id=owned-poll", "/settings", "/poll/test/results"]) {
  assert.equal(accountReturnTo(path), path);
}
for (const path of [null, "https://evil.test", "//evil.test", "/\\evil.test", "/auth", "/auth?returnTo=/create", "/login/", "/foo/../auth", "/AUTH", "/nested/..//evil.test"]) {
  assert.equal(accountReturnTo(path), "/");
}

let user = null;
let authError = null;
let lastEmail;
let lastOAuth;
let oauthError = null;
let lastReset;
let lastPasswordUpdate;
let lastEmailOtp;
let lastOtpVerification;
let remembered;
globalThis.accountTestAuth = {
  setSessionPersistence: (value) => { remembered = value; },
  auth: {
    getUser: async () => ({ data: { user }, error: authError }),
    signInWithOtp: async (input) => { lastEmailOtp = input; return { data: {}, error: null }; },
    verifyOtp: async (input) => { lastOtpVerification = input; return { data: {}, error: null }; },
    resetPasswordForEmail: async (email, options) => { lastReset = { email, options }; return { data: {}, error: null }; },
    updateUser: async (input) => { lastPasswordUpdate = input; return { data: {}, error: null }; },
    signInWithOAuth: async (input) => {
      lastOAuth = input;
      return { data: { provider: input.provider, url: oauthError ? null : "https://bothpls.test/authorize" }, error: oauthError };
    },
    signOut: async () => ({ error: null }),
  },
};
globalThis.accountTestNavigation = navigation;
const { requireAccountId, sendEmailCode, verifyEmailCode, sendPasswordRecoveryEmail, updatePassword, signInWithGitHub } = await load("../services/auth.ts", [
  [/import \{ setSessionPersistence, supabase \} from [^;]+;/, "const supabase = globalThis.accountTestAuth; const { setSessionPersistence } = globalThis.accountTestAuth;"],
  [/import \{ accountReturnTo \} from [^;]+;/, "const { accountReturnTo } = globalThis.accountTestNavigation;"],
]);
await assert.rejects(requireAccountId(), /请先登录/);
user = { id: "soft-only", is_anonymous: true };
await assert.rejects(requireAccountId(), /请先登录/);
user = { id: "account-a", is_anonymous: false };
assert.equal(await requireAccountId(), "account-a");
user = { id: "account-b", is_anonymous: false };
assert.equal(await requireAccountId(), "account-b", "Account identity must not be cached across account switches");
authError = new Error("Expired session");
await assert.rejects(requireAccountId(), /请先登录/);
authError = null;

const originalWindow = globalThis.window;
globalThis.window = { location: { origin: "https://bothpls.test" } };
await sendEmailCode("test@example.test", true, "测试用户", false);
assert.deepEqual(lastEmailOtp, { email: "test@example.test", options: { shouldCreateUser: true, data: { nickname: "测试用户" } } });
assert.equal(remembered, false);
await sendEmailCode("test@example.test", false, undefined, true);
assert.deepEqual(lastEmailOtp, { email: "test@example.test", options: { shouldCreateUser: false } });
assert.equal(remembered, true);
await verifyEmailCode("test@example.test", "123456", "signup");
assert.deepEqual(lastOtpVerification, { email: "test@example.test", token: "123456", type: "signup" });
await verifyEmailCode("test@example.test", "654321", "email");
assert.deepEqual(lastOtpVerification, { email: "test@example.test", token: "654321", type: "email" });
await sendPasswordRecoveryEmail("test@example.test", "/settings");
assert.equal(lastReset.email, "test@example.test");
assert.equal(new URL(lastReset.options.redirectTo).searchParams.get("returnTo"), "/settings");
await updatePassword("abc12345");
assert.deepEqual(lastPasswordUpdate, { password: "abc12345" });
const oauth = await signInWithGitHub("/create?id=example-poll#options");
assert.equal(oauth.data.url, "https://bothpls.test/authorize");
assert.equal(lastOAuth.provider, "github");
const oauthCallback = new URL(lastOAuth.options.redirectTo);
assert.equal(oauthCallback.origin, "https://bothpls.test");
assert.equal(oauthCallback.pathname, "/auth");
assert.equal(oauthCallback.searchParams.get("returnTo"), "/create?id=example-poll#options");
oauthError = new Error("Mock provider unavailable");
assert.equal((await signInWithGitHub("//evil.test")).error, oauthError);
assert.equal(new URL(lastOAuth.options.redirectTo).searchParams.get("returnTo"), "/");
globalThis.window = originalWindow;
delete globalThis.accountTestAuth;
delete globalThis.accountTestNavigation;
console.log("Passed: account access, email OTP signup/sign-in, password recovery, safe callback URLs, and GitHub OAuth options/errors. No live credentials used.");
