import { chromium } from '../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route('**/config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__PORTFOLIO_CONFIG__={};' }));
    await page.goto('http://127.0.0.1:4173/');
    await page.locator('.about-copy').waitFor();
    for (const length of ['short', 'long']) {
      const result = await page.evaluate(length => {
        const copy = document.querySelector('.about-copy');
        copy.querySelectorAll('p:not(.eyebrow)').forEach(p => p.textContent = length === 'short' ? 'A short introduction.' : 'I work across technology, business and design to improve processes and create practical experiences for people. '.repeat(8));
        document.querySelectorAll('.reveal').forEach(el => { el.style.transition = 'none'; el.style.transform = 'none'; el.style.opacity = '1'; });
        const section = document.querySelector('#about').getBoundingClientRect();
        const button = copy.querySelector('.button').getBoundingClientRect();
        const visual = document.querySelector('.about-visual').getBoundingClientRect();
        return { bottomGap: section.bottom - button.bottom, photoGap: section.bottom - visual.bottom, photoTopGap: visual.top - button.bottom, overflow: document.documentElement.scrollWidth > innerWidth };
      }, length);
      assert.ok(result.bottomGap >= 31, JSON.stringify({width, length, result}));
      assert.ok(Math.abs(result.photoGap) < 2, JSON.stringify({width, length, result}));
      assert.equal(result.overflow, false);
      if (width <= 820) assert.ok(result.photoTopGap >= 35);
      console.log(`PASS ${width}px ${length}: button bottom gap ${Math.round(result.bottomGap)}px`);
    }
    if (width === 1440) await page.locator('#about').screenshot({ path: 'tmp/about-long-spacing.png' });
    await page.close();
  }
} finally { await browser.close(); }
