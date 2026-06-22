extends Node
# P1 共享养成状态(autoload=Player):左家园 + 右历练 共用的单一数据源。镜像 H5 src/game.js stats。
# 数值/曲线全走 CombatCore(与 sim 同源)。3 存档位持久化到 user://save_<slot>.json。

signal changed  # 状态变化(升级/金币/装备…)→ UI 刷新

const SLOTS := 3
var slot := 1
var s := {}  # 状态字典(镜像 H5 stats 的迁移子集)

# 10 地图分区(P2,迁移自 H5 game.js ZONES)。boss: type/lv/hpMult/atkMult/name/bossId
const ZONES := [
	{"id": "niujia", "name": "牛家村", "lvMin": 1, "lvMax": 1, "types": ["thug"], "boss": {"type": "thug", "lv": 2, "hpMult": 20, "atkMult": 1.5, "name": "山贼王", "bossId": "shanzeiwang"}},
	{"id": "milin", "name": "幽密林", "lvMin": 3, "lvMax": 5, "types": ["thug", "bandit"], "boss": {"type": "bandit", "lv": 6, "hpMult": 20, "atkMult": 1.5, "name": "幽林鬼影", "bossId": "youlinguiying"}},
	{"id": "qingcheng", "name": "青城派", "lvMin": 6, "lvMax": 8, "types": ["bandit", "sect_novice"], "boss": {"type": "sect_novice", "lv": 9, "hpMult": 20, "atkMult": 1.5, "name": "青城逆徒", "bossId": "qingchengnitu"}},
	{"id": "xuedao", "name": "血刀门", "lvMin": 9, "lvMax": 12, "types": ["sect_novice", "xie_jiao"], "boss": {"type": "xie_jiao", "lv": 13, "hpMult": 20, "atkMult": 1.5, "name": "血刀老祖", "bossId": "xuedaolaozu"}},
	{"id": "mojiao", "name": "魔教总坛", "lvMin": 13, "lvMax": 17, "types": ["xie_jiao", "mo_jiao"], "boss": {"type": "mo_jiao", "lv": 18, "hpMult": 20, "atkMult": 1.5, "name": "天魔教主", "bossId": "tianmojiaozhu"}},
	{"id": "huangquan", "name": "黄泉古道", "lvMin": 18, "lvMax": 24, "types": ["mo_jiao", "gui_zu"], "boss": {"type": "gui_zu", "lv": 25, "hpMult": 20, "atkMult": 1.5, "name": "黄泉鬼王", "bossId": "huangquanguiwang"}},
	{"id": "luosha", "name": "罗刹海市", "lvMin": 25, "lvMax": 33, "types": ["gui_zu", "yao_xiu"], "boss": {"type": "yao_xiu", "lv": 34, "hpMult": 20, "atkMult": 1.5, "name": "罗刹女君", "bossId": "luoshanvjun"}},
	{"id": "yaolin", "name": "妖兽森林", "lvMin": 34, "lvMax": 45, "types": ["yao_xiu", "mo_jiang"], "boss": {"type": "mo_jiang", "lv": 46, "hpMult": 20, "atkMult": 1.5, "name": "妖兽之王", "bossId": "yaoshouwang"}},
	{"id": "jiuyou", "name": "九幽魔渊", "lvMin": 46, "lvMax": 60, "types": ["mo_jiang", "gu_mo"], "boss": {"type": "gu_mo", "lv": 61, "hpMult": 20, "atkMult": 1.5, "name": "九幽魔尊", "bossId": "jiuyoumozun"}},
	{"id": "tianwai", "name": "天外魔域", "lvMin": 61, "lvMax": 80, "types": ["gu_mo", "mo_jiang"], "boss": {"type": "gu_mo", "lv": 82, "hpMult": 20, "atkMult": 1.5, "name": "万古魔神", "bossId": "wangumoshen"}},
]

func cur_zone() -> Dictionary:
	return ZONES[clampi(int(s.get("zone", 0)), 0, ZONES.size() - 1)]

# 技能树(P3,基础节点迁移自 H5 SKILL_TREES;深度EXT节点后续)。效果由 CombatCore.build_to_combat 应用
const SKILL_TREES := [
	{"id": "warrior", "name": "力量战士", "nodes": [
		{"id": "foundation", "name": "武者根基", "max": 3, "row": 0, "col": 2, "reqPts": 0, "reqLv": 1, "prereq": [], "desc": "气血+15、攻击+2/级"},
		{"id": "str_atk", "name": "千钧之力", "max": 5, "row": 1, "col": 0, "reqPts": 3, "reqLv": 2, "prereq": ["foundation"], "desc": "攻击+4/级"},
		{"id": "crit", "name": "致命强击", "max": 5, "row": 2, "col": 0, "reqPts": 10, "reqLv": 5, "prereq": ["str_atk"], "desc": "暴击率+2%/级"},
		{"id": "critdmg", "name": "狂暴打击", "max": 5, "row": 3, "col": 0, "reqPts": 18, "reqLv": 8, "prereq": ["crit"], "desc": "暴击伤害+10%/级"},
		{"id": "whirlwind", "name": "旋风斩", "max": 3, "row": 4, "col": 0, "reqPts": 28, "reqLv": 12, "prereq": ["critdmg"], "active": true, "desc": "主动·满蓝自动群攻"},
		{"id": "weapon_mastery", "name": "重兵精通", "max": 5, "row": 1, "col": 2, "reqPts": 3, "reqLv": 3, "prereq": ["foundation"], "desc": "总攻击+3%/级"},
		{"id": "hit", "name": "百战之身", "max": 3, "row": 2, "col": 1, "reqPts": 10, "reqLv": 5, "prereq": ["weapon_mastery"], "desc": "命中+3/级"},
		{"id": "atkspd", "name": "疾风步", "max": 3, "row": 2, "col": 3, "reqPts": 10, "reqLv": 6, "prereq": ["weapon_mastery"], "desc": "攻速+3/级"},
		{"id": "equip_atk", "name": "力压千钧", "max": 3, "row": 3, "col": 2, "reqPts": 18, "reqLv": 8, "prereq": ["hit"], "desc": "装备攻击+5%/级"},
		{"id": "str_hp", "name": "强健体魄", "max": 5, "row": 1, "col": 4, "reqPts": 3, "reqLv": 2, "prereq": ["foundation"], "desc": "气血+30/级"},
		{"id": "str_def", "name": "铜皮铁骨", "max": 5, "row": 2, "col": 4, "reqPts": 10, "reqLv": 5, "prereq": ["str_hp"], "desc": "防御+3/级"},
		{"id": "equip_hp", "name": "负重前行", "max": 3, "row": 3, "col": 4, "reqPts": 18, "reqLv": 8, "prereq": ["str_def"], "desc": "装备气血+5%/级"},
		{"id": "berserk", "name": "狂暴", "max": 1, "row": 4, "col": 4, "reqPts": 28, "reqLv": 12, "prereq": ["equip_hp"], "active": true, "desc": "主动·满蓝自动狂暴(出手大幅加快)"},
	]},
	{"id": "enchant", "name": "内功附魔流", "nodes": [
		{"id": "range", "name": "内功射程", "max": 5, "row": 0, "col": 2, "reqPts": 0, "reqLv": 1, "prereq": [], "desc": "远程攻击:射程随功力增长"},
		{"id": "fire_ignite", "name": "点燃", "max": 3, "row": 1, "col": 0, "reqPts": 3, "reqLv": 3, "prereq": ["range"], "desc": "命中几率点燃(灼烧DoT)"},
		{"id": "fire_blaze", "name": "烈焰", "max": 5, "row": 2, "col": 0, "reqPts": 8, "reqLv": 8, "prereq": ["fire_ignite"], "desc": "灼烧每秒伤害+/级"},
		{"id": "fire_inferno", "name": "燎原", "max": 5, "row": 3, "col": 0, "reqPts": 16, "reqLv": 15, "prereq": ["fire_blaze"], "desc": "灼烧持续时间+/级"},
		{"id": "fire_conflag", "name": "焚天", "max": 3, "row": 4, "col": 0, "reqPts": 24, "reqLv": 22, "prereq": ["fire_inferno"], "desc": "灼烧伤害增幅×/级"},
		{"id": "ice_frost", "name": "冰霜", "max": 3, "row": 1, "col": 2, "reqPts": 3, "reqLv": 3, "prereq": ["range"], "desc": "命中几率冰冻(减移速/攻速/命中)"},
		{"id": "ice_glacier", "name": "玄冰", "max": 5, "row": 2, "col": 2, "reqPts": 8, "reqLv": 8, "prereq": ["ice_frost"], "desc": "冰冻减敌移速+/级"},
		{"id": "ice_freeze", "name": "凝寒", "max": 5, "row": 3, "col": 2, "reqPts": 16, "reqLv": 15, "prereq": ["ice_glacier"], "desc": "冰冻额外减攻速/命中+/级"},
		{"id": "ice_permafrost", "name": "万载玄冰", "max": 3, "row": 4, "col": 2, "reqPts": 24, "reqLv": 22, "prereq": ["ice_freeze"], "desc": "冰冻持续&触发几率+/级"},
		{"id": "poison_venom", "name": "淬毒", "max": 3, "row": 1, "col": 4, "reqPts": 3, "reqLv": 3, "prereq": ["range"], "desc": "命中几率中毒(DoT)"},
		{"id": "poison_toxin", "name": "剧毒", "max": 5, "row": 2, "col": 4, "reqPts": 8, "reqLv": 8, "prereq": ["poison_venom"], "desc": "中毒每秒伤害+/级"},
		{"id": "poison_plague", "name": "瘟疫", "max": 5, "row": 3, "col": 4, "reqPts": 16, "reqLv": 15, "prereq": ["poison_toxin"], "desc": "中毒持续时间+/级"},
		{"id": "poison_corrode", "name": "腐蚀", "max": 3, "row": 4, "col": 4, "reqPts": 24, "reqLv": 22, "prereq": ["poison_plague"], "desc": "中毒伤害增幅×/级"},
	]},
]

func _tree_by_id(tid: String) -> Dictionary:
	for t in SKILL_TREES:
		if t.id == tid: return t
	return SKILL_TREES[0]

func _node_tree_id(node_id: String) -> String:
	for t in SKILL_TREES:
		for n in t.nodes:
			if n.id == node_id: return t.id
	return ""

func _node_by_id(node_id: String):
	for t in SKILL_TREES:
		for n in t.nodes:
			if n.id == node_id: return n
	return null

func skill_rank(id: String) -> int:
	return int(s.skills.get(id, 0))

func skill_spent(tree_id := "") -> int:
	var tot := 0
	for k in s.skills:
		if tree_id == "" or _node_tree_id(k) == tree_id:
			tot += int(s.skills[k])
	return tot

func sp_total() -> int:
	return max(0, int(s.level) - 1)

func sp_left() -> int:
	return sp_total() - skill_spent()

func node_lock_reason(n: Dictionary) -> String:
	if int(s.level) < int(n.reqLv): return "需等级 Lv%d" % int(n.reqLv)
	if skill_spent(_node_tree_id(n.id)) < int(n.reqPts): return "需本树已投 %d 点" % int(n.reqPts)
	for pid in n.prereq:
		if skill_rank(pid) < 1:
			var pn = _node_by_id(pid)
			return "需先学「%s」" % (pn.name if pn else pid)
	return ""

func _refund_blocked(id: String):
	var tr = _tree_by_id(_node_tree_id(id))
	for m in tr.nodes:
		if skill_rank(m.id) > 0 and id in m.prereq: return m
	return null

func spend_skill(id: String) -> bool:
	var n = _node_by_id(id)
	if n == null or sp_left() <= 0 or skill_rank(id) >= int(n.max): return false
	if node_lock_reason(n) != "": return false
	s.skills[id] = skill_rank(id) + 1
	_recalc(); save_slot(slot); changed.emit()
	return true

func refund_skill(id: String) -> bool:
	if skill_rank(id) <= 0: return false
	if skill_rank(id) == 1 and _refund_blocked(id) != null: return false
	s.skills[id] = skill_rank(id) - 1
	if s.skills[id] == 0: s.skills.erase(id)
	_recalc(); save_slot(slot); changed.emit()
	return true

func reset_skills() -> void:
	s.skills = {}
	_recalc(); save_slot(slot); changed.emit()

func _ready() -> void:
	load_slot(slot)

func _default() -> void:
	s = {
		"level": 1, "exp": 0, "gold": 0,
		"hp": 0, "hpMax": 0, "mana": 0, "manaMax": 0,
		"sp": 0, "skills": {},
		"gongfa": {}, "gongfaEquip": {"nei": null, "wai1": null, "wai2": null, "qing": null},
		"equipped": {}, "trainId": null,
		"zone": 0, "unlocked": 0,        # 当前区 / 已解锁最高区(打过boss解锁下一区)
		"warehouse": [], "equipSeq": 1,  # 掉落装备仓库(P3 用)+ 装备uid计数
		"homeSkills": {}, "homeSpSpent": 0, "autoOn": {},
		"sortieActive": false, "bossRequested": false,  # 出战状态机:默认在家修整,不自动开打(WalyCai:前期能修炼不被迫送死)
	}
	_grant_starter()  # 新手白装 + 白功法(对齐 H5:开荒不裸奔)
	_recalc()

# 新手开荒装备/功法(对齐 H5 game.js,幂等=新档发放+老档迁移补发):
# 1级拳套(quan)+1级衣服 直接穿上→开局能刷怪+用拳法;其余 5 部位进仓库;
# 每系白功法(tier0)免费送 Lv1;白拳法 quan_t0 自动装 wai1;默认修炼玄甲功。
func _grant_starter() -> void:
	# 无武器(新档或裸装老档)→ 发整套新手白装(拳套+衣服穿上,其余进仓库)
	if s.equipped.get("weapon", null) == null:
		s.equipped["weapon"] = {"uid": _next_uid(), "tid": "weapon", "lv": 1, "rarity": "common", "affixes": [], "wtype": "quan"}
		if s.equipped.get("body", null) == null:
			s.equipped["body"] = {"uid": _next_uid(), "tid": "body", "lv": 1, "rarity": "common", "affixes": []}
		for tid in ["head", "legs", "neck", "ring", "belt"]:
			s.warehouse.append({"uid": _next_uid(), "tid": tid, "lv": 1, "rarity": "common", "affixes": []})
	# 白功法(每系 tier0)免费送 Lv1(幂等:缺则补)
	for g in CombatCore.GONGFA:
		if int(g.get("tier", 0)) == 0 and not s.gongfa.has(g.id):
			s.gongfa[g.id] = {"lv": 1, "prof": 0}
	if s.gongfaEquip.get("wai1", null) == null and CombatCore.gongfa_by_id("quan_t0") != null:
		s.gongfaEquip["wai1"] = "quan_t0"   # 配拳套即可用拳技
	if (s.get("trainId", null) == null or CombatCore.gongfa_by_id(s.get("trainId", null)) == null) and CombatCore.gongfa_by_id("xuanjia_t0") != null:
		s.trainId = "xuanjia_t0"            # 默认打坐修炼目标

func _next_uid() -> int:
	var u = int(s.equipSeq)
	s.equipSeq = u + 1
	return u

func reset() -> void:
	_default()
	changed.emit()

# 给 CombatCore.build_to_combat 的 build 描述(对齐 H5 curBuild)
func build() -> Dictionary:
	var gf := {}
	for id in s.gongfa:
		var g = s.gongfa[id]
		gf[id] = (int(g.get("lv", 0)) if typeof(g) == TYPE_DICTIONARY else int(g))
	return {"level": int(s.level), "equipped": s.equipped, "skills": s.skills, "gongfa": gf, "gongfaEquip": s.gongfaEquip}

func attrs() -> Dictionary:
	return CombatCore.build_to_combat(build()).attrs

func combat_power() -> int:
	return CombatCore.combat_power(attrs())

func _recalc() -> void:
	var a = attrs()
	s.hpMax = int(a.HP)
	s.manaMax = int(a.get("Mana", 0))
	if s.hp <= 0 or s.hp > s.hpMax:
		s.hp = s.hpMax
	if s.mana > s.manaMax:
		s.mana = s.manaMax

func home_sp_total() -> int:
	return int(int(s.level) / 10)  # 每10级+1居家技能点(WalyCai:取消环境值,改级别制)

# 战斗结算回流:掉落入库 + 经验/金币 → 升级 + boss击杀解锁下一区。返回 {lvups,drops,unlocked_zone}
func apply_combat_result(r: Dictionary) -> Dictionary:
	var lvups := 0
	# 掉落装备入仓库(P3 用),保留 稀有度/等级/词缀/武器类型
	var drops = r.get("drops", [])
	for d in drops:
		if typeof(d) != TYPE_DICTIONARY: continue
		# 掉落用 id 字段,装备/item_stats 用 tid → 统一存为 tid(对齐 H5 bankResult)
		var item = {
			"uid": int(s.equipSeq),
			"tid": d.get("id", d.get("tid", "")),
			"lv": int(d.get("lv", 1)),
			"rarity": d.get("rarity", "common"),
			"affixes": d.get("affixes", []),
		}
		if d.has("wtype") and d.wtype != null: item["wtype"] = d.wtype
		s.equipSeq = int(s.equipSeq) + 1
		s.warehouse.append(item)
	# 战斗后持久气血/内力带回(对齐 H5 bankResult):败=20%上限,胜=剩余
	if r.get("outcome", "win") == "lose":
		s.hp = max(1, int(s.hpMax * 0.2))
	else:
		s.hp = max(1, int(r.get("hpRemaining", s.hpMax)))
	s.mana = clampi(int(r.get("manaRemaining", 0)), 0, int(s.manaMax))
	s.gold = int(s.gold) + int(r.get("goldGained", 0))
	s.exp = int(s.exp) + int(r.get("expGained", 0))
	while s.exp >= CombatCore.next_exp(int(s.level)):
		s.exp -= CombatCore.next_exp(int(s.level))
		s.level = int(s.level) + 1
		lvups += 1
# 技能点为计算值: sp_total=lv-1, sp_left=total-已投, 不再存 s.sp(见 sp_* 方法)
	# 击败当前区 boss → 解锁并前往下一区(挂机自动推图)
	var unlocked_zone := -1
	if r.get("bossKilled", false):
		var ni = int(s.zone) + 1
		if ni < ZONES.size():
			if ni > int(s.get("unlocked", 0)):
				s.unlocked = ni
				unlocked_zone = ni
			s.zone = ni  # 自动进新区继续挂机
	if lvups > 0 or unlocked_zone >= 0:
		_recalc()
	save_slot(slot)
	changed.emit()
	return {"lvups": lvups, "drops": drops.size(), "unlocked_zone": unlocked_zone}

# ---- 装备/仓库(P3)----
const EQUIP_SLOTS := ["weapon", "head", "body", "legs", "neck", "ring", "belt"]

func slot_of(item) -> String:
	var tid = item.get("tid", "")
	var d = CombatCore.SLOT_DEF.get(tid, null)
	if d != null: return d.type
	return str(tid)

func item_name(item) -> String:
	return CombatCore.item_name(item)

func item_stats(item) -> Dictionary:
	return CombatCore.item_stats(item)

func rarity_color(item) -> Color:
	var r = CombatCore.RARITY.get(item.get("rarity", "common"), null)
	return Color(r.color) if r else Color(0.6, 0.6, 0.6)

func _wh_index(uid: int) -> int:
	for i in range(s.warehouse.size()):
		if int(s.warehouse[i].get("uid", -1)) == uid: return i
	return -1

# 穿上后的战力(用于对比);不改动状态
func cp_after_equip(item) -> int:
	var es = slot_of(item)
	var saved = s.equipped.get(es, null)
	s.equipped[es] = item
	var cp = combat_power()
	if saved == null: s.equipped.erase(es)
	else: s.equipped[es] = saved
	return cp

func equip_item(uid: int) -> void:
	var idx = _wh_index(uid)
	if idx < 0: return
	var item = s.warehouse[idx]
	var es = slot_of(item)
	s.warehouse.remove_at(idx)
	if s.equipped.has(es) and s.equipped[es] != null:
		s.warehouse.append(s.equipped[es])  # 换下的回仓库
	s.equipped[es] = item
	_recalc()
	save_slot(slot)
	changed.emit()

func sell_item(uid: int) -> int:
	var idx = _wh_index(uid)
	if idx < 0: return 0
	var it = s.warehouse[idx]
	var base = float(CombatCore.SELL.get(it.get("rarity", "common"), 0))
	var af = it.get("affixes", []).size()
	# 精算(sell_price)每级+12% + 词缀加成(对齐 H5)
	var g = roundi(base * (1.0 + af * 0.15) * (1.0 + home_rank("sell_price") * 0.12))
	s.warehouse.remove_at(idx)
	s.gold = int(s.gold) + g
	save_slot(slot)
	changed.emit()
	return g

# ---- 居家技能(P4)----
const HOME_SKILLS := [
	{"id": "spawn_speed", "name": "诱敌", "max": 1, "desc": "历练刷怪速度+50%(可开关)"},
	{"id": "sell_price", "name": "精算", "max": 5, "desc": "装备售价+12%/级"},
	{"id": "drop_quality", "name": "寻宝", "max": 5, "desc": "高品质掉落概率+/级"},
	{"id": "elite_chance", "name": "群英", "max": 5, "desc": "精英怪概率+3%/级"},
]
const HOME_AUTO := [
	{"id": "auto_sleep", "name": "回家自动睡觉", "desc": "受伤自动上床回血", "excl": ""},
	{"id": "auto_meditate", "name": "满血自动打坐", "desc": "满血自动打坐修炼(与自动历练互斥)", "excl": "auto_sortie"},
	{"id": "auto_sortie", "name": "满血自动历练", "desc": "满血自动进上次地图(与自动打坐互斥)", "excl": "auto_meditate"},
]

func home_rank(id: String) -> int:
	return int(s.homeSkills.get(id, 0))

func home_spent() -> int:
	var t := 0
	for k in s.homeSkills: t += int(s.homeSkills[k])
	return t

func home_sp_left() -> int:
	return max(0, home_sp_total() - home_spent())

func home_adj(id: String, d: int) -> void:
	var n = null
	for x in HOME_SKILLS:
		if x.id == id: n = x
	if n == null: return
	if d > 0:
		if home_sp_left() <= 0 or home_rank(id) >= int(n.max): return
		s.homeSkills[id] = home_rank(id) + 1
	else:
		if home_rank(id) <= 0: return
		s.homeSkills[id] = home_rank(id) - 1
		if s.homeSkills[id] == 0: s.homeSkills.erase(id)
	_recalc(); save_slot(slot); changed.emit()

func learn_auto(id: String) -> void:
	if home_rank(id) > 0 or home_sp_left() <= 0: return
	s.homeSkills[id] = 1
	save_slot(slot); changed.emit()

func auto_on(id: String) -> bool:
	return home_rank(id) > 0 and bool(s.autoOn.get(id, false))

func toggle_auto(id: String) -> void:
	if home_rank(id) <= 0: return
	var on = not bool(s.autoOn.get(id, false))
	s.autoOn[id] = on
	if on:
		for x in HOME_AUTO:
			if x.id == id and x.excl != "": s.autoOn[x.excl] = false
	save_slot(slot); changed.emit()

# 居家技能 → 战斗 cfg(对齐 H5 startCombat)
func combat_elite_chance() -> float: return home_rank("elite_chance") * 0.03
func combat_drop_quality() -> float: return home_rank("drop_quality") * 0.2
func combat_spawn_interval() -> float:
	return 1.8 * ((1.0 / 1.5) if (home_rank("spawn_speed") > 0 and not bool(s.get("spawnSpeedOff", false))) else 1.0)

# ---- 功法系统(P3)----
func gf_state(id: String) -> Dictionary:
	var g = s.gongfa.get(id, null)
	if g == null: return {"lv": 0, "prof": 0}
	return {"lv": int(g.get("lv", 0)), "prof": int(g.get("prof", 0))}

func gf_owned_ids() -> Array:
	var out := []
	for g in CombatCore.GONGFA:
		if s.gongfa.has(g.id): out.append(g.id)
	return out

func gf_buy(id: String) -> bool:
	if s.gongfa.has(id): return false
	var g = CombatCore.gongfa_by_id(id)
	if g == null or int(s.gold) < int(g.price): return false
	s.gold = int(s.gold) - int(g.price)
	s.gongfa[id] = {"lv": 1, "prof": 0}
	_recalc(); save_slot(slot); changed.emit()
	return true

func _slot_sys(slot_key: String) -> String:
	for sl in CombatCore.GONGFA_SLOTS:
		if sl.key == slot_key: return sl.sys
	return ""

func gf_equip(slot_key: String, id: String) -> bool:
	var g = CombatCore.gongfa_by_id(id)
	if g == null or not s.gongfa.has(id): return false
	if g.sys != _slot_sys(slot_key): return false  # 系别需匹配槽位
	# 同一功法已装其他槽则先卸
	for k in s.gongfaEquip:
		if s.gongfaEquip[k] == id: s.gongfaEquip[k] = null
	s.gongfaEquip[slot_key] = id
	_recalc(); save_slot(slot); changed.emit()
	return true

func gf_unequip(slot_key: String) -> void:
	s.gongfaEquip[slot_key] = null
	_recalc(); save_slot(slot); changed.emit()

func set_train(id: String) -> void:
	s.trainId = id
	save_slot(slot); changed.emit()

# 打坐修炼:给当前 trainId 加熟练度,够则升级(P4 打坐每秒调用)
func train_gongfa(amt: int) -> void:
	var id = s.get("trainId", null)
	if id == null or not s.gongfa.has(id): return
	var st = s.gongfa[id]
	if int(st.get("lv", 1)) >= CombatCore.GONGFA_MAXLV: return
	st["prof"] = int(st.get("prof", 0)) + amt
	while int(st.lv) < CombatCore.GONGFA_MAXLV and int(st.prof) >= CombatCore.gf_prof_req(int(st.lv)):
		st["prof"] = int(st.prof) - CombatCore.gf_prof_req(int(st.lv))
		st["lv"] = int(st.lv) + 1
	_recalc(); changed.emit()

func _path(n: int) -> String:
	return "user://save_%d.json" % n

func save_slot(n: int) -> void:
	var f = FileAccess.open(_path(n), FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(s))
		f.close()

func load_slot(n: int) -> void:
	slot = n
	if FileAccess.file_exists(_path(n)):
		var f = FileAccess.open(_path(n), FileAccess.READ)
		if f:
			var d = JSON.parse_string(f.get_as_text())
			f.close()
			if typeof(d) == TYPE_DICTIONARY:
				_default()  # 先铺默认键,再覆盖(老存档缺字段也安全)
				for k in d:
					s[k] = d[k]
				_grant_starter()  # 老档迁移:补发新手白装/白功法(幂等)
				_recalc()
				changed.emit()
				return
	_default()
	changed.emit()
