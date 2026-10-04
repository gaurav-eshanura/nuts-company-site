/* Notifies search engines that the site changed, after every deploy.
 *
 *   node build/submit.mjs
 *
 * What this can and cannot do
 * ---------------------------
 * WORKS  IndexNow (api.indexnow.org -> Bing, Yandex, Seznam, Naver). The key is
 *        a public file at the site root by design, so this needs no secret and
 *        no account - it genuinely fires on every deploy.
 * WORKS  verifies the sitemap is reachable and lists every URL in it, so a
 *        broken sitemap fails the deploy instead of silently rotting.
 *
 * DOES NOT WORK, and is not pretended to:
 *   * Google's /webmasters/tools/ping and Bing's /ping are both retired -
 *     they now answer 404 and 410 respectively. They are not called here.
 *   * The Google Indexing API only covers job postings and live broadcasts.
 *     It cannot be used for a brand site.
 *   * Search Console's sitemap API needs a one-time OAuth grant against the
 *     Google account that owns the property. That grant is the only manual
 *     step; once it exists Google re-reads the sitemap on its own schedule and
 *     needs no further prompting from this script.
 *
 * So after the first Search Console verification, this runs unattended.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from './site-config.mjs';

const BUILD = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(BUILD);

const sitemapUrl = `${SITE}/sitemap.xml`;
const host = new URL(SITE).host;

const pages = ['/', '/nuts.html', '/about.html', '/retailers.html',
               '/distributors.html', '/contact.html', '/legal.html'];

const post = async (url, body, headers = {}) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
      signal: ctl.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(t);
  }
};

console.log(`origin   ${SITE}`);
console.log(`sitemap  ${sitemapUrl}\n`);

/* ---- 1. sitemap must be reachable and populated --------------------- */
let urlCount = 0;
try {
  const res = await fetch(sitemapUrl);
  const body = await res.text();
  urlCount = (body.match(/<loc>/g) || []).length;
  if (!res.ok || !urlCount) throw new Error(`HTTP ${res.status}, ${urlCount} urls`);
  console.log(`ok    sitemap reachable, ${urlCount} URLs`);
} catch (e) {
  console.error(`FAIL  sitemap not reachable: ${e.message}`);
  process.exit(1);
}

/* ---- 2. robots.txt must allow crawling ----------------------------- */
try {
  const res = await fetch(`${SITE}/robots.txt`);
  const body = await res.text();
  const blocked = /User-agent:\s*\*\s*\n\s*Disallow:\s*\S/.test(body);
  console.log(`${blocked ? 'FAIL' : 'ok   '}  robots.txt ${blocked ? 'blocks all crawlers' : 'allows crawling'}`);
  if (blocked) process.exit(1);
} catch (e) {
  console.error(`FAIL  robots.txt unreachable: ${e.message}`);
}

/* ---- 3. IndexNow ---------------------------------------------------- */
const keyFile = join(ROOT, '.indexnow-key');
const key = process.env.INDEXNOW_KEY
  || (existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : null);

console.log('\nIndexNow');
if (!key) {
  console.log('skip  no key - run: python -c "import secrets;open(\'.indexnow-key\',\'w\').write(secrets.token_hex(16))"');
} else {
  const served = await fetch(`${SITE}/key.txt`).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  if (served.trim() !== key) {
    console.log(`skip  key.txt not yet served at ${SITE}/key.txt - deploy once, then it activates`);
  }
  const body = JSON.stringify({
    host,
    key,
    keyLocation: `${SITE}/key.txt`,
    urlList: pages.map((p) => `${SITE}${p}`),
  });
  for (const target of ['api.indexnow.org', 'www.bing.com']) {
    const r = await post(`https://${target}/indexnow`, body);
    console.log(`${r.ok ? 'ok   ' : 'warn '} ${target.padEnd(18)} ${r.status}`);
  }
}

/* ---- 4. the one manual step, stated plainly -------------------------- */
console.log('\nSearch Console - one-time manual step (cannot be automated)');
console.log(`  add property   ${SITE}/            (URL prefix)`);
console.log(`  verify         HTML tag, DNS TXT, or file`);
console.log(`  submit sitemap ${sitemapUrl}`);
console.log('  After that Google crawls on its own schedule; this script adds');
console.log('  nothing further for Google, and cannot.');

/* ---- 5. structured data sanity -------------------------------------- */
const pagesToCheck = pages.filter((p) => p !== '/404.html');
let schemaMissing = 0;
for (const p of pagesToCheck) {
  const html = await fetch(`${SITE}${p}`).then((r) => r.text()).catch(() => '');
  if (!/<script type="application\/ld\+json">/.test(html)) schemaMissing++;
}
console.log(`\n${schemaMissing ? 'FAIL' : 'ok   '}  structured data present on ${pagesToCheck.length - schemaMissing}/${pagesToCheck.length} pages`);
if (schemaMissing) process.exit(1);
