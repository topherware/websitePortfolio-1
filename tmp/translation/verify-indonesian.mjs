import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const [record] = JSON.parse(await readFile("tmp/translation/source-public.json", "utf8"));
let content = structuredClone(record.content);
let revision = record.updated_at;
let saved = null;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
await context.route("**/config.js", route => route.fulfill({
  contentType: "application/javascript", body: 'window.__PORTFOLIO_CONFIG__={supabaseUrl:"https://translation.test",supabaseAnonKey:"public"};',
}));
await context.route("https://translation.test/**", async route => {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  let body = {};
  if (pathname === "/auth/v1/token") body = { access_token: "test-token", user: { id: "test-admin", email: "test@example.com" } };
  if (pathname === "/rest/v1/admin_users") body = [{ user_id: "test-admin" }];
  if (pathname.includes("portfolio_content") || pathname.includes("portfolio_public_content")) {
    if (request.method() === "PATCH") {
      saved = request.postDataJSON().content;
      content = structuredClone(saved);
      revision = "2026-10-06T08:00:00Z";
    }
    body = [{ content, updated_at: revision }];
  }
  await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
});
await mkdir("artifacts/qa", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    await page.locator('.language-switch--id').waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), "id");
    assert.match(await page.locator(".hero-heading").textContent(), /Manajer Produk/);
    const normalized = await page.evaluate(async () => (await import("/cms.js")).loadContent());
    for (const project of normalized.projects) {
      assert.ok(project.titleId && project.descriptionId && project.challengeId, `${project.title}: missing Indonesian project copy`);
    }
    for (const experience of normalized.experiences) {
      assert.ok(experience.titleId);
      assert.equal(experience.descriptionsId.length, experience.descriptions.length, `${experience.title}: missing responsibility`);
      assert.equal(experience.skillsId.length, experience.skills.length, `${experience.title}: missing skill`);
    }
    for (const certificate of normalized.certificates) assert.ok(certificate.titleId && certificate.categoryId);
    assert.deepEqual(await page.locator(".skill-list span").first().textContent(), "Manajemen Produk");
    assert.deepEqual(await page.locator("#experience .filter-button").allTextContents(), ["Pekerjaan", "Organisasi", "Relawan", "Kepemimpinan", "Universitas"]);
    assert.match(await page.locator(".certificate-card h3").first().textContent(), /Juara Kedua/);
    assert.match(await page.locator(".certificate-meta").nth(1).textContent(), /Penerbit belum diisi/);
    assert.equal(await page.locator('.social-link[aria-label="WhatsApp"] path').count(), 1);
    assert.equal(await page.locator('.social-link[aria-label="WhatsApp"] path').getAttribute("stroke"), "none");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.evaluate(() => document.querySelectorAll(".reveal").forEach(element => {
      element.style.transition = "none";
      element.classList.add("visible");
    }));
    for (const section of ["experience", "contact", "certificates"]) {
      await page.locator(`#${section}`).screenshot({ path: `artifacts/qa/indonesian-${section}-${width}.png` });
    }
    await page.locator('[data-language="en"]').click();
    assert.match(await page.locator(".hero-heading").textContent(), /Product Manager/);
    assert.equal(await page.locator(".skill-list span").first().textContent(), "Product Management");
    await page.locator('[data-language="id"]').click();
    await page.goto("http://127.0.0.1:4173/project.html?slug=mental%20health%20support", { waitUntil: "networkidle" });
    assert.match(await page.locator(".project-detail-hero p").last().textContent(), /kesehatan mental digital/);
    assert.match(await page.locator(".project-story-card p").nth(1).textContent(), /Tombol Panik/);
    assert.doesNotMatch(await page.locator(".project-story").textContent(), /pemesanan|pembayaran/);
    await page.locator('[data-language="en"]').click();
    assert.match(await page.locator(".project-detail-hero p").last().textContent(), /digital mental health platform/);
    await page.evaluate(() => localStorage.removeItem("portfolio-language"));
    console.log(`PASS ${width}px: all 12 projects, 24 experiences, 12 certificates translated; ID/EN switch, detail copy, categories, skills, WhatsApp icon and layout`);
    await page.close();
  }
  // Authentication and saving below are mocked; no production write is attempted.
  const admin = await context.newPage();
  await admin.goto("http://127.0.0.1:4173/admin/", { waitUntil: "networkidle" });
  await admin.getByLabel("Email address").fill("test@example.com");
  await admin.getByLabel("Password", { exact: true }).fill("test-password");
  await admin.getByRole("button", { name: "Sign in", exact: true }).click();
  await admin.locator('.notice').waitFor();
  assert.match(await admin.locator("#save-indicator").textContent(), /Unsaved changes/);
  await admin.locator('[data-tab="experience"]').click();
  await admin.locator('[data-panel="experience"] [data-edit="experience"]').first().click();
  assert.equal(await admin.locator('[name="titleId"]').inputValue(), "Magang Manajer Produk");
  assert.equal(await admin.locator('[name="skillsId[]"]').first().inputValue(), "Manajemen Produk");
  await admin.locator('[name="skillsId[]"]').first().fill("Pengelolaan Produk");
  await admin.getByRole("button", { name: "Apply changes", exact: true }).click();
  await admin.getByRole("button", { name: "Save changes", exact: true }).click();
  await admin.getByText("Changes saved. Published content is now available to the public portfolio.").waitFor();
  assert.equal(await admin.locator("#save-indicator").textContent(), "test@example.com");
  assert.ok(saved?.indonesianImportVersion);
  assert.equal(saved.experiences[0].skillsId[0], "Pengelolaan Produk");
  assert.equal(saved.projects[0].description, record.content.projects[0].description);
  assert.match(saved.projects[0].descriptionId, /kesehatan mental/);
  assert.equal(saved.projects.length, record.content.projects.length);
  assert.equal(saved.experiences.length, record.content.experiences.length);
  console.log("PASS mocked CMS: pending import is visible, Indonesian skills editable, full save preserves English and all records");
  await admin.close();
} finally { await browser.close(); }
