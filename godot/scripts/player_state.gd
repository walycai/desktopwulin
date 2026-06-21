extends Node
# P1 共享养成状态(autoload=Player):左家园 + 右历练 共用的单一数据源。镜像 H5 src/game.js stats。
# 数值/曲线全走 CombatCore(与 sim 同源)。3 存档位持久化到 user://save_<slot>.json。

signal changed  # 状态变化(升级/金币/装备…)→ UI 刷新

const SLOTS := 3
var slot := 1
var s := {}  # 状态字典(镜像 H5 stats 的迁移子集)

func _ready() -> void:
	load_slot(slot)

func _default() -> void:
	s = {
		"level": 1, "exp": 0, "gold": 0,
		"hp": 0, "hpMax": 0, "mana": 0, "manaMax": 0,
		"sp": 0, "skills": {},
		"gongfa": {}, "gongfaEquip": {"nei": null, "wai1": null, "wai2": null, "qing": null},
		"equipped": {}, "trainId": null, "zone": 0,
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

# 战斗结算回流:经验/金币 → 升级。返回 {lvups}
func apply_combat_result(r: Dictionary) -> Dictionary:
	var lvups := 0
	s.gold = int(s.gold) + int(r.get("goldGained", 0))
	s.exp = int(s.exp) + int(r.get("expGained", 0))
	while s.exp >= CombatCore.next_exp(int(s.level)):
		s.exp -= CombatCore.next_exp(int(s.level))
		s.level = int(s.level) + 1
		lvups += 1
	s.sp = max(0, int(s.level) - 1)  # 技能点=每级+1(spForLevel=lv-1)
	if lvups > 0:
		_recalc()
	save_slot(slot)
	changed.emit()
	return {"lvups": lvups}

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
