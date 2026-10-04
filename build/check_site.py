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
