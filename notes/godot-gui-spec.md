# Godot UI 接图规格（第一包：基础 GUI + 条形控件）

> 给 @吴冠中 出 GUI 第一包用；@马奈 按此在 1366×768 验读性/越界。
> 工程接入方式 = Godot 4 Theme（StyleBoxTexture 九宫格 / TextureProgressBar / 自绘 tooltip）。
> **基准分辨率 = 左下角面板盒子 @1080p ≈ 960×670**。资产按此参考像素出图；盒子随分辨率缩放
> （1366×768≈683×476 / 2560×1440≈980×860），**小盒子靠滚动、大盒子留边距，资产本身固定像素不拉伸字号**。

## 目录 / 命名（放 `godot/assets/ui/`）
```
gui/panel_normal.png      普通管理面板背景(九宫格)
gui/panel_emphasis.png    强调面板/标题栏(九宫格)
gui/tooltip_box.png       hover/对比浮层底(九宫格)
gui/btn_normal.png  btn_hover.png  btn_pressed.png  btn_disabled.png  btn_selected.png  (九宫格)
gui/btn_boss.png  btn_boss_hover.png   Boss挑战强调态(九宫格)
gui/slot_empty.png  slot_avail.png  slot_active.png  slot_locked.png   装备/功法/技能槽(九宫格)
gui/quality_common.png ...fine ...superior ...epic ...legend             品质边框(九宫格,叠槽位上层)
gui/bar_bg.png      bar_fill_hp.png  bar_fill_mana.png  bar_fill_exp.png  bar_fill_prof.png
```
> 九宫格的请在文件名旁注明 4 边可拉伸边距（上/下/左/右 px），我配 `texture_margin_*`。
> 第二批（图标 skill_<id>/book_<id>/装备图标/外观层）等本包接稳后再出，避免槽位尺寸返工。

## 尺寸规格（@1080p 参考像素）
| 控件 | 尺寸 | 接入 | 备注 |
|---|---|---|---|
| 管理面板九宫格 | 任意，九宫格拉伸 | StyleBoxTexture | 内边距建议 内12 / 角16 px |
| 标题栏 | 高 36 px | panel_emphasis | 标题字 18px + ✕关闭按钮 |
| 按钮(菜单/通用) | 高 28–34 px，宽自适应 | Button theme | 全状态 normal/hover/pressed/disabled/selected |
| Boss 挑战按钮 | 高 34 px | btn_boss | 高优先强调态(暖金/醒目) |
| 槽位(装备/功法) | 56×56 px | slot_* + quality_* | 品质边框同尺寸外扩 2px 叠上层 |
| 技能树节点 | 140×86 px(现 SK_CW/CH) | slot_* | 节点底用 slot 皮肤 |
| 条·HP/内力 | 高 6 px | TextureProgressBar | bar_bg + bar_fill_hp / _mana |
| 条·经验/熟练度 | 高 8 px | TextureProgressBar | bar_bg + bar_fill_exp / _prof |
| 顶栏状态条 | 高 4–5 px | 同上,更细 | 横条顶栏用 |
| tooltip/对比框 | 最大宽 300 px | tooltip_box | 安全边距距盒边 ≥8px，靠右/下自动翻转(工程做) |

## 条形控件填充规则
- 四类条（HP / 内力 / 经验 / 熟练度）**共用 `bar_bg` 底板**，仅 `bar_fill_*` 颜色不同。
- 填充=水平方向从左拉伸（九宫格左右段固定、中段拉伸），按 value/max。
- 高度按上表固定，不随盒子缩放（保可读）。

## tooltip / 对比框 段落层级（工程按此排版，吴冠中定皮肤）
1. **标题**：装备/功法名（品质色）
2. **属性行**：本件属性（ATK/HP/DEF/暴击…）
3. **增减值**：对比当前装备的差（绿 `+N` / 红 `-N`），含战力Δ
4. **需求**：等级 / 职业（不满足标红）
5. **套装 / 全身门槛**：激活段（命中件数/门槛提示）

## 按钮状态语义（吴冠中出全态）
- normal / hover / pressed / disabled / **selected**（tab 当前页、已选槽、当前修炼功法）
- Boss 挑战 = 单独强调态（normal + hover）

## QA 硬约束（马奈）
1. **1366×768 是硬下限**（盒子≈683×476）：此尺寸下按钮28–34/槽56/tooltip300 会很紧 → 列表/技能树/功法区**滚动必须顺手**；tooltip 触边换边后**不得盖住当前 hover 项或关键按钮**（工程做换边/限界）。
2. **九宫格边框别太厚**：古风厚边在小面板里吃内容面积。第一包资产请在规格里标明**「推荐最小内容内边距」**；QA 会看边框是否压缩可用信息区。
3. 字号/槽位**不缩**，小盒子靠滚动解决（不为塞内容把字缩到不可读）。

---
**工程承诺**：吴冠中按此出第一包后，我把 Theme（StyleBoxTexture/TextureProgressBar）一次性接好，tooltip 换边/限界逻辑随 hover 对比一起实装；多分辨率验收用 Windows 实机/带显示器编辑器截图（不在 headless 硬凑废图）。
