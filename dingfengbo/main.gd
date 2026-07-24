extends Node2D
# 《定风波》生产系统原型 v0.1
# 范围：农耕 / 养殖 / 酿酒 三套生产链 + 背包 + 加工乘数 + 里程碑事件
# 无战斗、无时间系统、无夜晚休息。生长/产出/发酵由「推进一步」手动驱动（A 模式：纯等成熟，无体力）。
# 占位美术＝色块+文字；等马奈 Image Two 整套素材出来按同格位/状态平替，不改逻辑。

# ---------------- 数据定义 ----------------
# 售价（体现加工乘数：生货便宜、成品贵）
const SELL := {"小麦": 8, "稻谷": 6, "鸡蛋": 10, "麦酒": 16, "米酒": 14}
# ↑ 酒价＝莱布尼茨 balance-v0.1 净收益率收敛后的值(选项A,≈生粮2倍)。若WalyCai选B改16→20/14→15即可。
# 作物：种子 -> {成品, 生长阶段数}
const CROP_DEF := {
	"麦种": {"crop": "小麦", "stages": 3},
	"稻种": {"crop": "稻谷", "stages": 3},
}
# 酿造配方：投入作物 -> 产出酒
const BREW := {"小麦": "麦酒", "稻谷": "米酒"}
const BREW_STEPS := 3      # 发酵需推进几步
const ANIMAL_STEPS := 3    # 畜产需推进几步

var step := 0
var gold := 50
var inv := {"麦种": 3, "稻种": 3}   # 起始背包

var plots := []     # {state: empty/tilled/planted, seed, crop, stage, maxs}
var animals := []   # {ready:int}
var vessels := []   # {state: empty/fermenting/done, input, product, prog}
var fired := {}     # 里程碑去重
var event_copy := {}   # 古龙的事件文本（key -> {title, first_text, repeat_text, next_action}）
var common_lines := {"stage": "当前：{stage}", "output": "获得：{output}", "unlock": "解锁：{unlock}"}

# UI 引用
var lbl_top: Label
var lbl_hint: Label
var plot_btns := []
var animal_btns := []
var vessel_btns := []
var lbl_inv: RichTextLabel
var log_lines := []   # 里程碑事件日志（也是给古龙的事件流）
var lbl_log: RichTextLabel

const N_PLOTS := 12
const N_ANIMALS := 2
const N_VESSELS := 3

func _ready() -> void:
	for i in N_PLOTS:
		plots.append({"state": "empty", "seed": "", "crop": "", "stage": 0, "maxs": 0})
	for i in N_ANIMALS:
		animals.append({"ready": 0})
	for i in N_VESSELS:
		vessels.append({"state": "empty", "input": "", "product": "", "prog": 0})
	_load_event_copy()
	_build_ui()
	refresh()
	_emit_milestone("game_start", true, "", "", "")
	# 自动截图模式：Godot ... -- --shot <path>
	var a := OS.get_cmdline_user_args()
	if a.size() >= 2 and a[0] == "--shot":
		await _auto_demo_and_shot(a[1])

# ---------------- UI 构建 ----------------
func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.42, 0.58, 0.32)   # 草地绿
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var root := VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 16; root.offset_top = 12
	root.offset_right = -16; root.offset_bottom = -12
	root.add_theme_constant_override("separation", 10)
	add_child(root)

	# 顶栏
	var top := PanelContainer.new()
	root.add_child(top)
	var toph := HBoxContainer.new()
	toph.add_theme_constant_override("separation", 18)
	top.add_child(toph)
	lbl_top = _mklabel("", 20)
	toph.add_child(lbl_top)
	var btn_step := _mkbutton("▶ 推进一步", 20)
	btn_step.pressed.connect(_on_advance)
	toph.add_child(btn_step)
	var btn_sell := _mkbutton("💰 卖出所有作物/成品", 18)
	btn_sell.pressed.connect(_on_sell_all)
	toph.add_child(btn_sell)
	lbl_hint = _mklabel("", 15)
	lbl_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lbl_hint.custom_minimum_size = Vector2(360, 0)
	toph.add_child(lbl_hint)

	# 中部三区
	var mid := HBoxContainer.new()
	mid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mid.add_theme_constant_override("separation", 12)
	root.add_child(mid)

	# 农田
	var farm := _mkpanel("　田　（点：空地→开垦→播种→[推进生长]→收获）")
	mid.add_child(farm.panel)
	farm.panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	farm.box.add_child(grid)
	for i in N_PLOTS:
		var b := _mktile()
		var idx := i
		b.pressed.connect(func(): _on_plot(idx))
		grid.add_child(b)
		plot_btns.append(b)

	# 右列：养殖 + 酿酒
	var rcol := VBoxContainer.new()
	rcol.add_theme_constant_override("separation", 12)
	mid.add_child(rcol)

	var pen := _mkpanel("　畜栏　（点：收集产出）")
	rcol.add_child(pen.panel)
	var penh := HBoxContainer.new()
	penh.add_theme_constant_override("separation", 6)
	pen.box.add_child(penh)
	for i in N_ANIMALS:
		var b := _mktile()
		var idx := i
		b.pressed.connect(func(): _on_animal(idx))
		penh.add_child(b)
		animal_btns.append(b)

	var brew := _mkpanel("　酿造　（点：空缸投料→[推进发酵]→取酒）")
	rcol.add_child(brew.panel)
	var brewh := HBoxContainer.new()
	brewh.add_theme_constant_override("separation", 6)
	brew.box.add_child(brewh)
	for i in N_VESSELS:
		var b := _mktile()
		var idx := i
		b.pressed.connect(func(): _on_vessel(idx))
		brewh.add_child(b)
		vessel_btns.append(b)

	# 底部：背包 + 里程碑
	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 12)
	bottom.custom_minimum_size = Vector2(0, 180)
	root.add_child(bottom)

	var invp := _mkpanel("　背包 / 经济　")
	invp.panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_child(invp.panel)
	lbl_inv = RichTextLabel.new()
	lbl_inv.bbcode_enabled = true
	lbl_inv.fit_content = true
	lbl_inv.custom_minimum_size = Vector2(320, 150)
	lbl_inv.add_theme_font_size_override("normal_font_size", 15)
	invp.box.add_child(lbl_inv)

	var logp := _mkpanel("　里程碑事件（＝给叙事的事件流：发生什么 / 得到什么 / 下一步）")
	logp.panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_child(logp.panel)
	lbl_log = RichTextLabel.new()
	lbl_log.bbcode_enabled = true
	lbl_log.scroll_following = true
	lbl_log.custom_minimum_size = Vector2(560, 150)
	lbl_log.add_theme_font_size_override("normal_font_size", 14)
	logp.box.add_child(lbl_log)

func _mklabel(t: String, sz: int) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_size_override("font_size", sz)
	l.add_theme_color_override("font_color", Color(0.12, 0.1, 0.08))
	return l

func _mkbutton(t: String, sz: int) -> Button:
	var b := Button.new()
	b.text = t
	b.add_theme_font_size_override("font_size", sz)
	return b

func _mktile() -> Button:
	var b := Button.new()
	b.custom_minimum_size = Vector2(96, 96)
	b.add_theme_font_size_override("font_size", 14)
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.clip_text = true
	return b

func _mkpanel(title: String) -> Dictionary:
	var p := PanelContainer.new()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	p.add_child(v)
	var t := _mklabel(title, 16)
	v.add_child(t)
	return {"panel": p, "box": v}

# ---------------- 交互 ----------------
func _on_plot(i: int) -> void:
	var p = plots[i]
	match p.state:
		"empty":
			p.state = "tilled"
			_emit_milestone("first_till", not fired.has("first_till"), "已耕", "", "")
		"tilled":
			var seed := _first_available_seed()
			if seed == "":
				lbl_hint.text = "背包没有种子了——先卖点作物/成品，或收获现有作物。"
			else:
				inv[seed] -= 1
				var d = CROP_DEF[seed]
				p.state = "planted"; p.seed = seed; p.crop = d.crop
				p.stage = 0; p.maxs = d.stages
				_emit_milestone("first_plant", not fired.has("first_plant"), "阶段 0/%d" % p.maxs, "", "")
		"planted":
			if p.stage >= p.maxs:
				var c: String = p.crop
				_add(c, 1)
				_emit_milestone("first_harvest", not fired.has("first_harvest"), "", "%s × 1" % c, "")
				p.state = "tilled"; p.crop = ""; p.stage = 0; p.maxs = 0
			else:
				lbl_hint.text = "%s 还没熟（阶段 %d/%d）——点『推进一步』。" % [p.crop, p.stage, p.maxs]
	refresh()

func _on_animal(i: int) -> void:
	var a = animals[i]
	if a.ready >= ANIMAL_STEPS:
		a.ready = 0
		_add("鸡蛋", 1)
		_emit_milestone("first_egg", not fired.has("first_egg"), "", "鸡蛋 × 1", "")
	else:
		lbl_hint.text = "还没到产蛋（%d/%d）——点『推进一步』。" % [a.ready, ANIMAL_STEPS]
	refresh()

func _on_vessel(i: int) -> void:
	var v = vessels[i]
	match v.state:
		"empty":
			var crop := _first_brewable()
			if crop == "":
				lbl_hint.text = "没有可酿造的原料（需要 小麦 或 稻谷）——先去收获。"
			else:
				inv[crop] -= 1
				v.state = "fermenting"; v.input = crop; v.product = BREW[crop]; v.prog = 0
				_emit_milestone("first_brew_load", not fired.has("first_brew_load"), "发酵 0/%d" % BREW_STEPS, "", "")
		"fermenting":
			lbl_hint.text = "%s 发酵中（%d/%d）——点『推进一步』。" % [v.product, v.prog, BREW_STEPS]
		"done":
			var prod: String = v.product
			_add(prod, 1)
			_emit_milestone("first_brew_done", not fired.has("first_brew_done"), "", "%s × 1" % prod, "")
			v.state = "empty"; v.input = ""; v.product = ""; v.prog = 0
	refresh()

func _on_advance() -> void:
	step += 1
	for p in plots:
		if p.state == "planted" and p.stage < p.maxs:
			p.stage += 1
			if p.stage == p.maxs:
				_emit_milestone("crop_ripe", not fired.has("crop_ripe"), "成熟", "", "")
	for a in animals:
		if a.ready < ANIMAL_STEPS:
			a.ready += 1
			if a.ready == ANIMAL_STEPS:
				_emit_milestone("animal_ready", not fired.has("animal_ready"), "就绪", "", "")
	for v in vessels:
		if v.state == "fermenting":
			v.prog += 1
			if v.prog >= BREW_STEPS:
				v.state = "done"
				_emit_milestone("brew_ready", not fired.has("brew_ready"), "出窖", "", "")
	lbl_hint.text = "推进到第 %d 步。所有作物/畜产/发酵各前进一格。" % step
	refresh()

func _on_sell_all() -> void:
	var earned := 0
	var sold := []
	for item in SELL.keys():
		var q: int = inv.get(item, 0)
		if q > 0:
			earned += q * SELL[item]
			sold.append("%s×%d" % [item, q])
			inv[item] = 0
	if earned > 0:
		gold += earned
		_emit_milestone("first_sale", not fired.has("first_sale"), "", "+%d 金币（%s）" % [earned, ", ".join(sold)], "")
	else:
		lbl_hint.text = "没有可卖的作物/成品。"
	refresh()

# ---------------- 工具 ----------------
func _first_available_seed() -> String:
	for s in CROP_DEF.keys():
		if inv.get(s, 0) > 0:
			return s
	return ""

func _first_brewable() -> String:
	for c in BREW.keys():
		if inv.get(c, 0) > 0:
			return c
	return ""

func _add(item: String, n: int) -> void:
	inv[item] = inv.get(item, 0) + n

func _load_event_copy() -> void:
	var f := FileAccess.open("res://assets/event_copy.json", FileAccess.READ)
	if f == null:
		return
	var data = JSON.parse_string(f.get_as_text())
	if typeof(data) == TYPE_DICTIONARY and data.has("events"):
		event_copy = data["events"]
		if data.has("meta") and data["meta"].has("common_lines"):
			common_lines = data["meta"]["common_lines"]

func _emit_milestone(key: String, is_first: bool, stage: String, output: String, unlock: String) -> void:
	# 事件接口：key / 首次触发 / 当前阶段(stage) / 产物与数量(output) / 新解锁项(unlock) / 下一步动作
	# 标题/正文/下一步文本来自古龙的 event_copy.json（三方共用一份字典，同 key）。
	fired[key] = true
	var ev: Dictionary = event_copy.get(key, {})
	var title: String = ev.get("title", key)
	var body: String = ev.get("first_text", "") if is_first else ev.get("repeat_text", "")
	var next_action: String = ev.get("next_action", "")
	var tag := "  [color=#8a5a2b]（首次）[/color]" if is_first else ""
	var line := "[b]%s[/b]%s\n%s" % [title, tag, body]
	if stage != "":
		line += "\n[color=#3a5a80]%s[/color]" % String(common_lines.get("stage", "当前：{stage}")).format({"stage": stage})
	if output != "":
		line += "\n[color=#2f6a2f]%s[/color]" % String(common_lines.get("output", "获得：{output}")).format({"output": output})
	if unlock != "":
		line += "\n[color=#7a5a2b]%s[/color]" % String(common_lines.get("unlock", "解锁：{unlock}")).format({"unlock": unlock})
	if next_action != "":
		line += "\n[color=#666]→ %s[/color]" % next_action
	log_lines.append(line)
	print("[里程碑] key=%s first=%s title=%s stage=%s output=%s unlock=%s next=%s" % [key, is_first, title, stage, output, unlock, next_action])

func refresh() -> void:
	lbl_top.text = "步数 %d    金币 %d" % [step, gold]
	# 农田
	for i in N_PLOTS:
		var p = plots[i]
		var b: Button = plot_btns[i]
		match p.state:
			"empty":
				b.text = "空地"; b.modulate = Color(0.75, 0.68, 0.55)
			"tilled":
				b.text = "已耕\n(可播种)"; b.modulate = Color(0.55, 0.4, 0.28)
			"planted":
				if p.stage >= p.maxs:
					b.text = "%s\n✔ 可收获" % p.crop; b.modulate = Color(0.55, 0.85, 0.4)
				else:
					var sym: String = ["·种", "芽", "长"][min(p.stage, 2)]
					b.text = "%s\n%s %d/%d" % [p.crop, sym, p.stage, p.maxs]
					b.modulate = Color(0.6, 0.75, 0.45)
	# 畜栏
	for i in N_ANIMALS:
		var a = animals[i]
		var b: Button = animal_btns[i]
		if a.ready >= ANIMAL_STEPS:
			b.text = "鸡\n✔ 蛋可收"; b.modulate = Color(0.95, 0.9, 0.5)
		else:
			b.text = "鸡\n%d/%d" % [a.ready, ANIMAL_STEPS]; b.modulate = Color(0.9, 0.9, 0.85)
	# 酿造
	for i in N_VESSELS:
		var v = vessels[i]
		var b: Button = vessel_btns[i]
		match v.state:
			"empty":
				b.text = "空缸\n(可投料)"; b.modulate = Color(0.7, 0.7, 0.8)
			"fermenting":
				b.text = "%s\n发酵 %d/%d" % [v.product, v.prog, BREW_STEPS]; b.modulate = Color(0.5, 0.4, 0.7)
			"done":
				b.text = "%s\n✔ 出窖" % v.product; b.modulate = Color(0.85, 0.6, 0.9)
	# 背包
	var s := "[b]金币[/b] %d\n" % gold
	var order := ["麦种", "稻种", "小麦", "稻谷", "鸡蛋", "麦酒", "米酒"]
	for it in order:
		var q: int = inv.get(it, 0)
		if q > 0:
			var pr := "  （售价 %d）" % SELL[it] if SELL.has(it) else "  （种子）"
			s += "%s ×%d%s\n" % [it, q, pr]
	lbl_inv.text = s
	# 日志（近 8 条）
	var start = max(0, log_lines.size() - 8)
	lbl_log.text = "\n".join(log_lines.slice(start, log_lines.size()))

# ---------------- 自动演示 + 截图 ----------------
func _auto_demo_and_shot(path: String) -> void:
	# 无人操作时自动跑一小段，让截图里有内容
	_on_plot(0); _on_plot(0)          # 地块0：耕+种
	_on_plot(1); _on_plot(1)          # 地块1：耕+种
	_on_plot(2)                        # 地块2：耕
	_on_vessel(0)                      # 缸0：需要原料，先没有 → 提示（演示）
	for k in 3: _on_advance()          # 推进3步：作物成熟
	_on_plot(0)                        # 收获地块0
	_on_vessel(0)                      # 投料酿造（此时有稻谷/小麦）
	for k in 3: _on_advance()          # 发酵完成
	_on_vessel(0)                      # 取酒
	_on_animal(0)                      # 收蛋
	_on_sell_all()                     # 卖出
	refresh()
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(path)
	print("SHOT_SAVED:", path)
	get_tree().quit()
