// ============================================================
// 桌面武林 · 室内家园 等距(2.5D)摆放原型 v0.3（canvas 渲染）
// 2:1 等距菱形地格；painter's 深度排序保证遮挡；两面墙放壁挂(分高低)。
// 功能件：床(普通/高级,回血+解负面)、打坐台(固定,涨内功)。
// 主角：随机溜达；点床→走过去睡觉；点打坐台→走过去打坐；其他不可点。
// 美术：占位等距块；真图按等距透视放 assets/ 后替换。
// ============================================================
(function () {
  "use strict";
  var HW = 12, HH = 6;          // 小格菱形半宽/半高 (2:1)
  var GW = 66, GH = 48;         // 地板小格
  var WALL_ROWS = 16, ROW_PX = 11; // 墙高 16 小格档，每档像素
  var WALL_PX = WALL_ROWS * ROW_PX;
  var MARGIN = 40, HEAD = 120, YARD = 16; // 边距 / 家具顶部留白 / 院景边界格数
  var PLAYER_CELLS = 4;
  var OX = MARGIN + (GH + YARD) * HW;
  var OY = MARGIN + WALL_PX + HEAD;
  var SAVE_KEY = "wulin_iso_v1";

  // 物品目录（占格 w×h，画面高度另给 zh；fixed 不可拖；func 功能件）
  var CATALOG = [
    { id: "bed_basic", name: "普通床", cat: "bed", w: 10, h: 18, zh: 24, func: "bed", heal: 1.2, cure: 0.4, glyph: "🛏", color: "#8a6240" },
    { id: "bed_advanced", name: "高级床", cat: "bed", w: 12, h: 22, zh: 32, func: "bed", heal: 3.5, cure: 1.4, glyph: "🛏", color: "#a8743e" },
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
    { id: "sell_price", name: "精算", max: 5, desc: "装备售价 +12% / 级" }
  ];
  // ---- 功法系统：内功/外功/轻功 三体系，被动(修炼即有)+主动(需装备 1内2外1轻)；打坐练熟练度1-10 ----
  var GONGFA_MAXLV = 10;
  var GONGFA_SLOTS = [{ key: "nei", sys: "nei", name: "内功" }, { key: "wai1", sys: "wai", name: "外功一" }, { key: "wai2", sys: "wai", name: "外功二" }, { key: "qing", sys: "qing", name: "轻功" }];
  var GONGFA = [
    { id: "nei_tuna", name: "基础吐纳功", sys: "nei", tier: "白", passive: { HP: 7, Mana: 5 }, active: { HP: 11, DEF: 2 }, desc: "内功·增气血与内力上限" }, // 莱布尼茨均衡v1
    { id: "wai_quan", name: "基础拳经", sys: "wai", tier: "白", passive: { ATK: 1 }, active: { ATK: 2, Crit: 1, CritDmg: 3 }, desc: "外功·增攻防暴击" },
    { id: "qing_shen", name: "基础身法", sys: "qing", tier: "白", passive: { ATKspd: 2, Hit: 1 }, active: { ATKspd: 3, Crit: 2, Dodge: 1 }, desc: "轻功·增攻速命中闪避" }
  ];
  function gongfaById(id) { for (var i = 0; i < GONGFA.length; i++) if (GONGFA[i].id === id) return GONGFA[i]; return null; }
  function gfState(id) { return (stats.gongfa && stats.gongfa[id]) || { lv: 0, prof: 0 }; }
  function gfProfReq(lv) { return lv * 120; } // lv→lv+1 所需熟练度(占位,待莱布尼茨)
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
  var PLAYER_SCALE = 1.6;               // 房屋内主角放大
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
    if (byId[p.id].cat !== "table") return false; // 只能叠在桌子上
    return cx >= p.cx && cy >= p.cy && cx + fw <= p.cx + p.w && cy + fh <= p.cy + p.h; // 必须整体在桌面内
  }
  function canPlaceFloor(cx, cy, fw, fh, ignoreUid, isDecor) {
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
  }
  function drawFloor() {
    var c = quad(0, 0, GW, GH);
    poly(c); ctx.fillStyle = "#b89c6e"; ctx.fill();
    if (env.floorLarge) {
      poly(c); ctx.save(); ctx.clip();
      for (var tx = 0; tx < GW; tx += 4) for (var ty = 0; ty < GH; ty += 4) {
        var center = v(tx + 2, ty + 2);
        ctx.drawImage(env.floorLarge, center.x - 48, center.y - 24, 96, 48);
      }
      ctx.restore();
    }
    // 大格网格线(每4小格)
    ctx.strokeStyle = "rgba(90,60,30,.25)"; ctx.lineWidth = 1;
    for (var i = 0; i <= GW; i += 4) { var a = v(i, 0), b = v(i, GH); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (var j = 0; j <= GH; j += 4) { var a2 = v(0, j), b2 = v(GW, j); ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.stroke(); }
    poly(c); ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 2; ctx.stroke();
  }
  function drawWalls() {
    // 右墙 (沿 cy=0, cx 0..GW)
    var a = v(0, 0), b = v(GW, 0);
    poly([{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: b.y - WALL_PX }, { x: a.x, y: a.y - WALL_PX }]);
    ctx.fillStyle = "#9a7f5e"; ctx.fill();
    if (env.wallRight) {
      ctx.save(); ctx.clip();
      var patR = ctx.createPattern(env.wallRight, "repeat");
      if (patR) { ctx.fillStyle = patR; ctx.fillRect(a.x, a.y - WALL_PX, b.x - a.x, WALL_PX); }
      ctx.restore();
    }
    ctx.strokeStyle = "#6a4a2a"; ctx.stroke();
    // 左墙 (沿 cx=0, cy 0..GH)
    var d = v(0, GH);
    poly([{ x: a.x, y: a.y }, { x: d.x, y: d.y }, { x: d.x, y: d.y - WALL_PX }, { x: a.x, y: a.y - WALL_PX }]);
    ctx.fillStyle = "#876e50"; ctx.fill();
    if (env.wallLeft) {
      ctx.save(); ctx.clip();
      var minX = Math.min(a.x, d.x), maxX = Math.max(a.x, d.x);
      var patL = ctx.createPattern(env.wallLeft, "repeat");
      if (patL) { ctx.fillStyle = patL; ctx.fillRect(minX, a.y - WALL_PX, maxX - minX, WALL_PX); }
      ctx.restore();
    }
    ctx.strokeStyle = "#6a4a2a"; ctx.stroke();
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
    var top = quad(p.cx, p.cy, p.w, p.h); // 顶面四角(底部)
    var zh = c.zh || 12;
    if (img && !ghost) {
      // 真图正确对齐：水平=footprint菱形中心；底边=下顶点(最靠前/最低)的y；宽=菱形宽(w+h)*HW，高按比例
      var ctrX = v(p.cx + p.w / 2, p.cy + p.h / 2).x;  // 菱形水平中心(非下顶点x，避免长方形footprint偏移)
      var botY = v(p.cx + p.w, p.cy + p.h).y;          // 下顶点y
      var iw = (p.w + p.h) * HW, ih = img.height * (iw / img.width);
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
    var dw = SPR.fw * PLAYER_SCALE, dh = SPR.fh * PLAYER_SCALE;
    var row = SPR.dirs[player.anim] === 1 ? 0 : (SPR.dirRow[player.dir] || 0);
    var sx = player.fi * SPR.fw, sy = row * SPR.fh, dx = ctr.x - dw / 2, dy = ctr.y - dh;
    if (base) {
      ctx.drawImage(base, sx, sy, SPR.fw, SPR.fh, dx, dy, dw, dh);
      APPEAR_SLOTS.forEach(function (slot) {   // 叠装备外观层
        var it = equipped[slot]; if (!it) return;
        var ov = equipSprites[it.tid] && equipSprites[it.tid][player.anim];
        if (ov) ctx.drawImage(ov, sx, sy, SPR.fw, SPR.fh, dx, dy, dw, dh);
      });
    } else {
      ctx.font = "30px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(player.state === "sleeping" ? "😴" : player.state === "meditating" ? "🧘" : "🧍", ctr.x, ctr.y - 8);
    }
  }
  function drawCourtyard() {
    ctx.fillStyle = "#1c2a16"; ctx.fillRect(0, 0, CW, CH);
    var c = quad(-4, -4, GW + 8, GH + 8);
    poly(c); ctx.fillStyle = "#4f7a40"; ctx.fill();
    if (env.courtyard) {
      ctx.save(); ctx.clip();
      var pat = ctx.createPattern(env.courtyard, "repeat");
      if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, CW, CH); }
      ctx.restore();
    }
    ctx.strokeStyle = "#36592f"; ctx.lineWidth = 3; ctx.stroke();
    if (env.courtyard) return;
    // 院景点缀（占位，真图待美术）
    ctx.font = "20px sans-serif"; ctx.textAlign = "center";
    var deco = ["🌳", "🌲", "🌸", "🪨", "🌿", "🌷"];
    for (var i = 0; i < GW + 8; i += 6) { var t = v(i - 4, -4); ctx.fillText(deco[(i / 6) % deco.length], t.x, t.y - 2); var bsp = v(i - 4, GH + 4); ctx.fillText(deco[(i / 6 + 2) % deco.length], bsp.x, bsp.y + 6); }
    for (var j = 0; j < GH + 8; j += 6) { var l = v(-4, j - 4); ctx.fillText(deco[(j / 6) % deco.length], l.x, l.y); var r = v(GW + 4, j - 4); ctx.fillText(deco[(j / 6 + 3) % deco.length], r.x, r.y); }
  }
  function render() {
    ctx.clearRect(0, 0, CW, CH);
    drawCourtyard(); drawFloor(); drawWalls();
    // 地毯：地面平铺，画在家具/主角之下(floor 之上)
    placed.filter(function (p) { return p.rug; }).forEach(function (p) { drawFurniture(p); });
    // 壁挂(在墙上，靠后)
    placed.filter(function (p) { return p.wall; }).forEach(drawWallHang);
    // 地面可绘制(家具+主角) 深度排序：anchor 深度 = cx+cy+w/2+h/2(取前角)
    var drawables = placed.filter(function (p) { return !p.wall && !p.rug; }).map(function (p) { return { p: p, depth: (p.cx + p.w) + (p.cy + p.h), kind: "f" }; });
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
    if (mouse.cx < 0) return;
    var fp2 = footprint(c, ghostRot);
    var ok = canPlaceFloor(mouse.cx, mouse.cy, fp2.w, fp2.h, null, c.cat === "decor");
    drawFurniture({ id: c.id, cx: mouse.cx, cy: mouse.cy, w: fp2.w, h: fp2.h }, ok ? "ok" : "bad");
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
    if (player.state === "sleeping") { var b = byId[(placed.find(function (q) { return q.uid === player.actUid; }) || {}).id] || {}; var hm = 1 + homeRank("sleep_eff") * 0.2; if (stats.hp < stats.hpMax) stats.hp = Math.min(stats.hpMax, stats.hp + (b.heal || 0) * hm); if (Math.random() < (b.cure || 0)) { if (stats.poison) stats.poison = false; else if (stats.weak) stats.weak = false; } }
    else if (player.state === "meditating") { var d = byId[(placed.find(function (q) { return q.uid === player.actUid; }) || {}).id] || {}; var mm = 1 + homeRank("meditate_eff") * 0.2; trainGongfa((d.neigong || 0) * mm * 5); var lv = false; stats.ngP += (d.neigong || 0) * mm; while (stats.ngP >= NG_PER_LV) { stats.ngP -= NG_PER_LV; stats.ng++; lv = true; toast("内功提升到 " + stats.ng + " 级！"); } if (lv) syncHpMax(); } // 打坐:练所选功法熟练度(×5)+旧内功ng
    updateStats(); save();
  }
  function updateStats() {
    $("hpVal").textContent = Math.round(stats.hp); $("hpMax").textContent = stats.hpMax; $("neigong").textContent = stats.ng;
    var bar = $("ngBar"); if (!bar.firstChild) bar.innerHTML = "<i></i>"; bar.firstChild.style.width = Math.round(stats.ngP / NG_PER_LV * 100) + "%";
    var s = []; if (stats.poison) s.push("中毒"); if (stats.weak) s.push("虚弱");
    $("statusVal").textContent = s.length ? s.join("、") : "正常"; $("statusVal").style.color = s.length ? "#ff8a7a" : "#9fe0a0";
    if ($("lvVal")) { $("lvVal").textContent = stats.level; $("expTxt").textContent = "(" + stats.exp + "/" + CORE.nextExp(stats.level) + ")"; }
    if ($("manaVal")) { $("manaVal").textContent = Math.round(stats.mana || 0); $("manaMax").textContent = stats.manaMax || 0; }
    if ($("goldVal")) $("goldVal").textContent = stats.gold || 0;
    var spDot = $("spDot"); if (spDot) spDot.style.display = (stats.sp || 0) > 0 ? "" : "none";
    if ($("menuSp")) { $("menuSp").textContent = stats.sp || 0; $("menuSp").style.display = (stats.sp || 0) > 0 ? "" : "none"; }
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
      d.onclick = function () { if ((bag[c.id] || 0) <= 0) { toast(own > 0 ? "已全摆出，再买可加环境/多摆" : ("先购买「" + c.name + "」(" + c.price + "💰)")); return; } selId = (selId === c.id ? null : c.id); ghostRot = 0; renderItems(); };
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
    else { if (mouse.cx < 0) return; var fp = footprint(c, ghostRot); if (!canPlaceFloor(mouse.cx, mouse.cy, fp.w, fp.h, null, c.cat === "decor")) { toast("这里放不下"); return; } addPlaced(c, mouse.cx, mouse.cy, ghostRot, false); }
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
  var CORE = window.WULIN_CORE;
  var RARITY = CORE.RARITY, EQUIP_TPL = CORE.EQUIP_TPL, AFFIX_POOL = CORE.AFFIX_POOL;
  var SLOT_DEFS = [{ key: "head", name: "头", type: "head" }, { key: "neck", name: "项链", type: "neck" }, { key: "body", name: "衣服", type: "body" }, { key: "legs", name: "下身", type: "legs" }, { key: "weapon", name: "手部武器", type: "weapon" }, { key: "ring1", name: "戒指1", type: "ring" }, { key: "ring2", name: "戒指2", type: "ring" }, { key: "belt", name: "腰带", type: "belt" }];
  var STAT_LABEL = { HP: "气血", ATK: "攻击", DEF: "防御", Crit: "暴击率%", CritDmg: "暴击伤害%", Hit: "命中", Dodge: "闪避", ATKspd: "攻速" };
  var equipped = { head: null, neck: null, body: null, legs: null, weapon: null, ring1: null, ring2: null, belt: null };
  var warehouse = [], equipSeq = 1, dollSel = null;

  function rollItem(tid) {
    var t = EQUIP_TPL[tid]; if (!t) return null;
    var n = RARITY[t.rarity].affixes, pool = AFFIX_POOL.slice(), affixes = [];
    for (var i = 0; i < n && pool.length; i++) { var k = Math.floor(Math.random() * pool.length), a = pool.splice(k, 1)[0]; affixes.push({ s: a.s, v: a.a + Math.floor(Math.random() * (a.b - a.a + 1)) }); }
    return { uid: equipSeq++, tid: tid, affixes: affixes };
  }
  function itemStats(it) { var t = EQUIP_TPL[it.tid], s = {}; for (var k in t.base) s[k] = (s[k] || 0) + t.base[k]; it.affixes.forEach(function (a) { s[a.s] = (s[a.s] || 0) + a.v; }); return s; }
  function baseAttrs() { return CORE.baseAttrs(stats.level, stats.ng); }
  // ---- 人物技能树：力量战士（草案数值，待莱布尼茨平衡）----
  // ---- 人物技能树：力量战士（树状·串联+级别+投点 门槛；Salt & Sanctuary / Titan Quest 风）----
  // 5列×5行；prereq=前置(需≥1级) reqPts=树内已投点门槛 reqLv=人物等级门槛
  var SKILL_TREE = {
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
  };
  function skillNodeById(id) { for (var i = 0; i < SKILL_TREE.nodes.length; i++) if (SKILL_TREE.nodes[i].id === id) return SKILL_TREE.nodes[i]; return null; }
  function skillRank(id) { return (stats.skills && stats.skills[id]) || 0; }
  function skillSpent() { var s = 0, sk = stats.skills || {}; for (var k in sk) s += sk[k]; return s; }
  function nodeLockReason(n) { // 可投点返回 null，否则返回未解锁原因
    if (stats.level < n.reqLv) return "需等级 Lv" + n.reqLv;
    if (skillSpent() < n.reqPts) return "需树内已投 " + n.reqPts + " 点";
    for (var i = 0; i < n.prereq.length; i++) if (skillRank(n.prereq[i]) < 1) { var pn = skillNodeById(n.prereq[i]); return "需先学「" + (pn ? pn.name : n.prereq[i]) + "」"; }
    return null;
  }
  function refundBlocked(id) { // 退到0会断链则禁止：存在已学节点把它当前置
    for (var i = 0; i < SKILL_TREE.nodes.length; i++) { var m = SKILL_TREE.nodes[i]; if (skillRank(m.id) > 0 && m.prereq.indexOf(id) >= 0) return m; }
    return null;
  }
  function validateSkills() { // 树改版迁移：清理无效/超额技能，点数退回 sp
    var sk = stats.skills || {}, refunded = 0;
    for (var id in sk) { var n = skillNodeById(id); if (!n) { refunded += sk[id]; delete sk[id]; } else if (sk[id] > n.max) { refunded += sk[id] - n.max; sk[id] = n.max; } }
    if (refunded) stats.sp = (stats.sp || 0) + refunded;
  }
  function totalAttrs() {
    var a = baseAttrs();
    var sk = stats.skills || {};
    // 装备求和（装备百分比技能先作用于装备部分）
    var eq = {};
    SLOT_DEFS.forEach(function (sd) { var it = equipped[sd.key]; if (it) { var s = itemStats(it); for (var k in s) eq[k] = (eq[k] || 0) + s[k]; } });
    if (eq.ATK) eq.ATK *= 1 + (sk.equip_atk || 0) * 0.05;
    if (eq.HP) eq.HP *= 1 + (sk.equip_hp || 0) * 0.05;
    for (var k in eq) a[k] = (a[k] || 0) + eq[k];
    // 技能：基础三维 flat（根基 + 三维节点）
    a.HP += (sk.foundation || 0) * 15 + (sk.str_hp || 0) * 30;
    a.ATK += (sk.foundation || 0) * 2 + (sk.str_atk || 0) * 4;
    a.DEF += (sk.str_def || 0) * 3;
    a.Crit += (sk.crit || 0) * 2; a.CritDmg += (sk.critdmg || 0) * 10;
    a.Hit += (sk.hit || 0) * 3; a.ATKspd += (sk.atkspd || 0) * 3;
    // 技能：总攻击%（重兵精通）；旋风斩/狂暴是战斗主动技(Phase4)，不再折算被动
    a.ATK *= 1 + (sk.weapon_mastery || 0) * 0.03;
    // 功法：被动(已修炼即生效)×等级 + 主动(已装备)×等级
    var gf = stats.gongfa || {};
    for (var gid in gf) { var gobj = gongfaById(gid), lv = gf[gid].lv || 0; if (!gobj || lv <= 0) continue; for (var pk in gobj.passive) a[pk] = (a[pk] || 0) + gobj.passive[pk] * lv; }
    GONGFA_SLOTS.forEach(function (sl) { var eid = stats.gongfaEquip && stats.gongfaEquip[sl.key]; if (!eid) return; var go = gongfaById(eid), lv = gfState(eid).lv || 0; if (!go || lv <= 0) return; for (var ak in go.active) a[ak] = (a[ak] || 0) + go.active[ak] * lv; });
    a.ATK = Math.round(a.ATK); a.HP = Math.round(a.HP); a.DEF = Math.round(a.DEF); a.ATKspd = Math.round(a.ATKspd); a.Mana = Math.round(a.Mana);
    return a;
  }
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
  function renderSkill() {
    $("skInfo").innerHTML = "等级 Lv" + stats.level + " · 可用技能点 <b>" + (stats.sp || 0) + "</b> · 已投入 " + skillSpent() + "/" + SKILL_TREE.totalPts + " · 串联+级别+投点解锁";
    var w = $("skTree"); var width = SK_COLS * SK_CW, height = SK_ROWS * SK_CH;
    w.style.position = "relative"; w.style.width = width + "px"; w.style.height = height + "px";
    function cx(col) { return SK_PAD + col * SK_CW + (SK_CW - SK_PAD * 2) / 2; }
    function cy(row) { return SK_PAD + row * SK_CH + (SK_CH - SK_PAD * 2) / 2; }
    var svg = '<svg width="' + width + '" height="' + height + '" style="position:absolute;left:0;top:0;pointer-events:none">';
    SKILL_TREE.nodes.forEach(function (n) {
      n.prereq.forEach(function (pid) {
        var p = skillNodeById(pid); if (!p) return;
        var lit = skillRank(pid) > 0, col = lit ? (skillRank(n.id) > 0 ? "#ffce6a" : "#b89a4a") : "#4a3826";
        svg += '<line x1="' + cx(p.col) + '" y1="' + cy(p.row) + '" x2="' + cx(n.col) + '" y2="' + cy(n.row) + '" stroke="' + col + '" stroke-width="' + (lit ? 3 : 2) + '"/>';
      });
    });
    svg += '</svg>'; w.innerHTML = svg;
    SKILL_TREE.nodes.forEach(function (n) {
      var rk = skillRank(n.id), maxed = rk >= n.max, lock = nodeLockReason(n);
      var el = document.createElement("div");
      el.className = "sk-node2" + (rk > 0 ? " has" : "") + (lock && rk === 0 ? " locked" : "") + (maxed ? " maxed" : "") + (n.active ? " active" : "");
      el.style.left = (SK_PAD + n.col * SK_CW) + "px"; el.style.top = (SK_PAD + n.row * SK_CH) + "px";
      el.style.width = (SK_CW - SK_PAD * 2) + "px"; el.style.height = (SK_CH - SK_PAD * 2) + "px";
      var body = (lock && rk === 0) ? '<div class="sk2-lock">🔒 ' + lock + '</div>' : '<div class="sk2-desc">' + n.desc + '</div>';
      el.innerHTML = '<div class="sk2-top"><i class="sk2-ico" style="background-image:url(\'assets/ui/icons/skill_' + n.id + '.png\')"></i><span class="sk2-name">' + n.name + (n.active ? ' ⚡' : '') + '</span><span class="sk2-rk">' + rk + '/' + n.max + '</span></div>' + body
        + '<div class="sk2-btns"><button class="tb sk-mini" data-a="m">−</button><button class="tb sk-mini" data-a="p">+</button></div>';
      var bs = el.getElementsByTagName("button");
      bs[0].disabled = rk <= 0; bs[0].onclick = function () { refundSkill(n.id); };
      bs[1].disabled = maxed || (stats.sp || 0) <= 0 || !!lock; bs[1].onclick = function () { spendSkill(n.id); };
      w.appendChild(el);
    });
    var a = totalAttrs();
    $("skAttrs").innerHTML = "战力 <b>" + CORE.combatPower(a) + "</b> · 气血 " + a.HP + " · 攻 " + a.ATK + " · 防 " + a.DEF + " · 暴击 " + a.Crit + "% · 暴伤 " + a.CritDmg + "% · 命中 " + a.Hit + " · 攻速 " + a.ATKspd + " · 蓝量 " + (a.Mana || 0);
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
    warehouse.splice(i, 1); stats.gold = (stats.gold || 0) + price; dollSel = null; saveEquip(); save(); updateStats(); renderDoll(); toast("卖出「" + (EQUIP_TPL[it.tid] ? EQUIP_TPL[it.tid].name : it.tid) + "」 +" + price + "💰");
  }
  function openHomeSkill() { renderHomeSkill(); $("homeSkillModal").classList.remove("hidden"); }
  function homeAdj(id, d) {
    if (d > 0) { var n = HOME_SKILLS.filter(function (s) { return s.id === id; })[0]; if (!n) return; if (homeSpLeft() <= 0) { toast("居家技能点不足（多摆家具涨环境值）"); return; } if (homeRank(id) >= n.max) { toast("已满级"); return; } stats.homeSkills[id] = homeRank(id) + 1; stats.homeSpSpent = (stats.homeSpSpent || 0) + 1; }
    else { if (homeRank(id) <= 0) return; stats.homeSkills[id] = homeRank(id) - 1; if (!stats.homeSkills[id]) delete stats.homeSkills[id]; stats.homeSpSpent = Math.max(0, (stats.homeSpSpent || 0) - 1); }
    save(); renderHomeSkill();
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
      btns.appendChild(mn); btns.appendChild(pl); row.appendChild(btns); w.appendChild(row);
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
    // 物品栏(已知功法)
    var w = $("gfList"); w.innerHTML = "";
    GONGFA.forEach(function (g) {
      var st = gfState(g.id), lv = st.lv, learned = lv > 0, equipped = !!gfEquippedSlot(g.id), training = stats.trainId === g.id;
      var need = lv < GONGFA_MAXLV ? gfProfReq(lv) : 0, pct = need ? Math.min(100, Math.round(st.prof / need * 100)) : 100;
      var row = document.createElement("div"); row.className = "gf-row gf-" + g.sys + (equipped ? " equipped" : "");
      row.innerHTML = '<div class="gf-top"><span class="gf-nm"><i class="gf-ico" style="background-image:url(\'assets/ui/gongfa/book_' + g.id + '.png\')"></i>' + g.name + ' <span class="gf-sys">' + (g.sys === "nei" ? "内功" : g.sys === "wai" ? "外功" : "轻功") + '·' + g.tier + '</span></span><span class="gf-lv">Lv ' + lv + '/' + GONGFA_MAXLV + (training ? ' · <b style="color:#7fd0ff">修炼中</b>' : '') + '</span></div>'
        + '<div class="gf-bar"><i style="width:' + pct + '%"></i></div>'
        + '<div class="gf-eff">被动：' + fmtEff(g.passive, lv || 1) + '（修炼即得）<br>主动：' + fmtEff(g.active, lv || 1) + '（需装备）</div>';
      var btns = document.createElement("div"); btns.className = "gf-btns";
      var bt = document.createElement("button"); bt.className = "tb sk-mini"; bt.textContent = training ? "修炼中" : "修炼"; bt.disabled = training; bt.onclick = function () { setTrain(g.id); };
      var be = document.createElement("button"); be.className = "tb sk-mini"; be.textContent = equipped ? "卸下" : "装备"; be.disabled = !learned; be.onclick = function () { equipGongfa(g.id); };
      btns.appendChild(bt); btns.appendChild(be); row.appendChild(btns); w.appendChild(row);
    });
    var a = totalAttrs();
    $("gfAttrs").innerHTML = "战力 <b>" + CORE.combatPower(a) + "</b> · 气血 " + a.HP + " · 攻 " + a.ATK + " · 防 " + a.DEF + " · 暴击 " + a.Crit + "% · 命中 " + a.Hit + " · 攻速 " + a.ATKspd + " · 内力 " + (a.Mana || 0);
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
    var req = EQUIP_TPL[it.tid].reqLv || 1; if (stats.level < req) { toast("需要历练等级 " + req + " 才能佩戴"); return; }
    var idx = warehouse.indexOf(it); if (idx < 0) return; warehouse.splice(idx, 1);
    if (equipped[slotKey]) warehouse.push(equipped[slotKey]);
    equipped[slotKey] = it; dollSel = null; if (APPEAR_SLOTS.indexOf(slotKey) >= 0) loadEquipOverlay(it.tid); syncHpMax(); renderDoll(); saveEquip();
  }
  function unequip(slotKey) { var it = equipped[slotKey]; if (!it) return; equipped[slotKey] = null; dollSel = null; warehouse.push(it); syncHpMax(); renderDoll(); saveEquip(); }

  function rarOf(it) { return it.rarity || EQUIP_TPL[it.tid].rarity; }
  function itemTitle(it) { var t = EQUIP_TPL[it.tid]; var s = itemStats(it); var parts = []; for (var k in s) parts.push(STAT_LABEL[k] + "+" + s[k]); var rq = t.reqLv && t.reqLv > 1 ? " (需Lv" + t.reqLv + ")" : ""; return "【" + RARITY[rarOf(it)].name + "】" + t.name + rq + " " + parts.join(" "); }
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
      d.innerHTML = '<span class="slot-lbl">' + sd.name + '</span><span class="ico" style="' + (it ? 'box-shadow:inset 0 0 0 2px ' + RARITY[rarOf(it)].color : '') + '">' + (it ? equipIconHTML(it.tid, t.glyph) : slotIconHTML(sd)) + '</span>' + (it ? '<span class="it-nm" style="color:' + RARITY[rarOf(it)].color + '">' + t.name + '</span>' : '');
      if (it) { d.title = itemTitle(it); d.onclick = function () { unequip(sd.key); }; }
      d.addEventListener("dragover", function (e) { e.preventDefault(); d.classList.add("over"); });
      d.addEventListener("dragleave", function () { d.classList.remove("over"); });
      d.addEventListener("drop", function (e) { e.preventDefault(); d.classList.remove("over"); if (dollSel) equipItem(dollSel, sd.key); });
      d.addEventListener("click", function () { if (dollSel && !equipped[sd.key]) equipItem(dollSel, sd.key); });
      slotsEl.appendChild(d);
    });
    var wh = $("whGrid"); wh.innerHTML = ""; $("whCount").textContent = "(" + warehouse.length + ")";
    warehouse.forEach(function (it) {
      var t = EQUIP_TPL[it.tid];
      var d = document.createElement("div"); d.className = "wh-item"; d.draggable = true; d.title = itemTitle(it);
      d.innerHTML = equipIconHTML(it.tid, t.glyph) + '<span class="rb" style="box-shadow:inset 0 0 0 2px ' + RARITY[rarOf(it)].color + '"></span>';
      if (dollSel === it) d.style.boxShadow = "0 0 0 2px #ffd98a";
      d.addEventListener("dragstart", function () { dollSel = it; });
      d.onclick = function () { dollSel = (dollSel === it ? null : it); renderDoll(); };
      d.ondblclick = function () { equipItem(it, targetSlotFor(it)); };
      wh.appendChild(d);
    });
    var sz = $("sellZone"); if (sz) sz.innerHTML = dollSel ? ('卖出「' + (EQUIP_TPL[dollSel.tid] ? EQUIP_TPL[dollSel.tid].name : dollSel.tid) + '」 <b>+' + sellPrice(dollSel) + '💰</b>') : ('💰 拖装备到此卖出 / 选中后点此（金币 ' + (stats.gold || 0) + '）');
    // 属性 + 选中装备对比(穿上后 +/- 变化)
    var al = $("attrList"); var a = totalAttrs(); al.innerHTML = "";
    var pv = dollSel ? previewTotals(dollSel) : null;
    var cp = CORE.combatPower(a), cpDelta = "";
    if (pv) { var dcp = CORE.combatPower(pv.totals) - cp; if (dcp) cpDelta = ' <span style="color:' + (dcp > 0 ? "#7fe0a0" : "#ff8a7a") + '">(' + (dcp > 0 ? "+" : "") + dcp + ')</span>'; }
    al.innerHTML += '<div class="row" style="border-bottom:1px solid #6a5238;font-size:15px"><span class="k" style="color:#e8c98a">⚔ 战力</span><span class="v" style="color:#ffd98a;font-size:16px">' + cp + cpDelta + '</span></div>';
    if (pv) {
      var st = SLOT_DEFS.find(function (s) { return s.key === pv.slot; });
      var cur = equipped[pv.slot];
      al.innerHTML += '<div class="row" style="border:none;color:#ffd98a">对比：' + EQUIP_TPL[dollSel.tid].name + ' → ' + (st ? st.name : "") + '槽</div>';
      al.innerHTML += '<div class="row" style="border:none;font-size:11px;color:#9a866a">当前该槽：' + (cur ? EQUIP_TPL[cur.tid].name : "空") + '</div>';
    }
    ["HP", "ATK", "DEF", "Crit", "CritDmg", "Hit", "Dodge"].forEach(function (k) {
      var pct = (k === "Crit" || k === "CritDmg") ? "%" : "", ds = "";
      if (pv) { var dv = pv.totals[k] - a[k]; if (dv) ds = ' <span style="color:' + (dv > 0 ? "#7fe0a0" : "#ff8a7a") + '">(' + (dv > 0 ? "+" : "") + dv + ')</span>'; }
      al.innerHTML += '<div class="row"><span class="k">' + STAT_LABEL[k] + '</span><span class="v">' + a[k] + pct + ds + '</span></div>';
    });
    al.innerHTML += '<div class="row"><span class="k">内功等级</span><span class="v">' + stats.ng + '</span></div>';
  }
  function openDoll() { renderDoll(); $("dollModal").classList.remove("hidden"); }
  function saveEquip() { try { localStorage.setItem(SAVE_KEY + "_eq", JSON.stringify({ equipped: equipped, warehouse: warehouse, seq: equipSeq })); } catch (e) {} }
  function loadEquip() {
    try { var raw = localStorage.getItem(SAVE_KEY + "_eq"); if (!raw) return false; var d = JSON.parse(raw); equipped = d.equipped || equipped; warehouse = d.warehouse || []; equipSeq = d.seq || 1; return true; } catch (e) { return false; }
  }

  // ---- 出战历练（即时结算版；横版动画后续用同一 resolveCombat 回放）----
  // ---- 历练地图：分区 ----
  var ZONES = [
    { id: "niujia", name: "牛家村", lvMin: 1, lvMax: 1, types: ["thug"], boss: { type: "thug", lv: 2, hpMult: 5, atkMult: 1.6, name: "山贼王", bossId: "shanzeiwang" } },
    { id: "milin", name: "幽密林", lvMin: 3, lvMax: 5, types: ["thug", "bandit"], boss: { type: "bandit", lv: 6, hpMult: 3, atkMult: 1.6, name: "幽林鬼影", bossId: "youlinguiying" } },
    { id: "qingcheng", name: "青城派", lvMin: 6, lvMax: 8, types: ["bandit", "sect_novice"], boss: { type: "sect_novice", lv: 9, hpMult: 3, atkMult: 1.6, name: "青城逆徒", bossId: "qingchengnitu" } },
    { id: "xuedao", name: "血刀门", lvMin: 9, lvMax: 12, types: ["sect_novice", "xie_jiao"], boss: { type: "xie_jiao", lv: 13, hpMult: 3, atkMult: 1.7, name: "血刀老祖", bossId: "xuedaolaozu" } },
    { id: "mojiao", name: "魔教总坛", lvMin: 13, lvMax: 17, types: ["xie_jiao", "mo_jiao"], boss: { type: "mo_jiao", lv: 18, hpMult: 3, atkMult: 1.8, name: "天魔教主", bossId: "tianmojiaozhu" } }
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
    var gained = []; r.drops.forEach(function (d) { warehouse.push({ uid: equipSeq++, tid: d.id, affixes: d.affixes }); gained.push(d); });
    stats.gold = (stats.gold || 0) + (r.goldGained || 0); // 金币入账
    var lvups = 0; stats.exp += r.expGained; while (stats.exp >= CORE.nextExp(stats.level)) { stats.exp -= CORE.nextExp(stats.level); stats.level++; lvups++; stats.sp = (stats.sp || 0) + 1; } // 每级 +1 技能点
    syncHpMax(); saveEquip(); save(); return { gained: gained, lvups: lvups, gold: r.goldGained || 0 };
  }
  function applyCombatResult(r) {
    var bk = bankResult(r), gained = bk.gained, lvups = bk.lvups;
    var outTxt = r.outcome === "win" ? "全身而退 ✅" : ("负伤回家（" + (r.bagFull ? "背包已满" : "力竭") + "）");
    var body = '<div>结果：<span class="hl">' + outTxt + '</span></div>';
    body += '<div>击杀：<span class="hl">' + r.kills + '</span> 个 · 历时 ' + r.ttk + 's</div>';
    body += '<div>获得经验：<span class="hl">+' + r.expGained + '</span>' + (lvups ? ' <span class="lvup">升级 ×' + lvups + '！现 Lv' + stats.level + '</span>' : '') + '</div>';
    body += '<div>获得金币：<span class="hl">+' + (r.goldGained || 0) + '</span> 💰（共 ' + (stats.gold || 0) + '）</div>';
    body += '<div>自动用回血药：' + r.potionsUsed + ' 次 · 剩余气血 ' + Math.round(stats.hp) + '</div>';
    if (gained.length) { body += '<div class="drop">拾得装备 ' + gained.length + ' 件（已入武器仓库）：</div>'; gained.forEach(function (d) { var t = EQUIP_TPL[d.id]; body += '<div class="drop" style="color:' + RARITY[d.rarity].color + '">· 【' + RARITY[d.rarity].name + '】' + t.name + '</div>'; }); }
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
    if (!CV.canvas) { CV.canvas = $("combatCanvas"); CV.ctx = CV.canvas.getContext("2d"); CV.canvas.width = CV.W; CV.canvas.height = CV.H; }
    var cfg = { attrs: attrs, startHp: stats.hp, bagMax: 20, seed: (Date.now() & 0x7fffffff) ^ (Math.random() * 1e9 | 0) };
    var ab = []; // 主动技能(Phase4)：来自技能树 旋风斩/狂暴（数值占位待莱布尼茨）
    var wr = skillRank("whirlwind"); if (wr > 0) ab.push({ id: "whirlwind", type: "aoe", cost: 40, cd: 6, mult: 0.5 + 0.3 * wr });
    var br = skillRank("berserk"); if (br > 0) ab.push({ id: "berserk", type: "haste", cost: 50, cd: 12, dur: 5 });
    cfg.abilities = ab; cfg.manaRegen = 8;
    if (opts.zone) { cfg.spawnTypes = opts.zone.types; cfg.lvMin = opts.zone.lvMin; cfg.lvMax = opts.zone.lvMax; }
    else cfg.spawnPool = ["thug"];
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
      if (st.lastHit) { addFloat(PX + st.lastHit.x, CV.ground - 92, "-" + st.lastHit.dmg, "#ff7a6a"); cst.pAtk = 0.18; }
      if (st.lastCast) { if (st.lastCast.type === "aoe") { addFloat(PX + 120, CV.ground - 110, "旋风斩 -" + st.lastCast.dmg, "#ffce6a"); cst.aoeFx = 0.4; } else if (st.lastCast.type === "haste") addFloat(PX, CV.ground - 116, "狂暴!", "#ff8a3a"); }
      if (st.kills > cst.prevKills) cst.prevKills = st.kills;
      if (st.P.hp < cst.prevHp - 0.5) addFloat(PX, CV.ground - 100, "-" + Math.round(cst.prevHp - st.P.hp), "#ffd24a");
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
      var sh = CV.sheets[bkey], srcScale = sh && sh.fw > 64 ? 1 : (e.isBoss ? 2.0 : 1), uiScale = ((sh && sh.fw) || 64) * srcScale / 64;
      drawCSprite(bkey, ex, CV.ground, true, "", cst.etime[e.uid] + e.uid * 0.3, srcScale);
      bar(ex - 22 * uiScale, CV.ground - 72 * uiScale, 44 * uiScale, e.hp / e.hpMax, "#bf5f5f");
      if (e.isBoss && CV.bossName) { c.fillStyle = "#ffce6a"; c.font = "bold 14px sans-serif"; c.textAlign = "center"; c.fillText("☠ " + CV.bossName, ex, CV.ground - 72 * uiScale - 6); }
    });
    // 主角
    var pAnim = (CV.sim.isDone() && st.P.hp <= 0) ? "down" : (cst.pAtk > 0 ? "attack" : "idle");
    drawCSprite("p_" + pAnim, PX, CV.ground, false, "", cst.pT);
    if (cst.pAtk > 0) drawAttackEffect(PX + 56, CV.ground - 44, cst.pAtk);
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
  function loop(ts) { var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; updatePlayer(dt); render(); requestAnimationFrame(loop); }

  function init() {
    canvas = $("canvas"); ctx = canvas.getContext("2d"); resize();
    resetOcc(); initBag(); loadAssets();
    if (!load()) { addPlaced(byId.meditation_dais, Math.floor(GW / 2) - 6, 6, 0, false); bag.meditation_dais--; }
    renderCats(); renderItems(); updateStats(); bindInput();
    $("dbgPoison").onclick = function () { stats.poison = true; updateStats(); toast("中了毒！去睡觉解毒"); };
    $("dbgWeak").onclick = function () { stats.weak = true; updateStats(); toast("陷入虚弱！去睡觉恢复"); };
    $("dbgHurt").onclick = function () { stats.hp = Math.max(0, stats.hp - 30); updateStats(); toast("受伤 -30 气血"); };
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
    $("dollClose").onclick = function () { $("dollModal").classList.add("hidden"); };
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
    $("kungfuModal").addEventListener("click", function (e) { if (e.target === $("kungfuModal")) $("kungfuModal").classList.add("hidden"); });
    $("skClose").onclick = function () { $("skillModal").classList.add("hidden"); };
    $("skReset").onclick = resetSkills;
    $("skillModal").addEventListener("click", function (e) { if (e.target === $("skillModal")) $("skillModal").classList.add("hidden"); });
    $("hsClose").onclick = function () { $("homeSkillModal").classList.add("hidden"); };
    $("homeSkillModal").addEventListener("click", function (e) { if (e.target === $("homeSkillModal")) $("homeSkillModal").classList.add("hidden"); });
    var sz = $("sellZone");
    if (sz) { sz.addEventListener("dragover", function (e) { e.preventDefault(); sz.classList.add("over"); }); sz.addEventListener("dragleave", function () { sz.classList.remove("over"); }); sz.addEventListener("drop", function (e) { e.preventDefault(); sz.classList.remove("over"); if (dollSel) sellItem(dollSel.uid); }); sz.onclick = function () { if (dollSel) sellItem(dollSel.uid); else toast("先选中仓库里的装备"); }; }
    if (!loadEquip()) { ["wpn_iron_sword", "head_cloth", "body_cloth", "legs_cloth", "neck_lock", "ring_jade", "belt_iron", "wpn_steel_saber", "body_softarmor"].forEach(function (tid) { warehouse.push(rollItem(tid)); }); saveEquip(); }
    APPEAR_SLOTS.forEach(function (slot) { if (equipped[slot]) loadEquipOverlay(equipped[slot].tid); }); // 加载已穿装备外观层
    if (stats.zone == null) stats.zone = 0; if (stats.unlocked == null) stats.unlocked = 0; // 历练地图进度默认
    if (!stats.skills) stats.skills = {}; // 技能点迁移：补发应得点数(level-1)，幂等
    validateSkills(); // 树改版：清理旧无效技能id，点数退回
    var owed = Math.max(0, (stats.level || 1) - 1) - ((stats.sp || 0) + skillSpent()); if (owed > 0) stats.sp = (stats.sp || 0) + owed;
    // 功法迁移/初始化：白色功法默认已习得 Lv1
    if (!stats.gongfa) stats.gongfa = {}; if (!stats.gongfaEquip) stats.gongfaEquip = { nei: null, wai1: null, wai2: null, qing: null };
    GONGFA.forEach(function (g) { if (g.tier === "白" && !stats.gongfa[g.id]) stats.gongfa[g.id] = { lv: 1, prof: 0 }; });
    if (!stats.trainId) stats.trainId = "nei_tuna";
    syncHpMax();
    window.addEventListener("resize", function () { resize(); });
    setInterval(tickStats, 1000); setInterval(wanderTick, 2200);
    requestAnimationFrame(loop);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
