extends Node2D
# 历练:横版自动战斗(桌面横条右panel)。战斗逻辑用 CombatCore.CombatSim(与 H5 src/combat-core.js 同源),
# 本脚本只做渲染:主角+敌人精灵、血条、漂浮伤害、内力/技能、HUD。挂机式:打完(死/cap)自动重开。

# 战斗精灵=单行横向帧表,帧为正方形→帧边长=纹理高(自动适配 64 或吴冠中新出的 96 帧,换图无需改码)
const SEEDV := 7
const VIEW_LANE := 360.0     # 可视战场只映射近战段(sim laneLen=820);远处敌人从右侧屏外走入,战斗更集中不空
var player_sx := 80.0        # 主角屏幕 x(每帧按视口宽重算,见 _refresh_layout)

var sim
var ui_font: SystemFont
var info: Label
var bg_tex: Texture2D
var tex_cache := {}
var floats := []             # [{x,y,text,color,t,t0}]
var p_atk := 0.0
var prev_kills := 0
var prev_hp := 0.0
var restart_t := 0.0
var anim_t := 0.0

func _ready() -> void:
	ui_font = SystemFont.new()
	ui_font.font_names = PackedStringArray(["Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "sans-serif"])
	ui_font.allow_system_fallback = true
	info = Label.new()
	info.add_theme_font_override("font", ui_font)
	info.add_theme_font_size_override("font_size", 14)
	info.add_theme_color_override("font_color", Color(1.0, 0.93, 0.72))
	info.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	info.add_theme_constant_override("outline_size", 3)
	info.position = Vector2(10, 4)
	add_child(info)
	bg_tex = load("res://assets/combat/bg_training_strip.png")
	# 不在此处开打:默认在家修整,由 _process 侦测 Player.sortieActive 才 _start()(bug1)
	set_process(true)

var run_n := 0
var result_applied := false
var is_boss_run := false

func _start() -> void:
	# 用真实共享养成状态的 build:等级/技能/功法/装备 → 属性,与左家园同源
	var bc = CombatCore.build_to_combat(Player.build())
	run_n += 1
	var z = Player.cur_zone()  # P2:当前分区的敌人/等级/boss
	# BOSS 战=手动触发(挑战首领键),不再每4趟自动(对齐 H5,WalyCai:要boss激活键)
	is_boss_run = bool(Player.s.get("bossRequested", false))
	if is_boss_run:
		Player.s["bossRequested"] = false
	var cfg = {
		"attrs": bc.attrs, "seed": SEEDV + run_n,
		"abilities": bc.get("abilities", []), "enchant": bc.get("enchant", {}),
		"manaRegen": bc.get("manaRegen", 8), "playerRange": bc.get("playerRange", 0),
		"spawnTypes": z.types, "lvMin": z.lvMin, "lvMax": z.lvMax,
		"zoneIdx": int(Player.s.zone), "cap": 99999,
		"startHp": int(Player.s.hp), "startMana": int(Player.s.mana),  # 从持久气血/内力续战(打坐/睡觉恢复)
		"playerRegen": bc.get("neiRegenFlat", 0),
		# 居家技能 → 战斗(P4):精英概率/掉落品质/刷怪速度
		"eliteChance": Player.combat_elite_chance(),
		"dropQuality": Player.combat_drop_quality(),
		"spawnInterval": Player.combat_spawn_interval(),
	}
	if is_boss_run:
		cfg["boss"] = z.boss
	sim = CombatCore.create_combat(cfg)
	prev_kills = 0
	prev_hp = bc.attrs.HP
	floats.clear()
	p_atk = 0.0
	result_applied = false

func _tex(path: String):
	if not tex_cache.has(path):
		tex_cache[path] = (load(path) if ResourceLoader.exists(path) else null)
	return tex_cache[path]

var _was_active := false

# 中断出战:把当前趟已打的战利品/经验/金币入库带回家(对齐 H5"中断=带走当前包裹回家")
func _bank_partial() -> void:
	if sim != null and not result_applied:
		result_applied = true
		Player.apply_combat_result(sim.result())

# 挑战本区首领(出战面板按钮):入库当前趟 → 立即开打 boss
func force_boss() -> void:
	Player.s["bossRequested"] = true
	Player.s["sortieActive"] = true
	Player.save_slot(Player.slot)
	_bank_partial()
	_was_active = true
	_start()

func _process(dt: float) -> void:
	player_sx = get_viewport_rect().size.x * 0.18
	anim_t += dt
	var active = bool(Player.s.get("sortieActive", false))
	# 未出战:在家修整,战斗暂停(不刷怪/不自动重开)。刚从出战切回→入库当前趟战利品
	if not active:
		if _was_active:
			_bank_partial()
			_was_active = false
			sim = null  # 清掉上一趟战场,未出战面板只显练武场背景
		info.text = "未出战 · 在家修整 — 点左侧【⚔ 出战】开始历练"
		queue_redraw()
		return
	# 进入出战(刚从未出战切来)→ 开新一趟
	if not _was_active:
		_was_active = true
		_start()
	if sim == null:
		_start()
	if sim.is_done():
		if not result_applied:
			result_applied = true
			var res = Player.apply_combat_result(sim.result())  # 掉落入库+经验金币回流→升级+boss解锁
			if res.unlocked_zone >= 0:
				_add_float(player_sx, -1.1, "通关! 解锁 %s" % Player.ZONES[res.unlocked_zone].name, Color(0.5, 1.0, 0.55))
			elif res.lvups > 0:
				_add_float(player_sx, -1.0, "升级! Lv%d" % int(Player.s.level), Color(1.0, 0.9, 0.3))
		restart_t += dt
		if restart_t > 1.6:
			restart_t = 0.0
			_start()
		queue_redraw()
		return
	sim.step(dt)
	var st = sim.state()
	p_atk = max(0.0, p_atk - dt)
	# 主角命中敌人 → 红字 + 触发挥击
	if st.lastHit != null:
		p_atk = 0.18
		_add_float(_sx(st.lastHit.x), -0.55, str(int(st.lastHit.dmg)), Color(1.0, 0.5, 0.4))
	# 技能释放
	if st.lastCast != null:
		var nm = _ability_name(st.lastCast)
		if nm != "":
			_add_float(player_sx + 30, -0.85, nm, Color(1.0, 0.82, 0.35))
	# 回血绿字
	if st.lastHeal > 0:
		_add_float(player_sx, -0.9, "+" + str(int(st.lastHeal)), Color(0.5, 1.0, 0.5))
	# 主角受击黄字
	if st.P.hp < prev_hp - 0.5:
		_add_float(player_sx, -0.7, str(int(prev_hp - st.P.hp)), Color(1.0, 0.85, 0.3))
	prev_hp = st.P.hp
	prev_kills = st.kills
	for f in floats:
		f.t -= dt
	floats = floats.filter(func(f): return f.t > 0.0)
	var mana_s = ""
	if st.manaMax > 0:
		mana_s = " · 内力 %d/%d" % [int(st.mana), int(st.manaMax)]
	# HUD:共享养成状态(等级/金币/战利品,与左家园同源)+ 当前分区 + 本场战况
	var zname = Player.cur_zone().name + (" · BOSS战" if is_boss_run else "")
	info.text = "Lv%d · %s · 已杀%d · 气血%d/%d%s · 金币%d · 战利品%d" % [int(Player.s.level), zname, st.kills, int(max(0, st.P.hp)), int(st.P.hpMax), mana_s, int(Player.s.gold), Player.s.warehouse.size()]
	queue_redraw()

func _ability_name(lc) -> String:
	match lc.get("type", ""):
		"aoe": return "旋风斩!"
		"haste": return "狂暴!"
		"buff": return "增益!"
		"debuff": return "破!"
		_: return ""

func _add_float(sx: float, y_frac: float, text: String, col: Color) -> void:
	var vp = get_viewport_rect().size
	floats.append({"x": sx, "y": vp.y * (0.86 + y_frac * 0.5), "text": text, "color": col, "t": 0.9})

func _sx(simx: float) -> float:
	var vp = get_viewport_rect().size
	var lane_px = vp.x - player_sx - 28.0
	return player_sx + (simx / VIEW_LANE) * lane_px  # 远敌(simx>VIEW_LANE)映到屏外右,自然走入

func _frame_of(tex, t: float) -> int:
	if tex == null:
		return 0
	var fh = tex.get_height()
	var frames = max(1, int(tex.get_width() / fh))
	return int(t * 8.0) % frames

func _draw() -> void:
	var vp = get_viewport_rect().size
	var ground = vp.y * 0.86
	var ch = vp.y * 0.34  # 与左侧居家主角显示高度统一(WalyCai+马奈:右侧不得明显大于左侧)
	if bg_tex:
		var s = max(vp.x / bg_tex.get_width(), vp.y / bg_tex.get_height())
		var dw = bg_tex.get_width() * s
		var dh = bg_tex.get_height() * s
		draw_texture_rect(bg_tex, Rect2((vp.x - dw) * 0.5, (vp.y - dh) * 0.5, dw, dh), false)
	else:
		# 背景兜底:暗色墙+地面带
		draw_rect(Rect2(0, 0, vp.x, vp.y), Color(0.10, 0.08, 0.07))
		draw_rect(Rect2(0, ground * 0.5, vp.x, ground * 0.5), Color(0.12, 0.095, 0.075))
		draw_line(Vector2(0, ground * 0.5), Vector2(vp.x, ground * 0.5), Color(0.16, 0.12, 0.09), 1.0)
		draw_rect(Rect2(0, ground - 2, vp.x, vp.y - ground + 2), Color(0.18, 0.14, 0.10))
		draw_line(Vector2(0, ground), Vector2(vp.x, ground), Color(0.34, 0.26, 0.17), 2.0)
		draw_line(Vector2(0, (ground + vp.y) * 0.5), Vector2(vp.x, (ground + vp.y) * 0.5), Color(0.14, 0.11, 0.08), 1.0)
	# 背景轻微压暗,让角色/血条/伤害字保持第一层级(马奈:练武场背景别抢焦)
	draw_rect(Rect2(0, 0, vp.x, vp.y), Color(0, 0, 0, 0.16))
	# 顶部 HUD 半透明背板(让历练状态行更醒目)
	draw_rect(Rect2(0, 0, vp.x, 24), Color(0.03, 0.02, 0.02, 0.55))

	if sim == null:
		return
	var st = sim.state()

	# 敌人(远→近,画家排序)
	var es = st.enemies.duplicate()
	es.sort_custom(func(a, b): return a.x > b.x)
	for e in es:
		if e.get("dead", false):
			continue
		var ex = _sx(e.x)
		var mult = (1.7 if e.isBoss else (1.25 if e.elite else 1.0))
		var dh = ch * mult
		var anim = "attack" if e.at > 0 else "idle"
		var tex = _enemy_tex(e.id, anim)
		_draw_sprite(tex, ex, ground, dh, true)
		_draw_hp_bar(ex, ground - dh - 6, 40, float(e.hp) / float(e.hpMax), Color(0.75, 0.36, 0.36))
		_draw_enemy_debuffs(e, ex, ground - dh - 18)
		if e.isBoss:
			_draw_label(e.E.get("name", "首领"), ex, ground - dh - 30, Color(0.95, 0.75, 0.3))
		elif e.elite:
			_draw_label("✦精英", ex, ground - dh - 30, Color(0.95, 0.8, 0.4))

	# 主角
	var p_anim = "down" if st.P.hp <= 0 else ("attack" if p_atk > 0 else "idle")
	var ptex = _tex("res://assets/characters/protagonist_combat/%s.png" % p_anim)
	_draw_sprite(ptex, player_sx, ground, ch, false)
	# 主角血条 + 内力条
	_draw_hp_bar(player_sx, ground - ch - 8, 56, float(max(0, st.P.hp)) / float(st.P.hpMax), Color(0.37, 0.75, 0.37))
	if st.manaMax > 0:
		_draw_hp_bar(player_sx, ground - ch - 1, 56, float(st.mana) / float(st.manaMax), Color(0.35, 0.62, 0.88))
	# 挥击弧光
	if p_atk > 0:
		var a = p_atk / 0.18
		draw_arc(Vector2(player_sx + ch * 0.35, ground - ch * 0.5), ch * 0.5, -0.7, 0.7, 10, Color(1.0, 0.92, 0.6, a), 3.0)
	# 狂暴光环
	if st.haste > 0:
		draw_arc(Vector2(player_sx, ground - ch * 0.5), ch * 0.55, 0, TAU, 24, Color(1.0, 0.6, 0.2, 0.5), 2.0)

	# 漂浮文字
	for f in floats:
		var alpha = clamp(f.t / 0.9, 0.0, 1.0)
		var c = f.color
		var rise = (0.9 - f.t) * 26.0
		draw_string(ui_font, Vector2(f.x - 10, f.y - rise), f.text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(c.r, c.g, c.b, alpha))

	if st.P.hp <= 0:
		draw_string(ui_font, Vector2(vp.x * 0.5 - 50, vp.y * 0.5), "败退·整顿中…", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(1, 0.8, 0.5))

func _enemy_tex(id: String, anim: String):
	return _tex("res://assets/characters/enemies/%s/%s.png" % [id, anim])

func _draw_sprite(tex, cx: float, ground: float, dh: float, flip: bool) -> void:
	if tex == null:
		# 占位:暗红/蓝方块
		var w = dh * 0.6
		draw_rect(Rect2(cx - w / 2, ground - dh, w, dh), Color(0.4, 0.3, 0.3, 0.8))
		return
	var fh = tex.get_height()
	var fr = _frame_of(tex, anim_t)
	var src = Rect2(fr * fh, 0, fh, fh)
	var dw = dh  # 方形帧
	if flip:
		draw_set_transform(Vector2(cx, ground), 0.0, Vector2(-1, 1))
		draw_texture_rect_region(tex, Rect2(-dw / 2, -dh, dw, dh), src)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	else:
		draw_texture_rect_region(tex, Rect2(cx - dw / 2, ground - dh, dw, dh), src)

func _draw_hp_bar(cx: float, y: float, w: float, ratio: float, col: Color) -> void:
	ratio = clamp(ratio, 0.0, 1.0)
	draw_rect(Rect2(cx - w / 2, y, w, 4), Color(0, 0, 0, 0.7))
	draw_rect(Rect2(cx - w / 2, y, w * ratio, 4), col)

func _draw_enemy_debuffs(e, cx: float, y: float) -> void:
	var icons := ""
	if e.deb.burnT > 0: icons += "🔥"
	if e.deb.chillT > 0: icons += "❄"
	if e.deb.poiStacks > 0: icons += "☠"
	if icons != "":
		draw_string(ui_font, Vector2(cx - 12, y), icons, HORIZONTAL_ALIGNMENT_LEFT, -1, 12)

func _draw_label(text: String, cx: float, y: float, col: Color) -> void:
	draw_string(ui_font, Vector2(cx - text.length() * 6, y), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, col)
