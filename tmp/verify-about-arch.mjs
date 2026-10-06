import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const [record] = JSON.parse(await readFile('tmp/translation/source-public.json','utf8'));
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
for (const width of [1440,390]) {
const page=await browser.newPage({viewport:{width,height:1000}});
await page.route('**/config.js',route=>route.fulfill({contentType:'application/javascript',body:'window.__PORTFOLIO_CONFIG__={supabaseUrl:"https://about.test",supabaseAnonKey:"public"};'}));
await page.route('https://about.test/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([record])}));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.addStyleTag({content:'.reveal{opacity:1!important;transform:none!important;transition:none!important}'});
console.log(width,await page.locator('.about-visual').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el,'::before'),img=el.querySelector('img');return {width:r.width,height:r.height,archWidth:s.width,archHeight:s.height,radius:s.borderTopLeftRadius,image:img&&{width:img.naturalWidth,height:img.naturalHeight,fit:getComputedStyle(img).objectFit}}}));
await page.locator('#about').screenshot({path:`tmp/about-arch-${process.argv[2] || 'before'}-${width}.png`});
await page.close();
}
}finally{await browser.close()}
