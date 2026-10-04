import { chromium } from 'playwright';

const B = 'http://127.0.0.1:4173';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => errors.push('404/failed: ' + r.url()));

const ok = (label, cond, extra = '') =>
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  (' + extra + ')' : ''}`);

await page.goto(`${B}/index.html`, { waitUntil: 'networkidle' });

// --- filters ---------------------------------------------------------------
await page.click('.chip[data-filter="cashews"]');
await page.waitForTimeout(150);
let visible = await page.$$eval('[data-kind-card]', (els) =>
  els.filter((e) => !e.classList.contains('is-hidden')).map((e) => e.dataset.kindCard));
ok('filter shows only cashews', visible.length === 1 && visible[0] === 'cashews', visible.join(','));

await page.click('.chip[data-filter="almonds"]');
await page.waitForTimeout(150);
const pressed = await page.$eval('.chip[data-filter="almonds"]', (e) => e.getAttribute('aria-pressed'));
ok('active chip sets aria-pressed', pressed === 'true');

// --- cart ------------------------------------------------------------------
await page.click('[data-add="almonds-200"]');
await page.waitForTimeout(350);
ok('bag opens on add', await page.isVisible('#panel-cart'));

let lines = await page.$$eval('.cart-line', (e) => e.length);
let badge = await page.$eval('[data-cart-count]', (e) => e.textContent);
ok('bag holds the added pack', lines === 1 && badge === '1', `lines=${lines} badge=${badge}`);

await page.click('.cart-line [data-cart-inc]');
await page.waitForTimeout(200);
lines = await page.$$eval('.cart-line', (e) => e.length);
badge = await page.$eval('[data-cart-count]', (e) => e.textContent);
ok('increment raises qty to 2', lines === 1 && badge === '2', `lines=${lines} badge=${badge}`);

let total = await page.$eval('#cart-total', (e) => e.textContent);
ok('subtotal is Rs. 680 (2 x 340)', /680/.test(total), total);

// --- persistence -----------------------------------------------------------
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);
badge = await page.$eval('[data-cart-count]', (e) => e.textContent);
ok('bag survives reload', badge === '2', `badge=${badge}`);

// --- remove ----------------------------------------------------------------
await page.click('[data-open="cart"]');
await page.waitForTimeout(300);
await page.click('.cart-line [data-cart-rm]');
await page.waitForTimeout(250);
const empty = await page.$('.empty');
ok('removing the last line shows empty state', !!empty);

// --- search ----------------------------------------------------------------
await page.click('[data-close]');
await page.waitForTimeout(250);
await page.click('[data-open="search"]');
await page.waitForTimeout(300);
await page.fill('#search-input', 'cashew');
await page.waitForTimeout(250);
let shown = await page.$$eval('#search-results .ptile', (els) =>
  els.filter((e) => !e.classList.contains('is-hidden')).length);
ok('search "cashew" returns 4 cashew packs', shown === 4, `shown=${shown}`);

await page.fill('#search-input', '100 g');
await page.waitForTimeout(250);
shown = await page.$$eval('#search-results .ptile', (els) =>
  els.filter((e) => !e.classList.contains('is-hidden')).length);
ok('search "100 g" returns 3 packs', shown === 3, `shown=${shown}`);

await page.fill('#search-input', 'zzzz');
await page.waitForTimeout(250);
shown = await page.$$eval('#search-results .ptile', (els) =>
  els.filter((e) => !e.classList.contains('is-hidden')).length);
ok('nonsense query returns none', shown === 0, `shown=${shown}`);

// --- form ------------------------------------------------------------------
await page.goto(`${B}/contact.html`, { waitUntil: 'networkidle' });
await page.fill('#name', 'Test User');
await page.fill('#email', 'test@example.com');
await page.fill('#message', 'Hello there.');
await page.click('form[data-demo-form] button[type="submit"]');
await page.waitForTimeout(300);
const status = await page.$eval('.form-status', (e) => ({ hidden: e.hidden, text: e.textContent.slice(0, 40) }));
ok('contact form confirms', status.hidden === false && /Thanks/.test(status.text), status.text);

// --- catalogue page stepper ------------------------------------------------
await page.goto(`${B}/nuts.html`, { waitUntil: 'networkidle' });
await page.click('.ptile[data-product="cashews-200"] [data-inc]');
await page.waitForTimeout(250);
const stepper = await page.$eval('.ptile[data-product="cashews-200"] .qty__val', (e) => e.textContent);
ok('nuts.html stepper increments', stepper === '1', `val=${stepper}`);

// --- mobile nav ------------------------------------------------------------
await page.setViewportSize({ width: 390, height: 800 });
await page.goto(`${B}/index.html`, { waitUntil: 'networkidle' });
await page.click('.nav-toggle');
await page.waitForTimeout(350);
ok('mobile nav opens', await page.isVisible('#site-nav .nav__link'));
await page.click('#site-nav .nav__link[href="about.html"]');
await page.waitForURL('**/about.html');
ok('mobile nav link navigates', page.url().endsWith('about.html'));

// --- accessibility spot checks --------------------------------------------
await page.goto(`${B}/index.html`, { waitUntil: 'networkidle' });
const a11y = await page.evaluate(() => ({
  imgsNoAlt: Array.from(document.images).filter((i) => i.alt === null || i.alt === undefined).length,
  imgsEmptyAlt: Array.from(document.images).filter((i) => i.alt === '').length,
  btnsNoName: Array.from(document.querySelectorAll('button')).filter(
    (b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
  h1: document.querySelectorAll('h1').length,
  lang: document.documentElement.lang,
  skip: !!document.querySelector('.skip-link'),
}));
ok('every image has an alt attribute', a11y.imgsNoAlt === 0, `missing=${a11y.imgsNoAlt}`);
ok('every button has an accessible name', a11y.btnsNoName === 0, `unnamed=${a11y.btnsNoName}`);
ok('exactly one h1', a11y.h1 === 1, `h1=${a11y.h1}`);
ok('html lang set', a11y.lang === 'en');
ok('skip link present', a11y.skip);

console.log('\nconsole/network errors:', errors.length);
errors.slice(0, 12).forEach((e) => console.log('   ' + e));

await browser.close();
