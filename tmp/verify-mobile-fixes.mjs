import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const [record] = JSON.parse(await readFile("tmp/translation/source-public.json", "utf8"));
await mkdir("artifacts/qa/mobile-fixes", { recursive: true });
const useWebKit = process.argv.includes("--webkit");
const browser = useWebKit ? await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE } : {}) }) : await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [320, 375, 390, 414, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: "reduce", ...(useWebKit ? { isMobile: true, hasTouch: true } : {}) });
    await page.route("**/config.js", route => route.fulfill({ contentType: "application/javascript", body: 'window.__PORTFOLIO_CONFIG__={supabaseUrl:"https://mobile.test",supabaseAnonKey:"public"};' }));
    await page.route("https://mobile.test/**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify([record]) }));
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    await page.locator(".hero-heading").waitFor();
    const state = await page.evaluate(() => {
      const rect = element => { const {x,y,width,height,right,bottom}=element.getBoundingClientRect();return {x,y,width,height,right,bottom}; };
      return {
        lang: document.documentElement.lang,
        comma: document.querySelector(".hero-punctuation")?.parentElement.textContent,
        highlight: rect(document.querySelector("#highlight .section-heading-row > div")),
        container: rect(document.querySelector("#highlight .container")),
        header: rect(document.querySelector(".site-header")),
        nav: rect(document.querySelector(".nav-shell")),
        menu: rect(document.querySelector(".menu-toggle")),
        language: rect(document.querySelector(".language-switch")),
        brand: rect(document.querySelector(".nav-shell .brand")),
        overflow: document.documentElement.scrollWidth - innerWidth,
        arrowCount: document.querySelectorAll("svg.arrow").length,
        arrowText: [...document.querySelectorAll(".arrow")].map(el => el.textContent),
        menuSvg: document.querySelectorAll(".menu-toggle svg").length,
        theme: document.querySelector('meta[name="theme-color"]')?.content,
      };
    });
    console.log(width, JSON.stringify(state));
    assert.equal(state.lang, "en", `${width}: English should be the default`);
    assert.match(state.comma || "", /Cuangdinata,$/, `${width}: comma must stay attached to the last name`);
    assert.ok(Math.abs(state.highlight.x-state.container.x)<1, `${width}: highlight heading is not left aligned`);
    assert.equal(state.menuSvg,1);
    assert.ok(state.arrowCount>0 && state.arrowText.every(value=>value === ""));
    assert.equal(state.theme,"#ffffff");
    assert.equal(state.overflow,0);
    assert.ok(state.brand.right <= state.menu.x && state.menu.right <= state.nav.right);
    assert.ok(Math.abs(state.nav.height-state.language.height)<1);
    await page.locator(".menu-toggle").click();
    assert.equal(await page.locator(".menu-toggle").getAttribute("aria-expanded"),"true");
    const links = await page.locator(".nav-list.open .nav-link").evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
    assert.equal(links.length,6);
    for(let i=1;i<links.length;i++) assert.ok(links[i].top>=links[i-1].bottom-1,`${width}: menu links overlap`);
    await page.screenshot({path:`artifacts/qa/mobile-fixes/menu-${useWebKit ? "webkit-" : ""}${width}.png`});
    await page.locator(".menu-toggle").click();
    await page.addStyleTag({content:'.reveal { opacity: 1 !important; transform: none !important; transition: none !important; }'});
    await page.locator(".hero").screenshot({path:`artifacts/qa/mobile-fixes/hero-${useWebKit ? "webkit-" : ""}${width}.png`});
    await page.locator("#highlight").screenshot({path:`artifacts/qa/mobile-fixes/highlight-${useWebKit ? "webkit-" : ""}${width}.png`});
    await page.locator('[data-language="id"]').click();
    assert.equal(await page.locator("html").getAttribute("lang"),"id");
    await page.close();
    console.log(`PASS ${width}px: left heading, attached comma, English default, menu geometry, SVG icons, white browser theme and language switch`);
  }
} finally { await browser.close(); }
