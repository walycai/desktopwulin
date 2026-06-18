#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source/task41/thug_anim_sheet_v1.png"
OUT_DIR = ROOT / "assets/characters/enemies/thug"

FRAME_BOXES = {
    "idle": [
        (55, 18, 276, 249),
        (328, 19, 540, 249),
        (576, 19, 789, 249),
        (812, 23, 1022, 249),
    ],
    "attack": [
        (61, 260, 257, 495),
        (291, 283, 558, 495),
        (533, 293, 860, 495),
        (825, 285, 1184, 495),
        (1163, 277, 1447, 492),
        (1447, 270, 1663, 493),
    ],
    "hurt": [
        (60, 511, 260, 728),
        (338, 516, 556, 728),
        (619, 556, 838, 728),
    ],
    "death": [
        (44, 744, 308, 891),
        (324, 787, 649, 891),
        (662, 792, 1028, 889),
        (1080, 793, 1437, 891),
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
    crop = white_to_alpha(crop)
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
    return strip_edge_alpha(out)


def join(frames):
    out = Image.new("RGBA", (64 * len(frames), 64), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.alpha_composite(fr, (i * 64, 0))
    return out


def main():
    sheet = Image.open(SRC).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for anim, boxes in FRAME_BOXES.items():
        frames = [fit_frame(sheet.crop(box)) for box in boxes]
        join(frames).save(OUT_DIR / f"{anim}.png")


if __name__ == "__main__":
    main()
