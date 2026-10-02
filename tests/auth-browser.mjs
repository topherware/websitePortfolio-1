import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = "http://127.0.0.1:4173/admin/";
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/config.js", (route) => route.fulfill({ contentType: "application/javascript", body: 'window.__PORTFOLIO_CONFIG__ = { supabaseUrl: "https://test.supabase.co", supabaseAnonKey: "public" };' }));
    let authorized = true;
    let updated = 0;
    await page.route("https://test.supabase.co/**", async (route) => {
      const url = new URL(route.request().url());
      let body = {};
      if (url.pathname === "/auth/v1/user") {
        if (route.request().method() === "PUT") {
          assert.equal(route.request().postDataJSON().password, "buyer-password-123");
          updated++;
        }
        body = { id: "buyer", email: "buyer@example.com", email_confirmed_at: "2026-01-01" };
      } else if (url.pathname === "/rest/v1/admin_users") body = authorized ? [{ user_id: "buyer" }] : [];
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(`${base}#type=invite&access_token=test-token&refresh_token=test-refresh`);
    await page.getByRole("heading", { name: "Activate your portfolio" }).waitFor();
    assert.equal(page.url(), base);
    await page.getByLabel("New password", { exact: true }).fill("buyer-password-123");
    await page.getByLabel("Confirm password").fill("different-password");
    await page.getByRole("button", { name: "Save password" }).click();
    await page.getByText("Passwords do not match.", { exact: true }).waitFor();
    assert.equal(updated, 0);
    await page.getByLabel("Confirm password").fill("buyer-password-123");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: `artifacts/qa/activation-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Save password" }).click();
    await page.getByText("Password saved. Sign in with your email and new password.").waitFor();
    assert.equal(updated, 1);
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByLabel("Email address").fill("buyer@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await page.getByText("If this email is registered, a reset link will be sent. Check your inbox and spam folder.").waitFor();
    await page.goto(`${base}#type=recovery&access_token=test-token`);
    await page.getByRole("heading", { name: "Create a new password" }).waitFor();
    await page.getByLabel("New password", { exact: true }).fill("buyer-password-123");
    await page.getByLabel("Confirm password").fill("buyer-password-123");
    await page.getByRole("button", { name: "Save password" }).click();
    await page.getByText("Password saved. Sign in with your email and new password.").waitFor();
    assert.equal(updated, 2);
    authorized = false;
    await page.goto(`${base}#type=invite&access_token=non-admin`);
    await page.getByText("Administrator access has not been granted. Contact the seller, then reopen your link.").waitFor();
    assert.equal(await page.locator("#new-password").count(), 0);
    await page.goto(`${base}#error=access_denied&error_description=expired`);
    await page.getByText("This link is invalid or expired. Request a new invitation or password reset.").waitFor();
    assert.equal(page.url(), base);
    assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })), { local: 0, session: 0 });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS activation, recovery, denied access and layout at ${width}px`);
  }
} finally {
  await browser.close();
}
