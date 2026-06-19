from collections import deque
from pathlib import Path

from PIL import Image


SHEETS = {
    "nei": {
        "file": "gongfa_nei_books_sheet_v2.png",
        "keys": ["xuanjia", "fanzhen", "huichun", "ningyuan", "tiegu", "lingshe"],
    },
    "wai": {
        "file": "gongfa_wai_books_sheet_v2.png",
        "keys": ["quan", "jian", "dao", "gun", "qin", "qimen"],
    },
    "qing": {
        "file": "gongfa_qing_books_sheet_v2.png",
        "keys": ["jifeng", "linghu", "yingyan", "fengxing", "yingzong", "yufeng"],
    },
}

SRC_DIR = Path("output/imagegen/task48/gongfa_sources")
SOURCE_COPY_DIR = Path("assets/source/task48/gongfa")
OUT_DIR = Path("assets/ui/gongfa")
PREVIEW = Path("preview_task48_gongfa_books_v1.png")

ICON = 96
PADDED_OBJECT = 88


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


def fit_icon(img):
    bbox = img.getchannel("A").getbbox()
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


def keep_largest_component(img):
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
            comps.append((len(pts), pts))

    if not comps:
        return img
    keep = max(comps, key=lambda c: c[0])[1]
    keep_set = set(keep)
    for _area, pts in comps:
        for x, y in pts:
            if (x, y) in keep_set:
                continue
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
    SOURCE_COPY_DIR.mkdir(parents=True, exist_ok=True)
    icons = []
    problems = []

    for sys, cfg in SHEETS.items():
        src_path = SRC_DIR / cfg["file"]
        src = Image.open(src_path).convert("RGB")
        src.save(SOURCE_COPY_DIR / cfg["file"])
        cell_w = src.width // 10
        cell_h = src.height // len(cfg["keys"])
        for row, key in enumerate(cfg["keys"]):
            for tier in range(10):
                cell = src.crop((tier * cell_w, row * cell_h, (tier + 1) * cell_w, (row + 1) * cell_h))
                icon = keep_largest_component(fit_icon(remove_connected_white(cell)))
                name = f"book_{key}_t{tier}.png"
                path = OUT_DIR / name
                icon.save(path)
                hits = edge_alpha_hits(icon)
                bbox = icon.getchannel("A").getbbox()
                if icon.size != (ICON, ICON) or not bbox or hits:
                    problems.append((name, icon.size, bbox, hits))
                icons.append((name, icon))

    cols = 10
    rows = len(icons) // cols
    preview = Image.new("RGBA", (cols * ICON, rows * ICON), (244, 240, 230, 255))
    for i, (_name, icon) in enumerate(icons):
        preview.alpha_composite(icon, ((i % cols) * ICON, (i // cols) * ICON))
    preview.save(PREVIEW)
    print(f"wrote={len(icons)} preview={PREVIEW}")
    print(f"problems={len(problems)}")
    for p in problems:
        print("problem", p)


if __name__ == "__main__":
    main()
