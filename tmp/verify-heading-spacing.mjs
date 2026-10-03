import { chromium } from '../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
globalThis.window = {};
const { demoContent } = await import('../cms.js');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route('**/config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__PORTFOLIO_CONFIG__={};' }));
    for (const [url, selector, text] of [
      ['/', '.hero-heading', 'I am Christopher Cuangdinata,\nProduct Manager'],
      [`/project.html?slug=${demoContent.projects[0].slug}`, '.project-detail-hero h1', 'EASE: Easing Anxiety Supporting Each'],
    ]) {
      await page.goto('http://127.0.0.1:4173' + url);
      await page.locator(selector).waitFor();
      await page.evaluate(async ({ selector, text }) => {
        await document.fonts.ready; document.querySelector(".page-transition")?.remove();
        const heading = document.querySelector(selector);
        heading.textContent = text;
        heading.style.whiteSpace = 'pre-line';
        document.querySelectorAll('.reveal').forEach(el => { el.style.transition = 'none'; el.style.transform = 'none'; el.style.opacity = '1'; });
      }, {selector, text});
      const result = await page.locator(selector).evaluate(el => {
        const css = getComputedStyle(el);
        return { height: parseFloat(css.lineHeight) / parseFloat(css.fontSize), spacing: parseFloat(css.letterSpacing) / parseFloat(css.fontSize), overflow: el.scrollWidth > el.clientWidth + 1 };
      });
      assert.ok(result.height >= 1.1);
      assert.ok(result.spacing >= -0.026);
      assert.equal(result.overflow, false);
      if (width === 1440 || width === 390) await page.locator(selector).screenshot({ path: `tmp/heading-${selector.includes('hero-heading') ? 'home' : 'project'}-${width}.png` });
      console.log(`PASS ${width}px ${selector}`);
    }
    await page.close();
  }
} finally { await browser.close(); }
