from collections import deque
from pathlib import Path

from PIL import Image


SRC = Path("output/imagegen/task48/weapon_thumbnails_sheet_v1.png")
SOURCE_COPY = Path("assets/source/task48/weapon_thumbnails_sheet_v1.png")
OUT_DIR = Path("assets/equipment")
PREVIEW = Path("preview_task48_weapon_thumbnails_v1.png")

TYPES = ["quan", "jian", "dao", "gun", "qin", "qimen"]
TIERS = range(5)
ICON = 96
PADDED_OBJECT = 86
CROP = 228


def is_bg(px):
    r, g, b = px[:3]
    return min(r, g, b) >= 232 and (max(r, g, b) - min(r, g, b)) <= 34


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


def fit_icon(img):
    bbox = img.getbbox()
    if not bbox:
        return Image.new("RGBA", (ICON, ICON))
    obj = img.crop(bbox)
    ow, oh = obj.size
    scale = min(PADDED_OBJECT / ow, PADDED_OBJECT / oh)
    nw = max(1, round(ow * scale))
    nh = max(1, round(oh * scale))
    obj = obj.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (ICON, ICON))
    out.alpha_composite(obj, ((ICON - nw) // 2, (ICON - nh) // 2))
    return out


def remove_lower_artifacts(img):
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
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            comps.append((len(pts), min(xs), min(ys), max(xs) + 1, max(ys) + 1, pts))

    for area, x0, y0, x1, y1, pts in comps:
        if y0 >= 63 and area < 1100:
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


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_COPY.parent.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGB")
    src.save(SOURCE_COPY)
    sw, sh = src.size
    cw, ch = sw // len(TYPES), sh // len(list(TIERS))
    previews = []
    problems = []

    for row, tier in enumerate(TIERS):
        for col, typ in enumerate(TYPES):
            cx = col * cw + cw // 2
            cy = row * ch + ch // 2
            cell = src.crop((cx - CROP // 2, cy - CROP // 2, cx + CROP // 2, cy + CROP // 2))
            icon = remove_lower_artifacts(fit_icon(remove_connected_white(cell)))
            name = f"weapon_{typ}_{tier}.png"
            path = OUT_DIR / name
            icon.save(path)
            bbox = icon.getbbox()
            hits = edge_alpha_hits(icon)
            if icon.size != (ICON, ICON) or not bbox or hits:
                problems.append((name, icon.size, bbox, hits))
            previews.append((name, icon))

    label_h = 16
    sheet = Image.new("RGBA", (len(TYPES) * ICON, len(list(TIERS)) * (ICON + label_h)), (246, 242, 232, 255))
    for i, (name, icon) in enumerate(previews):
        row = i // len(TYPES)
        col = i % len(TYPES)
        x = col * ICON
        y = row * (ICON + label_h)
        sheet.alpha_composite(icon, (x, y))
    sheet.save(PREVIEW)

    print(f"source={SOURCE_COPY}")
    print(f"wrote={len(previews)} preview={PREVIEW}")
    print(f"problems={len(problems)}")
    for p in problems:
        print("problem", p)


if __name__ == "__main__":
    main()
