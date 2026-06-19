#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets/source/task42"

ITEMS = {
    "bed_basic": {
        "src": "bed_basic_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/bed",
        "canvas": (281, 203),
        "pad": 8,
        "boxes": [
            (12, 244, 515, 690),
            (548, 244, 1052, 690),
            (1050, 336, 1525, 674),
            (1558, 336, 2032, 678),
        ],
    },
    "storage_shelf": {
        "src": "storage_shelf_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/storage",
        "canvas": (259, 274),
        "pad": 10,
        "boxes": [
            (96, 54, 490, 942),
            (580, 54, 978, 942),
            (1090, 54, 1488, 952),
            (1542, 54, 1936, 952),
        ],
    },
    "table_square": {
        "src": "table_square_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/table",
        "canvas": (310, 245),
        "pad": 10,
        "boxes": [
            (0, 242, 516, 730),
            (510, 242, 1024, 732),
            (1030, 242, 1536, 732),
            (1536, 242, 2048, 734),
        ],
    },
    "chair_round": {
        "src": "chair_round_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/chair",
        "canvas": (229, 241),
        "pad": 10,
        "boxes": [
            (10, 144, 478, 842),
            (532, 144, 994, 842),
            (1074, 154, 1522, 824),
            (1566, 164, 2010, 830),
        ],
    },
    "decor_food_box": {
        "src": "decor_food_box_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (188, 248),
        "pad": 10,
        "boxes": [
            (24, 184, 490, 780),
            (514, 192, 970, 780),
            (1080, 192, 1532, 778),
            (1552, 182, 2020, 778),
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
    make_preview(written, ROOT / "preview_task42_furniture_pilot_x2.png")


if __name__ == "__main__":
    main()
