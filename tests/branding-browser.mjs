import assert from "node:assert/strict";
import { chromium } from "playwright";
globalThis.window = {};
const { demoContent } = await import("../cms.js");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext();
  let content = structuredClone(demoContent);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48"><rect width="160" height="48" fill="#fff"/><text x="8" y="33" font-size="28">CUSTOM</text></svg>';
  await context.route("**/config.js", route => route.fulfill({ contentType: "application/javascript", body: 'window.__PORTFOLIO_CONFIG__={supabaseUrl:"https://test.supabase.co",supabaseAnonKey:"public"};' }));
  await context.route("https://test.supabase.co/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/storage/v1/object/public/")) return route.fulfill({ contentType: "image/svg+xml", headers: { 'access-control-allow-origin': '*' }, body: svg });
    let body = {};
    if (path === "/auth/v1/token") body = { access_token: "token", user: { id: "buyer", email: "buyer@example.com" } };
    if (path === "/rest/v1/admin_users") body = [{ user_id: "buyer" }];
    if (path.includes("portfolio_content") || path.includes("portfolio_public_content")) {
      if (route.request().method() === "PATCH") content = route.request().postDataJSON().content;
      body = [{ content, updated_at: "2026-10-03T00:00:00Z" }];
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/admin/");
  await page.getByLabel("Email address").fill("buyer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator('.admin-brand-fallback').waitFor();
  await page.getByRole("button", { name: "Header & Footer", exact: true }).click();
  await page.locator('[data-upload-path="site.logoUrl"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from("test") });
  await page.locator('.admin-customer-logo').waitFor();
  const logo = await page.locator('.admin-customer-logo').getAttribute('src');
  await page.waitForFunction(expected => document.querySelector('link[rel="icon"]').dataset.logoSource === expected, logo);
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('type'), 'image/png');
  const alpha = await page.evaluate(async () => {
    const img = new Image(); img.src = document.querySelector('link[rel="icon"]').href; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    return [ctx.getImageData(0, 0, 1, 1).data[3], ctx.getImageData(32, 32, 1, 1).data[3]];
  });
  assert.deepEqual(alpha, [0, 255]);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByText('Changes saved. Published content is now available to the public portfolio.').waitFor();
  for (const path of ['/', '/project.html?slug=test', '/admin/']) {
    const tab = await context.newPage();
    await tab.goto(`http://127.0.0.1:4173${path}`);
    await tab.waitForFunction(expected => document.querySelector('link[rel="icon"]').dataset.logoSource === expected && document.querySelector('link[rel="icon"]').href.startsWith('data:image/png'), logo);
    await tab.close();
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.deepEqual(await page.locator('.admin-customer-logo').evaluate(img => {
      const style = getComputedStyle(img);
      return [style.objectFit, style.borderRadius, style.width === style.height];
    }), ['cover', '50%', true]);
  }
  await page.evaluate(async () => { const { updateFavicon } = await import('/branding.js'); updateFavicon('javascript:alert(1)'); });
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), '../favicon.svg');
  console.log('PASS uploaded branding, saved favicon on public/project/login pages, safe fallback and proportional logo');
} finally { await browser.close(); }
