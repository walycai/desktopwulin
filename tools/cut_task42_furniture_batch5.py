#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets/source/task42"

ITEMS = {
    "decor_vase": {
        "src": "decor_vase_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (123, 184),
        "pad": 8,
        "boxes": [
            (140, 136, 524, 842),
            (620, 136, 1002, 848),
            (1100, 138, 1480, 850),
            (1562, 140, 1944, 850),
        ],
    },
    "decor_bonsai": {
        "src": "decor_bonsai_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (192, 227),
        "pad": 8,
        "boxes": [
            (36, 214, 516, 760),
            (576, 208, 1018, 762),
            (1038, 214, 1492, 762),
            (1532, 212, 2008, 764),
        ],
    },
    "decor_wine": {
        "src": "decor_wine_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (251, 216),
        "pad": 8,
        "boxes": [
            (28, 182, 492, 790),
            (536, 182, 990, 792),
            (1060, 186, 1514, 802),
            (1556, 188, 2020, 800),
        ],
    },
    "decor_wash_basin": {
        "src": "decor_wash_basin_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (246, 174),
        "pad": 8,
        "boxes": [
            (36, 314, 496, 660),
            (544, 314, 998, 662),
            (1058, 314, 1502, 662),
            (1566, 320, 2016, 662),
        ],
    },
    "decor_floor_lamp": {
        "src": "decor_floor_lamp_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (136, 266),
        "pad": 4,
        "boxes": [
            (190, 64, 458, 926),
            (672, 64, 934, 926),
            (1140, 64, 1402, 926),
            (1590, 64, 1852, 926),
        ],
    },
}

SUFFIXES = ["", "_r1", "_r2", "_r3"]


def white_to_alpha(im):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            dist = max(0, 255 - min(r, g, b))
            if r > 248 and g > 248 and b > 248:
                px[x, y] = (r, g, b, 0)
            elif r > 242 and g > 242 and b > 242:
                px[x, y] = (r, g, b, min(a, dist * 5))
    return im


def remove_small_fragments(im, min_area=120):
    alpha = im.getchannel("A")
    w, h = im.size
    pix = alpha.load()
    seen = set()
    comps = []
    for y in range(h):
        for x in range(w):
            if pix[x, y] <= 8 or (x, y) in seen:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            pts = []
            while stack:
                px, py = stack.pop()
                pts.append((px, py))
                for nx in (px - 1, px, px + 1):
                    for ny in (py - 1, py, py + 1):
                        if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in seen:
                            continue
                        if pix[nx, ny] > 8:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            comps.append(pts)
    keep = set()
    for pts in comps:
        if len(pts) >= min_area:
            keep.update(pts)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    src = im.load()
    dst = out.load()
    for x, y in keep:
        dst[x, y] = src[x, y]
    return out


def strip_edge_alpha(im):
    px = im.load()
    w, h = im.size
    for x in range(w):
        px[x, 0] = px[x, 0][:3] + (0,)
        px[x, h - 1] = px[x, h - 1][:3] + (0,)
    for y in range(h):
        px[0, y] = px[0, y][:3] + (0,)
        px[w - 1, y] = px[w - 1, y][:3] + (0,)
    return im


def fit_canvas(crop, canvas, pad):
    crop = remove_small_fragments(white_to_alpha(crop))
    bbox = crop.getchannel("A").getbbox()
    out = Image.new("RGBA", canvas, (0, 0, 0, 0))
    if not bbox:
        return out
    spr = crop.crop(bbox)
    max_w = canvas[0] - pad * 2
    max_h = canvas[1] - pad * 2
    scale = min(max_w / spr.width, max_h / spr.height)
    nw = max(1, int(spr.width * scale))
    nh = max(1, int(spr.height * scale))
    spr = spr.resize((nw, nh), Image.Resampling.LANCZOS)
    out.alpha_composite(spr, ((canvas[0] - nw) // 2, canvas[1] - pad - nh))
    return strip_edge_alpha(remove_small_fragments(out))


def make_preview(paths, out_path):
    cell_w = max(Image.open(p).width for p in paths) + 22
    cell_h = max(Image.open(p).height for p in paths) + 42
    rows = (len(paths) + 3) // 4
    preview = Image.new("RGBA", (cell_w * 4, cell_h * rows), (232, 229, 218, 255))
    d = ImageDraw.Draw(preview)
    for idx, path in enumerate(paths):
        im = Image.open(path).convert("RGBA")
        x = (idx % 4) * cell_w + (cell_w - im.width) // 2
        y = (idx // 4) * cell_h + 10
        preview.alpha_composite(im, (x, y))
        d.text(((idx % 4) * cell_w + 8, y + im.height + 8), path.stem, fill=(0, 0, 0, 255))
    preview.save(out_path)


def main():
    written = []
    for item_id, cfg in ITEMS.items():
        sheet = Image.open(SRC_DIR / cfg["src"]).convert("RGBA")
        cfg["out_dir"].mkdir(parents=True, exist_ok=True)
        for suffix, box in zip(SUFFIXES, cfg["boxes"]):
            out = fit_canvas(sheet.crop(box), cfg["canvas"], cfg["pad"])
            path = cfg["out_dir"] / f"{item_id}{suffix}.png"
            out.save(path)
            written.append(path)
    make_preview(written, ROOT / "preview_task42_furniture_batch5_x2.png")


if __name__ == "__main__":
    main()
