#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets/source/task42"

ITEMS = {
    "bed_advanced": {
        "src": "bed_advanced_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/bed",
        "canvas": (370, 264),
        "pad": 12,
        "boxes": [
            (10, 230, 548, 730),
            (538, 228, 1074, 734),
            (1058, 290, 1578, 714),
            (1566, 290, 2040, 712),
        ],
    },
    "storage_wardrobe": {
        "src": "storage_wardrobe_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/storage",
        "canvas": (238, 273),
        "pad": 10,
        "boxes": [
            (20, 76, 478, 894),
            (550, 72, 990, 902),
            (1058, 78, 1488, 900),
            (1564, 66, 2012, 900),
        ],
    },
    "table_long": {
        "src": "table_long_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/table",
        "canvas": (266, 221),
        "pad": 8,
        "boxes": [
            (16, 252, 512, 740),
            (520, 252, 1018, 740),
            (1040, 252, 1540, 742),
            (1538, 250, 2036, 742),
        ],
    },
    "chair_bench": {
        "src": "chair_bench_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/chair",
        "canvas": (265, 196),
        "pad": 8,
        "boxes": [
            (10, 252, 522, 724),
            (520, 252, 1032, 728),
            (1022, 254, 1540, 734),
            (1532, 252, 2040, 734),
        ],
    },
    "decor_books": {
        "src": "decor_books_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (252, 201),
        "pad": 10,
        "boxes": [
            (34, 244, 528, 704),
            (530, 250, 1018, 724),
            (1044, 260, 1524, 724),
            (1544, 264, 2020, 710),
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
    preview = Image.new("RGBA", (cell_w * 4, cell_h * ((len(paths) + 3) // 4)), (232, 229, 218, 255))
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
    make_preview(written, ROOT / "preview_task42_furniture_batch2_x2.png")


if __name__ == "__main__":
    main()
