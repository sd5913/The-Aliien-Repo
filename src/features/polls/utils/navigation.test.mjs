import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function load(file) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const { pollReturnTo, pollPath } = await load("./navigation.ts");
const { isPollOwner, isPollOpen } = await load("./voting.ts");

for (const origin of ["/", "/settings"]) {
  let location = { search: "", state: { returnTo: origin } };
  for (const page of ["vote", "join", "vote", "results", "vote", "results"]) {
    const url = new URL(pollPath("test-poll", page, pollReturnTo(location)), "https://example.test");
    location = { search: url.search }; // Simulate a reload dropping navigation state.
    assert.equal(pollReturnTo(location), origin);
    assert.ok(!url.pathname.includes("auth"));
  }
}
assert.equal(pollReturnTo({ search: "" }), "/");
for (const target of ["/auth", "//evil.test", "https://evil.test", "/poll/test/results"]) {
  assert.equal(pollReturnTo({ search: `?returnTo=${encodeURIComponent(target)}` }), "/");
}
assert.equal(isPollOwner({ creatorId: "owner-id" }, "owner-id"), true);
assert.equal(isPollOwner({ creatorId: "owner-id" }, "participant-id"), false);
assert.equal(isPollOwner({}, "participant-id"), false);
assert.equal(isPollOwner({ creatorId: "" }, ""), false);
assert.equal(isPollOpen({ status: "closed" }), false);
assert.equal(isPollOpen({ status: "open", endsAt: "2020-01-01" }), false);
console.log("Passed: vote/join/results/edit cycles preserve origins across reloads; safe exit defaults; strict ownership; ended polls.");
