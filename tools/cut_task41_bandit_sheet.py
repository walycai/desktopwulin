#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IDLE_SRC = ROOT / "assets/source/task41/bandit_idle_sheet_v1.png"
ANIM_SRC = ROOT / "assets/source/task41/bandit_anim_sheet_v1.png"
HURT_SRC = ROOT / "assets/source/task41/bandit_hurt_sheet_v1.png"
OUT_DIR = ROOT / "assets/characters/enemies/bandit"

FRAME_BOXES = {
    "idle": [
        (92, 82, 574, 626),
        (641, 91, 1095, 626),
        (1164, 91, 1602, 626),
        (1680, 89, 2128, 626),
    ],
    "attack": [
        (34, 296, 232, 548),
        (252, 324, 514, 548),
        (522, 328, 848, 548),
        (829, 324, 1100, 548),
        (1068, 320, 1326, 548),
        (1307, 316, 1522, 548),
    ],
    "hurt": [
        (205, 112, 732, 620),
        (869, 117, 1394, 620),
        (1463, 221, 2032, 620),
    ],
    "death": [
        (53, 824, 333, 982),
        (338, 868, 647, 984),
        (642, 886, 994, 986),
        (999, 884, 1366, 990),
    ],
}


def white_to_alpha(im):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            dist = max(0, 255 - min(r, g, b))
            if r > 238 and g > 238 and b > 238:
                px[x, y] = (r, g, b, 0)
            elif r > 220 and g > 220 and b > 220:
                px[x, y] = (r, g, b, min(a, dist * 7))
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
    idle_sheet = Image.open(IDLE_SRC).convert("RGBA")
    anim_sheet = Image.open(ANIM_SRC).convert("RGBA")
    hurt_sheet = Image.open(HURT_SRC).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for anim, boxes in FRAME_BOXES.items():
        src = idle_sheet if anim == "idle" else (hurt_sheet if anim == "hurt" else anim_sheet)
        frames = [fit_frame(src.crop(box)) for box in boxes]
        join(frames).save(OUT_DIR / f"{anim}.png")


if __name__ == "__main__":
    main()
