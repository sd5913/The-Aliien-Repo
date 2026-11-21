import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

// Exercise the real PostgREST URL builder with a controlled database response.
const serverNow = "2026-11-21T10:00:00.000Z";
const rows = [
  { id: "private", is_public: false, status: "open", closed_at: null },
  { id: "manual", is_public: true, status: "closed", closed_at: null },
  { id: "past", is_public: true, status: "open", closed_at: "2026-11-21T09:59:59.999Z" },
  { id: "boundary", is_public: true, status: "open", closed_at: serverNow },
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `active-${index}`, is_public: true, status: "open",
    closed_at: index % 2 ? "2026-11-22T00:00:00.000Z" : null,
  })),
].map((row, index) => ({
  title: row.id, description: null, owner_id: null,
  created_at: `2026-11-${String(21 - index).padStart(2, "0")}T00:00:00.000Z`,
  poll_options: [], votes: [{ count: index }], ...row,
}));

let missingColumnCode = null;
let failure = false;
let empty = false;
const requests = [];
const client = createClient("https://square.test", "test-publishable-key", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (input) => {
    const url = new URL(input);
    requests.push(url);
    const json = (body, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { "Content-Type": "application/json" },
    });
    if (failure) return json({ code: "42501", message: "denied" }, 403);
    if (missingColumnCode && url.searchParams.get("select").includes("visibility_reviewed_at")) {
      return json({ code: missingColumnCode, message: "column polls.visibility_reviewed_at does not exist" }, 400);
    }
    assert.equal(url.pathname, "/rest/v1/polls");
    const params = url.searchParams;
    assert.equal(params.get("is_public"), "eq.true");
    assert.equal(params.get("status"), "eq.open");
    assert.equal(params.get("or"), "(closed_at.is.null,closed_at.gt.now)");
    assert.equal(params.get("order"), "created_at.desc,id.desc");
    assert.equal(params.get("limit"), "5");
    // Ineligible rows occupy the newest slots: limiting before filtering would
    // return fewer than five valid cards. Equality at the deadline is ended.
    return json(empty ? [] : rows.filter((row) => row.is_public && row.status === "open"
      && (!row.closed_at || row.closed_at > serverNow)).slice(0, 5));
  } },
});
globalThis.squareTestClient = client;
const source = readFileSync(new URL("./polls.ts", import.meta.url), "utf8")
  .replace(/import \{ readParticipant \} from [^;]+;/, "const readParticipant = () => null;")
  .replace(/import \{ supabase \} from [^;]+;/, "const supabase = globalThis.squareTestClient;");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
const { fetchSquarePolls } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

const expected = Array.from({ length: 5 }, (_, index) => `active-${index}`);
const cards = await fetchSquarePolls();
assert.deepEqual(cards.map((card) => card.id), expected);
assert.equal(cards[0].voteCount, 4);
assert.equal(cards[0].endsAt, undefined);
assert.equal(cards[1].endsAt, "2026-11-22T00:00:00.000Z");
assert.equal(requests.length, 1);
for (const code of ["42703", "PGRST204"]) {
  requests.length = 0;
  missingColumnCode = code;
  assert.deepEqual((await fetchSquarePolls()).map((card) => card.id), expected);
  assert.equal(requests.length, 2);
  assert.ok(!requests[1].searchParams.get("select").includes("visibility_reviewed_at"));
}
missingColumnCode = null;
empty = true;
assert.deepEqual(await fetchSquarePolls(), []);
failure = true;
requests.length = 0;
await assert.rejects(fetchSquarePolls(), (error) => error.code === "42501");
assert.equal(requests.length, 1, "Permission errors must not trigger a legacy fallback");
delete globalThis.squareTestClient;
console.log("Passed: active public square, strict server deadline, filter before limit, legacy fallback, empty state and errors.");
