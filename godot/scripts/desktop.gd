extends Control
# 桌面挂机横条外壳(WalyCai):无边框置顶、贴屏幕底部、高=屏幕高/4 的超宽横条。
# 左=室内界面(内嵌 home 场景,相机横向切片);右=历练界面(横版战斗,现占位待移植)。
# 一键隐藏→窗口缩成桌面角落小恢复按钮;点恢复键还原。

const STRIP_FRAC := 0.25   # 屏幕下方约 1/4 高
const LEFT_FRAC := 0.42    # 左室内占宽比例
const TOPBAR_H := 26

var ui_font: SystemFont
var home_view: Node2D
var home_vp: SubViewport
var topbar: Label
var hide_btn: Button
var restore_btn: Button
var main_ui: Control
var win_hidden := false
var _full_size: Vector2i
var _full_pos: Vector2i

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
	var h := int(ss.y * STRIP_FRAC)
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

	# 右:历练界面(占位)
	var right := Panel.new()
	right.anchor_left = LEFT_FRAC
	right.anchor_right = 1.0
	right.anchor_top = 0.0
	right.anchor_bottom = 1.0
	var rsb := StyleBoxFlat.new()
	rsb.bg_color = Color(0.10, 0.08, 0.07, 1.0)
	right.add_theme_stylebox_override("panel", rsb)
	main_ui.add_child(right)
	var rlabel := Label.new()
	rlabel.text = "历练界面\n横版战斗 · 即将接入"
	rlabel.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rlabel.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	rlabel.add_theme_font_override("font", ui_font)
	rlabel.add_theme_font_size_override("font_size", 18)
	rlabel.add_theme_color_override("font_color", Color(0.7, 0.62, 0.45))
	rlabel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	right.add_child(rlabel)

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

	# 隐藏按钮(右上角)
	hide_btn = Button.new()
	hide_btn.text = "✕ 隐藏"
	hide_btn.add_theme_font_override("font", ui_font)
	hide_btn.add_theme_font_size_override("font_size", 12)
	hide_btn.anchor_left = 1.0
	hide_btn.anchor_right = 1.0
	hide_btn.anchor_top = 0.0
	hide_btn.anchor_bottom = 0.0
	hide_btn.offset_left = -72
	hide_btn.offset_right = -4
	hide_btn.offset_top = 2
	hide_btn.offset_bottom = TOPBAR_H - 2
	hide_btn.pressed.connect(_toggle_hide)
	main_ui.add_child(hide_btn)

	# 恢复按钮(隐藏态显示,小而醒目)
	restore_btn = Button.new()
	restore_btn.text = "桌面武林 ▢"
	restore_btn.add_theme_font_override("font", ui_font)
	restore_btn.add_theme_font_size_override("font_size", 13)
	restore_btn.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	restore_btn.visible = false
	restore_btn.pressed.connect(_toggle_hide)
	add_child(restore_btn)

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
	if win_hidden or home_view == null or topbar == null:
		return
	var s = home_view.stats
	topbar.text = "  ❤ %d/%d   🔷 %d/%d   💰 %d   ⚔ Lv%d   💪 战力 %d" % [s.hp, s.hpMax, s.get("mana", 0), s.get("manaMax", 0), s.gold, s.level, s.get("cp", 0)]
