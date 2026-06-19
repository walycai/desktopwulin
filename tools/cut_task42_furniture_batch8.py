#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets/source/task42"

ITEMS = {
    "wall_lantern": {
        "src": "wall_lantern_sheet_v1.png",
        "canvas": (60, 79),
        "pad": 3,
        "boxes": [
            (205, 105, 630, 900),
            (905, 105, 1330, 900),
        ],
    },
    "wall_mirror": {
        "src": "wall_mirror_sheet_v1.png",
        "canvas": (72, 79),
        "pad": 3,
        "boxes": [
            (180, 20, 650, 970),
            (885, 20, 1355, 970),
        ],
    },
    "wall_weapon": {
        "src": "wall_weapon_sheet_v1.png",
        "canvas": (108, 90),
        "pad": 3,
        "boxes": [
            (0, 95, 720, 885),
            (815, 95, 1535, 885),
        ],
    },
}

SUFFIXES = ["_left", "_right"]
OUT_DIR = ROOT / "assets/furniture/wallhang"


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


def remove_small_fragments(im, min_area=70):
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
    out.alpha_composite(spr, ((canvas[0] - nw) // 2, (canvas[1] - nh) // 2))
    return strip_edge_alpha(remove_small_fragments(out))


def make_preview(paths, out_path):
    cell_w = max(Image.open(p).width for p in paths) * 3 + 36
    cell_h = max(Image.open(p).height for p in paths) * 3 + 44
    cols = 3
    rows = (len(paths) + cols - 1) // cols
    preview = Image.new("RGBA", (cell_w * cols, cell_h * rows), (232, 229, 218, 255))
    d = ImageDraw.Draw(preview)
    for idx, path in enumerate(paths):
        base = Image.open(path).convert("RGBA")
        im = base.resize((base.width * 3, base.height * 3), Image.Resampling.NEAREST)
        x = (idx % cols) * cell_w + (cell_w - im.width) // 2
        y = (idx // cols) * cell_h + 10
        preview.alpha_composite(im, (x, y))
        d.text(((idx % cols) * cell_w + 8, y + im.height + 8), path.stem, fill=(0, 0, 0, 255))
    preview.save(out_path)


def main():
    written = []
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for item_id, cfg in ITEMS.items():
        sheet = Image.open(SRC_DIR / cfg["src"]).convert("RGBA")
        for suffix, box in zip(SUFFIXES, cfg["boxes"]):
            out = fit_canvas(sheet.crop(box), cfg["canvas"], cfg["pad"])
            path = OUT_DIR / f"{item_id}{suffix}.png"
            out.save(path)
            written.append(path)
    make_preview(written, ROOT / "preview_task42_furniture_batch8_x3.png")


if __name__ == "__main__":
    main()
