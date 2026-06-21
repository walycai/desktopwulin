extends Node2D
# 家园场景(阶段2) — 还原网页版家园:静态居家图 + 主角(走动) + 顶栏状态 + 左侧菜单 + 睡觉/打坐。
# 睡觉=走到带帘床→藏起+床侧zzZ;打坐=走到书房/练功点→藏起+暖光效果。点房间任意处=走过去。
# 数值走 CombatCore(与网页同源)。战斗/各UI面板是后续阶段。

const ROOM_W := 1536.0
const ROOM_H := 2048.0
var HOTSPOTS := {
	"bed": Vector2(0.8529, 0.5518),
	"bedZzz": Vector2(0.9049, 0.5176),
	"door": Vector2(0.4557, 0.6250),
	"doorFront": Vector2(0.4557, 0.6250),
	"def": Vector2(0.4948, 0.3711),
}

var bg: Sprite2D
var player: Sprite2D
var tex_idle: Texture2D
var tex_walk: Texture2D
var ui_font: SystemFont

# 房间投影矩形(contain)
var _ox := 0.0
var _oy := 0.0
var _dw := 0.0
var _dh := 0.0

# 主角状态(归一化坐标 0..1)
var pcx := 0.4948
var pcy := 0.3711
var tx := 0.4948
var ty := 0.3711
var pstate := "wander"  # wander / walking / sleeping / meditating
var pdir := "down"
const PSPEED := 0.32
var fi := 0
var fclock := 0.0
var wander_cd := 2.2
var home_clock := 0.0

# 极简存档(完整状态/存档进阶段4),先满足顶栏显示
var stats := {"level": 1, "gold": 0, "hp": 0, "hpMax": 0, "mana": 0, "manaMax": 0}

var topbar: Label
var toast_label: Label
var toast_t := 0.0
var DIR_ROW := {"down": 0, "left": 1, "right": 2, "up": 3}

func _ready() -> void:
	tex_idle = load("res://assets/characters/protagonist/idle.png")
	tex_walk = load("res://assets/characters/protagonist/walk.png")
	ui_font = SystemFont.new()
	ui_font.font_names = PackedStringArray(["Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "sans-serif"])
	ui_font.allow_system_fallback = true

	bg = Sprite2D.new()
	bg.texture = load("res://assets/home/static_room.png")
	bg.centered = false
	add_child(bg)

	player = Sprite2D.new()
	player.texture = tex_idle
	player.hframes = 4
	player.vframes = 4
	player.centered = true
	add_child(player)

	_recalc_attrs()
	_layout()
	_build_ui()
	get_viewport().size_changed.connect(_layout)
	set_process(true)

func _recalc_attrs() -> void:
	var b = CombatCore.build_to_combat({"level": stats.level, "gongfa": {}, "gongfaEquip": {}})
	stats.hpMax = int(b.attrs.HP)
	stats.manaMax = int(b.attrs.Mana)
	if stats.hp <= 0: stats.hp = stats.hpMax
	if stats.mana <= 0: stats.mana = stats.manaMax
	stats["cp"] = CombatCore.combat_power(b.attrs)
	stats["atk"] = int(b.attrs.ATK)
	stats["def"] = int(b.attrs.DEF)

func _layout() -> void:
	var vp := get_viewport_rect().size
	var s = min(vp.x / ROOM_W, vp.y / ROOM_H)
	bg.scale = Vector2(s, s)
	_dw = ROOM_W * s
	_dh = ROOM_H * s
	_ox = (vp.x - _dw) / 2.0
	_oy = (vp.y - _dh) / 2.0
	bg.position = Vector2(_ox, _oy)

func room_to_screen(nx: float, ny: float) -> Vector2:
	return Vector2(_ox + nx * _dw, _oy + ny * _dh)

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	# 顶栏
	var bar := PanelContainer.new()
	bar.set_anchors_preset(Control.PRESET_TOP_WIDE)
	layer.add_child(bar)
	topbar = Label.new()
	topbar.add_theme_font_override("font", ui_font)
	topbar.add_theme_font_size_override("font_size", 14)
	bar.add_child(topbar)
	# 左侧菜单(半透明背板浮层,覆盖在房间画面之上)
	var menu_panel := PanelContainer.new()
	menu_panel.position = Vector2(8, 48)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.08, 0.06, 0.05, 0.62)
	sb.set_corner_radius_all(6)
	sb.set_content_margin_all(8)
	sb.border_color = Color(0.55, 0.42, 0.25, 0.5)
	sb.set_border_width_all(1)
	menu_panel.add_theme_stylebox_override("panel", sb)
	layer.add_child(menu_panel)
	var menu := VBoxContainer.new()
	menu.add_theme_constant_override("separation", 6)
	menu_panel.add_child(menu)
	_add_menu_title(menu, "行动")
	_add_menu_btn(menu, "⚔ 出战历练", _on_sortie)
	_add_menu_btn(menu, "🧘 打坐", func(): _go_action("meditating"))
	_add_menu_btn(menu, "🛌 上床休息", func(): _go_action("sleeping"))
	_add_menu_title(menu, "侠客")
	_add_menu_btn(menu, "🎒 侠客装备", func(): _toast("装备界面 · 阶段4"))
	_add_menu_btn(menu, "🌳 人物技能", func(): _toast("技能树 · 阶段4"))
	_add_menu_btn(menu, "☯ 功法装备", func(): _toast("功法界面 · 阶段4"))
	_add_menu_btn(menu, "🏠 居家技能", func(): _toast("居家技能 · 阶段4"))
	# toast
	toast_label = Label.new()
	toast_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	toast_label.position = Vector2(-80, -60)
	toast_label.add_theme_font_override("font", ui_font)
	toast_label.add_theme_font_size_override("font_size", 16)
	toast_label.add_theme_color_override("font_color", Color(1, 0.9, 0.6))
	toast_label.visible = false
	layer.add_child(toast_label)
	_update_topbar()

func _add_menu_title(menu, t) -> void:
	var l := Label.new()
	l.text = t
	l.add_theme_font_override("font", ui_font)
	l.add_theme_font_size_override("font_size", 13)
	l.add_theme_color_override("font_color", Color(0.91, 0.79, 0.54))
	menu.add_child(l)

func _add_menu_btn(menu, t, cb: Callable) -> void:
	var b := Button.new()
	b.text = t
	b.add_theme_font_override("font", ui_font)
	b.custom_minimum_size = Vector2(110, 30)
	b.pressed.connect(cb)
	menu.add_child(b)

func _update_topbar() -> void:
	topbar.text = "❤ %d/%d   🔷 %d/%d   💰 %d   ⚔ Lv%d   ☯ 功力 0   💪 战力 %d" % [stats.hp, stats.hpMax, stats.mana, stats.manaMax, stats.gold, stats.level, stats.cp]

func _toast(msg: String) -> void:
	toast_label.text = msg
	toast_label.visible = true
	toast_t = 2.0

func _on_sortie() -> void:
	_toast("横版战斗 · 阶段3（即将接入）")

func _go_action(action: String) -> void:
	# 走到对应热点→到达后进入状态(睡/打坐都是藏起+特效)
	pstate = "walking"
	var target = HOTSPOTS.bed if action == "sleeping" else HOTSPOTS.doorFront
	tx = target.x
	ty = target.y
	set_meta("pending_action", action)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var m = event.position
		var nx = (m.x - _ox) / _dw
		var ny = (m.y - _oy) / _dh
		if nx >= 0 and nx <= 1 and ny >= 0 and ny <= 1:
			pstate = "wander"
			if has_meta("pending_action"): remove_meta("pending_action")
			tx = nx
			ty = ny

func _process(dt: float) -> void:
	home_clock += dt
	if _dw <= 0:
		_layout()  # 自愈:viewport 尚未就绪时重算房间投影
	_update_player(dt)
	_update_player_sprite()
	# wander
	if pstate == "wander":
		wander_cd -= dt
		if wander_cd <= 0:
			wander_cd = 2.2
			if randf() < 0.6:
				tx = 0.32 + randf() * 0.34
				ty = 0.5 + randf() * 0.22
	# toast 计时
	if toast_t > 0:
		toast_t -= dt
		if toast_t <= 0: toast_label.visible = false
	queue_redraw()

func _update_player(dt: float) -> void:
	if pstate == "walking" or pstate == "wander":
		var dx = tx - pcx
		var dy = ty - pcy
		var dist = sqrt(dx * dx + dy * dy)
		if dist > 0.005:
			pdir = ("left" if dx < 0 else "right") if abs(dx) > abs(dy) else ("up" if dy < 0 else "down")
			var step = PSPEED * dt
			if step >= dist:
				pcx = tx
				pcy = ty
				_arrive()
			else:
				pcx += dx / dist * step
				pcy += dy / dist * step
		elif pstate == "walking":
			_arrive()

func _arrive() -> void:
	if pstate == "walking" and has_meta("pending_action"):
		var act = get_meta("pending_action")
		remove_meta("pending_action")
		pstate = act
		_toast("侠客%s……" % ("躺上床休息" if act == "sleeping" else "进练功室打坐"))
	elif pstate == "walking":
		pstate = "wander"

func _update_player_sprite() -> void:
	# 睡觉/打坐:藏起主角(特效在 _draw)
	if pstate == "sleeping" or pstate == "meditating":
		player.visible = false
		return
	player.visible = true
	var moving = pstate == "walking" or (pstate == "wander" and (abs(tx - pcx) > 0.005 or abs(ty - pcy) > 0.005))
	var anim = "walk" if moving else "idle"
	var frames = 8 if anim == "walk" else 4
	if anim == "walk" and player.texture != tex_walk:
		player.texture = tex_walk
		player.hframes = 8
	elif anim == "idle" and player.texture != tex_idle:
		player.texture = tex_idle
		player.hframes = 4
	# 帧动画
	fclock += get_process_delta_time()
	var fps = 10.0 if anim == "walk" else 6.0
	if fclock >= 1.0 / fps:
		fclock = 0.0
		fi = (fi + 1) % frames
	player.frame = DIR_ROW[pdir] * frames + (fi % frames)
	# 缩放 + 落点(脚底对齐)
	var disp_h = _dh * 0.15
	var sc = disp_h / 96.0
	player.scale = Vector2(sc, sc)
	var ctr = room_to_screen(pcx, pcy)
	player.position = Vector2(ctr.x, ctr.y - disp_h / 2.0)

func _draw() -> void:
	if pstate == "sleeping":
		_draw_zzz(room_to_screen(HOTSPOTS.bedZzz.x, HOTSPOTS.bedZzz.y))
	elif pstate == "meditating":
		_draw_door_glow(room_to_screen(HOTSPOTS.door.x, HOTSPOTS.door.y))

func _draw_zzz(p: Vector2) -> void:
	var t1 = fmod(home_clock, 1.6) / 1.6
	var t2 = fmod(home_clock + 0.8, 1.6) / 1.6
	draw_string(ui_font, Vector2(p.x + 7 + t1 * 8, p.y - t1 * 20), "z", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(0.67, 0.8, 1.0, 0.9 - t1 * 0.9))
	draw_string(ui_font, Vector2(p.x + t2 * 9, p.y - 6 - t2 * 24), "Z", HORIZONTAL_ALIGNMENT_LEFT, -1, 19, Color(0.67, 0.8, 1.0, 0.9 - t2 * 0.9))

func _draw_door_glow(p: Vector2) -> void:
	var puls = 0.5 + 0.5 * abs(sin(home_clock * 1.8))
	var gh = _dh * 0.16
	for i in range(6):
		var rr = gh * (1.0 - i / 6.0)
		draw_circle(p, rr, Color(1.0, 0.78, 0.4, 0.10 * puls))
