# The Nuts Company — brand website

The full brand site for **The Nuts Company**, built from the approved homepage
design sheet. Eight static pages, no framework, no client-side templating — the
served HTML is the real HTML.

A brand of **Eshanura Enterprises Private Limited**.

```
npm run build     # generate the pages
npm run serve     # preview at http://127.0.0.1:4173/
npm run check     # link / catalogue / a11y gate, exits non-zero on failure
npm run all       # assets -> fonts -> build -> check
```

---

## Where the images came from

Every photograph and product shot on this site was cropped out of the approved
design sheet (`~/Downloads/The Nuts Company Premium Homepage.png`, a 910×1728
render). Nothing is stock. `build/extract_assets.py` is the only thing that
touches that file, and it is re-runnable.

Two kinds of art come out of it, and they need different treatment:

| Kind | Examples | Treatment |
|---|---|---|
| **Scene art** | hero, wooden bowl, supermarket aisle, warehouse cartons, hand picking a cashew | cropped as a rectangle, used behind real HTML text |
| **Product art** | 25 pouch shots across three nuts and four sizes | flat-card background matted out to a soft alpha so a pouch drops onto any background |

Finding the pouches inside a card needed some care, because the design packs them
almost shoulder to shoulder:

- **Card bounds** are found from the *median* of a row band, not a single scan
  row. Pouch drop shadows, the size captions and the "View …" buttons each cross
  any given row and punch holes in it; a column median makes those minority
  marks disappear.
- **Splitting the four pouches** uses a dynamic program over the column ink
  profile, minimising total valley depth subject to every band being at least
  28px wide. Greedily taking the three deepest minima does not work — several
  adjacent pixels can all sit at zero and the greedy choice piles all three cuts
  into one gap, collapsing three of the four bands.
- **The pack-size strip** is anchored on the caption text under each shot instead.
  Its background is a green-tinted gradient rather than flat card cream, so the
  reference colour mismatches across the row and the gaps between shots never
  reach zero no matter how the threshold is set.
- The matte leaves a faint wash of alpha over the cream, so crops are trimmed on
  a near-opaque threshold. Trimming on "any alpha" keeps the empty space above a
  20 g pouch, whose top sits well below the crop top.

The hero crop starts at y=58, below the design's transparent header band —
slicing from the top bakes the *original* navigation into the photograph.

`build/extract_assets.py` writes a contact sheet to `build/contact-sheet.png`
so the crop set can be eyeballed after any change.

## Type and colour

Three typefaces, self-hosted (`build/fetch_fonts.py`, latin subset only, ~444 KB):

- **Fraunces** — wordmark and hero display
- **Playfair Display** — section headings
- **Poppins** — interface and body

Colours are sampled off the sheet rather than eyeballed: `--green #0b3324`
(panels, buttons), `--green-deep #052117` (wordmark, headings), `--gold #c08a1e`
(accent rules), `--cream #fbf6ee` (page), `--cream-card #f7f0e5` (cards).

The wordmark is live HTML rather than an image, so it stays crisp at any size and
re-colours with the theme. Icons are a generated almond silhouette, legible down
to 16px.

The eshanura wordmark in the footer is the real asset from the EasyCare site,
copied from `easycare-site/assets/img/brand/eshanura-wordmark.webp`.

## Structure

```
build/
  extract_assets.py   crops every image out of the design sheet
  fetch_fonts.py      downloads and self-hosts the three typefaces
  site.mjs            shared layout: header, footer, drawers, <head>
  pages.mjs           page content
  serve.mjs           static preview server
  check_site.py       read-only gate: links, catalogue parity, a11y basics
  screenshot.mjs      full-page shots at any width
  smoke.mjs           20 browser assertions over the interactive behaviour
assets/
  css/styles.css      design system + every component
  css/fonts.css       generated @font-face block
  js/catalogue.js     12 products — source of truth for the bag and search
  js/main.js          bag, search, filters, drawers, reveals, forms
  fonts/ img/         generated and copied assets
```

The eight HTML files at the root are **generated** — edit `build/pages.mjs` or
`build/site.mjs` and re-run `npm run build`. Editing the HTML directly will be
overwritten.

## Two sources of truth, deliberately

`assets/js/catalogue.js` drives the bag and the search drawer at runtime.
`build/pages.mjs` emits the same twelve products as static tiles on `nuts.html`
so crawlers see them without JavaScript. These are edited in different files and
will drift, so `build/check_site.py` compares them and fails the build if an id,
name, size or price disagrees.

## Behaviour

Progressive enhancement: the pages read and render fully with JavaScript off.

- **Bag** — add from any product card, stepper on `nuts.html`, localStorage
  persistence, live subtotal.
- **Search** — filters the twelve packs live by name, kind, size or note.
- **Filters** — the almond/cashew/raisin chips on the homepage.
- **Forms** — client-side validation and a confirmation state. **They do not
  send anything**; wire them to a real endpoint before launch.
- **Reveals** — gated behind a `has-js` class added by `main.js`, so a script
  failure can never leave copy invisible.

`npm run smoke` asserts all of the above plus alt text, accessible names, single
`h1`, `lang` and the skip link.

## Before launch

- **Prices are placeholders.** `assets/js/catalogue.js` and `build/pages.mjs`
  carry indicative MRPs, not a rate card. Trade pricing on `retailers.html` is
  explicitly labelled indicative.
- **Checkout is a stub.** The button is disabled until something is in the bag
  and does nothing beyond that.
- **Forms do not send.** Connect them to an inbox, CRM or serverless function.
- **`thenutscompany.in` is assumed** in canonical URLs, Open Graph tags and
  `sitemap.xml`. Point them at the real host.
- **No analytics or tag manager** are installed. Add them with a consent banner
  if the privacy policy is to stay accurate.
