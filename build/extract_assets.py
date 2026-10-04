"""Extract optimised web assets from The Nuts Company homepage design sheet.

The source is a 910x1728 render of the approved homepage design. Everything the
page needs - product photography, scene art, retail/distributor imagery - is
cropped out of that sheet here, so the build never depends on external stock.

Two extraction strategies are used, because the sheet has two kinds of art:

  * SCENE art (hero, bowl, aisle, warehouse, hand) stays photographic. It is
    cropped as a rectangle and sits behind or beside real HTML text.
  * PRODUCT art (every pouch shot) sits on a flat card. Flat-card regions get a
    soft alpha matte so a pouch drops onto any page background.

Locating the pouches inside a card is done by column ink profile. The pouches in
this design are packed almost shoulder to shoulder, so the cream gaps between
them are only one to three pixels wide and never fall below a usable absolute
threshold. Splitting on the *lowest local minima* of the profile instead finds
those seams reliably; an absolute threshold collapses all four pouches into one
band.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = r"C:\Users\shiva\Downloads\The Nuts Company Premium Homepage.png"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PRODUCTS = os.path.join(ROOT, "assets", "img", "products")
SCENES = os.path.join(ROOT, "assets", "img", "scenes")
for d in (PRODUCTS, SCENES):
    os.makedirs(d, exist_ok=True)

sheet = Image.open(SRC).convert("RGB")
ARR = np.asarray(sheet).astype(np.float32)
print("source sheet", sheet.size)

# Cream the flat cards and panels are painted with. Measured off the sheet.
CARD_CREAM = np.array([247.0, 240.0, 229.0])

SIZES = ["20", "50", "100", "200"]
PACK_CAPTION = {
    "20": "On-the-go", "50": "Everyday",
    "100": "Better value", "200": "Family pack",
}


def save_web(im, path, max_w=1600, quality=86):
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    im.save(path, "WEBP", quality=quality, method=6)
    return os.path.getsize(path)


def crop(box, upscale=1.0):
    im = sheet.crop(box)
    if upscale != 1.0:
        im = im.resize(
            (round(im.width * upscale), round(im.height * upscale)), Image.LANCZOS
        )
    return im


def matte(im, ref=None, low=8.0, high=44.0, feather=0.7):
    """Knock a flat card background out into a soft alpha matte."""
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    if ref is None:
        pad = max(3, min(im.size) // 12)
        patch = np.concatenate([
            a[:pad, :pad].reshape(-1, 3), a[:pad, -pad:].reshape(-1, 3),
            a[-pad:, :pad].reshape(-1, 3), a[-pad:, -pad:].reshape(-1, 3),
        ], axis=0)
        ref = np.median(patch, axis=0)
    dist = np.sqrt(((a - ref) ** 2).sum(axis=2))
    alpha = np.clip((dist - low) / (high - low), 0.0, 1.0)
    alpha[dist < 3.0] = 0.0
    out = Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), "RGBA")
    if feather:
        out = out.filter(ImageFilter.GaussianBlur(feather))
    return out


def trim_alpha(im, pad=2, thresh=110):
    """Crop to the solid part of the subject.

    The matte leaves a faint wash of alpha over the cream, so trimming at "any
    alpha at all" keeps the whole crop box - including the empty space above a
    20 g pouch, whose top sits well below the crop top. Trimming on a near-opaque
    threshold finds the pouch itself.
    """
    a = np.asarray(im)
    ys, xs = np.where(a[:, :, 3] > thresh)
    if len(xs) == 0:
        return im
    return im.crop((
        max(0, xs.min() - pad), max(0, ys.min() - pad),
        min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad),
    ))


def ink_profile(box, ref=CARD_CREAM, tol=18.0):
    """Per-column fraction of rows that differ from the card cream."""
    sub = ARR[box[1]:box[3], box[0]:box[2]]
    return (np.abs(sub - ref).max(axis=2) > tol).mean(axis=0)


def split_bands(profile, n, x0, edge=0.04, min_band=28):
    """Split a content profile into exactly n bands at its cheapest valleys.

    `x0` is the profile's absolute left edge in the sheet, so the bands this
    returns are absolute crop boxes and can go straight into `sheet.crop`.

    The four pouch shots in a card are ordered small -> large, and the cream
    between two of them is a genuine valley in the profile. Picking the n-1
    *deepest* valleys greedily does not work: several adjacent pixels can all sit
    at zero and the greedy choice piles all the cuts into one gap, collapsing
    three of the bands. Choosing the cut set that minimises total valley depth
    while forcing every band to be at least `min_band` wide fixes that, because a
    degenerate cut set simply cannot satisfy the width constraint.
    """
    inside = np.where(profile > edge)[0]
    if len(inside) == 0:
        return []
    lo, hi = int(inside[0]), int(inside[-1])
    seg = profile[lo:hi + 1].copy()
    L = len(seg)
    if L < n * min_band:
        return []

    # candidate cut points are local minima; every other column is a ridge and
    # would cost more than any real valley, so it can never be chosen
    is_min = np.ones(L, dtype=bool)
    for i in range(1, L - 1):
        is_min[i] = seg[i] <= seg[i - 1] and seg[i] <= seg[i + 1]
    cost = np.where(is_min, seg, np.inf)

    # dp[c][i] = cheapest way to place exactly c cuts with the last one at column i
    INF = float("inf")
    dp = [[INF] * L for _ in range(n)]      # n bands need at most n-1 cuts
    par = [[-1] * L for _ in range(n)]
    for i in range(min_band, L - min_band + 1):
        if np.isfinite(cost[i]):
            dp[1][i] = cost[i]
    for c in range(2, n):
        best, best_i = INF, -1
        for i in range(min_band, L - min_band + 1):
            k = i - min_band
            if k >= 0 and dp[c - 1][k] < best:
                best, best_i = dp[c - 1][k], k
            if best < INF and np.isfinite(cost[i]):
                dp[c][i] = best + cost[i]
                par[c][i] = best_i

    if n == 1:
        return [(x0 + lo, x0 + hi)]

    last = int(np.argmin(dp[n - 1]))
    if not np.isfinite(dp[n - 1][last]):
        return []

    cuts = []
    i = last
    for c in range(n - 1, 1, -1):
        cuts.append(i)
        i = par[c][i]
        if i < 0:
            return []
    if i >= 0:
        cuts.append(i)
    cuts.sort()

    # cuts index into seg, which starts at profile index lo, which starts at x0
    bounds = [0] + cuts + [L]
    return [(x0 + lo + bounds[i], x0 + lo + bounds[i + 1] - 1) for i in range(n)]


def card_runs(band, min_w=60):
    """Find the horizontal extents of every flat card in a row band.

    A single scan row cannot do this: the pouches' drop shadows, the size
    captions and the "View ..." buttons all cross any given row and punch holes
    in it. Taking the *median* of each column down the band makes those
    minority marks disappear and leaves only the card-vs-page decision.
    """
    card = np.array([247.0, 240.0, 229.0])   # card cream
    page = np.array([251.0, 246.0, 239.0])   # page cream
    med = np.median(ARR[band[0]:band[1]], axis=0)
    is_card = np.abs(med - card).max(axis=1) <= np.abs(med - page).max(axis=1)
    idx = np.where(is_card)[0]
    if len(idx) == 0:
        return []
    runs, start, prev = [], int(idx[0]), int(idx[0])
    for x in idx[1:]:
        if x - prev > 4:
            if prev - start + 1 >= min_w:
                runs.append((start, prev))
            start = int(x)
        prev = int(x)
    if prev - start + 1 >= min_w:
        runs.append((start, prev))
    return runs


# --------------------------------------------------------------------------
# 1. Scene art - photographic regions kept as rectangles
# --------------------------------------------------------------------------
SCENES_SPEC = {
    # The crop starts below the design's transparent header band (y < 56), which
    # carries the original nav labels and icons. Slicing from the top would bake
    # a second, stale navigation into the hero photograph.
    "hero-art":      ((296,  58, 910, 466), 2.0, 1500),
    "bowl":          ((198, 800, 492, 1115), 3.0, 1200),
    "chhoti-hand":   ((756, 800, 910, 1120), 3.0, 900),
    "retail-aisle":  (( 17,1300, 192, 1522), 3.0, 800),
    "distributor":   ((457,1300, 658, 1522), 3.0, 800),
}
print("\n-- scenes --")
for name, (box, up, mw) in SCENES_SPEC.items():
    n = save_web(crop(box, up), os.path.join(SCENES, f"{name}.webp"), max_w=mw)
    print(f"  {name:<15} {box}  ->  {n//1024} KB")

# --------------------------------------------------------------------------
# 2. Hero pouches - large and cleanly separated, matte against local cream
# --------------------------------------------------------------------------
print("\n-- hero pouches --")
for name, box in {
    "almonds-200": (344, 128, 494, 412),
    "cashews-200": (496,  68, 696, 414),
    "raisins-200": (694, 148, 864, 416),
}.items():
    im = trim_alpha(matte(crop(box, 2.0)), pad=3)
    n = save_web(im, os.path.join(PRODUCTS, f"{name}.webp"), max_w=760, quality=88)
    print(f"  {name:<15} {im.size}  ->  {n//1024} KB")


def band_content_height(box, tol=18.0, frac=0.12):
    """Height in source pixels of the pouch inside a band, shadows excluded."""
    sub = ARR[box[1]:box[3], box[0]:box[2]]
    ink = (np.abs(sub - CARD_CREAM).max(axis=2) > tol).mean(axis=1)
    rows = np.where(ink > frac)[0]
    return int(rows[-1] - rows[0] + 1) if len(rows) else box[3] - box[1]


def content_extent(box, edge=0.04):
    """First and last column of a box that carry any content."""
    inside = np.where(ink_profile(box) > edge)[0]
    if len(inside) == 0:
        return box[0], box[2]
    return box[0] + int(inside[0]), box[0] + int(inside[-1])


def caption_centers(y0, y1, x0, x1, tol=60, frac=0.10, min_w=8, bridge=6):
    """Horizontal centres of the size captions printed under a row of shots.

    Some rows are too loosely spaced for the ink profile alone. The pack-size
    strip is the clear case: its background is a green-tinted gradient rather
    than flat card cream, so the reference colour mismatches across the row and
    the cream gaps between shots never fall to zero. The dark green caption text
    ("20 g", "50 g", ...) is immune to that, and each caption is centred under
    the shot it belongs to, so it anchors the cut positions directly.
    """
    sub = ARR[y0:y1, x0:x1]
    d = np.abs(sub - CARD_CREAM).max(axis=2)
    m = (d > tol).mean(axis=0) > frac
    idx = np.where(m)[0]
    if len(idx) == 0:
        return []
    runs, s, p = [], int(idx[0]), int(idx[0])
    for x in idx[1:]:
        if x - p > bridge:
            if p - s + 1 >= min_w:
                runs.append((s + x0, p + x0))
            s = int(x)
        p = int(x)
    if p - s + 1 >= min_w:
        runs.append((s + x0, p + x0))
    return [(a + b) // 2 for a, b in runs]


def bands_from_captions(centers, x_lo, x_hi):
    """Crop bands centred on caption positions, split at the midpoints."""
    edges = [x_lo] + [(centers[i] + centers[i + 1]) // 2
                      for i in range(len(centers) - 1)] + [x_hi]
    return [(edges[i], edges[i + 1] - 1) for i in range(len(edges) - 1)]


def emit_pouches(kind, box, prefix, n=4, upscale=3.0, max_w=520, mat=True,
                 captions=None, normalise=True):
    """Detect `n` pouch bands in `box`, matte each, and write them out."""
    if captions:
        centers = caption_centers(*captions)
        x_lo, x_hi = content_extent(box)
        bands = bands_from_captions(centers, x_lo, x_hi) if centers else []
        how = f"captions {centers}"
    else:
        bands = split_bands(ink_profile(box), n, x0=box[0])
        how = "ink profile"
    if len(bands) != n:
        print(f"  !! {kind}: expected {n} bands, got {len(bands)} via {how} ({bands})")
        return
    print(f"  {kind}: {how}")

    subs = [(x0 - 2, box[1], x1 + 3, box[3]) for x0, x1 in bands]
    imgs = []
    for sub in subs:
        im = crop(sub, upscale)
        if mat:
            im = trim_alpha(matte(im), pad=3)
        imgs.append(im)

    # Scale the pouches to their true relative size.
    #
    # Every pouch is cropped from a row that shares one baseline, so the height
    # of its ink in the source *is* its real height: the 20 g stands 90 px tall
    # where the 200 g stands 133. Without this the trimmed assets keep whatever
    # bleed the matte left them, the row ends up with three near-identical
    # heights, and the CSS - which pins every pouch to one common height and
    # lets width follow - renders the small packs far too large.
    if normalise:
        heights = [band_content_height(s) for s in subs]
        ref_h, ref_img = max(zip(heights, imgs), key=lambda t: t[0])
        print(f"    true heights {heights} px, scaling to ref {ref_img.height}px")
        imgs = [
            im.resize((max(1, round(im.width * (ref_img.height * h / ref_h) / im.height)),
                       max(1, round(ref_img.height * h / ref_h))), Image.LANCZOS)
            for im, h in zip(imgs, heights)
        ]

    names = []
    for i, (sub, im) in enumerate(zip(subs, imgs)):
        size = SIZES[i]
        name = f"{prefix}-{size}"
        size_kb = save_web(im, os.path.join(PRODUCTS, f"{name}.webp"),
                           max_w=max_w, quality=88)
        names.append(name)
        print(f"  {name:<26} x{sub[0]}-{sub[2]}  {im.size}  ->  {size_kb//1024} KB"
              + (f"   ({PACK_CAPTION[size]})" if prefix.startswith("packsize") else ""))
    return names


# --------------------------------------------------------------------------
# 3. Product cards - four pouches each, laid out by the design
# --------------------------------------------------------------------------
print("\n-- product cards --")
CARD_BAND = (686, 756)  # below the pouches, across captions and buttons
runs = card_runs(CARD_BAND)
print(f"  card runs: {runs}")
CARD_BOXES = {
    "almonds": (runs[0][0] + 2, 556, runs[0][1] - 2, 697),
    "cashews": (runs[1][0] + 2, 556, runs[1][1] - 2, 697),
    "raisins": (runs[2][0] + 2, 556, runs[2][1] - 2, 697),
}
for kind, box in CARD_BOXES.items():
    print(f"  {kind} card {box}")
    emit_pouches(kind, box, kind, n=4)

# --------------------------------------------------------------------------
# 4. Pack-size strip and the Chhoti Pack range row
# --------------------------------------------------------------------------
print("\n-- pack sizes --")
emit_pouches("packsize", (218, 1118, 700, 1252), "packsize-almonds", n=4,
             max_w=460, captions=(1262, 1276, 200, 720))

print("\n-- chhoti pack --")
emit_pouches("chhoti", (526, 954, 772, 1078), "chhoti-cashews", n=4, max_w=380,
             # These four share a row with the hand photograph and the headline,
             # so a band's ink height is not the pouch height. Skip the rescale
             # and let the fixed-height, auto-width CSS differentiate them.
             normalise=False)

# --------------------------------------------------------------------------
# 5. Contact sheet for visual QA
# --------------------------------------------------------------------------
print("\n-- contact sheet --")
tiles = []
for d in (SCENES, PRODUCTS):
    for f in sorted(os.listdir(d)):
        if f.endswith(".webp"):
            im = Image.open(os.path.join(d, f)).convert("RGBA")
            im.thumbnail((250, 190), Image.LANCZOS)
            tiles.append((f, im))

COLS, TW, TH = 5, 264, 224
rows = (len(tiles) + COLS - 1) // COLS
out = Image.new("RGB", (COLS * TW, rows * TH), (250, 248, 242))
dr = ImageDraw.Draw(out)
for i, (name, im) in enumerate(tiles):
    cx, cy = (i % COLS) * TW, (i // COLS) * TH
    tile = Image.new("RGB", im.size, (255, 255, 255))
    tile.paste(im, (0, 0), im)
    out.paste(tile, (cx + 6, cy + 6))
    dr.rectangle([cx + 6, cy + 6, cx + 6 + im.width, cy + 6 + im.height],
                 outline=(205, 200, 190))
    dr.text((cx + 8, cy + 202), name[:36], fill=(20, 60, 40))
out.save(os.path.join(ROOT, "build", "contact-sheet.png"))
print(f"  {len(tiles)} assets -> build/contact-sheet.png")
