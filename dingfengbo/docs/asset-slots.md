# 《定风波》生产原型 — 美术资源槽位契约 (v0.1)

> 目的：让 @马奈 的整套素材**按文件名 1:1 落进 Godot**，我不用改逻辑、不用协商命名。
> 生成→切割后按下表命名，放进 `dingfengbo/assets/`，我把占位色块换成这些 sprite 即可。

## 通用规范
- **出图**：4K 手绘感高精像素、暖亮通透、中式（锚 WalyCai 4 张概念图）。白底生成→切割→**最终交透明背景 PNG**（去白底），好叠在草地/土壤上。
- **标尺**：世界件按 **世界格 64×64px** 语义出（可高分辨率多倍，我按 linear 缩放到目标分辨率——**软边高精像素缩放用 linear 不是 nearest**，实测已焊）。主角/人物 ~128px 高(≈2格)。图标类 48×48 或 64×64。
- **命名**：全小写、类别前缀_状态/阶段。PNG。下表名即代码里要 load 的名。

## 世界件（放 assets/world/）
### 农耕 · 地块与作物
| 文件名 | 状态 | 对应事件 key |
|---|---|---|
| `soil_empty.png` | 空地 | (初始) |
| `soil_tilled.png` | 已耕(可播种) | `first_till` |
| `crop_wheat_0.png` | 小麦·播种/幼苗 | `first_plant` |
| `crop_wheat_1.png` | 小麦·发芽 | (推进) |
| `crop_wheat_2.png` | 小麦·生长 | (推进) |
| `crop_wheat_3.png` | 小麦·成熟(可收) | `crop_ripe` |
| `crop_rice_0..3.png` | 稻谷 四阶段(同上) | 同上 |
> 命名规则 `crop_<作物英文>_<阶段0..3>`，阶段 3＝可收获。先做 wheat/rice，后续作物照此扩。

### 养殖 · 畜栏
| 文件名 | 状态 | 对应事件 key |
|---|---|---|
| `chicken_idle.png` | 家禽·孵/产蛋中(未就绪) | (推进) |
| `chicken_ready.png` | 家禽·✔蛋可收 | `animal_ready` |
| `coop_1.png` / `coop_2.png` / `coop_3.png` | 畜舍等级 1/2/3 | (后续 upgrade) |

### 酿造 · 酒缸
| 文件名 | 状态 | 对应事件 key |
|---|---|---|
| `vessel_empty.png` | 空缸(可投料) | (初始) |
| `vessel_fermenting.png` | 发酵中 | `first_brew_load` |
| `vessel_done.png` | 出窖(可取酒) | `brew_ready` |

## 图标件（放 assets/icons/，48×48 或 64×64）
`icon_maizhong`(麦种) · `icon_daozhong`(稻种) · `icon_wheat`(小麦) · `icon_rice`(稻谷) · `icon_egg`(鸡蛋) · `icon_maijiu`(麦酒) · `icon_mijiu`(米酒) · `icon_gold`(金币)
> 图标名对应背包 `inv` 里的物品；新增物品同步加 `icon_<拼音/英文>`。

## 人物件（放 assets/char/，~128px 高）
`hero_idle.png`（主角站姿占位，farm_scene 里那个即可先用）。NPC 后续按角色表扩。

## 底/环境（可选）
`ground_grass.png`(草地平铺) · `path_dirt.png`(土路) — 现在用纯色占位，有了平铺件更好看。

## 交付与平替
- 你按上表命名交件 → 我把 main.gd 里对应状态的色块换成 `TextureRect/Sprite`（load 上述路径），**状态机/事件 key 全不动**。
- 缺件我用色块兜底，来一件换一件，可增量。
- 有新状态（如作物病害、土壤湿/干两态、酒的品质分级外观）先在这加一行槽位，我们对齐后你再出。
