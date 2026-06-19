from pathlib import Path

from PIL import Image


OUT_ROOT = Path("assets/characters/equip")
PREVIEW = Path("preview_task48_weapon_overlays_v1.png")
TYPES = ["quan", "jian", "dao", "gun", "qin", "qimen"]
FRAME_W, FRAME_H = 64, 96
ROWS = 4
IDLE_FRAMES = 4
WALK_FRAMES = 8


POSES = {
    "down": 0,
    "left": 1,
    "right": 2,
    "up": 3,
}


def load_icon(typ):
    # Middle-tier art reads clearly while avoiding legendary VFX clutter on the body overlay.
    p = Path("assets/equipment") / f"weapon_{typ}_2.png"
    im = Image.open(p).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    return im.crop(bbox)


def fit(im, max_w, max_h):
    w, h = im.size
    scale = min(max_w / w, max_h / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def place(canvas, obj, frame, row, cx, cy):
    x = frame * FRAME_W + round(cx - obj.width / 2)
    y = row * FRAME_H + round(cy - obj.height / 2)
    canvas.alpha_composite(obj, (x, y))


def weapon_for(typ, row):
    icon = load_icon(typ)
    if typ == "quan":
        obj = fit(icon, 28, 36)
        return obj
    if typ == "gun":
        obj = fit(icon.rotate(-28, expand=True, resample=Image.Resampling.BICUBIC), 13, 58)
    elif typ == "qin":
        obj = fit(icon.rotate(-12, expand=True, resample=Image.Resampling.BICUBIC), 18, 50)
    elif typ == "qimen":
        obj = fit(icon, 24, 34)
    elif typ == "dao":
        obj = fit(icon.rotate(-8, expand=True, resample=Image.Resampling.BICUBIC), 16, 54)
    else:
        obj = fit(icon, 14, 54)

    if row == POSES["left"]:
        obj = obj.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return obj


def coords(typ, row, frame, frames):
    wobble = (frame % 2) * 1
    if typ == "quan":
        return {
            POSES["down"]: (32, 57 + wobble),
            POSES["left"]: (27, 58 + wobble),
            POSES["right"]: (37, 58 + wobble),
            POSES["up"]: (32, 58 + wobble),
        }[row]
    if typ == "qimen":
        return {
            POSES["down"]: (44, 58 + wobble),
            POSES["left"]: (21, 59 + wobble),
            POSES["right"]: (43, 59 + wobble),
            POSES["up"]: (22, 57 + wobble),
        }[row]
    if typ == "qin":
        return {
            POSES["down"]: (43, 57 + wobble),
            POSES["left"]: (22, 59 + wobble),
            POSES["right"]: (42, 59 + wobble),
            POSES["up"]: (22, 56 + wobble),
        }[row]
    return {
        POSES["down"]: (44, 58 + wobble),
        POSES["left"]: (20, 59 + wobble),
        POSES["right"]: (43, 59 + wobble),
        POSES["up"]: (21, 57 + wobble),
    }[row]


def sheet(typ, frames):
    canvas = Image.new("RGBA", (frames * FRAME_W, ROWS * FRAME_H))
    for row in range(ROWS):
        obj = weapon_for(typ, row)
        for frame in range(frames):
            place(canvas, obj, frame, row, *coords(typ, row, frame, frames))
    return canvas


def edge_alpha_hits(img):
    a = img.getchannel("A")
    w, h = img.size
    hits = 0
    for x in range(w):
        if a.getpixel((x, 0)):
            hits += 1
        if a.getpixel((x, h - 1)):
            hits += 1
    for y in range(h):
        if a.getpixel((0, y)):
            hits += 1
        if a.getpixel((w - 1, y)):
            hits += 1
    return hits


def main():
    previews = []
    problems = []
    for typ in TYPES:
        out_dir = OUT_ROOT / f"weapon_{typ}"
        out_dir.mkdir(parents=True, exist_ok=True)
        idle = sheet(typ, IDLE_FRAMES)
        walk = sheet(typ, WALK_FRAMES)
        sleep = Image.new("RGBA", (IDLE_FRAMES * FRAME_W, FRAME_H))
        meditate = Image.new("RGBA", (IDLE_FRAMES * FRAME_W, FRAME_H))
        for name, im in {"idle": idle, "walk": walk, "sleep": sleep, "meditate": meditate}.items():
            im.save(out_dir / f"{name}.png")
            expected = (WALK_FRAMES * FRAME_W, ROWS * FRAME_H) if name == "walk" else ((IDLE_FRAMES * FRAME_W, ROWS * FRAME_H) if name == "idle" else (IDLE_FRAMES * FRAME_W, FRAME_H))
            hits = edge_alpha_hits(im)
            if im.size != expected or hits:
                problems.append((typ, name, im.size, expected, hits))
        previews.append((typ, idle))

    preview = Image.new("RGBA", (IDLE_FRAMES * FRAME_W, len(previews) * ROWS * FRAME_H), (244, 240, 230, 255))
    y = 0
    for typ, im in previews:
        preview.alpha_composite(im, (0, y))
        y += ROWS * FRAME_H
    preview.save(PREVIEW)
    print(f"wrote={len(TYPES) * 4} preview={PREVIEW}")
    print(f"problems={len(problems)}")
    for p in problems:
        print("problem", p)


if __name__ == "__main__":
    main()
