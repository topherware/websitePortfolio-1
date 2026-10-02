import assert from "node:assert/strict";
import { test } from "node:test";

globalThis.window = {
  __PORTFOLIO_CONFIG__: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "public-key" },
  location: { href: "https://portfolio.example/admin/" },
};
const { consumeAuthLink, verifyAdminToken, setAccountPassword, requestPasswordReset } = await import("../admin/auth.js");
const user = { id: "buyer-uuid", email: "buyer@example.com", email_confirmed_at: "2026-01-01" };
let calls;
function mock(responses) {
  calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    assert.ok(responses.length, "Unexpected API request");
    const [status, body] = responses.shift();
    return new Response(JSON.stringify(body), { status });
  };
}

test("invitation/recovery credentials are removed from the URL immediately", () => {
  for (const type of ["invite", "recovery"]) {
    let cleaned;
    const result = consumeAuthLink({ hash: `#type=${type}&access_token=secret&refresh_token=refresh`, search: "", pathname: "/admin/" }, { replaceState: (...args) => { cleaned = args; } });
    assert.deepEqual(result, { type, token: "secret" });
    assert.deepEqual(cleaned, [null, "", "/admin/"]);
  }
});

test("invalid links are cleared and rejected; ordinary login still works", () => {
  for (const hash of ["#type=signup&access_token=x", "#error=access_denied", "#type=invite"]) {
    let cleaned = false;
    assert.throws(() => consumeAuthLink({ hash, search: "", pathname: "/admin/" }, { replaceState: () => { cleaned = true; } }), /invalid or expired/);
    assert.equal(cleaned, true);
  }
  assert.equal(consumeAuthLink({ hash: "", search: "" }), null);
});

test("expired tokens fail closed before authorization query", async () => {
  mock([[401, {}]]);
  await assert.rejects(verifyAdminToken("expired"), /invalid or expired/);
  assert.equal(calls.length, 1);
});

test("valid non-admin cannot set a password through activation", async () => {
  mock([[200, user], [200, []]]);
  await assert.rejects(setAccountPassword("valid", "long-password-123"), /has not been granted/);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ options }) => options.method === "GET"));
});

test("authorization query failure cannot grant access", async () => {
  mock([[200, user], [403, {}]]);
  await assert.rejects(verifyAdminToken("valid"), /Unable to verify/);
});

test("password policy is checked before API calls", async () => {
  mock([]);
  await assert.rejects(setAccountPassword("valid", "short"), /at least 12/);
  assert.equal(calls.length, 0);
});

test("authorized password change verifies user, checks membership, updates and revokes", async () => {
  mock([[200, user], [200, [{ user_id: user.id }]], [200, user], [200, {}]]);
  await setAccountPassword("verified-token", "long-password-123");
  assert.equal(calls[2].options.method, "PUT");
  assert.deepEqual(JSON.parse(calls[2].options.body), { password: "long-password-123" });
  assert.equal(calls[2].options.headers.Authorization, "Bearer verified-token");
  assert.match(calls[3].url, /logout\?scope=global$/);
});

test("recovery uses the admin redirect and does not reveal unknown emails", async () => {
  for (const status of [200, 400, 404, 422]) {
    mock([[status, { msg: "Unknown email" }]]);
    await requestPasswordReset(" buyer@example.com ");
    assert.equal(new URL(calls[0].url).searchParams.get("redirect_to"), "https://portfolio.example/admin/");
    assert.deepEqual(JSON.parse(calls[0].options.body), { email: "buyer@example.com" });
  }
  mock([[429, {}]]);
  await assert.rejects(requestPasswordReset(user.email), /Too many requests/);
});
