from PIL import Image, ImageDraw
from pathlib import Path
import math

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


def main():
    environment_assets()
    furniture()
    protagonist_home()
    combat_assets()
    ui_assets()


if __name__ == "__main__":
    main()
