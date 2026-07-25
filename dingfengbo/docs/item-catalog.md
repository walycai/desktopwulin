# 《定风波》物品图鉴清单（三方共用：马奈切割 / 雅各布config / 莱布尼茨数值）

> 来源：WalyCai「素材候选3」4K 硬像素图鉴。一张表三用：
> - **@马奈**：按此切成独立透明 PNG，命名 `icon_<id>.png`（去标签、去底），48×48（或按 B 基准整数倍），commit → `assets/icons/`。
> - **@雅各布**：id 即 config 表主键（crops/animals），填进 CONFIG，加一行=多一种（A类需求）。
> - **@莱布尼茨**：按 id 配 买价/卖价/成熟时长/产出 等数值列。
> 命名统一 `icon_<拼音id>`，三方对同一 id，不返工。

## 一、农作物（种植模块）→ CONFIG.crops / items
| id | 中文 | 类 | 备注 |
|---|---|---|---|
| shuidao 水稻 · xiaomai 小麦 · yumi 玉米 · gaoliang 高粱 · dadou 大豆 · lvdou 绿豆 · hongdou 红豆 · huasheng 花生 · zhima 芝麻 · xiangrikui 向日葵 · youcaihua 油菜花 · mianhua 棉花 · ganzhe 甘蔗 | 粮/经济作物 |
| baicai 白菜 · luobo 萝卜 · huluobo 胡萝卜 · tudou 土豆 · fanshu 番薯 · shanyao 山药 · yutou 芋头 · yangcong 洋葱 · dasuan 大蒜 · shengjiang 生姜 · lajiao 辣椒 · qiezi 茄子 · fanqie 番茄 · huanggua 黄瓜 · nangua 南瓜 | 根茎/瓜果蔬 |
| bocai 菠菜 · shengcai 生菜 · jiucai 韭菜 · cong 葱 · xiangcai 香菜 · qincai 芹菜 · ganlan 甘蓝 · caihua 菜花 · xilanhua 西兰花 · donggua 冬瓜 · sigua 丝瓜 · kugua 苦瓜 · hulu 葫芦 · wandou 豌豆 · sijidou 四季豆 | 叶菜/瓜 |
| caomei 草莓 · xigua 西瓜 · putao 葡萄 · pingguo 苹果 · li 梨 · taozi 桃子 · xingzi 杏子 · juzi 橘子 · shizi 柿子 · zaozi 枣子 · yingtao 樱桃 · lizhi 荔枝 · longyan 龙眼 · zhusun 竹笋 · chaye 茶叶 | 水果/其他 |

（共 58。每种作物还需 **4 生长阶段** 田图 `crop_<id>_0..3`（放 assets/world/），图鉴这张是"成品/图标"用；生长阶段图马奈按需另出。）

## 二、畜牧动物（养殖模块）→ CONFIG.animals / items
| niu 牛 · shuiniu 水牛 · ma 马 · lv 驴 · luo 骡 · zhu 猪 · heizhu 黑猪 · yang 羊 · shanyang 山羊 · tuzi 兔子 · ji 鸡 · gongji 公鸡 · ya 鸭 · e 鹅 · huoji 火鸡 · gou 狗 · mao 猫 · xiaoniu 小牛 · xiaoma 小马 · xiaozhu 小猪 · gezi 鸽子 · anchun 鹌鹑 · mifeng 蜜蜂 · can 蚕 · kongque 孔雀 |

（共 25。产出物如 鸡蛋/牛奶/羊毛/蜂蜜/蚕丝 等另有图标，接养殖时补。）

## 三、钓鱼工具 + 鱼类（钓鱼模块 = 六生活技能之一，本系统待搭后再接，先归档切好备用）
- **钓鱼工具(9)**：普通鱼竿/竹竿/精致鱼竿/高级鱼竿/鱼线/鱼钩/鱼漂/鱼篓/鱼饵。
- **鱼类(~44)**：鲤鱼/草鱼/鲢鱼/青鱼/鲫鱼/鲶鱼/鲈鱼/鳜鱼/罗非鱼/黑鱼/鳗鱼/虹鳟/金鱼/鲑鱼/马口鱼/白条鱼/溪石斑/黄颡鱼/黄鳝/泥鳅/鲥鱼/翘嘴鱼/鳢鱼/太阳鱼/银鱼/锦鲤/河虾/青虾/大闸蟹/梭子蟹/小龙虾/螺蛳/蚌/扇贝/牡蛎/章鱼/鱿鱼/海星/海胆/海参/水母…

## 接入优先级
1. **先 种植 + 养殖**（当前四板块所需）：马奈切 农作物+动物 图标 → 我填 crops/animals config → 莱配数值。
2. 钓鱼/鱼类：等钓鱼模块搭好再接（图标先切好归档）。
3. 加工品（酒/糖/油/丝/腊味等成品）图标：接酿酒/加工链时补。
