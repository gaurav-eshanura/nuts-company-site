/* Builds every page of the site from one layout.
 *
 * Seven pages share a header, a footer and two drawers. Keeping those in one
 * place means a nav change lands everywhere, and the served HTML stays fully
 * static - no client-side templating, no framework.
 *
 *   node build/site.mjs
 */

import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES, RANGE } from "./pages.mjs";
import { addDimensions } from "./imgsize.mjs";
import { graph, breadcrumb, itemList, products } from "./schema.mjs";
import { SITE, PARENT, BRAND_DOMAIN } from "./site-config.mjs";

const BUILD_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(BUILD_DIR);

/* ------------------------------------------------------------------ icons */
const TICK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.6L16 9.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const ICON = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5" stroke-linecap="round"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16l-1.4 12.2a1.6 1.6 0 0 1-1.6 1.4H7a1.6 1.6 0 0 1-1.6-1.4Z"/><path d="M9 10V6.2a3 3 0 0 1 6 0V10" stroke-linecap="round"/></svg>',
  menu:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" stroke-linejoin="round"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/></svg>',
  shop:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8h16l-1 11.2a1.5 1.5 0 0 1-1.5 1.3h-11A1.5 1.5 0 0 1 5 19.2Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke-linecap="round"/></svg>',
  truck:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7h10v9H3zM13 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>',
  chat:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.5 12c0 4-3.8 7.2-8.5 7.2-1 0-2-.2-2.9-.5L4 20.5l1.6-3.6A6.8 6.8 0 0 1 3.5 12C3.5 8 7.3 4.8 12 4.8s8.5 3.2 8.5 7.2Z"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 4C10 4 4.5 8.5 4.5 15a5 5 0 0 0 5 5c6.5 0 10.5-6 10.5-16Z" stroke-linejoin="round"/><path d="M4.5 19.5 14 10" stroke-linecap="round"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3.5 19 6v6c0 4-3 7.3-7 8.5-4-1.2-7-4.5-7-8.5V6Z" stroke-linejoin="round"/><path d="m9 12 2.2 2.2L15.5 10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* ------------------------------------------------------------------ logo */
const wordmark = (cls = "logo--sm") =>
  `<a class="logo ${cls}" href="index.html" aria-label="The Nuts Company — home">
        <span class="logo__the">The</span>
        <span class="logo__nuts">Nuts</span>
        <span class="logo__co">Company<sup>™</sup></span>
      </a>`;

const NAV = [
  ["index.html", "Home"],
  ["nuts.html", "Our Nuts"],
  ["about.html", "About"],
  ["retailers.html", "For Retailers"],
  ["distributors.html", "For Distributors"],
  ["contact.html", "Contact"],
];

const header = (current) => `
<header class="header">
  <div class="wrap wrap--wide header__inner">
    ${wordmark("logo--sm")}
    <nav class="nav" id="site-nav" aria-label="Primary">
      ${NAV.map(
        ([href, label]) =>
          `<a class="nav__link" href="${href}"${
            href === current ? ' aria-current="page"' : ""
          }>${label}</a>`
      ).join("\n      ")}
    </nav>
    <div class="header__actions">
      <button class="icon-btn" data-open="search" aria-label="Search packs">${ICON.search}</button>
      <button class="icon-btn" data-open="cart" aria-label="Open bag">${ICON.bag}<span class="cart-count" data-cart-count hidden>0</span></button>
      <button class="icon-btn nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${ICON.menu}</button>
    </div>
  </div>
</header>`;

const footer = () => `
<footer class="footer">
  <div class="wrap wrap--wide">
    <div class="footer__grid">
      <div class="footer__brand">
        <p class="logo logo--md">
          <span class="logo__the">The</span>
          <span class="logo__nuts">Nuts</span>
          <span class="logo__co">Company<sup>™</sup></span>
        </p>
        <div class="parent-brand">
          <span class="parent-brand__kicker">A brand by</span>
          <a href="https://eshanura.com" aria-label="Eshanura Enterprises — parent company">
            <img src="assets/img/brand/eshanura-wordmark.webp" alt="eshanura Enterprises Private Limited" width="520" height="108" loading="lazy" decoding="async">
          </a>
          <small>Packed by Eshanura &mdash; ISO 9001:2015 certified</small>
        </div>
      </div>

      <nav aria-label="Quick links">
        <h2 class="footer__h">Quick Links</h3>
        <ul class="footer__links">
          ${NAV.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("\n          ")}
        </ul>
      </nav>

      <div>
        <h2 class="footer__h">Customer Care</h3>
        <ul class="footer__contact">
          <li>${ICON.phone}<a href="tel:+919839436346">+91 98394 36346</a></li>
          <li>${ICON.mail}<a href="mailto:care@eshanura.com">care@eshanura.com</a></li>
          <li>${ICON.pin}<a href="${SITE}/" rel="noopener">${BRAND_DOMAIN}</a></li>
        </ul>
      </div>

      <div>
        <h2 class="footer__h">Available On</h3>
        <div class="market">
          <span class="market__badge" aria-hidden="true"><i></i></span>
          <p style="font-size:.9375rem;color:var(--ink-2)"><strong style="color:var(--green-deep)">Order Direct</strong><br>For home delivery &amp; bulk orders</p>
        </div>
      </div>
    </div>

    <div class="footer__bar">
      <p>&copy; <span data-year>2026</span> The Nuts Company. A brand of Eshanura Enterprises Private Limited.</p>
      <nav aria-label="Legal">
        <a href="legal.html">Privacy Policy</a>
        <span aria-hidden="true">|</span>
        <a href="legal.html#terms">Terms &amp; Conditions</a>
      </nav>
    </div>
  </div>
</footer>`;

const panels = () => `
<div class="scrim" id="scrim"></div>

<aside class="drawer" id="panel-cart" aria-labelledby="cart-title" inert>
  <div class="drawer__head">
    <h2 id="cart-title">Your Bag</h2>
    <button class="icon-btn" data-close aria-label="Close bag">${ICON.close}</button>
  </div>
  <div class="drawer__body" id="cart-lines"></div>
  <div class="drawer__foot">
    <p class="total"><span>Subtotal</span><strong id="cart-total">&rsquo;0</strong></p>
    <p class="form-note" style="margin-bottom:.75rem">Delivery and taxes are calculated at checkout.</p>
    <button class="btn btn--block" id="cart-checkout" disabled>Checkout</button>
  </div>
</aside>

<aside class="drawer" id="panel-search" aria-labelledby="search-title" inert>
  <div class="drawer__head">
    <h2 id="search-title">Find a Pack</h2>
    <button class="icon-btn" data-close aria-label="Close search">${ICON.close}</button>
  </div>
  <div class="drawer__body">
    <div class="search-field">
      ${ICON.search}
      <label class="sr-only" for="search-input">Search packs</label>
      <input class="input" id="search-input" type="search" placeholder="Try &ldquo;cashews&rdquo; or &ldquo;100 g&rdquo;" autocomplete="off">
    </div>
    <p class="form-note" id="search-count" aria-live="polite" style="margin-bottom:1rem"></p>
    <div class="search-grid" id="search-results"></div>
  </div>
</aside>

<script src="assets/js/catalogue.js" defer></script>
<script src="assets/js/main.js" defer></script>`;

/* ------------------------------------------------------------------- head */
// Breadcrumb trails are declared here rather than scraped from the markup, so the
// structured data can never disagree with the visible trail.
const TRAILS = {
  "nuts.html": "Our Nuts",
  "about.html": "About",
  "retailers.html": "For Retailers",
  "distributors.html": "For Distributors",
  "contact.html": "Contact",
  "legal.html": "Privacy & Terms",
};

const KEYWORDS = {
  "index.html": "nuts, almonds, cashews, raisins, dry fruits, whole nuts, packed nuts, The Nuts Company, Eshanura, almond 20 g, almond 200 g",
  "nuts.html": "almonds, cashews, raisins, dry fruits, whole cashews, golden raisins, 20 g, 50 g, 100 g, 200 g, packed nuts, The Nuts Company",
  "about.html": "about The Nuts Company, Eshanura Enterprises, packed nuts, single nut pouches",
  "retailers.html": "nuts wholesale, almond retailer, cashew supplier, packaged snacks supplier, retail partnership, Eshanura",
  "distributors.html": "nuts distribution, dry fruit distributor, wholesale nuts India, cashew supplier, almond supplier, Eshanura Enterprises",
  "contact.html": "contact The Nuts Company, nuts enquiry, bulk nuts order, care@eshanura.com",
  "legal.html": "privacy policy, terms and conditions, The Nuts Company",
  "404.html": "page not found, The Nuts Company",
};

function doc({ current, title, description, image, body, bodyClass = "" }) {
  const url = current === "index.html" ? `${SITE}/` : `${SITE}/${current}`;

  const trail = TRAILS[current];
  const ld = graph({
    crumbs: trail ? breadcrumb([["Home", `${SITE}/`], [trail, current]]) : null,
    list: current === "nuts.html" ? itemList(RANGE) : null,
    products: current === "nuts.html" ? products(RANGE) : null,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="keywords" content="${KEYWORDS[current] || ""}">
<meta name="author" content="${PARENT}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">

<meta property="og:type" content="website">
<meta property="og:locale" content="en_IN">
<meta property="og:site_name" content="The Nuts Company">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/${image}">
<meta property="og:image:alt" content="${title}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${SITE}/${image}">

<meta name="theme-color" content="#0b3324">
<link rel="icon" href="assets/img/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="assets/img/brand/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="assets/img/brand/apple-touch-icon.png">
<link rel="sitemap" type="application/xml" href="${SITE}/sitemap.xml">
<link rel="stylesheet" href="assets/css/styles.css">
${
  current === "index.html"
    ? '<link rel="preload" as="image" href="assets/img/scenes/hero-art.webp" fetchpriority="high">'
    : ""
}<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>

<a class="skip-link" href="#main">Skip to content</a>
${header(current)}

<main id="main">
${body}
</main>
${footer()}
${panels()}
</body>
</html>
`;
}

/* ------------------------------------------------------------ small parts */
const rule = '<span class="rule" aria-hidden="true"></span>';

const shotRow = (kind, label) =>
  ["20", "50", "100", "200"]
    .map(
      (size) => `            <button class="pcard__shot" data-add="${kind}-${size}" aria-label="Add ${label} ${size} g to bag">
              <img src="assets/img/products/${kind}-${size}.webp" alt="${label} ${size} g pouch" loading="lazy" decoding="async">
              <span class="shot-size">${size} g</span><span>${label}</span>
            </button>`
    )
    .join("\n");

const ticks = (items) =>
  `<ul class="ticks">\n              ${items
    .map((t) => `<li>${TICK}<span>${t}</span></li>`)
    .join("\n              ")}\n            </ul>`;

const crumb = (href, label) =>
  `<a href="${href}">${label}</a><span aria-hidden="true">/</span>`;

/* ------------------------------------------------------------------- main */
const SITEMAP = [
  ["", "1.0"],
  ["nuts.html", "0.9"],
  ["about.html", "0.6"],
  ["retailers.html", "0.8"],
  ["distributors.html", "0.8"],
  ["contact.html", "0.7"],
  ["legal.html", "0.3"],
];

/** Generated from the same SITE constant the canonical tags use, so the two can
 *  never disagree about which host is authoritative. */
function sitemap() {
  const urls = SITEMAP.map(([p, priority]) =>
    `  <url><loc>${SITE}/${p}</loc><priority>${priority}</priority></url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function robots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;
}

function build() {
  mkdirSync(ROOT, { recursive: true });
  let n = 0;
  for (const [file, def] of Object.entries(PAGES)) {
    // Fill in intrinsic width/height on every <img> so the browser can
    // reserve its box before the file arrives (see build/imgsize.mjs).
    const html = addDimensions(doc({ current: file, ...def }));
    writeFileSync(join(ROOT, file), html, "utf8");
    console.log(`  ${file.padEnd(20)} ${def.title}`);
    n++;
  }
  writeFileSync(join(ROOT, "sitemap.xml"), sitemap(), "utf8");
  writeFileSync(join(ROOT, "robots.txt"), robots(), "utf8");
  console.log(`  ${"sitemap.xml".padEnd(20)} -> ${SITE}/sitemap.xml`);
  console.log(`  ${"robots.txt".padEnd(20)} -> ${SITE}/robots.txt`);

  const existing = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  console.log(`\n${n} pages written (${existing.length} .html in project root).`);
}

build();
