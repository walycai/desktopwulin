# 桌面武林 · Godot 4.6 移植

H5 版（仓库根 `index.html` + `src/*.js`）→ 原生 GDScript 重写。分阶段进行。

## 打开方式
Godot 4.6 → Import → 选 `godot/project.godot` → 打开 → F5 运行。
当前主场景 `scenes/main.tscn` 是**临时自检页**：跑一遍战斗核心，把结果显示在屏幕+打到控制台，证明数值核心可运行。

## 结构
- `scripts/combat_core.gd` —— **autoload 单例 `CombatCore`**。与 `src/combat-core.js` **逐行 1:1** 移植（RNG/属性/装备/功法/buildToCombat/createCombat/simulateRealtime/combatPower）。同 seed + 同 build → 与 JS 版逐位一致，供莱布尼茨对拍保真。
- `scenes/main.tscn` + `scripts/main.gd` —— 临时自检场景（阶段1）。
- 后续阶段：家园场景（静态居家图+主角+睡觉/打坐）、横版战斗场景、UI 面板（技能树/功法/装备/商店/居家技能）。

## 移植进度
- [x] 阶段1：combat_core.gd 1:1 移植 + 可运行自检场景
- [ ] 阶段2：家园场景（静态居家图 + 主角 + 床/练功室门动作）
- [ ] 阶段3：横版自动战斗场景（渲染 createCombat.state）
- [ ] 阶段4：UI 面板（技能树/功法/装备/商店/居家技能）+ 存档

## 对拍校验（给莱布尼茨）
`CombatCore.simulate_realtime({attrs, seed, ...})` 应与 JS `simulateRealtime` 同入参同结果。
RNG 用 mulberry32（GDScript 以 uint32 掩码逐位复刻 JS 的 Math.imul/>>> 语义）。
如发现数值背离，优先核对 RNG 与 roundi/floori 的取整方向。
