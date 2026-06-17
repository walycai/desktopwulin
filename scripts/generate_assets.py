from PIL import Image, ImageDraw, ImageOps
from pathlib import Path
import math
from collections import deque

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def ensure(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def save(img, rel):
    path = ensure(ASSETS / rel)
    img.save(path)


def rgba(color):
    return color


def diamond(draw, cx, cy, w, h, fill, outline=None):
    pts = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
    draw.polygon(pts, fill=fill)
    if outline:
        draw.line(pts + [pts[0]], fill=outline, width=1)


def iso_box(w_cells, h_cells, z, top, left, right, outline=(58, 38, 25, 255)):
    hw, hh = 12, 6
    base_w = (w_cells + h_cells) * hw
    base_h = (w_cells + h_cells) * hh
    img = Image.new("RGBA", (base_w + 8, base_h + z + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ox = img.width // 2
    top_y = z + 3
    pts = [
        (ox, top_y),
        (ox + w_cells * hw, top_y + w_cells * hh),
        (ox + (w_cells - h_cells) * hw, top_y + (w_cells + h_cells) * hh),
        (ox - h_cells * hw, top_y + h_cells * hh),
    ]
    pts_down = [(x, y + z) for x, y in pts]
    d.polygon([pts[3], pts[2], pts_down[2], pts_down[3]], fill=left)
    d.polygon([pts[1], pts[2], pts_down[2], pts_down[1]], fill=right)
    d.polygon(pts, fill=top)
    d.line(pts + [pts[0]], fill=outline, width=2)
    return img


def furniture():
    # Beds
    bed = iso_box(12, 24, 18, (156, 94, 56, 255), (92, 55, 38, 255), (118, 69, 42, 255))
    d = ImageDraw.Draw(bed)
    d.polygon([(bed.width//2-108, 54), (bed.width//2+36, 126), (bed.width//2-36, 162), (bed.width//2-180, 90)], fill=(218, 199, 166, 255))
    d.polygon([(bed.width//2-58, 78), (bed.width//2+22, 118), (bed.width//2-18, 138), (bed.width//2-98, 98)], fill=(139, 42, 36, 255))
    save(bed, "furniture/bed/bed_basic.png")

    adv = iso_box(16, 28, 28, (170, 104, 58, 255), (96, 50, 34, 255), (130, 74, 42, 255))
    d = ImageDraw.Draw(adv)
    d.rectangle((adv.width//2-150, 16, adv.width//2+110, 34), fill=(94, 45, 32, 255))
    for x in [adv.width//2-145, adv.width//2+105]:
        d.rectangle((x, 28, x+8, 120), fill=(74, 35, 27, 255))
    d.polygon([(adv.width//2-132, 64), (adv.width//2+60, 160), (adv.width//2-12, 196), (adv.width//2-204, 100)], fill=(226, 201, 145, 255))
    d.polygon([(adv.width//2-90, 82), (adv.width//2+58, 156), (adv.width//2+16, 177), (adv.width//2-132, 103)], fill=(94, 38, 92, 255))
    save(adv, "furniture/bed/bed_advanced.png")

    dais = iso_box(12, 12, 14, (95, 118, 145, 255), (54, 76, 105, 255), (72, 91, 124, 255))
    d = ImageDraw.Draw(dais)
    diamond(d, dais.width//2, 58, 108, 54, (169, 151, 101, 255), (74, 61, 43, 255))
    d.ellipse((dais.width//2-24, 38, dais.width//2+24, 72), outline=(205, 219, 232, 255), width=2)
    save(dais, "furniture/func/meditation_dais.png")

    # Tables and representative objects
    for name, w, h in [("table_square", 9, 9), ("table_long", 13, 5), ("table_desk", 11, 6), ("table_tea", 7, 7)]:
        img = iso_box(w, h, 18, (121, 78, 45, 255), (77, 45, 30, 255), (96, 58, 36, 255))
        d = ImageDraw.Draw(img)
        for px, py in [(18, img.height-28), (img.width-24, img.height-28), (img.width//2-20, img.height-18), (img.width//2+20, img.height-18)]:
            d.rectangle((px, py-22, px+5, py), fill=(59, 35, 24, 255))
        save(img, f"furniture/table/{name}.png")

    for name, w, h, color in [
        ("chair_round", 5, 5, (104, 66, 38, 255)),
        ("chair_bench", 9, 4, (102, 63, 35, 255)),
        ("chair_cushion", 5, 5, (126, 105, 63, 255)),
        ("chair_taishi", 6, 6, (88, 49, 29, 255)),
    ]:
        img = iso_box(w, h, 14, color, (54, 34, 24, 255), (72, 43, 28, 255))
        save(img, f"furniture/chair/{name}.png")

    decor_specs = {
        "decor_vase": (48, 64, "vase"),
        "decor_brush": (48, 28, "brush"),
        "decor_inkstone": (42, 28, "ink"),
        "decor_censer": (56, 56, "censer"),
        "decor_teaset": (64, 40, "tea"),
        "decor_weiqi": (70, 44, "board"),
        "decor_guqin": (120, 38, "qin"),
        "decor_bonsai": (58, 72, "bonsai"),
        "decor_candle": (38, 58, "candle"),
        "decor_books": (58, 42, "books"),
        "decor_wine": (52, 58, "wine"),
        "decor_screen": (146, 96, "screen"),
        "decor_ruyi": (70, 28, "ruyi"),
    }
    for name, (w, h, kind) in decor_specs.items():
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        if kind == "vase":
            d.ellipse((15, 22, 33, 58), fill=(72, 116, 132, 255)); d.rectangle((20, 10, 28, 28), fill=(72, 116, 132, 255)); d.arc((12, 22, 36, 54), 40, 320, fill=(193, 216, 214, 255), width=2)
        elif kind == "brush":
            d.line((8, 18, 38, 8), fill=(80, 44, 25, 255), width=4); d.polygon([(38, 8), (45, 5), (41, 14)], fill=(36, 28, 24, 255))
        elif kind == "ink":
            d.rounded_rectangle((8, 9, 34, 22), radius=4, fill=(30, 30, 32, 255)); d.rectangle((14, 12, 28, 16), fill=(64, 64, 68, 255))
        elif kind == "censer":
            d.ellipse((12, 28, 44, 46), fill=(123, 98, 63, 255)); d.rectangle((18, 22, 38, 36), fill=(142, 112, 72, 255)); d.line((28, 8, 28, 20), fill=(204, 190, 138, 180), width=2)
        elif kind == "tea":
            d.ellipse((12, 16, 34, 30), fill=(124, 86, 58, 255)); d.ellipse((40, 18, 54, 28), fill=(174, 151, 100, 255)); d.ellipse((6, 24, 58, 36), outline=(96, 62, 42, 255), width=2)
        elif kind == "board":
            d.polygon([(35, 6), (66, 22), (35, 38), (4, 22)], fill=(156, 112, 60, 255), outline=(67, 45, 29, 255)); d.line((16, 22, 54, 22), fill=(72, 48, 32, 255)); d.line((35, 12, 35, 32), fill=(72, 48, 32, 255))
        elif kind == "qin":
            d.rounded_rectangle((8, 8, 112, 28), radius=10, fill=(72, 38, 28, 255)); [d.line((18, y, 104, y), fill=(204, 172, 110, 255)) for y in range(13, 25, 4)]
        elif kind == "bonsai":
            d.rectangle((20, 48, 38, 62), fill=(94, 60, 38, 255)); d.line((29, 48, 29, 26), fill=(76, 53, 34, 255), width=4); d.ellipse((8, 10, 34, 34), fill=(58, 104, 52, 255)); d.ellipse((26, 14, 50, 40), fill=(72, 126, 62, 255))
        elif kind == "candle":
            d.rectangle((17, 26, 23, 52), fill=(196, 173, 116, 255)); d.polygon([(20, 10), (14, 25), (26, 25)], fill=(241, 180, 65, 255)); d.ellipse((10, 50, 30, 56), fill=(94, 64, 38, 255))
        elif kind == "books":
            for i, col in enumerate([(118, 44, 44, 255), (48, 84, 120, 255), (92, 108, 58, 255)]):
                d.polygon([(8+i*8, 20+i*3), (46+i*3, 12+i*3), (52+i*3, 20+i*3), (14+i*8, 28+i*3)], fill=col)
        elif kind == "wine":
            d.ellipse((12, 20, 40, 54), fill=(92, 105, 78, 255)); d.rectangle((21, 10, 31, 25), fill=(92, 105, 78, 255)); d.rectangle((17, 30, 36, 38), fill=(124, 54, 44, 255))
        elif kind == "screen":
            for i in range(3):
                x = 8 + i * 44
                d.polygon([(x+20, 6), (x+40, 18), (x+20, 84), (x, 72)], fill=(149, 114, 79, 255), outline=(72, 48, 32, 255))
                d.line((x+10, 40, x+30, 50), fill=(67, 96, 76, 255), width=2)
        elif kind == "ruyi":
            d.line((14, 18, 56, 12), fill=(166, 138, 80, 255), width=5); d.ellipse((50, 5, 68, 20), fill=(190, 160, 92, 255))
        save(img, f"furniture/decor/{name}.png")

    wall_items = {
        "wall_landscape": (96, 66, (105, 126, 89, 255)),
        "wall_scroll": (36, 77, (188, 174, 135, 255)),
        "wall_swordrack": (72, 44, (150, 150, 158, 255)),
        "wall_lantern": (36, 55, (176, 74, 58, 255)),
        "wall_mirror": (48, 55, (154, 132, 82, 255)),
        "wall_weapon": (84, 66, (140, 140, 150, 255)),
    }
    for name, (w, h, color) in wall_items.items():
        for side in ["left", "right"]:
            img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.rectangle((2, 2, w-3, h-3), fill=color, outline=(60, 42, 28, 255), width=2)
            d.line((8, h//2, w-8, h//2-10), fill=(74, 58, 42, 255), width=2)
            if "sword" in name or "weapon" in name:
                d.line((12, h-12, w-12, 12), fill=(218, 220, 210, 255), width=3)
                d.line((w//2-12, h//2, w//2+12, h//2), fill=(90, 54, 32, 255), width=4)
            elif "lantern" in name:
                d.ellipse((8, 12, w-8, h-10), fill=(196, 75, 57, 255), outline=(92, 38, 30, 255))
            elif "mirror" in name:
                d.ellipse((10, 8, w-10, h-12), fill=(199, 177, 107, 255), outline=(86, 62, 34, 255), width=3)
            elif "scroll" in name:
                d.line((w//2, 14, w//2, h-16), fill=(70, 50, 36, 255), width=2)
            save(img, f"furniture/wallhang/{name}_{side}.png")


def protagonist_home():
    out = ASSETS / "characters/protagonist"
    out.mkdir(parents=True, exist_ok=True)
    actions = {"idle": (4, 4), "walk": (8, 4), "sleep": (4, 1), "meditate": (4, 1)}
    dirs = ["down", "left", "right", "up"]
    for action, (frames, rows) in actions.items():
        img = Image.new("RGBA", (48 * frames, 64 * rows), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for r in range(rows):
            for f in range(frames):
                x, y = f * 48, r * 64
                bob = int(math.sin(f / max(frames, 1) * math.pi * 2) * 2)
                if action == "sleep":
                    d.ellipse((x+10, y+36, x+38, y+50), fill=(68, 50, 42, 255))
                    d.rectangle((x+14, y+28, x+40, y+40), fill=(45, 88, 112, 255))
                elif action == "meditate":
                    d.ellipse((x+13, y+14, x+35, y+36), fill=(194, 142, 94, 255))
                    d.rectangle((x+16, y+32, x+32, y+48), fill=(46, 88, 112, 255))
                    d.arc((x+7, y+36, x+41, y+60), 180, 360, fill=(42, 60, 82, 255), width=5)
                else:
                    d.ellipse((x+15, y+8+bob, x+33, y+26+bob), fill=(194, 142, 94, 255))
                    d.rectangle((x+16, y+25+bob, x+32, y+45+bob), fill=(45, 86, 118, 255))
                    leg = 2 if action == "walk" and f % 2 else -2
                    d.line((x+20, y+45+bob, x+18+leg, y+58), fill=(42, 42, 46, 255), width=4)
                    d.line((x+28, y+45+bob, x+30-leg, y+58), fill=(42, 42, 46, 255), width=4)
                    d.rectangle((x+13, y+25+bob, x+18, y+42+bob), fill=(42, 66, 96, 255))
                    d.rectangle((x+30, y+25+bob, x+35, y+42+bob), fill=(42, 66, 96, 255))
                    if rows == 4 and dirs[r] == "up":
                        d.rectangle((x+15, y+8+bob, x+33, y+24+bob), fill=(42, 38, 34, 255))
        img.save(out / f"{action}.png")


def combat_assets():
    pc = ASSETS / "characters/protagonist_combat"
    pc.mkdir(parents=True, exist_ok=True)
    specs = {"idle": (4, 6), "advance": (6, 10), "attack": (6, 12), "hurt": (3, 8), "down": (4, 6)}
    for action, (frames, _) in specs.items():
        img = Image.new("RGBA", (64 * frames, 64), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for f in range(frames):
            x = f * 64
            if action == "down":
                d.ellipse((x+18, 38, x+34, 52), fill=(194, 142, 94, 255))
                d.rectangle((x+26, 34, x+54, 46), fill=(45, 86, 118, 255))
            else:
                bob = int(math.sin(f / frames * math.pi * 2) * 2)
                d.ellipse((x+22, 8+bob, x+40, 26+bob), fill=(194, 142, 94, 255))
                d.rectangle((x+22, 26+bob, x+40, 48+bob), fill=(45, 86, 118, 255))
                d.line((x+27, 48+bob, x+25, 60), fill=(42, 42, 46, 255), width=4)
                d.line((x+36, 48+bob, x+39, 60), fill=(42, 42, 46, 255), width=4)
                if action == "attack":
                    reach = 8 + f * 5 if f < 3 else 24 - (f-3)*5
                    d.line((x+38, 31+bob, x+42+reach, 22+bob), fill=(210, 214, 202, 255), width=3)
                elif action == "hurt":
                    d.line((x+20, 30, x+12, 24), fill=(190, 64, 54, 255), width=3)
                else:
                    d.line((x+40, 31+bob, x+50, 36+bob), fill=(45, 86, 118, 255), width=4)
        img.save(pc / f"{action}.png")

    enemies = {"thug": (110, 86, 60), "bandit": (120, 52, 42), "sect_novice": (70, 92, 126)}
    for eid, col in enemies.items():
        ed = ASSETS / f"characters/enemies/{eid}"
        ed.mkdir(parents=True, exist_ok=True)
        for action, frames in {"idle": 4, "attack": 6, "hurt": 3, "death": 4}.items():
            img = Image.new("RGBA", (64 * frames, 64), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            for f in range(frames):
                x = f * 64
                if action == "death":
                    d.ellipse((x+28, 38, x+44, 52), fill=(180, 126, 86, 255))
                    d.rectangle((x+8, 35, x+34, 47), fill=col+(255,))
                else:
                    bob = int(math.sin(f / frames * math.pi * 2) * 2)
                    d.ellipse((x+24, 9+bob, x+42, 27+bob), fill=(180, 126, 86, 255))
                    d.rectangle((x+24, 27+bob, x+42, 48+bob), fill=col+(255,))
                    d.line((x+28, 48+bob, x+26, 60), fill=(42, 40, 38, 255), width=4)
                    d.line((x+38, 48+bob, x+40, 60), fill=(42, 40, 38, 255), width=4)
                    if action == "attack":
                        d.line((x+24, 32+bob, x+8, 25+bob), fill=(190, 190, 178, 255), width=3)
            img.save(ed / f"{action}.png")

    bg = Image.new("RGBA", (960, 540), (86, 108, 92, 255))
    d = ImageDraw.Draw(bg)
    d.rectangle((0, 0, 960, 230), fill=(118, 150, 156, 255))
    d.polygon([(0, 260), (180, 160), (360, 260)], fill=(84, 104, 84, 255))
    d.polygon([(240, 270), (480, 130), (720, 270)], fill=(78, 98, 82, 255))
    d.rectangle((0, 400, 960, 540), fill=(104, 82, 54, 255))
    for x in range(0, 960, 96):
        d.ellipse((x+20, 360, x+80, 430), fill=(52, 92, 48, 255))
        d.rectangle((x+48, 330, x+56, 400), fill=(80, 54, 34, 255))
    save(bg, "combat/bg_wulin.png")


def environment_assets():
    # Large-cell floor tile: 4x4 fine cells, v0.3.1 visual diamond 96x48.
    tile = Image.new("RGBA", (96, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    diamond(d, 48, 24, 96, 48, (176, 145, 94, 255), (92, 62, 36, 255))
    diamond(d, 48, 24, 74, 36, (190, 158, 104, 255), None)
    save(tile, "tiles/indoor/floor_large.png")

    for side, base in [("right", (150, 122, 88, 255)), ("left", (132, 105, 76, 255))]:
        wall = Image.new("RGBA", (256, 176), base)
        d = ImageDraw.Draw(wall)
        for y in range(0, 176, 22):
            d.line((0, y, 256, y), fill=(105, 80, 55, 255), width=1)
        for x in range(0, 256, 32):
            d.line((x, 0, x, 176), fill=(160, 132, 96, 80), width=1)
        d.rectangle((0, 160, 256, 176), fill=(94, 62, 38, 255))
        save(wall, f"tiles/indoor/wall_{side}.png")

    yard = Image.new("RGBA", (256, 160), (74, 122, 58, 255))
    d = ImageDraw.Draw(yard)
    for x in range(0, 256, 32):
        d.ellipse((x + 6, 18, x + 24, 36), fill=(72, 144, 66, 255))
        d.ellipse((x + 14, 70, x + 36, 96), fill=(62, 118, 55, 255))
        d.rectangle((x + 22, 82, x + 27, 118), fill=(82, 55, 34, 255))
        d.ellipse((x + 4, 126, x + 18, 140), fill=(176, 82, 100, 255))
    save(yard, "tiles/exterior/courtyard.png")


def ui_assets():
    ui = ASSETS / "ui"
    ui.mkdir(parents=True, exist_ok=True)
    board = Image.new("RGBA", (780, 540), (42, 30, 20, 235))
    d = ImageDraw.Draw(board)
    d.rectangle((18, 18, 762, 522), outline=(166, 124, 72, 255), width=4)
    d.rectangle((34, 42, 360, 500), fill=(70, 52, 34, 220), outline=(142, 98, 58, 255), width=2)
    d.rectangle((390, 42, 742, 500), fill=(52, 38, 26, 220), outline=(142, 98, 58, 255), width=2)
    d.ellipse((168, 96, 226, 154), outline=(196, 160, 98, 255), width=3)
    d.line((197, 154, 197, 310), fill=(196, 160, 98, 255), width=4)
    d.line((197, 190, 128, 250), fill=(196, 160, 98, 255), width=4)
    d.line((197, 190, 266, 250), fill=(196, 160, 98, 255), width=4)
    d.line((197, 310, 150, 430), fill=(196, 160, 98, 255), width=4)
    d.line((197, 310, 244, 430), fill=(196, 160, 98, 255), width=4)
    board.save(ui / "dollboard.png")

    slots = ["head", "neck", "body", "legs", "weapon", "ring", "belt"]
    for s in slots:
        img = Image.new("RGBA", (64, 64), (72, 52, 34, 230))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((3, 3, 60, 60), radius=6, outline=(172, 132, 82, 255), width=3)
        d.rectangle((14, 14, 50, 50), outline=(98, 72, 45, 255), width=1)
        img.save(ui / f"slot_{s}.png")

    potion = Image.new("RGBA", (56, 56), (0, 0, 0, 0))
    d = ImageDraw.Draw(potion)
    d.rectangle((23, 6, 33, 18), fill=(88, 58, 42, 255))
    d.ellipse((14, 16, 42, 50), fill=(170, 48, 54, 255), outline=(230, 198, 156, 255), width=2)
    d.rectangle((24, 25, 32, 40), fill=(238, 210, 170, 255))
    d.rectangle((20, 29, 36, 36), fill=(238, 210, 170, 255))
    potion.save(ui / "potion_hp.png")

    eq = ASSETS / "equipment"
    eq.mkdir(parents=True, exist_ok=True)
    equipment = {
        "wpn_iron_sword": "sword", "wpn_steel_saber": "saber", "head_cloth": "clothhat", "head_iron": "helm",
        "body_cloth": "robe", "body_softarmor": "armor", "legs_cloth": "pants", "legs_guard": "guard",
        "neck_lock": "neck", "ring_jade": "ring", "belt_iron": "belt",
    }
    for eid, kind in equipment.items():
        img = Image.new("RGBA", (56, 56), (46, 38, 30, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((2, 2, 53, 53), radius=5, fill=(48, 38, 28, 230), outline=(120, 98, 68, 255), width=2)
        if kind == "sword":
            d.line((15, 43, 40, 12), fill=(205, 210, 200, 255), width=4); d.line((18, 38, 28, 48), fill=(102, 62, 34, 255), width=4)
        elif kind == "saber":
            d.arc((12, 8, 46, 48), 220, 330, fill=(210, 214, 202, 255), width=5); d.line((18, 38, 28, 48), fill=(102, 62, 34, 255), width=4)
        elif kind == "clothhat":
            d.polygon([(12, 26), (28, 12), (44, 26), (38, 36), (18, 36)], fill=(78, 92, 122, 255))
        elif kind == "helm":
            d.arc((12, 10, 44, 42), 180, 360, fill=(132, 132, 128, 255), width=12); d.rectangle((16, 26, 40, 38), fill=(104, 104, 104, 255))
        elif kind == "robe":
            d.polygon([(20, 10), (36, 10), (44, 46), (12, 46)], fill=(78, 92, 118, 255)); d.line((28, 12, 28, 44), fill=(190, 160, 98, 255), width=2)
        elif kind == "armor":
            d.polygon([(18, 10), (38, 10), (44, 46), (12, 46)], fill=(92, 92, 94, 255)); d.line((18, 24, 38, 24), fill=(170, 170, 160, 255), width=2)
        elif kind == "pants":
            d.rectangle((16, 12, 28, 46), fill=(88, 76, 62, 255)); d.rectangle((30, 12, 42, 46), fill=(88, 76, 62, 255))
        elif kind == "guard":
            d.rectangle((14, 14, 26, 48), fill=(96, 84, 72, 255)); d.rectangle((30, 14, 42, 48), fill=(96, 84, 72, 255)); d.line((14, 26, 42, 26), fill=(160, 142, 92, 255), width=2)
        elif kind == "neck":
            d.arc((16, 10, 40, 42), 30, 150, fill=(210, 166, 74, 255), width=3); d.rounded_rectangle((20, 26, 36, 42), radius=4, fill=(204, 154, 58, 255))
        elif kind == "ring":
            d.ellipse((16, 16, 40, 40), outline=(210, 205, 170, 255), width=6)
        elif kind == "belt":
            d.rectangle((8, 24, 48, 34), fill=(52, 48, 44, 255)); d.rectangle((23, 20, 33, 38), fill=(122, 112, 92, 255))
        img.save(eq / f"{eid}.png")


def line_iso(draw, pts, fill, width=1):
    draw.line(pts, fill=fill, width=width, joint="curve")


def refine_priority_assets():
    """Overwrite first-priority assets with denser pixel art while preserving paths."""
    # Floor: 4x4 fine-cell large diamond, 96x48.
    img = Image.new("RGBA", (96, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    diamond(d, 48, 24, 96, 48, (168, 132, 78, 255), (72, 46, 28, 255))
    # Plank seams following both isometric axes.
    for off in range(-36, 49, 12):
        line_iso(d, [(48 + off, 24 - abs(off) // 2), (48 + off + 18, 24 - abs(off + 18) // 2 + 9)], (118, 84, 48, 180))
    for i in range(4):
        t = 12 + i * 8
        d.line((48 - t, 24, 48, 24 + t // 2), fill=(134, 94, 54, 180))
        d.line((48 + t, 24, 48, 24 + t // 2), fill=(205, 169, 104, 120))
    for x, y in [(30, 23), (44, 17), (61, 25), (52, 32), (38, 29), (69, 20)]:
        d.point((x, y), fill=(96, 65, 39, 220))
        d.point((x + 1, y), fill=(204, 166, 98, 160))
    save(img, "tiles/indoor/floor_large.png")

    for side, base, shadow in [
        ("right", (151, 119, 82, 255), (104, 74, 48, 255)),
        ("left", (126, 99, 72, 255), (86, 62, 43, 255)),
    ]:
        wall = Image.new("RGBA", (256, 176), base)
        d = ImageDraw.Draw(wall)
        for y in range(0, 176, 16):
            d.rectangle((0, y, 256, y + 2), fill=shadow)
            d.line((0, y + 15, 256, y + 15), fill=(184, 151, 105, 110))
        for x in range(0, 256, 32):
            d.line((x, 0, x, 176), fill=(92, 65, 42, 100), width=1)
            d.line((x + 1, 0, x + 1, 176), fill=(185, 148, 101, 70), width=1)
        # Low wainscot. Keep the upper wall clean; random specks read as visual noise in-game.
        d.rectangle((0, 142, 256, 176), fill=(96, 63, 38, 255))
        for x in range(6, 256, 17):
            d.line((x, 145, x + 8, 172), fill=(124, 82, 48, 200), width=1)
        save(wall, f"tiles/indoor/wall_{side}.png")

    yard = Image.new("RGBA", (256, 160), (64, 105, 55, 255))
    d = ImageDraw.Draw(yard)
    for y in range(0, 160, 16):
        d.line((0, y, 256, y + 8), fill=(50, 88, 48, 110), width=1)
    for x in range(0, 256, 32):
        # Tree trunks and foliage clusters.
        d.rectangle((x + 18, 58, x + 23, 122), fill=(82, 55, 34, 255))
        for ox, oy, col in [(-6, 44, (48, 112, 50, 255)), (6, 38, (61, 135, 58, 255)), (14, 52, (44, 101, 45, 255))]:
            d.ellipse((x + ox, oy, x + ox + 28, oy + 26), fill=col)
        # Flowers and stones.
        d.ellipse((x + 4, 130, x + 13, 139), fill=(194, 78, 112, 255))
        d.ellipse((x + 28, 132, x + 38, 142), fill=(224, 150, 76, 255))
        d.ellipse((x + 48, 126, x + 62, 137), fill=(90, 88, 80, 255))
    save(yard, "tiles/exterior/courtyard.png")

    # Refined basic bed, same footprint but richer textile and wood detail.
    bed = iso_box(12, 24, 24, (146, 82, 46, 255), (86, 48, 30, 255), (113, 64, 38, 255))
    d = ImageDraw.Draw(bed)
    cx = bed.width // 2
    quilt = [(cx - 114, 58), (cx + 42, 136), (cx - 42, 178), (cx - 198, 100)]
    mat = [(cx - 136, 50), (cx + 58, 147), (cx - 48, 200), (cx - 242, 104)]
    d.polygon(mat, fill=(218, 196, 152, 255), outline=(105, 68, 42, 255))
    d.polygon(quilt, fill=(151, 43, 36, 255), outline=(82, 36, 30, 255))
    for i in range(5):
        shift = i * 18
        d.line((cx - 105 + shift, 64 + shift // 2, cx - 40 + shift, 96 + shift // 2), fill=(205, 87, 64, 160), width=2)
    pillow = [(cx - 158, 65), (cx - 90, 99), (cx - 124, 116), (cx - 192, 82)]
    d.polygon(pillow, fill=(238, 219, 184, 255), outline=(126, 91, 58, 255))
    for x in [cx - 242, cx + 54, cx - 52]:
        d.rectangle((x, 104, x + 6, 155), fill=(70, 38, 25, 255))
    save(bed, "furniture/bed/bed_basic.png")

    table = iso_box(9, 9, 22, (125, 76, 42, 255), (72, 42, 27, 255), (98, 57, 34, 255))
    d = ImageDraw.Draw(table)
    cx = table.width // 2
    top = [(cx, 25), (cx + 108, 79), (cx, 133), (cx - 108, 79)]
    d.polygon(top, fill=(132, 78, 42, 255), outline=(58, 35, 23, 255))
    for off in range(-72, 73, 24):
        d.line((cx + off, 43 + abs(off)//4, cx + off + 28, 58 + abs(off)//4), fill=(174, 111, 62, 130), width=2)
    for px, py in [(cx - 88, 90), (cx + 80, 90), (cx - 44, 120), (cx + 42, 120)]:
        d.rectangle((px, py, px + 7, py + 48), fill=(58, 35, 23, 255))
        d.rectangle((px + 1, py, px + 3, py + 48), fill=(112, 66, 38, 255))
    save(table, "furniture/table/table_square.png")

    # More readable home protagonist sheets.
    out = ASSETS / "characters/protagonist"
    rows = ["down", "left", "right", "up"]
    for action, frames, row_count in [("idle", 4, 4), ("walk", 8, 4)]:
        img = Image.new("RGBA", (48 * frames, 64 * row_count), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for r, direction in enumerate(rows):
            for f in range(frames):
                x, y = f * 48, r * 64
                bob = int(math.sin(f / frames * math.pi * 2) * (1 if action == "idle" else 2))
                step = 3 if action == "walk" and f % 2 else -2
                # Shadow
                d.ellipse((x + 13, y + 55, x + 35, y + 61), fill=(0, 0, 0, 80))
                # Legs/boots
                d.line((x + 20, y + 42 + bob, x + 18 + step, y + 57), fill=(28, 31, 36, 255), width=4)
                d.line((x + 28, y + 42 + bob, x + 30 - step, y + 57), fill=(28, 31, 36, 255), width=4)
                # Robe body
                robe = (42, 82, 116, 255)
                trim = (190, 150, 78, 255)
                d.polygon([(x + 16, y + 24 + bob), (x + 32, y + 24 + bob), (x + 35, y + 45 + bob), (x + 13, y + 45 + bob)], fill=robe)
                d.line((x + 24, y + 25 + bob, x + 21, y + 44 + bob), fill=trim, width=1)
                d.line((x + 25, y + 25 + bob, x + 31, y + 44 + bob), fill=(26, 55, 82, 255), width=1)
                # Arms
                arm_swing = step if action == "walk" else 0
                d.line((x + 15, y + 28 + bob, x + 10 - arm_swing, y + 40 + bob), fill=(36, 66, 96, 255), width=4)
                d.line((x + 33, y + 28 + bob, x + 38 + arm_swing, y + 40 + bob), fill=(36, 66, 96, 255), width=4)
                # Head/hair
                face = (198, 142, 92, 255)
                hair = (36, 30, 26, 255)
                d.ellipse((x + 15, y + 8 + bob, x + 33, y + 27 + bob), fill=face)
                d.rectangle((x + 16, y + 7 + bob, x + 32, y + 14 + bob), fill=hair)
                d.rectangle((x + 22, y + 2 + bob, x + 26, y + 8 + bob), fill=hair)
                if direction != "up":
                    d.point((x + 20, y + 18 + bob), fill=(42, 28, 22, 255))
                    d.point((x + 28, y + 18 + bob), fill=(42, 28, 22, 255))
                else:
                    d.rectangle((x + 14, y + 10 + bob, x + 34, y + 25 + bob), fill=hair)
        img.save(out / f"{action}.png")

    # Refine single-direction rest poses.
    for action in ["sleep", "meditate"]:
        frames = 4
        img = Image.new("RGBA", (48 * frames, 64), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for f in range(frames):
            x, y = f * 48, 0
            pulse = int(math.sin(f / frames * math.pi * 2) * 2)
            if action == "sleep":
                d.ellipse((x + 9, y + 43, x + 40, y + 55), fill=(0, 0, 0, 70))
                d.ellipse((x + 10, y + 34, x + 27, y + 49), fill=(198, 142, 92, 255))
                d.rectangle((x + 22, y + 30, x + 43, y + 43), fill=(44, 80, 112, 255))
                d.line((x + 32, y + 28 + pulse, x + 39, y + 22 + pulse), fill=(230, 230, 210, 180), width=1)
            else:
                d.ellipse((x + 11, y + 52, x + 37, y + 60), fill=(0, 0, 0, 70))
                d.ellipse((x + 15, y + 10 + pulse, x + 33, y + 29 + pulse), fill=(198, 142, 92, 255))
                d.rectangle((x + 15, y + 29 + pulse, x + 33, y + 45 + pulse), fill=(42, 82, 116, 255))
                d.arc((x + 6, y + 38, x + 42, y + 61), 185, 355, fill=(28, 34, 44, 255), width=5)
                d.ellipse((x + 13, y + 39, x + 35, y + 58), outline=(180, 158, 96, 180), width=1)
        img.save(out / f"{action}.png")


def cut_sample_to_alpha(crop, pad=24):
    """Remove connected dark sample-sheet background while preserving object outlines."""
    crop = crop.convert("RGBA")
    pix = crop.load()
    w, h = crop.size
    samples = []
    step_x = max(1, w // 20)
    step_y = max(1, h // 20)
    for x in range(0, w, step_x):
        samples.append(pix[x, 0][:3])
        samples.append(pix[x, h - 1][:3])
    for y in range(0, h, step_y):
        samples.append(pix[0, y][:3])
        samples.append(pix[w - 1, y][:3])
    avg = tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))

    def is_background(px):
        r, g, b, _ = px
        dist = sum((px[i] - avg[i]) ** 2 for i in range(3)) ** 0.5
        mx, mn = max(r, g, b), min(r, g, b)
        return (mx < 80 and mx - mn < 35) or dist < 34

    seen = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            continue
        seen[y][x] = True
        if is_background(pix[x, y]):
            pix[x, y] = (0, 0, 0, 0)
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    seen = [[False] * w for _ in range(h)]
    comps = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy][sx] or pix[sx, sy][3] == 0:
                continue
            q = deque([(sx, sy)])
            seen[sy][sx] = True
            pts = []
            while q:
                x, y = q.popleft()
                pts.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and pix[nx, ny][3] > 0:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            comps.append({"pts": pts, "area": len(pts), "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1)})
    if comps:
        comps.sort(key=lambda c: c["area"], reverse=True)
        main = comps[0]["bbox"]
        keep = set()
        margin = max(18, int(max(main[2] - main[0], main[3] - main[1]) * 0.08))
        expanded = (main[0] - margin, main[1] - margin, main[2] + margin, main[3] + margin)

        def overlaps(a, b):
            return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]

        for comp in comps:
            if comp["area"] >= 16 and overlaps(comp["bbox"], expanded):
                keep.update(comp["pts"])
        for y in range(h):
            for x in range(w):
                if pix[x, y][3] > 0 and (x, y) not in keep:
                    pix[x, y] = (0, 0, 0, 0)
    bbox = crop.getbbox()
    if not bbox:
        return crop
    cut = crop.crop(bbox)
    out = Image.new("RGBA", (cut.width + pad * 2, cut.height + pad * 2), (0, 0, 0, 0))
    out.alpha_composite(cut, (pad, pad))
    return out


def cut_chroma_to_alpha(crop, pad=18, key="green"):
    """Remove flat green imagegen sheet background and keep the main nearby components."""
    crop = crop.convert("RGBA")
    pix = crop.load()
    w, h = crop.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            is_key = False
            if key == "magenta":
                is_key = r > 145 and b > 145 and g < 135 and r > g * 1.25 and b > g * 1.25
            else:
                is_key = g > 145 and r < 135 and b < 135 and g > r * 1.25 and g > b * 1.25
            if a and is_key:
                pix[x, y] = (0, 0, 0, 0)
    seen = [[False] * w for _ in range(h)]
    comps = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy][sx] or pix[sx, sy][3] == 0:
                continue
            q = deque([(sx, sy)])
            seen[sy][sx] = True
            pts = []
            while q:
                x, y = q.popleft()
                pts.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and pix[nx, ny][3] > 0:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            comps.append({"pts": pts, "area": len(pts), "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1)})
    if comps:
        comps.sort(key=lambda c: c["area"], reverse=True)
        main = comps[0]["bbox"]
        margin = max(20, int(max(main[2] - main[0], main[3] - main[1]) * 0.22))
        expanded = (main[0] - margin, main[1] - margin, main[2] + margin, main[3] + margin)

        def overlaps(a, b):
            return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]

        keep = set()
        for comp in comps:
            if comp["area"] >= 10 and overlaps(comp["bbox"], expanded):
                keep.update(comp["pts"])
        for y in range(h):
            for x in range(w):
                if pix[x, y][3] > 0 and (x, y) not in keep:
                    pix[x, y] = (0, 0, 0, 0)
    bbox = crop.getbbox()
    if not bbox:
        return crop
    cut = crop.crop(bbox)
    out = Image.new("RGBA", (cut.width + pad * 2, cut.height + pad * 2), (0, 0, 0, 0))
    out.alpha_composite(cut, (pad, pad))
    return out


def apply_approved_style_sample():
    """Cut approved AI style sample into first production assets."""
    sample = ROOT / "previews/style-sample-gufeng-pixel-v1.png"
    if not sample.exists():
        return
    src = Image.open(sample).convert("RGBA")
    crops = {
        "furniture/bed/bed_basic.png": (16, 16, 552, 430),
        "furniture/table/table_square.png": (535, 88, 975, 468),
        "furniture/func/meditation_dais.png": (940, 48, 1535, 492),
        "furniture/decor/decor_screen.png": (14, 482, 606, 1040),
        "furniture/wallhang/wall_scroll_right.png": (588, 462, 1024, 1040),
        "furniture/wallhang/wall_scroll_left.png": (588, 462, 1024, 1040),
        "furniture/decor/decor_vase.png": (1048, 478, 1492, 1002),
    }
    for rel, box in crops.items():
        img = cut_sample_to_alpha(src.crop(box))
        if rel == "furniture/bed/bed_basic.png":
            img = ImageOps.mirror(img)
        save(img, rel)


def apply_home_asset_sheet_v2():
    """Cut the second approved-direction home sheet into currently wired catalog assets."""
    sample = ROOT / "previews/home-asset-sheet-v2.png"
    if not sample.exists():
        return
    src = Image.open(sample).convert("RGBA")
    crops = {
        "furniture/bed/bed_advanced.png": (50, 24, 405, 290),
        "furniture/table/table_desk.png": (450, 28, 790, 285),
        "furniture/table/table_tea.png": (820, 34, 1160, 262),
        "furniture/chair/chair_round.png": (1200, 24, 1454, 270),
        "furniture/chair/chair_taishi.png": (74, 286, 315, 522),
        "furniture/chair/chair_bench.png": (404, 284, 784, 516),
        "furniture/decor/decor_censer.png": (78, 756, 296, 1014),
        "furniture/decor/decor_candle.png": (1204, 520, 1390, 770),
    }
    for rel, box in crops.items():
        img = cut_chroma_to_alpha(src.crop(box))
        if rel == "furniture/bed/bed_advanced.png":
            img = ImageOps.mirror(img)
        save(img, rel)


def normalize_icon(img, size=96, inset=8):
    bbox = img.getchannel("A").getbbox()
    if bbox:
        img = img.crop(bbox)
    max_side = size - inset * 2
    scale = min(max_side / img.width, max_side / img.height, 1)
    resized = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return out


def apply_equipment_icon_sheet_v1():
    """Cut image-generated wuxia equipment icons into the existing equipment IDs."""
    sample = ROOT / "previews/equipment-icon-sheet-v1.png"
    if not sample.exists():
        return
    src = Image.open(sample).convert("RGBA")
    crops = {
        "equipment/wpn_iron_sword.png": (35, 28, 388, 330),
        "equipment/wpn_steel_saber.png": (398, 34, 760, 336),
        "equipment/head_cloth.png": (776, 48, 1120, 320),
        "equipment/head_iron.png": (1160, 42, 1460, 350),
        "equipment/body_cloth.png": (24, 392, 368, 742),
        "equipment/body_softarmor.png": (404, 388, 712, 730),
        "equipment/legs_cloth.png": (804, 398, 1080, 728),
        "equipment/legs_guard.png": (1152, 384, 1438, 730),
        "equipment/neck_lock.png": (42, 770, 360, 1120),
        "equipment/ring_jade.png": (404, 780, 700, 1086),
        "equipment/belt_iron.png": (764, 782, 1138, 1074),
    }
    for rel, box in crops.items():
        save(normalize_icon(cut_chroma_to_alpha(src.crop(box), pad=6)), rel)


def combat_pose(src, box, face_right=True):
    pose = cut_chroma_to_alpha(src.crop(box), pad=6)
    if not face_right:
        pose = ImageOps.mirror(pose)
    bbox = pose.getchannel("A").getbbox()
    if bbox:
        pose = pose.crop(bbox)
    scale = min(58 / pose.height, 58 / pose.width)
    pose = pose.resize((max(1, round(pose.width * scale)), max(1, round(pose.height * scale))), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    frame.alpha_composite(pose, ((64 - pose.width) // 2, 62 - pose.height))
    return frame


def make_combat_sheet(pose, action, frames):
    sheet = Image.new("RGBA", (64 * frames, 64), (0, 0, 0, 0))
    for f in range(frames):
        fr = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        if action == "advance":
            off = (-2 + (f % 3) * 2, -1 if f % 2 else 0)
        elif action == "attack":
            off = (min(6, f * 2) if f < frames / 2 else max(0, (frames - f) * 2), -1)
        elif action == "hurt":
            off = (-3 + f, 0)
        elif action in ("down", "death"):
            rot = -74 if action == "down" else 74
            fallen = pose.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
            fallen = fallen.resize((min(60, fallen.width), min(44, fallen.height)), Image.Resampling.LANCZOS)
            fr.alpha_composite(fallen, ((64 - fallen.width) // 2, 62 - fallen.height))
            sheet.alpha_composite(fr, (64 * f, 0))
            continue
        else:
            off = (0, -1 if f % 2 else 0)
        fr.alpha_composite(pose, off)
        sheet.alpha_composite(fr, (64 * f, 0))
    return sheet


def make_player_attack_sheet(pose):
    sheet = Image.new("RGBA", (64 * 6, 64), (0, 0, 0, 0))
    draw_specs = [
        {"off": (0, 0), "slash": None},
        {"off": (2, -1), "slash": ((38, 26), (56, 14), (214, 222, 210, 210))},
        {"off": (6, -1), "slash": ((36, 30), (62, 22), (240, 234, 196, 240))},
        {"off": (8, 0), "slash": ((34, 36), (62, 42), (250, 220, 145, 230))},
        {"off": (4, 0), "slash": ((36, 34), (55, 48), (226, 214, 184, 190))},
        {"off": (1, 0), "slash": None},
    ]
    for f, spec in enumerate(draw_specs):
        fr = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        body = pose.transform((64, 64), Image.Transform.AFFINE, (1, -0.05, -spec["off"][0], 0, 1, -spec["off"][1]), Image.Resampling.BICUBIC)
        fr.alpha_composite(body)
        d = ImageDraw.Draw(fr)
        if spec["slash"]:
            (x1, y1), (x2, y2), col = spec["slash"]
            d.line((x1, y1, x2, y2), fill=col, width=4)
            d.line((x1 - 3, y1 + 4, x2 - 2, y2 + 4), fill=(248, 238, 202, 150), width=2)
        sheet.alpha_composite(fr, (64 * f, 0))
    return sheet


def apply_combat_sources_v1():
    char_src = ROOT / "previews/combat-character-source-v1.png"
    bg_src = ROOT / "previews/combat-bg-source-v1.png"
    if bg_src.exists():
        bg = Image.open(bg_src).convert("RGBA")
        bg = ImageOps.fit(bg, (960, 540), method=Image.Resampling.LANCZOS, centering=(0.5, 0.55))
        save(bg, "combat/bg_wulin.png")
    if not char_src.exists():
        return
    src = Image.open(char_src).convert("RGBA")
    poses = {
        "player": combat_pose(src, (60, 80, 540, 675), True),
        "thug": combat_pose(src, (610, 88, 1075, 675), False),
        "bandit": combat_pose(src, (1120, 82, 1640, 675), False),
        "sect_novice": combat_pose(src, (1660, 80, 2140, 675), False),
    }
    player_specs = {"idle": 4, "advance": 6, "attack": 6, "hurt": 3, "down": 4}
    for action, frames in player_specs.items():
        if action == "attack":
            save(make_player_attack_sheet(poses["player"]), f"characters/protagonist_combat/{action}.png")
        else:
            save(make_combat_sheet(poses["player"], action, frames), f"characters/protagonist_combat/{action}.png")
    enemy_specs = {"idle": 4, "attack": 6, "hurt": 3, "death": 4}
    for eid in ["thug", "bandit", "sect_novice"]:
        for action, frames in enemy_specs.items():
            save(make_combat_sheet(poses[eid], action, frames), f"characters/enemies/{eid}/{action}.png")


def boss_pose(src, box, key="green", max_size=62):
    pose = cut_chroma_to_alpha(src.crop(box), pad=8, key=key)
    bbox = pose.getchannel("A").getbbox()
    if bbox:
        pose = pose.crop(bbox)
    scale = min(max_size / pose.height, max_size / pose.width)
    pose = pose.resize((max(1, round(pose.width * scale)), max(1, round(pose.height * scale))), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    frame.alpha_composite(pose, ((64 - pose.width) // 2, 63 - pose.height))
    return frame


def apply_boss_sources_v1():
    """Cut AI-approved boss/enemy source art into 64x64 combat sheets.

    Enemy rendering mirrors source frames at draw time, so source poses face right.
    """
    bosses = {
        "shanzeiwang": ("previews/boss-shanzeiwang-source-v1.png", "green"),
        "youlinguiying": ("previews/boss-youlinguiying-source-v1.png", "magenta"),
        "qingchengnitu": ("previews/boss-qingchengnitu-source-v1.png", "green"),
        "xuedaolaozu": ("previews/boss-xuedaolaozu-source-v1.png", "green"),
        "tianmojiaozhu": ("previews/boss-tianmojiaozhu-source-v1.png", "green"),
    }
    boss_specs = {"idle": 4, "attack": 6}
    for bid, (rel, key) in bosses.items():
        sample = ROOT / rel
        if not sample.exists():
            continue
        src = Image.open(sample).convert("RGBA")
        pose = boss_pose(src, (40, 35, src.width - 30, src.height - 20), key=key, max_size=62)
        for action, frames in boss_specs.items():
            save(make_combat_sheet(pose, action, frames), f"characters/bosses/{bid}/{action}.png")

    enemies = {
        "xie_jiao": ("previews/enemy-xie_jiao-source-v1.png", "green"),
        "mo_jiao": ("previews/enemy-mo_jiao-source-v1.png", "green"),
    }
    enemy_specs = {"idle": 4, "attack": 6, "hurt": 3, "death": 4}
    for eid, (rel, key) in enemies.items():
        sample = ROOT / rel
        if not sample.exists():
            continue
        src = Image.open(sample).convert("RGBA")
        pose = boss_pose(src, (40, 35, src.width - 30, src.height - 20), key=key, max_size=58)
        for action, frames in enemy_specs.items():
            save(make_combat_sheet(pose, action, frames), f"characters/enemies/{eid}/{action}.png")


def apply_home_decor_source_v1():
    sample = ROOT / "previews/home-decor-source-v1.png"
    if not sample.exists():
        return
    src = Image.open(sample).convert("RGBA")
    crops = {
        "furniture/decor/decor_screen.png": (30, 48, 335, 322),
        "furniture/decor/decor_vase.png": (420, 58, 576, 320),
        "furniture/decor/decor_brush.png": (686, 45, 876, 320),
        "furniture/decor/decor_inkstone.png": (945, 98, 1195, 292),
        "furniture/decor/decor_censer.png": (40, 385, 278, 606),
        "furniture/decor/decor_teaset.png": (355, 400, 594, 586),
        "furniture/decor/decor_weiqi.png": (650, 394, 865, 590),
        "furniture/decor/decor_guqin.png": (956, 394, 1205, 558),
        "furniture/decor/decor_bonsai.png": (30, 640, 315, 884),
        "furniture/decor/decor_candle.png": (430, 630, 552, 882),
        "furniture/decor/decor_books.png": (655, 660, 870, 842),
        "furniture/decor/decor_wine.png": (984, 650, 1164, 854),
        "furniture/decor/decor_ruyi.png": (42, 936, 298, 1185),
        "furniture/wallhang/wall_scroll_right.png": (370, 905, 610, 1218),
        "furniture/wallhang/wall_lantern_right.png": (704, 910, 856, 1188),
        "furniture/wallhang/wall_mirror_right.png": (948, 910, 1224, 1185),
    }
    for rel, box in crops.items():
        img = cut_chroma_to_alpha(src.crop(box), pad=12)
        save(img, rel)
        if rel.endswith("_right.png"):
            save(ImageOps.mirror(img), rel.replace("_right.png", "_left.png"))

    scroll = cut_chroma_to_alpha(src.crop((370, 905, 610, 1218)), pad=0)
    landscape = ImageOps.fit(scroll, (220, 138), method=Image.Resampling.LANCZOS, centering=(0.5, 0.55))
    framed = Image.new("RGBA", (244, 162), (0, 0, 0, 0))
    d = ImageDraw.Draw(framed)
    d.rectangle((6, 6, 237, 155), fill=(116, 72, 38, 255), outline=(58, 36, 22, 255), width=4)
    framed.alpha_composite(landscape, (12, 12))
    save(framed, "furniture/wallhang/wall_landscape_right.png")
    save(ImageOps.mirror(framed), "furniture/wallhang/wall_landscape_left.png")

    sheet2 = ROOT / "previews/home-asset-sheet-v2.png"
    if sheet2.exists():
        src2 = Image.open(sheet2).convert("RGBA")
        weapon = cut_chroma_to_alpha(src2.crop((840, 552, 1120, 735)), pad=12)
        save(weapon, "furniture/wallhang/wall_weapon_right.png")
        save(ImageOps.mirror(weapon), "furniture/wallhang/wall_weapon_left.png")
        save(weapon, "furniture/wallhang/wall_swordrack_right.png")
        save(ImageOps.mirror(weapon), "furniture/wallhang/wall_swordrack_left.png")
        rug = cut_chroma_to_alpha(src2.crop((360, 770, 730, 958)), pad=4)
        cushion = ImageOps.fit(rug, (132, 90), method=Image.Resampling.LANCZOS)
        save(cushion, "furniture/chair/chair_cushion.png")


def apply_storage_proposals_v1():
    sample = ROOT / "previews/home-asset-sheet-v2.png"
    if not sample.exists():
        return
    src = Image.open(sample).convert("RGBA")
    crops = {
        "furniture/storage/storage_wardrobe.png": (850, 280, 1115, 535),
        "furniture/storage/storage_shelf.png": (1190, 275, 1475, 545),
        "furniture/storage/storage_chest.png": (55, 552, 342, 728),
        "furniture/storage/storage_medicine_cabinet.png": (455, 548, 705, 748),
        "furniture/decor/decor_food_box.png": (870, 810, 1105, 988),
        "furniture/decor/decor_wash_basin.png": (1205, 765, 1455, 988),
        "furniture/decor/decor_floor_lamp.png": (1200, 532, 1375, 770),
        "furniture/decor/decor_rug_large.png": (360, 770, 730, 958),
    }
    for rel, box in crops.items():
        img = cut_chroma_to_alpha(src.crop(box), pad=16)
        save(img, rel)


def actor_layout(action, frame, direction):
    phase = math.sin(frame * math.pi / 2)
    bob = int(phase * (1 if action == "idle" else 2))
    step = 3 if action == "walk" and frame % 2 else -2
    if action == "sleep":
        return {"pose": "sleep", "head": (16, 39), "body": (27, 39), "feet": (30, 51), "bob": 0, "step": 0}
    if action == "meditate":
        return {"pose": "meditate", "head": (24, 18 + bob), "body": (24, 39 + bob), "feet": (24, 57), "bob": bob, "step": 0}
    return {"pose": "stand", "head": (24, 16 + bob), "body": (24, 35 + bob), "feet": (24, 59), "bob": bob, "step": step}


def draw_home_actor(d, x, y, action, frame, direction, layer="base", variant=None):
    p = actor_layout(action, frame, direction)
    pose = p["pose"]
    hx, hy = x + p["head"][0], y + p["head"][1]
    bx, by = x + p["body"][0], y + p["body"][1]
    skin = (204, 151, 100, 255)
    hair = (30, 25, 23, 255)

    if layer == "base":
        if pose == "stand":
            d.ellipse((x + 12, y + 55, x + 36, y + 62), fill=(0, 0, 0, 70))
            d.line((x + 20, y + 43 + p["bob"], x + 18 + p["step"], y + 58), fill=(27, 31, 38, 255), width=4)
            d.line((x + 28, y + 43 + p["bob"], x + 30 - p["step"], y + 58), fill=(27, 31, 38, 255), width=4)
            d.polygon([(bx - 9, by - 12), (bx + 8, by - 12), (bx + 12, by + 12), (bx, by + 18), (bx - 12, by + 12)], fill=(38, 78, 112, 255))
            d.line((bx, by - 11, bx - 4, by + 13), fill=(194, 154, 88, 255), width=1)
            d.line((bx + 1, by - 11, bx + 8, by + 10), fill=(23, 53, 80, 255), width=1)
            swing = p["step"] if action == "walk" else 0
            d.line((bx - 10, by - 7, bx - 17 - swing, by + 6), fill=(34, 64, 96, 255), width=4)
            d.line((bx + 10, by - 7, bx + 17 + swing, by + 6), fill=(34, 64, 96, 255), width=4)
            d.ellipse((hx - 8, hy - 8, hx + 8, hy + 9), fill=skin)
            if direction == "up":
                d.rectangle((hx - 9, hy - 9, hx + 9, hy + 7), fill=hair)
            else:
                d.rectangle((hx - 8, hy - 10, hx + 8, hy - 3), fill=hair)
                d.rectangle((hx - 3, hy - 15, hx + 2, hy - 9), fill=hair)
                d.point((hx - 4, hy + 1), fill=(40, 28, 22, 255))
                d.point((hx + 4, hy + 1), fill=(40, 28, 22, 255))
        elif pose == "sleep":
            d.ellipse((x + 10, y + 45, x + 42, y + 57), fill=(0, 0, 0, 65))
            d.ellipse((x + 9, y + 33, x + 25, y + 48), fill=skin)
            d.rectangle((x + 20, y + 31, x + 43, y + 44), fill=(38, 78, 112, 255))
            d.line((x + 29, y + 31, x + 41, y + 22), fill=(232, 226, 196, 180), width=1)
        else:
            d.ellipse((x + 10, y + 52, x + 38, y + 61), fill=(0, 0, 0, 65))
            d.ellipse((hx - 8, hy - 8, hx + 8, hy + 9), fill=skin)
            d.rectangle((hx - 8, hy - 10, hx + 8, hy - 3), fill=hair)
            d.polygon([(bx - 8, by - 10), (bx + 8, by - 10), (bx + 10, by + 8), (bx - 10, by + 8)], fill=(38, 78, 112, 255))
            d.arc((x + 6, y + 39, x + 42, y + 62), 185, 355, fill=(25, 31, 40, 255), width=5)
            d.ellipse((x + 14, y + 42, x + 34, y + 58), outline=(186, 156, 86, 185), width=1)
        return

    if pose == "stand":
        if layer == "body":
            col = (214, 199, 164, 255) if variant == "body_cloth" else (98, 58, 43, 255)
            trim = (72, 96, 120, 255) if variant == "body_cloth" else (183, 84, 62, 255)
            d.polygon([(bx - 10, by - 11), (bx + 10, by - 11), (bx + 12, by + 12), (bx, by + 18), (bx - 12, by + 12)], fill=col)
            d.line((bx - 7, by - 5, bx + 7, by + 8), fill=trim, width=2)
            if variant == "body_softarmor":
                for yy in range(by - 6, by + 10, 5):
                    d.line((bx - 8, yy, bx + 8, yy), fill=(132, 83, 56, 220), width=1)
        elif layer == "legs":
            col = (205, 192, 166, 255) if variant == "legs_cloth" else (92, 76, 65, 255)
            d.line((x + 20, y + 43 + p["bob"], x + 18 + p["step"], y + 58), fill=col, width=5)
            d.line((x + 28, y + 43 + p["bob"], x + 30 - p["step"], y + 58), fill=col, width=5)
            if variant == "legs_guard":
                d.rectangle((x + 15 + p["step"], y + 51, x + 21 + p["step"], y + 58), fill=(116, 109, 98, 255))
                d.rectangle((x + 27 - p["step"], y + 51, x + 33 - p["step"], y + 58), fill=(116, 109, 98, 255))
        elif layer == "head":
            if variant == "head_cloth":
                d.rectangle((hx - 9, hy - 8, hx + 9, hy - 3), fill=(212, 198, 166, 255))
                d.line((hx + 7, hy - 4, hx + 14, hy + 3), fill=(178, 154, 118, 255), width=2)
            else:
                d.pieslice((hx - 10, hy - 11, hx + 10, hy + 6), 180, 360, fill=(126, 120, 112, 255), outline=(54, 48, 42, 255))
                d.rectangle((hx - 9, hy - 3, hx + 9, hy + 3), fill=(92, 84, 76, 255))
        elif layer == "weapon":
            steel = (214, 218, 210, 255)
            grip = (88, 56, 35, 255)
            if direction == "left":
                pts = (bx - 16, by - 2, bx - 30, by - 14)
            elif direction == "right":
                pts = (bx + 16, by - 2, bx + 30, by - 14)
            elif direction == "up":
                pts = (bx + 10, by - 5, bx + 22, by - 18)
            else:
                pts = (bx + 12, by - 2, bx + 26, by + 6)
            d.line(pts, fill=steel, width=3 if variant == "wpn_iron_sword" else 4)
            d.line((pts[0], pts[1], pts[0] - 5 if pts[2] < pts[0] else pts[0] + 5, pts[1] + 5), fill=grip, width=3)
    elif pose == "sleep":
        if layer == "body":
            d.rectangle((x + 20, y + 31, x + 43, y + 44), fill=(214, 199, 164, 255) if variant == "body_cloth" else (98, 58, 43, 255))
        elif layer == "head":
            d.rectangle((x + 9, y + 33, x + 25, y + 38), fill=(212, 198, 166, 255) if variant == "head_cloth" else (126, 120, 112, 255))
        elif layer == "legs":
            d.rectangle((x + 31, y + 41, x + 43, y + 48), fill=(205, 192, 166, 255) if variant == "legs_cloth" else (92, 76, 65, 255))
    elif pose == "meditate":
        if layer == "body":
            d.polygon([(bx - 9, by - 9), (bx + 9, by - 9), (bx + 11, by + 8), (bx - 11, by + 8)], fill=(214, 199, 164, 255) if variant == "body_cloth" else (98, 58, 43, 255))
        elif layer == "head":
            d.rectangle((hx - 9, hy - 8, hx + 9, hy - 3), fill=(212, 198, 166, 255) if variant == "head_cloth" else (126, 120, 112, 255))
        elif layer == "legs":
            d.arc((x + 6, y + 39, x + 42, y + 62), 185, 355, fill=(205, 192, 166, 255) if variant == "legs_cloth" else (92, 76, 65, 255), width=5)


def make_actor_sheet(layer="base", variant=None):
    actions = [("idle", 4, 4), ("walk", 8, 4), ("sleep", 4, 1), ("meditate", 4, 1)]
    dirs = ["down", "left", "right", "up"]
    sheets = {}
    for action, frames, rows in actions:
        img = Image.new("RGBA", (48 * frames, 64 * rows), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for r in range(rows):
            direction = dirs[r] if rows == 4 else "down"
            for f in range(frames):
                draw_home_actor(d, f * 48, r * 64, action, f, direction, layer, variant)
        sheets[action] = img
    return sheets


def apply_home_actor_layers_v1():
    base = make_actor_sheet("base")
    for action, img in base.items():
        save(img, f"characters/protagonist/{action}.png")
    overlay_specs = {
        "head_cloth": "head",
        "head_iron": "head",
        "body_cloth": "body",
        "body_softarmor": "body",
        "legs_cloth": "legs",
        "legs_guard": "legs",
        "wpn_iron_sword": "weapon",
        "wpn_steel_saber": "weapon",
    }
    for tid, layer in overlay_specs.items():
        sheets = make_actor_sheet(layer, tid)
        for action, img in sheets.items():
            save(img, f"characters/equip/{tid}/{action}.png")


def apply_bed_table_replacement_v2():
    """Replace broken generated bed/table sources with complete lower/front silhouettes."""
    sample = ROOT / "previews/bed-table-replacement-v2-source.png"
    if not sample.exists():
        return
    src = Image.open(sample).convert("RGBA")
    replacements = {
        "furniture/bed/bed_basic.png": (42, 115, 790, 820),
        "furniture/table/table_square.png": (810, 180, 1452, 805),
    }
    for rel, box in replacements.items():
        img = cut_chroma_to_alpha(src.crop(box), pad=24)
        if rel == "furniture/bed/bed_basic.png":
            img = ImageOps.mirror(img)
        save(img, rel)


def apply_meditation_dais_replacement_v2():
    """Replace broken meditation dais source with a complete platform silhouette."""
    sample = ROOT / "previews/meditation-dais-replacement-v2-source.png"
    if not sample.exists():
        return
    src = Image.open(sample).convert("RGBA")
    img = cut_chroma_to_alpha(src.crop((215, 95, 1325, 905)), pad=24)
    save(img, "furniture/func/meditation_dais.png")


def main():
    environment_assets()
    furniture()
    protagonist_home()
    combat_assets()
    ui_assets()
    refine_priority_assets()
    apply_approved_style_sample()
    apply_home_asset_sheet_v2()
    apply_equipment_icon_sheet_v1()
    apply_combat_sources_v1()
    apply_boss_sources_v1()
    apply_home_decor_source_v1()
    apply_storage_proposals_v1()
    apply_home_actor_layers_v1()
    apply_bed_table_replacement_v2()
    apply_meditation_dais_replacement_v2()


if __name__ == "__main__":
    main()
