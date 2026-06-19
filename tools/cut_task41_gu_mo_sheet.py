#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source/task41/gu_mo_anim_sheet_v1.png"
ATTACK_SRC = ROOT / "assets/source/task41/gu_mo_attack_sheet_v1.png"
OUT_DIR = ROOT / "assets/characters/enemies/gu_mo"

FRAME_BOXES = {
    "idle": [
        (208, 86, 526, 492),
        (684, 104, 958, 492),
        (1156, 86, 1428, 492),
        (1596, 120, 1938, 492),
    ],
    "attack": [
        (8, 330, 342, 690),
        (360, 342, 718, 690),
        (710, 342, 1148, 690),
        (1104, 260, 1412, 690),
        (1396, 410, 1768, 690),
        (1734, 340, 2048, 694),
    ],
    "hurt": [
        (348, 1088, 654, 1444),
        (834, 1062, 1158, 1444),
        (1248, 1122, 1582, 1444),
    ],
    "death": [
        (126, 1564, 510, 1870),
        (514, 1620, 964, 1870),
        (966, 1682, 1488, 1888),
        (1498, 1632, 1954, 1888),
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


def fit_frame(crop, size=64, pad=3, min_area=20):
    crop = remove_small_fragments(white_to_alpha(crop), min_area=min_area)
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
    return strip_edge_alpha(remove_small_fragments(out, min_area=min_area))


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
        src = attack_sheet if anim == "attack" else sheet
        frames = [fit_frame(src.crop(box)) for box in boxes]
        join(frames).save(OUT_DIR / f"{anim}.png")


if __name__ == "__main__":
    main()
