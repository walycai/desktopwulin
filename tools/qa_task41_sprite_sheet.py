#!/usr/bin/env python3
import argparse
from pathlib import Path
from PIL import Image, ImageDraw


ANIMS = ["idle", "attack", "hurt", "death"]


def components(alpha, threshold=8):
    w, h = alpha.size
    pix = alpha.load()
    seen = set()
    comps = []
    for y in range(h):
        for x in range(w):
            if pix[x, y] <= threshold or (x, y) in seen:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            xs = []
            ys = []
            while stack:
                px, py = stack.pop()
                xs.append(px)
                ys.append(py)
                for nx in (px - 1, px, px + 1):
                    for ny in (py - 1, py, py + 1):
                        if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in seen:
                            continue
                        if pix[nx, ny] > threshold:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            comps.append({"area": len(xs), "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1)})
    comps.sort(key=lambda c: c["area"], reverse=True)
    return comps


def edge_alpha(alpha):
    w, h = alpha.size
    vals = [alpha.getpixel((x, 0)) for x in range(w)]
    vals += [alpha.getpixel((x, h - 1)) for x in range(w)]
    vals += [alpha.getpixel((0, y)) for y in range(h)]
    vals += [alpha.getpixel((w - 1, y)) for y in range(h)]
    return max(vals) if vals else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="Directory containing idle/attack/hurt/death PNG sheets")
    ap.add_argument("--out", required=True, help="Output 2x preview PNG")
    ap.add_argument("--max-small-components", type=int, default=1)
    ap.add_argument("--small-area", type=int, default=18)
    args = ap.parse_args()

    root = Path(args.dir)
    sheets = []
    max_frames = 0
    problems = []
    report = []
    for anim in ANIMS:
        p = root / f"{anim}.png"
        if not p.exists():
            problems.append(f"missing {p}")
            continue
        im = Image.open(p).convert("RGBA")
        if im.height <= 0 or im.width % im.height:
            problems.append(f"bad sheet dimensions {p}: {im.size}")
            continue
        fw = im.height
        frames = []
        for i in range(im.width // fw):
            fr = im.crop((i * fw, 0, (i + 1) * fw, fw))
            alpha = fr.getchannel("A")
            comps = components(alpha)
            small = [c for c in comps[1:] if c["area"] <= args.small_area]
            if not alpha.getbbox():
                problems.append(f"blank frame {p}#{i}")
            if edge_alpha(alpha):
                problems.append(f"edge alpha {p}#{i}: {edge_alpha(alpha)}")
            if len(small) > args.max_small_components:
                problems.append(f"loose fragments {p}#{i}: {len(small)} small components")
            report.append(f"{anim}#{i}: comps={len(comps)} small={len(small)} bbox={alpha.getbbox()}")
            frames.append(fr)
        sheets.append((anim, frames))
        max_frames = max(max_frames, len(frames))

    cell = 148
    label_w = 88
    out = Image.new("RGBA", (label_w + cell * max(1, max_frames), cell * len(sheets)), (238, 235, 224, 255))
    draw = ImageDraw.Draw(out)
    for row, (anim, frames) in enumerate(sheets):
        y = row * cell
        draw.text((8, y + 58), anim, fill=(25, 22, 18, 255))
        for i, fr in enumerate(frames):
            fr2 = fr.resize((fr.width * 2, fr.height * 2), Image.Resampling.NEAREST)
            out.alpha_composite(fr2, (label_w + i * cell + 10, y + 10))
            draw.text((label_w + i * cell + 10, y + 136), str(i), fill=(25, 22, 18, 255))
    out.save(args.out)

    print("problems", len(problems))
    for p in problems:
        print(p)
    for line in report:
        print(line)


if __name__ == "__main__":
    main()
