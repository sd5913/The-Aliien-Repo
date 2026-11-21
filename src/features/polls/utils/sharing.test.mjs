import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./voting.ts", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
const { canSharePoll } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
for (const status of ["open", "closed"]) {
  const poll = { creatorId: "owner", isPublic: true, status };
  for (const account of ["", "another-account", "participant"]) {
    assert.equal(canSharePoll(poll, account), false, `${status}: public access is not sharing permission`);
  }
  assert.equal(canSharePoll(poll, "owner"), true);
}
assert.equal(canSharePoll({ isPublic: true }, ""), false);
assert.equal(canSharePoll({ creatorId: "", isPublic: true }, ""), false);
assert.equal(canSharePoll({}, "participant"), false, "Unknown visibility must not grant sharing");
assert.equal(canSharePoll({ creatorId: "owner", isPublic: false }, "participant"), true,
  "Existing unlisted-link behavior stays outside the square restriction");
console.log("Passed: public sharing restricted to owner, ended polls and unknown visibility fail closed, unlisted behavior preserved.");
