import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./voting.ts", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
const { canSharePoll } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
for (const isPublic of [true, false, undefined]) {
  for (const status of ["open", "closed"]) {
    const poll = { creatorId: "owner", isPublic, status };
    for (const account of ["", "another-account", "participant"]) {
      assert.equal(canSharePoll(poll, account), false, `${status}/${isPublic}: only the owner can share`);
    }
    assert.equal(canSharePoll(poll, "owner"), true);
  }
}
assert.equal(canSharePoll({ isPublic: true }, ""), false);
assert.equal(canSharePoll({ creatorId: "", isPublic: true }, ""), false);
assert.equal(canSharePoll({}, "participant"), false, "Unknown visibility must not grant sharing");
assert.equal(canSharePoll({ creatorId: "owner", isPublic: false }, "participant"), false,
  "Taking a poll off the square must not grant sharing to its participants");
console.log("Passed: sharing requires ownership regardless of visibility, state or participation.");
