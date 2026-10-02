import assert from "node:assert/strict";
import { test } from "node:test";
globalThis.window = { __PORTFOLIO_CONFIG__: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "public-key" } };
const { uploadFile } = await import("../cms.js");
const file = new File(["image"], "logo.png", { type: "image/png" });
test("storage failures produce actionable errors including non-JSON responses", async () => {
  for (const [status, body, expected] of [
    [400, { message: "Bucket not found" }, /create the bucket/],
    [400, { message: "new row violates row-level security policy" }, /Storage INSERT policy/],
    [401, { message: "JWT expired" }, /sign in again/],
    [502, null, /Upload failed \(502\)/],
  ]) {
    globalThis.fetch = async () => new Response(body ? JSON.stringify(body) : "Bad Gateway", { status });
    await assert.rejects(uploadFile(file, "logos", "token"), expected);
  }
});
test("upload timeout aborts request and reports a retryable error", async () => {
  const originalSet = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  let cleared = false;
  globalThis.setTimeout = (fn, ms) => { assert.equal(ms, 60000); queueMicrotask(fn); return 123; };
  globalThis.clearTimeout = (id) => { assert.equal(id, 123); cleared = true; };
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
  try { await assert.rejects(uploadFile(file, "logos", "token"), /timed out after 60 seconds/); assert.ok(cleared); }
  finally { globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; }
});
test("success returns public URL and preserves authenticated upload", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/storage\/v1\/object\/portfolio\/logos\//);
    assert.equal(options.headers.Authorization, "Bearer token");
    assert.equal(options.body, file);
    return new Response('{}', { status: 200 });
  };
  assert.match(await uploadFile(file, "logos", "token"), /\/object\/public\/portfolio\/logos\/.*\.png$/);
});
