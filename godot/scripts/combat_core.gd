extends Node
# ============================================================
# 桌面武林 · 战斗核心(纯逻辑) — GDScript 移植
# 与 src/combat-core.js 逐行 1:1(莱布尼茨可对拍保真:同 seed/同 build → 同结果)。
# 用法(autoload 单例 CombatCore):
#   var b = CombatCore.build_to_combat({level=22, gongfa={}, gongfa_equip={}})
#   var r = CombatCore.simulate_realtime({attrs=b.attrs, seed=7, abilities=b.abilities, spawn_pool=["thug"], cap=60})
# 注:JS 用 camelCase 字段;GDScript 这边对外字段尽量沿用同名(Dictionary key 为 String),逻辑数值与 JS 完全一致。
# ============================================================

# ---- 稀有度 / 装备模板 / 副词条池 ----
var RARITY := {
	"common": {"name": "凡品", "color": "#9a9a9a", "affixes": 0},
	"fine": {"name": "精良", "color": "#5fbf5f", "affixes": 1},
	"superior": {"name": "上乘", "color": "#5a9bff", "affixes": 2},
	"epic": {"name": "绝品", "color": "#b06bff", "affixes": 3},
	"legend": {"name": "秘传", "color": "#ffb43a", "affixes": 4},
}
const EQUIP_BRACKET := 20
func bracket_of(lv) -> int:
	return int(max(0, min(4, floori((float(lv if lv else 1) - 1) / EQUIP_BRACKET))))

var SLOT_DEF := {
	"weapon": {"type": "weapon", "glyph": "⚔", "names": ["铁剑", "精钢刀", "百炼宝刀", "玄铁重剑", "赤霄神兵"], "base": {"ATK": 18}},
	"head": {"type": "head", "glyph": "⛑", "names": ["方巾", "铁盔", "精钢头铠", "玄武盔", "真武冠"], "base": {"DEF": 7, "HP": 22}},
	"body": {"type": "body", "glyph": "🥋", "names": ["布衣", "软猬甲", "锁子连环甲", "玄铁战甲", "龙鳞宝甲"], "base": {"DEF": 10, "HP": 45}},
	"legs": {"type": "legs", "glyph": "🦵", "names": ["粗布裤", "护腿", "精钢胫甲", "玄铁腿铠", "蟠龙护胫"], "base": {"DEF": 7, "HP": 30}},
	"neck": {"type": "neck", "glyph": "📿", "names": ["麻绳坠", "长命锁", "白玉佩", "龙纹项圈", "凤鸣玉璜"], "base": {"HP": 30}},
	"ring": {"type": "ring", "glyph": "💍", "names": ["铜戒", "羊脂戒", "碧玉戒", "赤金戒", "盘龙宝戒"], "base": {"ATK": 8, "HP": 15}},
	"belt": {"type": "belt", "glyph": "🎗", "names": ["布带", "玄铁腰带", "精钢腰封", "蛟龙玉带", "紫金龙带"], "base": {"DEF": 6, "HP": 18}},
}
var SET_ITEMS := {
	"set_chixue_wpn": {"name": "赤血刀", "type": "weapon", "glyph": "🗡", "wtype": "dao", "base": {"ATK": 22}},
	"set_chixue_body": {"name": "赤血战甲", "type": "body", "glyph": "🥋", "base": {"HP": 50, "DEF": 10}},
	"set_chixue_legs": {"name": "赤血护腿", "type": "legs", "glyph": "🦵", "base": {"DEF": 10, "HP": 30}},
	"set_chixue_belt": {"name": "赤血腰带", "type": "belt", "glyph": "🎗", "base": {"HP": 36, "DEF": 7}},
	"set_youlong_wpn": {"name": "游龙剑", "type": "weapon", "glyph": "⚔", "wtype": "jian", "base": {"ATK": 18}},
	"set_youlong_head": {"name": "游龙冠", "type": "head", "glyph": "⛑", "base": {"DEF": 8, "HP": 20}},
	"set_youlong_neck": {"name": "游龙佩", "type": "neck", "glyph": "📿", "base": {"HP": 24}},
	"set_youlong_ring": {"name": "游龙戒", "type": "ring", "glyph": "💍", "base": {"ATK": 10, "HP": 18}},
	"set_yantian_wpn": {"name": "焰天杖", "type": "weapon", "glyph": "🪄", "wtype": "qin", "base": {"ATK": 24, "Mana": 20}},
	"set_yantian_body": {"name": "焰天袍", "type": "body", "glyph": "👘", "base": {"HP": 54, "Mana": 24}},
	"set_yantian_head": {"name": "焰天冠", "type": "head", "glyph": "👑", "base": {"Mana": 30, "DEF": 6}},
	"set_yantian_ring": {"name": "焰天戒", "type": "ring", "glyph": "💍", "base": {"ATK": 14, "Mana": 22}},
}
var EQUIP_TPL := {}

# 武器分6类
var WTYPES := ["quan", "jian", "dao", "gun", "qin", "qimen"]
var WTYPE_NAME := {"quan": "拳", "jian": "剑", "dao": "刀", "gun": "棍", "qin": "琴", "qimen": "奇门"}
var WEAPON_TYPE_NAMES := {
	"quan": ["布缠手", "精铁拳套", "玄铁手甲", "龙纹护手", "破天战拳"],
	"jian": ["青锋剑", "精钢剑", "百炼宝剑", "玄铁重剑", "赤霄神剑"],
	"dao": ["朴刀", "精钢刀", "百炼宝刀", "玄铁阔刀", "斩马鬼刀"],
	"gun": ["白蜡棍", "精铁棍", "熟铜棍", "玄铁棍", "如意金箍棒"],
	"qin": ["旧木琴", "焦尾琴", "七弦瑶琴", "绕梁古琴", "广陵神琴"],
	"qimen": ["奇门盘", "遁甲符", "八卦盘", "乾坤罗盘", "太乙神数"],
}
var WEAPON_TYPE_BASE := {
	"quan": {"ATK": 18}, "dao": {"ATK": 18}, "gun": {"ATK": 16, "HP": 10},
	"jian": {"ATK": 15, "Crit": 3}, "qin": {"ATK": 10, "HP": 25, "Mana": 12}, "qimen": {"ATK": 15, "Hit": 5},
}

func roll_wtype(rng: _Rng) -> String:
	return WTYPES[floori((rng.next() if rng else randf()) * WTYPES.size())]

func wtype_of(it) -> Variant:
	if it == null: return null
	if it.has("wtype") and it.wtype != null: return it.wtype
	var tpl = EQUIP_TPL.get(it.get("tid", ""), null)
	if tpl != null and tpl.has("wtype"): return tpl.wtype
	return null

func _weapon_base(it):
	if it.get("tid", "") == "weapon" and it.get("wtype", null) != null and WEAPON_TYPE_BASE.has(it.wtype):
		return WEAPON_TYPE_BASE[it.wtype]
	return null

func item_name(it) -> String:
	if it.get("tid", "") == "weapon" and it.get("wtype", null) != null and WEAPON_TYPE_NAMES.has(it.wtype):
		return WEAPON_TYPE_NAMES[it.wtype][bracket_of(it.get("lv", 1))] + "（" + WTYPE_NAME[it.wtype] + "）"
	var d = SLOT_DEF.get(it.get("tid", ""), null)
	if d != null: return d.names[bracket_of(it.get("lv", 1))]
	var tpl = EQUIP_TPL.get(it.get("tid", ""), null)
	return tpl.name if tpl != null else str(it.get("tid", ""))

# 词条分层
var AFFIX_TIERS := [
	[{"s": "ATK", "a": 1, "b": 6}, {"s": "DEF", "a": 1, "b": 4}, {"s": "HP", "a": 5, "b": 25}],
	[{"s": "Hit", "a": 1, "b": 5}, {"s": "Dodge", "a": 1, "b": 3}, {"s": "ATKspd", "a": 1, "b": 3}],
	[{"s": "Crit", "a": 1, "b": 3}],
	[{"s": "CritDmg", "a": 5, "b": 15}],
]
var AFFIX_POOL := []

# ---- 敌人梯度 ----
var ENEMIES := {
	"thug": {"name": "小混混", "HP": 24, "ATK": 6, "DEF": 2, "Crit": 3, "CritDmg": 130, "Hit": 80, "Dodge": 5, "ATKspd": 70, "exp": 10},
	"bandit": {"name": "土匪", "HP": 40, "ATK": 14, "DEF": 5, "Crit": 5, "CritDmg": 140, "Hit": 85, "Dodge": 6, "ATKspd": 100, "exp": 22},
	"sect_novice": {"name": "门派入门弟子", "HP": 64, "ATK": 20, "DEF": 9, "Crit": 8, "CritDmg": 150, "Hit": 90, "Dodge": 8, "ATKspd": 110, "exp": 40},
	"xie_jiao": {"name": "邪教教众", "HP": 90, "ATK": 30, "DEF": 13, "Crit": 10, "CritDmg": 155, "Hit": 92, "Dodge": 10, "ATKspd": 115, "exp": 65},
	"mo_jiao": {"name": "魔教精英", "HP": 130, "ATK": 42, "DEF": 18, "Crit": 12, "CritDmg": 160, "Hit": 94, "Dodge": 12, "ATKspd": 120, "exp": 95},
	"gui_zu": {"name": "黄泉鬼卒", "HP": 190, "ATK": 60, "DEF": 24, "Crit": 12, "CritDmg": 165, "Hit": 96, "Dodge": 13, "ATKspd": 120, "exp": 130},
	"yao_xiu": {"name": "罗刹妖修", "HP": 280, "ATK": 88, "DEF": 32, "Crit": 14, "CritDmg": 170, "Hit": 98, "Dodge": 15, "ATKspd": 125, "exp": 170},
	"mo_jiang": {"name": "九幽魔将", "HP": 420, "ATK": 130, "DEF": 44, "Crit": 15, "CritDmg": 175, "Hit": 100, "Dodge": 16, "ATKspd": 128, "exp": 210},
	"gu_mo": {"name": "上古魔神", "HP": 640, "ATK": 195, "DEF": 60, "Crit": 16, "CritDmg": 180, "Hit": 104, "Dodge": 18, "ATKspd": 130, "exp": 260},
}
const EXP_CURVE_MULT := 4
func next_exp(level) -> int:
	return roundi(50.0 * pow(float(level), 1.5) * EXP_CURVE_MULT)
func base_attrs(level, _neigong = 1) -> Dictionary:
	var lv = float(level if level else 1)
	return {"HP": 80 + lv * 15, "ATK": 10 + lv * 2, "DEF": 5 + lv, "Crit": 5, "CritDmg": 150, "Hit": 88 + lv, "Dodge": 5 + floori(lv / 2), "ATKspd": 100, "Mana": 40 + lv * 6, "Tough": 0}

var DROP := {"potionRate": 0.35, "potionHeal": 30, "equipRate": 0.10, "equipPool": ["weapon", "head", "body", "legs", "neck", "ring", "belt"]}
const GOLD_PER_EXP := 0.0215
const BOSS_HP_MULT := 1
var ELITE := {"hpMult": 2.5, "atkMult": 1.5, "defMult": 1.5, "expMult": 2.5, "dropMult": 2.5, "qualityBonus": 1.5}
var SET_DEFS := [
	{"id": "chixue", "name": "赤血战甲", "line": "warrior_force", "zone": 7, "pieces": ["set_chixue_wpn", "set_chixue_body", "set_chixue_legs", "set_chixue_belt"], "bonuses": {"2": {"ATK": 60}, "4": {"ATK": 120, "CritDmg": 30}}},
	{"id": "youlong", "name": "百兵游龙", "line": "warrior_arms", "zone": 8, "pieces": ["set_youlong_wpn", "set_youlong_head", "set_youlong_neck", "set_youlong_ring"], "bonuses": {"2": {"Crit": 8}, "4": {"Crit": 14, "ATKspd": 16}}},
	{"id": "yantian", "name": "赤焰天罗", "line": "enchant_fire", "zone": 9, "pieces": ["set_yantian_wpn", "set_yantian_body", "set_yantian_head", "set_yantian_ring"], "bonuses": {"2": {"ATK": 90, "Mana": 40}, "4": {"ATK": 200, "ATKspd": 8}}},
]
const SET_DROP_RATE := 0.15
func set_for_zone(zi):
	for s in SET_DEFS:
		if s.zone == zi: return s
	return null
func active_sets(equipped) -> Array:
	var eq_tids := {}
	var e = equipped if equipped else {}
	for s in e:
		if e[s] != null: eq_tids[e[s].tid] = 1
	var out := []
	for s in SET_DEFS:
		var cnt := 0
		for t in s.pieces:
			if eq_tids.has(t): cnt += 1
		if cnt < 2: continue
		var applied := {}
		var grants := []
		for th in s.bonuses:
			if cnt >= int(th):
				var b = s.bonuses[th]
				for st in b:
					if st == "skillGrant": grants.append(b[st])
					else: applied[st] = applied.get(st, 0) + b[st]
		out.append({"set": s, "count": cnt, "applied": applied, "grants": grants})
	return out
func ext_line_of(id):
	var p = str(id).split("_x_")
	if p.size() < 2: return null
	var rest = p[1]
	var r = rest.substr(0, rest.rfind("_"))
	return p[0] + "_" + r

var ENCH := {
	"range": {"base": 165, "coef": 0.5},
	"chillCap": 0.5,
	"burn": {"chance": 0.3, "fireFlatPer": 1.5, "dpsPer": 0.12, "durRoot": 3, "durPer": 1, "ampPer": 0.2, "canCrit": true},
	"poison": {"chance": 0.4, "dpsRoot": 0.01, "dpsPer": 0.003, "durRoot": 6, "durPer": 1.5, "ampPer": 0.2, "maxStacks": 5},
	"chill": {"chance": 0.3, "mvRoot": 0.15, "asRoot": 0.10, "hitRoot": 0.10, "mvPer": 0.04, "deepPer": 0.04, "dur": 3, "durPer": 0.4, "chancePer": 0.04},
}
var SELL := {"common": 8, "fine": 20, "superior": 55, "epic": 150, "legend": 400}
var RARITY_WEIGHTS := [["common", 64], ["fine", 28], ["superior", 7], ["epic", 0.8], ["legend", 0.2]]
var ZONE_RARITY := [
	[["common", 70], ["fine", 25], ["superior", 4.5], ["epic", 0.4], ["legend", 0.1]],
	[["common", 62], ["fine", 29], ["superior", 7], ["epic", 1.5], ["legend", 0.5]],
	[["common", 54], ["fine", 32], ["superior", 10], ["epic", 3], ["legend", 1]],
	[["common", 46], ["fine", 34], ["superior", 13], ["epic", 5], ["legend", 2]],
	[["common", 38], ["fine", 35], ["superior", 17], ["epic", 7], ["legend", 3]],
	[["common", 35], ["fine", 35], ["superior", 20], ["epic", 7], ["legend", 3]],
	[["common", 32], ["fine", 36], ["superior", 22], ["epic", 7], ["legend", 3]],
	[["common", 30], ["fine", 37], ["superior", 23], ["epic", 7], ["legend", 3]],
	[["common", 28], ["fine", 38], ["superior", 24], ["epic", 7], ["legend", 3]],
	[["common", 26], ["fine", 39], ["superior", 25], ["epic", 7], ["legend", 3]],
]

# ---- 可复现随机 (mulberry32) — 与 JS 逐位一致 ----
const _M32 := 0xFFFFFFFF
class _Rng:
	var t: int
	func _init(seed: int):
		t = seed & 0xFFFFFFFF
	static func _imul(a: int, b: int) -> int:
		a = a & 0xFFFFFFFF
		b = b & 0xFFFFFFFF
		var bl = b & 0xFFFF
		var bh = (b >> 16) & 0xFFFF
		return ((a * bl) + (((a * bh) & 0xFFFF) << 16)) & 0xFFFFFFFF
	func next() -> float:
		t = (t + 0x6D2B79F5) & 0xFFFFFFFF
		var r = _imul(t ^ (t >> 15), 1 | t)
		r = (r ^ ((r + _imul(r ^ (r >> 7), 61 | r)) & 0xFFFFFFFF)) & 0xFFFFFFFF
		return float((r ^ (r >> 14)) & 0xFFFFFFFF) / 4294967296.0

func mulberry32(seed: int) -> _Rng:
	return _Rng.new(seed)

func roll_rarity(rng: _Rng, weights) -> String:
	var W = weights if weights else RARITY_WEIGHTS
	var tot := 0.0
	for w in W: tot += w[1]
	var r = rng.next() * tot
	for w in W:
		if r < w[1]: return w[0]
		r -= w[1]
	return "common"

func mk_affixes(rng: _Rng, rarity) -> Array:
	var n = RARITY[rarity].affixes
	var used := {}
	var af := []
	for i in range(1, n + 1):
		var pool := []
		for t in range(0, min(i, AFFIX_TIERS.size())):
			for j in range(AFFIX_TIERS[t].size()):
				var c = AFFIX_TIERS[t][j]
				if not used.has(c.s): pool.append(c)
		if pool.is_empty(): break
		var a = pool[floori(rng.next() * pool.size())]
		used[a.s] = 1
		af.append({"s": a.s, "v": a.a + floori(rng.next() * (a.b - a.a + 1))})
	return af

func roll_drop(rng: _Rng, pool, weights = null) -> Dictionary:
	var tid = pool[floori(rng.next() * pool.size())]
	var rarity = roll_rarity(rng, weights)
	var it := {"id": tid, "rarity": rarity, "affixes": mk_affixes(rng, rarity)}
	if tid == "weapon": it["wtype"] = roll_wtype(rng)
	return it

func hit_chance(atk, def_) -> float:
	var c = 0.6 + (atk.Hit - def_.Dodge) * 0.01
	return 0.3 if c < 0.3 else (0.99 if c > 0.99 else c)
const CRIT_CAP := 50
const TOUGH_K := 120
func tough_dr(t) -> float:
	var tv = float(t) if t else 0.0
	return min(0.75, tv / (tv + TOUGH_K))
func crit_resolve(crit, crit_dmg) -> Dictionary:
	var c = float(crit) if crit else 0.0
	var cd = float(crit_dmg) if crit_dmg else 150.0
	var eff = min(CRIT_CAP, c)
	var over = max(0.0, c - CRIT_CAP)
	return {"crit": eff, "critDmg": cd + over * 2}
func strike(rng: _Rng, atk, def_) -> Dictionary:
	if rng.next() > hit_chance(atk, def_): return {"hit": false, "dmg": 0}
	var dmg = max(1.0, atk.ATK * 100.0 / (100.0 + def_.DEF))
	var cr = crit_resolve(atk.Crit, atk.CritDmg)
	if rng.next() < cr.crit / 100.0 * (1.0 - tough_dr(def_.get("Tough", 0))):
		dmg *= cr.critDmg / 100.0
	return {"hit": true, "dmg": roundi(dmg)}

# 战力(CP)
func combat_power(a) -> int:
	var cr = crit_resolve(a.Crit, a.CritDmg)
	var crit_mult = 1.0 + (cr.crit / 100.0) * (cr.critDmg / 100.0 - 1.0)
	var p_hit = clampf(0.6 + (a.Hit - 6) * 0.01, 0.3, 0.99)
	var atk_eff = a.ATK * 100.0 / (100.0 + 6.0)
	var dps = atk_eff * (a.ATKspd / 100.0) * p_hit * crit_mult
	var e_hit_on_me = clampf(0.6 + (88 - a.Dodge) * 0.01, 0.3, 0.99)
	var ehp = a.HP * (100.0 + a.DEF) / 100.0 * (1.0 / e_hit_on_me) * (1.0 + tough_dr(a.get("Tough", 0)) * 0.5)
	return roundi(sqrt(dps * ehp) * 10.0)

# ==== 功法数据(单一源) ====
const GONGFA_MAXLV := 10
var GONGFA_SLOTS := [{"key": "nei", "sys": "nei", "name": "内功"}, {"key": "wai1", "sys": "wai", "name": "外功一"}, {"key": "wai2", "sys": "wai", "name": "外功二"}, {"key": "qing", "sys": "qing", "name": "轻功"}]
var GONGFA_TIERS := ["白", "绿", "蓝", "紫", "橙", "赤", "金", "玄", "天", "绝"]
var GONGFA_TIER_COLOR := ["#cfcfcf", "#5fbf5f", "#5a9fe0", "#a060e0", "#e08a30", "#e05050", "#e0c040", "#40c8c0", "#c060a0", "#ff7040"]
var GF_PASSIVE := {"nei": {"HP": 3, "Mana": 2}, "wai": {"ATK": 0.4}, "qing": {"ATKspd": 0.4, "Hit": 0.4}}
var GONGFA_LINES := [
	{"sys": "nei", "key": "xuanjia", "nm": "玄甲功", "akind": "nei", "eff": "dr"},
	{"sys": "nei", "key": "fanzhen", "nm": "返震劲", "akind": "nei", "eff": "reflect"},
	{"sys": "nei", "key": "huichun", "nm": "回春诀", "akind": "nei", "eff": "regenPct"},
	{"sys": "nei", "key": "ningyuan", "nm": "凝元功", "akind": "nei", "eff": "regenFlat"},
	{"sys": "nei", "key": "tiegu", "nm": "铁骨功", "akind": "nei", "eff": "tough"},
	{"sys": "nei", "key": "lingshe", "nm": "灵蛇身法", "akind": "nei", "eff": "dodge"},
	{"sys": "wai", "key": "quan", "nm": "罗汉伏虎拳", "akind": "weapon", "wtype": "quan"},
	{"sys": "wai", "key": "jian", "nm": "一阳剑诀", "akind": "weapon", "wtype": "jian"},
	{"sys": "wai", "key": "dao", "nm": "降龙刀法", "akind": "weapon", "wtype": "dao"},
	{"sys": "wai", "key": "gun", "nm": "齐天棍法", "akind": "weapon", "wtype": "gun"},
	{"sys": "wai", "key": "qin", "nm": "广陵琴音", "akind": "weapon", "wtype": "qin"},
	{"sys": "wai", "key": "qimen", "nm": "奇门遁甲", "akind": "weapon", "wtype": "qimen"},
	{"sys": "qing", "key": "jifeng", "nm": "疾风诀", "akind": "stat", "abase": {"ATKspd": 3}},
	{"sys": "qing", "key": "linghu", "nm": "灵狐步", "akind": "stat", "abase": {"Dodge": 3}},
	{"sys": "qing", "key": "yingyan", "nm": "鹰眼术", "akind": "stat", "abase": {"Hit": 4}},
	{"sys": "qing", "key": "fengxing", "nm": "风行步", "akind": "stat", "abase": {"ATKspd": 2, "Dodge": 2}},
	{"sys": "qing", "key": "yingzong", "nm": "影踪步", "akind": "stat", "abase": {"Dodge": 2, "Hit": 2}},
	{"sys": "qing", "key": "yufeng", "nm": "御风诀", "akind": "stat", "abase": {"ATKspd": 1.5, "Hit": 2, "Dodge": 1.5}},
]
var GF_RATE_ADD := {"Crit": 2, "Hit": 2, "Dodge": 1}
const GONGFA_TIER_MULT := 1.25
func gf_scale_tier(o, t) -> Dictionary:
	var r := {}
	var m = pow(GONGFA_TIER_MULT, t)
	# 不在此处逐项取整:白档被动(如0.4)会被round成0。保留小数,由 build_to_combat 累积"被动×等级"后整体 round(莱布尼茨,同金币原则)
	for k in o:
		r[k] = (o[k] + GF_RATE_ADD[k] * t) if GF_RATE_ADD.has(k) else (o[k] * m)
	return r
func gf_price(t) -> int:
	return roundi(240.0 * pow(5.0, t)) if t <= 3 else roundi(30000.0 * pow(3.5, t - 3))
func gf_eff_tier(tier, lv) -> float:
	return tier + (max(1, lv if lv else 1) - 1) / float(GONGFA_MAXLV - 1)
func gf_weapon_skill(wtype, te, id):
	match wtype:
		"quan":
			var o := {"id": id, "type": "single", "cost": 0, "cd": 5, "mult": (150 + 18 * te) / 100.0, "canCrit": true}
			if te >= 4:
				o["stunChance"] = 0.10 + 0.02 * (te - 4)
				o["stunDur"] = 2
			return o
		"jian":
			return {"id": id, "type": "single", "cost": 0, "cd": (7 if te >= 6 else 6), "mult": (180 + 35 * te) / 100.0, "canCrit": true}
		"dao":
			return {"id": id, "type": "aoe", "cost": 0, "cd": (8 if te >= 4 else 6), "radius": 220, "mult": (110 + 22 * te) / 100.0, "canCrit": true}
		"gun":
			return {"id": id, "type": "aoe", "cost": 0, "cd": 7, "radius": 200, "mult": (100 + 18 * te) / 100.0, "stunChance": 0.10 + 0.03 * te, "stunDur": 1.5 + 0.1 * te}
		"qin":
			var q := {"id": id, "type": "buff", "cost": 0, "cd": (14 if te < 4 else 16), "atkPct": (8 + 2 * te) / 100.0, "dur": 10}
			if te >= 4: q["healPct"] = (6 + 1.5 * (te - 4)) / 100.0
			return q
		"qimen":
			var d := {"id": id, "type": "debuff", "cost": 0, "cd": (10 if te >= 6 else 8), "dur": 8, "radius": 200, "defDown": (15 + 5 * te) / 100.0}
			if te >= 4: d["poiPct"] = 0.005 + 0.001 * (te - 4)
			return d
	return null
func gf_nei_effect(eff, te, ng_lv = 0) -> Dictionary:
	match eff:
		"dr": return {"dr": (2 + 0.25 * te) / 100.0}
		"reflect": return {"reflect": (8 + 2.5 * te) / 100.0}
		"regenPct": return {"regenPct": (0.3 + 0.18 * te) / 100.0}
		"regenFlat": return {"regenFlat": roundi((3 + 2 * te) * (1 + ng_lv * 0.05))}
		"tough": return {"Tough": roundi(8 + 4 * te)}
		"dodge": return {"Dodge": roundi(10 + 5 * te)}
	return {}
var GONGFA := []
var GONGFA_BY := {}
func gongfa_by_id(id):
	return GONGFA_BY.get(id, null)
func gf_prof_req(lv) -> int:
	return roundi(40.0 * lv * lv)

# ==== 装备等级缩放 + itemStats ====
const GEAR_LV_SCALE := 0.30
var GEAR_THRESHOLDS := [{"minLv": 20, "bonus": {"ATK": 22, "HP": 110}}, {"minLv": 40, "bonus": {"ATK": 55, "HP": 300, "ATKspd": 5}}, {"minLv": 60, "bonus": {"ATK": 130, "HP": 700, "CritDmg": 8}}, {"minLv": 80, "bonus": {"ATK": 200, "HP": 1100}}]
const AFFIX_LV_SCALE := 0.1
var GEAR_FLAT := {"ATK": 1, "DEF": 1, "HP": 1, "Mana": 1}
func item_stats(it) -> Dictionary:
	var t = EQUIP_TPL.get(it.get("tid", ""), null)
	if t == null: return {}
	var lv = it.get("lv", 1)
	var s := {}
	var m = 1 + GEAR_LV_SCALE * (lv - 1)
	var am = 1 + AFFIX_LV_SCALE * (lv - 1)
	var base = _weapon_base(it)
	if base == null: base = t.base
	for k in base:
		s[k] = roundi(base[k] * (m if GEAR_FLAT.has(k) else 1.0))
	for a in it.get("affixes", []):
		s[a.s] = s.get(a.s, 0) + roundi(a.v * (am if GEAR_FLAT.has(a.s) else 1.0))
	return s

func neigong_level(gf) -> int:
	var s := 0
	for gid in (gf if gf else {}): s += gf[gid] if gf[gid] else 0
	return s

# ---- 深度技能树扩展 ----
const EXT_PER_ROUTE := 62
var SKILL_EXT_DEF := {
	"warrior": [
		{"route": "force", "col": 0, "tail": "whirlwind", "stat": "ATK", "per": 6, "nm": "刚劲"},
		{"route": "arms", "col": 2, "tail": "equip_atk", "stat": "Crit", "per": 1, "nm": "技击"},
		{"route": "body", "col": 4, "tail": "berserk", "stat": "HP", "per": 40, "nm": "淬体"},
	],
	"enchant": [
		{"route": "fire", "col": 0, "tail": "fire_conflag", "stat": "ATK", "per": 5, "nm": "炎息"},
		{"route": "ice", "col": 2, "tail": "ice_permafrost", "stat": "DEF", "per": 4, "nm": "冰息"},
		{"route": "poison", "col": 4, "tail": "poison_corrode", "stat": "DEF", "per": 4, "nm": "毒息"},
	],
}
var SKILL_EXT_EFF := {}
var STAT_CN := {"ATK": "攻击", "HP": "气血", "DEF": "防御", "Crit": "暴击率", "CritDmg": "暴击伤害", "Hit": "命中", "ATKspd": "攻速", "Mana": "内力", "Dodge": "闪避", "Tough": "韧性"}
func gen_skill_ext(tree_id, base_row = 5) -> Array:
	var out := []
	var defs = SKILL_EXT_DEF.get(tree_id, [])
	for d in defs:
		var prev = d.tail
		for t in range(EXT_PER_ROUTE):
			var id = tree_id + "_x_" + d.route + "_" + str(t)
			SKILL_EXT_EFF[id] = {"stat": d.stat, "per": d.per}
			out.append({"id": id, "name": d.nm + str(t + 1) + "层", "col": d.col, "row": base_row + t, "max": 5, "reqPts": 30 + t * 6, "reqLv": min(99, 14 + t), "prereq": [prev], "eff": {"stat": d.stat, "per": d.per}, "ext": true})
			prev = id
	return out
var SKILL_EXT_NODES := {}

func _init() -> void:
	# EQUIP_TPL 由 SLOT_DEF + SET_ITEMS 合成
	for sl in SLOT_DEF:
		EQUIP_TPL[sl] = {"name": SLOT_DEF[sl].names[0], "type": SLOT_DEF[sl].type, "glyph": SLOT_DEF[sl].glyph, "base": SLOT_DEF[sl].base}
	for si in SET_ITEMS:
		EQUIP_TPL[si] = SET_ITEMS[si]
	AFFIX_POOL = AFFIX_TIERS[0] + AFFIX_TIERS[1] + AFFIX_TIERS[2] + AFFIX_TIERS[3]
	# GONGFA 生成
	for line in GONGFA_LINES:
		for t in range(10):
			var g := {"id": line.key + "_t" + str(t), "key": line.key, "name": line.nm, "sys": line.sys, "tier": t, "tierName": GONGFA_TIERS[t], "color": GONGFA_TIER_COLOR[t], "akind": line.akind, "wtype": line.get("wtype", null), "eff": line.get("eff", null), "passive": gf_scale_tier(GF_PASSIVE[line.sys], t), "active": (gf_scale_tier(line.abase, t) if line.akind == "stat" else {}), "price": gf_price(t)}
			GONGFA.append(g)
			GONGFA_BY[g.id] = g
	SKILL_EXT_NODES = {"warrior": gen_skill_ext("warrior", 5), "enchant": gen_skill_ext("enchant", 5)}

func gf_active_desc(g, lv = 1, ng_lv = 0) -> Variant:
	var te = gf_eff_tier(g.tier, lv if lv else 1)
	if g.akind == "weapon":
		var s = gf_weapon_skill(g.wtype, te, g.id)
		var nm = WTYPE_NAME[g.wtype]
		if g.wtype == "qin":
			return nm + "·自身+攻击" + str(roundi(s.atkPct * 100)) + "%/" + str(s.dur) + "s" + ("、回血" + str(roundi(s.healPct * 100)) + "%" if s.has("healPct") else "") + "（CD" + str(s.cd) + "s）"
		if g.wtype == "qimen":
			return nm + "·降敌防" + str(roundi(s.defDown * 100)) + "%/" + str(s.dur) + "s" + ("+中毒" if s.has("poiPct") else "") + "（CD" + str(s.cd) + "s）"
		return nm + "·" + ("群体" if s.type == "aoe" else "单体") + str(roundi(s.mult * 100)) + "%伤害" + ("(可暴)" if s.get("canCrit", false) else "") + ("+眩" + str(roundi(s.stunChance * 100)) + "%" if s.has("stunChance") else "") + "（CD" + str(s.cd) + "s）"
	if g.akind == "nei":
		var e = gf_nei_effect(g.eff, te, ng_lv)
		match g.eff:
			"dr": return "受击减伤 " + str(snappedf(e.dr * 100, 0.1)) + "%"
			"reflect": return "反弹受到伤害 " + str(snappedf(e.reflect * 100, 0.1)) + "%"
			"regenPct": return "每秒回血 " + str(snappedf(e.regenPct * 100, 0.1)) + "% 最大气血"
			"regenFlat": return "每秒固定回血 " + str(e.regenFlat)
			"tough": return "韧性 +" + str(e.Tough)
			"dodge": return "闪避 +" + str(e.Dodge)
	return null

# ==== build → 实战 ====
func build_to_combat(b) -> Dictionary:
	if b == null: b = {}
	var sk = b.get("skills", {})
	var gf = b.get("gongfa", {})
	var ge = b.get("gongfaEquip", {})
	var ng_lv = neigong_level(gf)
	var a = base_attrs(b.get("level", 1), ng_lv)
	var eq := {}
	var eqp = b.get("equipped", {})
	for slot in eqp:
		var it = eqp[slot]
		if it == null: continue
		var s = item_stats(it)
		for k in s: eq[k] = eq.get(k, 0) + s[k]
	if eq.has("ATK"): eq.ATK *= 1 + sk.get("equip_atk", 0) * 0.05
	if eq.has("HP"): eq.HP *= 1 + sk.get("equip_hp", 0) * 0.05
	for k2 in eq: a[k2] = a.get(k2, 0) + eq[k2]
	a.HP += sk.get("foundation", 0) * 15 + sk.get("str_hp", 0) * 30
	a.ATK += sk.get("foundation", 0) * 2 + sk.get("str_atk", 0) * 4
	a.DEF += sk.get("str_def", 0) * 3
	a.Crit += sk.get("crit", 0) * 2
	a.CritDmg += sk.get("critdmg", 0) * 10
	a.Hit += sk.get("hit", 0) * 3
	a.ATKspd += sk.get("atkspd", 0) * 3
	a.ATK *= 1 + sk.get("weapon_mastery", 0) * 0.03
	for gid in gf:
		var go = GONGFA_BY.get(gid, null)
		var lv = gf[gid] if gf[gid] else 0
		if go == null or lv <= 0: continue
		for pk in go.passive: a[pk] = a.get(pk, 0) + go.passive[pk] * lv
	# 功法主动
	var gf_abilities := []
	var nei_dr := 0.0
	var nei_reflect := 0.0
	var nei_regen_pct := 0.0
	var nei_regen_flat := 0.0
	var eq_wtype = wtype_of(eqp.get("weapon", null))
	for sl in GONGFA_SLOTS:
		var eid = ge.get(sl.key, null)
		if eid == null: continue
		var go = GONGFA_BY.get(eid, null)
		var lv = gf.get(eid, 0)
		if go == null or lv <= 0: continue
		var te = gf_eff_tier(go.tier, lv)
		if go.akind == "weapon":
			if go.wtype == eq_wtype:
				var sk2 = gf_weapon_skill(go.wtype, te, "gf_" + go.wtype + "_" + sl.key)
				if sk2 != null: gf_abilities.append(sk2)
		elif go.akind == "nei":
			var ne = gf_nei_effect(go.eff, te, ng_lv)
			if ne.has("dr"): nei_dr += ne.dr
			if ne.has("reflect"): nei_reflect += ne.reflect
			if ne.has("regenPct"): nei_regen_pct += ne.regenPct
			if ne.has("regenFlat"): nei_regen_flat += ne.regenFlat
			if ne.has("Tough"): a.Tough = a.get("Tough", 0) + ne.Tough
			if ne.has("Dodge"): a.Dodge = a.get("Dodge", 0) + ne.Dodge
		else:
			for ak in go.active: a[ak] = a.get(ak, 0) + go.active[ak] * lv
	var _sets = active_sets(eqp)
	var sk_grant := {}
	for as_ in _sets:
		for g in as_.grants:
			if g != null and typeof(g) == TYPE_DICTIONARY and g.has("ext"): sk_grant[g.ext] = sk_grant.get(g.ext, 0) + g.get("lv", 0)
	for xid in sk:
		var xe = SKILL_EXT_EFF.get(xid, null)
		var base_r = sk[xid] if sk[xid] else 0
		if xe == null or base_r <= 0: continue
		var rk = base_r + sk_grant.get(ext_line_of(xid), 0)
		a[xe.stat] = a.get(xe.stat, 0) + xe.per * rk
	for as2 in _sets:
		for st in as2.applied: a[st] = a.get(st, 0) + as2.applied[st]
	var eq_items := []
	for es in eqp:
		if eqp[es] != null: eq_items.append(eqp[es])
	if eq_items.size() >= 8:
		var min_lv = 999
		for ei in eq_items: min_lv = min(min_lv, ei.get("lv", 1))
		for th in GEAR_THRESHOLDS:
			if min_lv >= th.minLv:
				for bk in th.bonus: a[bk] = a.get(bk, 0) + th.bonus[bk]
	a.ATK = roundi(a.ATK)
	a.HP = roundi(a.HP)
	a.DEF = roundi(a.DEF)
	a.ATKspd = roundi(a.ATKspd)
	a.Mana = roundi(a.Mana)
	var ab := []
	var wr = sk.get("whirlwind", 0)
	var br = sk.get("berserk", 0)
	if wr > 0: ab.append({"id": "whirlwind", "type": "aoe", "cost": 40, "cd": 6, "mult": 0.5 + 0.3 * wr})
	if br > 0: ab.append({"id": "berserk", "type": "haste", "cost": 50, "cd": 12, "dur": 5})
	for gab in gf_abilities: ab.append(gab)
	var ench := {}
	if sk.get("fire_ignite", 0) > 0:
		ench["burn"] = {"chance": ENCH.burn.chance, "dps": ng_lv * ENCH.burn.fireFlatPer * (1 + sk.get("fire_blaze", 0) * ENCH.burn.dpsPer) * (1 + sk.get("fire_conflag", 0) * ENCH.burn.ampPer), "dur": ENCH.burn.durRoot + sk.get("fire_inferno", 0) * ENCH.burn.durPer, "canCrit": ENCH.burn.canCrit}
	if sk.get("poison_venom", 0) > 0:
		ench["poison"] = {"chance": ENCH.poison.chance, "dps": (ENCH.poison.dpsRoot + sk.get("poison_toxin", 0) * ENCH.poison.dpsPer) * (1 + sk.get("poison_corrode", 0) * ENCH.poison.ampPer), "dur": ENCH.poison.durRoot + sk.get("poison_plague", 0) * ENCH.poison.durPer, "maxStacks": ENCH.poison.maxStacks}
	if sk.get("ice_frost", 0) > 0:
		ench["chill"] = {"chance": ENCH.chill.chance + sk.get("ice_permafrost", 0) * ENCH.chill.chancePer, "mv": ENCH.chill.mvRoot + sk.get("ice_glacier", 0) * ENCH.chill.mvPer, "as": ENCH.chill.asRoot + sk.get("ice_freeze", 0) * ENCH.chill.deepPer, "hit": ENCH.chill.hitRoot + sk.get("ice_freeze", 0) * ENCH.chill.deepPer, "dur": ENCH.chill.dur + sk.get("ice_permafrost", 0) * ENCH.chill.durPer}
	var player_range = roundi(ENCH.range.base + ENCH.range.coef * ng_lv) if sk.get("range", 0) > 0 else 0
	return {"attrs": a, "abilities": ab, "manaRegen": 8, "enchant": ench, "playerRange": player_range, "neigongLevel": ng_lv, "neiDR": nei_dr, "neiReflect": nei_reflect, "neiRegenPct": nei_regen_pct, "neiRegenFlat": nei_regen_flat}

# ==== 实时战斗(createCombat → CombatSim) ====
func create_combat(cfg) -> CombatSim:
	return CombatSim.new(self, cfg)

func simulate_realtime(cfg) -> Dictionary:
	var c = create_combat(cfg)
	var dt = cfg.get("dt", 0.05)
	var n := 0
	var lim = int(cfg.get("cap", 5000) / dt + 10)
	while not c.is_done() and n < lim:
		c.step(dt)
		n += 1
	return c.result()

# CombatSim:1:1 对应 JS createCombat 闭包(状态成员 + step/state/result)
class CombatSim extends RefCounted:
	var C  # CombatCore 引用(常量/函数)
	var cfg
	var rng
	var drop
	var bagMax: int
	var rw
	var eliteChance: float
	var dropQuality: float
	var enemyRegenPct: float
	var P0
	var lane: float
	var melee: float
	var eSpeed: float
	var enchant
	var reach: float
	var spawnInt: float
	var maxField: int
	var spawnPool
	var cap: float
	var capTime: float
	var capKills: int
	var spawnTypes
	var lvMin: int
	var lvMax: int
	var bossFight: bool
	var bossKilled: bool = false
	var P
	var playerRegen: float
	var regenT: float = 0.0
	var lastHeal: float = 0.0
	var neiDR: float
	var neiReflect: float
	var neiRegenPct: float
	var enemies := []
	var spawnCd: float = 0.0
	var uid: int = 1
	var kills: int = 0
	var drops := []
	var bag := []
	var potions: int = 0
	var exp: float = 0.0
	var gold: float = 0.0
	var dmgDealt: float = 0.0
	var dmgTaken: float = 0.0
	var t: float = 0.0
	var done: bool = false
	var outcome = null
	var bagFull: bool = false
	var lastHit = null
	var manaMax: float
	var mana: float
	var manaRegen: float
	var abilities := []
	var haste: float = 0.0
	var lastCast = null
	var atkBuffT: float = 0.0
	var atkBuffPct: float = 0.0

	func _init(core, _cfg):
		C = core
		cfg = _cfg
		rng = cfg.get("rng", null)
		if rng == null: rng = C.mulberry32(int(cfg.get("seed", 1)))
		drop = cfg.get("drop", C.DROP)
		bagMax = cfg.get("bagMax", 20)
		rw = cfg.get("rarityWeights", null)
		if rw == null and cfg.get("zoneIdx", null) != null: rw = C.ZONE_RARITY[cfg.zoneIdx]
		eliteChance = cfg.get("eliteChance", 0)
		dropQuality = cfg.get("dropQuality", 0)
		enemyRegenPct = (0.2 + 0.05 * cfg.get("zoneIdx", 0)) / 100.0
		P0 = cfg.attrs
		lane = cfg.get("laneLen", 820)
		melee = cfg.get("meleeRange", 70)
		eSpeed = cfg.get("enemySpeed", 110)
		enchant = cfg.get("enchant", {})
		reach = melee + cfg.get("playerRange", 0)
		spawnInt = cfg.get("spawnInterval", 1.8)
		maxField = cfg.get("maxOnField", 40)
		spawnPool = cfg.get("spawnPool", ["thug"])
		cap = cfg.get("cap", 5000)
		capTime = cfg.get("capTime", 0)
		capKills = cfg.get("capKills", 0)
		spawnTypes = cfg.get("spawnTypes", null)
		lvMin = cfg.get("lvMin", 1)
		lvMax = cfg.get("lvMax", 1)
		bossFight = cfg.has("boss") and cfg.boss != null
		var start_hp = cfg.get("startHp", null)
		P = {"hp": (min(start_hp, P0.HP) if start_hp != null else P0.HP), "hpMax": P0.HP, "atkInt": 1.0 / (float(P0.get("ATKspd", 100)) / 100.0), "cd": 0.0}
		playerRegen = cfg.get("playerRegen", 0)
		neiDR = min(0.9, cfg.get("neiDR", 0))
		neiReflect = cfg.get("neiReflect", 0)
		neiRegenPct = cfg.get("neiRegenPct", 0)
		manaMax = P0.get("Mana", 0)
		var sm = cfg.get("startMana", null)
		mana = (max(0, min(sm, manaMax)) if sm != null else 0)
		manaRegen = cfg.get("manaRegen", 8)
		for a in cfg.get("abilities", []):
			var ab = a.duplicate(true)
			ab["mult"] = a.get("mult", 0)
			ab["dur"] = a.get("dur", 0)
			ab["hasteMult"] = a.get("hasteMult", 1)
			ab["cdT"] = 0.0
			ab["lastT"] = -1e9
			abilities.append(ab)
		if bossFight:
			var bE = _leveled_enemy(cfg.boss.type, cfg.boss.get("lv", lvMax))
			bE.HP = roundi(bE.HP * cfg.boss.get("hpMult", 8) * C.BOSS_HP_MULT)
			bE.ATK = roundi(bE.ATK * cfg.boss.get("atkMult", 1.6))
			bE.exp = roundi(bE.exp * 5)
			bE.name = cfg.boss.get("name", "首领")
			var bm = _mk_enemy(bE, true)
			bm["bossId"] = cfg.boss.get("bossId", null)
			enemies.append(bm)

	func _p_atk_eff() -> float:
		return P0.ATK * 100.0 / 106.0 * (1 + atkBuffPct if atkBuffT > 0 else 1.0)

	func _leveled_enemy(id, lv) -> Dictionary:
		var b = C.ENEMIES.get(id, null)
		if b == null: return {}
		var f = lv - 1
		return {"name": b.name, "HP": roundi(b.HP * (1 + 0.18 * f)), "ATK": roundi(b.ATK * (1 + 0.14 * f)), "DEF": b.DEF + roundi(0.6 * f), "Crit": b.Crit, "CritDmg": b.CritDmg, "Hit": b.Hit, "Dodge": roundi(0.8 * lv), "Tough": roundi(0.8 * lv), "ATKspd": b.ATKspd, "exp": roundi(b.get("exp", 0) * (1 + 0.3 * f)), "lv": lv, "type": id}

	func _mk_enemy(E, is_boss) -> Dictionary:
		return {"uid": uid + 1, "id": E.type, "hp": E.HP, "hpMax": E.HP, "x": lane, "cd": (0.5 if is_boss else 0.3), "atkInt": 1.0 / (float(E.get("ATKspd", 100)) / 100.0), "E": E, "lv": E.get("lv", 1), "isBoss": is_boss, "elite": E.get("elite", false), "anim": "idle", "at": 0.0, "dead": false, "deb": {"burnDps": 0.0, "burnT": 0.0, "poiStacks": 0, "poiDps": 0.0, "poiT": 0.0, "chillT": 0.0, "chillMv": 0.0, "chillAs": 0.0, "chillHit": 0.0, "stunT": 0.0, "defDownT": 0.0, "defDownPct": 0.0}}

	func _make_elite(E) -> Dictionary:
		return {"name": "精英·" + E.name, "HP": roundi(E.HP * C.ELITE.hpMult), "ATK": roundi(E.ATK * C.ELITE.atkMult), "DEF": roundi(E.get("DEF", 0) * C.ELITE.defMult), "Crit": E.Crit, "CritDmg": E.CritDmg, "Hit": E.Hit, "Dodge": E.Dodge, "Tough": E.get("Tough", 0), "ATKspd": E.ATKspd, "exp": roundi(E.get("exp", 0) * C.ELITE.expMult), "lv": E.get("lv", 1), "type": E.type, "elite": true}

	func _quality_weights(extra):
		var base = rw if rw else C.ZONE_RARITY[0]
		if not extra: return rw
		var m = 1 + extra
		var res := []
		for p in base:
			res.append(p if (p[0] == "common" or p[0] == "fine") else [p[0], p[1] * m])
		return res

	func _spawn() -> void:
		var E = null
		if spawnTypes != null:
			var id = spawnTypes[floori(rng.next() * spawnTypes.size())]
			var lv = lvMin + floori(rng.next() * (lvMax - lvMin + 1))
			E = _leveled_enemy(id, lv)
		else:
			var id2 = spawnPool[floori(rng.next() * spawnPool.size())]
			var b = C.ENEMIES.get(id2, null)
			if b != null:
				E = {"name": b.name, "HP": b.HP, "ATK": b.ATK, "DEF": b.DEF, "Crit": b.Crit, "CritDmg": b.CritDmg, "Hit": b.Hit, "Dodge": b.Dodge, "ATKspd": b.ATKspd, "exp": b.exp, "lv": 1, "type": id2}
		if E != null:
			if eliteChance > 0 and rng.next() < eliteChance: E = _make_elite(E)
			uid += 1
			enemies.append(_mk_enemy(E, false))

	func _nearest():
		var best = null
		for e in enemies:
			if e.x <= reach + 1 and e.hp > 0:
				if best == null or e.x < best.x: best = e
		return best

	func _apply_enchant(tg) -> void:
		if enchant.has("burn") and rng.next() < enchant.burn.chance:
			var bd = enchant.burn.dps
			if enchant.burn.get("canCrit", false):
				var cr = C.crit_resolve(P0.get("Crit", 0), P0.get("CritDmg", 0))
				if rng.next() * 100 < cr.crit: bd *= (1 + cr.critDmg / 100.0)
			tg.deb.burnDps = max(tg.deb.burnDps, bd)
			tg.deb.burnT = enchant.burn.dur
		if enchant.has("poison") and rng.next() < enchant.poison.chance:
			tg.deb.poiStacks = min(enchant.poison.get("maxStacks", 5), tg.deb.poiStacks + 1)
			tg.deb.poiDps = enchant.poison.dps
			tg.deb.poiT = enchant.poison.dur
		if enchant.has("chill") and rng.next() < enchant.chill.chance:
			var cc = C.ENCH.chillCap
			tg.deb.chillMv = min(cc, enchant.chill.mv)
			tg.deb.chillAs = min(cc, enchant.chill.as)
			tg.deb.chillHit = min(cc, enchant.chill.hit)
			tg.deb.chillT = enchant.chill.dur

	func _kill_enemy(e) -> void:
		e.dead = true
		kills += 1
		exp += e.E.get("exp", 0)
		gold += e.E.get("exp", 0) * C.GOLD_PER_EXP * (2 if e.isBoss else 1)  # 小数累积,整场结算再 round(逐杀 round 会把早期 <1 金币丢成 0,莱布尼茨定位)
		if e.isBoss:
			bossKilled = true
			done = true
			outcome = "win"
			if bag.size() < bagMax:
				var bit = C.roll_drop(rng, drop.equipPool)
				var rs = ["superior", "epic", "epic", "legend"]
				bit.rarity = rs[floori(rng.next() * rs.size())]
				var rn = C.RARITY[bit.rarity].affixes
				var pp = C.AFFIX_POOL.duplicate()
				var af := []
				var z := 0
				while z < rn and pp.size() > 0:
					var kk = floori(rng.next() * pp.size())
					var aa = pp[kk]
					pp.remove_at(kk)
					af.append({"s": aa.s, "v": aa.a + floori(rng.next() * (aa.b - aa.a + 1))})
					z += 1
				bit.affixes = af
				bit.lv = e.get("lv", 1)
				bag.append(bit)
				drops.append(bit)
			return
		if rng.next() < drop.potionRate:
			potions += 1
			P.hp = min(P.hpMax, P.hp + drop.potionHeal)
		var eqRate = drop.equipRate * (C.ELITE.dropMult if e.elite else 1)
		var qb = (C.ELITE.qualityBonus if e.elite else 0) + dropQuality
		if rng.next() < eqRate:
			if bag.size() < bagMax:
				var zs = (C.set_for_zone(cfg.zoneIdx) if (cfg.get("zoneIdx", null) != null and e.get("lv", 1) >= 40) else null)
				var it
				if zs != null and rng.next() < C.SET_DROP_RATE:
					var stid = zs.pieces[floori(rng.next() * zs.pieces.size())]
					it = {"id": stid, "rarity": "epic", "affixes": C.mk_affixes(rng, "epic"), "lv": e.get("lv", 1)}
				else:
					it = C.roll_drop(rng, drop.equipPool, _quality_weights(qb))
					it.lv = e.get("lv", 1)
				bag.append(it)
				drops.append(it)
			else:
				bagFull = true
				done = true
				outcome = "win"

	func step(dt) -> void:
		if done: return
		t += dt
		if t > cap:
			done = true
			outcome = "win"
			return
		if (capTime and t >= capTime) or (capKills and kills >= capKills):
			done = true
			outcome = "win"
			return
		if not bossFight:
			spawnCd -= dt
			if spawnCd <= 0 and enemies.size() < maxField:
				_spawn()
				spawnCd = spawnInt
		elif enemies.size() == 0:
			done = true
			outcome = "win"
			return
		for e in enemies:
			if e.dead: continue
			var mvMul = (1 - e.deb.chillMv if e.deb.chillT > 0 else 1.0) * (0 if e.deb.stunT > 0 else 1)
			if e.x > melee:
				e.x = max(melee, e.x - eSpeed * dt * mvMul)
				e.anim = "idle"
			if e.deb.stunT > 0: e.deb.stunT -= dt
			if e.deb.defDownT > 0: e.deb.defDownT -= dt
			if enemyRegenPct > 0 and e.hp > 0 and e.hp < e.hpMax and e.deb.poiT <= 0:
				e.hp = min(e.hpMax, e.hp + e.hpMax * enemyRegenPct * dt)
			if e.deb.burnT > 0:
				var bd = e.deb.burnDps * dt
				e.hp -= bd
				dmgDealt += bd
				e.deb.burnT -= dt
			if e.deb.poiT > 0:
				var pd = e.hpMax * e.deb.poiDps * e.deb.poiStacks * dt
				e.hp -= pd
				dmgDealt += pd
				e.deb.poiT -= dt
				if e.deb.poiT <= 0: e.deb.poiStacks = 0
			if e.deb.chillT > 0: e.deb.chillT -= dt
			if e.hp <= 0 and not e.dead: _kill_enemy(e)
		if haste > 0: haste -= dt
		if atkBuffT > 0: atkBuffT -= dt
		P.cd -= dt * (1.6 if haste > 0 else 1.0)
		lastHit = null
		lastCast = null
		lastHeal = 0.0
		if (playerRegen > 0 or neiRegenPct > 0) and P.hp > 0:
			regenT += dt
			if regenT >= 1:
				var hAmt = min(playerRegen + roundi(P.hpMax * neiRegenPct), P.hpMax - P.hp)
				if hAmt > 0:
					P.hp += hAmt
					lastHeal = roundi(hAmt)
				regenT -= 1
		if P.cd <= 0:
			var tg = _nearest()
			if tg != null:
				var tgE = tg.E
				if tg.deb.defDownT > 0:
					tgE = {"name": tg.E.name, "ATK": tg.E.ATK, "DEF": roundi(tg.E.DEF * (1 - tg.deb.defDownPct)), "Crit": tg.E.Crit, "CritDmg": tg.E.CritDmg, "Hit": tg.E.Hit, "Dodge": tg.E.Dodge, "Tough": tg.E.get("Tough", 0)}
				var pUse = P0
				if atkBuffT > 0:
					pUse = {"ATK": P0.ATK * (1 + atkBuffPct), "Crit": P0.Crit, "CritDmg": P0.CritDmg, "Hit": P0.Hit, "Dodge": P0.Dodge, "Tough": P0.get("Tough", 0)}
				var s = C.strike(rng, pUse, tgE)
				if s.hit:
					tg.hp -= s.dmg
					dmgDealt += s.dmg
					lastHit = {"x": tg.x, "dmg": s.dmg}
					mana = min(manaMax, mana + manaRegen)
					_apply_enchant(tg)
				tg.at = 0.18
				P.cd = P.atkInt
				if tg.hp <= 0: _kill_enemy(tg)
		for ab in abilities:
			if ab.cdT > 0: ab.cdT -= dt
		if enemies.size() > 0:
			var pick = null
			for ab in abilities:
				if ab.cdT <= 0 and (pick == null or ab.lastT < pick.lastT): pick = ab
			if pick != null and mana >= pick.cost:
				var aE = _p_atk_eff()
				if pick.type == "single":
					var tg1 = _nearest()
					if tg1 != null:
						var sd = _crit_m(pick, roundi(aE * pick.mult))
						tg1.hp -= sd
						dmgDealt += sd
						if pick.get("stunChance", 0) and rng.next() < pick.stunChance: tg1.deb.stunT = max(tg1.deb.stunT, pick.get("stunDur", 0))
						lastCast = {"type": "single", "id": pick.id, "dmg": sd}
						if tg1.hp <= 0: _kill_enemy(tg1)
				elif pick.type == "aoe":
					var rad = pick.get("radius", 220)
					var ad = _crit_m(pick, roundi(aE * pick.mult))
					for en in enemies:
						if en.x <= melee + rad and not en.dead:
							en.hp -= ad
							dmgDealt += ad
							if pick.get("stunChance", 0) and rng.next() < pick.stunChance: en.deb.stunT = max(en.deb.stunT, pick.get("stunDur", 0))
							if en.hp <= 0: _kill_enemy(en)
					lastCast = {"type": "aoe", "id": pick.id, "dmg": ad}
				elif pick.type == "haste":
					haste = pick.dur
					lastCast = {"type": "haste", "id": pick.id}
				elif pick.type == "buff":
					if pick.get("atkPct", 0):
						atkBuffT = pick.dur
						atkBuffPct = pick.atkPct
					if pick.get("hasteDur", 0): haste = max(haste, pick.hasteDur)
					if pick.get("healPct", 0): P.hp = min(P.hpMax, P.hp + roundi(P.hpMax * pick.healPct))
					lastCast = {"type": "buff", "id": pick.id}
				elif pick.type == "debuff":
					var rad2 = pick.get("radius", 220)
					for en2 in enemies:
						if en2.x <= melee + rad2 and not en2.dead:
							en2.deb.defDownT = pick.dur
							en2.deb.defDownPct = pick.get("defDown", 0)
							if pick.get("poiPct", 0):
								en2.deb.poiStacks = min(5, en2.deb.poiStacks + 1)
								en2.deb.poiDps = pick.poiPct
								en2.deb.poiT = pick.dur
							if pick.get("stunChance", 0) and rng.next() < pick.stunChance: en2.deb.stunT = max(en2.deb.stunT, pick.get("stunDur", 0))
					lastCast = {"type": "debuff", "id": pick.id}
				mana -= pick.cost
				pick.cdT = pick.cd
				pick.lastT = t
		for e in enemies:
			if e.dead: continue
			if e.deb.stunT > 0:
				if e.at > 0: e.at -= dt
				continue
			if e.x <= melee:
				var chilled = e.deb.chillT > 0
				e.cd -= dt * (1 - e.deb.chillAs if chilled else 1.0)
				if e.cd <= 0:
					var atkE = e.E
					if chilled and e.deb.chillHit:
						atkE = {"name": e.E.name, "ATK": e.E.ATK, "DEF": e.E.DEF, "Crit": e.E.Crit, "CritDmg": e.E.CritDmg, "Hit": e.E.Hit * (1 - e.deb.chillHit), "Dodge": e.E.Dodge, "Tough": e.E.get("Tough", 0)}
					var s2 = C.strike(rng, atkE, P0)
					if s2.hit:
						var dmgIn = (roundi(s2.dmg * (1 - neiDR)) if neiDR > 0 else s2.dmg)
						P.hp -= dmgIn
						dmgTaken += dmgIn
						if neiReflect > 0 and not e.dead:
							e.hp -= roundi(dmgIn * neiReflect)
							if e.hp <= 0: _kill_enemy(e)
					e.cd = e.atkInt
					e.at = 0.18
			if e.at > 0: e.at -= dt
		var alive := []
		for q in enemies:
			if not q.dead: alive.append(q)
		enemies = alive
		if P.hp <= 0:
			done = true
			outcome = "lose"

	func _crit_m(pick, dmg) -> int:
		if pick.get("canCrit", false):
			var cr = C.crit_resolve(P0.get("Crit", 0), P0.get("CritDmg", 0))
			if rng.next() * 100 < cr.crit: return roundi(dmg * (1 + cr.critDmg / 100.0))
		return dmg

	func is_done() -> bool:
		return done

	func state() -> Dictionary:
		return {"P": P, "enemies": enemies, "kills": kills, "t": t, "lastHit": lastHit, "lastHeal": lastHeal, "lane": lane, "melee": melee, "mana": mana, "manaMax": manaMax, "haste": haste, "lastCast": lastCast}

	func result() -> Dictionary:
		return {"outcome": outcome if outcome else "win", "ttk": snappedf(t, 0.01), "kills": kills, "drops": drops, "expGained": exp, "goldGained": roundi(gold), "potionsUsed": potions, "hpRemaining": max(0, roundi(P.hp)), "manaRemaining": max(0, roundi(mana)), "bagFull": bagFull, "bossKilled": bossKilled, "dmgDealt": dmgDealt, "dmgTaken": dmgTaken}
