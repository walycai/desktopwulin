#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets/source/task42"

ITEMS = {
    "storage_medicine_cabinet": {
        "src": "storage_medicine_cabinet_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/storage",
        "canvas": (312, 286),
        "pad": 10,
        "boxes": [
            (22, 145, 480, 820),
            (548, 146, 1004, 826),
            (1070, 154, 1524, 840),
            (1566, 154, 2024, 836),
        ],
    },
    "decor_weiqi": {
        "src": "decor_weiqi_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (282, 230),
        "pad": 8,
        "boxes": [
            (0, 298, 524, 660),
            (512, 300, 1030, 660),
            (1020, 300, 1538, 662),
            (1530, 298, 2048, 662),
        ],
    },
    "decor_guqin": {
        "src": "decor_guqin_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (281, 213),
        "pad": 8,
        "boxes": [
            (34, 264, 562, 724),
            (540, 264, 1034, 728),
            (1028, 268, 1510, 724),
            (1496, 262, 2016, 730),
        ],
    },
    "decor_teaset": {
        "src": "decor_teaset_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (245, 176),
        "pad": 8,
        "boxes": [
            (14, 306, 504, 678),
            (525, 310, 1006, 686),
            (1030, 314, 1502, 668),
            (1548, 310, 2030, 682),
        ],
    },
    "decor_censer": {
        "src": "decor_censer_sheet_v1.png",
        "out_dir": ROOT / "assets/furniture/decor",
        "canvas": (159, 188),
        "pad": 8,
        "boxes": [
            (52, 246, 504, 740),
            (556, 246, 998, 740),
            (1072, 246, 1516, 742),
            (1556, 246, 1988, 742),
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
    make_preview(written, ROOT / "preview_task42_furniture_batch4_x2.png")


if __name__ == "__main__":
    main()
