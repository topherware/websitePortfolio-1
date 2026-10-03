import { chromium } from '../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1920, 1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route('**/config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__PORTFOLIO_CONFIG__={};' }));
    await page.goto('http://127.0.0.1:4173/');
    await page.locator('.hero-heading').waitFor();
    const result = await page.evaluate(async () => {
      await document.fonts.ready;
      document.querySelector('.page-transition')?.remove();
      const title = document.querySelector('.hero-heading');
      title.innerHTML = 'I am <span class="name">Christopher Cuangdinata</span>,<br />Product Manager';
      const measure = () => ({font: parseFloat(getComputedStyle(title).fontSize), height: title.getBoundingClientRect().height, photoTop: document.querySelector('.portrait-stage').getBoundingClientRect().top});
      const current = measure();
      title.style.fontSize = innerWidth <= 600 ? 'clamp(2.85rem, 14vw, 4.5rem)' : 'clamp(3.2rem, 7.25vw, 7.25rem)';
      if (innerWidth > 820) title.style.maxWidth = '850px';
      const previous = measure();
      title.style.removeProperty('font-size'); title.style.removeProperty('max-width');
      return {current, previous, overflow: document.documentElement.scrollWidth > innerWidth};
    });
    assert.ok(result.current.font < result.previous.font);
    assert.ok(result.current.photoTop < result.previous.photoTop);
    assert.equal(result.overflow, false);
    console.log(`PASS ${width}px: font ${result.current.font}px, photo ${Math.round(result.previous.photoTop - result.current.photoTop)}px higher`);
    if (width === 1440 || width === 390) await page.screenshot({path:`tmp/hero-smaller-${width}.png`});
    await page.close();
  }
} finally { await browser.close(); }
