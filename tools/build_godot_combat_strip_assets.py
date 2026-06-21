#!/usr/bin/env python3
"""Build Godot-only 96px combat strip sprites from approved source sheets.

The H5 battle assets intentionally remain on their existing 64px contract.
This script writes the Godot desktop strip copies at 96px so the right panel
does not have to enlarge low-resolution 64px sprites.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
FRAME = 96
PAD = 3

ENEMY_SCRIPTS = {
    "thug": "cut_task41_thug_sheet.py",
    "bandit": "cut_task41_bandit_sheet.py",
    "sect_novice": "cut_task41_sect_novice_sheet.py",
    "xie_jiao": "cut_task41_xie_jiao_sheet.py",
    "mo_jiao": "cut_task41_mo_jiao_sheet.py",
    "gui_zu": "cut_task41_gui_zu_sheet.py",
    "yao_xiu": "cut_task41_yao_xiu_sheet.py",
    "mo_jiang": "cut_task41_mo_jiang_sheet.py",
    "gu_mo": "cut_task41_gu_mo_sheet.py",
}

PROTAGONIST_SRC = ROOT / "assets/source/task50/protagonist_combat_sheet_v1.png"
PROTAGONIST_BOXES = {
    "idle": [
        (218, 70, 420, 470),
        (535, 70, 742, 470),
        (850, 70, 1068, 470),
        (535, 70, 742, 470),
    ],
    "attack": [
        (55, 525, 325, 958),
        (420, 525, 665, 958),
        (735, 525, 970, 958),
        (1045, 525, 1298, 958),
        (1370, 525, 1645, 958),
        (1738, 525, 1975, 958),
    ],
}


def load_module(filename: str):
    path = TOOLS / filename
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def strip_edge_alpha(im: Image.Image) -> Image.Image:
    px = im.load()
    w, h = im.size
    for x in range(w):
        px[x, 0] = px[x, 0][:3] + (0,)
        px[x, h - 1] = px[x, h - 1][:3] + (0,)
    for y in range(h):
        px[0, y] = px[0, y][:3] + (0,)
        px[w - 1, y] = px[w - 1, y][:3] + (0,)
    return im


def white_to_alpha(im: Image.Image) -> Image.Image:
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


def remove_small_fragments(im: Image.Image, min_area: int = 80) -> Image.Image:
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


def fit_frame(crop: Image.Image, mod, size: int = FRAME, pad: int = PAD) -> Image.Image:
    crop = mod.remove_small_fragments(mod.white_to_alpha(crop))
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
    return strip_edge_alpha(mod.remove_small_fragments(out, min_area=80))


def join(frames: list[Image.Image]) -> Image.Image:
    out = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.alpha_composite(fr, (i * FRAME, 0))
    return strip_edge_alpha(out)


def enemy_source_for(mod, anim: str) -> Image.Image:
    if hasattr(mod, "IDLE_SRC") and anim == "idle":
        return Image.open(mod.IDLE_SRC).convert("RGBA")
    if hasattr(mod, "HURT_SRC") and anim == "hurt":
        return Image.open(mod.HURT_SRC).convert("RGBA")
    if hasattr(mod, "ATTACK_SRC") and anim == "attack":
        return Image.open(mod.ATTACK_SRC).convert("RGBA")
    if hasattr(mod, "ANIM_SRC"):
        return Image.open(mod.ANIM_SRC).convert("RGBA")
    return Image.open(mod.SRC).convert("RGBA")


def build_enemies() -> None:
    for enemy, script in ENEMY_SCRIPTS.items():
        mod = load_module(script)
        out_dir = ROOT / "godot/assets/characters/enemies" / enemy
        out_dir.mkdir(parents=True, exist_ok=True)
        for anim, boxes in mod.FRAME_BOXES.items():
            src = enemy_source_for(mod, anim)
            frames = [fit_frame(src.crop(box), mod) for box in boxes]
            join(frames).save(out_dir / f"{anim}.png")


def crop_home_frame(sheet: Image.Image, cols: int, row: int, col: int) -> Image.Image:
    fw = sheet.width // cols
    fh = sheet.height // 4
    return sheet.crop((col * fw, row * fh, (col + 1) * fw, (row + 1) * fh))


def fit_alpha_frame(crop: Image.Image, size: int = FRAME, pad: int = 2) -> Image.Image:
    crop = crop.convert("RGBA")
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


def fit_sheet_frame(crop: Image.Image, size: int = FRAME, pad: int = 2) -> Image.Image:
    crop = remove_small_fragments(white_to_alpha(crop), min_area=80)
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
    return strip_edge_alpha(remove_small_fragments(out, min_area=80))


def add_attack_hint(frame: Image.Image, phase: int) -> Image.Image:
    out = frame.copy()
    d = ImageDraw.Draw(out, "RGBA")
    # Subtle weapon-less strike cue; combat.gd still draws the main arc.
    alpha = [35, 70, 110, 105, 65, 30][phase]
    x0 = 55 + min(phase, 3) * 2
    y0 = 34 - min(phase, 3)
    d.arc((x0 - 24, y0 - 12, x0 + 36, y0 + 46), -55, 45, fill=(255, 226, 150, alpha), width=2)
    return strip_edge_alpha(out)


def build_protagonist() -> None:
    out_dir = ROOT / "godot/assets/characters/protagonist_combat"
    out_dir.mkdir(parents=True, exist_ok=True)
    if PROTAGONIST_SRC.exists():
        sheet = Image.open(PROTAGONIST_SRC).convert("RGBA")
        idle_frames = [fit_sheet_frame(sheet.crop(box)) for box in PROTAGONIST_BOXES["idle"]]
        attack_frames = [fit_sheet_frame(sheet.crop(box)) for box in PROTAGONIST_BOXES["attack"]]
        sleep_src = ROOT / "assets/characters/protagonist/sleep.png"
        if sleep_src.exists():
            sleep = Image.open(sleep_src).convert("RGBA")
            down_frames = [fit_alpha_frame(sleep.crop((i * 64, 0, (i + 1) * 64, 96)), pad=3) for i in range(4)]
        else:
            down_frames = [fit_sheet_frame(sheet.crop(PROTAGONIST_BOXES["idle"][0]).rotate(90, expand=True), pad=5)] * 4
        join(idle_frames).save(out_dir / "idle.png")
        join(attack_frames).save(out_dir / "attack.png")
        join(down_frames).save(out_dir / "down.png")
        join(idle_frames).save(out_dir / "advance.png")
        join(idle_frames).save(out_dir / "hurt.png")
        return

    idle = Image.open(ROOT / "godot/assets/characters/protagonist/idle.png").convert("RGBA")
    walk = Image.open(ROOT / "godot/assets/characters/protagonist/walk.png").convert("RGBA")
    # Godot home rows: 0 down, 1 left, 2 right, 3 up. Combat faces right.
    idle_frames = [fit_alpha_frame(crop_home_frame(idle, 4, 2, i)) for i in range(4)]
    walk_right = [fit_alpha_frame(crop_home_frame(walk, 8, 2, i)) for i in range(8)]
    attack_frames = [add_attack_hint(walk_right[i], i) for i in [0, 1, 2, 3, 4, 5]]
    down_src = crop_home_frame(Image.open(ROOT / "godot/assets/characters/protagonist/idle.png").convert("RGBA"), 4, 0, 0)
    down_frame = fit_alpha_frame(down_src.rotate(90, expand=True), pad=5)

    join(idle_frames).save(out_dir / "idle.png")
    join(attack_frames).save(out_dir / "attack.png")
    join([down_frame] * 4).save(out_dir / "down.png")
    join(walk_right[:4]).save(out_dir / "advance.png")
    join(idle_frames).save(out_dir / "hurt.png")


def main() -> None:
    build_enemies()
    build_protagonist()


if __name__ == "__main__":
    main()
