#!/usr/bin/env python3
from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "furniture"
SOURCE = ROOT / "assets" / "source" / "task39"
PREVIEW = ROOT / "preview_task39_home_assets.png"

HW = 12
HH = 6
SCALE = 3

WOOD_DARK = (65, 38, 20, 255)
WOOD = (104, 65, 34, 255)
WOOD_LIGHT = (153, 103, 55, 255)
GOLD = (198, 151, 70, 255)
JADE = (62, 126, 104, 255)
TEAL = (72, 133, 142, 255)
PAPER = (207, 187, 139, 255)
INK = (36, 27, 22, 255)
RED = (132, 53, 42, 255)
BLUE = (71, 91, 124, 255)
STONE = (105, 96, 82, 255)


CATALOG = {
    "bed_basic": ("bed", 10, 18, 24),
    "bed_advanced": ("bed", 22, 12, 32),
    "meditation_dais": ("func", 12, 12, 16),
    "chair_round": ("chair", 5, 5, 26),
    "chair_bench": ("chair", 9, 4, 14),
    "chair_cushion": ("chair", 5, 5, 6),
    "chair_taishi": ("chair", 6, 6, 34),
    "table_square": ("table", 9, 9, 22),
    "table_tea": ("table", 7, 7, 14),
    "table_desk": ("table", 11, 6, 18),
    "table_long": ("table", 13, 5, 18),
    "storage_wardrobe": ("storage", 8, 5, 34),
    "storage_shelf": ("storage", 9, 4, 32),
    "storage_chest": ("storage", 8, 5, 12),
    "storage_medicine_cabinet": ("storage", 8, 4, 30),
    "decor_vase": ("decor", 2, 2, 14),
    "decor_brush": ("decor", 2, 1, 4),
    "decor_inkstone": ("decor", 2, 2, 3),
    "decor_censer": ("decor", 3, 3, 12),
    "decor_teaset": ("decor", 3, 2, 6),
    "decor_weiqi": ("decor", 4, 4, 4),
    "decor_guqin": ("decor", 9, 3, 6),
    "decor_bonsai": ("decor", 3, 3, 14),
    "decor_candle": ("decor", 2, 2, 12),
    "decor_books": ("decor", 3, 2, 8),
    "decor_wine": ("decor", 3, 3, 12),
    "decor_screen": ("decor", 11, 3, 30),
    "decor_ruyi": ("decor", 5, 2, 4),
    "decor_food_box": ("decor", 5, 3, 10),
    "decor_wash_basin": ("decor", 5, 5, 14),
    "decor_floor_lamp": ("decor", 3, 3, 28),
    "decor_rug_large": ("decor", 16, 12, 2),
}

WALL = {
    "wall_landscape": (8, 6),
    "wall_scroll": (8, 14),
    "wall_swordrack": (6, 4),
    "wall_lantern": (3, 5),
    "wall_mirror": (4, 5),
    "wall_weapon": (7, 6),
}


def sc(v: int | float) -> int:
    return int(round(v * SCALE))


def rgba(c, a=None):
    if a is None:
        return c
    return (c[0], c[1], c[2], a)


def poly(draw, pts, fill, outline=None, width=1):
    pts = [(sc(x), sc(y)) for x, y in pts]
    draw.polygon(pts, fill=fill)
    if outline:
        draw.line(pts + [pts[0]], fill=outline, width=sc(width), joint="curve")


def line(draw, pts, fill, width=1):
    draw.line([(sc(x), sc(y)) for x, y in pts], fill=fill, width=sc(width), joint="curve")


def rect(draw, box, fill, outline=None, width=1):
    box = tuple(sc(x) for x in box)
    draw.rectangle(box, fill=fill, outline=outline, width=sc(width))


def ellipse(draw, box, fill, outline=None, width=1):
    box = tuple(sc(x) for x in box)
    draw.ellipse(box, fill=fill, outline=outline, width=sc(width))


def iso_points(w, h, ox, base_y):
    return [
        (ox, base_y - (w + h) * HH),
        (ox + w * HW, base_y - h * HH),
        (ox + (w - h) * HW, base_y),
        (ox - h * HW, base_y - w * HH),
    ]


def top_poly(w, h, ox, base_y, lift):
    return [(x, y - lift) for x, y in iso_points(w, h, ox, base_y)]


def draw_shadow(draw, w, h, ox, base_y, alpha=70):
    pts = iso_points(w, h, ox, base_y + 2)
    poly(draw, pts, (0, 0, 0, alpha))


def draw_box(draw, w, h, ox, base_y, height, top=WOOD_LIGHT, left=WOOD, right=WOOD_DARK, outline=(42, 27, 17, 230)):
    b = iso_points(w, h, ox, base_y)
    t = [(x, y - height) for x, y in b]
    poly(draw, [b[3], b[2], t[2], t[3]], left, outline)
    poly(draw, [b[1], b[2], t[2], t[1]], right, outline)
    poly(draw, t, top, outline)
    return b, t


def add_wood_grain(draw, pts, n=5, color=(92, 54, 28, 120)):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    for i in range(n):
        y = y0 + (i + 1) * (y1 - y0) / (n + 1)
        line(draw, [(x0 + 4, y), ((x0 + x1) / 2, y + (i % 2) * 2 - 1), (x1 - 4, y + 1)], color, 0.65)


def add_gold_trim(draw, pts):
    for x, y in pts:
        ellipse(draw, (x - 1.6, y - 1.6, x + 1.6, y + 1.6), GOLD)


def ornament(draw, x, y, kind="vase", s=1.0):
    if kind == "vase":
        ellipse(draw, (x - 5*s, y - 4*s, x + 5*s, y + 8*s), TEAL, INK, 0.8)
        rect(draw, (x - 2.5*s, y - 8*s, x + 2.5*s, y - 2*s), (59, 93, 99, 255), INK, 0.6)
        line(draw, [(x - 3*s, y), (x + 3*s, y + 1*s)], GOLD, 0.6)
    elif kind == "bonsai":
        rect(draw, (x - 5*s, y + 2*s, x + 5*s, y + 8*s), (86, 59, 35, 255), INK, 0.6)
        line(draw, [(x, y + 2*s), (x - 1*s, y - 7*s)], WOOD_DARK, 1.4)
        for dx, dy, r in [(-5, -6, 5), (0, -10, 6), (5, -5, 5)]:
            ellipse(draw, (x + dx*s - r*s, y + dy*s - r*s, x + dx*s + r*s, y + dy*s + r*s), (45, 105, 64, 255), (28, 62, 39, 255), 0.5)
    elif kind == "lamp":
        line(draw, [(x, y + 9*s), (x, y - 13*s)], (73, 48, 28, 255), 1.1)
        ellipse(draw, (x - 5*s, y - 17*s, x + 5*s, y - 5*s), (231, 185, 95, 230), (93, 54, 26, 255), 0.7)
        line(draw, [(x - 8*s, y + 9*s), (x + 8*s, y + 9*s)], WOOD_DARK, 1)
    elif kind == "books":
        for i, col in enumerate([RED, BLUE, JADE]):
            rect(draw, (x - 7*s + i*5*s, y - 3*s - i*s, x - 2*s + i*5*s, y + 5*s - i*s), col, INK, 0.5)
    elif kind == "tea":
        ellipse(draw, (x - 7*s, y - 3*s, x - 1*s, y + 3*s), JADE, INK, 0.5)
        ellipse(draw, (x + 2*s, y - 4*s, x + 9*s, y + 4*s), (104, 129, 103, 255), INK, 0.5)
        line(draw, [(x + 8*s, y - 1*s), (x + 12*s, y - 2*s)], GOLD, 0.8)
    elif kind == "candle":
        line(draw, [(x, y + 6*s), (x, y - 8*s)], (210, 176, 105, 255), 1.2)
        ellipse(draw, (x - 2*s, y - 12*s, x + 2*s, y - 7*s), (255, 214, 106, 220))
        ellipse(draw, (x - 5*s, y + 4*s, x + 5*s, y + 8*s), GOLD, INK, 0.5)


def draw_table(draw, kind, w, h, ox, base_y):
    height = {"table_square": 25, "table_tea": 17, "table_desk": 22, "table_long": 20}[kind]
    b, t = draw_box(draw, w, h, ox, base_y, height, top=(139, 86, 42, 255), left=(90, 55, 31, 255), right=(58, 35, 22, 255))
    add_wood_grain(draw, t, 7)
    add_gold_trim(draw, t)
    for px, py in b:
        line(draw, [(px, py - height + 4), (px, py + 12)], WOOD_DARK, 2.1)
        ellipse(draw, (px - 2.6, py + 9, px + 2.6, py + 14), (37, 25, 17, 180))
    cx = sum(x for x, _ in t) / 4
    cy = sum(y for _, y in t) / 4
    if kind == "table_square":
        draw_weiqi_on_table(draw, cx, cy)
    elif kind == "table_desk":
        rect(draw, (cx - 20, cy - 5, cx + 18, cy + 8), PAPER, (78, 49, 30, 255), 0.6)
        ornament(draw, cx + 25, cy, "books", 0.85)
        ornament(draw, cx - 27, cy - 1, "tea", 0.8)
    elif kind == "table_long":
        ornament(draw, cx - 30, cy, "tea", 0.85)
        ornament(draw, cx + 4, cy - 1, "vase", 0.75)
        ornament(draw, cx + 35, cy, "books", 0.8)
    elif kind == "table_tea":
        ornament(draw, cx, cy, "tea", 1.0)


def draw_weiqi_on_table(draw, cx, cy):
    rect(draw, (cx - 18, cy - 11, cx + 18, cy + 11), (189, 139, 76, 255), (45, 29, 18, 255), 0.8)
    for i in range(5):
        x = cx - 14 + i * 7
        line(draw, [(x, cy - 9), (x, cy + 9)], (80, 48, 24, 120), 0.35)
    for i in range(4):
        y = cy - 7 + i * 5
        line(draw, [(cx - 16, y), (cx + 16, y)], (80, 48, 24, 120), 0.35)
    for dx, dy, col in [(-8, -3, INK), (4, 2, (230, 218, 190, 255)), (11, -5, INK), (-2, 7, (230, 218, 190, 255))]:
        ellipse(draw, (cx + dx - 1.4, cy + dy - 1.4, cx + dx + 1.4, cy + dy + 1.4), col)


def draw_bed(draw, kind, w, h, ox, base_y):
    height = 18 if kind == "bed_basic" else 26
    b, t = draw_box(draw, w, h, ox, base_y, height, top=(88, 55, 35, 255), left=(73, 44, 29, 255), right=(48, 30, 22, 255))
    inner = [(x * 0.88 + sum(px for px, _ in t)/4 * 0.12, y * 0.88 + sum(py for _, py in t)/4 * 0.12) for x, y in t]
    poly(draw, inner, (54, 116, 116, 255), (34, 53, 52, 255), 0.8)
    quilt = [(inner[0][0] + 10, inner[0][1] + 8), (inner[1][0] - 7, inner[1][1] + 4), (inner[2][0] - 10, inner[2][1] - 3), (inner[3][0] + 8, inner[3][1] - 1)]
    poly(draw, quilt, (97, 143, 135, 255), (41, 71, 70, 255), 0.8)
    pillow = [(inner[0][0] + 12, inner[0][1] + 4), (inner[0][0] + 35, inner[0][1] + 14), (inner[3][0] + 33, inner[3][1] - 3), (inner[3][0] + 10, inner[3][1] - 10)]
    poly(draw, pillow, (205, 171, 113, 255), (71, 49, 31, 255), 0.8)
    posts = [t[0], t[1], t[2], t[3]]
    for px, py in posts:
        line(draw, [(px, py + height - 2), (px, py - 28)], WOOD_DARK, 2.2)
        ellipse(draw, (px - 2.2, py - 31, px + 2.2, py - 27), GOLD)
    if kind == "bed_advanced":
        line(draw, [(t[0][0], t[0][1] - 24), (t[1][0], t[1][1] - 24)], GOLD, 1.1)
        line(draw, [(t[3][0], t[3][1] - 20), (t[2][0], t[2][1] - 20)], GOLD, 1.0)


def draw_storage(draw, kind, w, h, ox, base_y):
    if kind == "storage_chest":
        b, t = draw_box(draw, w, h, ox, base_y, 18, top=(113, 69, 35, 255), left=(86, 52, 30, 255), right=(56, 35, 24, 255))
        line(draw, [(t[3][0], t[3][1]), (t[1][0], t[1][1])], GOLD, 0.9)
        for p in [t[0], t[1], t[2], t[3]]:
            ellipse(draw, (p[0] - 1.5, p[1] - 1.5, p[0] + 1.5, p[1] + 1.5), GOLD)
        return
    hgt = 66 if kind == "storage_wardrobe" else 58
    b, t = draw_box(draw, w, h, ox, base_y, hgt, top=(127, 76, 36, 255), left=(86, 53, 31, 255), right=(56, 35, 24, 255))
    cx = (t[0][0] + t[2][0]) / 2
    cy = (t[0][1] + t[2][1]) / 2
    if kind == "storage_shelf":
        for k in range(3):
            yy = cy - 33 + k * 18
            line(draw, [(cx - 43, yy), (cx + 44, yy + 1)], GOLD, 0.8)
        for dx, item in [(-31, "vase"), (-10, "books"), (13, "tea"), (33, "bonsai")]:
            ornament(draw, cx + dx, cy - 20 + (dx % 2), item, 0.62)
    elif kind == "storage_medicine_cabinet":
        for i in range(4):
            for j in range(3):
                rect(draw, (cx - 36 + i * 18, cy - 34 + j * 16, cx - 22 + i * 18, cy - 22 + j * 16), (104, 65, 36, 255), (50, 31, 20, 255), 0.5)
                ellipse(draw, (cx - 29 + i * 18, cy - 27 + j * 16, cx - 27 + i * 18, cy - 25 + j * 16), GOLD)
    else:
        rect(draw, (cx - 32, cy - 38, cx - 2, cy + 28), (93, 58, 34, 255), (42, 27, 18, 255), 0.7)
        rect(draw, (cx + 2, cy - 38, cx + 32, cy + 28), (82, 50, 30, 255), (42, 27, 18, 255), 0.7)
        ellipse(draw, (cx - 6, cy - 6, cx - 2, cy - 2), GOLD)
        ellipse(draw, (cx + 2, cy - 6, cx + 6, cy - 2), GOLD)


def draw_chair(draw, kind, w, h, ox, base_y):
    if kind == "chair_cushion":
        pts = iso_points(w, h, ox, base_y)
        poly(draw, pts, (126, 105, 67, 255), (47, 34, 23, 255), 0.9)
        inner = [(x * 0.78 + ox * 0.22, y * 0.78 + (base_y - (w+h)*HH/2) * 0.22) for x, y in pts]
        poly(draw, inner, (72, 123, 115, 255), (36, 60, 58, 255), 0.6)
        return
    b, t = draw_box(draw, w, h, ox, base_y, 11 if kind == "chair_bench" else 14, top=(132, 79, 41, 255), left=WOOD, right=WOOD_DARK)
    for px, py in b:
        line(draw, [(px, py - 8), (px, py + 9)], WOOD_DARK, 1.4)
    if kind in ("chair_round", "chair_taishi"):
        back_y = min(y for _, y in t)
        line(draw, [(t[0][0], back_y - 5), (t[1][0], back_y - 1)], GOLD if kind == "chair_taishi" else WOOD_LIGHT, 1.2)
        for p in [t[0], t[1]]:
            line(draw, [(p[0], p[1] + 2), (p[0], p[1] - (31 if kind == "chair_taishi" else 23))], WOOD_DARK, 1.6)
        if kind == "chair_taishi":
            rect(draw, ((t[0][0]+t[1][0])/2 - 17, back_y - 29, (t[0][0]+t[1][0])/2 + 17, back_y - 8), (96, 57, 33, 255), (42, 27, 17, 255), 0.7)


def draw_decor(draw, kind, w, h, ox, base_y):
    cx = ox + (w - h) * HW / 2
    cy = base_y - (w + h) * HH / 2
    if kind == "decor_rug_large":
        pts = iso_points(w, h, ox, base_y)
        poly(draw, pts, (98, 61, 52, 210), (51, 34, 29, 255), 0.9)
        inner = [(x * 0.82 + cx * 0.18, y * 0.82 + cy * 0.18) for x, y in pts]
        poly(draw, inner, (56, 91, 92, 210), GOLD, 0.6)
        return
    if kind == "decor_screen":
        top = top_poly(w, h, ox, base_y, 8)
        for i in range(4):
            x = top[3][0] + (i + .5) * (top[2][0] - top[3][0]) / 4
            y = top[3][1] + (i + .5) * (top[2][1] - top[3][1]) / 4
            rect(draw, (x - 11, y - 48, x + 11, y + 2), (184, 164, 119, 240), (66, 42, 25, 255), 0.8)
            line(draw, [(x - 7, y - 33), (x + 7, y - 41)], (87, 103, 71, 180), 0.5)
        return
    if kind == "decor_guqin":
        pts = top_poly(w, h, ox, base_y, 5)
        poly(draw, pts, (59, 35, 24, 255), (25, 18, 14, 255), 0.8)
        for i in range(5):
            line(draw, [(pts[3][0] + 8, pts[3][1] - 1 + i), (pts[1][0] - 8, pts[1][1] - 1 + i)], GOLD, 0.35)
        return
    if kind == "decor_weiqi":
        draw_weiqi_on_table(draw, cx, cy)
        return
    if kind == "decor_vase":
        ornament(draw, cx, cy, "vase", 1.8); return
    if kind == "decor_bonsai":
        ornament(draw, cx, cy, "bonsai", 1.5); return
    if kind == "decor_floor_lamp":
        ornament(draw, cx, cy, "lamp", 1.7); return
    if kind == "decor_books":
        ornament(draw, cx, cy, "books", 1.5); return
    if kind == "decor_teaset":
        ornament(draw, cx, cy, "tea", 1.4); return
    if kind == "decor_candle":
        ornament(draw, cx, cy, "candle", 1.6); return
    if kind == "decor_wash_basin":
        ellipse(draw, (cx - 19, cy - 9, cx + 19, cy + 13), (88, 118, 116, 255), INK, 0.8)
        ellipse(draw, (cx - 13, cy - 7, cx + 13, cy + 6), (151, 188, 181, 220), None)
        return
    if kind == "decor_censer":
        ellipse(draw, (cx - 13, cy - 9, cx + 13, cy + 9), (124, 101, 64, 255), INK, 0.8)
        line(draw, [(cx - 7, cy - 11), (cx + 7, cy - 11)], GOLD, 1)
        for dx in [-4, 0, 4]:
            line(draw, [(cx + dx, cy - 12), (cx + dx - 3, cy - 20)], (169, 159, 130, 100), 0.7)
        return
    if kind == "decor_wine":
        for dx, s in [(-8, 1.2), (7, 1.05)]:
            ornament(draw, cx + dx, cy, "vase", s)
        return
    if kind == "decor_food_box":
        b, t = draw_box(draw, w, h, ox, base_y, 11, top=(132, 76, 42, 255), left=(94, 52, 31, 255), right=(60, 36, 24, 255))
        add_gold_trim(draw, t)
        return
    if kind == "decor_ruyi":
        line(draw, [(cx - 23, cy + 2), (cx + 19, cy - 5)], GOLD, 2)
        ellipse(draw, (cx + 12, cy - 12, cx + 29, cy + 2), GOLD, INK, 0.5)
        return
    if kind == "decor_brush":
        line(draw, [(cx - 7, cy + 4), (cx + 9, cy - 6)], (46, 27, 17, 255), 1.3)
        line(draw, [(cx + 9, cy - 6), (cx + 14, cy - 9)], (28, 21, 18, 255), 2)
        return
    if kind == "decor_inkstone":
        ellipse(draw, (cx - 12, cy - 6, cx + 12, cy + 8), (43, 43, 43, 255), INK, 0.8)
        ellipse(draw, (cx - 7, cy - 3, cx + 7, cy + 5), (24, 24, 26, 255), None)


def canvas_for(w, h, zh, rug=False):
    draw_w = (w + h) * HW
    target_h = (w + h) * HH + zh * (1.75 if not rug else 0.8) + 26
    W = max(72, math.ceil(draw_w + 70))
    H = max(64, math.ceil(target_h + 46))
    return int(W), int(H)


def render_item(kind, cat, w, h, zh, rot=0):
    if rot % 2:
        w, h = h, w
    W, H = canvas_for(w, h, zh, kind == "decor_rug_large")
    im = Image.new("RGBA", (W * SCALE, H * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im, "RGBA")
    ox = W / 2 - (w - h) * HW / 2
    base_y = H - 20
    draw_shadow(draw, w, h, ox, base_y, 45 if cat == "decor" else 70)
    if cat == "bed":
        draw_bed(draw, kind, w, h, ox, base_y)
    elif cat == "table":
        draw_table(draw, kind, w, h, ox, base_y)
    elif cat == "storage":
        draw_storage(draw, kind, w, h, ox, base_y)
    elif cat == "chair":
        draw_chair(draw, kind, w, h, ox, base_y)
    elif cat == "func":
        b, t = draw_box(draw, w, h, ox, base_y, 16, top=(91, 97, 118, 255), left=(67, 70, 91, 255), right=(45, 47, 66, 255))
        cx = sum(x for x, _ in t) / 4
        cy = sum(y for _, y in t) / 4
        ellipse(draw, (cx - 23, cy - 15, cx + 23, cy + 15), (80, 126, 124, 255), INK, 0.8)
        ornament(draw, cx + 26, cy, "candle", 0.8)
    elif cat == "decor":
        draw_decor(draw, kind, w, h, ox, base_y)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=70, threshold=3))
    im = im.resize((W, H), Image.Resampling.LANCZOS)
    return trim_alpha(im)


def trim_alpha(im: Image.Image, pad=3) -> Image.Image:
    box = im.getbbox()
    if not box:
        return im
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    cropped = im.crop((x0, y0, x1, y1))
    framed = Image.new("RGBA", (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
    framed.alpha_composite(cropped, (pad, pad))
    return framed


def render_wall(kind, side, w, h):
    W, H = max(56, w * HW + 30), max(76, h * 11 + 30)
    im = Image.new("RGBA", (W * SCALE, H * SCALE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im, "RGBA")
    rect(d, (10, 10, W - 10, H - 10), (184, 161, 113, 255), (58, 39, 25, 255), 1.3)
    rect(d, (15, 15, W - 15, H - 15), (210, 193, 150, 240), GOLD, 0.6)
    if "landscape" in kind or "scroll" in kind:
        for i in range(3):
            line(d, [(21 + i * 16, H - 28), (39 + i * 22, 31), (61 + i * 13, H - 33)], (73, 91, 73, 170), 0.9)
        ellipse(d, (W - 32, 24, W - 18, 38), (160, 72, 58, 120))
    elif "swordrack" in kind or "weapon" in kind:
        for y in [H * .36, H * .62]:
            line(d, [(18, y), (W - 18, y)], WOOD_DARK, 2)
        for i in range(3):
            x = 26 + i * (W - 52) / 2
            line(d, [(x, 21), (x + 4, H - 20)], (154, 159, 161, 255), 1.2)
            line(d, [(x - 7, 39), (x + 9, 39)], GOLD, 0.9)
    elif "lantern" in kind:
        line(d, [(W/2, 15), (W/2, 28)], WOOD_DARK, 1)
        ellipse(d, (W/2 - 13, 27, W/2 + 13, H - 18), (180, 68, 45, 235), (66, 34, 22, 255), 1)
        line(d, [(W/2 - 10, H/2), (W/2 + 10, H/2)], GOLD, 0.8)
    elif "mirror" in kind:
        ellipse(d, (W/2 - 19, 20, W/2 + 19, H - 18), GOLD, (69, 46, 27, 255), 1)
        ellipse(d, (W/2 - 13, 27, W/2 + 13, H - 25), (103, 121, 117, 220))
    if side == "left":
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    im = im.resize((W, H), Image.Resampling.LANCZOS)
    return trim_alpha(im, 2)


def save_all():
    for kind, (cat, w, h, zh) in CATALOG.items():
        out_dir = ASSETS / cat
        out_dir.mkdir(parents=True, exist_ok=True)
        rotations = [0, 1, 2, 3]
        for r in rotations:
            suffix = "" if r == 0 else f"_r{r}"
            im = render_item(kind, cat, w, h, zh, r)
            im.save(out_dir / f"{kind}{suffix}.png")
    out_dir = ASSETS / "wallhang"
    out_dir.mkdir(parents=True, exist_ok=True)
    for kind, (w, h) in WALL.items():
        for side in ("left", "right"):
            render_wall(kind, side, w, h).save(out_dir / f"{kind}_{side}.png")


def remove_green(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            # The model usually returns a slightly shaded green field rather
            # than exact #00ff00. Treat strong green-dominant pixels as matte.
            if g > 135 and g > r * 1.35 and g > b * 1.35:
                px[x, y] = (r, g, b, 0)
            elif g > 100 and g > r * 1.18 and g > b * 1.18:
                px[x, y] = (r, g, b, max(0, int(a * 0.22)))
    return im


def crop_cell(sheet: Image.Image, col: int, row: int, cols: int = 4, rows: int = 4, bottom_crop: float = 1.0) -> Image.Image:
    cw, ch = sheet.width / cols, sheet.height / rows
    # Keep a little gutter out of each cell; this avoids neighboring pieces
    # when the model drifts within the grid.
    pad_x, pad_y = 0, 0
    box = (
        int(col * cw + pad_x),
        int(row * ch + pad_y),
        int((col + 1) * cw - pad_x),
        int(row * ch + ch * bottom_crop - pad_y),
    )
    return trim_alpha(clean_components(remove_green(sheet.crop(box))), 4)


def clean_components(im: Image.Image, min_area: int = 90) -> Image.Image:
    im = im.convert("RGBA")
    alpha = im.getchannel("A")
    pix = alpha.load()
    seen = set()
    comps = []
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if pix[x, y] == 0 or (x, y) in seen:
                continue
            stack = [(x, y)]
            comp = []
            seen.add((x, y))
            while stack:
                qx, qy = stack.pop()
                comp.append((qx, qy))
                for nx, ny in ((qx + 1, qy), (qx - 1, qy), (qx, qy + 1), (qx, qy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and pix[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if len(comp) >= min_area:
                comps.append(comp)
    if not comps:
        return im
    # Generated sheets sometimes leak a piece of a neighboring cell into the
    # crop. Keep the main object plus components that sit close to its bbox.
    main = max(comps, key=len)
    mx0 = min(x for x, _ in main)
    my0 = min(y for _, y in main)
    mx1 = max(x for x, _ in main)
    my1 = max(y for _, y in main)
    margin = max(18, int(min(w, h) * 0.08))
    keep = set(main)
    for comp in comps:
        if comp is main:
            continue
        x0 = min(x for x, _ in comp)
        y0 = min(y for _, y in comp)
        x1 = max(x for x, _ in comp)
        y1 = max(y for _, y in comp)
        near = not (x1 < mx0 - margin or x0 > mx1 + margin or y1 < my0 - margin or y0 > my1 + margin)
        if near:
            keep.update(comp)
    out = im.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            if pix[x, y] and (x, y) not in keep:
                r, g, b, _a = opx[x, y]
                opx[x, y] = (r, g, b, 0)
    return out


def save_variants(im: Image.Image, path_base: Path, rug: bool = False):
    path_base.parent.mkdir(parents=True, exist_ok=True)
    im.save(path_base.with_suffix(".png"))
    if rug:
        return
    im.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(path_base.with_name(path_base.name + "_r1").with_suffix(".png"))
    im.save(path_base.with_name(path_base.name + "_r2").with_suffix(".png"))
    im.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(path_base.with_name(path_base.name + "_r3").with_suffix(".png"))


def overlay_ai_sheets():
    furniture_src = SOURCE / "furniture_sheet.png"
    decor_src = SOURCE / "decor_sheet.png"
    if not furniture_src.exists() or not decor_src.exists():
        return
    furniture = Image.open(furniture_src).convert("RGBA")
    decor = Image.open(decor_src).convert("RGBA")
    furniture_map = [
        "bed_basic", "bed_advanced", "meditation_dais", "chair_round",
        "chair_bench", "chair_cushion", "chair_taishi", "table_square",
        "table_tea", "table_desk", "table_long", "storage_wardrobe",
        "storage_shelf", "storage_chest", "storage_medicine_cabinet", "decor_screen",
    ]
    decor_map = [
        "decor_vase", "decor_brush", "decor_inkstone", "decor_censer",
        "decor_teaset", "decor_weiqi", "decor_guqin", "decor_bonsai",
        "decor_candle", "decor_books", "decor_wine", "decor_ruyi",
        "decor_food_box", "decor_wash_basin", "decor_floor_lamp", "decor_rug_large",
    ]
    for idx, kind in enumerate(furniture_map):
        cat, _w, _h, _zh = CATALOG[kind]
        # Furniture cells in the generated sheet have large empty gutters, but
        # lower-row objects can leak into the bottom of the previous crop.
        im = crop_cell(furniture, idx % 4, idx // 4, bottom_crop=0.82)
        save_variants(im, ASSETS / cat / kind)
    for idx, kind in enumerate(decor_map):
        cat, _w, _h, _zh = CATALOG[kind]
        im = crop_cell(decor, idx % 4, idx // 4)
        if kind in {"decor_vase", "decor_bonsai", "decor_censer"}:
            im = scale_canvas(im, 0.78)
        elif kind in {"decor_teaset", "decor_books", "decor_food_box", "decor_wash_basin"}:
            im = scale_canvas(im, 0.88)
        save_variants(im, ASSETS / cat / kind)


def keep_largest_component(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    alpha = im.getchannel("A")
    pix = alpha.load()
    w, h = im.size
    seen = set()
    comps = []
    for y in range(h):
        for x in range(w):
            if pix[x, y] == 0 or (x, y) in seen:
                continue
            stack = [(x, y)]
            comp = []
            seen.add((x, y))
            while stack:
                qx, qy = stack.pop()
                comp.append((qx, qy))
                for nx, ny in ((qx + 1, qy), (qx - 1, qy), (qx, qy + 1), (qx, qy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and pix[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            comps.append(comp)
    if len(comps) <= 1:
        return im
    keep = set(max(comps, key=len))
    out = im.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            if pix[x, y] and (x, y) not in keep:
                r, g, b, _a = opx[x, y]
                opx[x, y] = (r, g, b, 0)
    return trim_alpha(out, 8)


def reinforce_bed_base(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    alpha = im.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(7))
    under = Image.new("RGBA", im.size, (0, 0, 0, 0))
    upx = under.load()
    apx = alpha.load()
    epx = expanded.load()
    cutoff = int(im.height * 0.52)
    for y in range(cutoff, im.height):
        for x in range(im.width):
            if epx[x, y] and not apx[x, y]:
                # A restrained lower-structure underlay: it fills visual holes
                # near legs/rails without changing the top bedding silhouette.
                upx[x, y] = (54, 31, 18, min(210, epx[x, y]))
    under.alpha_composite(im)
    return trim_alpha(under, 8)


def solid_bbox(im: Image.Image, threshold: int = 51):
    im = im.convert("RGBA")
    alpha = im.getchannel("A")
    pix = alpha.load()
    xs, ys = [], []
    for y in range(im.height):
        for x in range(im.width):
            if pix[x, y] > threshold:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def reinforce_bed_visible_corners(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    box = solid_bbox(im)
    if not box:
        return im
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    alpha = im.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(11))
    out = im.copy()
    opx = out.load()
    apx = alpha.load()
    epx = expanded.load()
    wood = (54, 31, 18)
    for y in range(max(0, int(y0 + h * 0.58)), min(im.height, y1 + 4)):
        for x in range(max(0, x0 - 4), min(im.width, x1 + 4)):
            lower = y > y1 - h * 0.28
            corner = x < x0 + w * 0.24 or x > x1 - w * 0.24
            under_rail = y > y1 - h * 0.16
            if (lower and corner or under_rail) and epx[x, y] and not apx[x, y]:
                opx[x, y] = (wood[0], wood[1], wood[2], min(185, epx[x, y]))
    return trim_alpha(out, 8)


def add_canvas_padding(im: Image.Image, pad: int = 14) -> Image.Image:
    im = im.convert("RGBA")
    out = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    out.alpha_composite(im, (pad, pad))
    return out


def break_hard_bbox_edges(im: Image.Image, top=False, bottom=False, left=False, right=False) -> Image.Image:
    im = add_canvas_padding(im, 14)
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    draw = ImageDraw.Draw(im, "RGBA")
    # Invisible alpha sentinels keep the real silhouette off the bbox edge.
    marker = (0, 0, 0, 1)

    def raw_point(x: float, y: float):
        draw.point((round(x), round(y)), fill=marker)

    if top:
        for x in (x0 + w * 0.18, x0 + w * 0.5, x0 + w * 0.82):
            raw_point(x, y0 - 9)

    if bottom:
        for x in (x0 + w * 0.18, x0 + w * 0.5, x0 + w * 0.82):
            raw_point(x, y1 + 11)

    if left:
        for y in (y0 + h * 0.22, y0 + h * 0.50, y0 + h * 0.78):
            raw_point(x0 - 10, y)

    if right:
        for y in (y0 + h * 0.22, y0 + h * 0.50, y0 + h * 0.78):
            raw_point(x1 + 10, y)

    return trim_alpha(im, 10)


def render_aligned_rug_asset() -> Image.Image:
    im = Image.new("RGBA", (336, 190), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im, "RGBA")
    cx, cy = 168, 94
    outer = [(cx, cy - 82), (cx + 164, cy), (cx, cy + 82), (cx - 164, cy)]
    mid = [(cx, cy - 70), (cx + 140, cy), (cx, cy + 70), (cx - 140, cy)]
    inner = [(cx, cy - 56), (cx + 112, cy), (cx, cy + 56), (cx - 112, cy)]
    core = [(cx, cy - 34), (cx + 70, cy), (cx, cy + 34), (cx - 70, cy)]
    def raw_poly(pts, fill, outline=None, width=1):
        draw.polygon(pts, fill=fill)
        if outline:
            draw.line(pts + [pts[0]], fill=outline, width=width, joint="curve")
    def raw_line(pts, fill, width=1):
        draw.line(pts, fill=fill, width=width, joint="curve")
    raw_poly(outer, (43, 82, 80, 232), (48, 31, 24, 255), 2)
    raw_poly(mid, (52, 106, 103, 230), GOLD, 2)
    raw_poly(inner, (35, 86, 87, 226), (222, 177, 92, 210), 1)
    raw_poly(core, (48, 111, 111, 220), (215, 170, 88, 230), 1)
    for off in (-48, -32, -16, 16, 32, 48):
        raw_line([(cx - 112 + abs(off) * .35, cy + off), (cx, cy + off / 2), (cx + 112 - abs(off) * .35, cy + off)], (222, 177, 92, 95), 1)
    for off in (-112, -84, -56, 56, 84, 112):
        raw_line([(cx + off, cy - 56 + abs(off) * .25), (cx + off * .45, cy), (cx + off, cy + 56 - abs(off) * .25)], (27, 60, 62, 95), 1)
    return trim_alpha(im, 4)


def reinforce_storage_corners(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    alpha = im.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(5))
    under = Image.new("RGBA", im.size, (0, 0, 0, 0))
    upx = under.load()
    apx = alpha.load()
    epx = expanded.load()
    wood = (63, 36, 20, 218)
    # Restore tiny transparent bite-outs around lower corners only. This follows
    # the existing silhouette instead of adding new posts outside the object.
    for y in range(max(0, y0), min(im.height, y1 + 2)):
        for x in range(max(0, x0), min(im.width, x1 + 2)):
            lower = y > y0 + h * 0.58
            edge_zone = x < x0 + w * 0.18 or x > x1 - w * 0.18 or y > y1 - h * 0.12
            if lower and edge_zone and epx[x, y] and not apx[x, y]:
                upx[x, y] = (wood[0], wood[1], wood[2], min(190, epx[x, y]))
    under.alpha_composite(im)
    return trim_alpha(under, 8)


def postprocess_asset_shapes():
    for p in (ASSETS / "table").glob("table_tea*.png"):
        keep_largest_component(Image.open(p)).save(p)
    for p in (ASSETS / "table").glob("table_square*.png"):
        break_hard_bbox_edges(Image.open(p), left=True, right=True).save(p)
    for p in (ASSETS / "bed").glob("bed_advanced*.png"):
        break_hard_bbox_edges(
            reinforce_bed_visible_corners(reinforce_bed_base(Image.open(p))),
            bottom=True,
            left=True,
            right=True,
        ).save(p)
    for p in (ASSETS / "chair").glob("chair_taishi*.png"):
        break_hard_bbox_edges(Image.open(p), top=True).save(p)
    for p in (ASSETS / "chair").glob("chair_round*.png"):
        break_hard_bbox_edges(Image.open(p), bottom=True).save(p)
    for p in (ASSETS / "decor").glob("decor_screen*.png"):
        break_hard_bbox_edges(Image.open(p), top=True, left=True, right=True).save(p)
    for p in (ASSETS / "decor").glob("decor_candle*.png"):
        break_hard_bbox_edges(Image.open(p), bottom=True).save(p)
    for p in (ASSETS / "decor").glob("decor_inkstone*.png"):
        break_hard_bbox_edges(Image.open(p), left=True, right=True).save(p)
    rug = keep_largest_component(render_aligned_rug_asset())
    for p in (ASSETS / "decor").glob("decor_rug_large*.png"):
        rug.save(p)
    for p in (ASSETS / "storage").glob("storage_*.png"):
        name = p.stem
        break_hard_bbox_edges(
            reinforce_storage_corners(Image.open(p)),
            top=True,
            bottom=name.startswith("storage_medicine_cabinet"),
            left=True,
            right=True,
        ).save(p)


def scale_canvas(im: Image.Image, factor: float) -> Image.Image:
    nw = max(1, int(im.width * factor))
    nh = max(1, int(im.height * factor))
    small = im.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(small, ((im.width - nw) // 2, im.height - nh - max(2, int(im.height * 0.04))))
    return trim_alpha(out, 6)


def make_preview():
    files = []
    for kind, (cat, _, _, _) in CATALOG.items():
        files.append((kind, ASSETS / cat / f"{kind}.png"))
    thumb_w, thumb_h = 128, 112
    cols = 6
    rows = math.ceil(len(files) / cols)
    sheet = Image.new("RGBA", (cols * thumb_w, rows * thumb_h), (34, 25, 17, 255))
    for idx, (name, path) in enumerate(files):
        im = Image.open(path).convert("RGBA")
        scale = min((thumb_w - 18) / im.width, (thumb_h - 30) / im.height)
        sim = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.Resampling.LANCZOS)
        x = (idx % cols) * thumb_w + (thumb_w - sim.width) // 2
        y = (idx // cols) * thumb_h + (thumb_h - sim.height) // 2 - 5
        shadow = Image.new("RGBA", sim.size, (0, 0, 0, 0))
        shd = ImageDraw.Draw(shadow, "RGBA")
        shd.ellipse((sim.width * .18, sim.height * .78, sim.width * .82, sim.height * .96), fill=(0, 0, 0, 60))
        sheet.alpha_composite(shadow, (x, y))
        sheet.alpha_composite(sim, (x, y))
    sheet.convert("RGB").save(PREVIEW, quality=92)


if __name__ == "__main__":
    save_all()
    overlay_ai_sheets()
    postprocess_asset_shapes()
    make_preview()
