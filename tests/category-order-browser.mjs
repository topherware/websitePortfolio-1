import assert from 'node:assert/strict';
import { chromium } from 'playwright';
globalThis.window = {};
const { demoContent } = await import('../cms.js');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  let content = structuredClone(demoContent);
  content.site.languages.enabled = false;
  await context.route('**/config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__PORTFOLIO_CONFIG__={supabaseUrl:"https://test.supabase.co",supabaseAnonKey:"public"};' }));
  await context.route('https://test.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path === '/auth/v1/token') body = { access_token: 'token', user: { id: 'buyer', email: 'buyer@example.com' } };
    if (path === '/rest/v1/admin_users') body = [{ user_id: 'buyer' }];
    if (path.includes('portfolio_content') || path.includes('portfolio_public_content')) {
      if (route.request().method() === 'PATCH') content = route.request().postDataJSON().content;
      body = [{ content, updated_at: '2026-10-03T00:00:00Z' }];
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/admin/');
  await page.getByLabel('Email address').fill('buyer@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  for (const [tab, key] of [['Projects', 'projectCategories'], ['Experience', 'experienceCategories']]) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    const original = [...content[key]];
    const expected = [...original];
    [expected[1], expected[2]] = [expected[2], expected[1]];
    const panel = page.locator('.admin-panel.active');
    assert.equal(await panel.getByRole('button', { name: `Move ${original[1]} left`, exact: true }).isDisabled(), true);
    await panel.getByRole('button', { name: `Move ${original[1]} right`, exact: true }).click();
    assert.match(await page.locator('#save-indicator').textContent(), /Unsaved changes/);
    assert.deepEqual(await panel.locator('.category-chip > span').allTextContents(), expected);
    assert.equal(await panel.locator('[data-move-category][data-category="All"]').count(), 0);
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByText('Changes saved. Published content is now available to the public portfolio.').waitFor();
    assert.deepEqual(content[key], expected);
    const publicPage = await context.newPage();
    await publicPage.goto('http://127.0.0.1:4173/');
    const target = tab === 'Projects' ? 'projects' : 'experience';
    await publicPage.locator(`[data-filter-target="${target}"]`).waitFor();
    assert.deepEqual(await publicPage.locator(`[data-filter-target="${target}"] button`).allTextContents(), expected);
    await publicPage.close();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await panel.locator('.category-manager').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    await page.setViewportSize({ width: 1280, height: 900 });
    console.log(`PASS ${tab} reorder, All fixed, save, public order and mobile layout`);
  }
} finally { await browser.close(); }
