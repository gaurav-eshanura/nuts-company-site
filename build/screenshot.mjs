import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the output against this script rather than the working directory, so
// the shots land in the same place however the script is invoked.
const BUILD_DIR = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR || join(BUILD_DIR, 'shots');
mkdirSync(OUT, { recursive: true });

const PAGES = process.argv[2]
  ? process.argv[2].split(',')
  : ['index.html', 'nuts.html', 'about.html', 'retailers.html', 'distributors.html', 'contact.html', 'legal.html', '404.html'];
const WIDTHS = (process.argv[3] || '1440').split(',').map(Number);
const FULL = process.argv[4] !== 'viewport';

const browser = await chromium.launch({ channel: 'chrome' });
for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  for (const p of PAGES) {
    await page.goto(`http://127.0.0.1:4173/${p}`, { waitUntil: 'networkidle' });
    // A screenshot never scrolls the page, so lazy images below the fold would
    // capture blank. Force them eager and wait for decode before shooting.
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        img.loading = 'eager';
      });
      const settled = Array.from(document.images).map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
            })
      );
      await Promise.race([Promise.all(settled), new Promise((r) => setTimeout(r, 5000))]);
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);

    const name = p.replace('.html', '') || 'index';
    const file = `${OUT}/${name}-${w}.png`;
    await page.screenshot({ path: file, fullPage: FULL });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`${p.padEnd(20)} ${String(w).padStart(5)}  ${h}px -> ${file}`);
  }
  await page.close();
}
await browser.close();
