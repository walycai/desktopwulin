#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets/source/task42"

ROTATION_ITEMS = {
    "decor_rug_large": {
        "src": "decor_rug_large_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (360, 197),
        "pad": 10,
        "boxes": [
            (0, 230, 640, 760),
            (620, 210, 1005, 770),
            (1010, 240, 1640, 760),
            (1625, 210, 1995, 765),
        ],
    },
    "meditation_dais": {
        "src": "meditation_dais_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/func",
        "canvas": (244, 169),
        "pad": 8,
        "boxes": [
            (20, 285, 515, 675),
            (520, 285, 1015, 675),
            (1025, 285, 1520, 675),
            (1530, 285, 2025, 675),
        ],
    },
}

WALL_ITEMS = {
    "wall_landscape": {
        "src": "wall_landscape_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/wallhang",
        "canvas": (120, 90),
        "pad": 4,
        "boxes": [
            (15, 190, 740, 750),
            (795, 190, 1525, 750),
        ],
    },
    "wall_scroll": {
        "src": "wall_scroll_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/wallhang",
        "canvas": (120, 178),
        "pad": 4,
        "boxes": [
            (190, 25, 655, 950),
            (875, 25, 1340, 950),
        ],
    },
    "wall_swordrack": {
        "src": "wall_swordrack_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/wallhang",
        "canvas": (96, 70),
        "pad": 3,
        "boxes": [
            (30, 185, 690, 785),
            (845, 185, 1505, 785),
        ],
    },
}

ROTATION_SUFFIXES = ["", "_r1", "_r2", "_r3"]
WALL_SUFFIXES = ["_left", "_right"]


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


def remove_small_fragments(im, min_area=90):
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


def fit_canvas(crop, canvas, pad, anchor):
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
    x = (canvas[0] - nw) // 2
    if anchor == "bottom":
        y = canvas[1] - pad - nh
    else:
        y = (canvas[1] - nh) // 2
    out.alpha_composite(spr, (x, y))
    return strip_edge_alpha(remove_small_fragments(out))


def make_preview(paths, out_path):
    cell_w = max(Image.open(p).width for p in paths) * 2 + 28
    cell_h = max(Image.open(p).height for p in paths) * 2 + 44
    cols = 4
    rows = (len(paths) + cols - 1) // cols
    preview = Image.new("RGBA", (cell_w * cols, cell_h * rows), (232, 229, 218, 255))
    d = ImageDraw.Draw(preview)
    for idx, path in enumerate(paths):
        im = Image.open(path).convert("RGBA").resize(
            (Image.open(path).width * 2, Image.open(path).height * 2),
            Image.Resampling.NEAREST,
        )
        x = (idx % cols) * cell_w + (cell_w - im.width) // 2
        y = (idx // cols) * cell_h + 10
        preview.alpha_composite(im, (x, y))
        d.text(((idx % cols) * cell_w + 8, y + im.height + 8), path.stem, fill=(0, 0, 0, 255))
    preview.save(out_path)


def main():
    written = []
    for item_id, cfg in ROTATION_ITEMS.items():
        sheet = Image.open(SRC_DIR / cfg["src"]).convert("RGBA")
        cfg["out_dir"].mkdir(parents=True, exist_ok=True)
        for suffix, box in zip(ROTATION_SUFFIXES, cfg["boxes"]):
            out = fit_canvas(sheet.crop(box), cfg["canvas"], cfg["pad"], "bottom")
            path = cfg["out_dir"] / f"{item_id}{suffix}.png"
            out.save(path)
            written.append(path)
    for item_id, cfg in WALL_ITEMS.items():
        sheet = Image.open(SRC_DIR / cfg["src"]).convert("RGBA")
        cfg["out_dir"].mkdir(parents=True, exist_ok=True)
        for suffix, box in zip(WALL_SUFFIXES, cfg["boxes"]):
            out = fit_canvas(sheet.crop(box), cfg["canvas"], cfg["pad"], "center")
            path = cfg["out_dir"] / f"{item_id}{suffix}.png"
            out.save(path)
            written.append(path)
    make_preview(written, ROOT / "preview_task42_furniture_batch7_x2.png")


if __name__ == "__main__":
    main()
