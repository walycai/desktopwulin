// ============================================================
// 桌面武林 · 室内家园摆放原型（纯前端 H5，操作验证用；产品最终 Godot4）
// 机制：精细网格地板 + 后墙(壁挂)；仓库包按类别点选 → 房间内吸附摆放；可拖动/旋转/收回。
// 功能件：床(普通/高级，回血+解负面，速率不同)、打坐台(固定，涨内功)。
// 主角：平时随机溜达；点床→走过去睡觉；点打坐台→走过去打坐；其他不可点。
// 美术：占位为主，assets/furniture/<cat>/<id>.png 存在则自动用真图(像素风，@吴冠中)。
// ============================================================
(function () {
  "use strict";

  var CELL = 20;            // 精细网格，每格 20px
  var GW = 50, GH = 34;     // 地板 50x34 格 = 1000x680
  var WALL_ROWS = 7;        // 后墙高度(格)，用于壁挂
  var SAVE_KEY = "wulin_home_v1";

  // ---- 物品目录（30 件；w/h 为占格数；fixed 不可拖；func 功能件）----
  var CATALOG = [
    // 床（功能）
    { id: "bed_basic", name: "普通床", cat: "bed", w: 12, h: 24, func: "bed", heal: 4, cure: 0.4, glyph: "🛏", color: "#7c5a3a" },
    { id: "bed_advanced", name: "高级床", cat: "bed", w: 16, h: 28, func: "bed", heal: 11, cure: 1.4, glyph: "🛏", color: "#9c6b3a" },
    // 打坐台（功能·固定，按吴冠中 art 规格 12x12）
    { id: "meditation_dais", name: "打坐台", cat: "func", w: 12, h: 12, fixed: true, func: "meditate", neigong: 1.2, glyph: "🧘", color: "#5a6a8a" },
    // 椅
    { id: "chair_round", name: "圈椅", cat: "chair", w: 4, h: 4, glyph: "🪑", color: "#6a4a30" },
    { id: "chair_bench", name: "长凳", cat: "chair", w: 8, h: 3, glyph: "🪑", color: "#6a4a30" },
    { id: "chair_cushion", name: "蒲团", cat: "chair", w: 4, h: 4, glyph: "⊙", color: "#8a7a4a" },
    { id: "chair_taishi", name: "太师椅", cat: "chair", w: 5, h: 5, glyph: "🪑", color: "#5a3a22" },
    // 桌
    { id: "table_square", name: "方桌", cat: "table", w: 8, h: 8, glyph: "🀫", color: "#7a5636" },
    { id: "table_tea", name: "茶几", cat: "table", w: 6, h: 6, glyph: "🍵", color: "#7a5636" },
    { id: "table_desk", name: "书案", cat: "table", w: 10, h: 6, glyph: "📜", color: "#6a4a2e" },
    { id: "table_long", name: "条案", cat: "table", w: 12, h: 4, glyph: "▭", color: "#6a4a2e" },
    // 壁挂
    { id: "wall_landscape", name: "山水画", cat: "wallhang", w: 8, h: 5, wall: true, glyph: "🏞", color: "#8a8a6a" },
    { id: "wall_scroll", name: "书法卷轴", cat: "wallhang", w: 3, h: 6, wall: true, glyph: "🪧", color: "#bcae86" },
    { id: "wall_swordrack", name: "宝剑挂架", cat: "wallhang", w: 6, h: 4, wall: true, glyph: "🗡", color: "#9a9aa0" },
    { id: "wall_lantern", name: "灯笼", cat: "wallhang", w: 3, h: 4, wall: true, glyph: "🏮", color: "#b04a3a" },
    { id: "wall_mirror", name: "铜镜", cat: "wallhang", w: 4, h: 4, wall: true, glyph: "🪞", color: "#9a8a5a" },
    { id: "wall_weapon", name: "兵器架", cat: "wallhang", w: 7, h: 5, wall: true, glyph: "⚔", color: "#8a8a90" },
    // 装饰小件
    { id: "decor_vase", name: "花瓶", cat: "decor", w: 2, h: 2, glyph: "🏺", color: "#5a7a8a" },
    { id: "decor_brush", name: "毛笔", cat: "decor", w: 1, h: 3, glyph: "🖌", color: "#5a4a3a" },
    { id: "decor_inkstone", name: "砚台", cat: "decor", w: 2, h: 2, glyph: "▦", color: "#3a3a3a" },
    { id: "decor_censer", name: "香炉", cat: "decor", w: 3, h: 3, glyph: "🕯", color: "#7a6a4a" },
    { id: "decor_teaset", name: "茶具", cat: "decor", w: 3, h: 2, glyph: "🫖", color: "#8a6a4a" },
    { id: "decor_weiqi", name: "棋盘", cat: "decor", w: 4, h: 4, glyph: "▩", color: "#9a7a4a" },
    { id: "decor_guqin", name: "古琴", cat: "decor", w: 8, h: 2, glyph: "🎴", color: "#5a3a2a" },
    { id: "decor_bonsai", name: "盆景", cat: "decor", w: 3, h: 3, glyph: "🪴", color: "#4a6a3a" },
    { id: "decor_candle", name: "烛台", cat: "decor", w: 2, h: 2, glyph: "🕯", color: "#aa8a3a" },
    { id: "decor_books", name: "书堆", cat: "decor", w: 3, h: 2, glyph: "📚", color: "#6a5a8a" },
    { id: "decor_wine", name: "酒坛", cat: "decor", w: 3, h: 3, glyph: "🍶", color: "#5a6a5a" },
    { id: "decor_screen", name: "屏风", cat: "decor", w: 10, h: 2, glyph: "🪟", color: "#7a6a5a" },
    { id: "decor_ruyi", name: "如意", cat: "decor", w: 4, h: 1, glyph: "🦴", color: "#9a8a5a" }
  ];
  var CATS = [
    { key: "bed", label: "床" }, { key: "func", label: "功能" },
    { key: "chair", label: "椅" }, { key: "table", label: "桌" },
    { key: "wallhang", label: "壁挂" }, { key: "decor", label: "装饰" }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var byId = {}; CATALOG.forEach(function (c) { byId[c.id] = c; });

  // ---- 状态 ----
  var bag = {};            // id -> 剩余数量
  var placed = [];         // {uid, id, cx, cy, w, h, rot, wall, el}
  var occ = [];            // 地板占用 occ[y][x]=uid|0
  var wallOcc = [];        // 墙面占用(按列)
  var selId = null;        // 仓库选中待放
  var ghostRot = 0;
  var uidSeq = 1;
  var stats = { hp: 100, hpMax: 100, poison: false, weak: false, ng: 1, ngP: 0 };
  var NG_PER_LV = 100;
  var player = { x: GW * CELL / 2, y: GH * CELL * 0.6, state: "wander", target: null, actUid: 0 };
  var activeCat = "bed";

  function resetOcc() {
    occ = []; for (var y = 0; y < GH; y++) { occ[y] = []; for (var x = 0; x < GW; x++) occ[y][x] = 0; }
    wallOcc = []; for (var i = 0; i < GW; i++) wallOcc[i] = 0;
  }

  // ---- 渲染图标(真图优先,占位兜底) ----
  function itemImgHTML(c, wpx, hpx) {
    var src = "assets/furniture/" + c.cat + "/" + c.id + ".png";
    return '<img src="' + src + '" alt="" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
      '<span class="lbl" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:' + c.color + ';color:#fff;flex-direction:column">' +
      '<span style="font-size:' + Math.max(12, Math.min(wpx, hpx) * 0.4) + 'px">' + c.glyph + '</span>' +
      (Math.min(wpx, hpx) > 44 ? '<span style="font-size:11px">' + c.name + '</span>' : '') + '</span>';
  }

  // ---- 房间布局 ----
  function layoutRoom() {
    var wallH = WALL_ROWS * CELL, floorH = GH * CELL, w = GW * CELL;
    var room = $("room"); room.style.width = w + "px"; room.style.height = (wallH + floorH) + "px";
    var wall = $("wall"); wall.style.height = wallH + "px";
    var floor = $("floor"); floor.style.top = wallH + "px"; floor.style.height = floorH + "px";
    floor.style.backgroundSize = CELL + "px " + CELL + "px, " + CELL + "px " + CELL + "px";
    $("wall").style.backgroundSize = "auto, auto";
  }
  var FLOOR_TOP = function () { return WALL_ROWS * CELL; };

  // ---- 仓库 UI ----
  function initBag() { CATALOG.forEach(function (c) { bag[c.id] = (bag[c.id] || 0) + (c.func ? 2 : 3); }); }
  function renderCats() {
    var w = $("cats"); w.innerHTML = "";
    CATS.forEach(function (ct) {
      var d = document.createElement("div"); d.className = "cat" + (ct.key === activeCat ? " active" : "");
      d.textContent = ct.label; d.onclick = function () { activeCat = ct.key; renderCats(); renderItems(); };
      w.appendChild(d);
    });
  }
  function renderItems() {
    var w = $("items"); w.innerHTML = "";
    CATALOG.filter(function (c) { return c.cat === activeCat; }).forEach(function (c) {
      var d = document.createElement("div");
      d.className = "bag-item" + (selId === c.id ? " selected" : "") + (bag[c.id] <= 0 ? " out" : "");
      d.innerHTML = '<div class="ico">' + itemImgHTML(c, 54, 54) + '</div>' +
        '<div class="nm">' + c.name + (c.func ? " ⚙" : "") + '</div>' +
        '<div class="ct">' + c.w + "×" + c.h + "格 · 余" + bag[c.id] + '</div>';
      d.onclick = function () { if (bag[c.id] <= 0) return; selId = (selId === c.id ? null : c.id); ghostRot = 0; renderItems(); updateGhost(lastMouse); };
      w.appendChild(d);
    });
  }

  // ---- 摆放：ghost / 校验 / 落子 ----
  var lastMouse = null;
  function footprint(c, rot) { return rot % 2 ? { w: c.h, h: c.w } : { w: c.w, h: c.h }; }
  function cellFromEvent(e) {
    var fr = $("floor").getBoundingClientRect();
    var x = Math.floor((e.clientX - fr.left) / CELL), y = Math.floor((e.clientY - fr.top) / CELL);
    return { x: x, y: y, onFloor: e.clientY >= fr.top };
  }
  function canPlaceFloor(cx, cy, fw, fh, ignoreUid) {
    if (cx < 0 || cy < 0 || cx + fw > GW || cy + fh > GH) return false;
    for (var y = cy; y < cy + fh; y++) for (var x = cx; x < cx + fw; x++) if (occ[y][x] && occ[y][x] !== ignoreUid) return false;
    return true;
  }
  function canPlaceWall(cx, fw, ignoreUid) {
    if (cx < 0 || cx + fw > GW) return false;
    for (var x = cx; x < cx + fw; x++) if (wallOcc[x] && wallOcc[x] !== ignoreUid) return false;
    return true;
  }
  function updateGhost(e) {
    lastMouse = e;
    var g = $("ghost"); var c = selId && byId[selId];
    if (!c || !e) { g.classList.add("hidden"); return; }
    var fp = footprint(c, ghostRot);
    if (c.wall) {
      var wr = $("wall").getBoundingClientRect();
      var cx = Math.floor((e.clientX - wr.left) / CELL);
      cx = Math.max(0, Math.min(GW - fp.w, cx));
      var ok = canPlaceWall(cx, fp.w);
      g.className = "ghost " + (ok ? "ok" : "bad");
      g.style.left = cx * CELL + "px"; g.style.top = (Math.max(0, Math.min(WALL_ROWS - fp.h, 1))) * CELL + "px";
      g.style.width = fp.w * CELL + "px"; g.style.height = fp.h * CELL + "px";
      g.innerHTML = c.glyph;
    } else {
      var cell = cellFromEvent(e);
      if (!cell.onFloor) { g.classList.add("hidden"); return; }
      var ok2 = canPlaceFloor(cell.x, cell.y, fp.w, fp.h);
      g.className = "ghost " + (ok2 ? "ok" : "bad");
      g.style.left = cell.x * CELL + "px"; g.style.top = (FLOOR_TOP() + cell.y * CELL) + "px";
      g.style.width = fp.w * CELL + "px"; g.style.height = fp.h * CELL + "px";
      g.innerHTML = c.glyph;
    }
  }
  function tryPlaceAt(e) {
    var c = selId && byId[selId]; if (!c) return;
    if (bag[c.id] <= 0) return;
    var fp = footprint(c, ghostRot);
    if (c.wall) {
      var wr = $("wall").getBoundingClientRect();
      var cx = Math.max(0, Math.min(GW - fp.w, Math.floor((e.clientX - wr.left) / CELL)));
      if (!canPlaceWall(cx, fp.w)) { toast("这里放不下"); return; }
      addPlaced(c, cx, 1, ghostRot, true);
    } else {
      var cell = cellFromEvent(e); if (!cell.onFloor) return;
      if (!canPlaceFloor(cell.x, cell.y, fp.w, fp.h)) { toast("这里放不下"); return; }
      addPlaced(c, cell.x, cell.y, ghostRot, false);
    }
    bag[c.id]--; if (bag[c.id] <= 0) { selId = null; $("ghost").classList.add("hidden"); }
    ghostRot = 0; renderItems(); save();
  }
  function addPlaced(c, cx, cy, rot, wall) {
    var fp = footprint(c, rot);
    var p = { uid: uidSeq++, id: c.id, cx: cx, cy: cy, w: fp.w, h: fp.h, rot: rot, wall: wall };
    placed.push(p);
    if (wall) { for (var x = cx; x < cx + fp.w; x++) wallOcc[x] = p.uid; }
    else { for (var y = cy; y < cy + fp.h; y++) for (var xx = cx; xx < cx + fp.w; xx++) occ[y][xx] = p.uid; }
    renderPlaced(p);
  }
  function freeCells(p) {
    if (p.wall) { for (var x = p.cx; x < p.cx + p.w; x++) if (wallOcc[x] === p.uid) wallOcc[x] = 0; }
    else { for (var y = p.cy; y < p.cy + p.h; y++) for (var xx = p.cx; xx < p.cx + p.w; xx++) if (occ[y][xx] === p.uid) occ[y][xx] = 0; }
  }
  function fillCells(p) {
    if (p.wall) { for (var x = p.cx; x < p.cx + p.w; x++) wallOcc[x] = p.uid; }
    else { for (var y = p.cy; y < p.cy + p.h; y++) for (var xx = p.cx; xx < p.cx + p.w; xx++) occ[y][xx] = p.uid; }
  }
  function renderPlaced(p) {
    var c = byId[p.id];
    var el = p.el || document.createElement("div");
    p.el = el;
    el.className = "placed" + (c.fixed ? " fixed" : "") + (c.func ? " func" : "");
    el.style.width = p.w * CELL + "px"; el.style.height = p.h * CELL + "px";
    el.style.left = p.cx * CELL + "px";
    el.style.top = (p.wall ? p.cy * CELL : FLOOR_TOP() + p.cy * CELL) + "px";
    el.innerHTML = itemImgHTML(c, p.w * CELL, p.h * CELL);
    el.title = c.name + (c.func === "bed" ? "（点击去睡觉）" : c.func === "meditate" ? "（点击去打坐）" : "");
    if (!el._bound) { bindPlaced(p, el); el._bound = true; }
    if (!el.parentNode) $("room").appendChild(el);
  }

  // ---- 已放置：拖动 / 旋转 / 收回 / 功能点击 ----
  function bindPlaced(p, el) {
    var c = byId[p.id];
    var down = null, moved = false;
    el.addEventListener("pointerdown", function (e) {
      if (e.button === 2) return;
      down = { mx: e.clientX, my: e.clientY, ox: p.cx, oy: p.cy }; moved = false;
      if (!c.fixed) { el.setPointerCapture(e.pointerId); el.classList.add("dragging"); freeCells(p); }
      e.stopPropagation();
    });
    el.addEventListener("pointermove", function (e) {
      if (!down || c.fixed) return;
      var dx = Math.round((e.clientX - down.mx) / CELL), dy = Math.round((e.clientY - down.my) / CELL);
      if (dx || dy) moved = true;
      var nx, ny;
      if (p.wall) { nx = Math.max(0, Math.min(GW - p.w, down.ox + dx)); el.style.left = nx * CELL + "px"; }
      else {
        nx = Math.max(0, Math.min(GW - p.w, down.ox + dx)); ny = Math.max(0, Math.min(GH - p.h, down.oy + dy));
        el.style.left = nx * CELL + "px"; el.style.top = (FLOOR_TOP() + ny * CELL) + "px";
      }
    });
    el.addEventListener("pointerup", function (e) {
      el.classList.remove("dragging");
      if (down && !moved) { onPlacedTap(p); }       // 点击(未拖动)
      else if (down && !c.fixed) {                   // 拖动落子
        var dx = Math.round((e.clientX - down.mx) / CELL), dy = Math.round((e.clientY - down.my) / CELL);
        if (p.wall) { var nx = Math.max(0, Math.min(GW - p.w, down.ox + dx)); if (canPlaceWall(nx, p.w, p.uid)) p.cx = nx; }
        else {
          var nx2 = Math.max(0, Math.min(GW - p.w, down.ox + dx)), ny2 = Math.max(0, Math.min(GH - p.h, down.oy + dy));
          if (canPlaceFloor(nx2, ny2, p.w, p.h, p.uid)) { p.cx = nx2; p.cy = ny2; } else toast("那里放不下");
        }
        fillCells(p); renderPlaced(p); save();
      }
      down = null;
    });
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); removePlaced(p); });
  }
  function onPlacedTap(p) {
    var c = byId[p.id];
    if (c.func === "bed") goAction(p, "sleeping");
    else if (c.func === "meditate") goAction(p, "meditating");
    // 其他物件点击不触发行为（仅可拖动）
  }
  function removePlaced(p) {
    freeCells(p); if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    placed = placed.filter(function (q) { return q !== p; });
    bag[p.id]++; if (player.actUid === p.uid) { player.state = "wander"; player.actUid = 0; $("player").classList.remove("acting"); }
    renderItems(); save();
  }

  // ---- 主角：溜达 / 走向目标 / 行为 ----
  function setPlayerPos(x, y, animate) {
    player.x = x; player.y = y;
    var el = $("player");
    el.style.left = (x - 11) + "px"; el.style.top = (FLOOR_TOP() + y - 22) + "px";
  }
  function walkTo(x, y, onArrive) {
    player.target = { x: x, y: y, cb: onArrive };
    var el = $("player");
    var dist = Math.hypot(x - player.x, y - player.y);
    el.style.transitionDuration = Math.max(0.2, dist / 120) + "s";
    player.x = x; player.y = y;
    el.style.left = (x - 11) + "px"; el.style.top = (FLOOR_TOP() + y - 22) + "px";
    clearTimeout(player._t);
    player._t = setTimeout(function () { if (player.target && player.target.cb) player.target.cb(); }, Math.max(200, dist / 120 * 1000) + 30);
  }
  function centerOf(p) { return { x: (p.cx + p.w / 2) * CELL, y: (p.cy + p.h / 2) * CELL }; }
  function goAction(p, state) {
    player.state = "walking"; player.actUid = p.uid;
    $("player").classList.remove("acting");
    var ctr = centerOf(p);
    var ty = Math.min(GH * CELL - 6, ctr.y + p.h * CELL / 2 + 4); // 走到家具前方
    walkTo(ctr.x, ty, function () {
      if (player.actUid !== p.uid) return;
      player.state = state; $("player").classList.add("acting");
      $("player").textContent = state === "sleeping" ? "😴" : "🧘";
      toast(state === "sleeping" ? "侠客躺下休息……" : "侠客盘膝打坐……");
    });
  }
  function wanderTick() {
    if (player.state === "wander" && (!player.target || !player._busy)) {
      if (Math.random() < 0.5) {
        var x = 40 + Math.random() * (GW * CELL - 80), y = 40 + Math.random() * (GH * CELL - 80);
        player._busy = true;
        walkTo(x, y, function () { player._busy = false; });
      }
    }
  }
  // 点房间空白处 → 取消当前行为，回到溜达
  function bindRoomIdleClick() {
    $("floor").addEventListener("pointerup", function (e) {
      if (selId) { tryPlaceAt(e); return; }
      if (player.state === "sleeping" || player.state === "meditating") {
        player.state = "wander"; player.actUid = 0; player._busy = false;
        $("player").classList.remove("acting"); $("player").textContent = "🧍";
      }
    });
    $("wall").addEventListener("pointerup", function (e) { if (selId) tryPlaceAt(e); });
  }

  // ---- 功能结算（每秒）----
  function tickStats() {
    if (player.state === "sleeping") {
      var bed = byId[(placed.find(function (q) { return q.uid === player.actUid; }) || {}).id] || {};
      if (stats.hp < stats.hpMax) stats.hp = Math.min(stats.hpMax, stats.hp + (bed.heal || 0));
      if (Math.random() < (bed.cure || 0)) { if (stats.poison) stats.poison = false; else if (stats.weak) stats.weak = false; }
    } else if (player.state === "meditating") {
      var d = byId[(placed.find(function (q) { return q.uid === player.actUid; }) || {}).id] || {};
      stats.ngP += (d.neigong || 0);
      while (stats.ngP >= NG_PER_LV) { stats.ngP -= NG_PER_LV; stats.ng++; toast("内功提升到 " + stats.ng + " 级！"); }
    }
    updateStats(); save();
  }
  function updateStats() {
    $("hpVal").textContent = Math.round(stats.hp); $("hpMax").textContent = stats.hpMax;
    $("neigong").textContent = stats.ng;
    var bar = $("ngBar"); if (!bar.firstChild) bar.innerHTML = "<i></i>";
    bar.firstChild.style.width = Math.round(stats.ngP / NG_PER_LV * 100) + "%";
    var s = []; if (stats.poison) s.push("中毒"); if (stats.weak) s.push("虚弱");
    $("statusVal").textContent = s.length ? s.join("、") : "正常";
    $("statusVal").style.color = s.length ? "#ff8a7a" : "#9fe0a0";
  }

  // ---- 存档 ----
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        placed: placed.map(function (p) { return { id: p.id, cx: p.cx, cy: p.cy, rot: p.rot, wall: p.wall }; }),
        bag: bag, stats: stats
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      var d = JSON.parse(raw);
      if (d.bag) bag = d.bag; if (d.stats) stats = Object.assign(stats, d.stats);
      (d.placed || []).forEach(function (s) { var c = byId[s.id]; if (c) addPlaced(c, s.cx, s.cy, s.rot || 0, !!s.wall); });
      return true;
    } catch (e) { return false; }
  }

  var toastT = null;
  function toast(m) { var t = $("toast"); t.textContent = m; t.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add("hidden"); }, 1500); }

  // ---- 启动 ----
  function init() {
    resetOcc(); layoutRoom(); initBag();
    if (!load()) {
      // 预置一张普通床+打坐台，便于一眼看到功能
      addPlaced(byId.bed_basic, 4, 4, 0, false); bag.bed_basic--;
      addPlaced(byId.meditation_dais, 30, 6, 0, false); bag.meditation_dais--;
    }
    renderCats(); renderItems(); updateStats();
    setPlayerPos(GW * CELL / 2, GH * CELL * 0.6, false);
    bindRoomIdleClick();
    $("room").addEventListener("pointermove", updateGhost);
    $("room").addEventListener("contextmenu", function (e) { if (selId) { e.preventDefault(); selId = null; $("ghost").classList.add("hidden"); renderItems(); } });
    document.addEventListener("keydown", function (e) { if (e.key === "r" || e.key === "R") { ghostRot = (ghostRot + 1) % 2; updateGhost(lastMouse); } });
    $("dbgPoison").onclick = function () { stats.poison = true; updateStats(); toast("中了毒！去睡觉解毒"); };
    $("dbgWeak").onclick = function () { stats.weak = true; updateStats(); toast("陷入虚弱！去睡觉恢复"); };
    $("dbgHurt").onclick = function () { stats.hp = Math.max(0, stats.hp - 30); updateStats(); toast("受伤 -30 气血"); };
    $("resetBtn").onclick = function () { if (confirm("清空房间与存档？")) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
    setInterval(tickStats, 1000);
    setInterval(wanderTick, 2200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
