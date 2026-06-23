#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "godot" / "assets" / "ui" / "gui"
NOTE = ROOT / "notes" / "godot-gui-first-pack.md"


COL = {
    "transparent": (0, 0, 0, 0),
    "wood_dark": (44, 25, 18, 255),
    "wood": (82, 47, 31, 255),
    "wood_light": (128, 80, 45, 255),
    "paper": (216, 184, 126, 255),
    "paper_dark": (169, 128, 77, 255),
    "paper_dim": (120, 92, 62, 255),
    "ink": (46, 31, 24, 255),
    "bronze": (184, 133, 61, 255),
    "gold": (235, 183, 74, 255),
    "gold_hi": (255, 218, 111, 255),
    "red": (154, 45, 32, 255),
    "red_hi": (214, 76, 47, 255),
    "jade": (67, 146, 108, 255),
    "jade_hi": (113, 195, 142, 255),
    "disabled": (79, 73, 66, 210),
    "black_shadow": (24, 15, 12, 180),
    "hp": (190, 47, 40, 255),
    "mana": (69, 116, 187, 255),
    "exp": (204, 152, 52, 255),
    "prof": (83, 159, 106, 255),
}

QUALITY = {
    "common": (157, 148, 126, 255),
    "fine": (82, 178, 112, 255),
    "superior": (79, 146, 217, 255),
    "epic": (176, 102, 220, 255),
    "legend": (232, 166, 56, 255),
}


def img(w, h):
    return Image.new("RGBA", (w, h), COL["transparent"])


def rect(d, xy, fill, outline=None, width=1):
    d.rectangle(xy, fill=fill, outline=outline, width=width)


def add_noise(im, box, colors, step=4):
    pix = im.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1, step):
        for x in range(x0, x1, step):
            if ((x * 17 + y * 31) % 11) < 3:
                c = colors[((x // step) + (y // step)) % len(colors)]
                for yy in range(y, min(y + 1, y1)):
                    for xx in range(x, min(x + 2, x1)):
                        pix[xx, yy] = c


def draw_corner_caps(d, w, h, c=COL["bronze"]):
    # Small metal braces that stay inside the 9-slice corner area.
    for sx, sy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        left = sx == 0
        top = sy == 0
        x0 = 4 if left else w - 20
        y0 = 4 if top else h - 20
        x1 = 20 if left else w - 5
        y1 = 20 if top else h - 5
        rect(d, (x0, y0, x1, y1), None, c, 2)
        if left and top:
            d.line([(8, 18), (8, 8), (18, 8)], fill=COL["gold"], width=1)
        elif not left and top:
            d.line([(w - 9, 18), (w - 9, 8), (w - 19, 8)], fill=COL["gold"], width=1)
        elif left and not top:
            d.line([(8, h - 19), (8, h - 9), (18, h - 9)], fill=COL["gold"], width=1)
        else:
            d.line([(w - 9, h - 19), (w - 9, h - 9), (w - 19, h - 9)], fill=COL["gold"], width=1)


def panel(name, emphasis=False, tooltip=False):
    w, h = (96, 96)
    im = img(w, h)
    d = ImageDraw.Draw(im)
    # Godot 1366x768 validation showed the first panel paper was too bright
    # when stretched across the whole management panel. Keep the wuxia paper
    # read, but move it into a calmer mid tone so text and buttons lead.
    base = (174, 137, 86, 255) if not tooltip else (67, 45, 33, 245)
    inset = (133, 99, 63, 255) if not tooltip else (103, 73, 47, 248)
    edge = COL["wood"] if not emphasis else COL["red"]
    edge_hi = COL["bronze"] if not emphasis else COL["gold"]
    rect(d, (2, 2, w - 3, h - 3), edge, COL["wood_dark"], 2)
    rect(d, (7, 7, w - 8, h - 8), base, edge_hi, 2)
    rect(d, (13, 13, w - 14, h - 14), inset, None)
    rect(d, (16, 16, w - 17, h - 17), base, None)
    noise_cols = [(184, 148, 94, 255), (151, 112, 70, 255)] if not tooltip else [(76, 52, 38, 255), (91, 63, 42, 255)]
    add_noise(im, (16, 16, w - 16, h - 16), noise_cols, 5 if tooltip else 7)
    draw_corner_caps(d, w, h, edge_hi)
    if emphasis:
        d.line([(23, 9), (w - 24, 9)], fill=COL["gold_hi"], width=1)
        d.line([(23, h - 10), (w - 24, h - 10)], fill=COL["gold_hi"], width=1)
    if tooltip:
        rect(d, (12, 12, w - 13, h - 13), None, COL["gold"], 1)
    im.save(OUT / name)


def button(name, state="normal", boss=False):
    w, h = (156, 34) if boss else (128, 34)
    im = img(w, h)
    d = ImageDraw.Draw(im)
    palettes = {
        "normal": (COL["wood"], COL["wood_light"], COL["bronze"], COL["paper_dark"]),
        "hover": ((96, 57, 34, 255), (149, 94, 47, 255), COL["gold"], COL["paper"]),
        "pressed": ((49, 28, 22, 255), (95, 52, 33, 255), COL["bronze"], COL["paper_dim"]),
        "disabled": ((59, 55, 50, 210), (83, 77, 69, 210), (110, 103, 91, 210), COL["disabled"]),
        "selected": ((42, 78, 58, 255), COL["jade"], COL["jade_hi"], (185, 219, 173, 255)),
    }
    if boss:
        palettes["normal"] = ((114, 38, 27, 255), COL["red"], COL["gold"], (255, 210, 100, 255))
        palettes["hover"] = ((143, 45, 29, 255), COL["red_hi"], COL["gold_hi"], (255, 229, 132, 255))
    base, mid, border, hi = palettes[state]
    rect(d, (1, 1, w - 2, h - 2), COL["wood_dark"], None)
    rect(d, (3, 3, w - 4, h - 4), base, border, 2)
    rect(d, (7, 7, w - 8, h - 8), mid, None)
    d.line([(10, 8), (w - 11, 8)], fill=hi, width=1)
    d.line([(10, h - 9), (w - 11, h - 9)], fill=COL["black_shadow"], width=1)
    if boss:
        d.polygon([(12, 17), (20, 10), (28, 17), (20, 24)], fill=COL["gold"])
        d.polygon([(w - 13, 17), (w - 21, 10), (w - 29, 17), (w - 21, 24)], fill=COL["gold"])
    im.save(OUT / name)


def slot(name, state="empty"):
    w = h = 56
    im = img(w, h)
    d = ImageDraw.Draw(im)
    state_cols = {
        "empty": (COL["wood_dark"], COL["paper_dim"], COL["bronze"]),
        "avail": ((43, 76, 54, 255), (116, 138, 86, 255), COL["jade_hi"]),
        "active": ((54, 62, 42, 255), (156, 121, 61, 255), COL["gold_hi"]),
        "locked": ((49, 45, 42, 220), (75, 69, 63, 220), (106, 99, 90, 230)),
    }
    edge, fill, hi = state_cols[state]
    rect(d, (1, 1, w - 2, h - 2), edge, COL["black_shadow"], 2)
    rect(d, (5, 5, w - 6, h - 6), fill, hi, 2)
    rect(d, (10, 10, w - 11, h - 11), (42, 31, 24, 115), None)
    d.line([(12, 11), (w - 13, 11)], fill=(240, 205, 126, 80), width=1)
    if state == "locked":
        d.line([(14, 14), (w - 15, h - 15)], fill=(35, 31, 28, 210), width=3)
        d.line([(w - 15, 14), (14, h - 15)], fill=(35, 31, 28, 210), width=3)
    im.save(OUT / name)


def quality(name, color):
    w = h = 60
    im = img(w, h)
    d = ImageDraw.Draw(im)
    rect(d, (1, 1, w - 2, h - 2), None, color, 3)
    rect(d, (5, 5, w - 6, h - 6), None, (255, 240, 180, 140), 1)
    for x, y in [(4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5)]:
        d.rectangle((x - 2, y - 2, x + 2, y + 2), fill=color)
    im.save(OUT / name)


def bar_bg():
    w, h = 96, 8
    im = img(w, h)
    d = ImageDraw.Draw(im)
    rect(d, (0, 0, w - 1, h - 1), (37, 26, 21, 255), COL["wood_dark"], 1)
    rect(d, (2, 2, w - 3, h - 3), (63, 43, 33, 255), None)
    im.save(OUT / "bar_bg.png")


def bar_fill(name, color):
    w, h = 96, 8
    im = img(w, h)
    d = ImageDraw.Draw(im)
    r, g, b, a = color
    rect(d, (0, 0, w - 1, h - 1), (max(r - 70, 0), max(g - 70, 0), max(b - 70, 0), a), None)
    rect(d, (1, 1, w - 2, h - 2), color, None)
    d.line([(3, 1), (w - 4, 1)], fill=(min(r + 58, 255), min(g + 58, 255), min(b + 58, 255), a), width=1)
    d.line([(3, h - 2), (w - 4, h - 2)], fill=(max(r - 55, 0), max(g - 55, 0), max(b - 55, 0), a), width=1)
    for x in range(8, w - 8, 14):
        d.line([(x, 2), (x + 4, h - 3)], fill=(255, 235, 180, 45), width=1)
    im.save(OUT / name)


def write_note():
    NOTE.write_text(
        """# Godot GUI 第一包资产说明

生成脚本：`tools/build_godot_gui_kit.py`

目录：`godot/assets/ui/gui/`

## 九宫格边距

| 文件 | 建议 texture_margin_left/right/top/bottom |
|---|---|
| `panel_normal.png` | 16 / 16 / 16 / 16 |
| `panel_emphasis.png` | 16 / 16 / 16 / 16 |
| `tooltip_box.png` | 16 / 16 / 16 / 16 |
| `btn_normal.png`, `btn_hover.png`, `btn_pressed.png`, `btn_disabled.png`, `btn_selected.png` | 12 / 12 / 10 / 10 |
| `btn_boss.png`, `btn_boss_hover.png` | 18 / 18 / 10 / 10 |
| `slot_empty.png`, `slot_avail.png`, `slot_active.png`, `slot_locked.png` | 8 / 8 / 8 / 8 |
| `quality_common.png`, `quality_fine.png`, `quality_superior.png`, `quality_epic.png`, `quality_legend.png` | 8 / 8 / 8 / 8 |

## 固定尺寸

- 面板 / tooltip：96 x 96，StyleBoxTexture 拉伸。
- 通用按钮：128 x 34，Boss 按钮：156 x 34。
- 槽位：56 x 56。
- 品质框：60 x 60，用于叠在 56 x 56 槽位外层，四边各外扩 2px。
- 条形控件：`bar_bg` 与全部 `bar_fill_*` 为 96 x 8。HP/内力用 6px 高时可在 TextureProgressBar 中裁或压到 6px；经验/熟练度直接 8px；顶栏状态条压到 4-5px。

## 推荐最小内容内边距

- `panel_normal`：内容内边距 10-12px。1366×768 小盒子优先用滚动，不再在 Theme 外额外叠厚边距。
- `panel_emphasis`：标题栏左右内容内边距 12px，上下 6px；标题栏总高按 36px 控制。
- `tooltip_box`：内容内边距 10px；tooltip 外侧距左下角面板盒边至少 8px，由工程做换边/限界。
- 按钮：文字/图标左右内容内边距 12px；Boss 按钮左右 18px，避免金色端饰压文字。
- 槽位：图标安全区建议 44×44px，保留槽内 6px 边距；品质框叠外层不吃图标区。

## Tooltip / 对比框排版

最大宽 300px，距左下角面板盒边至少 8px，由工程做换边和限界。段落顺序：

1. 标题：装备/功法名，使用品质色。
2. 属性行：本件属性。
3. 增减值：绿色正值、红色负值，包含战力差。
4. 需求：等级 / 职业，不满足标红。
5. 套装 / 全身门槛：命中件数和激活提示。

## 颜色语义

- HP：红；内力：蓝；经验：金；熟练度：青绿。
- 品质：common 灰、fine 绿、superior 蓝、epic 紫、legend 金。
- Boss 挑战按钮使用红木 + 金边，hover 更亮。
""",
        encoding="utf-8",
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    panel("panel_normal.png")
    panel("panel_emphasis.png", emphasis=True)
    panel("tooltip_box.png", tooltip=True)
    for state in ["normal", "hover", "pressed", "disabled", "selected"]:
        button(f"btn_{state}.png", state=state)
    button("btn_boss.png", "normal", boss=True)
    button("btn_boss_hover.png", "hover", boss=True)
    for state in ["empty", "avail", "active", "locked"]:
        slot(f"slot_{state}.png", state)
    for name, color in QUALITY.items():
        quality(f"quality_{name}.png", color)
    bar_bg()
    bar_fill("bar_fill_hp.png", COL["hp"])
    bar_fill("bar_fill_mana.png", COL["mana"])
    bar_fill("bar_fill_exp.png", COL["exp"])
    bar_fill("bar_fill_prof.png", COL["prof"])
    write_note()


if __name__ == "__main__":
    main()
