/* Exact contrast ratios for the failures axe found, plus a SEO/structured-data
 * sanity pass.   node build/contrast-audit.mjs
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const B = 'http://127.0.0.1:4173';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${B}/index.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));

const out = await page.evaluate(async (src) => {
  eval(src);
  const r = await window.axe.run(document, { runOnly: ['color-contrast'] });

  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      const a = parse(bg);
      if (a.length === 3 && !/rgba\(.*,\s*0\)/.test(bg)) {
        const alpha = (bg.match(/[\d.]+/g) || [])[3];
        if (alpha === undefined || Number(alpha) > 0.5) return a;
      }
      n = n.parentElement;
    }
    return [251, 246, 238];
  };

  const seen = new Map();
  for (const v of r.violations) {
    for (const n of v.nodes) {
      const el = n.target[0] ? document.querySelector(n.target[0]) : null;
      if (!el) continue;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color), bg = bgOf(el);
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      const cr = ratio(fg, bg);
      const key = `${cs.color}|${bg.join(',')}|${cs.fontSize}|${el.className}`;
      if (!seen.has(key)) {
        seen.set(key, {
          sample: el.textContent.trim().slice(0, 34),
          cls: (el.className || el.tagName).toString().slice(0, 32),
          fg: `rgb(${fg.join(',')})`, bg: `rgb(${bg.join(',')})`,
          size: cs.fontSize, weight: cs.fontWeight,
          ratio: cr.toFixed(2), need, pass: cr >= need,
        });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.ratio - b.ratio);
}, require('node:fs').readFileSync(AXE, 'utf8'));

console.log('=== CONTRAST FAILURES ON HOMEPAGE ===');
console.log('  ratio  need  size/wt   class                        sample');
for (const o of out) {
  console.log(`  ${String(o.ratio).padStart(5)}  ${String(o.need).padStart(4)}  ${(o.size + '/' + o.weight).padEnd(9)} ${o.cls.padEnd(28)} "${o.sample}"`);
}
console.log(`\n  ${out.length} distinct failing colour pairs`);

/* ---------------- SEO / structured data ---------------- */
console.log('\n=== SEO / HEAD ===');
for (const p of ['index.html', 'nuts.html', 'contact.html']) {
  await page.goto(`${B}/${p}`, { waitUntil: 'domcontentloaded' });
  const s = await page.evaluate(() => {
    const g = (sel, attr = 'content') => document.querySelector(sel)?.getAttribute(attr) || null;
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((n) => { try { return JSON.parse(n.textContent)['@type']; } catch { return 'INVALID JSON'; } });
    return {
      title: document.title.length,
      desc: (g('meta[name="description"]') || '').length,
      canonical: g('link[rel="canonical"]', 'href'),
      og: !!g('meta[property="og:image"]'),
      tw: !!g('meta[name="twitter:card"]'),
      ld,
      imgNoDims: [...document.images].filter((i) => !i.getAttribute('width')).length,
      imgs: document.images.length,
      internalLinks: [...document.querySelectorAll('a[href]')].filter((a) => !/^(https?:|mailto:|tel:|#)/.test(a.getAttribute('href'))).length,
      nofollowNo: [...document.querySelectorAll('a[href^="http"]')].filter((a) => !a.rel).length,
    };
  });
  console.log(`  ${p.padEnd(14)} title=${s.title}ch desc=${s.desc}ch canonical=${s.canonical ? 'yes' : 'NO'} og=${s.og ? 'yes' : 'NO'} twitter=${s.tw ? 'yes' : 'NO'} ld=[${s.ld}]`);
  console.log(`  ${''.padEnd(14)} images=${s.imgs} without width/height=${s.imgNoDims}  internal links=${s.internalLinks}`);
}

/* heading order detail */
console.log('\n=== HEADING ORDER (index) ===');
await page.goto(`${B}/index.html`, { waitUntil: 'domcontentloaded' });
const heads = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => `${h.tagName} ${h.textContent.trim().slice(0, 28)}`));
heads.forEach((h) => console.log('  ' + h));

await browser.close();
