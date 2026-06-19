from collections import deque
from pathlib import Path

from PIL import Image


BOSSES = [
    "shanzeiwang",
    "youlinguiying",
    "qingchengnitu",
    "xuedaolaozu",
    "tianmojiaozhu",
    "huangquanguiwang",
    "luoshanvjun",
    "yaoshouwang",
    "jiuyoumozun",
    "wangumoshen",
]

SRC_DIR = Path("output/imagegen/task48/boss_sources")
SOURCE_COPY_DIR = Path("assets/source/task48/bosses")
OUT_ROOT = Path("assets/characters/bosses")
PREVIEW = Path("preview_task48_bosses_v1.png")

CELL = 512
CROP = 480
FRAME = 128
PADDED_OBJECT = 120


def is_bg(px):
    r, g, b = px[:3]
    return min(r, g, b) >= 232 and (max(r, g, b) - min(r, g, b)) <= 38


def remove_connected_white(cell):
    rgb = cell.convert("RGB")
    w, h = rgb.size
    data = rgb.load()
    seen = bytearray(w * h)
    q = deque()

    def push(x, y):
        idx = y * w + x
        if seen[idx]:
            return
        if not is_bg(data[x, y]):
            return
        seen[idx] = 1
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                push(nx, ny)

    out = Image.new("RGBA", (w, h))
    pix = out.load()
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            r, g, b = data[x, y]
            pix[x, y] = (r, g, b, 0 if seen[idx] else 255)
    return out


def fit_frame(img):
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        return Image.new("RGBA", (FRAME, FRAME))
    obj = img.crop(bbox)
    ow, oh = obj.size
    scale = min(PADDED_OBJECT / ow, PADDED_OBJECT / oh)
    nw = max(1, round(ow * scale))
    nh = max(1, round(oh * scale))
    obj = obj.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (FRAME, FRAME))
    out.alpha_composite(obj, ((FRAME - nw) // 2, FRAME - nh - 4))
    return out


def remove_small_components(img, min_area=550):
    a = img.getchannel("A")
    w, h = img.size
    seen = bytearray(w * h)
    pix = img.load()
    comps = []

    for sy in range(h):
        for sx in range(w):
            idx = sy * w + sx
            if seen[idx] or a.getpixel((sx, sy)) == 0:
                continue
            q = deque([(sx, sy)])
            seen[idx] = 1
            pts = []
            while q:
                x, y = q.popleft()
                pts.append((x, y))
                for nx in (x - 1, x, x + 1):
                    for ny in (y - 1, y, y + 1):
                        if nx < 0 or ny < 0 or nx >= w or ny >= h:
                            continue
                        nidx = ny * w + nx
                        if seen[nidx] or a.getpixel((nx, ny)) == 0:
                            continue
                        seen[nidx] = 1
                        q.append((nx, ny))
            comps.append(pts)

    for pts in comps:
        if len(pts) >= min_area:
            continue
        for x, y in pts:
            r, g, b, _ = pix[x, y]
            pix[x, y] = (r, g, b, 0)
    return img


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


def sheet(frames):
    out = Image.new("RGBA", (len(frames) * FRAME, FRAME))
    for i, fr in enumerate(frames):
        out.alpha_composite(fr, (i * FRAME, 0))
    return out


def main():
    SOURCE_COPY_DIR.mkdir(parents=True, exist_ok=True)
    previews = []
    problems = []

    for boss in BOSSES:
        src_path = SRC_DIR / f"boss_{boss}_sheet_v1.png"
        src = Image.open(src_path).convert("RGB")
        src.save(SOURCE_COPY_DIR / f"{boss}_sheet_v1.png")
        frames = []
        for idx in range(10):
            row = idx // 5
            col = idx % 5
            cx = col * CELL + CELL // 2
            cy = row * CELL + CELL // 2
            cell = src.crop((cx - CROP // 2, cy - CROP // 2, cx + CROP // 2, cy + CROP // 2))
            frames.append(remove_small_components(fit_frame(remove_connected_white(cell))))

        idle = sheet(frames[:4])
        attack = sheet(frames[4:10])
        out_dir = OUT_ROOT / boss
        out_dir.mkdir(parents=True, exist_ok=True)
        idle.save(out_dir / "idle.png")
        attack.save(out_dir / "attack.png")

        checks = [("idle", idle, (FRAME * 4, FRAME)), ("attack", attack, (FRAME * 6, FRAME))]
        for name, im, expected in checks:
            hits = edge_alpha_hits(im)
            if im.size != expected or not im.getchannel("A").getbbox() or hits:
                problems.append((boss, name, im.size, expected, hits, im.getchannel("A").getbbox()))
        previews.append((boss, idle, attack))

    preview = Image.new("RGBA", (FRAME * 6, len(previews) * FRAME * 2), (244, 240, 230, 255))
    y = 0
    for boss, idle, attack in previews:
        preview.alpha_composite(idle, (0, y))
        y += FRAME
        preview.alpha_composite(attack, (0, y))
        y += FRAME
    preview.save(PREVIEW)
    print(f"wrote={len(BOSSES) * 2} preview={PREVIEW}")
    print(f"problems={len(problems)}")
    for p in problems:
        print("problem", p)


if __name__ == "__main__":
    main()
