#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source/task41/mo_jiang_anim_sheet_v1.png"
ATTACK_SRC = ROOT / "assets/source/task41/mo_jiang_attack_sheet_v1.png"
OUT_DIR = ROOT / "assets/characters/enemies/mo_jiang"

FRAME_BOXES = {
    "idle": [
        (156, 76, 488, 472),
        (586, 76, 920, 472),
        (1032, 72, 1366, 472),
        (1452, 72, 1786, 472),
    ],
    "attack": [
        (0, 260, 314, 705),
        (330, 170, 675, 705),
        (660, 292, 1080, 705),
        (1038, 282, 1390, 705),
        (1360, 260, 1715, 705),
        (1708, 260, 2048, 705),
    ],
    "hurt": [
        (316, 1054, 684, 1428),
        (772, 1098, 1110, 1428),
        (1192, 1170, 1632, 1444),
    ],
    "death": [
        (16, 1558, 462, 1870),
        (500, 1612, 990, 1884),
        (990, 1684, 1538, 1888),
        (1518, 1678, 2048, 1892),
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
        min_area = 100 if anim == "attack" else 20
        frames = [fit_frame(src.crop(box), min_area=min_area) for box in boxes]
        join(frames).save(OUT_DIR / f"{anim}.png")


if __name__ == "__main__":
    main()
