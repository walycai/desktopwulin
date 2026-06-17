// ============================================================
// 桌面武林 · 战斗核心（纯逻辑，无 DOM）
// 浏览器(game.js)与无头 sim(@莱布尼茨) 共用的单一真相源。
// node:  const C = require('./src/combat-core.js'); C.resolveCombat(cfg)
// 浏览器: window.WULIN_CORE.resolveCombat(cfg)
// ============================================================
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.WULIN_CORE = api;
})(this, function () {
  "use strict";

  // ---- 稀有度 / 装备模板 / 副词条池（与纸娃娃共用）----
  var RARITY = { common: { name: "凡品", color: "#9a9a9a", affixes: 0 }, fine: { name: "精良", color: "#5fbf5f", affixes: 1 }, superior: { name: "上乘", color: "#5a9bff", affixes: 2 }, epic: { name: "绝品", color: "#b06bff", affixes: 3 }, legend: { name: "秘传", color: "#ffb43a", affixes: 3 } };
  // 装备等级需求 reqLv 按稀有度（凡1/精良3/上乘6/绝品10/秘传15），不够级穿不上
  var EQUIP_TPL = {
    wpn_iron_sword: { name: "铁剑", type: "weapon", rarity: "common", reqLv: 1, glyph: "🗡", base: { ATK: 8 } },
    wpn_steel_saber: { name: "精钢刀", type: "weapon", rarity: "fine", reqLv: 3, glyph: "⚔", base: { ATK: 14 } },
    head_cloth: { name: "方巾", type: "head", rarity: "common", reqLv: 1, glyph: "🧢", base: { DEF: 3 } },
    head_iron: { name: "铁盔", type: "head", rarity: "fine", reqLv: 3, glyph: "⛑", base: { DEF: 6, HP: 10 } },
    body_cloth: { name: "布衣", type: "body", rarity: "common", reqLv: 1, glyph: "👕", base: { DEF: 4, HP: 15 } },
    body_softarmor: { name: "软猬甲", type: "body", rarity: "superior", reqLv: 6, glyph: "🥋", base: { DEF: 9, HP: 30 } },
    legs_cloth: { name: "粗布裤", type: "legs", rarity: "common", reqLv: 1, glyph: "👖", base: { DEF: 3, HP: 10 } },
    legs_guard: { name: "护腿", type: "legs", rarity: "fine", reqLv: 3, glyph: "🦵", base: { DEF: 6, HP: 18 } },
    neck_lock: { name: "长命锁", type: "neck", rarity: "fine", reqLv: 3, glyph: "📿", base: { HP: 25, Crit: 2 } },
    ring_jade: { name: "羊脂戒", type: "ring", rarity: "superior", reqLv: 6, glyph: "💍", base: { Crit: 4, CritDmg: 15 } },
    belt_iron: { name: "玄铁腰带", type: "belt", rarity: "fine", reqLv: 3, glyph: "🎗", base: { DEF: 5, HP: 12 } }
  };
  var AFFIX_POOL = [{ s: "ATK", a: 1, b: 6 }, { s: "DEF", a: 1, b: 4 }, { s: "HP", a: 5, b: 25 }, { s: "Crit", a: 1, b: 3 }, { s: "CritDmg", a: 5, b: 15 }, { s: "Hit", a: 1, b: 5 }, { s: "Dodge", a: 1, b: 3 }];

  // ---- 敌人梯度（占位数值，待 sim 调平衡）----
  var ENEMIES = {
    thug: { name: "小混混", HP: 24, ATK: 6, DEF: 2, Crit: 3, CritDmg: 130, Hit: 80, Dodge: 5, ATKspd: 70, exp: 10 },
    bandit: { name: "土匪", HP: 40, ATK: 14, DEF: 5, Crit: 5, CritDmg: 140, Hit: 85, Dodge: 6, ATKspd: 100, exp: 25 },
    sect_novice: { name: "门派入门弟子", HP: 64, ATK: 20, DEF: 9, Crit: 8, CritDmg: 150, Hit: 90, Dodge: 8, ATKspd: 110, exp: 50 },
    xie_jiao: { name: "邪教教众", HP: 90, ATK: 30, DEF: 13, Crit: 10, CritDmg: 155, Hit: 92, Dodge: 10, ATKspd: 115, exp: 85 }, // 占位值，待莱布尼茨整体重调
    mo_jiao: { name: "魔教精英", HP: 130, ATK: 42, DEF: 18, Crit: 12, CritDmg: 160, Hit: 94, Dodge: 12, ATKspd: 120, exp: 130 }, // 占位值，待莱布尼茨整体重调
    gui_zu: { name: "黄泉鬼卒", HP: 190, ATK: 60, DEF: 24, Crit: 12, CritDmg: 165, Hit: 96, Dodge: 13, ATKspd: 120, exp: 200 },   // 5-6区(占位)
    yao_xiu: { name: "罗刹妖修", HP: 280, ATK: 88, DEF: 32, Crit: 14, CritDmg: 170, Hit: 98, Dodge: 15, ATKspd: 125, exp: 300 }, // 6-7区
    mo_jiang: { name: "九幽魔将", HP: 420, ATK: 130, DEF: 44, Crit: 15, CritDmg: 175, Hit: 100, Dodge: 16, ATKspd: 128, exp: 460 }, // 7-8区
    gu_mo: { name: "上古魔神", HP: 640, ATK: 195, DEF: 60, Crit: 16, CritDmg: 180, Hit: 104, Dodge: 18, ATKspd: 130, exp: 700 }   // 8-9区
  };
  // ---- 成长模型（历练等级 + 功法内功；占位，待 sim 调斜率）----
  var EXP_CURVE_MULT = 1;                                                          // 升级曲线系数(莱布尼茨可调:×3 收过度升级/软化早期faceroll,待WalyCai拍板)
  function nextExp(level) { return Math.round(50 * Math.pow(level, 1.5) * EXP_CURVE_MULT); } // 升到下一级所需经验
  function baseAttrs(level, neigong) {
    var lv = level || 1, ng = neigong || 1;
    return { HP: 80 + lv * 15 + ng * 10, ATK: 10 + lv * 2 + ng, DEF: 5 + lv + Math.floor(ng / 2), Crit: 5, CritDmg: 150, Hit: 88 + lv, Dodge: 5 + Math.floor(lv / 2), ATKspd: 100, Mana: 40 + lv * 6, Tough: 0 };
  }
  // 默认掉落配置（占位）
  var DROP = { potionRate: 0.35, potionHeal: 30, equipRate: 0.10, equipPool: ["wpn_iron_sword", "head_cloth", "body_cloth", "legs_cloth", "neck_lock", "belt_iron", "wpn_steel_saber", "legs_guard", "head_iron", "ring_jade", "body_softarmor"] };
  var GOLD_PER_EXP = 0.43; // 金币掉落=敌人经验×此系数（占位，待莱布尼茨按"金币/分钟"反推）
  var BOSS_HP_MULT = 4;    // boss血量总缩放(WalyCai:大幅增加boss血,让狂暴等限时技有用)。叠在各区 hpMult 上,单一旋钮,待莱布尼茨用挂机sim精校
  var SELL = { common: 8, fine: 20, superior: 55, epic: 150, legend: 400 }; // 装备售价基准(按稀有度,占位待莱布尼茨调)
  // 稀有度独立加权 roll（脱离模板，D2 风；@莱布尼茨 平衡报告①）
  var RARITY_WEIGHTS = [["common", 64], ["fine", 28], ["superior", 7], ["epic", 0.8], ["legend", 0.2]]; // 新手村(莱布尼茨报告②); 超高=绝品+秘传≈1%

  // ---- 可复现随机 (mulberry32) ----
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }

  // 各区稀有度权重(zoneIdx 0-4)：高区掉率向高稀有度倾斜(待莱布尼茨精调)
  // 小怪掉落稀有度按区(WalyCai: 高稀有 epic+legend 即使最高区也≤~10%, 别赶上boss; superior 适度涨)
  var ZONE_RARITY = [
    [["common", 70], ["fine", 25], ["superior", 4.5], ["epic", 0.4], ["legend", 0.1]],  // 0 牛家村  稀有~0.5%
    [["common", 62], ["fine", 29], ["superior", 7], ["epic", 1.5], ["legend", 0.5]],    // 1 幽密林  ~2%
    [["common", 54], ["fine", 32], ["superior", 10], ["epic", 3], ["legend", 1]],       // 2 青城派  ~4%
    [["common", 46], ["fine", 34], ["superior", 13], ["epic", 5], ["legend", 2]],       // 3 血刀门  ~7%
    [["common", 38], ["fine", 35], ["superior", 17], ["epic", 7], ["legend", 3]],       // 4 魔教总坛 ~10%
    [["common", 35], ["fine", 35], ["superior", 20], ["epic", 7], ["legend", 3]],       // 5 黄泉古道 ~10%(高区维持稀有≤10%,靠分级base拉强度)
    [["common", 32], ["fine", 36], ["superior", 22], ["epic", 7], ["legend", 3]],       // 6 罗刹海市
    [["common", 30], ["fine", 37], ["superior", 23], ["epic", 7], ["legend", 3]],       // 7 妖兽森林
    [["common", 28], ["fine", 38], ["superior", 24], ["epic", 7], ["legend", 3]],       // 8 九幽魔渊
    [["common", 26], ["fine", 39], ["superior", 25], ["epic", 7], ["legend", 3]]        // 9 天外魔域 (稀有仍≤10%,superior渐多)
  ];
  function rollRarity(rng, weights) {
    var W = weights || RARITY_WEIGHTS, tot = 0, i; for (i = 0; i < W.length; i++) tot += W[i][1];
    var r = rng() * tot; for (i = 0; i < W.length; i++) { if (r < W[i][1]) return W[i][0]; r -= W[i][1]; }
    return "common";
  }
  function rollDrop(rng, pool, weights) {
    var tid = pool[Math.floor(rng() * pool.length)];
    var rarity = rollRarity(rng, weights);         // 稀有度独立加权(可按区)，脱离模板
    var n = RARITY[rarity].affixes, p = AFFIX_POOL.slice(), affixes = [];
    for (var i = 0; i < n && p.length; i++) { var k = Math.floor(rng() * p.length), a = p.splice(k, 1)[0]; affixes.push({ s: a.s, v: a.a + Math.floor(rng() * (a.b - a.a + 1)) }); }
    return { id: tid, rarity: rarity, affixes: affixes };
  }

  function hitChance(atk, def) { var c = 0.6 + (atk.Hit - def.Dodge) * 0.01; return c < 0.3 ? 0.3 : (c > 0.99 ? 0.99 : c); } // 命中/闪避新公式待莱布尼茨K值确认后替换
  var CRIT_CAP = 50; // 暴击率有效上限(莱布尼茨)；溢出按2:1转暴伤。未来丹药/特殊技能可抬高
  var TOUGH_K = 120; // 韧性DR系数：暴击减免=min(75%, 韧性/(韧性+120))(莱布尼茨)
  function toughDR(t) { return Math.min(0.75, (t || 0) / ((t || 0) + TOUGH_K)); }
  function critResolve(crit, critDmg) { var c = crit || 0, cd = critDmg || 150, eff = Math.min(CRIT_CAP, c), over = Math.max(0, c - CRIT_CAP); return { crit: eff, critDmg: cd + over * 2 }; }
  function strike(rng, atk, def) {
    if (rng() > hitChance(atk, def)) return { hit: false, dmg: 0 };
    var dmg = Math.max(1, atk.ATK * 100 / (100 + def.DEF));
    var cr = critResolve(atk.Crit, atk.CritDmg);
    if (rng() < cr.crit / 100 * (1 - toughDR(def.Tough))) dmg *= cr.critDmg / 100; // 防守方韧性削暴击率
    return { hit: true, dmg: Math.round(dmg) };
  }

  // ---- 单局战斗结算 ----
  // cfg = { attrs, wave:[enemyId...], drop?, bagMax?, seed? }
  // 返回 { outcome, ttk, dmgDealt, dmgTaken, kills, drops, potionsUsed, hpRemaining, bagFull, events }
  function resolveCombat(cfg) {
    var rng = cfg.rng || mulberry32((cfg.seed == null ? 1 : cfg.seed) | 0);
    var drop = cfg.drop || DROP, bagMax = cfg.bagMax == null ? 20 : cfg.bagMax;
    var P = cfg.attrs, hpMax = P.HP, hp = hpMax;
    var bag = [], drops = [], potionsUsed = 0, kills = 0, dmgDealt = 0, dmgTaken = 0, t = 0, events = [], expGained = 0;
    var died = false, bagFull = false;
    var pInt = 1 / ((P.ATKspd || 100) / 100); // 玩家攻击间隔(秒)
    // 敌人来源：固定 wave（sim 受控测试）或 endless 持续刷怪直到背包满/0血（cfg.spawnPool）
    var spawnPool = cfg.spawnPool || ["thug"], cap = cfg.cap || 2000, wi = 0;
    function nextEnemyId() {
      if (cfg.wave) return wi < cfg.wave.length ? cfg.wave[wi++] : null;
      if (kills + 1 > cap) return null;            // 安全上限，防无敌时死循环
      return spawnPool[Math.floor(rng() * spawnPool.length)];
    }
    var eid;
    while ((eid = nextEnemyId()) != null) {
      var E = ENEMIES[eid]; if (!E) continue;
      var ehp = E.HP, eInt = 1 / ((E.ATKspd || 100) / 100), pT = pInt, eT = eInt;
      events.push({ t: t, type: "spawn", enemy: eid });
      while (ehp > 0 && hp > 0) {
        if (pT <= eT) { t += pT; eT -= pT; pT = pInt; var s = strike(rng, P, E); if (s.hit) { ehp -= s.dmg; dmgDealt += s.dmg; } events.push({ t: t, type: "phit", dmg: s.dmg, ehp: Math.max(0, ehp) }); }
        else { t += eT; pT -= eT; eT = eInt; var s2 = strike(rng, E, P); if (s2.hit) { hp -= s2.dmg; dmgTaken += s2.dmg; } events.push({ t: t, type: "ehit", dmg: s2.dmg, hp: Math.max(0, hp) }); }
      }
      if (hp <= 0) { died = true; events.push({ t: t, type: "death" }); break; }
      kills++; expGained += (E.exp || 0); events.push({ t: t, type: "kill", enemy: eid, exp: E.exp || 0 });
      if (rng() < drop.potionRate) { potionsUsed++; var before = hp; hp = Math.min(hpMax, hp + drop.potionHeal); events.push({ t: t, type: "potion", heal: hp - before }); }
      if (rng() < drop.equipRate) { if (bag.length < bagMax) { var it = rollDrop(rng, drop.equipPool); bag.push(it); drops.push(it); events.push({ t: t, type: "drop", item: it }); } else { bagFull = true; events.push({ t: t, type: "bagfull" }); break; } }
    }
    return {
      outcome: died ? "lose" : "win",
      ttk: Math.round(t * 100) / 100,
      dmgDealt: dmgDealt, dmgTaken: dmgTaken, kills: kills,
      drops: drops, potionsUsed: potionsUsed, expGained: expGained,
      hpRemaining: Math.max(0, Math.round(hp)), bagFull: bagFull,
      events: events
    };
  }

  // ============================================================
  // 实时近战模型：敌人按间隔刷新→走近→近战互攻；清怪慢→堆积→多只同揍伤害骤增。
  // createCombat(cfg).step(dt) 实时步进(线上画面用)；simulateRealtime(cfg) 无头跑到底(sim用)。
  // ============================================================
  function createCombat(cfg) {
    var rng = cfg.rng || mulberry32((cfg.seed == null ? 1 : cfg.seed) | 0);
    var drop = cfg.drop || DROP, bagMax = cfg.bagMax == null ? 20 : cfg.bagMax;
    var rw = cfg.rarityWeights || (cfg.zoneIdx != null && ZONE_RARITY[cfg.zoneIdx]) || null; // 各区稀有度权重(高区掉得更好)
    var enemyRegenPct = (0.2 + 0.05 * (cfg.zoneIdx || 0)) / 100; // 敌人每秒回血%maxHP(莱布尼茨温和版:轻DPS软底,挂机轻松盖过)
    var P0 = cfg.attrs;
    var lane = cfg.laneLen || 820, melee = cfg.meleeRange || 70, eSpeed = cfg.enemySpeed || 110;
    var spawnInt = cfg.spawnInterval || 1.8, maxField = cfg.maxOnField || 5; // 莱布尼茨终版(封顶90s/35杀,白板~25杀66%负伤)
    var spawnPool = cfg.spawnPool || ["thug"], cap = cfg.cap || 5000;
    var capTime = cfg.capTime || 0, capKills = cfg.capKills || 0; // 历练封顶(0=不限):时间秒/杀数,取先到
    var spawnTypes = cfg.spawnTypes || null, lvMin = cfg.lvMin || 1, lvMax = cfg.lvMax || 1; // 分区:类型池+等级区间(带级缩放)
    var bossFight = !!cfg.boss, bossKilled = false;
    var P = { hp: cfg.startHp != null ? Math.min(cfg.startHp, P0.HP) : P0.HP, hpMax: P0.HP, atkInt: 1 / ((P0.ATKspd || 100) / 100), cd: 0 }; // startHp=带伤出战(负伤有代价)
    var enemies = [], spawnCd = 0, uid = 1;
    var kills = 0, drops = [], bag = [], potions = 0, exp = 0, gold = 0, dmgDealt = 0, dmgTaken = 0, t = 0, done = false, outcome = null, bagFull = false, lastHit = null;
    // 主动技能(Phase4)：蓝量回复+自动释放
    var mana = 0, manaMax = P0.Mana || 0, manaRegen = cfg.manaRegen || 8;
    var abilities = (cfg.abilities || []).map(function (a) { return { id: a.id, type: a.type, cost: a.cost, cd: a.cd, mult: a.mult || 0, dur: a.dur || 0, hasteMult: a.hasteMult || 1, cdT: 0, lastT: -1e9 }; });
    var haste = 0, lastCast = null; // haste=狂暴剩余时间
    function leveledEnemy(id, lv) { // 敌人按等级缩放(占位系数,待莱布尼茨调)
      var b = ENEMIES[id]; if (!b) return null; var f = lv - 1;
      return { name: b.name, HP: Math.round(b.HP * (1 + 0.18 * f)), ATK: Math.round(b.ATK * (1 + 0.14 * f)), DEF: b.DEF + Math.round(0.6 * f), Crit: b.Crit, CritDmg: b.CritDmg, Hit: b.Hit, Dodge: Math.round(0.8 * lv), Tough: Math.round(0.8 * lv), ATKspd: b.ATKspd, exp: Math.round((b.exp || 0) * (1 + 0.3 * f)), lv: lv, type: id }; // 莱布尼茨温和版(前10层挂机向):闪避/韧性 0.8×lv
    }
    function mkEnemy(E, isBoss) { return { uid: uid++, id: E.type, hp: E.HP, hpMax: E.HP, x: lane, cd: isBoss ? 0.5 : 0.3, atkInt: 1 / ((E.ATKspd || 100) / 100), E: E, lv: E.lv || 1, isBoss: !!isBoss, anim: "idle", at: 0 }; }
    function spawn() {
      var E;
      if (spawnTypes) { var id = spawnTypes[Math.floor(rng() * spawnTypes.length)], lv = lvMin + Math.floor(rng() * (lvMax - lvMin + 1)); E = leveledEnemy(id, lv); }
      else { var id2 = spawnPool[Math.floor(rng() * spawnPool.length)], b = ENEMIES[id2]; if (b) E = { name: b.name, HP: b.HP, ATK: b.ATK, DEF: b.DEF, Crit: b.Crit, CritDmg: b.CritDmg, Hit: b.Hit, Dodge: b.Dodge, ATKspd: b.ATKspd, exp: b.exp, lv: 1, type: id2 }; }
      if (E) enemies.push(mkEnemy(E, false));
    }
    if (bossFight) { var bE = leveledEnemy(cfg.boss.type, cfg.boss.lv || lvMax); bE.HP = Math.round(bE.HP * (cfg.boss.hpMult || 8) * BOSS_HP_MULT); bE.ATK = Math.round(bE.ATK * (cfg.boss.atkMult || 1.6)); bE.exp = Math.round(bE.exp * 5); bE.name = (cfg.boss.name || "首领"); var bm = mkEnemy(bE, true); bm.bossId = cfg.boss.bossId; enemies.push(bm); }
    function nearest() { var best = null; for (var i = 0; i < enemies.length; i++) if (enemies[i].x <= melee + 1 && enemies[i].hp > 0) { if (!best || enemies[i].x < best.x) best = enemies[i]; } return best; }
    function killEnemy(e) {
      e.dead = true; kills++; exp += (e.E.exp || 0); gold += Math.round((e.E.exp || 0) * GOLD_PER_EXP * (e.isBoss ? 2 : 1)); // 金币=经验×系数(boss额外2x)，待莱布尼茨调
      if (e.isBoss) {
        bossKilled = true; done = true; outcome = "win";
        // boss 首杀必掉高品质(高稀有度,非高等级需求)
        if (bag.length < bagMax) { var bit = rollDrop(rng, drop.equipPool); var rs = ["superior", "epic", "epic", "legend"]; bit.rarity = rs[Math.floor(rng() * rs.length)]; var rn = RARITY[bit.rarity].affixes, pp = AFFIX_POOL.slice(), af = []; for (var z = 0; z < rn && pp.length; z++) { var kk = Math.floor(rng() * pp.length), aa = pp.splice(kk, 1)[0]; af.push({ s: aa.s, v: aa.a + Math.floor(rng() * (aa.b - aa.a + 1)) }); } bit.affixes = af; bit.lv = e.lv || 1; bag.push(bit); drops.push(bit); }
        return;
      }
      if (rng() < drop.potionRate) { potions++; P.hp = Math.min(P.hpMax, P.hp + drop.potionHeal); }
      if (rng() < drop.equipRate) { if (bag.length < bagMax) { var it = rollDrop(rng, drop.equipPool, rw); it.lv = e.lv || 1; bag.push(it); drops.push(it); } else { bagFull = true; done = true; outcome = "win"; } }
    }
    function step(dt) {
      if (done) return; t += dt; if (t > cap) { done = true; outcome = "win"; return; }
      if ((capTime && t >= capTime) || (capKills && kills >= capKills)) { done = true; outcome = "win"; return; } // 封顶收兵(保留战利品)
      if (!bossFight) { spawnCd -= dt; if (spawnCd <= 0 && enemies.length < maxField) { spawn(); spawnCd = spawnInt; } }
      else if (enemies.length === 0) { done = true; outcome = bossKilled ? "win" : "win"; return; }
      var i, e;
      for (i = 0; i < enemies.length; i++) { e = enemies[i]; if (e.x > melee) { e.x = Math.max(melee, e.x - eSpeed * dt); e.anim = "idle"; } if (enemyRegenPct > 0 && e.hp > 0 && e.hp < e.hpMax) e.hp = Math.min(e.hpMax, e.hp + e.hpMax * enemyRegenPct * dt); } // 敌人回血
      if (haste > 0) haste -= dt;
      P.cd -= dt * (haste > 0 ? 1.6 : 1); lastHit = null; lastCast = null; // 狂暴期间出手更快
      if (P.cd <= 0) { var tg = nearest(); if (tg) { var s = strike(rng, P0, tg.E); if (s.hit) { tg.hp -= s.dmg; dmgDealt += s.dmg; lastHit = { x: tg.x, dmg: s.dmg }; mana = Math.min(manaMax, mana + manaRegen); } tg.at = 0.18; P.cd = P.atkInt; if (tg.hp <= 0) killEnemy(tg); } }
      // 主动技能：蓝量回满后释放一个"最久未放"的就绪技能（避免低耗技能饿死高耗技能）
      for (i = 0; i < abilities.length; i++) if (abilities[i].cdT > 0) abilities[i].cdT -= dt;
      if (mana >= manaMax && enemies.length) {
        var pick = null; for (i = 0; i < abilities.length; i++) { var ab = abilities[i]; if (ab.cdT <= 0 && manaMax >= ab.cost && (!pick || ab.lastT < pick.lastT)) pick = ab; } // 最久未放的优先(轮换)
        if (pick) {
          if (pick.type === "aoe") { var atkEff = P0.ATK * 100 / 106, dd = Math.round(atkEff * pick.mult); for (var z = 0; z < enemies.length; z++) { var en = enemies[z]; if (en.x <= melee + 220 && !en.dead) { en.hp -= dd; dmgDealt += dd; if (en.hp <= 0) killEnemy(en); } } lastCast = { type: "aoe", id: pick.id, dmg: dd }; }
          else if (pick.type === "haste") { haste = pick.dur; lastCast = { type: "haste", id: pick.id }; }
          mana -= pick.cost; pick.cdT = pick.cd; pick.lastT = t;
        }
      }
      for (i = 0; i < enemies.length; i++) { e = enemies[i]; if (e.dead) continue; if (e.x <= melee) { e.cd -= dt; if (e.cd <= 0) { var s2 = strike(rng, e.E, P0); if (s2.hit) { P.hp -= s2.dmg; dmgTaken += s2.dmg; } e.cd = e.atkInt; e.at = 0.18; } } if (e.at > 0) e.at -= dt; }
      enemies = enemies.filter(function (q) { return !q.dead; });
      if (P.hp <= 0) { done = true; outcome = "lose"; }
    }
    return {
      step: step, isDone: function () { return done; },
      state: function () { return { P: P, enemies: enemies, kills: kills, t: t, lastHit: lastHit, lane: lane, melee: melee, mana: mana, manaMax: manaMax, haste: haste, lastCast: lastCast }; },
      result: function () { return { outcome: outcome || "win", ttk: Math.round(t * 100) / 100, kills: kills, drops: drops, expGained: exp, goldGained: gold, potionsUsed: potions, hpRemaining: Math.max(0, Math.round(P.hp)), bagFull: bagFull, bossKilled: bossKilled, dmgDealt: dmgDealt, dmgTaken: dmgTaken }; }
    };
  }
  function simulateRealtime(cfg) { var c = createCombat(cfg), dt = cfg.dt || 0.05, n = 0, lim = (cfg.cap || 5000) / dt + 10; while (!c.isDone() && n++ < lim) c.step(dt); return c.result(); }

  // 战力(CP) = √(DPS × EHP) ×10（@莱布尼茨 公式v1，互砍验证 ρ=0.99）。相对强度指数，用于 build/换装对比。
  function combatPower(a) {
    function cl(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
    var cr = critResolve(a.Crit, a.CritDmg); var critMult = 1 + (cr.crit / 100) * (cr.critDmg / 100 - 1); // 50封顶+溢出转暴伤,与strike一致
    var pHit = cl(0.6 + (a.Hit - 6) * 0.01, 0.3, 0.99);
    var atkEff = a.ATK * 100 / (100 + 6);
    var DPS = atkEff * (a.ATKspd / 100) * pHit * critMult;
    var eHitOnMe = cl(0.6 + (88 - a.Dodge) * 0.01, 0.3, 0.99);
    var EHP = a.HP * (100 + a.DEF) / 100 * (1 / eHitOnMe) * (1 + toughDR(a.Tough) * 0.5); // 韧性降被暴→更耐打,计入EHP
    return Math.round(Math.sqrt(DPS * EHP) * 10);
  }

  // ==== 功法数据(单一源) ====
  var GONGFA_MAXLV = 10;
  var GONGFA_SLOTS = [{ key: "nei", sys: "nei", name: "内功" }, { key: "wai1", sys: "wai", name: "外功一" }, { key: "wai2", sys: "wai", name: "外功二" }, { key: "qing", sys: "qing", name: "轻功" }];
  var GONGFA_TIERS = ["白", "绿", "蓝", "紫", "橙", "赤", "金", "玄", "天", "绝"];
  var GONGFA_TIER_COLOR = ["#cfcfcf", "#5fbf5f", "#5a9fe0", "#a060e0", "#e08a30", "#e05050", "#e0c040", "#40c8c0", "#c060a0", "#ff7040"];
  var GONGFA_LINES = [
    { sys: "nei", base: { passive: { HP: 6, Mana: 4 }, active: { HP: 18, Mana: 12, DEF: 3 } }, names: ["基础吐纳功", "小周天", "大周天", "紫府真气", "玄牝功", "先天罡气", "混元功", "太虚神功", "九转还丹", "无极玄功"] },
    { sys: "wai", base: { passive: { ATK: 1 }, active: { ATK: 3, Crit: 1, CritDmg: 3 } }, names: ["基础拳经", "罗汉拳", "伏虎劲", "崩山劲", "裂石掌", "金刚力", "霸王功", "破军势", "不灭金身", "战神决"] },
    { sys: "qing", base: { passive: { ATKspd: 1, Hit: 1 }, active: { ATKspd: 4, Hit: 3, Dodge: 2 } }, names: ["基础身法", "燕回身", "踏雪痕", "草上飞", "凌波微步", "追风步", "梯云纵", "缩地术", "天罡步", "御风诀"] }
  ];
  var GF_RATE_ADD = { Crit: 2, Hit: 2, Dodge: 1 }; // 率类每阶+固定(不×1.5)
  var GONGFA_TIER_MULT = 1.25; // 功法每阶加成倍率(WalyCai选A:数值收敛 ×1.5→×1.25, t9≈×7不再爆炸)；可调
  function gfScaleTier(o, t) { var r = {}, m = Math.pow(GONGFA_TIER_MULT, t); for (var k in o) r[k] = (GF_RATE_ADD[k] != null) ? (o[k] + GF_RATE_ADD[k] * t) : Math.max(1, Math.round(o[k] * m)); return r; }
  var GONGFA_TIER0_ID = { nei: "nei_tuna", wai: "wai_quan", qing: "qing_shen" };
  var GONGFA = [], GONGFA_BY = {};
  GONGFA_LINES.forEach(function (line) { for (var t = 0; t < 10; t++) { var g = { id: t === 0 ? GONGFA_TIER0_ID[line.sys] : line.sys + "_t" + t, name: line.names[t], sys: line.sys, tier: t, tierName: GONGFA_TIERS[t], color: GONGFA_TIER_COLOR[t], passive: gfScaleTier(line.base.passive, t), active: gfScaleTier(line.base.active, t), price: Math.round(240 * Math.pow(5, t)) }; GONGFA.push(g); GONGFA_BY[g.id] = g; } });
  function gongfaById(id) { return GONGFA_BY[id] || null; }
  function gfProfReq(lv) { return Math.round(40 * lv * lv); }
  // ==== 装备等级缩放 + itemStats(单一源) ====
  var GEAR_LV_SCALE = 0.12;
  function itemStats(it) { var t = EQUIP_TPL[it.tid]; if (!t) return {}; var s = {}, m = 1 + GEAR_LV_SCALE * ((it.lv || 1) - 1); for (var k in t.base) s[k] = Math.round(t.base[k] * m); (it.affixes || []).forEach(function (a) { s[a.s] = (s[a.s] || 0) + a.v; }); return s; }
  // ==== build → 实战(单一源)：game.js totalAttrs/abilities 与 @莱布尼茨 sim 共用 ====
  // build = {level, neigong, equipped:{slot:{tid,affixes,lv}}, skills:{nodeId:rank}, gongfa:{id:lv}, gongfaEquip:{nei,wai1,wai2,qing}}
  function buildToCombat(b) {
    b = b || {}; var sk = b.skills || {}, gf = b.gongfa || {}, ge = b.gongfaEquip || {};
    var a = baseAttrs(b.level || 1, b.neigong || 1);
    var eq = {}, eqp = b.equipped || {}; for (var slot in eqp) { var it = eqp[slot]; if (!it) continue; var s = itemStats(it); for (var k in s) eq[k] = (eq[k] || 0) + s[k]; }
    if (eq.ATK) eq.ATK *= 1 + (sk.equip_atk || 0) * 0.05; if (eq.HP) eq.HP *= 1 + (sk.equip_hp || 0) * 0.05;
    for (var k2 in eq) a[k2] = (a[k2] || 0) + eq[k2];
    a.HP += (sk.foundation || 0) * 15 + (sk.str_hp || 0) * 30; a.ATK += (sk.foundation || 0) * 2 + (sk.str_atk || 0) * 4; a.DEF += (sk.str_def || 0) * 3;
    a.Crit += (sk.crit || 0) * 2; a.CritDmg += (sk.critdmg || 0) * 10; a.Hit += (sk.hit || 0) * 3; a.ATKspd += (sk.atkspd || 0) * 3;
    a.ATK *= 1 + (sk.weapon_mastery || 0) * 0.03;
    for (var gid in gf) { var go = GONGFA_BY[gid], lv = gf[gid] || 0; if (!go || lv <= 0) continue; for (var pk in go.passive) a[pk] = (a[pk] || 0) + go.passive[pk] * lv; }
    GONGFA_SLOTS.forEach(function (sl) { var eid = ge[sl.key]; if (!eid) return; var go = GONGFA_BY[eid], lv = gf[eid] || 0; if (!go || lv <= 0) return; for (var ak in go.active) a[ak] = (a[ak] || 0) + go.active[ak] * lv; });
    a.ATK = Math.round(a.ATK); a.HP = Math.round(a.HP); a.DEF = Math.round(a.DEF); a.ATKspd = Math.round(a.ATKspd); a.Mana = Math.round(a.Mana);
    var ab = [], wr = sk.whirlwind || 0, br = sk.berserk || 0;
    if (wr > 0) ab.push({ id: "whirlwind", type: "aoe", cost: 40, cd: 6, mult: 0.5 + 0.3 * wr });
    if (br > 0) ab.push({ id: "berserk", type: "haste", cost: 50, cd: 12, dur: 5 });
    return { attrs: a, abilities: ab, manaRegen: 8 };
  }
  return { RARITY: RARITY, EQUIP_TPL: EQUIP_TPL, AFFIX_POOL: AFFIX_POOL, ENEMIES: ENEMIES, DROP: DROP, SELL: SELL, GONGFA: GONGFA, GONGFA_SLOTS: GONGFA_SLOTS, GONGFA_MAXLV: GONGFA_MAXLV, gongfaById: gongfaById, gfProfReq: gfProfReq, gfScaleTier: gfScaleTier, GEAR_LV_SCALE: GEAR_LV_SCALE, itemStats: itemStats, buildToCombat: buildToCombat, mulberry32: mulberry32, rollDrop: rollDrop, resolveCombat: resolveCombat, createCombat: createCombat, simulateRealtime: simulateRealtime, combatPower: combatPower, critResolve: critResolve, toughDR: toughDR, nextExp: nextExp, EXP_CURVE_MULT: EXP_CURVE_MULT, BOSS_HP_MULT: BOSS_HP_MULT, baseAttrs: baseAttrs };
});
