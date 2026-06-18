#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IDLE_SRC = ROOT / "assets/source/task41/sect_novice_idle_sheet_v1.png"
ANIM_SRC = ROOT / "assets/source/task41/sect_novice_anim_sheet_v1.png"
OUT_DIR = ROOT / "assets/characters/enemies/sect_novice"

FRAME_BOXES = {
    "idle": [
        (111, 139, 573, 587),
        (644, 145, 1096, 587),
        (1159, 148, 1624, 586),
        (1687, 141, 2144, 587),
    ],
    "attack": [
        (42, 263, 233, 507),
        (294, 289, 544, 506),
        (551, 288, 861, 502),
        (840, 287, 1150, 502),
        (1130, 294, 1394, 502),
        (1418, 286, 1648, 506),
    ],
    "hurt": [
        (73, 520, 305, 730),
        (415, 528, 617, 730),
        (681, 527, 879, 730),
    ],
    "death": [
        (45, 765, 330, 896),
        (354, 775, 645, 896),
        (660, 778, 995, 906),
        (1050, 792, 1388, 903),
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
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for anim, boxes in FRAME_BOXES.items():
        src = idle_sheet if anim == "idle" else anim_sheet
        frames = [fit_frame(src.crop(box)) for box in boxes]
        join(frames).save(OUT_DIR / f"{anim}.png")


if __name__ == "__main__":
    main()
