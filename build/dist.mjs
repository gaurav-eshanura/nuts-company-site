/* Assembles the exact set of files that ship, into dist/.
 *
 *   node build/dist.mjs
 *
 * Hosting `public: "."` works only as long as the ignore list stays complete,
 * and the project root holds node_modules, the build scripts and audit output.
 * Copying an explicit allow-list instead means a stray directory can never end
 * up on a public URL.
 */
import { cpSync, rmSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(BUILD);
const DIST = join(ROOT, 'dist');

const PAGES = ['index.html', 'nuts.html', 'about.html', 'retailers.html',
               'distributors.html', 'contact.html', 'legal.html', '404.html',
               'robots.txt', 'sitemap.xml'];
const TREES = ['assets'];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

let files = 0;
let bytes = 0;

const walk = (p) => {
  const s = statSync(p);
  if (!s.isDirectory()) { files++; bytes += s.size; return; }
  readdirSync(p).forEach((f) => walk(join(p, f)));
};

const add = (from, to) => {
  cpSync(from, to, { recursive: true });
  walk(to);
};

for (const p of PAGES) {
  const from = join(ROOT, p);
  if (!existsSync(from)) { console.warn(`  skip (missing): ${p}`); continue; }
  add(from, join(DIST, p));
}
for (const t of TREES) add(join(ROOT, t), join(DIST, t));

// IndexNow verifies the caller by fetching this file from the site root, so it
// has to ship with the site rather than live in the build folder.
const keyFile = join(ROOT, '.indexnow-key');
if (existsSync(keyFile)) {
  cpSync(keyFile, join(DIST, 'key.txt'));
  console.log(`key.txt served for IndexNow verification`);
}

// fail loudly rather than publish a site with a dead stylesheet
const required = ['assets/css/styles.css', 'assets/css/fonts.css',
                  'assets/js/main.js', 'assets/js/catalogue.js',
                  'assets/img/scenes/hero-art.webp'];
const missing = required.filter((r) => !existsSync(join(DIST, r)));
if (missing.length) {
  console.error('dist incomplete, refusing to publish:\n  ' + missing.join('\n  '));
  process.exit(1);
}

console.log(`dist/  ${files} files  ${(bytes / 1024).toFixed(0)} KB`);
