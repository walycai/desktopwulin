#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source/task41/mo_jiao_anim_sheet_v1.png"
OUT_DIR = ROOT / "assets/characters/enemies/mo_jiao"

FRAME_BOXES = {
    "idle": [
        (115, 15, 307, 252),
        (403, 15, 589, 251),
        (683, 15, 863, 252),
        (940, 15, 1119, 251),
    ],
    "attack": [
        (53, 270, 239, 496),
        (298, 298, 596, 496),
        (589, 314, 877, 497),
        (878, 294, 1132, 497),
        (1137, 294, 1399, 497),
        (1422, 271, 1613, 506),
    ],
    "hurt": [
        (50, 525, 258, 722),
        (321, 544, 536, 722),
        (582, 572, 814, 723),
    ],
    "death": [
        (34, 770, 291, 936),
        (326, 806, 605, 932),
        (613, 839, 913, 934),
        (934, 853, 1254, 939),
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
    sheet = Image.open(SRC).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for anim, boxes in FRAME_BOXES.items():
        frames = [fit_frame(sheet.crop(box)) for box in boxes]
        join(frames).save(OUT_DIR / f"{anim}.png")


if __name__ == "__main__":
    main()
