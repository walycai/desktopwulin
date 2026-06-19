// ============================================================
// 桌面武林 · 室内家园 等距(2.5D)摆放原型 v0.3（canvas 渲染）
// 2:1 等距菱形地格；painter's 深度排序保证遮挡；两面墙放壁挂(分高低)。
// 功能件：床(普通/高级,回血+解负面)、打坐台(固定,涨内功)。
// 主角：随机溜达；点床→走过去睡觉；点打坐台→走过去打坐；其他不可点。
// 美术：占位等距块；真图按等距透视放 assets/ 后替换。
// ============================================================
(function () {
  "use strict";
  var CORE = window.WULIN_CORE; // 战斗核心单一源(数值/功法/build→实战)
  var HW = 12, HH = 6;          // 小格菱形半宽/半高 (2:1)
  var GW = 96, GH = 70;         // 地板小格：参考大宅截图扩大室内面积
  var FURN_SCALE = 0.78;        // 人物显示高不变，家具视觉缩小到更接近参考图比例
  var WALL_ROWS = 16, ROW_PX = 11; // 墙高 16 小格档，每档像素
  var WALL_PX = WALL_ROWS * ROW_PX;
  var MARGIN = 40, HEAD = 120, YARD = 24; // 边距 / 家具顶部留白 / 院景边界格数
  var PLAYER_CELLS = 4;
  var OX = MARGIN + (GH + YARD) * HW;
  var OY = MARGIN + WALL_PX + HEAD;
  var SAVE_BASE = "wulin_iso_v1"; // 3 存档位：位1=旧key(无后缀,老存档自动归位1)，位2/3加后缀
  var activeSlot = (function () { var n = parseInt(localStorage.getItem("wulin_slot"), 10); return (n === 2 || n === 3) ? n : 1; })();
  function slotKey(n) { return SAVE_BASE + (n === 1 ? "" : "_s" + n); }
  var SAVE_KEY = slotKey(activeSlot);

  // 物品目录（占格 w×h，画面高度另给 zh；fixed 不可拖；func 功能件）
  var CATALOG = [
    { id: "bed_basic", name: "普通床", cat: "bed", w: 10, h: 18, zh: 24, func: "bed", heal: 1.2, cure: 0.4, glyph: "🛏", color: "#8a6240" },
    { id: "bed_advanced", name: "高级床", cat: "bed", w: 22, h: 12, zh: 32, func: "bed", heal: 3.5, cure: 1.4, glyph: "🛏", color: "#a8743e" },
    { id: "meditation_dais", name: "打坐台", cat: "func", w: 12, h: 12, zh: 16, fixed: true, func: "meditate", neigong: 1.2, glyph: "🧘", color: "#5f7298" },
    { id: "chair_round", name: "圈椅", cat: "chair", w: 5, h: 5, zh: 26, glyph: "🪑", color: "#6a4a30" },
    { id: "chair_bench", name: "长凳", cat: "chair", w: 9, h: 4, zh: 14, glyph: "🪵", color: "#6a4a30" },
    { id: "chair_cushion", name: "蒲团", cat: "chair", w: 5, h: 5, zh: 6, glyph: "⊙", color: "#8a7a4a" },
    { id: "chair_taishi", name: "太师椅", cat: "chair", w: 6, h: 6, zh: 34, glyph: "🪑", color: "#5a3a22" },
    { id: "table_square", name: "方桌", cat: "table", w: 9, h: 9, zh: 22, glyph: "🀫", color: "#7a5636" },
    { id: "table_tea", name: "茶几", cat: "table", w: 7, h: 7, zh: 14, glyph: "🍵", color: "#7a5636" },
    { id: "table_desk", name: "书案", cat: "table", w: 11, h: 6, zh: 18, glyph: "📜", color: "#6a4a2e" },
    { id: "table_long", name: "条案", cat: "table", w: 13, h: 5, zh: 18, glyph: "▭", color: "#6a4a2e" },
    { id: "wall_landscape", name: "山水画", cat: "wallhang", w: 8, h: 6, wall: true, glyph: "🏞", color: "#8a8a6a" },
    { id: "wall_scroll", name: "山水卷轴", cat: "wallhang", w: 8, h: 14, wall: true, glyph: "🪧", color: "#bcae86" },
    { id: "wall_swordrack", name: "宝剑挂架", cat: "wallhang", w: 6, h: 4, wall: true, glyph: "🗡", color: "#9a9aa0" },
    { id: "wall_lantern", name: "灯笼", cat: "wallhang", w: 3, h: 5, wall: true, glyph: "🏮", color: "#b04a3a" },
    { id: "wall_mirror", name: "铜镜", cat: "wallhang", w: 4, h: 5, wall: true, glyph: "🪞", color: "#9a8a5a" },
    { id: "wall_weapon", name: "兵器架", cat: "wallhang", w: 7, h: 6, wall: true, glyph: "⚔", color: "#8a8a90" },
    { id: "decor_vase", name: "花瓶", cat: "decor", w: 2, h: 2, zh: 14, glyph: "🏺", color: "#5a7a8a" },
    { id: "decor_brush", name: "毛笔", cat: "decor", w: 2, h: 1, zh: 4, glyph: "🖌", color: "#5a4a3a" },
    { id: "decor_inkstone", name: "砚台", cat: "decor", w: 2, h: 2, zh: 3, glyph: "▦", color: "#3a3a3a" },
    { id: "decor_censer", name: "香炉", cat: "decor", w: 3, h: 3, zh: 12, glyph: "🕯", color: "#7a6a4a" },
    { id: "decor_teaset", name: "茶具", cat: "decor", w: 3, h: 2, zh: 6, glyph: "🫖", color: "#8a6a4a" },
    { id: "decor_weiqi", name: "棋盘", cat: "decor", w: 4, h: 4, zh: 4, glyph: "▩", color: "#9a7a4a" },
    { id: "decor_guqin", name: "古琴", cat: "decor", w: 9, h: 3, zh: 6, glyph: "🎴", color: "#5a3a2a" },
    { id: "decor_bonsai", name: "盆景", cat: "decor", w: 3, h: 3, zh: 14, glyph: "🪴", color: "#4a6a3a" },
    { id: "decor_candle", name: "烛台", cat: "decor", w: 2, h: 2, zh: 12, glyph: "🕯", color: "#aa8a3a" },
    { id: "decor_books", name: "书堆", cat: "decor", w: 3, h: 2, zh: 8, glyph: "📚", color: "#6a5a8a" },
    { id: "decor_wine", name: "酒坛", cat: "decor", w: 3, h: 3, zh: 12, glyph: "🍶", color: "#5a6a5a" },
    { id: "decor_screen", name: "屏风", cat: "decor", w: 11, h: 3, zh: 30, glyph: "🪟", color: "#7a6a5a" },
    { id: "decor_ruyi", name: "如意", cat: "decor", w: 5, h: 2, zh: 4, glyph: "🦴", color: "#9a8a5a" },
    // ---- B 类收纳/居家（吴冠中 2026-06-17）----
    { id: "storage_wardrobe", name: "衣柜", cat: "storage", w: 8, h: 5, zh: 34, glyph: "🚪", color: "#6a4a30" },
    { id: "storage_shelf", name: "博古架", cat: "storage", w: 9, h: 4, zh: 32, glyph: "🗄", color: "#7a5636" },
    { id: "storage_chest", name: "木箱", cat: "storage", w: 8, h: 5, zh: 12, glyph: "🧰", color: "#6a4a2e" },
    { id: "storage_medicine_cabinet", name: "药柜", cat: "storage", w: 8, h: 4, zh: 30, glyph: "🗃", color: "#5a4a3a" },
    { id: "decor_food_box", name: "食盒", cat: "decor", w: 5, h: 3, zh: 10, glyph: "🍱", color: "#8a6a4a" },
    { id: "decor_wash_basin", name: "洗漱盆", cat: "decor", w: 5, h: 5, zh: 14, glyph: "🪣", color: "#7a8a8a" },
    { id: "decor_floor_lamp", name: "落地灯", cat: "decor", w: 3, h: 3, zh: 28, glyph: "🪔", color: "#b09a4a" },
    { id: "decor_rug_large", name: "地毯", cat: "decor", w: 16, h: 12, zh: 2, rug: true, glyph: "▦", color: "#8a5a4a" } // 地面平铺：不阻挡、画在最底层
  ];
  // 经济字段：环境值 env(摆放后涨居家环境) + 价格 price(金币购买)。占位公式，待莱布尼茨精调（可改为逐件赋值）
  CATALOG.forEach(function (c) {
    if (c.env == null) c.env = Math.max(1, Math.round(c.w * c.h / 16)); // 莱布尼茨 v1：÷16(起始29环境<50阈值)
    if (c.price == null) { var eff = (c.cat === "bed" || c.cat === "table" || c.cat === "chair" || c.cat === "func" || c.cat === "storage"); c.price = c.env * (eff ? 10 : 20); } // 高效家具×10 / 装饰类×20
  });
  var CATS = [{ key: "bed", label: "床" }, { key: "func", label: "功能" }, { key: "chair", label: "椅" }, { key: "table", label: "桌" }, { key: "storage", label: "收纳" }, { key: "wallhang", label: "壁挂" }, { key: "decor", label: "装饰" }];
  var $ = function (id) { return document.getElementById(id); };
  var byId = {}; CATALOG.forEach(function (c) { byId[c.id] = c; });

  // ---- 状态 ----
  var canvas, ctx, dpr = 1, CW, CH;
  var bag = {}, placed = [], occ = [], wallOcc = { left: [], right: [] };
  var selId = null, ghostRot = 0, uidSeq = 1, activeCat = "bed";
  var stats = { hp: 100, hpMax: 100, poison: false, weak: false, ng: 1, ngP: 0, level: 1, exp: 0, sp: 0, skills: {}, mana: 0, manaMax: 0, gold: 0, homeSkills: {}, homeSpSpent: 0, owned: {}, gongfa: {}, gongfaEquip: { nei: null, wai1: null, wai2: null, qing: null }, trainId: null }, NG_PER_LV = 100;
  var ENV_PER_POINT = 50; // 居家环境值每 +50 给 1 居家技能点
  var HOME_SKILLS = [
    { id: "sleep_eff", name: "安眠", max: 5, desc: "睡觉回血效率 +20% / 级" },
    { id: "meditate_eff", name: "悟道", max: 5, desc: "打坐功法效率 +20% / 级" },
    { id: "sell_price", name: "精算", max: 5, desc: "装备售价 +12% / 级" },
    { id: "spawn_speed", name: "诱敌", max: 5, desc: "历练刷怪速度提升 / 级（挂机更快）" },
    { id: "drop_quality", name: "寻宝", max: 5, desc: "装备掉落高品质概率提升 / 级" },
    { id: "elite_chance", name: "群英", max: 5, desc: "精英怪出现概率提升 / 级（精英=小怪与boss之间，掉落更好）" }
  ];
  // 自动化居家技能(WalyCai):学习(花1点)后得到一个开关;满血自动打坐 与 满血自动历练 互斥二选一
  var HOME_AUTO = [
    { id: "auto_sleep", name: "回家自动睡觉", desc: "在家受伤时自动上床睡觉回血" },
    { id: "auto_meditate", name: "满血自动打坐", desc: "满血时自动去打坐修炼功法（与自动历练二选一）", excl: "auto_sortie" },
    { id: "auto_sortie", name: "满血自动历练", desc: "满血时自动进入上次的地图历练（与自动打坐二选一）", excl: "auto_meditate" }
  ];
  // ---- 功法系统：数据/数值以 combat-core 为单一源(与 sim 共用) ----
  var GONGFA = CORE.GONGFA, GONGFA_SLOTS = CORE.GONGFA_SLOTS, GONGFA_MAXLV = CORE.GONGFA_MAXLV;
  function gfActiveDesc(g, lv) { return CORE.gfActiveDesc(g, lv, neigongLv()); }
  function gfActNote(g) { // 外功主动需匹配武器类型才能触发(WalyCai硬门槛);被动不受影响
    if (g.akind !== "weapon") return "（需装备）";
    var req = CORE.WTYPE_NAME[g.wtype], cur = CORE.wtypeOf(equipped.weapon);
    if (!equipped.weapon) return '（需装备 + 「' + req + '」武器，<span style="color:#ff8a7a">当前未装武器</span>）';
    if (cur === g.wtype) return '（需装备 + 「' + req + '」武器 <span style="color:#7fe0a0">✓已满足</span>）';
    return '（需装备 + 「' + req + '」武器，<span style="color:#ff8a7a">当前武器为' + (CORE.WTYPE_NAME[cur] || "其它") + '·技能不触发</span>）';
  }
  function gongfaById(id) { return CORE.gongfaById(id); }
  function gfState(id) { return (stats.gongfa && stats.gongfa[id]) || { lv: 0, prof: 0 }; }
  function gfProfReq(lv) { return CORE.gfProfReq(lv); }
  function gfEquippedSlot(id) { for (var i = 0; i < GONGFA_SLOTS.length; i++) { var k = GONGFA_SLOTS[i].key; if (stats.gongfaEquip[k] === id) return k; } return null; }
  function trainGongfa(amt) {
    var id = stats.trainId; if (!id) return; var g = gongfaById(id); if (!g) return;
    var st = stats.gongfa[id]; if (!st) { st = stats.gongfa[id] = { lv: 1, prof: 0 }; }
    if (st.lv >= GONGFA_MAXLV) return;
    st.prof += amt;
    while (st.lv < GONGFA_MAXLV && st.prof >= gfProfReq(st.lv)) { st.prof -= gfProfReq(st.lv); st.lv++; toast("「" + g.name + "」修炼到 " + st.lv + " 级！"); syncHpMax(); }
  }
  var player = { cx: GW / 2, cy: GH * 0.6, tx: GW / 2, ty: GH * 0.6, state: "wander", actUid: 0, speed: 14, dir: "down", anim: "idle", fi: 0, fclock: 0, busy: false };
  var images = {}, sprites = {}, env = {};
  var mouse = { x: -1, y: -1, cx: -1, cy: -1, onWall: null };
  var drag = null, selectedPlaced = null, moveMode = null, longTimer = null;
  var DEBUG_FOOT = false; // 按 G 切换：显示每件家具的 footprint 菱形，校验贴图对齐

  // ---- 等距投影（小格中心）----
  function v(cx, cy) { return { x: OX + (cx - cy) * HW, y: OY + (cx + cy) * HH }; } // 网格顶点
  function cellCenter(cx, cy) { return v(cx + 0.5, cy + 0.5); }
  function screenToCell(sx, sy) {
    var dx = sx - OX, dy = sy - OY;
    return { cx: Math.floor((dx / HW + dy / HH) / 2), cy: Math.floor((dy / HH - dx / HW) / 2) };
  }

  function resetOcc() {
    occ = []; for (var y = 0; y < GH; y++) { occ[y] = []; for (var x = 0; x < GW; x++) occ[y][x] = 0; }
    wallOcc = { left: [], right: [] }; for (var i = 0; i < GW; i++) { wallOcc.right[i] = 0; } for (var j = 0; j < GH; j++) { wallOcc.left[j] = 0; }
  }

  // ---- 资源 ----
  function tryLoad(src, key, store) { var im = new Image(); im.onload = function () { store[key] = im; }; im.src = src + "?_=" + Date.now(); }
  function loadAssets() {
    CATALOG.forEach(function (c) {
      tryLoad("assets/furniture/" + c.cat + "/" + c.id + (c.wall ? "_right" : "") + ".png", c.id, images);
      if (c.wall) tryLoad("assets/furniture/" + c.cat + "/" + c.id + "_left.png", c.id + "_left", images);
      else if (!c.rug) [1, 2, 3].forEach(function (r) { tryLoad("assets/furniture/" + c.cat + "/" + c.id + "_r" + r + ".png", c.id + "_r" + r, images); }); // 方向贴图(可选 2/4 面)
    });
    ["idle", "walk", "sleep", "meditate"].forEach(function (a) { tryLoad("assets/characters/protagonist/" + a + ".png", a, sprites); });
    tryLoad("assets/tiles/indoor/floor_large.png", "floorLarge", env);
    tryLoad("assets/tiles/indoor/wall_right.png", "wallRight", env);
    tryLoad("assets/tiles/indoor/wall_left.png", "wallLeft", env);
    tryLoad("assets/tiles/exterior/courtyard.png", "courtyard", env);
  }
  var SPR = { fw: 48, fh: 64, frames: { idle: 4, walk: 8, sleep: 4, meditate: 4 }, fps: { idle: 6, walk: 10, sleep: 4, meditate: 6 }, dirs: { idle: 4, walk: 4, sleep: 1, meditate: 1 }, dirRow: { down: 0, left: 1, right: 2, up: 3 } };
  var PLAYER_SCALE = 1.6;               // 房屋内主角放大(旧;现按显示高自适应)
  var PLAYER_DISP_H = 104;              // 主角在房内的显示高(px)，按帧高自适应缩放→换更高分辨率帧表也不变占位
  var MEDITATE_Y_LIFT = 0.34;           // 打坐时主角上抬比例(坐到台面蒲团上)，可微调
  var SLEEP_Y_LIFT = 0.15;              // 睡觉时再上抬比例(躺到床中央而非床脚)，可微调
  var APPEAR_SLOTS = ["body", "legs", "head", "weapon"]; // 只有这些装备改外观(叠在主角上;项链/戒指/腰带不变外观)
  var equipSprites = {};                // tid -> {idle,walk,sleep,meditate} 装备外观层(与主角同帧布局 48×64)
  function loadEquipOverlay(tid) {
    if (!tid || equipSprites[tid]) return; equipSprites[tid] = {};
    ["idle", "walk", "sleep", "meditate"].forEach(function (a) { var im = new Image(); im.onload = function () { equipSprites[tid][a] = im; }; im.src = "assets/characters/equip/" + tid + "/" + a + ".png?_=" + Date.now(); });
  }

  // ---- 几何 ----
  function footprint(c, rot) { return rot % 2 ? { w: c.h, h: c.w } : { w: c.w, h: c.h }; }
  function quad(cx, cy, w, h) { return [v(cx, cy), v(cx + w, cy), v(cx + w, cy + h), v(cx, cy + h)]; }
  function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); }
  function shade(hex, f) { var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, r * f | 0)); g = Math.max(0, Math.min(255, g * f | 0)); b = Math.max(0, Math.min(255, b * f | 0)); return "rgb(" + r + "," + g + "," + b + ")"; }
  function validCell(cx, cy) { return Number.isFinite(cx) && Number.isFinite(cy) && cx >= 0 && cy >= 0 && cx < GW && cy < GH; }
  function seedGhostCell(c) {
    if (validCell(mouse.cx, mouse.cy) || !c || c.wall) return;
    var fp = footprint(c, ghostRot);
    mouse.cx = Math.max(0, Math.min(GW - fp.w, Math.floor((GW - fp.w) / 2)));
    mouse.cy = Math.max(0, Math.min(GH - fp.h, Math.floor((GH - fp.h) / 2)));
    mouse.onWall = null;
  }
  function pointInPoly(px, py, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var a = pts[i], b = pts[j];
      if (((a.y > py) !== (b.y > py)) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function surfaceHostAt(px, py) {
    if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
    var best = null, bestDepth = -Infinity;
    placed.forEach(function (p) {
      if (!isSurfaceHost(p)) return;
      var lift = surfLift(p);
      var top = quad(p.cx, p.cy, p.w, p.h).map(function (q) { return { x: q.x, y: q.y - lift }; });
      if (!pointInPoly(px, py, top)) return;
      var depth = (p.cx + p.w) + (p.cy + p.h);
      if (depth > bestDepth) { best = p; bestDepth = depth; }
    });
    return best;
  }
  function snapDecorToSurface(c) {
    if (!c || c.cat !== "decor") return false;
    var host = surfaceHostAt(mouse.x, mouse.y);
    if (!host) return false;
    var fp = footprint(c, ghostRot);
    if (fp.w > host.w || fp.h > host.h) return false;
    var cc = screenToCell(mouse.x, mouse.y + surfLift(host));
    mouse.cx = Math.max(host.cx, Math.min(host.cx + host.w - fp.w, cc.cx));
    mouse.cy = Math.max(host.cy, Math.min(host.cy + host.h - fp.h, cc.cy));
    mouse.onWall = null;
    return true;
  }

  function pById(uid) { for (var i = 0; i < placed.length; i++) if (placed[i].uid === uid) return placed[i]; return null; }
  function decorValid(cx, cy, fw, fh, ignoreUid) {
    // 摆件：空地随便放；放桌上必须整体落在同一张桌子内(不能半悬空/跨两桌/压在非桌家具上)
    if (cx < 0 || cy < 0 || cx + fw > GW || cy + fh > GH) return false;
    var uids = {};
    for (var y = cy; y < cy + fh; y++) for (var x = cx; x < cx + fw; x++) { var u = occ[y][x]; if (u && u !== ignoreUid) uids[u] = 1; }
    var keys = Object.keys(uids);
    if (keys.length === 0) return true;          // 纯空地
    if (keys.length > 1) return false;           // 跨多个家具
    var p = pById(+keys[0]); if (!p) return true;
    if (!isSurfaceHost(p)) return false; // 只能叠在承载面家具上(桌面 / 博古架顶层)
    return cx >= p.cx && cy >= p.cy && cx + fw <= p.cx + p.w && cy + fh <= p.cy + p.h; // 必须整体在承载面内
  }
  // ---- 承载面 surface 机制(雅各布 最小版:桌面 + 博古架顶层) ----
  function isSurfaceHost(p) { var c = byId[p.id]; return !!c && (c.cat === "table" || p.id === "storage_shelf"); } // 可承载摆件的家具
  function surfLift(p) { return byId[p.id].zh || 0; } // 承载面高度=家具z高(顶面)
  function decorHost(p) { // 摆件正下方的承载家具(桌/博古架顶);纯地面/越界/宿主已移除则 null(自愈)
    if (!p.decor || p.rug) return null;
    if (p.cx < 0 || p.cy < 0 || p.cx + p.w > GW || p.cy + p.h > GH) return null; // 越界(含放置预览拖到房间边缘)→无宿主,避免 occ 越界崩溃
    var u = 0;
    for (var y = p.cy; y < p.cy + p.h; y++) for (var x = p.cx; x < p.cx + p.w; x++) { var c = occ[y][x]; if (c) { if (u && u !== c) return null; u = c; } }
    if (!u) return null;
    var host = pById(u);
    return (host && isSurfaceHost(host)) ? host : null;
  }
  function canPlaceFloor(cx, cy, fw, fh, ignoreUid, isDecor) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return false;
    if (cx < 0 || cy < 0 || cx + fw > GW || cy + fh > GH) return false;
    if (isDecor) return decorValid(cx, cy, fw, fh, ignoreUid);
    if (overlapsPlayer(cx, cy, fw, fh)) return false;
    for (var y = cy; y < cy + fh; y++) for (var x = cx; x < cx + fw; x++) if (occ[y][x] && occ[y][x] !== ignoreUid) return false;
    return true;
  }
  function playerBox() { var n = PLAYER_CELLS, fx = Math.floor(player.cx), fy = Math.floor(player.cy); return { x0: fx - n / 2, y0: fy - n / 2, x1: fx + n / 2 - 1, y1: fy + n / 2 - 1 }; }
  function overlapsPlayer(cx, cy, fw, fh) { var b = playerBox(); return !(cx + fw - 1 < b.x0 || cx > b.x1 || cy + fh - 1 < b.y0 || cy > b.y1); }

  // ---- 摆放 ----
  function addPlaced(c, cx, cy, rot, wall, side) {
    var fp = footprint(c, rot);
    var p = { uid: uidSeq++, id: c.id, cx: cx, cy: cy, w: fp.w, h: fp.h, rot: rot, wall: wall, side: side || "right", decor: (c.cat === "decor" && !wall), rug: !!c.rug };
    placed.push(p); fillCells(p); return p;
  }
  function fillCells(p) {
    if (p.decor || p.wall) { if (p.wall) { var arr = wallOcc[p.side]; for (var i = p.cx; i < p.cx + p.w; i++) arr[i] = p.uid; } return; }
    for (var y = p.cy; y < p.cy + p.h; y++) for (var x = p.cx; x < p.cx + p.w; x++) occ[y][x] = p.uid;
  }
  function freeCells(p) {
    if (p.wall) { var arr = wallOcc[p.side]; for (var i = p.cx; i < p.cx + p.w; i++) if (arr[i] === p.uid) arr[i] = 0; return; }
    if (p.decor) return;
    for (var y = p.cy; y < p.cy + p.h; y++) for (var x = p.cx; x < p.cx + p.w; x++) if (occ[y][x] === p.uid) occ[y][x] = 0;
  }
  function itemAtCell(cx, cy) { // 最上层(深度最大)非装饰也含装饰，取最后绘制
    var hit = null;
    placed.forEach(function (p) { if (p.wall) return; if (cx >= p.cx && cx < p.cx + p.w && cy >= p.cy && cy < p.cy + p.h) hit = p; });
    return hit;
  }

  // ---- 渲染 ----
  function resize() {
    var contentW = OX + (GW + YARD) * HW + MARGIN, contentH = OY + (GW + GH + YARD) * HH + MARGIN;
    CW = contentW; CH = contentH; dpr = window.devicePixelRatio || 1;
    canvas.width = CW * dpr; canvas.height = CH * dpr; canvas.style.width = CW + "px"; canvas.style.height = CH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false; // 像素图非整数缩放不糊(修"角色变虚")
  }
  function drawFloor() {
    var c = quad(0, 0, GW, GH);
    poly(c); ctx.fillStyle = "#9b7042"; ctx.fill();
    if (env.floorLarge) {
      poly(c); ctx.save(); ctx.clip();
      for (var tx = 0; tx < GW; tx += 4) for (var ty = 0; ty < GH; ty += 4) {
        var center = v(tx + 2, ty + 2);
        ctx.drawImage(env.floorLarge, center.x - 48, center.y - 24, 96, 48);
        var zone = Math.floor(tx / 16) + Math.floor(ty / 16) * 3;
        var tone = ((tx * 17 + ty * 31 + zone * 13) % 7) - 3;
        if (tone !== 0) {
          var q = quad(tx, ty, Math.min(4, GW - tx), Math.min(4, GH - ty));
          poly(q);
          ctx.fillStyle = tone > 0 ? "rgba(255,226,166," + (0.012 * tone).toFixed(3) + ")" : "rgba(46,29,17," + (-0.014 * tone).toFixed(3) + ")";
          ctx.fill();
        }
      }
      var areas = [
        { x: 8, y: 8, w: 28, h: 22, c: "rgba(255,220,154,.045)" },
        { x: 54, y: 10, w: 28, h: 20, c: "rgba(62,38,20,.050)" },
        { x: 18, y: 40, w: 34, h: 20, c: "rgba(58,36,20,.040)" },
        { x: 62, y: 44, w: 24, h: 18, c: "rgba(255,214,146,.035)" }
      ];
      areas.forEach(function (r) { poly(quad(r.x, r.y, r.w, r.h)); ctx.fillStyle = r.c; ctx.fill(); });
      ctx.restore();
    }
    // 大格接缝：低对比度，避免扩大房间后变成刺眼网格。
    ctx.strokeStyle = "rgba(72,45,25,.115)"; ctx.lineWidth = 1;
    for (var i = 0; i <= GW; i += 4) { var a = v(i, 0), b = v(i, GH); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (var j = 0; j <= GH; j += 4) { var a2 = v(0, j), b2 = v(GW, j); ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.stroke(); }
    ctx.strokeStyle = "rgba(86,51,25,.18)";
    for (var si = 0; si <= GW; si += 16) { var sa = v(si, 0), sb = v(si, GH); ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke(); }
    for (var sj = 0; sj <= GH; sj += 16) { var sa2 = v(0, sj), sb2 = v(GW, sj); ctx.beginPath(); ctx.moveTo(sa2.x, sa2.y); ctx.lineTo(sb2.x, sb2.y); ctx.stroke(); }
    poly(c); ctx.strokeStyle = "#5f3c22"; ctx.lineWidth = 2; ctx.stroke();
  }
  function wallLine(a, b, yOff) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y - yOff); ctx.lineTo(b.x, b.y - yOff); ctx.stroke();
  }
  function wallUpright(base) {
    ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(base.x, base.y - WALL_PX); ctx.stroke();
  }
  function wallPanelFill(a, b, dark) {
    var grad = ctx.createLinearGradient(a.x, a.y - WALL_PX, b.x, b.y);
    grad.addColorStop(0, dark ? "#6d573f" : "#7b6146");
    grad.addColorStop(0.55, dark ? "#80664a" : "#917351");
    grad.addColorStop(1, dark ? "#5d442e" : "#6b4b31");
    ctx.fillStyle = grad; ctx.fill();
  }
  function wallPost(base, dark) {
    var top = { x: base.x, y: base.y - WALL_PX };
    ctx.strokeStyle = dark ? "rgba(48,31,17,.38)" : "rgba(58,37,20,.34)";
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(base.x, base.y); ctx.stroke();
    ctx.strokeStyle = dark ? "rgba(174,132,82,.12)" : "rgba(204,160,102,.13)";
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(top.x + 2, top.y); ctx.lineTo(base.x + 2, base.y); ctx.stroke();
  }
  function drawWalls() {
    // 右墙 (沿 cy=0, cx 0..GW)
    var a = v(0, 0), b = v(GW, 0);
    poly([{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: b.y - WALL_PX }, { x: a.x, y: a.y - WALL_PX }]);
    wallPanelFill(a, b, false);
    ctx.save(); poly([{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: b.y - WALL_PX }, { x: a.x, y: a.y - WALL_PX }]); ctx.clip();
    ctx.strokeStyle = "rgba(230,190,128,.22)"; ctx.lineWidth = 1;
    for (var rh = ROW_PX * 2; rh < WALL_PX; rh += ROW_PX * 2) wallLine(a, b, rh);
    ctx.strokeStyle = "rgba(49,34,22,.28)";
    for (var rx = 0; rx <= GW; rx += 16) wallUpright(v(rx, 0));
    for (var rp = 0; rp <= GW; rp += 24) wallPost(v(rp, 0), false);
    ctx.fillStyle = "rgba(48,30,18,.16)";
    poly([{ x: a.x, y: a.y - 36 }, { x: b.x, y: b.y - 36 }, { x: b.x, y: b.y }, { x: a.x, y: a.y }]); ctx.fill();
    ctx.strokeStyle = "rgba(50,32,19,.42)"; ctx.lineWidth = 3; wallLine(a, b, 0); wallLine(a, b, 44); wallLine(a, b, WALL_PX - 28);
    ctx.restore();
    ctx.strokeStyle = "#59391f"; ctx.lineWidth = 2; ctx.stroke();
    // 左墙 (沿 cx=0, cy 0..GH)
    var d = v(0, GH);
    poly([{ x: a.x, y: a.y }, { x: d.x, y: d.y }, { x: d.x, y: d.y - WALL_PX }, { x: a.x, y: a.y - WALL_PX }]);
    wallPanelFill(a, d, true);
    ctx.save(); poly([{ x: a.x, y: a.y }, { x: d.x, y: d.y }, { x: d.x, y: d.y - WALL_PX }, { x: a.x, y: a.y - WALL_PX }]); ctx.clip();
    ctx.strokeStyle = "rgba(221,180,119,.18)"; ctx.lineWidth = 1;
    for (var lh = ROW_PX * 2; lh < WALL_PX; lh += ROW_PX * 2) wallLine(a, d, lh);
    ctx.strokeStyle = "rgba(45,31,20,.30)";
    for (var ly = 0; ly <= GH; ly += 16) wallUpright(v(0, ly));
    for (var lp = 0; lp <= GH; lp += 24) wallPost(v(0, lp), true);
    ctx.fillStyle = "rgba(43,27,16,.18)";
    poly([{ x: a.x, y: a.y - 36 }, { x: d.x, y: d.y - 36 }, { x: d.x, y: d.y }, { x: a.x, y: a.y }]); ctx.fill();
    ctx.strokeStyle = "rgba(46,30,18,.44)"; ctx.lineWidth = 3; wallLine(a, d, 0); wallLine(a, d, 44); wallLine(a, d, WALL_PX - 28);
    ctx.restore();
    ctx.strokeStyle = "#4f321c"; ctx.lineWidth = 2; ctx.stroke();
  }
  function wallHangXY(p) {
    // 沿墙位置 p.cx (格)，高度 p.cy (0=底,越大越高)，返回画布坐标(左上)
    var base = p.side === "right" ? v(p.cx, 0) : v(0, p.cx);
    var topY = base.y - WALL_PX + (WALL_ROWS - p.cy - p.h) * ROW_PX;
    return { x: base.x - (p.side === "right" ? 0 : p.w * HW * 0), y: topY, w: p.w * HW, h: p.h * ROW_PX, base: base };
  }
  function drawWallHang(p) {
    var c = byId[p.id];
    var base = p.side === "right" ? v(p.cx, 0) : v(0, p.cx);
    var x = base.x, y = base.y - WALL_PX + (WALL_ROWS - p.cy - p.h) * ROW_PX;
    var w = p.w * HW, h = p.h * ROW_PX;
    var img = images[p.id + (p.side === "left" ? "_left" : "")] || images[p.id];
    // 沿墙面角度斜切：右墙基线 +HH/HW(向右下)、左墙 -HH/HW(向右上)，使壁挂贴合墙面而非平贴
    var sl = (p.side === "right" ? 1 : -1) * (HH / HW);
    ctx.save(); ctx.transform(1, sl, 0, 1, x, y);
    if (img) { ctx.drawImage(img, 0, 0, w, h); }
    else { ctx.fillStyle = c.color; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = "#3a2a1a"; ctx.strokeRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(c.glyph + c.name, w / 2, h / 2 + 4); }
    ctx.restore();
  }
  function furnImg(p) {
    // 方向贴图：rot0=base, rot1/2/3 找 _r1/_r2/_r3；缺则回退。无方向图时 rot1/3 镜像出"2面"以反映旋转
    var rot = p.rot || 0;
    var di = images[p.id + "_r" + rot] || (rot === 3 ? images[p.id + "_r1"] : null);
    if (di) return { img: di, flip: false };
    var base = images[p.id];
    return { img: base, flip: !!base && (rot === 1 || rot === 3) };
  }
  function drawFurniture(p, ghost) {
    var c = byId[p.id];
    var fi = furnImg(p), img = fi.img;
    var lift = 0; if (p.decor) { var hh = decorHost(p); if (hh) lift = surfLift(hh); } // 摆件落在承载面上→整体抬到顶面高度(含摆放预览)
    var top = quad(p.cx, p.cy, p.w, p.h).map(function (q) { return { x: q.x, y: q.y - lift }; }); // 顶面四角(底部, 抬高 lift)
    var zh = c.zh || 12;
    if (img && !ghost) {
      // 真图正确对齐：水平=footprint菱形中心；底边=下顶点(最靠前/最低)的y；宽=菱形宽(w+h)*HW，高按比例
      var ctrX = v(p.cx + p.w / 2, p.cy + p.h / 2).x;  // 菱形水平中心(非下顶点x，避免长方形footprint偏移)
      var botY = v(p.cx + p.w, p.cy + p.h).y - lift;   // 下顶点y(抬到承载面)
      var iw = (p.w + p.h) * HW * FURN_SCALE, ih = img.height * (iw / img.width);
      if (fi.flip) { ctx.save(); ctx.translate(ctrX, 0); ctx.scale(-1, 1); ctx.drawImage(img, -iw / 2, botY - ih, iw, ih); ctx.restore(); }
      else ctx.drawImage(img, ctrX - iw / 2, botY - ih, iw, ih);
      if (DEBUG_FOOT) { poly(quad(p.cx, p.cy, p.w, p.h)); ctx.strokeStyle = "rgba(0,255,180,.9)"; ctx.lineWidth = 1; ctx.stroke(); }
      return;
    }
    // 占位等距块：底面 + 抬高顶面 + 侧面
    var topR = top.map(function (q) { return { x: q.x, y: q.y - zh }; });
    // 左侧面
    poly([top[3], top[2], topR[2], topR[3]]); ctx.fillStyle = shade(c.color, 0.6); ctx.fill();
    // 右侧面
    poly([top[1], top[2], topR[2], topR[1]]); ctx.fillStyle = shade(c.color, 0.78); ctx.fill();
    // 顶面
    poly(topR); ctx.fillStyle = ghost ? (ghost === "ok" ? "rgba(120,220,140,.6)" : "rgba(230,90,80,.6)") : c.color; ctx.fill();
    ctx.strokeStyle = "rgba(40,28,16,.7)"; ctx.lineWidth = 1; ctx.stroke();
    if (!ghost) {
      var ctr = topR[0]; var mid = { x: (topR[0].x + topR[2].x) / 2, y: (topR[0].y + topR[2].y) / 2 };
      ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(c.glyph, mid.x, mid.y); if (Math.min(p.w, p.h) >= 6) ctx.fillText(c.name, mid.x, mid.y + 13);
      if (c.func) { ctx.strokeStyle = "rgba(255,210,120,.9)"; ctx.lineWidth = 2; poly(topR); ctx.stroke(); }
    }
  }
  function drawPlayer() {
    var ctr = cellCenter(player.cx, player.cy);
    var base = sprites[player.anim];
    var row = SPR.dirs[player.anim] === 1 ? 0 : (SPR.dirRow[player.dir] || 0);
    if (base) {
      var frames = SPR.frames[player.anim] || 1, rows = SPR.dirs[player.anim] || 1;
      var fw = (base.naturalWidth || base.width || (SPR.fw * frames)) / frames; // 帧宽=图宽/帧数(自适应48×64或64×96…)
      var fh = (base.naturalHeight || base.height || (SPR.fh * rows)) / rows;
      var resting = player.state === "meditating" || player.state === "sleeping";
      // 睡觉是横躺图(角色占帧下部),按"宽"缩放才不会显小;其余按"高"
      var sc = player.state === "sleeping" ? (PLAYER_DISP_H / fw) : (PLAYER_DISP_H / fh);
      var dw = fw * sc, dh = fh * sc;
      var fi = resting ? 0 : player.fi; // 打坐/睡觉用静态帧,不上下漂浮(那是仙侠)
      var dx = ctr.x - dw / 2, dy = ctr.y - dh;
      if (player.state === "meditating") dy -= dh * MEDITATE_Y_LIFT;          // 上抬坐到台面蒲团
      else if (player.state === "sleeping") dy = ctr.y - dh * 0.5 - dh * SLEEP_Y_LIFT; // 居中躺到床中央
      ctx.drawImage(base, fi * fw, row * fh, fw, fh, dx, dy, dw, dh);
      APPEAR_SLOTS.forEach(function (slot) {   // 叠装备外观层(按各自帧尺寸,与主角同格)
        var it = equipped[slot]; if (!it) return;
        var ov = equipSprites[it.tid] && equipSprites[it.tid][player.anim];
        if (ov) { var ofw = (ov.naturalWidth || ov.width) / frames, ofh = (ov.naturalHeight || ov.height) / rows; ctx.drawImage(ov, fi * ofw, row * ofh, ofw, ofh, dx, dy, dw, dh); }
      });
      if (resting) { // 头顶动态 zzZ (武侠搞怪,替代漂浮) —— 锚在头部上方
        var hx = dx + dw * (player.state === "sleeping" ? 0.5 : 0.66), hy = dy + (player.state === "sleeping" ? dh * 0.2 : 6);
        var zt = (homeClock % 1.6) / 1.6; ctx.textAlign = "center";
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = "rgba(170,205,255," + (0.9 - zt * 0.9).toFixed(2) + ")";
        ctx.fillText("z", hx + 6 + zt * 7, hy - zt * 16);
        var zt2 = ((homeClock + 0.8) % 1.6) / 1.6;
        ctx.font = "bold 15px sans-serif"; ctx.fillStyle = "rgba(170,205,255," + (0.9 - zt2 * 0.9).toFixed(2) + ")";
        ctx.fillText("Z", hx + zt2 * 7, hy - 4 - zt2 * 18);
      }
    } else {
      ctx.font = "30px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(player.state === "sleeping" ? "😴" : player.state === "meditating" ? "🧘" : "🧍", ctr.x, ctr.y - 8);
    }
  }
  function drawCourtyard() {
    ctx.fillStyle = "#1c2a16"; ctx.fillRect(0, 0, CW, CH);
    var c = quad(-YARD, -YARD, GW + YARD * 2, GH + YARD * 2);
    poly(c); ctx.fillStyle = "#4f7a40"; ctx.fill();
    if (env.courtyard) {
      ctx.save(); ctx.clip();
      var im = env.courtyard, sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
      var cover = Math.max(CW / sw, CH / sh);
      var dw = sw * cover, dh = sh * cover;
      ctx.drawImage(im, (CW - dw) / 2, (CH - dh) / 2, dw, dh);
      ctx.restore();
    }
    ctx.strokeStyle = "#36592f"; ctx.lineWidth = 3; ctx.stroke();
    if (env.courtyard) return;
    // 院景点缀（占位，真图待美术）
    ctx.font = "20px sans-serif"; ctx.textAlign = "center";
    var deco = ["🌳", "🌲", "🌸", "🪨", "🌿", "🌷"];
    for (var i = -YARD; i < GW + YARD; i += 6) { var t = v(i, -YARD); ctx.fillText(deco[((i + YARD) / 6) % deco.length], t.x, t.y - 2); var bsp = v(i, GH + YARD); ctx.fillText(deco[((i + YARD) / 6 + 2) % deco.length], bsp.x, bsp.y + 6); }
    for (var j = -YARD; j < GH + YARD; j += 6) { var l = v(-YARD, j); ctx.fillText(deco[((j + YARD) / 6) % deco.length], l.x, l.y); var r = v(GW + YARD, j); ctx.fillText(deco[((j + YARD) / 6 + 3) % deco.length], r.x, r.y); }
  }
  function render() {
    ctx.clearRect(0, 0, CW, CH);
    drawCourtyard(); drawFloor(); drawWalls();
    // 地毯：地面平铺，画在家具/主角之下(floor 之上)
    placed.filter(function (p) { return p.rug; }).forEach(function (p) { drawFurniture(p); });
    // 壁挂(在墙上，靠后)
    placed.filter(function (p) { return p.wall; }).forEach(drawWallHang);
    // 地面可绘制(家具+主角) 深度排序：anchor 深度 = cx+cy+w/2+h/2(取前角)
    var drawables = placed.filter(function (p) { return !p.wall && !p.rug; }).map(function (p) {
      var depth = (p.cx + p.w) + (p.cy + p.h);
      if (p.decor) { var hh = decorHost(p); if (hh) depth = (hh.cx + hh.w) + (hh.cy + hh.h) + 0.5; } // 承载面上的摆件紧跟宿主之后绘制(压在桌/架顶上,不被遮挡)
      return { p: p, depth: depth, kind: "f" };
    });
    var pDepth = (player.cx + PLAYER_CELLS / 2) + (player.cy + PLAYER_CELLS / 2);
    if ((player.state === "sleeping" || player.state === "meditating") && player.actUid) { var host = pById(player.actUid); if (host) pDepth = (host.cx + host.w) + (host.cy + host.h) + 0.5; } // 躺/坐在家具上→画在家具之上
    drawables.push({ depth: pDepth, kind: "p" });
    drawables.sort(function (a, b) { return a.depth - b.depth; });
    drawables.forEach(function (d) {
      if (d.kind === "p") drawPlayer();
      else if (moveMode && d.p === moveMode.p) { var ok = canPlaceFloor(d.p.cx, d.p.cy, d.p.w, d.p.h, d.p.uid, d.p.decor); drawFurniture(d.p, ok ? "ok" : "bad"); }
      else drawFurniture(d.p);
    });
    // ghost
    drawGhost();
  }
  function drawGhost() {
    var c = selId && byId[selId]; if (!c) return;
    if (c.wall) {
      if (!mouse.onWall) return;
      var fp = footprint(c, 0);
      drawWallHang({ id: c.id, cx: mouse.wcx, cy: mouse.wrow, w: c.w, h: c.h, side: mouse.onWall });
      return;
    }
    if (c.cat === "decor") snapDecorToSurface(c);
    seedGhostCell(c);
    if (!validCell(mouse.cx, mouse.cy)) return;
    var fp2 = footprint(c, ghostRot);
    var ok = canPlaceFloor(mouse.cx, mouse.cy, fp2.w, fp2.h, null, c.cat === "decor");
    drawFurniture({ id: c.id, cx: mouse.cx, cy: mouse.cy, w: fp2.w, h: fp2.h, rot: ghostRot, decor: c.cat === "decor" }, ok ? "ok" : "bad");
  }

  // ---- 主角 ----
  function dirFromDelta(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"); }
  function walkTo(cx, cy, cb) { player.tx = cx; player.ty = cy; player._cb = cb; player.anim = "walk"; }
  function goAction(p, state) {
    player.state = "walking"; player.actUid = p.uid;
    // 走到家具中心：躺在床上/坐在打坐台上(而非站在家具前格)
    walkTo(p.cx + p.w / 2, p.cy + p.h / 2, function () {
      if (player.actUid !== p.uid) return;
      player.state = state; player.anim = state === "sleeping" ? "sleep" : "meditate";
      toast(state === "sleeping" ? "侠客躺上床休息……" : "侠客盘膝打坐……");
    });
  }
  function backToWander() { player.state = "wander"; player.actUid = 0; player.busy = false; player.anim = "idle"; }
  // ---- 自动化居家技能 ----
  var autoStats = { kills: 0, exp: 0, gold: 0, runs: 0, loot: 0 }; // 过夜挂机累计(本次会话,给醒来看增量)
  function autoOn(id) { return homeRank(id) > 0 && stats.autoOn && stats.autoOn[id]; } // 已学习且开关打开
  function anyModalOpen() { var ms = document.getElementsByClassName("modal-bg"); for (var i = 0; i < ms.length; i++) if (ms[i].classList && !ms[i].classList.contains("hidden")) return true; return false; } // 任意面板打开
  function autoTick() { // 每秒在家结算:受伤自动睡→满血自动打坐/历练
    if (CV.running || player.state === "walking") return;     // 战斗中/移动中不打断
    if (anyModalOpen()) return;                                // 打开任意面板时暂停自动,让玩家能操作(防被拽进战斗)
    if (stats.hp < stats.hpMax) {
      if (autoOn("auto_sleep") && player.state !== "sleeping") { var bed = placed.find(function (q) { return byId[q.id].func === "bed"; }); if (bed) goAction(bed, "sleeping"); }
      return;
    }
    // 满血
    if (autoOn("auto_sortie")) { var zi = Math.min(stats.zone || 0, ZONES.length - 1); startCombat(totalAttrs(), { zone: ZONES[zi], zoneIdx: zi }); return; } // 自动进上次地图
    if (autoOn("auto_meditate")) { if (player.state !== "meditating") { var dais = placed.find(function (q) { return byId[q.id].func === "meditate"; }); if (dais) goAction(dais, "meditating"); } return; }
    if (player.state === "sleeping") backToWander(); // 满血又没开打坐/历练→不必继续睡
  }
  function updatePlayer(dt) {
    var dx = player.tx - player.cx, dy = player.ty - player.cy, dist = Math.hypot(dx, dy);
    if (dist > 0.05 && (player.state === "walking" || player.state === "wander")) {
      player.dir = dirFromDelta(dx, dy);
      var step = player.speed * dt;
      if (step >= dist) { player.cx = player.tx; player.cy = player.ty; var cb = player._cb; player._cb = null; if (player.state === "wander") { player.anim = "idle"; player.busy = false; } if (cb) cb(); }
      else { player.cx += dx / dist * step; player.cy += dy / dist * step; player.anim = "walk"; }
    } else if (player.state === "walking" && player._cb) { // 已在目标点(如就地再次睡觉/打坐)→立刻完成回调，避免卡在walking不显示
      var cb2 = player._cb; player._cb = null; cb2();
    }
    // 动画帧
    var fr = SPR.frames[player.anim] || 1, fps = SPR.fps[player.anim] || 6;
    player.fclock += dt; if (player.fclock >= 1 / fps) { player.fclock = 0; player.fi = (player.fi + 1) % fr; }
  }
  function wanderTick() {
    if (player.state === "wander" && !player.busy && Math.random() < 0.6) {
      player.busy = true; walkTo(4 + Math.random() * (GW - 8), 4 + Math.random() * (GH - 8), function () { player.busy = false; });
    }
  }

  // ---- 功能结算 ----
  function tickStats() {
    if (!CV.running) { // 仅在家时结算回血(战斗中走战斗自己的HP,topbar不应在战斗里被回血推高)
      if (player.state === "sleeping") { var b = byId[(placed.find(function (q) { return q.uid === player.actUid; }) || {}).id] || {}; var hm = 1 + homeRank("sleep_eff") * 0.2; if (stats.hp < stats.hpMax) stats.hp = Math.min(stats.hpMax, stats.hp + (b.heal || 0) * hm); if ((stats.manaMax || 0) > 0 && (stats.mana || 0) < stats.manaMax) stats.mana = Math.min(stats.manaMax, (stats.mana || 0) + Math.max(3, stats.manaMax * 0.06) * hm); if (Math.random() < (b.cure || 0)) { if (stats.poison) stats.poison = false; else if (stats.weak) stats.weak = false; } } // 睡觉同时回血+回蓝(WalyCai:睡醒满蓝进历练好放技能)
      // 内功功法自动回血:在家睡觉(叠床=增睡眠效率) + 闲逛 期间生效,打坐时不回(WalyCai)。战斗中不生效
      if (player.state !== "meditating") { var hr = neiHealRate(); if (hr > 0 && stats.hp < stats.hpMax) stats.hp = Math.min(stats.hpMax, stats.hp + hr); }
    }
    // 打坐修炼=训练所选功法熟练度(主循环逐帧 trainGongfa)→升功法等级→抬内功级别。旧 stats.ng(打坐时间)已废弃,内功级别=Σ功法lv
    autoTick(); // 自动化居家技能(自动睡/打坐/历练)
    updateStats(); save();
  }
  function updateStats() {
    $("hpVal").textContent = Math.round(stats.hp); $("hpMax").textContent = stats.hpMax; $("neigong").textContent = neigongLv(); // 内功级别=Σ功法lv
    var bar = $("ngBar"); if (!bar.firstChild) bar.innerHTML = "<i></i>"; // 进度条=当前打坐修炼功法的熟练度进度
    var tid = stats.trainId, ts = tid && gfState(tid), prog = 0; if (ts && ts.lv > 0 && ts.lv < CORE.GONGFA_MAXLV) prog = ts.prof / CORE.gfProfReq(ts.lv); bar.firstChild.style.width = Math.round(Math.max(0, Math.min(1, prog)) * 100) + "%";
    if ($("statusVal")) { var s = []; if (stats.poison) s.push("中毒"); if (stats.weak) s.push("虚弱"); $("statusVal").textContent = s.length ? s.join("、") : "正常"; } // 状态暂隐藏(WalyCai)
    if ($("cpVal")) $("cpVal").textContent = CORE.combatPower(totalAttrs()); // 主页面战斗力
    if ($("lvVal")) { $("lvVal").textContent = stats.level; $("expTxt").textContent = "(" + stats.exp + "/" + CORE.nextExp(stats.level) + ")"; }
    if ($("manaVal")) { $("manaVal").textContent = Math.round(stats.mana || 0); $("manaMax").textContent = stats.manaMax || 0; }
    if ($("goldVal")) $("goldVal").textContent = stats.gold || 0;
    var spDot = $("spDot"); if (spDot) spDot.style.display = (stats.sp || 0) > 0 ? "" : "none";
    if ($("menuSp")) { $("menuSp").textContent = stats.sp || 0; $("menuSp").style.display = (stats.sp || 0) > 0 ? "" : "none"; }
    updateAutoFloat();
  }

  // ---- 仓库 UI ----
  var STARTER_FURN = { bed_basic: 1, table_square: 1, chair_round: 2, meditation_dais: 1 }; // 新手赠送(含床)≈30环境
  function initBag() { CATALOG.forEach(function (c) { var n = STARTER_FURN[c.id] || 0; bag[c.id] = (bag[c.id] || 0) + n; if (n) stats.owned[c.id] = (stats.owned[c.id] || 0) + n; }); }
  function renderCats() { var w = $("cats"); w.innerHTML = ""; CATS.forEach(function (ct) { var d = document.createElement("div"); d.className = "cat" + (ct.key === activeCat ? " active" : ""); d.textContent = ct.label; d.onclick = function () { activeCat = ct.key; renderCats(); renderItems(); }; w.appendChild(d); }); }
  function iconHTML(c) { var src = "assets/furniture/" + c.cat + "/" + c.id + (c.wall ? "_right" : "") + ".png"; return '<img src="' + src + '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="display:none;width:46px;height:46px;align-items:center;justify-content:center;background:' + c.color + ';color:#fff;border-radius:4px">' + c.glyph + '</span>'; }
  function renderItems() {
    var w = $("items"); w.innerHTML = "";
    CATALOG.filter(function (c) { return c.cat === activeCat; }).forEach(function (c) {
      var place = bag[c.id] || 0, own = (stats.owned && stats.owned[c.id]) || 0, afford = (stats.gold || 0) >= c.price;
      var d = document.createElement("div"); d.className = "bag-item" + (selId === c.id ? " selected" : "") + (own <= 0 ? " dim" : "");
      d.innerHTML = '<div class="ico">' + iconHTML(c) + '</div><div class="nm">' + c.name + (c.func ? " ⚙" : "") + '</div><div class="ct">环' + c.env + ' · 拥' + own + ' · 可摆' + place + '</div>'
        + '<div class="shop"><span class="price">' + c.price + '💰</span><button class="tb buy"' + (afford ? "" : " disabled") + '>买</button></div>';
      d.onclick = function () { if ((bag[c.id] || 0) <= 0) { toast(own > 0 ? "已全摆出，再买可加环境/多摆" : ("先购买「" + c.name + "」(" + c.price + "💰)")); return; } selId = (selId === c.id ? null : c.id); ghostRot = 0; if (selId) seedGhostCell(c); renderItems(); };
      var bb = d.getElementsByClassName("buy")[0]; if (bb) bb.onclick = function (e) { e.stopPropagation(); buyFurniture(c.id); };
      w.appendChild(d);
    });
  }

  // ---- 输入 ----
  function evCell(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function updateMouse(e) {
    var p = evCell(e); mouse.x = p.x; mouse.y = p.y;
    // 是否在墙上(顶部 WALL_PX 区域 + 在墙体水平范围)
    mouse.onWall = null;
    var topV = v(0, 0);
    if (p.y < topV.y) {
      // 右墙 or 左墙：用 x 相对背角判断
      if (p.x >= topV.x) { mouse.onWall = "right"; mouse.wcx = Math.max(0, Math.min(GW - 1, Math.round((p.x - topV.x) / HW))); }
      else { mouse.onWall = "left"; mouse.wcx = Math.max(0, Math.min(GH - 1, Math.round((topV.x - p.x) / HW))); }
      mouse.wrow = Math.max(0, Math.min(WALL_ROWS - 1, Math.floor((topV.y - p.y) / ROW_PX)));
      mouse.cx = -1;
    } else { var cc = screenToCell(p.x, p.y); mouse.cx = cc.cx; mouse.cy = cc.cy; }
  }
  function tryPlace() {
    var c = byId[selId]; if (!c || bag[c.id] <= 0) return;
    if (c.wall) { if (!mouse.onWall) return; addPlaced(c, mouse.wcx, mouse.wrow, 0, true, mouse.onWall); }
    else { if (c.cat === "decor") snapDecorToSurface(c); if (!validCell(mouse.cx, mouse.cy)) return; var fp = footprint(c, ghostRot); if (!canPlaceFloor(mouse.cx, mouse.cy, fp.w, fp.h, null, c.cat === "decor")) { toast("这里放不下"); return; } addPlaced(c, mouse.cx, mouse.cy, ghostRot, false); }
    bag[c.id]--; if (bag[c.id] <= 0) selId = null; ghostRot = 0; renderItems(); save();
  }
  // 选中/移动/旋转/收回
  function selectPlaced(p) {
    selectedPlaced = p; var c = byId[p.id];
    $("selName").textContent = "选中：" + c.name; $("selBar").classList.remove("hidden", "moving");
    $("selMove").style.display = (c.fixed || p.wall) ? "none" : "";
    $("selRotate").style.display = (c.fixed || p.wall) ? "none" : "";
  }
  function deselect() { selectedPlaced = null; $("selBar").classList.add("hidden"); $("selBar").classList.remove("moving"); }
  function enterMove(p) {
    if (byId[p.id].fixed || p.wall) return;
    moveMode = { p: p, ox: p.cx, oy: p.cy }; freeCells(p); selectedPlaced = p;
    $("selName").textContent = "移动中：" + byId[p.id].name; $("selBar").classList.remove("hidden"); $("selBar").classList.add("moving");
    toast("移动模式：移到目标后点击放下，右键取消");
  }
  function dropMove() {
    var m = moveMode; if (!m) return;
    if (canPlaceFloor(m.p.cx, m.p.cy, m.p.w, m.p.h, m.p.uid, m.p.decor)) { fillCells(m.p); moveMode = null; save(); deselect(); toast("已放下"); }
    else toast("这里放不下");
  }
  function cancelMove() { var m = moveMode; if (!m) return; m.p.cx = m.ox; m.p.cy = m.oy; fillCells(m.p); moveMode = null; deselect(); toast("已取消移动"); }
  function rotatePlaced(p) {
    var c = byId[p.id]; if (c.fixed || p.wall) return;
    var nr = (p.rot + 1) % 4, fp = footprint(c, nr);
    if (moveMode && moveMode.p === p) { p.rot = nr; p.w = fp.w; p.h = fp.h; return; }
    freeCells(p); if (canPlaceFloor(p.cx, p.cy, fp.w, fp.h, p.uid, p.decor)) { p.rot = nr; p.w = fp.w; p.h = fp.h; } else toast("旋转后放不下");
    fillCells(p); save();
  }
  function removePlaced(p) {
    if (moveMode && moveMode.p === p) moveMode = null;
    freeCells(p); placed = placed.filter(function (q) { return q !== p; }); bag[p.id]++;
    if (player.actUid === p.uid) backToWander(); deselect(); renderItems(); save();
  }

  function bindInput() {
    canvas.addEventListener("pointermove", function (e) {
      updateMouse(e);
      if (moveMode && mouse.cx >= 0) { var fp = footprint(byId[moveMode.p.id], moveMode.p.rot); moveMode.p.cx = Math.max(0, Math.min(GW - fp.w, mouse.cx - Math.floor(fp.w / 2))); moveMode.p.cy = Math.max(0, Math.min(GH - fp.h, mouse.cy - Math.floor(fp.h / 2))); }
      else if (drag && mouse.cx >= 0) { var fp2 = footprint(byId[drag.p.id], drag.p.rot); drag.nx = Math.max(0, Math.min(GW - fp2.w, mouse.cx - drag.ox)); drag.ny = Math.max(0, Math.min(GH - fp2.h, mouse.cy - drag.oy)); drag.moved = true; if (longTimer) { clearTimeout(longTimer); longTimer = null; } }
    });
    canvas.addEventListener("pointerdown", function (e) {
      if (e.button === 2) return; updateMouse(e);
      if (moveMode) { dropMove(); return; }
      if (selId) return;
      var hit = mouse.cx >= 0 && itemAtCell(mouse.cx, mouse.cy);
      if (hit) {
        drag = { p: hit, ox: mouse.cx - hit.cx, oy: mouse.cy - hit.cy, moved: false, fixed: byId[hit.id].fixed };
        if (!byId[hit.id].fixed) { freeCells(hit); longTimer = setTimeout(function () { longTimer = null; if (drag && !drag.moved) { var p = drag.p; drag = null; enterMove(p); } }, 350); }
      } else deselect();
    });
    canvas.addEventListener("pointerup", function (e) {
      updateMouse(e);
      if (longTimer) { clearTimeout(longTimer); longTimer = null; }
      if (moveMode) return; // 放下由下次点击触发
      if (selId) { tryPlace(); return; }
      if (drag) {
        var p = drag.p, c = byId[p.id];
        if (!drag.moved) { // 点击(未拖动)
          if (!drag.fixed) fillCells(p); // 还原刚才freeCells
          if (c.func === "bed") goAction(p, "sleeping");
          else if (c.func === "meditate") goAction(p, "meditating");
          else selectPlaced(p);
        } else {
          if (canPlaceFloor(drag.nx, drag.ny, p.w, p.h, p.uid, p.decor)) { p.cx = drag.nx; p.cy = drag.ny; } else toast("那里放不下");
          fillCells(p); save();
        }
        drag = null; return;
      }
      if (player.state === "sleeping" || player.state === "meditating") backToWander();
    });
    canvas.addEventListener("contextmenu", function (e) {
      e.preventDefault(); updateMouse(e);
      if (moveMode) { cancelMove(); return; }
      if (selId) { selId = null; renderItems(); return; }
      var hit = mouse.cx >= 0 && itemAtCell(mouse.cx, mouse.cy);
      if (hit) removePlaced(hit);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "r" || e.key === "R") { if (moveMode) rotatePlaced(moveMode.p); else if (selectedPlaced) rotatePlaced(selectedPlaced); else ghostRot = (ghostRot + 1) % 4; }
      if (e.key === "Escape" && moveMode) cancelMove();
      if (e.key === "g" || e.key === "G") { DEBUG_FOOT = !DEBUG_FOOT; toast("footprint 对齐网格 " + (DEBUG_FOOT ? "开" : "关")); }
    });
  }

  // ---- 存档 ----
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ placed: placed.map(function (p) { return { id: p.id, cx: p.cx, cy: p.cy, rot: p.rot, wall: p.wall, side: p.side }; }), bag: bag, stats: stats })); } catch (e) {} }
  function load() {
    try { var raw = localStorage.getItem(SAVE_KEY); if (!raw) return false; var d = JSON.parse(raw);
      if (d.bag) { CATALOG.forEach(function (c) { if (d.bag[c.id] == null) d.bag[c.id] = 0; }); bag = d.bag; } // 新家具默认0(金币商店购买)
      var hadOwned = !!(d.stats && d.stats.owned);
      if (d.stats) stats = Object.assign(stats, d.stats);
      (d.placed || []).forEach(function (s) { var c = byId[s.id]; if (c) addPlaced(c, s.cx, s.cy, s.rot || 0, !!s.wall, s.side); });
      if (!hadOwned) { stats.owned = {}; for (var k in bag) if (bag[k] > 0) stats.owned[k] = bag[k]; placed.forEach(function (p) { stats.owned[p.id] = (stats.owned[p.id] || 0) + 1; }); } // 老存档迁移：拥有数=可摆+已摆
      return true;
    } catch (e) { return false; }
  }
  var toastT = null; function toast(m) { var t = $("toast"); t.textContent = m; t.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add("hidden"); }, 1500); }

  // ============================================================
  // 战斗基础：属性 + 装备 + 纸娃娃 + 武器仓库（阶段①，居家可玩）
  // ============================================================
  // 装备数据以 combat-core.js(WULIN_CORE) 为单一真相源（含 reqLv 等级需求），与 sim 共用
  var RARITY = CORE.RARITY, EQUIP_TPL = CORE.EQUIP_TPL, AFFIX_POOL = CORE.AFFIX_POOL;
  var SLOT_DEFS = [{ key: "head", name: "头", type: "head" }, { key: "neck", name: "项链", type: "neck" }, { key: "body", name: "衣服", type: "body" }, { key: "legs", name: "下身", type: "legs" }, { key: "weapon", name: "手部武器", type: "weapon" }, { key: "ring1", name: "戒指1", type: "ring" }, { key: "ring2", name: "戒指2", type: "ring" }, { key: "belt", name: "腰带", type: "belt" }];
  var STAT_LABEL = { HP: "气血", ATK: "攻击", DEF: "防御", Crit: "暴击率", CritDmg: "暴击伤害", Hit: "命中", Dodge: "闪避", ATKspd: "攻速", Tough: "韧性", Mana: "内力" };
  var equipped = { head: null, neck: null, body: null, legs: null, weapon: null, ring1: null, ring2: null, belt: null };
  var warehouse = [], equipSeq = 1, dollSel = null;

  function rollItem(tid, lv, rarity) { // 新模型:tid=部位, lv=等级(穿戴需求+强度), rarity=稀有度(控分层词条数)
    if (!EQUIP_TPL[tid]) return null;
    rarity = rarity || "common"; lv = lv || 1;
    var it = { uid: equipSeq++, tid: tid, lv: lv, rarity: rarity, affixes: CORE.mkAffixes(Math.random, rarity) };
    if (tid === "weapon") it.wtype = CORE.rollWtype(); // 武器随机类型(拳剑刀棍琴奇门)
    return it;
  }
  function itemNm(it) { return CORE.itemName(it); } // 装备显示名(基础装按等级档命名,套装件专属名)
  function itemStats(it) { return CORE.itemStats(it); } // 装备词条/等级缩放以 core 为单一源
  function baseAttrs() { return CORE.baseAttrs(stats.level, stats.ng); }
  // ---- 人物技能树：力量战士（草案数值，待莱布尼茨平衡）----
  // ---- 人物技能树：力量战士（树状·串联+级别+投点 门槛；Salt & Sanctuary / Titan Quest 风）----
  // 5列×5行；prereq=前置(需≥1级) reqPts=树内已投点门槛 reqLv=人物等级门槛
  var SKILL_TREES = [{
    id: "warrior", name: "力量战士", totalPts: 49,
    nodes: [
      { id: "foundation", name: "武者根基", max: 3, row: 0, col: 2, reqPts: 0, reqLv: 1, prereq: [], desc: "气血 +15、攻击 +2 / 级（根基）" },
      // 力 branch (col0)
      { id: "str_atk", name: "千钧之力", max: 5, row: 1, col: 0, reqPts: 3, reqLv: 2, prereq: ["foundation"], desc: "攻击 +4 / 级" },
      { id: "crit", name: "致命强击", max: 5, row: 2, col: 0, reqPts: 10, reqLv: 5, prereq: ["str_atk"], desc: "暴击率 +2% / 级" },
      { id: "critdmg", name: "狂暴打击", max: 5, row: 3, col: 0, reqPts: 18, reqLv: 8, prereq: ["crit"], desc: "暴击伤害 +10% / 级" },
      { id: "whirlwind", name: "旋风斩", max: 3, row: 4, col: 0, reqPts: 28, reqLv: 12, prereq: ["critdmg"], active: true, desc: "主动·战斗中蓝量满自动群攻（伤害随级↑）" },
      // 械 branch (col2 中)
      { id: "weapon_mastery", name: "重兵精通", max: 5, row: 1, col: 2, reqPts: 3, reqLv: 3, prereq: ["foundation"], desc: "总攻击 +3% / 级" },
      { id: "hit", name: "百战之身", max: 3, row: 2, col: 1, reqPts: 10, reqLv: 5, prereq: ["weapon_mastery"], desc: "命中 +3 / 级" },
      { id: "atkspd", name: "疾风步", max: 3, row: 2, col: 3, reqPts: 10, reqLv: 6, prereq: ["weapon_mastery"], desc: "攻速 +3 / 级" },
      { id: "equip_atk", name: "力压千钧", max: 3, row: 3, col: 2, reqPts: 18, reqLv: 8, prereq: ["hit"], desc: "装备攻击 +5% / 级" },
      // 体 branch (col4)
      { id: "str_hp", name: "强健体魄", max: 5, row: 1, col: 4, reqPts: 3, reqLv: 2, prereq: ["foundation"], desc: "气血 +30 / 级" },
      { id: "str_def", name: "铜皮铁骨", max: 5, row: 2, col: 4, reqPts: 10, reqLv: 5, prereq: ["str_hp"], desc: "防御 +3 / 级" },
      { id: "equip_hp", name: "负重前行", max: 3, row: 3, col: 4, reqPts: 18, reqLv: 8, prereq: ["str_def"], desc: "装备气血 +5% / 级" },
      { id: "berserk", name: "狂暴", max: 1, row: 4, col: 4, reqPts: 28, reqLv: 12, prereq: ["equip_hp"], active: true, desc: "主动·战斗中蓝量满自动进入狂暴(出手大幅加快)" }
    ]
  }, {
    // ---- 第二树：内功附魔流(WalyCai 2026-06-18)。与战士共存,共用sp池,各树按本树已投点解锁。数值待莱布尼茨精调 ----
    id: "enchant", name: "内功附魔流", totalPts: 53,
    nodes: [
      { id: "range", name: "内功射程", max: 5, row: 0, col: 2, reqPts: 0, reqLv: 1, prereq: [], desc: "远程攻击：射程随内功级别增长，敌人进场途中即可被打" },
      // 炎线 col0：点燃→灼烧 DoT
      { id: "fire_ignite", name: "点燃", max: 3, row: 1, col: 0, reqPts: 3, reqLv: 3, prereq: ["range"], desc: "命中几率点燃，灼烧持续掉血(DoT)" },
      { id: "fire_blaze", name: "烈焰", max: 5, row: 2, col: 0, reqPts: 8, reqLv: 8, prereq: ["fire_ignite"], desc: "灼烧每秒伤害 +/级" },
      { id: "fire_inferno", name: "燎原", max: 5, row: 3, col: 0, reqPts: 16, reqLv: 15, prereq: ["fire_blaze"], desc: "灼烧持续时间 +/级" },
      { id: "fire_conflag", name: "焚天", max: 3, row: 4, col: 0, reqPts: 24, reqLv: 22, prereq: ["fire_inferno"], desc: "灼烧伤害额外增幅 ×/级" },
      // 冰线 col2：冰冻减速
      { id: "ice_frost", name: "冰霜", max: 3, row: 1, col: 2, reqPts: 3, reqLv: 3, prereq: ["range"], desc: "命中几率冰冻：减敌移速/攻速/命中" },
      { id: "ice_glacier", name: "玄冰", max: 5, row: 2, col: 2, reqPts: 8, reqLv: 8, prereq: ["ice_frost"], desc: "冰冻减敌移速 +/级" },
      { id: "ice_freeze", name: "凝寒", max: 5, row: 3, col: 2, reqPts: 16, reqLv: 15, prereq: ["ice_glacier"], desc: "冰冻额外减敌攻速/命中 +/级" },
      { id: "ice_permafrost", name: "万载玄冰", max: 3, row: 4, col: 2, reqPts: 24, reqLv: 22, prereq: ["ice_freeze"], desc: "冰冻持续时间 & 触发几率 +/级" },
      // 毒线 col4：中毒 DoT
      { id: "poison_venom", name: "淬毒", max: 3, row: 1, col: 4, reqPts: 3, reqLv: 3, prereq: ["range"], desc: "命中几率中毒，持续掉血(DoT)" },
      { id: "poison_toxin", name: "剧毒", max: 5, row: 2, col: 4, reqPts: 8, reqLv: 8, prereq: ["poison_venom"], desc: "中毒每秒伤害 +/级" },
      { id: "poison_plague", name: "瘟疫", max: 5, row: 3, col: 4, reqPts: 16, reqLv: 15, prereq: ["poison_toxin"], desc: "中毒持续时间 +/级" },
      { id: "poison_corrode", name: "腐蚀", max: 3, row: 4, col: 4, reqPts: 24, reqLv: 22, prereq: ["poison_plague"], desc: "中毒伤害额外增幅 ×/级" }
    ]
  }];
  SKILL_TREES.forEach(function (tr) { var ext = (CORE.SKILL_EXT_NODES && CORE.SKILL_EXT_NODES[tr.id]) || []; tr.nodes = tr.nodes.concat(ext); tr.totalPts += ext.reduce(function (s, n) { return s + n.max; }, 0); }); // 深度扩展节点接到各树末尾(WalyCai:每树~200节点,选择性投点)
  var SK_NODE_TREE = {}; SKILL_TREES.forEach(function (tr) { tr.nodes.forEach(function (n) { SK_NODE_TREE[n.id] = tr; }); }); // 节点→所属树
  function treeOfNode(id) { return SK_NODE_TREE[id] || SKILL_TREES[0]; }
  function skillNodeById(id) { for (var t = 0; t < SKILL_TREES.length; t++) { var ns = SKILL_TREES[t].nodes; for (var i = 0; i < ns.length; i++) if (ns[i].id === id) return ns[i]; } return null; }
  function skillRank(id) { return (stats.skills && stats.skills[id]) || 0; }
  function skillSpent(tree) { var s = 0, sk = stats.skills || {}; for (var k in sk) { if (!tree || treeOfNode(k) === tree) s += sk[k]; } return s; } // 不传=全部;传树=该树已投点
  function nodeLockReason(n) { // 可投点返回 null，否则返回未解锁原因
    if (stats.level < n.reqLv) return "需等级 Lv" + n.reqLv;
    if (skillSpent(treeOfNode(n.id)) < n.reqPts) return "需本树已投 " + n.reqPts + " 点";
    for (var i = 0; i < n.prereq.length; i++) if (skillRank(n.prereq[i]) < 1) { var pn = skillNodeById(n.prereq[i]); return "需先学「" + (pn ? pn.name : n.prereq[i]) + "」"; }
    return null;
  }
  function refundBlocked(id) { // 退到0会断链则禁止：存在已学节点把它当前置(同树内)
    var tr = treeOfNode(id);
    for (var i = 0; i < tr.nodes.length; i++) { var m = tr.nodes[i]; if (skillRank(m.id) > 0 && m.prereq.indexOf(id) >= 0) return m; }
    return null;
  }
  function validateSkills() { // 树改版迁移：清理无效/超额技能，点数退回 sp
    var sk = stats.skills || {}, refunded = 0;
    for (var id in sk) { var n = skillNodeById(id); if (!n) { refunded += sk[id]; delete sk[id]; } else if (sk[id] > n.max) { refunded += sk[id] - n.max; sk[id] = n.max; } }
    if (refunded) stats.sp = (stats.sp || 0) + refunded;
  }
  function neigongLv() { var gf = {}, g = stats.gongfa || {}; for (var id in g) gf[id] = g[id].lv || 0; return CORE.neigongLevel(gf); } // 内功级别=所有功法等级之和(WalyCai重定义)
  function spForLevel(lv) { return Math.floor((lv || 1) / 3); } // 技能点预算:每3级+1点(莱布尼茨:防点满,endgame~24%节点→真取舍)
  var NEI_HEAL_PER_LV = 0.25; // 内功功法自动回血:每点内功功法等级 +X HP/秒(WalyCai:纯加法/不百分比/不封顶。0.5→0.25:没怎么刷功法就比睡觉涨得快,减半)
  function neiHealRate() { var r = 0, g = stats.gongfa || {}; for (var id in g) { var go = gongfaById(id); if (go && go.sys === "nei") r += (g[id].lv || 0) * NEI_HEAL_PER_LV; } return r; } // 所有已修内功功法的自动回血/秒之和(加法,无上限)
  function curBuild() { // 当前玩家 build 描述(给 core.buildToCombat;neigong 由 core 从 gongfa 内部推导,此字段已废弃保留兼容)
    var gf = {}, g = stats.gongfa || {}; for (var id in g) gf[id] = g[id].lv || 0;
    return { level: stats.level, neigong: stats.ng, equipped: equipped, skills: stats.skills, gongfa: gf, gongfaEquip: stats.gongfaEquip };
  }
  function totalAttrs() { return CORE.buildToCombat(curBuild()).attrs; } // 单一源：与 sim 逐位一致
  function syncHpMax() { var a = totalAttrs(); stats.hpMax = a.HP; if (stats.hp > stats.hpMax) stats.hp = stats.hpMax; if (stats.hp <= 0) stats.hp = stats.hpMax; stats.manaMax = a.Mana || 0; if (stats.mana == null) stats.mana = stats.manaMax; if (stats.mana > stats.manaMax) stats.mana = stats.manaMax; updateStats(); }
  // ---- 人物技能面板 ----
  function openSkill() { renderSkill(); $("skillModal").classList.remove("hidden"); }
  function spendSkill(id) {
    var n = skillNodeById(id); if (!n) return;
    if ((stats.sp || 0) <= 0) { toast("没有可用技能点"); return; }
    if (skillRank(id) >= n.max) { toast("已满级"); return; }
    var lr = nodeLockReason(n); if (lr) { toast(lr); return; }
    stats.skills[id] = skillRank(id) + 1; stats.sp--; syncHpMax(); save(); renderSkill();
  }
  function refundSkill(id) {
    if (skillRank(id) <= 0) return;
    if (skillRank(id) === 1) { var blk = refundBlocked(id); if (blk) { toast("「" + blk.name + "」依赖它，需先退它"); return; } }
    stats.skills[id] = skillRank(id) - 1; if (!stats.skills[id]) delete stats.skills[id]; stats.sp = (stats.sp || 0) + 1; syncHpMax(); save(); renderSkill();
  }
  function resetSkills() { var sp = skillSpent(); if (!sp) { toast("还没投入技能点"); return; } stats.sp = (stats.sp || 0) + sp; stats.skills = {}; syncHpMax(); save(); renderSkill(); toast("已重置全部技能点"); }
  var SK_COLS = 5, SK_ROWS = 5, SK_CW = 134, SK_CH = 92, SK_PAD = 9;
  var activeTreeIdx = 0; // 当前显示的技能树 tab(力量战士/内功附魔流 并列标签页)
  function treeRows(tree) { var r = 0; tree.nodes.forEach(function (n) { if (n.row + 1 > r) r = n.row + 1; }); return r; }
  function renderSkillTree(tree, w) { // 渲染单棵树到容器 w(已定位)
    var rows = treeRows(tree), width = SK_COLS * SK_CW, height = rows * SK_CH;
    w.style.position = "relative"; w.style.width = width + "px"; w.style.height = height + "px";
    function cx(col) { return SK_PAD + col * SK_CW + (SK_CW - SK_PAD * 2) / 2; }
    function cy(row) { return SK_PAD + row * SK_CH + (SK_CH - SK_PAD * 2) / 2; }
    var svg = '<svg width="' + width + '" height="' + height + '" style="position:absolute;left:0;top:0;pointer-events:none">';
    tree.nodes.forEach(function (n) {
      n.prereq.forEach(function (pid) {
        var p = skillNodeById(pid); if (!p) return;
        var lit = skillRank(pid) > 0, col = lit ? (skillRank(n.id) > 0 ? "#ffce6a" : "#b89a4a") : "#4a3826";
        svg += '<line x1="' + cx(p.col) + '" y1="' + cy(p.row) + '" x2="' + cx(n.col) + '" y2="' + cy(n.row) + '" stroke="' + col + '" stroke-width="' + (lit ? 3 : 2) + '"/>';
      });
    });
    svg += '</svg>'; w.innerHTML = svg;
    tree.nodes.forEach(function (n) {
      var rk = skillRank(n.id), maxed = rk >= n.max, lock = nodeLockReason(n);
      var el = document.createElement("div");
      el.className = "sk-node2" + (rk > 0 ? " has" : "") + (lock && rk === 0 ? " locked" : "") + (maxed ? " maxed" : "") + (n.active ? " active" : "");
      el.style.left = (SK_PAD + n.col * SK_CW) + "px"; el.style.top = (SK_PAD + n.row * SK_CH) + "px";
      el.style.width = (SK_CW - SK_PAD * 2) + "px"; el.style.height = (SK_CH - SK_PAD * 2) + "px";
      el.title = n.desc; // 技能说明移到悬停提示(WalyCai:描述太长撑乱节点导致按钮点不到,暂不在框内显示)
      var body = (lock && rk === 0) ? '<div class="sk2-lock">🔒 ' + lock + '</div>' : '<div class="sk2-desc">' + (n.desc || "") + '</div>'; // 显示技能说明(节点 overflow:hidden,长描述截断·悬停看全)
      el.innerHTML = '<div class="sk2-top"><i class="sk2-ico" style="background-image:url(\'assets/ui/icons/skill_' + n.id + '.png\')"></i><span class="sk2-name">' + n.name + (n.active ? ' ⚡' : '') + '</span><span class="sk2-rk">' + rk + '/' + n.max + '</span></div>' + body
        + '<div class="sk2-btns"><button class="tb sk-mini" data-a="m">−</button><button class="tb sk-mini" data-a="p">+</button></div>';
      var bs = el.getElementsByTagName("button");
      bs[0].disabled = rk <= 0; bs[0].onclick = function () { refundSkill(n.id); };
      bs[1].disabled = maxed || (stats.sp || 0) <= 0 || !!lock; bs[1].onclick = function () { spendSkill(n.id); };
      w.appendChild(el);
    });
  }
  function renderSkill() {
    if (activeTreeIdx >= SKILL_TREES.length) activeTreeIdx = 0;
    var info = "等级 Lv" + stats.level + " · 可用技能点 <b>" + (stats.sp || 0) + "</b> · 内功级别 <b>" + neigongLv() + "</b> · 两流派可共存，共用技能点";
    var tabs = SKILL_TREES.map(function (tr, i) { return '<button class="sk-tab' + (i === activeTreeIdx ? " active" : "") + '" data-i="' + i + '">' + tr.name + ' <span class="sk-tab-pts">' + skillSpent(tr) + '/' + tr.totalPts + '</span></button>'; }).join("");
    $("skInfo").innerHTML = info + '<div class="sk-tabs">' + tabs + '</div>';
    var tabEls = $("skInfo").getElementsByClassName("sk-tab");
    for (var ti = 0; ti < tabEls.length; ti++) tabEls[ti].onclick = (function (idx) { return function () { activeTreeIdx = idx; renderSkill(); }; })(ti);
    var host = $("skTree"); host.style.position = ""; host.style.width = ""; host.style.height = ""; host.innerHTML = "";
    var canvas = document.createElement("div"); host.appendChild(canvas);
    renderSkillTree(SKILL_TREES[activeTreeIdx], canvas); // 只渲染当前 tab 的树
    var a = totalAttrs();
    var skcr = CORE.critResolve(a.Crit, a.CritDmg);
    $("skAttrs").innerHTML = "战力 <b>" + CORE.combatPower(a) + "</b> · 气血 " + a.HP + " · 攻 " + a.ATK + " · 防 " + a.DEF + " · 暴击 " + skcr.crit + "% · 暴伤 " + skcr.critDmg + "% · 命中 " + a.Hit + " · 攻速 " + a.ATKspd + " · 蓝量 " + (a.Mana || 0) + " · 自动回血 " + neiHealRate() + "/秒";
  }
  // ---- 居家经济 / 居家技能 ----
  function homeEnv() { var e = 0, o = stats.owned || {}; for (var id in o) { var c = byId[id]; if (c && c.env) e += c.env * o[id]; } return e; } // 环境值=拥有(已购)数量×env，不依赖陈列(WalyCai设计)
  function homeSpTotal() { return Math.floor(homeEnv() / ENV_PER_POINT); }
  function homeSpLeft() { return Math.max(0, homeSpTotal() - (stats.homeSpSpent || 0)); }
  function homeRank(id) { return (stats.homeSkills && stats.homeSkills[id]) || 0; }
  function homeSpentSum() { var s = 0, h = stats.homeSkills || {}; for (var k in h) s += h[k]; return s; }
  function buyFurniture(id) {
    var c = byId[id]; if (!c) return;
    if ((stats.gold || 0) < c.price) { toast("金币不足（需 " + c.price + "💰）"); return; }
    stats.gold -= c.price; bag[id] = (bag[id] || 0) + 1; stats.owned[id] = (stats.owned[id] || 0) + 1; // 可重复购买,每件+环境(金币无底洞)
    save(); renderItems(); updateStats(); toast("购入「" + c.name + "」 +环境" + c.env + " · -" + c.price + "💰");
  }
  function sellPrice(it) { // 售价=稀有度基准×(1+词条数*0.15)×(1+精算技能)
    var r = it.rarity || (EQUIP_TPL[it.tid] && "common"); var base = (CORE.SELL && CORE.SELL[r]) || 8;
    var af = (it.affixes && it.affixes.length) || 0;
    return Math.round(base * (1 + af * 0.15) * (1 + homeRank("sell_price") * 0.12));
  }
  function sellItem(uid) {
    var i = warehouse.findIndex(function (x) { return x.uid === uid; }); if (i < 0) return;
    var it = warehouse[i]; if (!it.rarity) it.rarity = "common"; var price = sellPrice(it);
    warehouse.splice(i, 1); stats.gold = (stats.gold || 0) + price; dollSel = null; saveEquip(); save(); updateStats(); renderDoll(); toast("卖出「" + itemNm(it) + "」 +" + price + "💰");
  }
  function sellAll() { // 一键卖出全部;锁开则保护"穿上能提升战力"的装备
    var protect = stats.sellLock !== false, curCP = CORE.combatPower(totalAttrs());
    var gold = 0, sold = 0, kept = 0;
    warehouse.slice().forEach(function (it) {
      if (protect && CORE.combatPower(previewTotals(it).totals) > curCP) { kept++; return; } // 战力更高→保护
      var i = warehouse.indexOf(it); if (i < 0) return; if (!it.rarity) it.rarity = "common"; gold += sellPrice(it); warehouse.splice(i, 1); sold++;
    });
    if (!sold) { toast(protect ? "没有可卖的（都是战力更高的被保护，或仓库空）" : "仓库空"); return; }
    stats.gold = (stats.gold || 0) + gold; dollSel = null; saveEquip(); save(); updateStats(); renderDoll(); toast("卖出 " + sold + " 件 +" + gold + "💰" + (kept ? "（保护 " + kept + " 件战力更高）" : ""));
  }
  function openHomeSkill() { renderHomeSkill(); $("homeSkillModal").classList.remove("hidden"); }
  function homeAdj(id, d) {
    if (d > 0) { var n = HOME_SKILLS.filter(function (s) { return s.id === id; })[0]; if (!n) return; if (homeSpLeft() <= 0) { toast("居家技能点不足（多摆家具涨环境值）"); return; } if (homeRank(id) >= n.max) { toast("已满级"); return; } stats.homeSkills[id] = homeRank(id) + 1; stats.homeSpSpent = (stats.homeSpSpent || 0) + 1; }
    else { if (homeRank(id) <= 0) return; stats.homeSkills[id] = homeRank(id) - 1; if (!stats.homeSkills[id]) delete stats.homeSkills[id]; stats.homeSpSpent = Math.max(0, (stats.homeSpSpent || 0) - 1); }
    save(); renderHomeSkill();
  }
  function learnAuto(id) { // 学习自动化技能(花1居家技能点)
    if (homeRank(id) > 0) return;
    if (homeSpLeft() <= 0) { toast("居家技能点不足（多摆家具涨环境值）"); return; }
    stats.homeSkills[id] = 1; stats.homeSpSpent = (stats.homeSpSpent || 0) + 1; save(); renderHomeSkill();
  }
  function toggleAuto(id) { // 开关;满血自动打坐/历练互斥
    if (homeRank(id) <= 0) return;
    if (!stats.autoOn) stats.autoOn = {};
    var on = !stats.autoOn[id]; stats.autoOn[id] = on;
    if (on) { var n = HOME_AUTO.filter(function (s) { return s.id === id; })[0]; if (n && n.excl) stats.autoOn[n.excl] = false; } // 互斥:开一个关另一个
    save(); renderHomeSkill(); updateAutoFloat();
  }
  function updateAutoFloat() { // 自动历练总开关浮钮:学了就常显置顶,随时可关(防死循环)
    var el = $("autoFloat"); if (!el) return;
    var learned = homeRank("auto_sortie") > 0;
    if (!learned) { el.classList.add("hidden"); return; }
    var on = !!(stats.autoOn && stats.autoOn.auto_sortie);
    el.classList.remove("hidden"); el.classList.toggle("on", on);
    el.textContent = "⚙ 自动历练：" + (on ? "开（点此停）" : "关");
  }
  function renderHomeSkill() {
    $("hsInfo").innerHTML = "居家环境值 <b>" + homeEnv() + "</b> · 居家技能点 <b>" + homeSpLeft() + "</b>/" + homeSpTotal() + " · 金币 " + (stats.gold || 0) + "💰（每 " + ENV_PER_POINT + " 环境 = 1 点）";
    var w = $("hsList"); w.innerHTML = "";
    HOME_SKILLS.forEach(function (n) {
      var rk = homeRank(n.id), maxed = rk >= n.max;
      var row = document.createElement("div"); row.className = "hs-row" + (rk > 0 ? " has" : "");
      row.innerHTML = '<div class="hs-main"><span class="hs-name">' + n.name + '</span><span class="hs-rk">' + rk + '/' + n.max + '</span></div><div class="hs-desc">' + n.desc + '</div>';
      var btns = document.createElement("div"); btns.className = "hs-btns";
      var mn = document.createElement("button"); mn.className = "tb sk-mini"; mn.textContent = "−"; mn.disabled = rk <= 0; mn.onclick = function () { homeAdj(n.id, -1); };
      var pl = document.createElement("button"); pl.className = "tb sk-mini"; pl.textContent = "+"; pl.disabled = maxed || homeSpLeft() <= 0; pl.onclick = function () { homeAdj(n.id, 1); };
      btns.appendChild(mn); btns.appendChild(pl);
      if (n.id === "spawn_speed" && rk > 0) { var tg = document.createElement("button"); var on = !stats.spawnSpeedOff; tg.className = "tb sk-mini" + (on ? " auto-on" : ""); tg.textContent = on ? "● 开" : "○ 关"; tg.title = "诱敌开关:关掉则本次历练不加快刷怪(避免被怪堆)"; tg.onclick = function () { stats.spawnSpeedOff = !stats.spawnSpeedOff; save(); renderHomeSkill(); }; btns.appendChild(tg); } // 诱敌开关(WalyCai)
      row.appendChild(btns); w.appendChild(row);
    });
    // 自动化技能:学习→开关
    var sep = document.createElement("div"); sep.className = "hs-sep"; sep.textContent = "⚙ 自动挂机" + (autoStats.runs ? "（本次累计 " + autoStats.runs + " 趟 · " + autoStats.kills + " 杀 · +" + autoStats.exp + " exp · +" + autoStats.gold + " 金 · " + autoStats.loot + " 装备）" : ""); w.appendChild(sep);
    HOME_AUTO.forEach(function (n) {
      var learned = homeRank(n.id) > 0, on = !!(stats.autoOn && stats.autoOn[n.id]);
      var row = document.createElement("div"); row.className = "hs-row" + (learned ? " has" : "");
      row.innerHTML = '<div class="hs-main"><span class="hs-name">' + n.name + '</span><span class="hs-rk">' + (learned ? (on ? "开" : "关") : "未学") + '</span></div><div class="hs-desc">' + n.desc + '</div>';
      var btns = document.createElement("div"); btns.className = "hs-btns";
      var b = document.createElement("button"); b.className = "tb sk-mini";
      if (!learned) { b.textContent = "学习"; b.disabled = homeSpLeft() <= 0; b.onclick = function () { learnAuto(n.id); }; }
      else { b.textContent = on ? "● 开" : "○ 关"; b.className = "tb sk-mini" + (on ? " auto-on" : ""); b.onclick = function () { toggleAuto(n.id); }; }
      btns.appendChild(b); row.appendChild(btns); w.appendChild(row);
    });
  }
  // ---- 功法装备页 ----
  function setTrain(id) { if (!gongfaById(id)) return; stats.trainId = id; save(); renderKungfu(); toast("修炼中：" + gongfaById(id).name + "（去打坐台/点打坐提升熟练度）"); }
  function equipGongfa(id) {
    var g = gongfaById(id); if (!g) return; if (gfState(id).lv <= 0) { toast("需先修炼到 1 级"); return; }
    if (gfEquippedSlot(id)) { stats.gongfaEquip[gfEquippedSlot(id)] = null; syncHpMax(); save(); renderKungfu(); return; } // 已装→卸下
    var slot = null;
    if (g.sys === "nei") slot = "nei"; else if (g.sys === "qing") slot = "qing";
    else { slot = !stats.gongfaEquip.wai1 ? "wai1" : (!stats.gongfaEquip.wai2 ? "wai2" : "wai1"); } // 外功 2 槽，满则替换 wai1
    stats.gongfaEquip[slot] = id; syncHpMax(); save(); renderKungfu(); toast("已装备「" + g.name + "」到" + (slot === "nei" ? "内功" : slot === "qing" ? "轻功" : "外功") + "槽");
  }
  function fmtEff(o, lv) { var s = []; var NM = { HP: "气血", ATK: "攻击", DEF: "防御", Crit: "暴击", CritDmg: "暴伤", Hit: "命中", Dodge: "闪避", ATKspd: "攻速", Mana: "内力" }; for (var k in o) s.push(NM[k] + "+" + (o[k] * (lv || 1)) + (k === "Crit" || k === "CritDmg" ? "%" : "")); return s.join("、"); }
  function openKungfu() { renderKungfu(); $("kungfuModal").classList.remove("hidden"); }
  function renderKungfu() {
    // 装备栏
    var es = $("gfEquip"); es.innerHTML = "";
    GONGFA_SLOTS.forEach(function (sl) {
      var eid = stats.gongfaEquip[sl.key], g = eid && gongfaById(eid), lv = eid ? gfState(eid).lv : 0;
      var d = document.createElement("div"); d.className = "gf-slot" + (g ? " filled gf-" + sl.sys : "");
      d.innerHTML = '<div class="gf-slot-lbl">' + sl.name + '</div>' + (g ? ('<div class="gf-slot-nm">' + g.name + ' <b>Lv' + lv + '</b></div>') : '<div class="gf-slot-empty">空</div>');
      if (g) d.onclick = function () { equipGongfa(eid); };
      es.appendChild(d);
    });
    // 功法仓库（仅已拥有：白功法免费送 + 商店购买的）
    var w = $("gfList"); w.innerHTML = "";
    var owned = GONGFA.filter(function (g) { return gfState(g.id).lv > 0 || (stats.gongfa && stats.gongfa[g.id]); });
    if (!owned.length) w.innerHTML = '<div class="gf-empty">还没有功法，点「购买功法」去功法商店</div>';
    owned.forEach(function (g) {
      var st = gfState(g.id), lv = st.lv, equipped = !!gfEquippedSlot(g.id), training = stats.trainId === g.id;
      var need = lv < GONGFA_MAXLV ? gfProfReq(lv) : 0, pct = need ? Math.min(100, Math.round(st.prof / need * 100)) : 100;
      var row = document.createElement("div"); row.className = "gf-row gf-" + g.sys + (equipped ? " equipped" : "");
      row.innerHTML = '<div class="gf-top"><span class="gf-nm"><i class="gf-ico" style="background-image:url(\'assets/ui/gongfa/book_' + g.id + '.png\')"></i>' + g.name + ' <span class="gf-sys" style="color:' + g.color + '">' + (g.sys === "nei" ? "内功" : g.sys === "wai" ? "外功" : "轻功") + '·' + g.tierName + '</span></span><span class="gf-lv">Lv ' + lv + '/' + GONGFA_MAXLV + (training ? ' · <b style="color:#7fd0ff">修炼中</b>' : '') + '</span></div>'
        + '<div class="gf-bar"><i style="width:' + pct + '%"></i></div>'
        + '<div class="gf-eff">被动：' + fmtEff(g.passive, lv || 1) + '（修炼即得）<br>主动：' + (gfActiveDesc(g, lv || 1) || fmtEff(g.active, lv || 1)) + gfActNote(g) + '</div>';
      var btns = document.createElement("div"); btns.className = "gf-btns";
      var bt = document.createElement("button"); bt.className = "tb sk-mini"; bt.textContent = training ? "修炼中" : "修炼"; bt.disabled = training; bt.onclick = function () { setTrain(g.id); };
      var be = document.createElement("button"); be.className = "tb sk-mini"; be.textContent = equipped ? "卸下" : "装备"; be.disabled = lv <= 0; be.onclick = function () { equipGongfa(g.id); };
      btns.appendChild(bt); btns.appendChild(be); row.appendChild(btns); w.appendChild(row);
    });
    var a = totalAttrs();
    var gfcr = CORE.critResolve(a.Crit, a.CritDmg);
    $("gfAttrs").innerHTML = "战力 <b>" + CORE.combatPower(a) + "</b> · 气血 " + a.HP + " · 攻 " + a.ATK + " · 防 " + a.DEF + " · 暴击 " + gfcr.crit + "% · 暴伤 " + gfcr.critDmg + "% · 命中 " + a.Hit + " · 攻速 " + a.ATKspd + " · 内力 " + (a.Mana || 0) + " · 自动回血 " + neiHealRate() + "/秒";
  }
  // ---- 功法商店 ----
  function buyGongfa(id) {
    var g = gongfaById(id); if (!g) return;
    if (stats.gongfa[id]) { toast("已拥有「" + g.name + "」"); return; }
    if ((stats.gold || 0) < g.price) { toast("金币不足（需 " + g.price + "💰）"); return; }
    stats.gold -= g.price; stats.gongfa[id] = { lv: 1, prof: 0 }; syncHpMax(); save(); updateStats(); renderGfShop(); toast("购得「" + g.name + "」（" + g.tierName + "阶）-" + g.price + "💰");
  }
  var GF_SHOP_SIZE = 6, GF_SHOP_REFRESH_MS = 600000; // 每次随机6本,10分钟刷新(WalyCai)
  var GF_TIER_W = [35, 28, 20, 11, 5, 2.5, 1.5, 0.7, 0.3, 0.1]; // 莱布尼茨定稿:各档出现权重(强烈偏低档,橙+很稀有)
  function gfShopRoll() { // 各槽独立按档权重roll;等级门槛:只刷≤适配档(防低级刷出绝品)
    var maxTier = Math.min(9, Math.floor((stats.level || 1) / 8) + 1); // 莱布尼茨:maxTier=min(9,floor(lv/8)+1)
    var pool = GONGFA.filter(function (g) { return g.tier <= maxTier; }).map(function (g) { return { id: g.id, w: GF_TIER_W[g.tier] || 0.1 }; });
    var pick = [], guard = 0;
    while (pick.length < GF_SHOP_SIZE && pool.length && guard++ < 999) {
      var tot = 0; pool.forEach(function (p) { tot += p.w; }); var r = Math.random() * tot, acc = 0, idx = 0;
      for (var i = 0; i < pool.length; i++) { acc += pool[i].w; if (r <= acc) { idx = i; break; } }
      pick.push(pool[idx].id); pool.splice(idx, 1);
    }
    return pick;
  }
  function gfShopRefresh(force) { var now = Date.now(); if (force || !stats.gfShop || !stats.gfShop.ids || now >= (stats.gfShop.next || 0)) { stats.gfShop = { ids: gfShopRoll(), next: now + GF_SHOP_REFRESH_MS }; save(); } }
  function openGfShop() { renderGfShop(); $("gfShopModal").classList.remove("hidden"); }
  function renderGfShop() {
    gfShopRefresh();
    $("gfsGold").textContent = stats.gold || 0;
    var w = $("gfsList"); w.innerHTML = "";
    var mins = Math.max(0, Math.ceil((stats.gfShop.next - Date.now()) / 60000));
    var hdr = document.createElement("div"); hdr.className = "gfs-refresh"; hdr.innerHTML = '本批随机 ' + GF_SHOP_SIZE + ' 本 · 约 <b>' + mins + '</b> 分钟后刷新 <button id="gfsReroll" class="tb sk-mini">立即刷新</button>';
    w.appendChild(hdr);
    var grid = document.createElement("div"); grid.className = "gfs-grid";
    (stats.gfShop.ids || []).forEach(function (id) {
      var g = gongfaById(id); if (!g) return;
      var own = !!stats.gongfa[id], afford = (stats.gold || 0) >= g.price;
      var d = document.createElement("div"); d.className = "gfs-item";
      d.innerHTML = '<span class="gfs-nm" style="color:' + g.color + '">' + (g.sys === "nei" ? "内功" : g.sys === "wai" ? "外功" : "轻功") + '·' + g.tierName + ' ' + g.name + '</span><span class="gfs-eff">主' + fmtEff(g.active, 1) + '</span>'
        + (own ? '<span class="gfs-own">已拥有</span>' : '<button class="tb sk-mini gfs-buy"' + (afford ? "" : " disabled") + '>' + g.price + '💰</button>');
      if (!own) { var b = d.getElementsByClassName("gfs-buy")[0]; if (b) b.onclick = function () { buyGongfa(g.id); }; }
      grid.appendChild(d);
    });
    w.appendChild(grid);
    var rb = $("gfsReroll"); if (rb) rb.onclick = function () { gfShopRefresh(true); renderGfShop(); }; // 调试/手动刷新
  }
  function targetSlotFor(it) {
    var type = EQUIP_TPL[it.tid].type;
    if (type === "ring") return !equipped.ring1 ? "ring1" : (!equipped.ring2 ? "ring2" : "ring1");
    var sd = SLOT_DEFS.find(function (s) { return s.type === type; }); return sd ? sd.key : null;
  }
  function previewTotals(it) { var slot = targetSlotFor(it), saved = equipped[slot]; equipped[slot] = it; var nt = totalAttrs(); equipped[slot] = saved; return { slot: slot, totals: nt }; }

  function equipItem(it, slotKey) {
    var sd = SLOT_DEFS.find(function (s) { return s.key === slotKey; });
    if (!sd || EQUIP_TPL[it.tid].type !== sd.type) { toast("该装备不能放这个槽"); return; }
    var req = it.lv || 1; if (stats.level < req) { toast("需要历练等级 " + req + " 才能佩戴"); return; }
    var idx = warehouse.indexOf(it); if (idx < 0) return; warehouse.splice(idx, 1);
    if (equipped[slotKey]) warehouse.push(equipped[slotKey]);
    equipped[slotKey] = it; dollSel = null; if (APPEAR_SLOTS.indexOf(slotKey) >= 0) loadEquipOverlay(it.tid); syncHpMax(); renderDoll(); saveEquip();
  }
  function unequip(slotKey) { var it = equipped[slotKey]; if (!it) return; equipped[slotKey] = null; dollSel = null; warehouse.push(it); syncHpMax(); renderDoll(); saveEquip(); }
  function pctOf(k) { return (k === "Crit" || k === "CritDmg") ? "%" : ""; }
  function itemTipHTML(it, label) { // 单个装备的属性框(级别要求/售价/主属性/套装)
    if (!EQUIP_TPL[it.tid]) return "";
    var rar = rarOf(it), rc = RARITY[rar].color, set = setOf(it.tid);
    var h = '<div class="item-tip">';
    if (label) h += '<div class="tip-lbl">' + label + '</div>';
    h += '<h4 style="color:' + rc + '">【' + RARITY[rar].name + '】' + itemNm(it) + ' ·Lv' + (it.lv || 1) + '</h4>';
    var s = itemStats(it); for (var k in s) h += '<div class="tip-row"><span>' + (STAT_LABEL[k] || k) + '</span><span>+' + s[k] + pctOf(k) + '</span></div>';
    if (set) {
      var act = 0, asList = CORE.activeSets(equipped); for (var ai = 0; ai < asList.length; ai++) if (asList[ai].set.id === set.id) act = asList[ai].count;
      h += '<div class="tip-set">〖' + set.name + '〗套装 （已激活 ' + act + '/' + set.pieces.length + ' 件）</div>';
      var pn = set.pieces.map(function (tid) { var on = false; for (var sk in equipped) if (equipped[sk] && equipped[sk].tid === tid) { on = true; break; } var nm = (EQUIP_TPL[tid] && EQUIP_TPL[tid].name) || tid; return '<span style="color:' + (on ? "#7fe0a0" : "#8a7656") + '">' + (on ? "✓" : "·") + nm + '</span>'; });
      h += '<div class="tip-row" style="display:block;font-size:10px">' + pn.join(' ') + '</div>';
      var ths = Object.keys(set.bonuses).sort(function (a, b) { return a - b; });
      ths.forEach(function (th) { var b = set.bonuses[th], parts = []; for (var st in b) { if (st === "skillGrant") parts.push("解锁专属技能"); else parts.push((STAT_LABEL[st] || st) + "+" + b[st] + pctOf(st)); } var on = act >= +th; h += '<div class="tip-row" style="color:' + (on ? "#7fe0a0" : "#8a7656") + '"><span>' + th + '件套</span><span>' + parts.join(" ") + '</span></div>'; });
    }
    h += '<div class="tip-row" style="margin-top:3px"><span class="tip-lbl">售价</span><span>' + sellPrice(it) + '💰</span></div>';
    h += '<div class="tip-row tip-req"><span>级别要求</span><span>Lv' + (it.lv || 1) + '</span></div>';
    return h + '</div>';
  }
  function showItemTip(it, mode) { // 悬停显示属性框;仓库件额外显示同槽已穿戴件做对比
    var html = itemTipHTML(it, mode === "equipped" ? "已穿戴" : "仓库");
    if (mode === "warehouse") { var sk = targetSlotFor(it), cur = sk && equipped[sk]; if (cur) html += itemTipHTML(cur, "已穿戴（同位置·对比）"); }
    $("itemTip").innerHTML = html; $("itemTip").classList.remove("hidden");
    if (mode === "warehouse") renderAttrPanel(it); // 悬停仓库件→属性区显示穿上后战力/属性变化
  }
  function hideItemTip() { $("itemTip").classList.add("hidden"); $("itemTip").innerHTML = ""; renderAttrPanel(dollSel); }

  function rarOf(it) { return it.rarity || "common"; }
  function setOf(tid) { var ss = CORE.SET_DEFS || []; for (var i = 0; i < ss.length; i++) if (ss[i].pieces.indexOf(tid) >= 0) return ss[i]; return null; }
  function itemTitle(it) { var s = itemStats(it); var parts = []; for (var k in s) parts.push(STAT_LABEL[k] + "+" + s[k] + pctOf(k)); var lv = it.lv || 1; var set = setOf(it.tid); var setTag = set ? " 〖" + set.name + "套〗" : ""; return "【" + RARITY[rarOf(it)].name + "】" + itemNm(it) + " ·Lv" + lv + setTag + "（需Lv" + lv + "）" + " " + parts.join(" "); }
  function equipIconHTML(tid, glyph) {
    return '<img class="equip-img" src="assets/equipment/' + tid + '.png" onerror="this.hidden=true;this.nextSibling.style.display=&quot;flex&quot;"><span class="equip-fallback">' + glyph + '</span>';
  }
  function slotIconHTML(sd) {
    return '<img class="slot-img" src="assets/ui/slot_' + sd.type + '.png" onerror="this.hidden=true;this.nextSibling.style.display=&quot;flex&quot;"><span class="equip-fallback empty">·</span>';
  }
  function renderDoll() {
    var slotsEl = $("dollSlots"); slotsEl.innerHTML = "";
    SLOT_DEFS.forEach(function (sd) {
      var it = equipped[sd.key], t = it && EQUIP_TPL[it.tid];
      var d = document.createElement("div"); d.className = "slot"; d.dataset.slot = sd.key;
      d.innerHTML = '<span class="slot-lbl">' + sd.name + '</span><span class="ico" style="' + (it ? 'border:2.5px solid ' + RARITY[rarOf(it)].color + ';box-shadow:0 0 6px ' + RARITY[rarOf(it)].color + '88' : '') + '">' + (it ? equipIconHTML(it.tid, t.glyph) : slotIconHTML(sd)) + '</span>' + (it ? '<span class="it-nm" style="color:' + RARITY[rarOf(it)].color + '">' + itemNm(it) + '</span>' : '');
      if (it) { d.addEventListener("mouseenter", function () { showItemTip(it, "equipped"); }); d.addEventListener("mouseleave", hideItemTip); d.ondblclick = function () { hideItemTip(); unequip(sd.key); }; } // 悬停看属性,双击卸下(WalyCai)
      d.addEventListener("dragover", function (e) { e.preventDefault(); d.classList.add("over"); });
      d.addEventListener("dragleave", function () { d.classList.remove("over"); });
      d.addEventListener("drop", function (e) { e.preventDefault(); d.classList.remove("over"); if (dollSel) equipItem(dollSel, sd.key); });
      d.addEventListener("click", function () { if (dollSel && !equipped[sd.key]) equipItem(dollSel, sd.key); });
      slotsEl.appendChild(d);
    });
    var wh = $("whGrid"); wh.innerHTML = ""; $("whCount").textContent = "(" + warehouse.length + ")";
    var curCP = CORE.combatPower(totalAttrs()); // 升级指示用：穿上后战力更高→绿箭头
    warehouse.forEach(function (it) {
      var t = EQUIP_TPL[it.tid];
      var locked = stats.level < (it.lv || 1);                    // 等级不够→灰掉蒙版(穿戴需求=装备等级)
      var up = CORE.combatPower(previewTotals(it).totals) > curCP;   // 战力更高→绿▲(不论是否够级)
      var rc = RARITY[rarOf(it)].color, hi = (rarOf(it) === "epic" || rarOf(it) === "legend");
      var d = document.createElement("div"); d.className = "wh-item" + (locked ? " locked" : ""); d.draggable = true; d.title = itemTitle(it) + (up ? "（穿上↑战力）" : "") + (locked ? "（需Lv" + (it.lv || 1) + "）" : "");
      d.innerHTML = equipIconHTML(it.tid, t.glyph) + (up ? '<span class="up-badge">▲</span>' : '') + (locked ? '<span class="lock-badge">Lv' + (it.lv || 1) + '</span>' : '');
      d.style.border = "2.5px solid " + rc; d.style.boxShadow = hi ? ("0 0 7px " + rc + ", inset 0 0 5px " + rc + "66") : ("inset 0 0 4px " + rc + "44"); // 品质彩色边框(史诗/传说加发光)
      if (dollSel === it) d.style.boxShadow = "0 0 0 3px #ffd98a, 0 0 8px " + rc;
      d.addEventListener("dragstart", function () { dollSel = it; });
      d.addEventListener("mouseenter", function () { dollSel = it; showItemTip(it, "warehouse"); }); // 悬停:本件+同槽已穿戴件对比框(WalyCai)
      d.addEventListener("mouseleave", hideItemTip);
      d.ondblclick = function () { hideItemTip(); equipItem(it, targetSlotFor(it)); }; // 双击穿戴
      wh.appendChild(d);
    });
    var sz = $("sellZone"); if (sz) sz.innerHTML = dollSel ? ('卖出「' + itemNm(dollSel) + '」 <b>+' + sellPrice(dollSel) + '💰</b>') : ('💰 拖装备到此卖出 / 选中后点此（金币 ' + (stats.gold || 0) + '）');
    var lk = $("sellLockChk"); if (lk) lk.checked = stats.sellLock !== false;
    renderAttrPanel(dollSel); // 属性区 + 选中/悬停装备对比
  }
  // 战斗属性区：全属性 + 穿戴预览(绿/红战力&属性变化) + 暴击封顶/暴伤溢出 + 套装阶段奖励
  function renderAttrPanel(prev) {
    var al = $("attrList"); if (!al) return; var a = totalAttrs(); al.innerHTML = "";
    var pv = prev ? previewTotals(prev) : null;
    function dlt(k) { if (!pv) return ""; var dv = (pv.totals[k] || 0) - (a[k] || 0); return dv ? ' <span style="color:' + (dv > 0 ? "#7fe0a0" : "#ff8a7a") + '">(' + (dv > 0 ? "+" : "") + dv + ')</span>' : ""; }
    var cp = CORE.combatPower(a), cpDelta = "";
    if (pv) { var dcp = CORE.combatPower(pv.totals) - cp; if (dcp) cpDelta = ' <span style="color:' + (dcp > 0 ? "#7fe0a0" : "#ff8a7a") + '">(' + (dcp > 0 ? "+" : "") + dcp + ')</span>'; }
    al.innerHTML += '<div class="row" style="border-bottom:1px solid #6a5238;font-size:15px"><span class="k" style="color:#e8c98a">⚔ 战力</span><span class="v" style="color:#ffd98a;font-size:16px">' + cp + cpDelta + '</span></div>';
    if (pv) {
      var st = SLOT_DEFS.find(function (s) { return s.key === pv.slot; }), cur = equipped[pv.slot];
      al.innerHTML += '<div class="row" style="border:none;color:#ffd98a">预览：' + itemNm(prev) + ' → ' + (st ? st.name : "") + '槽</div>';
      al.innerHTML += '<div class="row" style="border:none;font-size:11px;color:#9a866a">当前该槽：' + (cur ? itemNm(cur) : "空") + '</div>';
    }
    // 暴击封顶展示：超50%显示 "50%/50%（上限）"，溢出转暴伤显示 "200%+30%"
    var cr = CORE.critResolve(a.Crit, a.CritDmg);
    var critTxt = (a.Crit > 50) ? (cr.crit + '%/50%（上限）') : (a.Crit + '%');
    var conv = cr.critDmg - a.CritDmg, cdTxt = (conv > 0) ? (a.CritDmg + '%+' + conv + '%') : (a.CritDmg + '%');
    var rows = [["HP", a.HP + dlt("HP")], ["ATK", a.ATK + dlt("ATK")], ["DEF", a.DEF + dlt("DEF")], ["Crit", critTxt + dlt("Crit")], ["CritDmg", cdTxt + dlt("CritDmg")], ["Hit", a.Hit + dlt("Hit")], ["ATKspd", (a.ATKspd || 0) + dlt("ATKspd")], ["Dodge", (a.Dodge || 0) + dlt("Dodge")], ["Tough", (a.Tough || 0) + dlt("Tough")], ["Mana", (a.Mana || 0) + dlt("Mana")]];
    rows.forEach(function (r) { al.innerHTML += '<div class="row"><span class="k">' + (STAT_LABEL[r[0]] || r[0]) + '</span><span class="v">' + r[1] + '</span></div>'; });
    al.innerHTML += '<div class="row"><span class="k">内功级别</span><span class="v">' + neigongLv() + '</span></div>';
    al.innerHTML += '<div class="row"><span class="k">自动回血</span><span class="v">' + neiHealRate() + '/秒</span></div>';
    var sets = CORE.activeSets(equipped); // 套装加成显示
    if (sets.length) { al.innerHTML += '<div class="row" style="border-top:1px solid #4a3826;color:#e8c98a">⚜ 套装加成</div>'; sets.forEach(function (as) { var parts = []; for (var st2 in as.applied) parts.push((STAT_LABEL[st2] || st2) + "+" + as.applied[st2] + pctOf(st2)); al.innerHTML += '<div class="row"><span class="k" style="color:#7fe0a0">' + as.set.name + '（' + as.count + '/' + as.set.pieces.length + '）</span><span class="v">' + parts.join(" ") + '</span></div>'; }); }
  }
  function openDoll() { renderDoll(); $("dollModal").classList.remove("hidden"); }
  function saveEquip() { try { localStorage.setItem(SAVE_KEY + "_eq", JSON.stringify({ equipped: equipped, warehouse: warehouse, seq: equipSeq })); } catch (e) {} }
  function loadEquip() {
    try {
      var raw = localStorage.getItem(SAVE_KEY + "_eq"); if (!raw) return false; var d = JSON.parse(raw);
      equipped = d.equipped || equipped; warehouse = d.warehouse || []; equipSeq = d.seq || 1;
      // 装备体系重构:清掉旧模型的不兼容装备(tid不在新EQUIP_TPL里)。WalyCai已确认可全删
      for (var sk in equipped) { var e = equipped[sk]; if (e && !EQUIP_TPL[e.tid]) equipped[sk] = null; }
      warehouse = warehouse.filter(function (w) { return w && EQUIP_TPL[w.tid]; });
      // 武器分6类迁移:旧武器没有 wtype 的随机补一个(套装武器走模板wtype不用补)
      var allW = warehouse.concat([equipped.weapon]); allW.forEach(function (it) { if (it && it.tid === "weapon" && !it.wtype) it.wtype = CORE.rollWtype(); });
      return true;
    } catch (e) { return false; }
  }
  // ---- 3 存档位 ----
  function slotSummary(n) { try { var raw = localStorage.getItem(slotKey(n)); if (!raw) return null; var d = JSON.parse(raw), s = d.stats || {}; return { lv: s.level || 1, gold: s.gold || 0, zone: (s.unlocked || 0) + 1 }; } catch (e) { return null; } }
  function switchSlot(n) { if (n === activeSlot) { $("saveModal").classList.add("hidden"); return; } localStorage.setItem("wulin_slot", n); location.reload(); }
  function clearSlot(n) { if (!confirm("清空存档位 " + n + "？")) return; localStorage.removeItem(slotKey(n)); localStorage.removeItem(slotKey(n) + "_eq"); if (n === activeSlot) location.reload(); else renderSaveSlots(); }
  function openSaveSlots() { renderSaveSlots(); $("saveModal").classList.remove("hidden"); }
  function renderSaveSlots() {
    var w = $("saveList"); w.innerHTML = "";
    for (var n = 1; n <= 3; n++) { (function (n) {
      var sm = slotSummary(n), cur = n === activeSlot;
      var d = document.createElement("div"); d.className = "save-slot" + (cur ? " current" : "");
      d.innerHTML = '<div class="ss-h">存档位 ' + n + (cur ? ' <span class="ss-cur">当前</span>' : '') + '</div>'
        + '<div class="ss-info">' + (sm ? ('Lv' + sm.lv + ' · ' + sm.gold + '💰 · 解锁' + sm.zone + '区') : '<span class="ss-empty">空存档</span>') + '</div>';
      var btns = document.createElement("div"); btns.className = "ss-btns";
      var bsw = document.createElement("button"); bsw.className = "tb"; bsw.textContent = cur ? "当前(关闭)" : (sm ? "切换进入" : "新建进入"); bsw.onclick = function () { switchSlot(n); };
      var bcl = document.createElement("button"); bcl.className = "tb"; bcl.textContent = "清空"; bcl.disabled = !sm; bcl.onclick = function () { clearSlot(n); };
      btns.appendChild(bsw); btns.appendChild(bcl); d.appendChild(btns); w.appendChild(d);
    })(n); }
  }

  // ---- 出战历练（即时结算版；横版动画后续用同一 resolveCombat 回放）----
  // ---- 历练地图：分区 ----
  var ZONES = [
    { id: "niujia", name: "牛家村", lvMin: 1, lvMax: 1, types: ["thug"], boss: { type: "thug", lv: 2, hpMult: 20, atkMult: 1.5, name: "山贼王", bossId: "shanzeiwang" } },
    { id: "milin", name: "幽密林", lvMin: 3, lvMax: 5, types: ["thug", "bandit"], boss: { type: "bandit", lv: 6, hpMult: 20, atkMult: 1.5, name: "幽林鬼影", bossId: "youlinguiying" } },
    { id: "qingcheng", name: "青城派", lvMin: 6, lvMax: 8, types: ["bandit", "sect_novice"], boss: { type: "sect_novice", lv: 9, hpMult: 20, atkMult: 1.5, name: "青城逆徒", bossId: "qingchengnitu" } },
    { id: "xuedao", name: "血刀门", lvMin: 9, lvMax: 12, types: ["sect_novice", "xie_jiao"], boss: { type: "xie_jiao", lv: 13, hpMult: 20, atkMult: 1.5, name: "血刀老祖", bossId: "xuedaolaozu" } },
    { id: "mojiao", name: "魔教总坛", lvMin: 13, lvMax: 17, types: ["xie_jiao", "mo_jiao"], boss: { type: "mo_jiao", lv: 18, hpMult: 20, atkMult: 1.5, name: "天魔教主", bossId: "tianmojiaozhu" } },
    // 新增5图(WalyCai)：图1难度不变，从图2起等级带"增幅递增"(间隔 +6→+8→+11→+14→+18)，难度超线性追上CP速增；数值待莱布尼茨重调锁
    { id: "huangquan", name: "黄泉古道", bg: "bg_huangquan", lvMin: 18, lvMax: 24, types: ["mo_jiao", "gui_zu"], boss: { type: "gui_zu", lv: 25, hpMult: 20, atkMult: 1.5, name: "黄泉鬼王", bossId: "huangquanguiwang" } },
    { id: "luosha", name: "罗刹海市", bg: "bg_luosha", lvMin: 25, lvMax: 33, types: ["gui_zu", "yao_xiu"], boss: { type: "yao_xiu", lv: 34, hpMult: 20, atkMult: 1.5, name: "罗刹女君", bossId: "luoshanvjun" } },
    { id: "yaolin", name: "妖兽森林", bg: "bg_yaolin", lvMin: 34, lvMax: 45, types: ["yao_xiu", "mo_jiang"], boss: { type: "mo_jiang", lv: 46, hpMult: 20, atkMult: 1.5, name: "妖兽之王", bossId: "yaoshouwang" } },
    { id: "jiuyou", name: "九幽魔渊", bg: "bg_jiuyou", lvMin: 46, lvMax: 60, types: ["mo_jiang", "gu_mo"], boss: { type: "gu_mo", lv: 61, hpMult: 20, atkMult: 1.5, name: "九幽魔尊", bossId: "jiuyoumozun" } },
    { id: "tianwai", name: "天外魔域", bg: "bg_tianwai", lvMin: 61, lvMax: 80, types: ["gu_mo", "mo_jiang"], boss: { type: "gu_mo", lv: 82, hpMult: 20, atkMult: 1.5, name: "万古魔神", bossId: "wangumoshen" } }
  ];
  function curZone() { return ZONES[Math.min(stats.zone || 0, ZONES.length - 1)]; }
  function goZone(i) { stats.zone = i; save(); $("mapModal").classList.add("hidden"); startCombat(totalAttrs(), { zone: ZONES[i], zoneIdx: i }); } // 前往该区历练
  function bossChallenge() { // 战斗页「挑战BOSS」：先把本趟战利品入库,再打当前区BOSS
    var zi = CV.zoneIdx; if (zi == null) return; var z = ZONES[zi];
    if (CV.running) { bankResult(CV.sim.result()); CV.running = false; if (CV.raf) cancelAnimationFrame(CV.raf); }
    startCombat(totalAttrs(), { zone: z, boss: z.boss, bossZoneIdx: zi, zoneIdx: zi });
  }
  function renderZones() {
    var w = $("zoneList"); w.innerHTML = "";
    ZONES.forEach(function (z, i) {
      var locked = i > (stats.unlocked || 0), cur = i === (stats.zone || 0);
      var d = document.createElement("div"); d.className = "zone-row" + (locked ? " locked" : "") + (cur ? " current" : "");
      d.innerHTML = '<span class="zn">' + z.name + '</span><span class="zm">Lv' + z.lvMin + '-' + z.lvMax + ' · ' + (locked ? "🔒未解锁" : (cur ? "▶当前" : "已解锁")) + '</span>';
      if (!locked) { var b1 = document.createElement("button"); b1.className = "tb sortie"; b1.textContent = "前往历练"; b1.onclick = function () { goZone(i); }; d.appendChild(b1); }
      w.appendChild(d);
    });
  }
  function openMap() { renderZones(); $("mapModal").classList.remove("hidden"); }
  function bankResult(r) { // 静默结算(用于挑战BOSS前先把本趟战利品入库)
    stats.hp = r.outcome === "lose" ? Math.max(1, Math.round(stats.hpMax * 0.2)) : Math.max(1, r.hpRemaining);
    if (r.manaRemaining != null) stats.mana = Math.max(0, Math.min(stats.manaMax || 0, r.manaRemaining)); // 战斗消耗后的蓝量带回(睡觉回满,WalyCai)
    var gained = []; r.drops.forEach(function (d) { warehouse.push({ uid: equipSeq++, tid: d.id, affixes: d.affixes, rarity: d.rarity, lv: d.lv || 1, wtype: d.wtype }); gained.push(d); }); // 保留掉落稀有度+装备等级+武器类型(高区更好)
    stats.gold = (stats.gold || 0) + (r.goldGained || 0); // 金币入账
    var lvups = 0, sp0 = spForLevel(stats.level); stats.exp += r.expGained; while (stats.exp >= CORE.nextExp(stats.level)) { stats.exp -= CORE.nextExp(stats.level); stats.level++; lvups++; } stats.sp = (stats.sp || 0) + (spForLevel(stats.level) - sp0); // 技能点 +1/3级
    syncHpMax(); saveEquip(); save(); return { gained: gained, lvups: lvups, gold: r.goldGained || 0 };
  }
  function applyCombatResult(r) {
    var bk = bankResult(r), gained = bk.gained, lvups = bk.lvups;
    if (autoOn("auto_sortie") && !r.bossKilled) { autoStats.kills += r.kills; autoStats.exp += r.expGained; autoStats.gold += (r.goldGained || 0); autoStats.runs++; autoStats.loot += gained.length; toast("挂机历练 +" + r.kills + "杀 +" + r.expGained + "exp · 累计 " + autoStats.runs + " 趟"); return; } // 自动挂机:不弹结算框(否则卡住循环),静默累计
    var outTxt = r.outcome === "win" ? "全身而退 ✅" : ("负伤回家（" + (r.bagFull ? "背包已满" : "力竭") + "）");
    var body = '<div>结果：<span class="hl">' + outTxt + '</span></div>';
    body += '<div>击杀：<span class="hl">' + r.kills + '</span> 个 · 历时 ' + r.ttk + 's</div>';
    body += '<div>获得经验：<span class="hl">+' + r.expGained + '</span>' + (lvups ? ' <span class="lvup">升级 ×' + lvups + '！现 Lv' + stats.level + '</span>' : '') + '</div>';
    body += '<div>获得金币：<span class="hl">+' + (r.goldGained || 0) + '</span> 💰（共 ' + (stats.gold || 0) + '）</div>';
    body += '<div>自动用回血药：' + r.potionsUsed + ' 次 · 剩余气血 ' + Math.round(stats.hp) + '</div>';
    if (gained.length) { body += '<div class="drop">拾得装备 ' + gained.length + ' 件（已入武器仓库）：</div>'; gained.forEach(function (d) { body += '<div class="drop" style="color:' + RARITY[d.rarity || "common"].color + '">· 【' + RARITY[d.rarity || "common"].name + '】' + itemNm({ tid: d.id, lv: d.lv }) + '</div>'; }); }
    else body += '<div>本趟无装备掉落</div>';
    var title = r.outcome === "win" ? "历练归来" : "负伤而归";
    if (r.bossKilled && CV.bossZoneIdx != null) {
      var ni = CV.bossZoneIdx + 1; if (ni < ZONES.length && ni > (stats.unlocked || 0)) { stats.unlocked = ni; save(); body = '<div class="lvup">🎉 击败 ' + ZONES[CV.bossZoneIdx].name + ' BOSS！解锁新区域：' + ZONES[ni].name + '</div>' + body; title = "通关 · 解锁新区"; }
      else body = '<div class="lvup">🎉 再次击败 BOSS！</div>' + body;
    } else if (cst.boss && r.outcome === "lose") body = '<div style="color:#ff8a7a">BOSS 未击败，整顿后再来</div>' + body;
    $("cmBody").innerHTML = body; $("cmTitle").textContent = title;
    $("combatModal").classList.remove("hidden");
  }

  // ---- 横版战斗画面（回放 resolveCombat 的 events）----
  var CV = { canvas: null, ctx: null, W: 900, H: 540, ground: 410, running: false, sheets: {}, bg: null, steps: [], si: 0, st: 0, raf: 0 };
  var cst = {}; // 当前画面状态
  function loadSheet(key, src) { // 帧尺寸=图高(方形帧)，帧数=宽/高 → 支持任意分辨率(boss可原生大图,不靠放大)
    var im = new Image(); im.onload = function () { var fw = im.height || 64; CV.sheets[key] = { img: im, fw: fw, frames: Math.max(1, Math.round(im.width / fw)) }; }; im.src = src + "?_=" + Date.now();
  }
  function loadCombatAssets() {
    CV.bg = new Image(); CV.bg.src = "assets/combat/bg_wulin.png?_=" + Date.now();
    ["idle", "advance", "attack", "hurt", "down"].forEach(function (a) { loadSheet("p_" + a, "assets/characters/protagonist_combat/" + a + ".png"); });
    Object.keys(CORE.ENEMIES).forEach(function (id) { ["idle", "attack", "hurt", "death"].forEach(function (a) { loadSheet("e_" + id + "_" + a, "assets/characters/enemies/" + id + "/" + a + ".png"); }); });
    ZONES.forEach(function (z) { var bid = z.boss && z.boss.bossId; if (!bid) return; ["idle", "attack"].forEach(function (a) { loadSheet("eb_" + bid + "_" + a, "assets/characters/bosses/" + bid + "/" + a + ".png"); }); });
  }
  var PX = 150; // 主角屏幕 x
  function startCombat(attrs, opts) {
    opts = opts || {};
    if (!CV.canvas) { CV.canvas = $("combatCanvas"); CV.ctx = CV.canvas.getContext("2d"); CV.canvas.width = CV.W; CV.canvas.height = CV.H; CV.ctx.imageSmoothingEnabled = false; }
    var bc = CORE.buildToCombat(curBuild()); // 单一源：主动技能与 attrs 同源生成
    var cfg = { attrs: attrs, startHp: stats.hp, bagMax: 20, seed: (Date.now() & 0x7fffffff) ^ (Math.random() * 1e9 | 0), abilities: bc.abilities, manaRegen: bc.manaRegen, enchant: bc.enchant, playerRange: bc.playerRange, playerRegen: neiHealRate() + (bc.neiRegenFlat || 0), neiDR: bc.neiDR, neiReflect: bc.neiReflect, neiRegenPct: bc.neiRegenPct, startMana: stats.mana }; // 附魔流debuff+射程;内功:基础回血+凝元固定回血/玄甲减伤/返震/回春%回血;startMana=带蓝出战(睡觉回满)
    if (opts.zone) { cfg.spawnTypes = opts.zone.types; cfg.lvMin = opts.zone.lvMin; cfg.lvMax = opts.zone.lvMax; }
    else cfg.spawnPool = ["thug"];
    var bgKey = (opts.zone && opts.zone.bg) || "bg_wulin";
    CV.bg = new Image(); CV.bg.src = "assets/combat/" + bgKey + ".png?_=" + Date.now();
    cfg.zoneIdx = (opts.zoneIdx != null ? opts.zoneIdx : opts.bossZoneIdx); // 各区掉落稀有度权重
    cfg.eliteChance = homeRank("elite_chance") * 0.03;        // 居家技能:精英怪概率(莱布尼茨终版:满级15%,~16%死不过swingy)
    cfg.dropQuality = homeRank("drop_quality") * 0.2;         // 居家技能:掉落高品率(占位)
    cfg.spawnInterval = 1.8 * Math.max(0.4, 1 - (stats.spawnSpeedOff ? 0 : homeRank("spawn_speed") * 0.05)); // 诱敌:刷怪速度(莱布尼茨减半0.1→0.05;有开关,关则不提速)
    if (opts.boss) { cfg.boss = opts.boss; }                  // boss战:打到死或杀boss
    // 普通历练不封顶杀数/时间——只在 背包满(20)/气血归零/撤退 时收兵(WalyCai 设计)
    CV.bossZoneIdx = opts.boss ? opts.bossZoneIdx : null;
    CV.zoneIdx = opts.zoneIdx != null ? opts.zoneIdx : null;
    CV.bossName = opts.boss ? opts.boss.name : null;
    CV.sim = CORE.createCombat(cfg);
    cst = { floats: [], pT: 0, pAtk: 0, prevKills: 0, prevHp: attrs.HP, etime: {}, boss: !!opts.boss };
    CV.running = true; CV.speed = 1; CV.endTimer = 0;
    $("bossBtn").style.display = (opts.boss || CV.zoneIdx == null) ? "none" : ""; // boss战中或无区域时隐藏挑战键
    $("combatView").classList.remove("hidden");
    CV.last = 0; CV.raf = requestAnimationFrame(cvLoop);
  }
  function addFloat(x, y, text, color) { cst.floats.push({ x: x, y: y, text: text, color: color, t: 0 }); }
  function cvLoop(ts) {
    if (!CV.running) return;
    var dt = Math.min(0.05, (ts - CV.last) / 1000 || 0); CV.last = ts; dt *= (CV.speed || 1);
    cst.pT += dt; if (cst.pAtk > 0) cst.pAtk -= dt;
    if (!CV.endTimer) {
      CV.sim.step(dt);
      var st = CV.sim.state();
      if (st.lastHit) { addFloat(PX + st.lastHit.x, CV.ground - 92, "-" + st.lastHit.dmg, "#ff7a6a"); cst.pAtk = 0.18; cst.atkX = st.lastHit.x; } // atkX=命中目标的横版位置(用于把攻击特效画到目标处,远程可见)
      if (st.lastCast) { if (st.lastCast.type === "aoe") { addFloat(PX + 120, CV.ground - 110, "旋风斩 -" + st.lastCast.dmg, "#ffce6a"); cst.aoeFx = 0.4; } else if (st.lastCast.type === "haste") addFloat(PX, CV.ground - 116, "狂暴!", "#ff8a3a"); }
      if (st.kills > cst.prevKills) cst.prevKills = st.kills;
      if (st.P.hp < cst.prevHp - 0.5) addFloat(PX, CV.ground - 100, "-" + Math.round(cst.prevHp - st.P.hp), "#ffd24a");
      if (st.lastHeal > 0) addFloat(PX - 18, CV.ground - 108, "+" + st.lastHeal, "#7fe0a0"); // 内功自动回血绿字
      cst.prevHp = st.P.hp;
      $("combatInfo").textContent = "已杀 " + st.kills + " · 气血 " + Math.max(0, Math.round(st.P.hp)) + "/" + st.P.hpMax + (st.manaMax ? " · 内力 " + Math.round(st.mana) + "/" + st.manaMax : "") + " · 场上敌 " + st.enemies.length;
      if (CV.sim.isDone()) CV.endTimer = 1.0;
    } else { CV.endTimer -= dt; if (CV.endTimer <= 0) { endCombat(); return; } }
    cst.floats.forEach(function (f) { f.t += dt; f.y -= dt * 30; }); cst.floats = cst.floats.filter(function (f) { return f.t < 1.0; });
    if (cst.aoeFx > 0) cst.aoeFx -= dt;
    renderCombat();
    CV.raf = requestAnimationFrame(cvLoop);
  }
  function drawCSprite(key, x, y, faceLeft, anim, t, scale) {
    var sh = CV.sheets[key], c = CV.ctx, s = scale || 1, fw = sh && sh.fw ? sh.fw : 64, w = fw * s, h = fw * s;
    if (sh) { var fr = Math.floor(t * 8) % sh.frames; c.save(); if (faceLeft) { c.translate(x, 0); c.scale(-1, 1); c.drawImage(sh.img, fr * fw, 0, fw, fw, -w / 2, y - h, w, h); } else { c.drawImage(sh.img, fr * fw, 0, fw, fw, x - w / 2, y - h, w, h); } c.restore(); } // 源用原生帧尺寸fw：boss原生大图即清晰，不再靠放大糊
    else { c.fillStyle = faceLeft ? "#9a4a4a" : "#4a6a9a"; c.fillRect(x - 16 * s, y - 56 * s, 32 * s, 56 * s); }
  }
  function drawAttackEffect(x, y, t) {
    var c = CV.ctx, a = Math.max(0, Math.min(1, t / 0.18));
    c.save();
    c.globalAlpha = Math.sin(a * Math.PI);
    c.translate(x, y);
    c.rotate(-0.18);
    c.strokeStyle = "#f8f0d0"; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 34, -0.75, 0.55); c.stroke();
    c.strokeStyle = "#e6b84a"; c.lineWidth = 2; c.beginPath(); c.arc(2, 1, 24, -0.68, 0.45); c.stroke();
    c.restore();
  }
  function bar(x, y, w, ratio, col) { var c = CV.ctx; c.fillStyle = "#000"; c.fillRect(x, y, w, 6); c.fillStyle = col; c.fillRect(x, y, w * Math.max(0, ratio), 6); }
  function renderCombat() {
    var c = CV.ctx, st = CV.sim.state();
    if (CV.bg && CV.bg.complete && CV.bg.naturalWidth) { var bw = CV.bg.naturalWidth * (CV.H / CV.bg.naturalHeight); for (var bx = 0; bx < CV.W; bx += bw) c.drawImage(CV.bg, bx, 0, bw, CV.H); }
    else { var g = c.createLinearGradient(0, 0, 0, CV.H); g.addColorStop(0, "#3a4a5a"); g.addColorStop(1, "#6a5a3a"); c.fillStyle = g; c.fillRect(0, 0, CV.W, CV.H); c.fillStyle = "#4a3a26"; c.fillRect(0, CV.ground, CV.W, CV.H - CV.ground); }
    // 敌人（远→近排序，近的后画压前）
    st.enemies.slice().sort(function (a, b) { return b.x - a.x; }).forEach(function (e) {
      var ex = PX + e.x; if (ex > CV.W + 80) return;
      cst.etime[e.uid] = (cst.etime[e.uid] || 0) + 0.016;
      var anm = (e.at > 0 ? "attack" : "idle");
      var bkey = e.isBoss && e.bossId && CV.sheets["eb_" + e.bossId + "_" + anm] ? ("eb_" + e.bossId + "_" + anm) : ("e_" + e.id + "_" + anm);
      var sh = CV.sheets[bkey], srcScale = sh && sh.fw > 64 ? 1 : (e.isBoss ? 2.0 : 1); if (e.elite) srcScale *= 1.4; // 精英体型略大
      var uiScale = ((sh && sh.fw) || 64) * srcScale / 64;
      drawCSprite(bkey, ex, CV.ground, true, "", cst.etime[e.uid] + e.uid * 0.3, srcScale);
      bar(ex - 22 * uiScale, CV.ground - 72 * uiScale, 44 * uiScale, e.hp / e.hpMax, e.elite ? "#d98a3a" : "#bf5f5f");
      if (e.deb) { var dbs = ""; if (e.deb.burnT > 0) dbs += "🔥"; if (e.deb.chillT > 0) dbs += "❄"; if (e.deb.poiT > 0) dbs += "☠" + (e.deb.poiStacks > 1 ? "×" + e.deb.poiStacks : ""); if (dbs) { c.font = "13px sans-serif"; c.textAlign = "center"; c.fillText(dbs, ex, CV.ground - 72 * uiScale - 8); } } // 附魔流 debuff:灼烧/冰冻/中毒(带层数)
      if (e.elite && !e.isBoss) { c.fillStyle = "#ffba5a"; c.font = "bold 12px sans-serif"; c.textAlign = "center"; c.fillText("✦ 精英", ex, CV.ground - 72 * uiScale - 8 - (e.deb ? 14 : 0)); } // 精英标记
      if (e.isBoss && CV.bossName) { c.fillStyle = "#ffce6a"; c.font = "bold 14px sans-serif"; c.textAlign = "center"; c.fillText("☠ " + CV.bossName, ex, CV.ground - 72 * uiScale - 24); }
    });
    // 主角
    var pAnim = (CV.sim.isDone() && st.P.hp <= 0) ? "down" : (cst.pAtk > 0 ? "attack" : "idle");
    drawCSprite("p_" + pAnim, PX, CV.ground, false, "", cst.pT);
    if (cst.pAtk > 0) {
      var axR = cst.atkX || 56;                         // 命中目标横版位置(melee≈70,更远=有射程)
      if (axR > 90) {                                    // 远程命中:画一道气劲从主角伸向目标 + 命中处刀光,让"射程"可见
        c.save(); c.globalAlpha = 0.55 * Math.sin(Math.max(0, Math.min(1, cst.pAtk / 0.18)) * Math.PI);
        c.strokeStyle = "#cfe6ff"; c.lineWidth = 3; c.beginPath(); c.moveTo(PX + 30, CV.ground - 40); c.lineTo(PX + axR - 14, CV.ground - 44); c.stroke();
        c.restore();
        drawAttackEffect(PX + axR - 8, CV.ground - 44, cst.pAtk);
      } else drawAttackEffect(PX + 56, CV.ground - 44, cst.pAtk);
    }
    if (st.haste > 0) { c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(cst.pT * 20); c.strokeStyle = "#ff8a3a"; c.lineWidth = 3; c.beginPath(); c.arc(PX, CV.ground - 32, 40, 0, 6.28); c.stroke(); c.restore(); } // 狂暴光环
    if (cst.aoeFx > 0) { c.save(); var rr = (0.4 - cst.aoeFx) / 0.4; c.globalAlpha = cst.aoeFx / 0.4 * 0.6; c.strokeStyle = "#ffe6a8"; c.lineWidth = 5; c.beginPath(); c.arc(PX, CV.ground - 30, 40 + rr * 240, 0, 6.28); c.stroke(); c.restore(); } // 旋风斩扩散环
    bar(PX - 30, CV.ground - 88, 60, st.P.hp / st.P.hpMax, "#5fbf5f");
    if (st.manaMax > 0) bar(PX - 30, CV.ground - 80, 60, st.mana / st.manaMax, "#5a9fe0"); // 蓝量条
    // 飘字
    c.font = "bold 16px sans-serif"; c.textAlign = "center";
    cst.floats.forEach(function (f) { c.globalAlpha = Math.max(0, 1 - f.t); c.fillStyle = f.color; c.fillText(f.text, f.x, f.y); c.globalAlpha = 1; });
  }
  function endCombat() {
    CV.running = false; if (CV.raf) cancelAnimationFrame(CV.raf);
    $("combatView").classList.add("hidden");
    backToWander(); // 历练归来→回到自由溜达(满包回家闲置)，避免卡在打坐/睡觉状态导致人物隐身或无法再操作
    applyCombatResult(CV.sim.result());
  }

  // ---- 循环 ----
  var last = 0;
  var gfRefreshT = 0, homeClock = 0;
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; homeClock += dt;
    if (player.state === "meditating") { // 打坐:逐帧练所选功法熟练度(平滑进度条)
      var dd = byId[(placed.find(function (q) { return q.uid === player.actUid; }) || {}).id] || {};
      if (dd.neigong) trainGongfa(dd.neigong * (1 + homeRank("meditate_eff") * 0.2) * 5 * dt);
    }
    if (!$("kungfuModal").classList.contains("hidden")) { gfRefreshT += dt; if (gfRefreshT >= 0.12) { gfRefreshT = 0; renderKungfu(); } } // 功法页打开时进度条动态刷新
    updatePlayer(dt); render(); requestAnimationFrame(loop);
  }

  // ---- 调试工具（WalyCai 手动测试用：快速到 Lv50 试技能树/功法/经济）----
  function dbgAddLevel(n) { var sp0 = spForLevel(stats.level); for (var i = 0; i < n && stats.level < 50; i++) { stats.level++; } stats.sp = (stats.sp || 0) + (spForLevel(stats.level) - sp0); stats.exp = 0; syncHpMax(); save(); updateStats(); toast("等级 → Lv" + stats.level + "（技能点 " + (stats.sp || 0) + "）"); }
  function dbgGold(n) { stats.gold = (stats.gold || 0) + n; save(); updateStats(); toast("金币 +" + n); }
  function dbgGongfaMax() { var id = stats.trainId; if (!id) return; stats.gongfa[id] = { lv: 10, prof: 0 }; syncHpMax(); save(); toast("「" + (gongfaById(id) ? gongfaById(id).name : id) + "」直接练满 Lv10"); if (!$("kungfuModal").classList.contains("hidden")) renderKungfu(); }
  function dbgUnlockZones() { stats.unlocked = ZONES.length - 1; save(); toast("已解锁全部历练区"); }
  function dbgGear() { var rs = ["common", "fine", "superior", "epic", "legend"]; for (var i = 0; i < 5; i++) { var pool = CORE.DROP.equipPool, tid = pool[Math.floor(Math.random() * pool.length)]; warehouse.push(rollItem(tid, Math.max(1, stats.level), rs[Math.floor(Math.random() * rs.length)])); } saveEquip(); toast("仓库 +5 随机装备"); if (!$("dollModal").classList.contains("hidden")) renderDoll(); }

  function init() {
    canvas = $("canvas"); ctx = canvas.getContext("2d"); resize();
    resetOcc(); initBag(); loadAssets();
    if (!load()) { addPlaced(byId.meditation_dais, Math.floor(GW / 2) - 6, 6, 0, false); bag.meditation_dais--; }
    renderCats(); renderItems(); updateStats(); bindInput();
    $("saveBtn").onclick = openSaveSlots;
    $("saveClose").onclick = function () { $("saveModal").classList.add("hidden"); };
    $("saveModal").addEventListener("click", function (e) { if (e.target === $("saveModal")) $("saveModal").classList.add("hidden"); });
    $("dbgBtn").onclick = function () { $("dbgModal").classList.remove("hidden"); };
    $("dbgClose").onclick = function () { $("dbgModal").classList.add("hidden"); };
    $("dbgModal").addEventListener("click", function (e) { if (e.target === $("dbgModal")) $("dbgModal").classList.add("hidden"); });
    $("dbgLv5").onclick = function () { dbgAddLevel(5); };
    $("dbgLv50").onclick = function () { dbgAddLevel(50); };
    $("dbgGold").onclick = function () { dbgGold(50000); };
    $("dbgGf").onclick = dbgGongfaMax;
    $("dbgZone").onclick = dbgUnlockZones;
    $("dbgGearBtn").onclick = dbgGear;
    $("dbgHurtBtn").onclick = function () { stats.hp = Math.max(0, stats.hp - 30); updateStats(); toast("受伤 -30 气血"); };
    $("resetBtn").onclick = function () { if (confirm("清空房间与存档？")) { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + "_eq"); location.reload(); } };
    $("recallAll").onclick = function () { moveMode = null; placed.slice().forEach(function (p) { if (!byId[p.id].fixed) { freeCells(p); bag[p.id]++; } }); placed = placed.filter(function (p) { return byId[p.id].fixed; }); backToWander(); deselect(); renderItems(); save(); toast("已收回全部可移动物品"); };
    $("selMove").onclick = function () { if (selectedPlaced) enterMove(selectedPlaced); };
    $("selRotate").onclick = function () { if (selectedPlaced) rotatePlaced(selectedPlaced); };
    $("selRecall").onclick = function () { if (selectedPlaced) removePlaced(selectedPlaced); };
    $("dollBtn").onclick = openDoll;
    $("mapClose").onclick = function () { $("mapModal").classList.add("hidden"); };
    $("mapModal").addEventListener("click", function (e) { if (e.target === $("mapModal")) $("mapModal").classList.add("hidden"); });
    $("retreatBtn").onclick = function () { if (CV.running) endCombat(); }; // 撤退:收兵保留战利品
    $("bossBtn").onclick = bossChallenge; // 战斗页挑战当前区BOSS
    $("helpBtn").onclick = function () { $("helpModal").classList.remove("hidden"); };
    $("helpClose").onclick = function () { $("helpModal").classList.add("hidden"); };
    $("helpModal").addEventListener("click", function (e) { if (e.target === $("helpModal")) $("helpModal").classList.add("hidden"); });
    $("dollClose").onclick = function () { $("dollModal").classList.add("hidden"); hideItemTip(); };
    if ($("sellAllBtn")) $("sellAllBtn").onclick = sellAll;
    if ($("sellLockChk")) $("sellLockChk").onchange = function () { stats.sellLock = this.checked; save(); };
    loadCombatAssets();
    $("sortieBtn").onclick = openMap; // 出战历练=打开选区地图
    $("meditateBtn").onclick = function () { var p = placed.find(function (q) { return byId[q.id].func === "meditate"; }); if (p) goAction(p, "meditating"); else toast("请先在房间摆一个打坐台"); };
    $("sleepBtn").onclick = function () { var p = placed.find(function (q) { return byId[q.id].func === "bed"; }); if (p) goAction(p, "sleeping"); else toast("请先在房间摆一张床"); };
    $("cmClose").onclick = function () { $("combatModal").classList.add("hidden"); };
    $("combatModal").addEventListener("click", function (e) { if (e.target === $("combatModal")) $("combatModal").classList.add("hidden"); });
    $("dollModal").addEventListener("click", function (e) { if (e.target === $("dollModal")) $("dollModal").classList.add("hidden"); });
    // 居家左侧菜单 + 技能面板
    $("menuSkill").onclick = openSkill;
    $("menuHomeSkill").onclick = openHomeSkill;
    $("menuKungfu").onclick = openKungfu;
    $("kfClose").onclick = function () { $("kungfuModal").classList.add("hidden"); };
    $("gfShopBtn").onclick = openGfShop;
    $("gfsClose").onclick = function () { $("gfShopModal").classList.add("hidden"); };
    $("gfShopModal").addEventListener("click", function (e) { if (e.target === $("gfShopModal")) $("gfShopModal").classList.add("hidden"); });
    $("kungfuModal").addEventListener("click", function (e) { if (e.target === $("kungfuModal")) $("kungfuModal").classList.add("hidden"); });
    $("skClose").onclick = function () { $("skillModal").classList.add("hidden"); };
    $("skReset").onclick = resetSkills;
    $("skillModal").addEventListener("click", function (e) { if (e.target === $("skillModal")) $("skillModal").classList.add("hidden"); });
    $("hsClose").onclick = function () { $("homeSkillModal").classList.add("hidden"); };
    $("homeSkillModal").addEventListener("click", function (e) { if (e.target === $("homeSkillModal")) $("homeSkillModal").classList.add("hidden"); });
    var sz = $("sellZone");
    if (sz) { sz.addEventListener("dragover", function (e) { e.preventDefault(); sz.classList.add("over"); }); sz.addEventListener("dragleave", function () { sz.classList.remove("over"); }); sz.addEventListener("drop", function (e) { e.preventDefault(); sz.classList.remove("over"); if (dollSel) sellItem(dollSel.uid); }); sz.onclick = function () { if (dollSel) sellItem(dollSel.uid); else toast("先选中仓库里的装备"); }; }
    if (!loadEquip()) { ["weapon", "head", "body", "legs", "neck", "ring", "belt"].forEach(function (tid) { warehouse.push(rollItem(tid, 1, "common")); }); saveEquip(); } // 新手赠每部位1件lv1白装
    APPEAR_SLOTS.forEach(function (slot) { if (equipped[slot]) loadEquipOverlay(equipped[slot].tid); }); // 加载已穿装备外观层
    if (stats.zone == null) stats.zone = 0; if (stats.unlocked == null) stats.unlocked = 0; // 历练地图进度默认
    if (!stats.skills) stats.skills = {}; // 技能点迁移：补发应得点数(level-1)，幂等
    validateSkills(); // 树改版：清理旧无效技能id，点数退回
    var owed = spForLevel(stats.level) - ((stats.sp || 0) + skillSpent()); if (owed > 0) stats.sp = (stats.sp || 0) + owed; // 技能点预算=floor(level/3),只补不扣
    // 功法迁移/初始化：白色功法默认已习得 Lv1
    if (!stats.gongfa) stats.gongfa = {}; if (!stats.gongfaEquip) stats.gongfaEquip = { nei: null, wai1: null, wai2: null, qing: null };
    for (var ogid in stats.gongfa) if (!gongfaById(ogid)) delete stats.gongfa[ogid]; // 功法×6改造:清理旧存档已废弃功法id(WalyCai:旧存档可删)
    ["nei", "wai1", "wai2", "qing"].forEach(function (k) { if (stats.gongfaEquip[k] && !gongfaById(stats.gongfaEquip[k])) stats.gongfaEquip[k] = null; });
    GONGFA.forEach(function (g) { if (g.tier === 0 && !stats.gongfa[g.id]) stats.gongfa[g.id] = { lv: 1, prof: 0 }; }); // 白功法新手免费送(每系6本白功法)
    if (!stats.trainId || !gongfaById(stats.trainId)) stats.trainId = "xuanjia_t0";
    syncHpMax();
    window.addEventListener("resize", function () { resize(); });
    (function () { // 自动历练浮钮:短按=开关,长按(350ms)=拖拽移动位置,位置存档
      var el = $("autoFloat"), holdT = null, dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
      function place(x, y) { el.style.left = Math.max(0, Math.min((window.innerWidth || 1200) - el.offsetWidth, x)) + "px"; el.style.top = Math.max(0, Math.min((window.innerHeight || 800) - el.offsetHeight, y)) + "px"; el.style.right = "auto"; }
      if (stats.autoFloatPos) place(stats.autoFloatPos.x, stats.autoFloatPos.y);
      el.addEventListener("pointerdown", function (e) { e.preventDefault(); moved = false; sx = e.clientX; sy = e.clientY; var r = el.getBoundingClientRect(); ox = r.left; oy = r.top; holdT = setTimeout(function () { dragging = true; el.classList.add("dragging"); try { el.setPointerCapture(e.pointerId); } catch (_) {} }, 350); });
      el.addEventListener("pointermove", function (e) { if (!dragging) return; moved = true; place(ox + (e.clientX - sx), oy + (e.clientY - sy)); });
      el.addEventListener("pointerup", function () { clearTimeout(holdT); if (dragging) { dragging = false; el.classList.remove("dragging"); if (moved) { stats.autoFloatPos = { x: parseInt(el.style.left) || 0, y: parseInt(el.style.top) || 0 }; save(); } } else { toggleAuto("auto_sortie"); toast((stats.autoOn && stats.autoOn.auto_sortie) ? "自动历练已开启" : "自动历练已停止"); } });
    })();
    updateAutoFloat();
    setInterval(tickStats, 1000); setInterval(wanderTick, 2200);
    requestAnimationFrame(loop);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
