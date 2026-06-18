#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]


def rgba(hex_color, alpha=255):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def mix(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def gradient_color(lum, shadow, mid, high):
    if lum < 0.48:
        return mix(shadow, mid, lum / 0.48)
    return mix(mid, high, (lum - 0.48) / 0.52)


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


def split_sheet(path):
    im = Image.open(ROOT / path).convert("RGBA")
    fw = im.height
    return [im.crop((i * fw, 0, (i + 1) * fw, fw)) for i in range(im.width // fw)]


def join_sheet(frames):
    fw = frames[0].height
    out = Image.new("RGBA", (fw * len(frames), fw), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.alpha_composite(strip_edge_alpha(fr), (i * fw, 0))
    return out


def recolor(frame, shadow, mid, high, accent=None, strength=0.82):
    shadow, mid, high = shadow[:3], mid[:3], high[:3]
    accent = accent[:3] if accent else high
    out = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    src = frame.load()
    dst = out.load()
    for y in range(frame.height):
        for x in range(frame.width):
            r, g, b, a = src[x, y]
            if a == 0:
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            nr, ng, nb = gradient_color(lum, shadow, mid, high)
            if r > g * 1.12 and r > b * 1.12:
                nr, ng, nb = mix((nr, ng, nb), accent, 0.45)
            dst[x, y] = (
                int(r * (1 - strength) + nr * strength),
                int(g * (1 - strength) + ng * strength),
                int(b * (1 - strength) + nb * strength),
                a,
            )
    return out


def alpha_glow(frame, color, radius=2, strength=95):
    mask = frame.getchannel("A").filter(ImageFilter.MaxFilter(radius * 2 + 1)).filter(ImageFilter.GaussianBlur(radius))
    glow = Image.new("RGBA", frame.size, color[:3] + (0,))
    glow.putalpha(mask.point(lambda v: min(strength, v // 2)))
    out = Image.alpha_composite(glow, frame)
    return out


def draw_enemy_marks(fr, theme, attack_phase=0):
    d = ImageDraw.Draw(fr)
    w = fr.width
    s = w / 64
    def p(x, y): return (int(x * s), int(y * s))
    if theme == "gui_zu":
        d.ellipse([*p(23, 7), *p(42, 20)], outline=rgba("#baf7e8", 175), width=max(1, int(1 * s)))
        d.line([p(31, 16), p(29, 43)], fill=rgba("#78e6cb", 150), width=max(1, int(1 * s)))
        for dx in (18, 46):
            d.arc([*p(dx - 8, 29), *p(dx + 8, 55)], 70, 270, fill=rgba("#76dfc2", 125), width=max(1, int(1 * s)))
    elif theme == "yao_xiu":
        d.polygon([p(27, 12), p(31, 5), p(34, 13)], fill=rgba("#f2d18d", 230))
        d.polygon([p(35, 12), p(39, 5), p(42, 13)], fill=rgba("#f2d18d", 230))
        d.arc([*p(19, 31), *p(49, 61)], 205, 345, fill=rgba("#ff5f86", 165), width=max(2, int(2 * s)))
        d.line([p(43, 19), p(55, 32 + attack_phase)], fill=rgba("#ffb0c4", 190), width=max(1, int(1 * s)))
    elif theme == "mo_jiang":
        d.polygon([p(20, 24), p(13, 19), p(21, 31)], fill=rgba("#7d8aa0", 235))
        d.polygon([p(43, 23), p(51, 17), p(44, 32)], fill=rgba("#7d8aa0", 235))
        d.rectangle([*p(27, 18), *p(39, 24)], outline=rgba("#d8bfd1", 210), width=max(1, int(1 * s)))
        d.line([p(45, 15), p(58, 7 + attack_phase)], fill=rgba("#b7c5df", 215), width=max(2, int(2 * s)))
    elif theme == "gu_mo":
        d.polygon([p(28, 11), p(32, 4), p(36, 11), p(34, 16), p(30, 16)], fill=rgba("#e5c263", 235))
        d.arc([*p(12, 21), *p(52, 58)], 190, 350, fill=rgba("#8962ff", 140), width=max(2, int(2 * s)))
        d.line([p(18, 48), p(12, 60)], fill=rgba("#caa856", 155), width=max(1, int(1 * s)))
        d.line([p(48, 47), p(54, 60)], fill=rgba("#caa856", 155), width=max(1, int(1 * s)))
    return fr


def shift(frame, dx=0, dy=0):
    out = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    out.alpha_composite(frame, (dx, dy))
    return out


ENEMIES = {
    "gui_zu": {
        "base": "assets/characters/enemies/xie_jiao",
        "palette": ("#071315", "#1f7468", "#bcfff1", "#78e6cb"),
        "glow": "#58e1c7",
    },
    "yao_xiu": {
        "base": "assets/characters/enemies/sect_novice",
        "palette": ("#1b0710", "#7a1645", "#ffd0a3", "#ff5f86"),
        "glow": "#ff4b83",
    },
    "mo_jiang": {
        "base": "assets/characters/enemies/mo_jiao",
        "palette": ("#080911", "#30324b", "#c7d0df", "#7e67ff"),
        "glow": "#7566ff",
    },
    "gu_mo": {
        "base": "assets/characters/enemies/xie_jiao",
        "palette": ("#09070d", "#352345", "#e5c263", "#8962ff"),
        "glow": "#8564ff",
    },
}


BOSSES = {
    "huangquanguiwang": {
        "base": "assets/characters/bosses/youlinguiying",
        "palette": ("#061113", "#1e6860", "#c7fff3", "#58e1c7"),
        "glow": "#58e1c7",
        "theme": "ghost_king",
    },
    "luoshanvjun": {
        "base": "assets/characters/bosses/xuedaolaozu",
        "palette": ("#170510", "#82204a", "#ffd2c1", "#ff5f86"),
        "glow": "#ff4b83",
        "theme": "queen",
    },
    "yaoshouwang": {
        "base": "assets/characters/bosses/shanzeiwang",
        "palette": ("#0f1308", "#41512a", "#dcc57b", "#7ed469"),
        "glow": "#7ed469",
        "theme": "beast",
    },
    "jiuyoumozun": {
        "base": "assets/characters/bosses/tianmojiaozhu",
        "palette": ("#080611", "#32214f", "#d1c6ff", "#8868ff"),
        "glow": "#8868ff",
        "theme": "demon_lord",
    },
    "wangumoshen": {
        "base": "assets/characters/bosses/tianmojiaozhu",
        "palette": ("#03040a", "#251d3b", "#f0cc72", "#6e5cff"),
        "glow": "#6e5cff",
        "theme": "ancient_god",
    },
}


def enemy_frames(enemy_id, anim):
    cfg = ENEMIES[enemy_id]
    frames = split_sheet(f"{cfg['base']}/{anim}.png")
    out = []
    for i, fr in enumerate(frames):
        fr = recolor(fr, *[rgba(c) for c in cfg["palette"]])
        fr = alpha_glow(fr, rgba(cfg["glow"]), radius=1, strength=70)
        phase = 5 if anim == "attack" and i >= len(frames) // 2 else 0
        if enemy_id == "gu_mo":
            fr = shift(fr, 0, -2)
        out.append(draw_enemy_marks(fr, enemy_id, phase))
    return out


def upsize_to_128(fr):
    if fr.height == 128:
        return fr.copy()
    out = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    big = fr.resize((fr.width * 2, fr.height * 2), Image.Resampling.NEAREST)
    out.alpha_composite(big, ((128 - big.width) // 2, 128 - big.height - 2))
    return out


def boss_marks(fr, theme, phase=0):
    d = ImageDraw.Draw(fr)
    if theme == "ghost_king":
        d.polygon([(54, 25), (61, 10), (68, 24), (74, 12), (82, 29), (68, 33)], fill=rgba("#cafff5", 210))
        d.arc((25, 35, 105, 118), 190, 350, fill=rgba("#79ead4", 145), width=4)
        d.line((66, 30, 66, 96), fill=rgba("#baf7e8", 105), width=2)
    elif theme == "queen":
        d.polygon([(48, 29), (57, 12), (65, 29), (74, 12), (84, 30)], fill=rgba("#ffd3a6", 220))
        d.arc((32, 42, 104, 123), 210, 330, fill=rgba("#ff74a0", 170), width=5)
        d.line((83, 38, 115, 50 + phase), fill=rgba("#ffd0dc", 185), width=3)
    elif theme == "beast":
        d.polygon([(38, 39), (21, 25), (48, 49)], fill=rgba("#e3cf83", 220))
        d.polygon([(84, 38), (108, 24), (78, 50)], fill=rgba("#e3cf83", 220))
        d.arc((18, 24, 110, 118), 205, 335, fill=rgba("#a8e36d", 130), width=4)
    elif theme == "demon_lord":
        d.polygon([(45, 32), (52, 12), (62, 34)], fill=rgba("#d5c8ff", 225))
        d.polygon([(75, 32), (86, 12), (84, 38)], fill=rgba("#d5c8ff", 225))
        d.arc((21, 31, 112, 121), 198, 345, fill=rgba("#9474ff", 160), width=5)
        d.line((84, 35, 119, 18 + phase), fill=rgba("#b6a8ff", 210), width=3)
    elif theme == "ancient_god":
        d.polygon([(54, 28), (64, 8), (74, 28), (69, 39), (59, 39)], fill=rgba("#f0cc72", 235))
        d.ellipse((47, 20, 82, 55), outline=rgba("#806dff", 175), width=3)
        d.arc((12, 19, 118, 124), 185, 355, fill=rgba("#6e5cff", 175), width=6)
        d.line((21, 99, 8, 120), fill=rgba("#f0cc72", 145), width=3)
        d.line((108, 98, 121, 120), fill=rgba("#f0cc72", 145), width=3)
    return fr


def boss_frames(boss_id, anim):
    cfg = BOSSES[boss_id]
    frames = [upsize_to_128(fr) for fr in split_sheet(f"{cfg['base']}/{anim}.png")]
    out = []
    for i, fr in enumerate(frames):
        fr = recolor(fr, *[rgba(c) for c in cfg["palette"]], strength=0.88)
        fr = alpha_glow(fr, rgba(cfg["glow"]), radius=3, strength=110)
        if cfg["theme"] == "ancient_god":
            fr = alpha_glow(fr, rgba("#f0cc72"), radius=1, strength=70)
        phase = 10 if anim == "attack" and i >= len(frames) // 2 else 0
        out.append(boss_marks(fr, cfg["theme"], phase))
    return out


def save_sheet(path, frames):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    join_sheet(frames).save(p)


def make_contact():
    items = []
    for enemy_id in ENEMIES:
        items.append((enemy_id, ROOT / f"assets/characters/enemies/{enemy_id}/idle.png"))
    for boss_id in BOSSES:
        items.append((boss_id, ROOT / f"assets/characters/bosses/{boss_id}/idle.png"))
    cell_w, cell_h = 230, 180
    out = Image.new("RGBA", (cell_w * 3, cell_h * 3), (239, 235, 222, 255))
    d = ImageDraw.Draw(out)
    for idx, (name, path) in enumerate(items):
        sheet = Image.open(path).convert("RGBA")
        fw = sheet.height
        fr = sheet.crop((0, 0, fw, fw))
        scale = 2 if fw == 64 else 1
        fr = fr.resize((fw * scale, fw * scale), Image.Resampling.NEAREST)
        x = (idx % 3) * cell_w
        y = (idx // 3) * cell_h
        out.alpha_composite(fr, (x + (cell_w - fr.width) // 2, y + 18))
        d.text((x + 14, y + cell_h - 28), name, fill=(32, 28, 24, 255))
    out.save(ROOT / "preview_task40_layer6_10_characters.png")


def main():
    for enemy_id in ENEMIES:
        for anim in ("idle", "attack", "hurt", "death"):
            save_sheet(f"assets/characters/enemies/{enemy_id}/{anim}.png", enemy_frames(enemy_id, anim))
    for boss_id in BOSSES:
        for anim in ("idle", "attack"):
            save_sheet(f"assets/characters/bosses/{boss_id}/{anim}.png", boss_frames(boss_id, anim))
    make_contact()


if __name__ == "__main__":
    main()
