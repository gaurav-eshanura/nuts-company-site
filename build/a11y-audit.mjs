/* WCAG 2.2 AA audit with axe-core, across every page and viewport.
 *   node build/a11y-audit.mjs
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const B = 'http://127.0.0.1:4173';
const PAGES = ['index.html', 'nuts.html', 'about.html', 'retailers.html',
               'distributors.html', 'contact.html', 'legal.html', '404.html'];

const browser = await chromium.launch({ channel: 'chrome' });
const tally = new Map();

for (const width of [1440, 390]) {
  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${B}/${p}`, { waitUntil: 'networkidle' });
    // Disable animation and force every scroll-reveal in BEFORE auditing.
    // Otherwise axe samples mid-fade and reads washed-out colours, which shows up
    // as a wall of false contrast failures.
    await page.addStyleTag({
      content: `*,*::before,*::after{transition:none!important;animation:none!important}`,
    });
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
    await page.waitForTimeout(300);

    const res = await page.evaluate(async (src) => {
      // eslint-disable-next-line no-eval
      eval(src);
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      });
      return r.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help, n: v.nodes.length,
        sample: v.nodes.slice(0, 2).map((n) => n.html.slice(0, 110)),
      }));
    }, require('node:fs').readFileSync(AXE, 'utf8'));

    for (const v of res) {
      const key = `${v.id}|${v.impact}`;
      if (!tally.has(key)) tally.set(key, { ...v, pages: [], n: 0 });
      const t = tally.get(key);
      t.pages.push(`${p}@${width}`);
      t.n += v.n;
      if (!t.sample.length) t.sample = v.sample;
    }
    await page.close();
  }
}
await browser.close();

const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const rows = [...tally.values()].sort((a, b) => (order[a.impact] ?? 9) - (order[b.impact] ?? 9) || b.n - a.n);

console.log(`axe-core findings across ${PAGES.length} pages x 2 viewports\n`);
if (!rows.length) console.log('  no violations');
for (const v of rows) {
  console.log(`[${(v.impact || 'n/a').toUpperCase()}] ${v.id}  (${v.n} nodes on ${v.pages.length} page-views)`);
  console.log(`    ${v.help}`);
  v.sample.forEach((s) => console.log(`      e.g. ${s}`));
  console.log('');
}
console.log(`TOTAL distinct violations: ${rows.length}`);
