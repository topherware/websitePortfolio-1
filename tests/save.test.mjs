import assert from "node:assert/strict";
import { test } from "node:test";

globalThis.window = { __PORTFOLIO_CONFIG__: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "public-key" } };
const { loadContentRecord, saveContent } = await import("../cms.js");
let calls;
function mock(responses) {
  calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    assert.ok(responses.length, "Unexpected request");
    const [status, body] = responses.shift();
    return new Response(JSON.stringify(body), { status });
  };
}

test("admin does not edit demo content when site is absent or unreadable", async () => {
  mock([[200, []]]);
  await assert.rejects(loadContentRecord("admin-token"), /site.*missing or inaccessible/);
});
test("public site keeps its demo fallback before initialization", async () => {
  mock([[200, []]]);
  const record = await loadContentRecord();
  assert.ok(record.content.home);
});
test("empty update caused by missing row reports setup rather than conflict", async () => {
  mock([[200, []], [200, []]]);
  await assert.rejects(saveContent({}, "admin-token", "old"), /site.*missing or inaccessible/);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, undefined);
});
test("a changed revision remains a conflict without an unconditional retry", async () => {
  mock([[200, []], [200, [{ updated_at: "new" }]]]);
  await assert.rejects(saveContent({}, "admin-token", "old"), /Save conflict/);
  assert.equal(calls.filter(c => c.options.method === "PATCH").length, 1);
});
test("unchanged revision with no update reports authorization policy problem", async () => {
  mock([[200, []], [200, [{ updated_at: "old" }]]]);
  await assert.rejects(saveContent({}, "admin-token", "old"), /update policy/);
});
test("successful save keeps exact revision filter and returns persisted revision", async () => {
  const revision = "2026-10-02T12:00:00.123456+00:00";
  mock([[200, [{ updated_at: "new", content: { title: "Saved" } }]]]);
  const saved = await saveContent({ title: "Saved" }, "admin-token", revision);
  assert.equal(saved.updated_at, "new");
  assert.equal(new URL(calls[0].url).searchParams.get("updated_at"), `eq.${revision}`);
  assert.equal(calls.length, 1);
});
