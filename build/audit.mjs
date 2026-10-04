/* Performance + payload audit. Reports what a real browser actually does.
 *   node build/audit.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(BUILD);
const B = 'http://127.0.0.1:4173';
const PAGES = ['index.html', 'nuts.html', 'about.html', 'retailers.html',
               'distributors.html', 'contact.html', 'legal.html', '404.html'];

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

/* ---- on-disk asset budget ------------------------------------------- */
const walk = (d, out = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push([p, statSync(p).size]);
  }
  return out;
};

const groups = {};
for (const sub of ['css', 'js', 'fonts', 'img']) {
  let files = [];
  try { files = walk(join(ROOT, 'assets', sub)); } catch {}
  const total = files.reduce((n, [, s]) => n + s, 0);
  const biggest = files.sort((a, b) => b[1] - a[1])[0] || ['', 0];
  groups[sub] = { total, n: files.length, biggest };
  if (sub === 'fonts' || sub === 'img') {
    groups[sub].all = files;
  }
}

console.log('=== ASSET BUDGET (on disk) ===');
let grand = 0;
for (const [k, v] of Object.entries(groups)) {
  console.log(`  ${k.padEnd(6)} ${String(v.n).padStart(3)} files  ${kb(v.total).padStart(10)}   largest: ${v.biggest[0]} ${kb(v.biggest[1])}`);
  grand += v.total;
}
console.log(`  ${'ALL'.padEnd(6)} ${String(Object.values(groups).reduce((a, v) => a + v.n, 0)).padStart(3)} files  ${kb(grand).padStart(10)}`);

console.log('\n=== FONT FACES ON DISK ===');
groups.fonts.all.sort((a, b) => b[1] - a[1]).forEach(([p, s]) =>
  console.log(`  ${p.split(/[\\/]/).pop().padEnd(34)} ${kb(s).padStart(9)}`));

console.log('\n=== LARGEST IMAGES ===');
groups.img.all.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([p, s]) =>
  console.log(`  ${p.split(/[\\/]/).pop().padEnd(34)} ${kb(s).padStart(9)}`));

/* ---- what the browser actually pulls, per page ---------------------- */
const browser = await chromium.launch({ channel: 'chrome' });
console.log('\n=== PER-PAGE PAYLOAD (first visit, no cache) ===');
console.log('  page                 reqs   transfer   css     js      imgs    fonts   LCP');
for (const p of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('response', async (r) => {
    try {
      const buf = await r.body();
      const enc = (r.headers()['content-encoding'] || '').includes('gzip');
      reqs.push({ url: r.url(), type: r.request().resourceType(), bytes: enc ? buf.length : buf.length, enc });
    } catch {}
  });
  await page.goto(`${B}/${p}`, { waitUntil: 'networkidle' });
  const lcp = await page.evaluate(() => new Promise((res) => {
    let v = 0;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    setTimeout(() => res(Math.round(v)), 350);
  }));
  const by = (t) => reqs.filter((r) => r.type === t);
  const sum = (a) => a.reduce((n, r) => n + r.bytes, 0);
  console.log(
    `  ${p.padEnd(19)} ${String(reqs.length).padStart(4)}  ${kb(sum(reqs)).padStart(9)}  ` +
    `${kb(sum(by('stylesheet'))).padStart(6)} ${kb(sum(by('script'))).padStart(6)} ` +
    `${kb(sum(by('image'))).padStart(7)} ${kb(sum(by('font'))).padStart(7)} ${String(lcp).padStart(6)}ms`
  );
  await ctx.close();
}
await browser.close();

/* ---- render-blocking / critical path -------------------------------- */
console.log('\n=== RENDER BLOCKING (home) ===');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const cssLinks = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map((m) => m[0]);
const jsTags = [...html.matchAll(/<script[^>]*src=[^>]*>/g)].map((m) => m[0]);
console.log(`  stylesheets: ${cssLinks.length}`);
cssLinks.forEach((t) => console.log('    ' + t));
console.log(`  scripts: ${jsTags.length}`);
jsTags.forEach((t) => console.log('    ' + t));
console.log(`  preload/preconnect hints: ${(html.match(/rel="(preload|preconnect|dns-prefetch)"/g) || []).length}`);
console.log(`  has viewport meta: ${/name="viewport"/.test(html)}`);
console.log(`  html lang: ${/<html[^>]*lang="([^"]+)"/.exec(html)?.[1]}`);
console.log(`  JSON-LD blocks: ${(html.match(/application\/ld\+json/g) || []).length}`);
console.log(`  h1 count: ${(html.match(/<h1[\s>]/g) || []).length}`);
console.log(`  img without width/height (CLS risk): ${(html.match(/<img(?![^>]*\bwidth=)[^>]*>/g) || []).length}`);
