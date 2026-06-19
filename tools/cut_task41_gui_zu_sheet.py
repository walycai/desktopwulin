#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source/task41/gui_zu_anim_sheet_v2.png"
ATTACK_SRC = ROOT / "assets/source/task41/gui_zu_attack_sheet_v4.png"
OUT_DIR = ROOT / "assets/characters/enemies/gui_zu"

FRAME_BOXES = {
    "idle": [
        (196, 64, 544, 516),
        (644, 56, 850, 524),
        (1124, 76, 1482, 516),
        (1630, 70, 1948, 528),
    ],
    "attack": [
        (18, 260, 326, 740),
        (334, 174, 666, 740),
        (668, 300, 1088, 740),
        (1064, 292, 1368, 740),
        (1370, 406, 1722, 742),
        (1712, 286, 2028, 750),
    ],
    "hurt": [
        (276, 1136, 616, 1498),
        (812, 1148, 1206, 1512),
        (1344, 1226, 1720, 1520),
    ],
    "death": [
        (24, 1656, 438, 1884),
        (524, 1680, 1020, 1874),
        (1056, 1676, 1496, 1876),
        (1506, 1728, 2030, 1890),
    ],
}


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


def remove_small_fragments(im, min_area=20):
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


def fit_frame(crop, size=64, pad=3):
    crop = remove_small_fragments(white_to_alpha(crop))
    bbox = crop.getchannel("A").getbbox()
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if not bbox:
        return out
    spr = crop.crop(bbox)
    scale = min((size - pad * 2) / spr.width, (size - pad * 2) / spr.height)
    nw = max(1, int(spr.width * scale))
    nh = max(1, int(spr.height * scale))
    spr = spr.resize((nw, nh), Image.Resampling.LANCZOS)
    out.alpha_composite(spr, ((size - nw) // 2, size - pad - nh))
    return strip_edge_alpha(remove_small_fragments(out))


def join(frames):
    out = Image.new("RGBA", (64 * len(frames), 64), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.alpha_composite(fr, (i * 64, 0))
    return out


def main():
    sheet = Image.open(SRC).convert("RGBA")
    attack_sheet = Image.open(ATTACK_SRC).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for anim, boxes in FRAME_BOXES.items():
        source = attack_sheet if anim == "attack" else sheet
        frames = [fit_frame(source.crop(box)) for box in boxes]
        join(frames).save(OUT_DIR / f"{anim}.png")


if __name__ == "__main__":
    main()
