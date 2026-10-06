import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

globalThis.window = {};
const { demoContent } = await import("../cms.js");
const content = structuredClone(demoContent);
content.experienceCategories = ["All", "Work", "Volunteer"];
content.projectCategories = ["All", "Product Design", "Research"];
content.contact.socials = [
  { platform: "LinkedIn", url: "https://www.linkedin.com/" },
  { platform: "Instagram", url: "https://www.instagram.com/" },
  { platform: "WhatsApp", url: "https://wa.me/628123456789" },
];
content.experiences = Array.from({ length: 6 }, (_, i) => ({
  ...content.experiences[0], id: `experience-${i}`, organization: `Organization ${i}`,
  category: i < 5 ? "Work" : "Volunteer", status: "published",
}));
content.projects = Array.from({ length: 7 }, (_, i) => ({
  ...content.projects[0], id: `project-${i}`, slug: `project-${i}`, title: `Project ${i}`,
  category: i < 5 ? "Product Design" : "Research", status: "published",
}));
content.certificates = Array.from({ length: 7 }, (_, i) => ({
  ...content.certificates[0], id: `certificate-${i}`, title: `Certificate ${i}`, status: "published",
}));
for (const key of ["experiences", "projects", "certificates"]) {
  content[key].push({ ...content[key][0], status: "draft" });
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir("artifacts/qa", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/config.js", route => route.fulfill({
      contentType: "application/javascript",
      body: 'window.__PORTFOLIO_CONFIG__={supabaseUrl:"https://test.supabase.co",supabaseAnonKey:"public"};',
    }));
    await page.route("https://test.supabase.co/**", route => route.fulfill({
      contentType: "application/json", body: JSON.stringify([{ content }]),
    }));
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-filter-target="experience"] [data-filter="All"]').count(), 0);
    assert.equal(await page.locator('[data-filter-target="experience"] .active').textContent(), "Work");
    for (const [target, limit, total, label] of [
      ["experience", 2, 5, "View more"], ["projects", 3, 7, "Show all"], ["certificates", 3, 7, "Show more"],
    ]) {
      const visible = page.locator(`#${target}-list > article:visible`);
      const toggle = page.locator(`[data-list-toggle="${target}"]`);
      assert.equal(await visible.count(), limit);
      assert.equal(await toggle.textContent(), label);
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      await toggle.click();
      assert.equal(await visible.count(), total);
      assert.equal(await toggle.textContent(), "Show less");
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      await toggle.click();
      assert.equal(await visible.count(), limit);
    }
    // Expanded category changes must reset the limit; short categories need no toggle.
    for (const [target, largeCategory, smallCategory, limit] of [
      ["experience", "Work", "Volunteer", 2], ["projects", "Product Design", "Research", 3],
    ]) {
      const toggle = page.locator(`[data-list-toggle="${target}"]`);
      await toggle.click();
      await page.locator(`[data-filter-target="${target}"] [data-filter="${smallCategory}"]`).click();
      assert.equal(await toggle.isVisible(), false);
      assert.ok((await page.locator(`#${target}-list > article:visible`).evaluateAll(cards => cards.map(card => card.dataset.category))).every(category => category === smallCategory));
      await page.locator(`[data-filter-target="${target}"] [data-filter="${largeCategory}"]`).click();
      assert.equal(await page.locator(`#${target}-list > article:visible`).count(), limit);
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    }
    const lastTimelineStyle = await page.locator(".timeline-item.last-visible").evaluate(card => ({
      content: getComputedStyle(card, "::before").content, margin: getComputedStyle(card).marginBottom,
    }));
    assert.equal(lastTimelineStyle.content, "none");
    assert.equal(lastTimelineStyle.margin, "0px");
    assert.equal(await page.locator(".social-link svg").count(), 3);
    assert.deepEqual(await page.locator(".social-link").allTextContents(), ["", "", ""]);
    assert.deepEqual(await page.locator(".social-link").evaluateAll(links => links.map(link => link.getAttribute("aria-label"))), ["LinkedIn", "Instagram", "WhatsApp"]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.evaluate(() => document.querySelectorAll(".reveal").forEach(card => card.classList.add("visible")));
    for (const section of ["experience", "projects", "certificates", "contact"]) {
      await page.locator(`#${section}`).screenshot({ path: `artifacts/qa/collections-${section}-${width}.png` });
    }
    await page.locator('[data-language="id"]').click();
    assert.equal(await page.locator('[data-list-toggle="experience"]').textContent(), "Lihat lebih banyak");
    await page.locator('[data-list-toggle="experience"]').click();
    assert.equal(await page.locator('[data-list-toggle="experience"]').textContent(), "Tampilkan lebih sedikit");
    assert.equal(await page.locator('[data-list-toggle="projects"]').textContent(), "Tampilkan semua");
    assert.equal(await page.locator('[data-list-toggle="certificates"]').textContent(), "Tampilkan lebih banyak");
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: limits, expand/collapse, category reset, short categories, draft exclusion, timeline, social icons, translation and layout`);
    await page.close();
  }
} finally { await browser.close(); }
