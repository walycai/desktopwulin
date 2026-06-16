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
  var MARGIN = 40, HEAD = 120, YARD = 8; // 边距 / 家具顶部留白 / 院景边界格数
  var PLAYER_CELLS = 4;
  var OX = MARGIN + (GH + YARD) * HW;
  var OY = MARGIN + WALL_PX + HEAD;
  var SAVE_KEY = "wulin_iso_v1";

  // 物品目录（占格 w×h，画面高度另给 zh；fixed 不可拖；func 功能件）
  var CATALOG = [
    { id: "bed_basic", name: "普通床", cat: "bed", w: 12, h: 24, zh: 26, func: "bed", heal: 4, cure: 0.4, glyph: "🛏", color: "#8a6240" },
    { id: "bed_advanced", name: "高级床", cat: "bed", w: 16, h: 28, zh: 34, func: "bed", heal: 11, cure: 1.4, glyph: "🛏", color: "#a8743e" },
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
    { id: "wall_scroll", name: "书法卷轴", cat: "wallhang", w: 3, h: 7, wall: true, glyph: "🪧", color: "#bcae86" },
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
    { id: "decor_ruyi", name: "如意", cat: "decor", w: 5, h: 2, zh: 4, glyph: "🦴", color: "#9a8a5a" }
  ];
  var CATS = [{ key: "bed", label: "床" }, { key: "func", label: "功能" }, { key: "chair", label: "椅" }, { key: "table", label: "桌" }, { key: "wallhang", label: "壁挂" }, { key: "decor", label: "装饰" }];
  var $ = function (id) { return document.getElementById(id); };
  var byId = {}; CATALOG.forEach(function (c) { byId[c.id] = c; });

  // ---- 状态 ----
  var canvas, ctx, dpr = 1, CW, CH;
  var bag = {}, placed = [], occ = [], wallOcc = { left: [], right: [] };
  var selId = null, ghostRot = 0, uidSeq = 1, activeCat = "bed";
  var stats = { hp: 100, hpMax: 100, poison: false, weak: false, ng: 1, ngP: 0, level: 1, exp: 0 }, NG_PER_LV = 100;
  var player = { cx: GW / 2, cy: GH * 0.6, tx: GW / 2, ty: GH * 0.6, state: "wander", actUid: 0, speed: 14, dir: "down", anim: "idle", fi: 0, fclock: 0, busy: false };
  var images = {}, sprites = {}, env = {};
  var mouse = { x: -1, y: -1, cx: -1, cy: -1, onWall: null };
  var drag = null, selectedPlaced = null, moveMode = null, longTimer = null;

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
    CATALOG.forEach(function (c) { tryLoad("assets/furniture/" + c.cat + "/" + c.id + (c.wall ? "_right" : "") + ".png", c.id, images); if (c.wall) tryLoad("assets/furniture/" + c.cat + "/" + c.id + "_left.png", c.id + "_left", images); });
    ["idle", "walk", "sleep", "meditate"].forEach(function (a) { tryLoad("assets/characters/protagonist/" + a + ".png", a, sprites); });
    tryLoad("assets/tiles/indoor/floor_large.png", "floorLarge", env);
    tryLoad("assets/tiles/indoor/wall_right.png", "wallRight", env);
    tryLoad("assets/tiles/indoor/wall_left.png", "wallLeft", env);
    tryLoad("assets/tiles/exterior/courtyard.png", "courtyard", env);
  }
  var SPR = { fw: 48, fh: 64, frames: { idle: 4, walk: 8, sleep: 4, meditate: 4 }, fps: { idle: 6, walk: 10, sleep: 4, meditate: 6 }, dirs: { idle: 4, walk: 4, sleep: 1, meditate: 1 }, dirRow: { down: 0, left: 1, right: 2, up: 3 } };

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
    var p = { uid: uidSeq++, id: c.id, cx: cx, cy: cy, w: fp.w, h: fp.h, rot: rot, wall: wall, side: side || "right", decor: (c.cat === "decor" && !wall) };
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
    if (img) { ctx.drawImage(img, x, y, w, h); }
    else { ctx.fillStyle = c.color; ctx.fillRect(x, y, w, h); ctx.strokeStyle = "#3a2a1a"; ctx.strokeRect(x, y, w, h); ctx.fillStyle = "#fff"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(c.glyph + c.name, x + w / 2, y + h / 2 + 4); }
  }
  function drawFurniture(p, ghost) {
    var c = byId[p.id];
    var img = images[p.id];
    var top = quad(p.cx, p.cy, p.w, p.h); // 顶面四角(底部)
    var zh = c.zh || 12;
    if (img && !ghost) {
      // 真图：底部中心锚点
      var bc = v(p.cx + p.w / 2, p.cy + p.h / 2);
      var iw = (p.w + p.h) * HW, ih = img.height * (iw / img.width);
      ctx.drawImage(img, bc.x - iw / 2, bc.y + (p.h * 0) - ih + HH, iw, ih);
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
    var spr = sprites[player.anim];
    if (spr) {
      var row = SPR.dirs[player.anim] === 1 ? 0 : (SPR.dirRow[player.dir] || 0);
      ctx.drawImage(spr, player.fi * SPR.fw, row * SPR.fh, SPR.fw, SPR.fh, ctr.x - 24, ctr.y - 60, SPR.fw, SPR.fh);
    } else {
      ctx.font = "26px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(player.state === "sleeping" ? "😴" : player.state === "meditating" ? "🧘" : "🧍", ctr.x, ctr.y - 6);
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
    // 壁挂(在墙上，靠后)
    placed.filter(function (p) { return p.wall; }).forEach(drawWallHang);
    // 地面可绘制(家具+主角) 深度排序：anchor 深度 = cx+cy+w/2+h/2(取前角)
    var drawables = placed.filter(function (p) { return !p.wall; }).map(function (p) { return { p: p, depth: (p.cx + p.w) + (p.cy + p.h), kind: "f" }; });
    drawables.push({ depth: (player.cx + PLAYER_CELLS / 2) + (player.cy + PLAYER_CELLS / 2), kind: "p" });
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
    var tc = { cx: p.cx + p.w / 2, cy: p.cy + p.h + 2 };
    tc.cy = Math.min(GH - 1, tc.cy);
    walkTo(tc.cx, tc.cy, function () {
      if (player.actUid !== p.uid) return;
      player.state = state; player.anim = state === "sleeping" ? "sleep" : "meditate";
      toast(state === "sleeping" ? "侠客躺下休息……" : "侠客盘膝打坐……");
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
    if (player.state === "sleeping") { var b = byId[(placed.find(function (q) { return q.uid === player.actUid; }) || {}).id] || {}; if (stats.hp < stats.hpMax) stats.hp = Math.min(stats.hpMax, stats.hp + (b.heal || 0)); if (Math.random() < (b.cure || 0)) { if (stats.poison) stats.poison = false; else if (stats.weak) stats.weak = false; } }
    else if (player.state === "meditating") { var d = byId[(placed.find(function (q) { return q.uid === player.actUid; }) || {}).id] || {}; stats.ngP += (d.neigong || 0); var lv = false; while (stats.ngP >= NG_PER_LV) { stats.ngP -= NG_PER_LV; stats.ng++; lv = true; toast("内功提升到 " + stats.ng + " 级！"); } if (lv) syncHpMax(); }
    updateStats(); save();
  }
  function updateStats() {
    $("hpVal").textContent = Math.round(stats.hp); $("hpMax").textContent = stats.hpMax; $("neigong").textContent = stats.ng;
    var bar = $("ngBar"); if (!bar.firstChild) bar.innerHTML = "<i></i>"; bar.firstChild.style.width = Math.round(stats.ngP / NG_PER_LV * 100) + "%";
    var s = []; if (stats.poison) s.push("中毒"); if (stats.weak) s.push("虚弱");
    $("statusVal").textContent = s.length ? s.join("、") : "正常"; $("statusVal").style.color = s.length ? "#ff8a7a" : "#9fe0a0";
    if ($("lvVal")) { $("lvVal").textContent = stats.level; $("expTxt").textContent = "(" + stats.exp + "/" + CORE.nextExp(stats.level) + ")"; }
  }

  // ---- 仓库 UI ----
  function initBag() { CATALOG.forEach(function (c) { bag[c.id] = (bag[c.id] || 0) + (c.func ? 2 : 3); }); }
  function renderCats() { var w = $("cats"); w.innerHTML = ""; CATS.forEach(function (ct) { var d = document.createElement("div"); d.className = "cat" + (ct.key === activeCat ? " active" : ""); d.textContent = ct.label; d.onclick = function () { activeCat = ct.key; renderCats(); renderItems(); }; w.appendChild(d); }); }
  function iconHTML(c) { var src = "assets/furniture/" + c.cat + "/" + c.id + (c.wall ? "_right" : "") + ".png"; return '<img src="' + src + '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="display:none;width:46px;height:46px;align-items:center;justify-content:center;background:' + c.color + ';color:#fff;border-radius:4px">' + c.glyph + '</span>'; }
  function renderItems() {
    var w = $("items"); w.innerHTML = "";
    CATALOG.filter(function (c) { return c.cat === activeCat; }).forEach(function (c) {
      var d = document.createElement("div"); d.className = "bag-item" + (selId === c.id ? " selected" : "") + (bag[c.id] <= 0 ? " out" : "");
      d.innerHTML = '<div class="ico">' + iconHTML(c) + '</div><div class="nm">' + c.name + (c.func ? " ⚙" : "") + '</div><div class="ct">' + c.w + "×" + c.h + " · 余" + bag[c.id] + '</div>';
      d.onclick = function () { if (bag[c.id] <= 0) return; selId = (selId === c.id ? null : c.id); ghostRot = 0; renderItems(); }; w.appendChild(d);
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
    var nr = (p.rot + 1) % 2, fp = footprint(c, nr);
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
      if (e.key === "r" || e.key === "R") { if (moveMode) rotatePlaced(moveMode.p); else if (selectedPlaced) rotatePlaced(selectedPlaced); else ghostRot = (ghostRot + 1) % 2; }
      if (e.key === "Escape" && moveMode) cancelMove();
    });
  }

  // ---- 存档 ----
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ placed: placed.map(function (p) { return { id: p.id, cx: p.cx, cy: p.cy, rot: p.rot, wall: p.wall, side: p.side }; }), bag: bag, stats: stats })); } catch (e) {} }
  function load() {
    try { var raw = localStorage.getItem(SAVE_KEY); if (!raw) return false; var d = JSON.parse(raw);
      if (d.bag) bag = d.bag; if (d.stats) stats = Object.assign(stats, d.stats);
      (d.placed || []).forEach(function (s) { var c = byId[s.id]; if (c) addPlaced(c, s.cx, s.cy, s.rot || 0, !!s.wall, s.side); }); return true;
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
  function totalAttrs() {
    var a = baseAttrs();
    SLOT_DEFS.forEach(function (sd) { var it = equipped[sd.key]; if (it) { var s = itemStats(it); for (var k in s) a[k] = (a[k] || 0) + s[k]; } });
    return a;
  }
  function syncHpMax() { var a = totalAttrs(); stats.hpMax = a.HP; if (stats.hp > stats.hpMax) stats.hp = stats.hpMax; if (stats.hp <= 0) stats.hp = stats.hpMax; updateStats(); }

  function equipItem(it, slotKey) {
    var sd = SLOT_DEFS.find(function (s) { return s.key === slotKey; });
    if (!sd || EQUIP_TPL[it.tid].type !== sd.type) { toast("该装备不能放这个槽"); return; }
    var req = EQUIP_TPL[it.tid].reqLv || 1; if (stats.level < req) { toast("需要历练等级 " + req + " 才能佩戴"); return; }
    var idx = warehouse.indexOf(it); if (idx < 0) return; warehouse.splice(idx, 1);
    if (equipped[slotKey]) warehouse.push(equipped[slotKey]);
    equipped[slotKey] = it; syncHpMax(); renderDoll(); saveEquip();
  }
  function unequip(slotKey) { var it = equipped[slotKey]; if (!it) return; equipped[slotKey] = null; warehouse.push(it); syncHpMax(); renderDoll(); saveEquip(); }

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
      d.addEventListener("dragstart", function () { dollSel = it; });
      d.onclick = function () { dollSel = it; toast("已选 " + t.name + "，点左侧空槽穿上"); };
      wh.appendChild(d);
    });
    var al = $("attrList"); var a = totalAttrs(); al.innerHTML = "";
    ["HP", "ATK", "DEF", "Crit", "CritDmg", "Hit", "Dodge"].forEach(function (k) { al.innerHTML += '<div class="row"><span class="k">' + STAT_LABEL[k] + '</span><span class="v">' + a[k] + (k === "Crit" || k === "CritDmg" ? "%" : "") + '</span></div>'; });
    al.innerHTML += '<div class="row"><span class="k">内功等级</span><span class="v">' + stats.ng + '</span></div>';
  }
  function openDoll() { renderDoll(); $("dollModal").classList.remove("hidden"); }
  function saveEquip() { try { localStorage.setItem(SAVE_KEY + "_eq", JSON.stringify({ equipped: equipped, warehouse: warehouse, seq: equipSeq })); } catch (e) {} }
  function loadEquip() {
    try { var raw = localStorage.getItem(SAVE_KEY + "_eq"); if (!raw) return false; var d = JSON.parse(raw); equipped = d.equipped || equipped; warehouse = d.warehouse || []; equipSeq = d.seq || 1; return true; } catch (e) { return false; }
  }

  // ---- 出战历练（即时结算版；横版动画后续用同一 resolveCombat 回放）----
  function genWave() {
    var lv = stats.level, pool = ["thug"];
    if (lv >= 2) pool.push("bandit");
    if (lv >= 4) pool.push("sect_novice");
    var n = 6 + Math.floor(lv / 2), wave = [];
    for (var i = 0; i < n; i++) wave.push(pool[Math.floor(Math.random() * pool.length)]);
    return wave;
  }
  function sortie() {
    var attrs = totalAttrs();
    var wave = genWave();
    var r = CORE.resolveCombat({ attrs: attrs, wave: wave, bagMax: 20, seed: (Date.now() & 0x7fffffff) ^ (Math.random() * 1e9 | 0) });
    // 应用战果
    stats.hp = r.outcome === "lose" ? Math.max(1, Math.round(stats.hpMax * 0.2)) : Math.max(1, r.hpRemaining);
    var gained = [];
    r.drops.forEach(function (d) { warehouse.push({ uid: equipSeq++, tid: d.id, affixes: d.affixes }); gained.push(d); });
    var lvups = 0; stats.exp += r.expGained;
    while (stats.exp >= CORE.nextExp(stats.level)) { stats.exp -= CORE.nextExp(stats.level); stats.level++; lvups++; }
    syncHpMax(); saveEquip(); save();
    // 总结弹窗
    var outTxt = r.outcome === "win" ? "全身而退 ✅" : ("负伤回家（" + (r.bagFull ? "背包已满" : "力竭") + "）");
    var body = '<div>结果：<span class="hl">' + outTxt + '</span></div>';
    body += '<div>击杀：<span class="hl">' + r.kills + '</span> 个 · 历时 ' + r.ttk + 's</div>';
    body += '<div>获得经验：<span class="hl">+' + r.expGained + '</span>' + (lvups ? ' <span class="lvup">升级 ×' + lvups + '！现 Lv' + stats.level + '</span>' : '') + '</div>';
    body += '<div>自动用回血药：' + r.potionsUsed + ' 次 · 剩余气血 ' + Math.round(stats.hp) + '</div>';
    if (gained.length) { body += '<div class="drop">拾得装备 ' + gained.length + ' 件（已入武器仓库）：</div>'; gained.forEach(function (d) { var t = EQUIP_TPL[d.id]; body += '<div class="drop" style="color:' + RARITY[d.rarity].color + '">· 【' + RARITY[d.rarity].name + '】' + t.name + '</div>'; }); }
    else body += '<div>本趟无装备掉落</div>';
    $("cmBody").innerHTML = body;
    $("cmTitle").textContent = r.outcome === "win" ? "历练归来" : "负伤而归";
    $("combatModal").classList.remove("hidden");
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
    $("dollClose").onclick = function () { $("dollModal").classList.add("hidden"); };
    $("sortieBtn").onclick = sortie;
    $("meditateBtn").onclick = function () { var p = placed.find(function (q) { return byId[q.id].func === "meditate"; }); if (p) goAction(p, "meditating"); else toast("请先在房间摆一个打坐台"); };
    $("sleepBtn").onclick = function () { var p = placed.find(function (q) { return byId[q.id].func === "bed"; }); if (p) goAction(p, "sleeping"); else toast("请先在房间摆一张床"); };
    $("cmClose").onclick = function () { $("combatModal").classList.add("hidden"); };
    $("combatModal").addEventListener("click", function (e) { if (e.target === $("combatModal")) $("combatModal").classList.add("hidden"); });
    $("dollModal").addEventListener("click", function (e) { if (e.target === $("dollModal")) $("dollModal").classList.add("hidden"); });
    if (!loadEquip()) { ["wpn_iron_sword", "head_cloth", "body_cloth", "legs_cloth", "neck_lock", "ring_jade", "belt_iron", "wpn_steel_saber", "body_softarmor"].forEach(function (tid) { warehouse.push(rollItem(tid)); }); saveEquip(); }
    syncHpMax();
    window.addEventListener("resize", function () { resize(); });
    setInterval(tickStats, 1000); setInterval(wanderTick, 2200);
    requestAnimationFrame(loop);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
