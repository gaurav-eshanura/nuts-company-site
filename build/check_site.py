"""Read-only consistency checks for the generated site.

Run after build/site.mjs. Exits non-zero if anything is wrong, so it can gate a
deploy. It never writes - it only reports.

Checks:
  1. every src/href in every page points at a file that exists
  2. the bag catalogue and the static tiles on nuts.html agree on id, name,
     size and price - the two are edited in different files and will drift
  3. every page has a title, description, canonical, lang and exactly one h1
  4. every <img> has an alt attribute (empty alt is allowed, for decoration)
"""
import json
import os
import re
import sys
from urllib.parse import urlparse

BUILD_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BUILD_DIR)

problems = []
notes = []


def fail(page, msg):
    problems.append(f"{page}: {msg}")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


pages = sorted(f for f in os.listdir(ROOT) if f.endswith(".html"))
if not pages:
    print("no HTML pages found - run build/site.mjs first")
    sys.exit(1)

# The homepage is the root of the tree; it has no breadcrumb of its own.
NO_CRUMBS = {"404.html"}

# ---------------------------------------------------------------- 1. links
attr_re = re.compile(r'(?:src|href)="([^"]+)"')
seen_assets = set()

for page in pages:
    html = read(os.path.join(ROOT, page))
    for ref in attr_re.findall(html):
        if ref.startswith(("http://", "https://", "mailto:", "tel:", "#", "data:")):
            continue
        path = urlparse(ref).path
        if not path:
            continue
        seen_assets.add(path)
        target = os.path.join(ROOT, path.lstrip("/"))
        if not os.path.exists(target):
            fail(page, f"missing asset or page: {ref}")

# ---------------------------------------------------------- 2. catalogue
cat_path = os.path.join(ROOT, "assets", "js", "catalogue.js")
catalogue = {}
if not os.path.exists(cat_path):
    fail("catalogue.js", "missing - run the assets/build steps")
else:
    raw = read(cat_path)
    blob = raw[raw.index("["): raw.rindex("]") + 1]
    for item in json.loads(blob):
        catalogue[item["id"]] = item

    nuts = read(os.path.join(ROOT, "nuts.html"))
    tile_re = re.compile(
        r'data-product="(?P<id>[^"]+)"[^>]*?data-kind="(?P<kind>[^"]*)"\s*'
        r'data-name="(?P<name>[^"]*)"\s*data-size="(?P<size>[^"]*)"\s*'
        r'data-price="(?P<price>[^"]*)"',
        re.S,
    )
    tiles = {m.group("id"): m.groupdict() for m in tile_re.finditer(nuts)}
    if len(tiles) != len(catalogue):
        fail("nuts.html",
             f"has {len(tiles)} product tiles, catalogue has {len(catalogue)}")
    for pid, item in catalogue.items():
        t = tiles.get(pid)
        if not t:
            fail("nuts.html", f"no static tile for catalogue id {pid}")
            continue
        if t["name"] != item["name"]:
            fail("nuts.html", f"{pid}: name {t['name']!r} != catalogue {item['name']!r}")
        if t["size"] != item["size"]:
            fail("nuts.html", f"{pid}: size {t['size']!r} != catalogue {item['size']!r}")
        if int(t["price"]) != item["price"]:
            fail("nuts.html", f"{pid}: price {t['price']} != catalogue {item['price']}")
        if not os.path.exists(os.path.join(ROOT, item["img"])):
            fail("catalogue.js", f"{pid}: image not found {item['img']}")

# --------------------------------------------------------- 3. page basics
for page in pages:
    html = read(os.path.join(ROOT, page))

    def one(pattern, label, required=True, group=1):
        m = re.search(pattern, html, re.I | re.S)
        if not m:
            if required:
                fail(page, f"missing {label}")
            return None
        return m.group(group).strip() if m.lastindex else m.group(0)

    one(r"<title>(.*?)</title>", "<title>")
    desc = one(r'<meta\s+name="description"\s+content="([^"]*)"', "meta description")
    if desc and len(desc) < 50:
        fail(page, f"meta description is only {len(desc)} chars")
    one(r'<link\s+rel="canonical"\s+href="([^"]*)"', "canonical link")
    one(r'<html\s+lang="([^"]*)"', "html lang")
    one(r'<a class="skip-link"', "skip link", group=0)

    h1s = len(re.findall(r"<h1[\s>]", html))
    if h1s != 1:
        fail(page, f"has {h1s} <h1> elements, expected exactly 1")

    for m in re.finditer(r"<img\b[^>]*>", html):
        tag = m.group(0)
        if "alt=" not in tag:
            fail(page, f"img without alt: {tag[:70]}")
        # Intrinsic dimensions let the browser reserve the box before the file
        # arrives; without them every image is a layout shift when it pops in.
        if "width=" not in tag or "height=" not in tag:
            fail(page, f"img without width/height (CLS risk): {tag[:70]}")

    # aria-current is legitimate in two places: the current nav item and the
    # last breadcrumb crumb. Check each on its own terms rather than counting.
    # The legal page and 404 are reached from the footer, not the primary nav,
    # so neither is expected to light up a nav item.
    in_nav = page not in ("legal.html", "404.html")
    nav_cur = len(re.findall(r'class="nav__link"[^>]*aria-current="page"', html))
    if not in_nav:
        if nav_cur:
            fail(page, "this page is not in the primary nav but marks one current")
    elif nav_cur != 1:
        fail(page, f"{nav_cur} current nav links, expected 1")

    crumbs = re.search(r'<nav class="crumbs".*?</nav>', html, re.S)
    if page in NO_CRUMBS or page == "index.html":
        if crumbs:
            fail(page, "this page should not carry a breadcrumb")
    else:
        if not crumbs:
            fail(page, "no breadcrumb navigation")
        elif 'aria-current="page"' not in crumbs.group(0):
            fail(page, "breadcrumb has no aria-current on its last item")

# ----------------------------------------------------- 4. origin consistency
# Everything machine-read by a crawler - canonical, OG, JSON-LD, sitemap,
# robots - has to name the host that actually serves the site. Getting this
# wrong makes a live URL declare itself a duplicate of a domain that does not
# resolve, and search engines drop it. That regression has already happened
# once here, so it is now a build failure rather than something to spot.
SITE = None
_cfg = read(os.path.join(BUILD_DIR, "site-config.mjs"))
_m = re.search(r'process\.env\.SITE_ORIGIN\s*\|\|\s*"([^"]+)"', _cfg)
if not _m:
    fail("site-config.mjs", "cannot read the SITE default")
else:
    SITE = _m.group(1).rstrip("/")

sitemap_raw = read(os.path.join(ROOT, "sitemap.xml"))
robots_raw = read(os.path.join(ROOT, "robots.txt"))

sitemap_locs = re.findall(r"<loc>([^<]+)</loc>", sitemap_raw)
robots_sitemap = re.search(r"^Sitemap:\s*(\S+)", robots_raw, re.M)

if SITE:
    for loc in sitemap_locs:
        if not loc.startswith(SITE):
            fail("sitemap.xml", f"URL not on the live origin {SITE}: {loc}")
    if robots_sitemap and robots_sitemap.group(1) != f"{SITE}/sitemap.xml":
        fail("robots.txt", f"Sitemap is {robots_sitemap.group(1)}, expected {SITE}/sitemap.xml")
    if re.search(r"^User-agent:\s*\*\s*\n\s*Disallow:\s*\S", robots_raw, re.M):
        fail("robots.txt", "blocks all crawlers")

    # every indexable page must be in the sitemap, and every sitemap URL real.
    # The home page normalises to "/" and is checked separately.
    expected_in_sitemap = {"nuts.html", "about.html", "retailers.html",
                           "distributors.html", "contact.html", "legal.html"}
    listed = {loc.replace(SITE + "/", "") for loc in sitemap_locs}
    listed.discard("")
    if f"{SITE}/" not in sitemap_locs:
        fail("sitemap.xml", f"missing the home page {SITE}/")
    for p in expected_in_sitemap:
        if p not in listed:
            fail("sitemap.xml", f"missing {SITE}/{p}")
    for extra in listed - expected_in_sitemap:
        fail("sitemap.xml", f"unexpected entry (no matching page): {extra}")

    for page in pages:
        if page == "404.html":
            continue
        html = read(os.path.join(ROOT, page))
        path = "" if page == "index.html" else page

        checks = [
            ("canonical", rf'<link rel="canonical" href="{re.escape(SITE)}/{re.escape(path)}"'),
            ("og:url", rf'<meta property="og:url" content="{re.escape(SITE)}/{re.escape(path)}"'),
        ]
        for label, pattern in checks:
            if not re.search(pattern, html):
                got = re.search(pattern.replace(re.escape(SITE), "(.*?)", 1).replace(
                    re.escape(path), "(.*?)", 1).replace(re.escape(SITE + "/"), "(.*?)"), html)
                fail(page, f"{label} points somewhere other than the live origin: "
                           f"{got.group(1) if got else 'absent'}")

        # structured data
        ld = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        if not ld:
            fail(page, "no JSON-LD block")
        else:
            try:
                doc = json.loads(ld.group(1))
            except Exception as e:
                fail(page, f"JSON-LD is not valid JSON: {e}")
                doc = None
            if doc is not None:
                types = [n.get("@type") for n in doc.get("@graph", [])]
                for required in ("Organization", "WebSite"):
                    if required not in types:
                        fail(page, f"JSON-LD missing {required}")
                if page in expected_in_sitemap and page != "index.html":
                    if "BreadcrumbList" not in types:
                        fail(page, "JSON-LD missing BreadcrumbList")
                if page == "index.html" and "BreadcrumbList" in types:
                    fail(page, "home page should not declare a BreadcrumbList")
                if page == "nuts.html":
                    for required in ("ItemList", "Product"):
                        if required not in types:
                            fail(page, f"nuts.html JSON-LD missing {required}")

                # A repacker cannot stand behind published prices or nutrition.
                # An Offer with an invented number is a rich result stating
                # something false, which is worse than no rich result.
                blob = json.dumps(doc)
                for forbidden in ('"price"', '"offers"', '"priceCurrency"',
                                  '"nutrition"', '"calories"'):
                    if forbidden in blob:
                        fail(page, f"JSON-LD contains {forbidden} - "
                                   f"a repacker must not publish prices or nutrition")

# ------------------------------------------------------------------ report
if problems:
    print(f"FAIL  {len(problems)} problem(s)\n")
    for p in problems:
        print("  - " + p)
    sys.exit(1)

img_count = sum(1 for a in seen_assets if a.lower().endswith((".webp", ".png", ".svg")))
print(f"PASS  {len(pages)} pages, {len(catalogue)} catalogue products, "
      f"{img_count} image references, {len(seen_assets)} linked assets")
for n in notes:
    print("  note: " + n)
