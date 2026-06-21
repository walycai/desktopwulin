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
	}
	_recalc()

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

func home_sp_left() -> int:
	return max(0, home_sp_total() - int(s.get("homeSpSpent", 0)))

# 战斗结算回流:掉落入库 + 经验/金币 → 升级 + boss击杀解锁下一区。返回 {lvups,drops,unlocked_zone}
func apply_combat_result(r: Dictionary) -> Dictionary:
	var lvups := 0
	# 掉落装备入仓库(P3 用),保留 稀有度/等级/词缀/武器类型
	var drops = r.get("drops", [])
	for d in drops:
		var item = d.duplicate(true) if typeof(d) == TYPE_DICTIONARY else {}
		item["uid"] = int(s.equipSeq)
		s.equipSeq = int(s.equipSeq) + 1
		s.warehouse.append(item)
	s.gold = int(s.gold) + int(r.get("goldGained", 0))
	s.exp = int(s.exp) + int(r.get("expGained", 0))
	while s.exp >= CombatCore.next_exp(int(s.level)):
		s.exp -= CombatCore.next_exp(int(s.level))
		s.level = int(s.level) + 1
		lvups += 1
	s.sp = max(0, int(s.level) - 1)  # 技能点=每级+1(spForLevel=lv-1)
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
				_recalc()
				changed.emit()
				return
	_default()
	changed.emit()
