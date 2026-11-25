import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function load(file, replacements = []) {
  let source = readFileSync(new URL(file, import.meta.url), "utf8");
  for (const [pattern, value] of replacements) source = source.replace(pattern, value);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}
const memory = new Map([["bothpls:voter:v1", JSON.stringify({ id: "old-guest", nickname: "历史昵称", participantReady: true, participantToken: "c".repeat(64) })]]);
globalThis.window = { localStorage: { removeItem: key => memory.delete(key) } };
globalThis.profileTest = await load("../../settings/utils/profile.ts", [[/import \{ fetchProfile, type Profile \} from [^;]+;/, 'const fetchProfile = async () => { throw new Error("Unexpected profile request"); };']]);
const identity = await load("./participant.ts", [
  [/import \{ VOTER_STORAGE_KEY \} from [^;]+;/, 'const VOTER_STORAGE_KEY = "bothpls:voter:v1";'],
  [/import \{ displayAvatar \} from [^;]+;/, 'const { displayAvatar } = globalThis.profileTest;'],
]);
globalThis.identityTest = identity;
const voting = await load("../../polls/utils/voting.ts", [[/import \{ readParticipant \} from [^;]+;/, 'const { readParticipant } = globalThis.identityTest;']]);
assert.equal(identity.readParticipant(), null, "Legacy browser credentials cannot authorize writes");
assert.equal(voting.getVoter().id, "");
identity.setAccountIdentity({ id: "account-a", user_metadata: { nickname: "A" } });
assert.equal(identity.readParticipant().id, "account-a");
assert.ok(Array.from(identity.readParticipant().nickname).length >= 2);
assert.deepEqual(Object.keys(voting.getVoter()).sort(), ["id", "nickname"]);
identity.setAccountIdentity({ id: "account-b", user_metadata: { nickname: "新账号" } });
assert.equal(voting.getVoter().id, "account-b", "Account switches replace the vote identity");
identity.setAccountIdentity({ id: "anon", is_anonymous: true });
assert.equal(identity.readParticipant(), null);
identity.setAccountIdentity(null);
assert.equal(voting.getVoter().id, "");
identity.clearParticipant();
assert.equal(memory.size, 0);
delete globalThis.identityTest;
delete globalThis.profileTest;
console.log("Passed: legacy credential rejection, account identity, switches, anonymous sessions and sign-out.");
