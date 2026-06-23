# Godot GUI 第一包资产说明

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
