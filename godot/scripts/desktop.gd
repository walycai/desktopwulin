extends Control
# 桌面挂机横条外壳(WalyCai):无边框置顶、贴屏幕底部、高=屏幕高/4 的超宽横条。
# 左=室内界面(内嵌 home 场景,相机横向切片);右=历练界面(横版战斗,现占位待移植)。
# 一键隐藏→窗口缩成桌面角落小恢复按钮;点恢复键还原。

const STRIP_FRAC := 0.26   # 屏幕下方约 1/4 高(贴底横条)
const STRIP_MIN_H := 224   # 横条最矮(1366×768 等小屏保可读)
const STRIP_MAX_H := 560   # 横条最高(4K 不至于过厚)
const LEFT_FRAC := 0.42    # 左室内占宽比例
const TOPBAR_H := 26

var ui_font: SystemFont
var home_view: Node2D
var combat_view: Node2D
var home_vp: SubViewport
var topbar: Label
var hide_btn: Button
var restore_btn: Button
var main_ui: Control
var win_hidden := false
var _full_size: Vector2i
var _full_pos: Vector2i
var panel_layer: Control
var panel_body: Control
var panel_title: Label
var panel_open := false
var _screen := Vector2i(1920, 1080)

# 管理面板=锚定屏幕左下角的盒子(绝不居中/全屏/越界)。宽≈半屏、高≈0.62屏,按分辨率自适应。
func _panel_box() -> Dictionary:
	var ss := _screen if _screen.x > 0 else DisplayServer.screen_get_size()
	var w = clampi(int(ss.x * 0.5), 560, 980)
	var h = clampi(int(ss.y * 0.62), 360, 860)
	w = min(w, ss.x)
	h = min(h, ss.y)
	return {"size": Vector2i(w, h), "pos": Vector2i(0, ss.y - h)}  # x=0,贴屏幕左下角

func _ready() -> void:
	ui_font = SystemFont.new()
	ui_font.font_names = PackedStringArray(["Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "sans-serif"])
	ui_font.allow_system_fallback = true
	_setup_window()
	_build()
	set_process(true)

func _setup_window() -> void:
	# 仅在有真实窗口时设置(脚本/预览下跳过)
	if DisplayServer.get_name() == "headless":
		return
	var ss := DisplayServer.screen_get_size()
	if ss.x <= 0:
		return
	_screen = ss
	var h := clampi(int(ss.y * STRIP_FRAC), STRIP_MIN_H, STRIP_MAX_H)
	_full_size = Vector2i(ss.x, h)
	_full_pos = Vector2i(0, ss.y - h)
	DisplayServer.window_set_size(_full_size)
	DisplayServer.window_set_position(_full_pos)

func _build() -> void:
	# 整体背板
	var bg := ColorRect.new()
	bg.color = Color(0.06, 0.05, 0.04, 1.0)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	# 主界面容器(隐藏时整体藏起)
	main_ui = Control.new()
	main_ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	main_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(main_ui)

	# 左:室内界面(内嵌 home 场景)
	var left := SubViewportContainer.new()
	left.stretch = true
	left.anchor_left = 0.0
	left.anchor_right = LEFT_FRAC
	left.anchor_top = 0.0
	left.anchor_bottom = 1.0
	left.offset_left = 0
	left.offset_right = 0
	left.offset_top = 0
	left.offset_bottom = 0
	main_ui.add_child(left)
	home_vp = SubViewport.new()
	home_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	home_vp.handle_input_locally = true
	left.add_child(home_vp)
	home_view = load("res://scenes/home.tscn").instantiate()
	home_view.show_ui = false
	home_vp.add_child(home_view)

	# 中:左右分隔线
	var divider := ColorRect.new()
	divider.color = Color(0.3, 0.24, 0.15, 0.9)
	divider.anchor_left = LEFT_FRAC
	divider.anchor_right = LEFT_FRAC
	divider.anchor_top = 0.0
	divider.anchor_bottom = 1.0
	divider.offset_left = -1
	divider.offset_right = 1
	main_ui.add_child(divider)

	# 右:历练界面(横版自动战斗,内嵌 combat 场景)
	var right := SubViewportContainer.new()
	right.stretch = true
	right.anchor_left = LEFT_FRAC
	right.anchor_right = 1.0
	right.anchor_top = 0.0
	right.anchor_bottom = 1.0
	main_ui.add_child(right)
	var rvp := SubViewport.new()
	rvp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	rvp.handle_input_locally = true
	right.add_child(rvp)
	combat_view = load("res://scenes/combat.tscn").instantiate()
	rvp.add_child(combat_view)

	# 顶栏(横条压缩状态栏,浮在画面上)
	var bar := PanelContainer.new()
	bar.anchor_left = 0.0
	bar.anchor_right = 1.0
	bar.anchor_top = 0.0
	bar.anchor_bottom = 0.0
	bar.offset_bottom = TOPBAR_H
	var bsb := StyleBoxFlat.new()
	bsb.bg_color = Color(0.05, 0.04, 0.03, 0.72)
	bar.add_theme_stylebox_override("panel", bsb)
	main_ui.add_child(bar)
	topbar = Label.new()
	topbar.add_theme_font_override("font", ui_font)
	topbar.add_theme_font_size_override("font_size", 13)
	topbar.add_theme_color_override("font_color", Color(0.93, 0.86, 0.66))
	topbar.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	bar.add_child(topbar)

	# 隐藏按钮(右上角,古风小按钮,常态不抢画面)
	hide_btn = Button.new()
	hide_btn.text = "—  收起"
	hide_btn.add_theme_font_override("font", ui_font)
	hide_btn.add_theme_font_size_override("font_size", 12)
	hide_btn.anchor_left = 1.0
	hide_btn.anchor_right = 1.0
	hide_btn.anchor_top = 0.0
	hide_btn.anchor_bottom = 0.0
	hide_btn.offset_left = -76
	hide_btn.offset_right = -5
	hide_btn.offset_top = 3
	hide_btn.offset_bottom = TOPBAR_H - 3
	hide_btn.tooltip_text = "收起到桌面角落"
	_style_btn(hide_btn, false)
	hide_btn.pressed.connect(_toggle_hide)
	main_ui.add_child(hide_btn)

	# 恢复按钮(隐藏态显示,古风牌匾样式,小而醒目)
	restore_btn = Button.new()
	restore_btn.text = "▣  桌面武林"
	restore_btn.add_theme_font_override("font", ui_font)
	restore_btn.add_theme_font_size_override("font_size", 14)
	restore_btn.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	restore_btn.tooltip_text = "点开恢复桌面武林"
	_style_btn(restore_btn, true)
	restore_btn.visible = false
	restore_btn.pressed.connect(_toggle_hide)
	add_child(restore_btn)

	_build_menu()
	_build_panel()

# ---- GUI 皮肤(吴冠中第一包,notes/godot-gui-first-pack.md):九宫格 StyleBoxTexture,缺图回退纯色 ----
const GUI_DIR := "res://assets/ui/gui/"
var _sb_cache := {}
func _sbtex(name: String, ml: int, mr: int, mt: int, mb: int, fb := Color(0.12, 0.09, 0.06, 0.9), bw := 1):
	# 返回共享 StyleBox(只读复用):有图=九宫格纹理,无图=纯色回退(保证不崩)
	if _sb_cache.has(name):
		return _sb_cache[name]
	var path := GUI_DIR + name + ".png"
	var sb
	if ResourceLoader.exists(path):
		var s := StyleBoxTexture.new()
		s.texture = load(path)
		s.texture_margin_left = ml
		s.texture_margin_right = mr
		s.texture_margin_top = mt
		s.texture_margin_bottom = mb
		sb = s
	else:
		var f := StyleBoxFlat.new()
		f.bg_color = fb
		f.border_color = Color(0.55, 0.44, 0.26)
		f.set_border_width_all(bw)
		f.set_corner_radius_all(5)
		f.set_content_margin_all(6)
		sb = f
	_sb_cache[name] = sb
	return sb

func _style_btn(b: Button, prominent: bool) -> void:
	# 古风按钮皮肤:normal/hover/pressed/disabled 九宫格(prominent→选中态 btn_selected)
	b.add_theme_stylebox_override("normal", _sbtex("btn_selected" if prominent else "btn_normal", 12, 12, 10, 10))
	b.add_theme_stylebox_override("hover", _sbtex("btn_hover", 12, 12, 10, 10))
	b.add_theme_stylebox_override("pressed", _sbtex("btn_pressed", 12, 12, 10, 10))
	b.add_theme_stylebox_override("disabled", _sbtex("btn_disabled", 12, 12, 10, 10))
	b.add_theme_stylebox_override("focus", _sbtex("btn_selected" if prominent else "btn_normal", 12, 12, 10, 10))
	b.add_theme_color_override("font_color", Color(0.96, 0.88, 0.66))
	b.add_theme_color_override("font_hover_color", Color(1.0, 0.94, 0.74))
	b.add_theme_color_override("font_disabled_color", Color(0.55, 0.5, 0.42))

func _style_boss_btn(b: Button) -> void:
	# Boss 挑战强调态:红木+金边,左右内边距 18(避免金端饰压字)
	b.add_theme_stylebox_override("normal", _sbtex("btn_boss", 18, 18, 10, 10, Color(0.22, 0.06, 0.05, 0.96), 2))
	b.add_theme_stylebox_override("hover", _sbtex("btn_boss_hover", 18, 18, 10, 10, Color(0.30, 0.09, 0.07, 0.98), 2))
	b.add_theme_stylebox_override("pressed", _sbtex("btn_boss_hover", 18, 18, 10, 10, Color(0.30, 0.09, 0.07, 0.98), 2))
	b.add_theme_stylebox_override("focus", _sbtex("btn_boss", 18, 18, 10, 10, Color(0.22, 0.06, 0.05, 0.96), 2))
	b.add_theme_color_override("font_color", Color(1.0, 0.9, 0.62))
	b.add_theme_color_override("font_hover_color", Color(1.0, 0.96, 0.78))

func _toggle_hide() -> void:
	win_hidden = not win_hidden
	main_ui.visible = not win_hidden
	restore_btn.visible = win_hidden
	if DisplayServer.get_name() == "headless" or _full_size.x <= 0:
		return
	if win_hidden:
		var bs := Vector2i(132, 36)
		DisplayServer.window_set_size(bs)
		DisplayServer.window_set_position(Vector2i(_full_pos.x + _full_size.x - bs.x, _full_pos.y + _full_size.y - bs.y))
	else:
		DisplayServer.window_set_size(_full_size)
		DisplayServer.window_set_position(_full_pos)

func _process(_dt: float) -> void:
	if win_hidden or topbar == null:
		return
	# 顶栏读共享养成状态 Player(左家园+右历练同源)
	var p = Player.s
	var mode = "⚔历练中" if bool(p.get("sortieActive", false)) else "🏠修整"
	topbar.text = "  ❤ %d/%d   🔷 %d/%d   💰 %d   ⚔ Lv%d   💪 战力 %d   · %s" % [int(p.hp), int(p.hpMax), int(p.mana), int(p.manaMax), int(p.gold), int(p.level), Player.combat_power(), mode]

# ---- 左侧菜单(P3/P4 入口)----
func _build_menu() -> void:
	var mp := PanelContainer.new()
	mp.position = Vector2(6, TOPBAR_H + 6)
	mp.add_theme_stylebox_override("panel", _sbtex("panel_normal", 16, 16, 16, 16, Color(0.06, 0.05, 0.04, 0.72)))
	main_ui.add_child(mp)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 4)
	mp.add_child(col)
	for it in [["🎒 装备", "equip"], ["🌳 技能", "skill"], ["☯ 功法", "kungfu"], ["🏠 居家", "home"], ["⚔ 出战", "sortie"], ["👹 挑战首领", "boss"], ["🧘 打坐", "meditate"], ["🛌 睡觉", "sleep"]]:
		var b := Button.new()
		b.text = it[0]
		b.add_theme_font_override("font", ui_font)
		b.add_theme_font_size_override("font_size", 12)
		b.custom_minimum_size = Vector2(74, 24)
		var key = it[1]
		if key == "boss":
			_style_boss_btn(b)  # Boss 一级入口=强调态,一眼可见
		else:
			_style_btn(b, false)
		b.pressed.connect(func(): _open_menu(key))
		col.add_child(b)

var skill_tab := 0

func _open_menu(key: String) -> void:
	match key:
		"equip": _open_panel("侠客装备", _fill_equip)
		"skill": _open_panel("人物技能", _fill_skill)
		"kungfu": _open_panel("功法", _fill_kungfu)
		"home": _open_panel("居家技能", _fill_home)
		"sortie": _open_panel("出战历练", _fill_sortie)
		"boss":
			# 一键挑战本区首领(打赢解锁下一图,解决"困在第一张图")
			_start_sortie()
			if combat_view and combat_view.has_method("force_boss"): combat_view.force_boss()
		"meditate":
			_stop_sortie()  # 打坐与出战互斥:先收兵回家(带回当前包裹)
			if home_view: home_view._go_action("meditating")
		"sleep":
			_stop_sortie()
			if home_view: home_view._go_action("sleeping")
		_: _open_panel("敬请期待", func(c): _placeholder(c, key))

func _placeholder(c: Control, key: String) -> void:
	var l := Label.new()
	l.text = "「%s」面板 · 迁移进行中" % key
	l.add_theme_font_override("font", ui_font)
	l.add_theme_font_size_override("font_size", 18)
	l.add_theme_color_override("font_color", Color(0.7, 0.62, 0.45))
	l.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	c.add_child(l)

# ---- 管理态面板框架(点菜单→窗口放大→面板)----
func _build_panel() -> void:
	panel_layer = Control.new()
	panel_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel_layer.visible = false
	add_child(panel_layer)
	var bgo := ColorRect.new()  # 底:挡住后面 home/combat
	bgo.color = Color(0.05, 0.04, 0.03, 1.0)
	bgo.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel_layer.add_child(bgo)
	var bg := Panel.new()  # 古风面板皮肤(panel_normal 九宫格)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.add_theme_stylebox_override("panel", _sbtex("panel_normal", 16, 16, 16, 16, Color(0.08, 0.06, 0.05, 1.0)))
	panel_layer.add_child(bg)
	# 标题栏(panel_emphasis 强调皮肤)
	var bar := PanelContainer.new()
	bar.anchor_right = 1.0
	bar.offset_bottom = 36
	bar.add_theme_stylebox_override("panel", _sbtex("panel_emphasis", 16, 16, 16, 16, Color(0.12, 0.09, 0.06, 1.0)))
	panel_layer.add_child(bar)
	panel_title = Label.new()
	panel_title.add_theme_font_override("font", ui_font)
	panel_title.add_theme_font_size_override("font_size", 18)
	panel_title.add_theme_color_override("font_color", Color(0.96, 0.86, 0.6))
	panel_title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	panel_title.position = Vector2(14, 0)
	bar.add_child(panel_title)
	var close := Button.new()
	close.text = "✕ 关闭"
	close.add_theme_font_override("font", ui_font)
	close.anchor_left = 1.0
	close.anchor_right = 1.0
	close.offset_left = -86
	close.offset_right = -8
	close.offset_top = 4
	close.offset_bottom = 32
	_style_btn(close, true)
	close.pressed.connect(_close_panel)
	bar.add_child(close)
	# 内容区
	panel_body = Control.new()
	panel_body.anchor_right = 1.0
	panel_body.anchor_bottom = 1.0
	panel_body.offset_top = 44
	panel_body.offset_left = 10
	panel_body.offset_right = -10
	panel_body.offset_bottom = -10
	panel_layer.add_child(panel_body)

func _open_panel(title: String, fill: Callable) -> void:
	panel_open = true
	panel_title.text = title
	for c in panel_body.get_children():
		c.queue_free()
	fill.call(panel_body)
	panel_layer.visible = true
	main_ui.visible = false
	if DisplayServer.get_name() != "headless" and _full_size.x > 0:
		var box = _panel_box()  # 锚定屏幕左下角(不居中/不全屏)
		DisplayServer.window_set_size(box.size)
		DisplayServer.window_set_position(box.pos)

func _close_panel() -> void:
	panel_open = false
	panel_layer.visible = false
	main_ui.visible = true
	if DisplayServer.get_name() != "headless" and _full_size.x > 0:
		DisplayServer.window_set_size(_full_size)
		DisplayServer.window_set_position(_full_pos)

# ---- 装备面板(P3:纸娃娃 + 仓库 + 穿戴/对比/出售)----
func _fill_equip(c: Control) -> void:
	var hb := HBoxContainer.new()
	hb.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hb.add_theme_constant_override("separation", 12)
	c.add_child(hb)

	# 左:已装备(纸娃娃)
	var left := VBoxContainer.new()
	left.custom_minimum_size = Vector2(330, 0)
	hb.add_child(left)
	var lt := _hdr("已装备 · 战力 %d" % Player.combat_power())
	left.add_child(lt)
	for sl in Player.EQUIP_SLOTS:
		var it = Player.s.equipped.get(sl, null)
		var row := Label.new()
		row.add_theme_font_override("font", ui_font)
		row.add_theme_font_size_override("font_size", 14)
		if it == null:
			row.text = "[%s] —— 空 ——" % _slot_cn(sl)
			row.add_theme_color_override("font_color", Color(0.5, 0.48, 0.42))
		else:
			row.text = "[%s] %s  %s" % [_slot_cn(sl), Player.item_name(it), _stat_brief(Player.item_stats(it))]
			row.add_theme_color_override("font_color", Player.rarity_color(it))
		left.add_child(row)

	# 右:仓库(可滚动列表)
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(right)
	right.add_child(_hdr("武器仓库 %d 件 · 金币 %d" % [Player.s.warehouse.size(), int(Player.s.gold)]))
	var tools := HBoxContainer.new()
	right.add_child(tools)
	var sellc := Button.new()
	sellc.text = "一键卖凡品+精良"
	sellc.add_theme_font_override("font", ui_font)
	_style_btn(sellc, false)
	sellc.pressed.connect(_sell_low)
	tools.add_child(sellc)
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_child(sc)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(list)
	var cur_cp = Player.combat_power()
	var shown = 0
	for item in Player.s.warehouse:
		if shown >= 60:  # 列表上限,避免一次铺太多(后续做分页/筛选)
			break
		shown += 1
		list.add_child(_equip_row(item, cur_cp))

func _equip_row(item: Dictionary, cur_cp: int) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var nm := Label.new()
	nm.add_theme_font_override("font", ui_font)
	nm.add_theme_font_size_override("font_size", 13)
	nm.custom_minimum_size = Vector2(360, 0)
	var delta = Player.cp_after_equip(item) - cur_cp
	var arrow = ("  ▲+%d" % delta) if delta > 0 else (("  ▼%d" % delta) if delta < 0 else "  =")
	nm.text = "【%s】%s Lv%d  %s%s" % [CombatCore.RARITY[item.get("rarity", "common")].name, Player.item_name(item), int(item.get("lv", 1)), _stat_brief(Player.item_stats(item)), arrow]
	nm.add_theme_color_override("font_color", Player.rarity_color(item))
	row.add_child(nm)
	var uid = int(item.get("uid", -1))
	var be := Button.new()
	be.text = "穿"
	be.add_theme_font_override("font", ui_font)
	be.custom_minimum_size = Vector2(40, 0)
	_style_btn(be, false)
	be.pressed.connect(func(): Player.equip_item(uid); _refresh_equip())
	row.add_child(be)
	var bs := Button.new()
	bs.text = "卖 %d💰" % int(CombatCore.SELL.get(item.get("rarity", "common"), 0))
	bs.add_theme_font_override("font", ui_font)
	_style_btn(bs, false)
	bs.pressed.connect(func(): Player.sell_item(uid); _refresh_equip())
	row.add_child(bs)
	return row

func _refresh_equip() -> void:
	for c in panel_body.get_children():
		c.queue_free()
	_fill_equip(panel_body)

func _sell_low() -> void:
	var to_sell := []
	for item in Player.s.warehouse:
		if item.get("rarity", "common") in ["common", "fine"]:
			to_sell.append(int(item.get("uid", -1)))
	for uid in to_sell:
		Player.sell_item(uid)
	_refresh_equip()

func _hdr(t: String) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_override("font", ui_font)
	l.add_theme_font_size_override("font_size", 15)
	l.add_theme_color_override("font_color", Color(0.95, 0.84, 0.55))
	return l

func _stat_brief(st: Dictionary) -> String:
	var parts := []
	for k in ["ATK", "HP", "DEF", "Crit", "CritDmg", "Hit", "Dodge", "ATKspd", "Mana"]:
		if st.has(k) and st[k] != 0:
			parts.append("%s+%d" % [k, int(st[k])])
	return " ".join(parts)

func _slot_cn(sl: String) -> String:
	return {"weapon": "武器", "head": "头", "body": "身", "legs": "腿", "neck": "项", "ring": "戒", "belt": "带"}.get(sl, sl)

# ---- 技能树面板(P3:力量战士 + 内功附魔流 两树 tab,投点/退点/对比)----
const SK_CW := 150.0
const SK_CH := 96.0
func _fill_skill(c: Control) -> void:
	var tree = Player.SKILL_TREES[skill_tab]
	# 顶部:tab + 技能点 + 重置
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 8)
	c.add_child(top)
	for i in range(Player.SKILL_TREES.size()):
		var tb := Button.new()
		tb.text = Player.SKILL_TREES[i].name
		tb.add_theme_font_override("font", ui_font)
		_style_btn(tb, i == skill_tab)
		var idx = i
		tb.pressed.connect(func(): skill_tab = idx; _refresh_skill())
		top.add_child(tb)
	var sp := _hdr("   技能点 %d / %d" % [Player.sp_left(), Player.sp_total()])
	top.add_child(sp)
	var rs := Button.new()
	rs.text = "重置本树"
	rs.add_theme_font_override("font", ui_font)
	_style_btn(rs, false)
	rs.pressed.connect(func(): Player.reset_skills(); _refresh_skill())
	top.add_child(rs)
	# 节点区(按 row/col 绝对定位)放进滚动容器→小窗口里不越界,可横/纵滚动查看整棵树
	var sc := ScrollContainer.new()
	sc.position = Vector2(0, 44)
	sc.anchor_right = 1.0
	sc.anchor_bottom = 1.0
	sc.offset_bottom = -4
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	c.add_child(sc)
	var area := Control.new()
	var maxc := 0
	var maxr := 0
	for n in tree.nodes:
		maxc = max(maxc, int(n.col))
		maxr = max(maxr, int(n.row))
	area.custom_minimum_size = Vector2((maxc + 1) * SK_CW, (maxr + 1) * SK_CH + 8)
	sc.add_child(area)
	for n in tree.nodes:
		area.add_child(_skill_cell(n))

func _skill_cell(n: Dictionary) -> Control:
	var rank = Player.skill_rank(n.id)
	var lock = Player.node_lock_reason(n)
	var maxed = rank >= int(n.max)
	var cell := PanelContainer.new()
	cell.position = Vector2(int(n.col) * SK_CW, int(n.row) * SK_CH)
	cell.custom_minimum_size = Vector2(SK_CW - 10, SK_CH - 10)
	# 槽位皮肤按状态:已学=active / 可学=avail / 锁=locked(缺图回退纯色边)
	var slot_name := "slot_active" if rank > 0 else ("slot_avail" if lock == "" else "slot_locked")
	var fb := Color(0.12, 0.10, 0.07, 0.95)
	var sb = _sbtex(slot_name, 8, 8, 8, 8, fb, 2)
	if sb is StyleBoxFlat:  # 回退态:保留原状态描边色
		sb = sb.duplicate()
		sb.border_color = Color(0.95, 0.78, 0.32) if rank > 0 else (Color(0.6, 0.5, 0.3) if lock == "" else Color(0.32, 0.28, 0.22))
	cell.add_theme_stylebox_override("panel", sb)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 1)
	cell.add_child(v)
	var nm := Label.new()
	nm.text = n.name + ("  ★" if n.get("active", false) else "")
	nm.add_theme_font_override("font", ui_font)
	nm.add_theme_font_size_override("font_size", 13)
	nm.add_theme_color_override("font_color", Color(0.97, 0.88, 0.6) if (rank > 0 or lock == "") else Color(0.55, 0.5, 0.42))
	v.add_child(nm)
	var rk := Label.new()
	rk.text = "%d / %d" % [rank, int(n.max)]
	rk.add_theme_font_override("font", ui_font)
	rk.add_theme_font_size_override("font_size", 12)
	rk.add_theme_color_override("font_color", Color(0.85, 0.82, 0.6))
	v.add_child(rk)
	var ds := Label.new()
	ds.text = lock if (lock != "" and rank == 0) else n.desc
	ds.add_theme_font_override("font", ui_font)
	ds.add_theme_font_size_override("font_size", 10)
	ds.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	ds.custom_minimum_size = Vector2(SK_CW - 20, 0)
	ds.add_theme_color_override("font_color", Color(0.95, 0.55, 0.45) if (lock != "" and rank == 0) else Color(0.66, 0.62, 0.5))
	v.add_child(ds)
	var btns := HBoxContainer.new()
	v.add_child(btns)
	var nid = n.id
	if not maxed and lock == "" and Player.sp_left() > 0:
		var bp := Button.new()
		bp.text = "+"
		bp.add_theme_font_override("font", ui_font)
		bp.custom_minimum_size = Vector2(28, 0)
		_style_btn(bp, true)
		bp.pressed.connect(func(): Player.spend_skill(nid); _refresh_skill())
		btns.add_child(bp)
	if rank > 0:
		var bm := Button.new()
		bm.text = "−"
		bm.add_theme_font_override("font", ui_font)
		bm.custom_minimum_size = Vector2(28, 0)
		_style_btn(bm, false)
		bm.pressed.connect(func(): Player.refund_skill(nid); _refresh_skill())
		btns.add_child(bm)
	return cell

func _refresh_skill() -> void:
	for ch in panel_body.get_children():
		ch.queue_free()
	_fill_skill(panel_body)

# ---- 功法面板(P3:装备4槽 + 已学修炼 + 商店购买)----
func _fill_kungfu(c: Control) -> void:
	var root := VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 6)
	c.add_child(root)
	var tid = Player.s.get("trainId", null)
	var tname = "—"
	if tid != null and CombatCore.gongfa_by_id(tid) != null: tname = CombatCore.gongfa_by_id(tid).name
	root.add_child(_hdr("金币 %d 💰   ·   打坐修炼中: %s" % [int(Player.s.gold), tname]))

	# 功法装备槽(4)
	var slots := HBoxContainer.new()
	slots.add_theme_constant_override("separation", 8)
	root.add_child(slots)
	for sl in CombatCore.GONGFA_SLOTS:
		slots.add_child(_kf_slot(sl))

	# 已学 | 商店 两列
	var cols := HBoxContainer.new()
	cols.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cols.add_theme_constant_override("separation", 12)
	root.add_child(cols)
	cols.add_child(_kf_list_owned())
	cols.add_child(_kf_list_shop())

func _kf_slot(sl: Dictionary) -> Control:
	var p := PanelContainer.new()
	p.custom_minimum_size = Vector2(170, 56)
	var eid0 = Player.s.gongfaEquip.get(sl.key, null)
	# 空槽=slot_empty,已装=slot_active(缺图回退纯色)
	p.add_theme_stylebox_override("panel", _sbtex("slot_active" if eid0 != null else "slot_empty", 8, 8, 8, 8, Color(0.12, 0.10, 0.07, 0.95)))
	var v := VBoxContainer.new()
	p.add_child(v)
	var eid = Player.s.gongfaEquip.get(sl.key, null)
	var t := Label.new()
	t.add_theme_font_override("font", ui_font)
	t.add_theme_font_size_override("font_size", 12)
	t.add_theme_color_override("font_color", Color(0.8, 0.74, 0.5))
	if eid != null and CombatCore.gongfa_by_id(eid) != null:
		var g = CombatCore.gongfa_by_id(eid)
		t.text = "[%s] %s Lv%d" % [sl.name, g.name, Player.gf_state(eid).lv]
		t.add_theme_color_override("font_color", Color(g.color))
		v.add_child(t)
		var bu := Button.new()
		bu.text = "卸下"
		bu.add_theme_font_override("font", ui_font)
		_style_btn(bu, false)
		var k = sl.key
		bu.pressed.connect(func(): Player.gf_unequip(k); _kf_refresh())
		v.add_child(bu)
	else:
		t.text = "[%s] 空" % sl.name
		v.add_child(t)
	return p

func _kf_list_owned() -> Control:
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_child(_hdr("已学功法"))
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_child(sc)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(list)
	for id in Player.gf_owned_ids():
		var g = CombatCore.gongfa_by_id(id)
		var stt = Player.gf_state(id)
		var row := HBoxContainer.new()
		var nm := Label.new()
		nm.add_theme_font_override("font", ui_font)
		nm.add_theme_font_size_override("font_size", 13)
		nm.custom_minimum_size = Vector2(280, 0)
		nm.text = "[%s]%s Lv%d (熟练 %d/%d)" % [g.tierName, g.name, stt.lv, stt.prof, CombatCore.gf_prof_req(stt.lv)]
		nm.add_theme_color_override("font_color", Color(g.color))
		row.add_child(nm)
		var be := Button.new()
		be.text = "装备"
		be.add_theme_font_override("font", ui_font)
		_style_btn(be, false)
		var gid = id
		be.pressed.connect(func(): _kf_equip(gid); _kf_refresh())
		row.add_child(be)
		var bt := Button.new()
		bt.text = "修炼"
		bt.add_theme_font_override("font", ui_font)
		_style_btn(bt, Player.s.get("trainId", null) == id)
		be.add_theme_font_override("font", ui_font)
		bt.pressed.connect(func(): Player.set_train(gid); _kf_refresh())
		row.add_child(bt)
		list.add_child(row)
	return box

func _kf_list_shop() -> Control:
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_child(_hdr("功法商店"))
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_child(sc)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(list)
	for g in CombatCore.GONGFA:
		if Player.s.gongfa.has(g.id): continue
		var row := HBoxContainer.new()
		var nm := Label.new()
		nm.add_theme_font_override("font", ui_font)
		nm.add_theme_font_size_override("font_size", 13)
		nm.custom_minimum_size = Vector2(280, 0)
		nm.text = "[%s]%s · %s系 · %d💰" % [g.tierName, g.name, _sys_cn(g.sys), int(g.price)]
		nm.add_theme_color_override("font_color", Color(g.color))
		row.add_child(nm)
		var bb := Button.new()
		bb.text = "购买"
		bb.add_theme_font_override("font", ui_font)
		bb.disabled = int(Player.s.gold) < int(g.price)
		_style_btn(bb, false)
		var gid = g.id
		bb.pressed.connect(func(): Player.gf_buy(gid); _kf_refresh())
		row.add_child(bb)
		list.add_child(row)
	return box

func _kf_equip(id: String) -> void:
	var g = CombatCore.gongfa_by_id(id)
	if g == null: return
	# 找本系第一个空槽,没有则用第一个本系槽替换
	var first = null
	for sl in CombatCore.GONGFA_SLOTS:
		if sl.sys == g.sys:
			if first == null: first = sl.key
			if Player.s.gongfaEquip.get(sl.key, null) == null:
				Player.gf_equip(sl.key, id); return
	if first != null: Player.gf_equip(first, id)

func _kf_refresh() -> void:
	for ch in panel_body.get_children():
		ch.queue_free()
	_fill_kungfu(panel_body)

func _sys_cn(sys: String) -> String:
	return {"nei": "内功", "wai": "外功", "qing": "轻功"}.get(sys, sys)

# ---- 居家技能面板(P4:4技能 + 3自动开关)----
func _fill_home(c: Control) -> void:
	var root := VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 6)
	c.add_child(root)
	root.add_child(_hdr("居家技能点 %d / %d  (每10级+1点,当前 Lv%d)" % [Player.home_sp_left(), Player.home_sp_total(), int(Player.s.level)]))
	for n in Player.HOME_SKILLS:
		var rk = Player.home_rank(n.id)
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		var nm := Label.new()
		nm.add_theme_font_override("font", ui_font)
		nm.add_theme_font_size_override("font_size", 14)
		nm.custom_minimum_size = Vector2(440, 0)
		nm.text = "%s  %d/%d  · %s" % [n.name, rk, int(n.max), n.desc]
		nm.add_theme_color_override("font_color", Color(0.95, 0.86, 0.6) if rk > 0 else Color(0.7, 0.66, 0.5))
		row.add_child(nm)
		var nid = n.id
		var bp := Button.new(); bp.text = "+"; bp.add_theme_font_override("font", ui_font); bp.custom_minimum_size = Vector2(30, 0)
		_style_btn(bp, false); bp.pressed.connect(func(): Player.home_adj(nid, 1); _home_refresh()); row.add_child(bp)
		var bm := Button.new(); bm.text = "−"; bm.add_theme_font_override("font", ui_font); bm.custom_minimum_size = Vector2(30, 0)
		_style_btn(bm, false); bm.pressed.connect(func(): Player.home_adj(nid, -1); _home_refresh()); row.add_child(bm)
		if nid == "spawn_speed" and rk > 0:
			var tg := Button.new()
			tg.text = "● 开" if not bool(Player.s.get("spawnSpeedOff", false)) else "○ 关"
			tg.add_theme_font_override("font", ui_font)
			_style_btn(tg, not bool(Player.s.get("spawnSpeedOff", false)))
			tg.pressed.connect(func(): Player.s["spawnSpeedOff"] = not bool(Player.s.get("spawnSpeedOff", false)); Player.save_slot(Player.slot); _home_refresh())
			row.add_child(tg)
		root.add_child(row)
	root.add_child(_hdr("自动挂机(学习后开关)"))
	for a in Player.HOME_AUTO:
		var learned = Player.home_rank(a.id) > 0
		var row2 := HBoxContainer.new()
		row2.add_theme_constant_override("separation", 8)
		var nm2 := Label.new()
		nm2.add_theme_font_override("font", ui_font)
		nm2.add_theme_font_size_override("font_size", 14)
		nm2.custom_minimum_size = Vector2(440, 0)
		nm2.text = "%s · %s" % [a.name, a.desc]
		nm2.add_theme_color_override("font_color", Color(0.9, 0.84, 0.6) if learned else Color(0.7, 0.66, 0.5))
		row2.add_child(nm2)
		var aid = a.id
		if not learned:
			var bl := Button.new(); bl.text = "学习(1点)"; bl.add_theme_font_override("font", ui_font)
			bl.disabled = Player.home_sp_left() <= 0
			_style_btn(bl, false); bl.pressed.connect(func(): Player.learn_auto(aid); _home_refresh()); row2.add_child(bl)
		else:
			var on = Player.auto_on(aid)
			var tg2 := Button.new(); tg2.text = "● 开启" if on else "○ 关闭"; tg2.add_theme_font_override("font", ui_font)
			_style_btn(tg2, on); tg2.pressed.connect(func(): Player.toggle_auto(aid); _home_refresh()); row2.add_child(tg2)
		root.add_child(row2)

func _home_refresh() -> void:
	for ch in panel_body.get_children(): ch.queue_free()
	_fill_home(panel_body)

# ---- 出战状态控制(bug1 状态机 / bug4 boss键)----
func _start_sortie() -> void:
	Player.s["sortieActive"] = true
	Player.save_slot(Player.slot)
	if home_view and home_view.has_method("exit_home_action"):
		home_view.exit_home_action()  # 出战与打坐/睡觉互斥:把主角从居家状态拉回

func _stop_sortie() -> void:
	if not bool(Player.s.get("sortieActive", false)):
		return
	Player.s["sortieActive"] = false
	Player.save_slot(Player.slot)
	# combat_view 的 _process 下一帧会侦测到 active=false 并入库当前趟战利品

# ---- 出战历练:开打/收兵 + 挑战首领 + 选区(P4 / bug1+4)----
func _fill_sortie(c: Control) -> void:
	var root := VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 5)
	c.add_child(root)
	var active = bool(Player.s.get("sortieActive", false))
	root.add_child(_hdr("当前状态:%s   ·   当前地图:%s" % ["⚔ 历练中" if active else "🏠 在家修整", Player.cur_zone().name]))

	# 开打 / 收兵 + 挑战本区首领
	var ctrl := HBoxContainer.new()
	ctrl.add_theme_constant_override("separation", 10)
	root.add_child(ctrl)
	var toggle := Button.new()
	toggle.text = "■ 收兵回家(带回战利品)" if active else "▶ 开始历练"
	toggle.add_theme_font_override("font", ui_font)
	toggle.custom_minimum_size = Vector2(220, 34)
	_style_btn(toggle, not active)
	toggle.pressed.connect(func():
		if bool(Player.s.get("sortieActive", false)): _stop_sortie()
		else: _start_sortie()
		_refresh_sortie())
	ctrl.add_child(toggle)
	var boss := Button.new()
	boss.text = "⚔ 挑战本区首领「%s」" % Player.cur_zone().boss.name
	boss.add_theme_font_override("font", ui_font)
	boss.custom_minimum_size = Vector2(260, 34)
	_style_btn(boss, true)
	boss.pressed.connect(func():
		_start_sortie()
		if combat_view and combat_view.has_method("force_boss"): combat_view.force_boss()
		_refresh_sortie())
	ctrl.add_child(boss)

	root.add_child(_hdr("选择历练地图(已解锁到 %s)" % Player.ZONES[clampi(int(Player.s.unlocked), 0, Player.ZONES.size() - 1)].name))
	for i in range(Player.ZONES.size()):
		var z = Player.ZONES[i]
		var locked = i > int(Player.s.unlocked)
		var row := HBoxContainer.new()
		var nm := Label.new()
		nm.add_theme_font_override("font", ui_font)
		nm.add_theme_font_size_override("font_size", 14)
		nm.custom_minimum_size = Vector2(420, 0)
		nm.text = "%s  (Lv%d-%d)%s" % [z.name, int(z.lvMin), int(z.lvMax), "  · 当前" if i == int(Player.s.zone) else ""]
		nm.add_theme_color_override("font_color", Color(0.4, 0.38, 0.34) if locked else (Color(1.0, 0.9, 0.5) if i == int(Player.s.zone) else Color(0.9, 0.84, 0.6)))
		row.add_child(nm)
		if not locked:
			var bg := Button.new(); bg.text = "前往并历练"; bg.add_theme_font_override("font", ui_font)
			_style_btn(bg, i == int(Player.s.zone))
			var zi = i
			bg.pressed.connect(func():
				Player.s["zone"] = zi
				_start_sortie()  # 前往=去该区开打
				Player.changed.emit()
				_refresh_sortie())
			row.add_child(bg)
		else:
			var lk := Label.new(); lk.text = "🔒未解锁"; lk.add_theme_font_override("font", ui_font)
			lk.add_theme_color_override("font_color", Color(0.5, 0.45, 0.4)); row.add_child(lk)
		root.add_child(row)

func _refresh_sortie() -> void:
	for ch in panel_body.get_children(): ch.queue_free()
	_fill_sortie(panel_body)
