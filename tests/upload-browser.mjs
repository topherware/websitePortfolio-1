import assert from "node:assert/strict";
import { chromium } from "playwright";
globalThis.window = {};
const { demoContent } = await import("../cms.js");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  let attempts = 0;
  await page.route("**/config.js", route => route.fulfill({ contentType: "application/javascript", body: 'window.__PORTFOLIO_CONFIG__={supabaseUrl:"https://test.supabase.co",supabaseAnonKey:"public"};' }));
  await page.route("https://test.supabase.co/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {}, status = 200;
    if (path === "/auth/v1/token") body = { access_token: "token", user: { id: "buyer", email: "buyer@example.com" } };
    if (path === "/rest/v1/admin_users") body = [{ user_id: "buyer" }];
    if (path === "/rest/v1/portfolio_content") body = [{ content: demoContent, updated_at: "2026-10-02T00:00:00Z" }];
    if (path.startsWith("/storage/v1/object/portfolio/")) {
      attempts++;
      if (attempts <= 2) { status = 400; body = { message: "Bucket not found" }; }
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("http://127.0.0.1:4173/admin/");
  await page.getByLabel("Email address").fill("buyer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Header & Footer", exact: true }).click();
  const input = page.locator('[data-upload-path="site.logoUrl"]');
  const field = page.locator('.upload-field').filter({ has: input });
  const file = { name: "logo.png", mimeType: "image/png", buffer: Buffer.from("test") };
  for (let i = 0; i < 2; i++) {
    await input.setInputFiles(file);
    await field.getByRole("alert").waitFor();
    assert.equal(await field.locator('[data-upload-status]').count(), 1);
    assert.equal(await field.getByText("Uploading...", { exact: true }).count(), 0);
    assert.equal(await input.isEnabled(), true);
    assert.equal(await input.inputValue(), "");
  }
  await input.setInputFiles(file);
  await page.getByText("Upload complete. Save changes to attach the uploaded URL to the CMS record.").waitFor();
  assert.equal(attempts, 3);
  assert.equal(await field.locator('[data-upload-status]').count(), 0);
  console.log("PASS upload error cleanup, same-file retry, and success");
} finally { await browser.close(); }
