extends Control
# 临时自检场景:验证 combat_core.gd(1:1 移植)在 Godot 4.6 能跑起来。
# 后续阶段会换成真正的家园/战斗/UI 场景;现在先证明数值核心可运行 + 给莱布尼茨对拍入口。

func _ready() -> void:
	var lbl := RichTextLabel.new()
	lbl.set_anchors_preset(Control.PRESET_FULL_RECT)
	lbl.bbcode_enabled = true
	lbl.add_theme_font_size_override("normal_font_size", 15)
	add_child(lbl)

	var out: Array[String] = []
	out.append("[b]桌面武林 · Godot 4.6 移植 — combat_core 自检[/b]")
	out.append("(阶段1:数值核心 1:1 移植自 src/combat-core.js;后续补家园/战斗/UI 场景)\n")

	# Lv22 白板
	var b = CombatCore.build_to_combat({"level": 22, "gongfa": {}, "gongfaEquip": {}})
	out.append("Lv22 白板属性: HP=%d ATK=%d DEF=%d 命中=%d 战力=%d" % [int(b.attrs.HP), int(b.attrs.ATK), int(b.attrs.DEF), int(b.attrs.Hit), CombatCore.combat_power(b.attrs)])

	# 一场战斗(土匪×30,固定seed→可对拍)
	var r = CombatCore.simulate_realtime({"attrs": b.attrs, "seed": 7, "abilities": b.abilities, "manaRegen": b.manaRegen, "spawnTypes": ["bandit"], "lvMin": 3, "lvMax": 5, "cap": 60, "capKills": 30, "zoneIdx": 1, "bagMax": 30})
	out.append("战斗(土匪×30,seed7): 结果=%s 杀=%d 用时=%.1fs 剩血=%d 掉落=%d 金=%d" % [r.outcome, r.kills, r.ttk, r.hpRemaining, r.drops.size(), int(r.goldGained)])

	# 功法系统
	out.append("功法总数: %d (期望 180 = 18线×10档)" % CombatCore.GONGFA.size())

	# 装拳套+拳法→拳技能应触发;装刀→不触发(被动不受影响)
	var eqp_quan = {"weapon": {"tid": "weapon", "lv": 30, "wtype": "quan", "affixes": []}}
	var b2 = CombatCore.build_to_combat({"level": 30, "gongfa": {"quan_t3": 10, "jian_t3": 10}, "gongfaEquip": {"wai1": "quan_t3", "wai2": "jian_t3"}, "equipped": eqp_quan})
	var ids2: Array = []
	for a in b2.abilities: ids2.append(a.id)
	out.append("装拳套+拳法/剑法: 触发技能=%s (应只有拳,剑被武器门槛挡)" % str(ids2))

	# 内功特效 build
	var b3 = CombatCore.build_to_combat({"level": 40, "gongfa": {"xuanjia_t4": 10, "lingshe_t4": 10}, "gongfaEquip": {"nei": "xuanjia_t4"}})
	out.append("装玄甲(减伤): neiDR=%.3f" % b3.neiDR)

	# 几个 gfActiveDesc
	out.append("\n[b]功法主动示例:[/b]")
	for id in ["quan_t9", "dao_t4", "qin_t4", "qimen_t9", "huichun_t5", "ningyuan_t4"]:
		var g = CombatCore.gongfa_by_id(id)
		out.append("  %s(%s阶): %s" % [g.name, g.tierName, str(CombatCore.gf_active_desc(g, 10, 40))])

	lbl.text = "\n".join(out)
	print("\n".join(out))  # 也打到控制台,方便对拍
