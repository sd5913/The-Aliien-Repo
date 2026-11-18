import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const memory = new Map();
const storage = {
  VOTER_STORAGE_KEY: "bothpls:voter:v1",
  readLocalJson: (key, fallback, validate) => memory.has(key) && validate(memory.get(key)) ? memory.get(key) : fallback,
  writeLocalJson: (key, value) => memory.set(key, structuredClone(value)),
};
globalThis.participantTestStorage = storage;
async function load(file, replacements) {
  let source = readFileSync(new URL(file, import.meta.url), "utf8");
  for (const [pattern, value] of replacements) source = source.replace(pattern, value);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
const voting = await load("../../polls/utils/voting.ts", [
  [/import \{ VOTER_STORAGE_KEY, readLocalJson, writeLocalJson \} from [^;]+;/,
    "const { VOTER_STORAGE_KEY, readLocalJson, writeLocalJson } = globalThis.participantTestStorage;"],
]);
globalThis.participantTestVoting = voting;
const issued = new Map();
let fail = false;
globalThis.participantTestClient = { rpc: async (name, { p_token }) => {
  assert.equal(name, "register_participant");
  assert.match(p_token, /^[a-f0-9]{64}$/);
  if (fail) return { data: null, error: new Error("Offline") };
  if (!issued.has(p_token)) issued.set(p_token, crypto.randomUUID());
  return { data: issued.get(p_token), error: null };
} };
const { saveParticipant, readParticipant } = await load("./participant.ts", [
  [/import \{ VOTER_STORAGE_KEY, readLocalJson, writeLocalJson \} from [^;]+;/,
    "const { VOTER_STORAGE_KEY, readLocalJson, writeLocalJson } = globalThis.participantTestStorage;"],
  [/import \{ getVoter \} from [^;]+;/, "const { getVoter } = globalThis.participantTestVoting;"],
  [/import \{ supabase \} from [^;]+;/, "const supabase = globalThis.participantTestClient;"],
]);
memory.set(storage.VOTER_STORAGE_KEY, { id: crypto.randomUUID(), nickname: "历史昵称", avatar: "🐱", participantReady: true });
assert.equal(readParticipant(), null, "A public legacy UUID alone must not authorize voting");
const first = await saveParticipant("测试昵称", "🐱");
assert.equal(readParticipant().id, first.id);
assert.match(first.participantToken, /^[a-f0-9]{64}$/);
const publicIdentity = voting.getVoter();
assert.deepEqual(Object.keys(publicIdentity).sort(), ["id", "nickname"]);
assert.ok(!JSON.stringify(publicIdentity).includes(first.participantToken), "Do not leak capability to votes/comments");
const updated = await saveParticipant("新的昵称", "🐰");
assert.equal(updated.id, first.id);
assert.equal(updated.participantToken, first.participantToken);
assert.equal(issued.size, 1, "Profile changes must not create a new voting identity");
fail = true;
await assert.rejects(saveParticipant("不能保存", "🐱"), /Offline/);
assert.equal(readParticipant().nickname, "新的昵称", "Failed registration must not overwrite stored credentials");
for (const key of ["participantTestStorage", "participantTestVoting", "participantTestClient"]) delete globalThis[key];
console.log("Passed: capability registration, legacy identity rejection, stable identity, no secret leakage, and offline preservation.");
