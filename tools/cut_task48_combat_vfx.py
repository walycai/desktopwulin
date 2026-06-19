from pathlib import Path
from shutil import copyfile

from PIL import Image


SRC = Path("output/imagegen/task48/vfx_sources/combat_vfx_sheet_v1.png")
SOURCE_COPY = Path("assets/source/task48/vfx/combat_vfx_sheet_v1.png")
PROMPT_COPY = Path("assets/source/task48/vfx/combat_vfx_prompt_v1.txt")
OUT_DIR = Path("assets/effects")
PREVIEW = Path("preview_task48_combat_vfx_v1.png")

NAMES = [
    "hit_slash",
    "whirlwind_ring",
    "berserk_aura",
    "fire_burn",
    "ice_chill",
    "poison_cloud",
    "skill_quan",
    "skill_jian",
    "skill_dao",
    "skill_gun",
    "skill_qin",
    "skill_qimen",
]

COLS = 4
ROWS = 3
ICON = 192
PADDED_OBJECT = 184


def black_to_alpha(cell):
    rgb = cell.convert("RGB")
    out = Image.new("RGBA", rgb.size)
    sp = rgb.load()
    dp = out.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = sp[x, y]
            bright = max(r, g, b)
            if bright <= 6:
                dp[x, y] = (r, g, b, 0)
            else:
                alpha = max(0, min(255, int((bright - 4) * 1.35)))
                dp[x, y] = (r, g, b, alpha)
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
    copyfile("tmp/imagegen/task48_combat_vfx_prompt_v1.txt", PROMPT_COPY)
    cell_w = src.width // COLS
    cell_h = src.height // ROWS
    icons = []
    problems = []
    for i, name in enumerate(NAMES):
        row = i // COLS
        col = i % COLS
        cell = src.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        icon = fit_icon(black_to_alpha(cell))
        path = OUT_DIR / f"{name}.png"
        icon.save(path)
        hits = edge_alpha_hits(icon)
        bbox = icon.getchannel("A").getbbox()
        if icon.size != (ICON, ICON) or not bbox or hits:
            problems.append((name, icon.size, bbox, hits))
        icons.append((name, icon))

    preview = Image.new("RGBA", (COLS * ICON, ROWS * ICON), (28, 28, 34, 255))
    for i, (_name, icon) in enumerate(icons):
        preview.alpha_composite(icon, ((i % COLS) * ICON, (i // COLS) * ICON))
    preview.save(PREVIEW)
    print(f"wrote={len(icons)} preview={PREVIEW}")
    print(f"problems={len(problems)}")
    for p in problems:
        print("problem", p)


if __name__ == "__main__":
    main()
