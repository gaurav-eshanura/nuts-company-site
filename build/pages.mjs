import { SITE, BRAND_DOMAIN } from "./site-config.mjs";

/* Page content for the site. Consumed by build/site.mjs, which wraps each body
 * in the shared header, footer and drawers and writes the .html file.
 *
 * Prices here must stay in step with assets/js/catalogue.js; check_site.py
 * compares the two and fails the build if they drift.
 */

const SIZES = ["20", "50", "100", "200"];
const SIZE_NOTE = {
  20: "On-the-go",
  50: "Everyday",
  100: "Better value",
  200: "Family pack",
};

const KINDS = [
  { slug: "almonds", label: "Almonds", meta: "California-style", price: { 20: 40, 50: 95, 100: 180, 200: 340 } },
  { slug: "cashews", label: "Cashews", meta: "W320 whole", price: { 20: 75, 50: 180, 100: 340, 200: 650 } },
  { slug: "raisins", label: "Raisins", meta: "Golden, seedless", price: { 20: 25, 50: 60, 100: 115, 200: 220 } },
];

const rupee = (n) => `&#8377;${n}`;

const tile = (k, size) => `      <article class="ptile" data-product="${k.slug}-${size}" data-kind="${k.slug}"
               data-name="${k.label}" data-size="${size} g" data-price="${k.price[size]}"
               data-img="assets/img/products/${k.slug}-${size}.webp">
        <div class="ptile__media">
          <img src="assets/img/products/${k.slug}-${size}.webp" alt="${k.label} ${size} g pouch" loading="lazy" decoding="async">
        </div>
        <h3 class="ptile__name">${k.label}</h3>
        <p><span class="ptile__size">${size} g &middot; ${SIZE_NOTE[size]}</span></p>
        <p class="ptile__price">${rupee(k.price[size])}</p>
        <div class="ptile__actions">
          <div class="qty">
            <button class="qty__btn" data-dec aria-label="One fewer ${k.label} ${size} g">&minus;</button>
            <span class="qty__val" aria-live="polite">0</span>
            <button class="qty__btn" data-inc aria-label="One more ${k.label} ${size} g">+</button>
          </div>
        </div>
      </article>`;

const shot = (k, size) => `            <button class="pcard__shot" data-add="${k.slug}-${size}" aria-label="Add ${k.label} ${size} g to bag">
              <img src="assets/img/products/${k.slug}-${size}.webp" alt="${k.label} ${size} g pouch" loading="lazy" decoding="async">
              <span class="shot-size">${size} g</span><span>${k.label}</span>
            </button>`;

const ticks = (items) =>
  `<ul class="ticks">\n              ${items
    .map((t) => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.6L16 9.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${t}</span></li>`)
    .join("\n              ")}\n            </ul>`;

// Each trail needs its own accessible name: nuts.html carries three of them,
// and three identically-labelled landmarks are indistinguishable to a screen reader.
const crumbs = (items, label) =>
  `<nav class="crumbs" aria-label="${label ? `Breadcrumb: ${label}` : "Breadcrumb"}">${items
    .map(([href, label]) =>
      href
        ? `<a href="${href}">${label}</a><span aria-hidden="true">/</span>`
        : `<span aria-current="page">${label}</span>`
    )
    .join("")}</nav>`;

const field = (id, label, opts = {}) => {
  const control = opts.type === "textarea"
    ? `<textarea class="textarea" id="${id}" name="${id}"${opts.required ? " required" : ""}${opts.placeholder ? ` placeholder="${opts.placeholder}"` : ""}></textarea>`
    : opts.type === "select"
    ? `<select class="select" id="${id}" name="${id}"${opts.required ? " required" : ""}>${opts.options
        .map((o) => `<option>${o}</option>`)
        .join("")}</select>`
    : `<input class="input" id="${id}" name="${id}" type="${opts.type || "text"}"${
        opts.required ? " required" : ""
      }${opts.autocomplete ? ` autocomplete="${opts.autocomplete}"` : ""}${
        opts.placeholder ? ` placeholder="${opts.placeholder}"` : ""
      }${opts.inputmode ? ` inputmode="${opts.inputmode}"` : ""}>`;
  return `        <div class="field${opts.full ? " field--full" : ""}">
          <label for="${id}">${label}</label>
          ${control}
        </div>`;
};

/* ============================================================ index.html */
const homeBody = `
  <section class="hero">
    <div class="wrap wrap--wide hero__inner">
      <div class="hero__copy">
        <p class="logo logo--lg">
          <span class="logo__the">The</span>
          <span class="logo__nuts">Nuts</span>
          <span class="logo__co">Company<sup>™</sup></span>
        </p>
        <h1 class="hero__tag">Real Nuts for Real&nbsp;People.</h1>
        <p class="hero__sub">Whole almonds, plump cashews and golden raisins in a resealable pouch.
          No blends, no coatings, no quiet substitutions &mdash; just the nut you asked for.</p>
        <div class="hero__cta">
          <a class="btn" href="nuts.html">Shop Now <span class="btn__arrow" aria-hidden="true">&rarr;</span></a>
          <a class="btn btn--ghost" href="about.html">Our Story</a>
        </div>
      </div>
      <div class="hero__art">
        <img src="assets/img/scenes/hero-art.webp" width="1500" height="1085"
             alt="Almond, cashew and raisin pouches from The Nuts Company on a wooden board"
             fetchpriority="high" decoding="async">
        <p class="hero__badge"><strong>20 g &ndash; 200 g</strong><span>Four sizes, one nut each</span></p>
      </div>
    </div>
  </section>

  <section class="section" id="nuts">
    <div class="wrap wrap--wide">
      <div class="section-head reveal">
        <div class="section-head__text">
          <h2>Our Nuts</h2>
          ${'<span class="rule" aria-hidden="true"></span>'}
        </div>
        <div class="section-head__actions">
          <a class="link-arrow" href="nuts.html">View All</a>
          <div class="chips" role="group" aria-label="Filter by nut">
            <button class="chip" data-filter="almonds" aria-pressed="true">Almonds</button>
            <button class="chip" data-filter="cashews" aria-pressed="false">Cashews</button>
            <button class="chip" data-filter="raisins" aria-pressed="false">Raisins</button>
          </div>
        </div>
      </div>

      <div class="grid-3">
${KINDS.map(
  (k) => `        <article class="pcard reveal" data-kind-card="${k.slug}">
          <div class="pcard__head">
            <h3 class="pcard__title">${k.label}</h3>
            <p class="pcard__meta">${k.meta}</p>
          </div>
          <div class="pcard__shots">
${SIZES.map((s) => shot(k, s)).join("\n")}
          </div>
          <a class="pcard__foot" href="nuts.html#${k.slug}">View ${k.label} <span class="btn__arrow" aria-hidden="true">&rarr;</span></a>
        </article>`
).join("\n")}
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap wrap--wide">
      <div class="split">
        <div class="feature feature--bowl reveal">
          <img src="assets/img/scenes/bowl.webp" width="882" height="945" loading="lazy" decoding="async"
               alt="A wooden bowl heaped with almonds, cashews and raisins">
          <p class="script-card"><span>Bas</span><span>Achhe</span><span>Nuts.</span></p>
        </div>

        <div class="feature feature--chhoti reveal">
          <img class="feature--chhoti__art" src="assets/img/scenes/chhoti-hand.webp" width="462" height="960"
               loading="lazy" decoding="async" alt="" aria-hidden="true">
          <div class="feature--chhoti__body">
            <h2>Chhoti Pack,<br>Badi Khushi.</h2>
            ${'<span class="rule" aria-hidden="true"></span>'}
            <div class="feature--chhoti__sizes">
${["20", "50", "100", "200"]
  .map(
    (s) => `              <figure>
                <img src="assets/img/products/chhoti-cashews-${s}.webp" alt="Cashews ${s} g pouch" loading="lazy" decoding="async">
                <figcaption>${s} g</figcaption>
              </figure>`
  )
  .join("\n")}
            </div>
            <p style="margin-top:1.25rem"><a class="link-arrow" href="nuts.html#cashews">Shop cashews</a></p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--sage">
    <div class="wrap wrap--wide">
      <div class="sizes">
        <div class="sizes__intro reveal">
          <h2>Pack Sizes</h2>
          ${'<span class="rule" aria-hidden="true"></span>'}
          <p style="margin-top:.85rem">For every need.</p>
        </div>
        <div class="sizes__row reveal">
${["20", "50", "100", "200"]
  .map(
    (s) => `          <figure>
            <img src="assets/img/products/packsize-almonds-${s}.webp" alt="Almonds ${s} g pouch" loading="lazy" decoding="async">
            <figcaption><strong>${s} g</strong><span>${SIZE_NOTE[s]}</span></figcaption>
          </figure>`
  )
  .join("\n")}
        </div>
        <p class="note-card reveal">
          Same Good Nuts. Different Sizes.
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 92C50 60 62 34 86 20M50 92C50 66 40 42 20 32M62 44c8 2 14 0 18-6M40 52c-8 2-14 0-18-6"
                  fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="grid-2">
        <article class="trade reveal">
          <div class="trade__media">
            <img src="assets/img/scenes/retail-aisle.webp" width="525" height="666" loading="lazy" decoding="async"
                 alt="A supermarket aisle with jars and packets on shelves">
          </div>
          <div class="trade__body">
            <h2>For Retailers</h2>
            ${'<span class="rule" aria-hidden="true"></span>'}
            ${ticks(["Fast moving essentials", "Attractive margin", "Quality you can trust", "Full range: 20 g, 50 g, 100 g, 200 g"])}
            <a class="btn btn--on-dark" href="retailers.html">Partner With Us <span class="btn__arrow" aria-hidden="true">&rarr;</span></a>
          </div>
        </article>

        <article class="trade reveal">
          <div class="trade__media">
            <img src="assets/img/scenes/distributor.webp" width="603" height="666" loading="lazy" decoding="async"
                 alt="Printed cartons of The Nuts Company stacked in a warehouse">
          </div>
          <div class="trade__body">
            <h2>For Distributors</h2>
            ${'<span class="rule" aria-hidden="true"></span>'}
            ${ticks(["Growing, everyday category", "Consistent quality &amp; supply", "PAN India potential", "Marketing support"])}
            <a class="btn btn--on-dark" href="distributors.html">Get Distributor Details <span class="btn__arrow" aria-hidden="true">&rarr;</span></a>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap wrap--wide">
      <div class="cta-band reveal">
        <h2>Hungry for honest snacking?</h2>
        <p>Pick a nut, pick a size, and we will get it to you &mdash; home delivery and bulk orders both.</p>
        <div class="cta-band__actions">
          <a class="btn btn--on-dark" href="nuts.html">Shop All Packs</a>
          <a class="btn btn--ghost" style="color:var(--white)" href="contact.html">Talk To Us</a>
        </div>
      </div>
    </div>
  </section>`;

/* ============================================================ nuts.html */
const nutSection = (k, i) => `
      <section class="section section--${i % 2 ? "card" : "sage"}" id="${k.slug}">
        <div class="wrap wrap--wide">
          <div class="section-head reveal">
            <div class="section-head__text">
              ${crumbs([["index.html", "Home"], ["nuts.html", "Our Nuts"], [null, k.label]], k.label)}
              <h2 style="margin-top:.75rem">${k.label}</h2>
              <p class="lede" style="margin-top:.75rem">${BLURB[k.slug]}</p>
              ${'<span class="rule" aria-hidden="true"></span>'}
            </div>
            <div class="section-head__actions">
              <a class="btn btn--sm" href="contact.html">Bulk Enquiry</a>
            </div>
          </div>
          <div class="grid-4">
${SIZES.map((s) => tile(k, s)).join("\n")}
          </div>
        </div>
      </section>`;

const BLURB = {
  almonds:
    "Whole, uniformly sized almonds with the skin on. Nothing added, nothing taken away — the almond you picture when you picture an almond.",
  cashews:
    "Plump, ivory, whole cashews with a clean finish and no bitterness at the edges. Graded W320, so the size is even from pouch to pouch.",
  raisins:
    "Golden raisins with the stems already removed, plump and chewy rather than hard and sugary. Nothing added to keep them soft.",
};

/** KINDS joined to their blurbs - the single range definition used by both the
 *  rendered page and the structured data, so the two cannot drift. */
export const RANGE = KINDS.map((k) => ({ ...k, blurb: BLURB[k.slug] }));

const nutsBody = `
  <section class="page-hero">
    <div class="wrap wrap--wide page-hero__inner">
      <div>
        ${crumbs([["index.html", "Home"], [null, "Our Nuts"]])}
        <h1>Twelve packs. Three nuts. Nothing else.</h1>
        <p class="lede">Every nut we sell, in every size we sell it, on one page.
          Use the stepper to build a bag &mdash; it is kept on this device until you clear it.</p>
        <div class="hero__cta">
          <a class="btn" href="#almonds">Start With Almonds <span class="btn__arrow" aria-hidden="true">&rarr;</span></a>
        </div>
      </div>
      <div class="page-hero__art">
        <img src="assets/img/scenes/hero-art.webp" width="1500" height="1085"
             alt="The full range: almond, cashew and raisin pouches" loading="lazy" decoding="async"
             style="border-radius:var(--r-lg)">
      </div>
    </div>
  </section>
${KINDS.map(nutSection).join("\n")}

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="panel panel--dark reveal">
        <div class="stat-row">
          <div class="stat"><strong>12</strong><span>Stock-keeping units</span></div>
          <div class="stat"><strong>4</strong><span>Pack sizes, 20 g to 200 g</span></div>
          <div class="stat"><strong>3</strong><span>Nuts, nothing blended</span></div>
          <div class="stat"><strong>1</strong><span>Grade per nut, every lot</span></div>
        </div>
      </div>
    </div>
  </section>`;

/* =========================================================== about.html */
const aboutBody = `
  <section class="page-hero">
    <div class="wrap wrap--wide page-hero__inner">
      <div>
        ${crumbs([["index.html", "Home"], [null, "About"]])}
        <h1>Bas achhe nuts, and nothing clever.</h1>
        <p class="lede">The Nuts Company is a brand of Eshanura Enterprises Private Limited.
          We make one thing well: whole nuts in a pouch you can reseal, in a size that fits
          the pocket you are actually carrying.</p>
      </div>
      <div class="page-hero__art">
        <img src="assets/img/scenes/bowl.webp" width="882" height="945" loading="lazy" decoding="async"
             alt="A wooden bowl heaped with almonds, cashews and raisins" style="border-radius:var(--r-lg)">
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="prose reveal">
        <h2>Why another nuts brand?</h2>
        <p>Because most of the shelf is confusing on purpose. Blends where a blend is
          convenient, coatings that add a percentage to the weight on the front and nothing
          to the experience, and sizes that stop at whatever the machine could be set to.</p>
        <p>We took the opposite position. Three nuts. Four sizes. One grade per nut, declared
          on the pouch. If the lot will not meet the grade, it does not ship &mdash; it goes
          somewhere else.</p>

        <h2>What we actually do</h2>
        <ul>
          <li>Buy whole nuts and sort them ourselves, by size and by grade, not by what the broker had that week.</li>
          <li>Roast lightly or not at all, so the nut tastes like the nut and not like a process.</li>
          <li>Pack in a pouch that closes properly, because a bag that spills is a bag you will not buy twice.</li>
          <li>Print the lot, the grade and the net weight on every pack, and mean it.</li>
        </ul>

        <h2>The people behind it</h2>
        <p>Eshanura Enterprises has been manufacturing for Indian consumers for years under
          house brands. The Nuts Company is the one place where the whole standard of that
          manufacturing is aimed at a single, very ordinary product.</p>
      </div>
    </div>
  </section>

  <section class="section section--sage">
    <div class="wrap wrap--wide">
      <div class="tiles">
        <article class="tile reveal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3.5 19 6v6c0 4-3 7.3-7 8.5-4-1.2-7-4.5-7-8.5V6Z" stroke-linejoin="round"/><path d="m9 12 2.2 2.2L15.5 10" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <h2>One grade, declared</h2>
          <p>The grade is on the pack. If it is not on the pack, we will not put the pack on a shelf.</p>
        </article>
        <article class="tile reveal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 4C10 4 4.5 8.5 4.5 15a5 5 0 0 0 5 5c6.5 0 10.5-6 10.5-16Z" stroke-linejoin="round"/><path d="M4.5 19.5 14 10" stroke-linecap="round"/></svg>
          <h2>No blends, no coatings</h2>
          <p>One nut in the pouch. No hydrogenated oil, no sulphur, no sugar pretending to be fruit.</p>
        </article>
        <article class="tile reveal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6" stroke-linejoin="round"/></svg>
          <h2>A pouch that closes</h2>
          <p>Resealable, so the 20 g pack lasts the whole trip home and the 200 g pack lasts the whole week.</p>
        </article>
        <article class="tile reveal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8h16l-1 11.2a1.5 1.5 0 0 1-1.5 1.3h-11A1.5 1.5 0 0 1 5 19.2Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke-linecap="round"/></svg>
          <h2>Built for the counter</h2>
          <p>Small packs for the till, family packs for the basket, and a margin that works at both.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="cta-band reveal">
        <h2>Try the range</h2>
        <p>Twelve packs, from a 20 g top-up to a 200 g family bag.</p>
        <div class="cta-band__actions">
          <a class="btn btn--on-dark" href="nuts.html">Shop All Packs</a>
          <a class="btn btn--ghost" style="color:var(--white)" href="contact.html">Talk To Us</a>
        </div>
      </div>
    </div>
  </section>`;

/* ======================================================== retailers.html */
const retailersBody = `
  <section class="page-hero">
    <div class="wrap wrap--wide page-hero__inner">
      <div>
        ${crumbs([["index.html", "Home"], [null, "For Retailers"]])}
        <h1>A nut line that sells itself.</h1>
        <p class="lede">Almonds, cashews and raisins in four pack sizes &mdash; a 20 g till
          top-up, a 50 g everyday, a 100 g better-value, and a 200 g family pack that brings
          the household in.</p>
        <div class="hero__cta">
          <a class="btn" href="contact.html">Partner With Us <span class="btn__arrow" aria-hidden="true">&rarr;</span></a>
          <a class="btn btn--ghost" href="nuts.html">See The Range</a>
        </div>
      </div>
      <div class="page-hero__art">
        <img src="assets/img/scenes/retail-aisle.webp" width="525" height="666" loading="lazy" decoding="async"
             alt="A supermarket aisle with jars and packets on shelves" style="border-radius:var(--r-lg)">
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="split">
        <div class="panel reveal">
          <h2>Why stock it</h2>
          ${'<span class="rule" aria-hidden="true"></span>'}
          <div class="prose" style="margin-top:1.25rem">
            <ul>
              <li><strong>Impulse price points.</strong> 20 g and 50 g sit at the till where baskets are already open.</li>
              <li><strong>Repeat, not novelty.</strong> Nuts are bought again next week, not once.</li>
              <li><strong>Four sizes, one shelf.</strong> A single brand covers impulse, everyday and family.</li>
              <li><strong>Clear on-pack claim.</strong> Grade and net weight printed plainly &mdash; no reading required.</li>
            </ul>
          </div>
        </div>
        <div class="panel reveal">
          <h2>What you get</h2>
          ${'<span class="rule" aria-hidden="true"></span>'}
          <div class="prose" style="margin-top:1.25rem">
            <ul>
              <li>Consistent supply across all twelve SKUs.</li>
              <li>Shelf-ready secondary packaging and printed cartons.</li>
              <li>Trade margin guidance per size band.</li>
              <li>Product imagery and copy for your listing, on request.</li>
              <li>A named contact at Eshanura who answers the phone.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--sage">
    <div class="wrap wrap--wide">
      <div class="prose reveal">
        <h2>The range, at a glance</h2>
        <p class="form-note">Indicative trade pricing for planning only. Final rates are confirmed in writing per outlet and per volume.</p>
      </div>
      <div class="tiles reveal" style="margin-top:1.5rem">
${KINDS.map((k) => `<article class="tile">
          <h2>${k.label}</h2>
          <p>${k.meta}. Four sizes: ${SIZES.map((s) => `${s} g`).join(", ")}.</p>
          <p class="form-note">From ${rupee(k.price[20])} (MRP, 20 g)</p>
        </article>`).join("\n")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="panel reveal">
        <h2>Become a retail partner</h2>
        ${'<span class="rule" aria-hidden="true"></span>'}
        <form data-demo-form="enquiry" style="margin-top:1.75rem">
          <div class="form-grid">
${field("store-name", "Store / outlet name", { required: true, placeholder: "Kirana, supermart, kirana &hellip;" })}
${field("contact-name", "Contact name", { required: true, autocomplete: "name" })}
${field("phone", "Phone", { type: "tel", required: true, inputmode: "tel", autocomplete: "tel", placeholder: "+91" })}
${field("city", "City", { required: true })}
${field("outlet-type", "Outlet type", { type: "select", options: ["Grocery / kirana", "Supermarket", "Convenience store", "Online / delivery", "Other"] })}
${field("sizes", "Sizes you are interested in", { placeholder: "e.g. 20 g and 200 g" })}
${field("message", "Anything else", { type: "textarea", full: true, placeholder: "Expected volumes, target dates, existing suppliers." })}
          </div>
          <p style="margin-top:1.25rem"><button class="btn" type="submit">Send Enquiry <span class="btn__arrow" aria-hidden="true">&rarr;</span></button></p>
          <p class="form-status" tabindex="-1" hidden></p>
        </form>
      </div>
    </div>
  </section>`;

/* ===================================================== distributors.html */
const distributorsBody = `
  <section class="page-hero">
    <div class="wrap wrap--wide page-hero__inner">
      <div>
        ${crumbs([["index.html", "Home"], [null, "For Distributors"]])}
        <h1>Take The Nuts Company across India.</h1>
        <p class="lede">A dry, everyday, high-repeat category with a short shelf life for the
          importer and none at all for us. If you move food across states, this is a line that
          fits an existing route.</p>
        <div class="hero__cta">
          <a class="btn" href="contact.html">Get Distributor Details <span class="btn__arrow" aria-hidden="true">&rarr;</span></a>
          <a class="btn btn--ghost" href="retailers.html">I am a retailer</a>
        </div>
      </div>
      <div class="page-hero__art">
        <img src="assets/img/scenes/distributor.webp" width="603" height="666" loading="lazy" decoding="async"
             alt="Printed cartons of The Nuts Company stacked in a warehouse" style="border-radius:var(--r-lg)">
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="split">
        <div class="panel reveal">
          <h2>What the category looks like</h2>
          ${'<span class="rule" aria-hidden="true"></span>'}
          <div class="prose" style="margin-top:1.25rem">
            <p>Nuts sit in the middle of the Indian snacking basket: affordable enough to be
              daily, and bought by every income band. Growth in organised retail and in
              quick-commerce has pulled the category out of the loose-jar aisle and into
              the main shelf.</p>
            <p>That is the opening. Twelve simple SKUs, no cold chain, no fragile pack, long
              shelf life and a reorder rate that rewards a route rather than punishes it.</p>
          </div>
        </div>
        <div class="panel reveal">
          <h2>What we look for</h2>
          ${'<span class="rule" aria-hidden="true"></span>'}
          <div class="prose" style="margin-top:1.25rem">
            <ul>
              <li>Existing distribution into grocery, modern trade or quick-commerce.</li>
              <li>Warehouse and transport capacity for dry, ambient goods.</li>
              <li>A team that can sell a repeat-purchase staple rather than a novelty.</li>
              <li>Cleanances and product education for small outlets.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--sage">
    <div class="wrap wrap--wide">
      <div class="stat-row reveal">
        <div class="stat"><strong>12</strong><span>SKUs to carry</span></div>
        <div class="stat"><strong>4</strong><span>Size bands, 20 g to 200 g</span></div>
        <div class="stat"><strong>3</strong><span>Category nuts</span></div>
        <div class="stat"><strong>Ambient</strong><span>No cold chain, no expiry pressure</span></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="panel reveal">
        <h2>Request distributor details</h2>
        ${'<span class="rule" aria-hidden="true"></span>'}
        <form data-demo-form="enquiry" style="margin-top:1.75rem">
          <div class="form-grid">
${field("company", "Company name", { required: true })}
${field("contact-name", "Contact name", { required: true, autocomplete: "name" })}
${field("email", "Email", { type: "email", required: true, autocomplete: "email" })}
${field("phone", "Phone", { type: "tel", required: true, inputmode: "tel", autocomplete: "tel" })}
${field("states", "States / territories covered", { full: true, placeholder: "e.g. Uttar Pradesh, Bihar" })}
${field("message", "About your network", { type: "textarea", full: true, placeholder: "Outlet count, warehouse capacity, brands you already carry." })}
          </div>
          <p style="margin-top:1.25rem"><button class="btn" type="submit">Request Details <span class="btn__arrow" aria-hidden="true">&rarr;</span></button></p>
          <p class="form-status" tabindex="-1" hidden></p>
        </form>
      </div>
    </div>
  </section>`;

/* ========================================================= contact.html */
const contactBody = `
  <section class="page-hero">
    <div class="wrap wrap--wide page-hero__inner">
      <div>
        ${crumbs([["index.html", "Home"], [null, "Contact"]])}
        <h1>Talk to a person.</h1>
        <p class="lede">Questions about a pack, a bulk order, or stocking us in your shop &mdash;
          it all lands with the same small team at Eshanura.</p>
      </div>
      <div class="page-hero__art">
        <img src="assets/img/scenes/chhoti-hand.webp" width="462" height="960" loading="lazy" decoding="async"
             alt="A hand picking up a cashew" style="border-radius:var(--r-lg)">
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="tiles">
        <article class="tile reveal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" stroke-linejoin="round"/></svg>
          <h2>Call</h2>
          <p><a href="tel:+919839436346">+91 98394 36346</a><br>Monday to Saturday, 9 am to 6 pm IST.</p>
        </article>
        <article class="tile reveal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6" stroke-linejoin="round"/></svg>
          <h2>Email</h2>
          <p><a href="mailto:care@eshanura.com">care@eshanura.com</a><br>We reply within one working day.</p>
        </article>
        <article class="tile reveal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/></svg>
          <h2>Order direct</h2>
          <p>Home delivery and bulk orders, ordered on this site or over the phone.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap wrap--wide">
      <div class="panel reveal">
        <h2>Send us a message</h2>
        ${'<span class="rule" aria-hidden="true"></span>'}
        <form data-demo-form="enquiry" style="margin-top:1.75rem">
          <div class="form-grid">
${field("name", "Your name", { required: true, autocomplete: "name" })}
${field("email", "Email", { type: "email", required: true, autocomplete: "email" })}
${field("phone", "Phone", { type: "tel", inputmode: "tel", autocomplete: "tel", placeholder: "Optional" })}
${field("topic", "What is this about?", { type: "select", options: ["An order", "Bulk or wholesale", "Stocking us in my shop", "Distribution", "Something else"] })}
${field("message", "Message", { type: "textarea", full: true, required: true, placeholder: "Tell us what you need and we will come back to you." })}
          </div>
          <p style="margin-top:1.25rem"><button class="btn" type="submit">Send Message <span class="btn__arrow" aria-hidden="true">&rarr;</span></button></p>
          <p class="form-status" tabindex="-1" hidden></p>
          <p class="form-note" style="margin-top:1rem">By sending this form you agree to be contacted about your enquiry. See the <a href="legal.html" style="text-decoration:underline">privacy policy</a>.</p>
        </form>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap wrap--wide">
      <div class="cta-band reveal">
        <h2>Rather just buy some?</h2>
        <p>Twelve packs, from a 20 g top-up to a 200 g family bag.</p>
        <div class="cta-band__actions">
          <a class="btn btn--on-dark" href="nuts.html">Shop All Packs</a>
        </div>
      </div>
    </div>
  </section>`;

/* =========================================================== legal.html */
const legalBody = `
  <section class="page-hero">
    <div class="wrap wrap--wide page-hero__inner">
      <div>
        ${crumbs([["index.html", "Home"], [null, "Legal"]])}
        <h1>Privacy &amp; terms</h1>
        <p class="lede">Plain language, because a policy nobody can read is not a policy.</p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      <div class="prose reveal">
        <h2>Privacy policy</h2>
        <p>The Nuts Company is a brand of Eshanura Enterprises Private Limited, which operates
          this website and handles the information you give it.</p>

        <h3>What we collect</h3>
        <ul>
          <li><strong>Enquiries.</strong> If you fill in a form we keep your name, contact details and what you wrote, so we can answer you.</li>
          <li><strong>Orders.</strong> If you buy, we keep what you ordered, where it goes and how it was paid for.</li>
          <li><strong>Your bag.</strong> Items you add stay in your own browser&rsquo;s local storage. Nothing is sent to us until you check out.</li>
          <li><strong>Basic analytics.</strong> Aggregate page-view counts, so we know which pages are useful.</li>
        </ul>

        <h3>What we do not do</h3>
        <ul>
          <li>We do not sell your details, and we do not rent them.</li>
          <li>We do not run third-party advertising trackers on this site.</li>
        </ul>

        <h3>Your choices</h3>
        <p>Ask us what we hold about you, ask us to correct it, or ask us to delete it. Clearing
          your browser&rsquo;s site data also empties the bag immediately. Write to
          <a href="mailto:care@eshanura.com" style="text-decoration:underline">care@eshanura.com</a>
          and we will deal with it.</p>

        <h2 id="terms">Terms &amp; conditions</h2>

        <h3>Orders and prices</h3>
        <p>Prices shown are in Indian rupees and include applicable taxes. An order is accepted
          when we confirm dispatch; until then nothing is binding on either side. We may decline
          an order &mdash; for example where a price was listed incorrectly &mdash; and will refund
          anything already taken.</p>

        <h3>Product information</h3>
        <p>Net weight, grade and contents are printed on every pack. Photographs on this site
          show the product and may include props; they are not a substitute for the label. Where
          this page and the pack disagree, the pack wins.</p>

        <h3>Trade and distribution</h3>
        <p>Retailer and distributor terms &mdash; pricing, territory, credit, minimum order
          quantities &mdash; are agreed in writing and confirmed by Eshanura Enterprises Private
          Limited. Nothing on this website constitutes an offer or a binding commitment.</p>

        <h3>Liability</h3>
        <p>To the extent permitted by law, we are not liable for indirect or consequential loss
          arising from use of this website. Nothing here limits liability that cannot lawfully be
          limited.</p>

        <h3>Intellectual property</h3>
        <p>The name, wordmark, pack artwork and photography on this site belong to Eshanura
          Enterprises Private Limited. You may look at them and link to them; you may not
          reproduce them commercially without permission in writing.</p>

        <h3>Changes</h3>
        <p>We may update these terms. The version on this page is the one that applies.</p>
        <p class="form-note">Last reviewed <span data-year>2026</span>.</p>
      </div>
    </div>
  </section>`;

/* ============================================================ 404.html */
const notFoundBody = `
  <section class="section" style="padding-block:clamp(4rem,10vw,8rem)">
    <div class="wrap wrap--wide">
      <div class="prose reveal" style="text-align:center;margin-inline:auto">
        <p class="eyebrow">Error 404</p>
        <h1 style="margin-top:.75rem">That page is not in the bowl.</h1>
        <p class="lede" style="margin-inline:auto">The link may be old, or the pack may have moved.
          Everything we make is one click away.</p>
        <div class="cta-band__actions" style="margin-top:2rem">
          <a class="btn" href="index.html">Back to Home</a>
          <a class="btn btn--ghost" href="nuts.html">See The Range</a>
        </div>
      </div>
    </div>
  </section>`;

/* =========================================================== the export */
export const PAGES = {
  "index.html": {
    title: "The Nuts Company — Real Nuts for Real People",
    description:
      "Almonds, cashews and raisins in four pack sizes from 20 g to 200 g. Whole, honest, nothing more. A brand of Eshanura Enterprises.",
    image: "assets/img/scenes/hero-art.webp",
    jsonld: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "The Nuts Company",
        url: `${SITE}/`,
        logo: `${SITE}/assets/img/brand/favicon-512.png`,
        parentOrganization: {
          "@type": "Organization",
          name: "Eshanura Enterprises Private Limited",
          url: "https://eshanura.com",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+91-9839436346",
            contactType: "customer care",
            email: "care@eshanura.com",
          },
        ],
      },
      null,
      2
    ),
    body: homeBody,
  },

  "nuts.html": {
    title: "Our Nuts — Almonds, Cashews, Raisins | The Nuts Company",
    description:
      "All twelve packs: almonds, cashews and raisins in 20 g, 50 g, 100 g and 200 g. Build a bag and order direct.",
    image: "assets/img/scenes/hero-art.webp",
    body: nutsBody,
  },

  "about.html": {
    title: "About — The Nuts Company",
    description:
      "Three nuts, four sizes, one grade per nut. The Nuts Company is a brand of Eshanura Enterprises Private Limited.",
    image: "assets/img/scenes/bowl.webp",
    body: aboutBody,
  },

  "retailers.html": {
    title: "For Retailers — The Nuts Company",
    description:
      "Stock almonds, cashews and raisins in four pack sizes. Fast-moving essentials, attractive margin, consistent supply.",
    image: "assets/img/scenes/retail-aisle.webp",
    body: retailersBody,
  },

  "distributors.html": {
    title: "For Distributors — The Nuts Company",
    description:
      "Distribute The Nuts Company across India. Twelve ambient SKUs, consistent quality and supply, marketing support.",
    image: "assets/img/scenes/distributor.webp",
    body: distributorsBody,
  },

  "contact.html": {
    title: "Contact — The Nuts Company",
    description:
      "Call +91 98394 36346 or email care@eshanura.com for orders, bulk enquiries, retail and distribution.",
    image: "assets/img/scenes/chhoti-hand.webp",
    body: contactBody,
  },

  "legal.html": {
    title: "Privacy & Terms — The Nuts Company",
    description:
      "How The Nuts Company handles information on this website, and the terms on which the site and the range are offered.",
    image: "assets/img/brand/favicon-512.png",
    body: legalBody,
  },

  "404.html": {
    title: "Page not found — The Nuts Company",
    description:
      `That page does not exist on ${BRAND_DOMAIN}. Find the almond, cashew and raisin range, or get in touch with Eshanura Enterprises.`,
    image: "assets/img/brand/favicon-512.png",
    body: notFoundBody,
    bodyClass: "is-404",
  },
};
