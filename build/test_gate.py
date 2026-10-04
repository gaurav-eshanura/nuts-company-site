"""Fault-injection test for check_site.py.

A build gate that has only ever passed proves nothing. This deliberately breaks
one thing at a time and asserts the gate actually catches it, then restores the
original file and re-asserts the tree is clean.

    python build/test_gate.py

Every write is constrained to the project root and checked for containment before
it happens, so a mutated path can never reach outside the repository.
"""
import json
import os
import re
import shutil
import subprocess
import sys

BUILD = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BUILD)
ROOT_REAL = os.path.abspath(ROOT)
CHECK = os.path.join(BUILD, "check_site.py")
TMPNAME = ".gate-test"
TMP = os.path.join(ROOT, TMPNAME)
BACKUPS = os.path.join(TMP, "backup")

# Only these top-level project files may be mutated by this harness.
MUTABLE = {"index.html", "nuts.html", "sitemap.xml", "robots.txt"}


def inside(root, path):
    """True when path resolves inside root."""
    root = os.path.abspath(root)
    target = os.path.abspath(path)
    return target == root or target.startswith(root + os.sep)


def resolve(rel):
    """Absolute path for a project-relative file, or refuse."""
    if os.path.basename(rel) != rel or rel in (".", ""):
        raise ValueError(f"expected a plain project-relative filename: {rel!r}")
    dest = os.path.join(ROOT, rel)
    if not inside(ROOT, dest):
        raise ValueError(f"refusing to touch {dest!r}, outside {ROOT}")
    return dest


def run_gate():
    # parameter list, never a shell string
    r = subprocess.run(
        [sys.executable, CHECK],
        capture_output=True,
        text=True,
        cwd=ROOT,
        shell=False,
    )
    return r.returncode == 0, (r.stdout + r.stderr)


def read(rel):
    with open(resolve(rel), encoding="utf-8") as f:
        return f.read()


def write(rel, text):
    dest = resolve(rel)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(text)


def must(cond, msg):
    if not cond:
        raise AssertionError(msg)


def swap(rel, mutate):
    """Back up a file, apply a mutation, run the gate, always restore."""
    must(rel in MUTABLE, f"{rel} is not in the mutable allow-list")
    dest = resolve(rel)
    os.makedirs(BACKUPS, exist_ok=True)
    backup = os.path.join(BACKUPS, os.path.basename(rel))
    shutil.copy2(dest, backup)
    write(rel, mutate(read(rel)))
    try:
        return run_gate()
    finally:
        shutil.copy2(backup, dest)


CASES = []


def case(name, target):
    def deco(fn):
        CASES.append((name, target, fn))
        return fn
    return deco


@case("canonical points at a different domain", "index.html")
def _(s):
    return s.replace('rel="canonical" href="https://nuts.eshanura.com/"',
                     'rel="canonical" href="https://thenutscompany.in/"')


@case("og:url points at a different domain", "index.html")
def _(s):
    return s.replace('property="og:url" content="https://nuts.eshanura.com/"',
                     'property="og:url" content="https://thenutscompany.in/"')


@case("sitemap lists a stale host", "sitemap.xml")
def _(s):
    return s.replace("https://nuts.eshanura.com/about.html",
                     "https://thenutscompany.in/about.html")


@case("sitemap omits a page", "sitemap.xml")
def _(s):
    kept = [l for l in s.splitlines(keepends=True) if "contact.html" not in l]
    must(len(kept) < len(s.splitlines()), "no contact.html line to remove")
    return "".join(kept)


@case("sitemap gains a URL with no page", "sitemap.xml")
def _(s):
    return s.replace("</urlset>",
                     "  <url><loc>https://nuts.eshanura.com/ghost.html</loc></url>\n</urlset>")


@case("robots.txt blocks all crawlers", "robots.txt")
def _(s):
    return s.replace("User-agent: *\nAllow: /", "User-agent: *\nDisallow: /")


@case("robots.txt names the wrong sitemap", "robots.txt")
def _(s):
    return re.sub(r"^Sitemap:.*$", "Sitemap: https://thenutscompany.in/sitemap.xml",
                  s, flags=re.M)


def _mutate_json(s, fn):
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    must(m, "no JSON-LD block to mutate")
    doc = json.loads(m.group(2))
    fn(doc)
    return s[: m.start(2)] + json.dumps(doc) + s[m.end(2):]


@case("JSON-LD is malformed", "nuts.html")
def _(s):
    return s.replace('type="application/ld+json">{"@context"',
                     'type="application/ld+json">{BROKEN', 1)


def _drop_type(s, want):
    """Retype a node in the JSON-LD. Parse and re-serialise rather than string
    replacing, so the mutation does not depend on JSON.stringify's spacing."""
    def mutate(doc):
        hits = [n for n in doc["@graph"] if n.get("@type") == want]
        must(hits, f"no {want} node to remove")
        for n in hits:
            n["@type"] = want + "X"
    return _mutate_json(s, mutate)


@case("nuts.html loses its ItemList", "nuts.html")
def _(s):
    return _drop_type(s, "ItemList")


@case("inner page loses its BreadcrumbList", "nuts.html")
def _(s):
    return _drop_type(s, "BreadcrumbList")


@case("home page wrongly declares a BreadcrumbList", "index.html")
def _(s):
    return _mutate_json(s, lambda d: d["@graph"].append(
        {"@type": "BreadcrumbList", "itemListElement": []}))


@case("fabricated Offer/price added to JSON-LD", "nuts.html")
def _(s):
    return _mutate_json(s, lambda d: d["@graph"].append(
        {"@type": "Offer", "price": "40", "priceCurrency": "INR"}))


@case("nutrition claimed in structured data", "nuts.html")
def _(s):
    return _mutate_json(s, lambda d: d["@graph"][0].update(
        {"nutrition": {"calories": "580 kcal"}}))


@case("an <img> loses its width/height", "nuts.html")
def _(s):
    m = re.search(r'<img[^>]*\swidth="\d+"[^>]*\sheight="\d+"[^>]*>', s)
    must(m, "no dimensioned img found")
    return s.replace(m.group(0), m.group(0).replace(' width="', ' data-x="'), 1)


def main():
    ok, out = run_gate()
    if not ok:
        print("gate does not pass on a clean tree:")
        print(out)
        return 2

    missed = []
    print(f"clean tree: PASS\n\nfault injection ({len(CASES)} cases)")
    for name, target, mutate in CASES:
        passed, output = swap(target, mutate)
        status = "MISSED " if passed else "caught "
        detail = ""
        if not passed:
            for line in output.splitlines():
                if line.strip().startswith("- "):
                    detail = line.strip()[2:]
                    break
        print(f"  [{status}] {name}")
        if detail:
            print(f"            {detail[:90]}")
        if passed:
            missed.append(name)

    shutil.rmtree(TMP, ignore_errors=True)

    ok, out = run_gate()
    if not ok:
        print("\nrestored tree did NOT return to passing:")
        print(out)
        return 2
    print(f"\nrestored tree: PASS")
    print(f"{len(CASES) - len(missed)}/{len(CASES)} regressions caught")
    if missed:
        print("MISSED: " + ", ".join(missed))
    return 1 if missed else 0


if __name__ == "__main__":
    sys.exit(main())
