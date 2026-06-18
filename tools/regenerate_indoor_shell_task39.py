#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "tiles" / "indoor"


def line(draw, pts, fill, width=1):
    draw.line([(round(x), round(y)) for x, y in pts], fill=fill, width=width)


def diamond(cx, cy, hw, hh):
    return [(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)]


def draw_floor_tile():
    im = Image.new("RGBA", (96, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    outer = diamond(48, 24, 48, 24)
    draw.polygon(outer, fill=(142, 103, 62, 255))

    # Four-by-four isometric board groups, kept quiet so furniture remains primary.
    for y in range(4):
        for x in range(4):
            cx = 12 + (x - y) * 12 + 48
            cy = 6 + (x + y) * 6
            pts = diamond(cx, cy, 12, 6)
            shade = (x * 17 + y * 29) % 5
            base = (148 + shade * 3, 109 + shade * 2, 68 + shade, 255)
            draw.polygon(pts, fill=base)
            draw.polygon([(cx, cy), (cx + 12, cy), (cx, cy + 6), (cx - 12, cy)], fill=(128, 88, 52, 16))
            draw.polygon([(cx, cy - 6), (cx + 12, cy), (cx, cy), (cx - 12, cy)], fill=(186, 145, 94, 12))

            grain = (x * 5 + y * 7) % 3
            line(draw, [(cx - 7, cy - 1 + grain), (cx + 4, cy + 4 + grain)], (96, 61, 34, 28), 1)
            if (x + y) % 2 == 0:
                line(draw, [(cx - 3, cy - 4), (cx + 8, cy + 1)], (213, 171, 112, 18), 1)

    for t in range(1, 4):
        line(draw, [(48 - t * 12, 24 - t * 6), (48 + (4 - t) * 12, 24 + (4 - t) * 6)], (83, 52, 30, 38), 1)
        line(draw, [(48 + t * 12, 24 - t * 6), (48 - (4 - t) * 12, 24 + (4 - t) * 6)], (83, 52, 30, 38), 1)
    draw.line(outer + [outer[0]], fill=(74, 45, 25, 92), width=1)
    return im


def draw_wall_texture(side):
    im = Image.new("RGBA", (256, 176), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    base = (126, 101, 73, 255) if side == "right" else (112, 91, 67, 255)
    draw.rectangle((0, 0, 255, 175), fill=base)

    # Muted plaster panels with dark lower wainscot; this file is a source texture
    # and a fallback if old code paths ever draw the image directly.
    for y in range(0, 132, 22):
        fill = tuple(min(255, c + (6 if (y // 22) % 2 else 0)) for c in base[:3]) + (255,)
        draw.rectangle((0, y, 255, y + 21), fill=fill)
        line(draw, [(0, y + 21), (255, y + 21)], (72, 52, 35, 95), 1)

    for x in range(0, 257, 32):
        line(draw, [(x, 0), (x, 132)], (75, 54, 36, 78), 1)
        if x + 1 < 256:
            line(draw, [(x + 1, 0), (x + 1, 132)], (169, 137, 96, 34), 1)

    draw.rectangle((0, 132, 255, 175), fill=(92, 64, 39, 255))
    for x in range(-18, 276, 28):
        line(draw, [(x, 175), (x + 16, 132)], (132, 91, 53, 135), 1)
    line(draw, [(0, 132), (255, 132)], (186, 139, 82, 120), 2)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw_floor_tile().save(OUT / "floor_large.png")
    draw_wall_texture("right").save(OUT / "wall_right.png")
    draw_wall_texture("left").save(OUT / "wall_left.png")


if __name__ == "__main__":
    main()
