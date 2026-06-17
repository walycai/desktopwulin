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
    thug: { name: "小混混", HP: 40, ATK: 6, DEF: 2, Crit: 3, CritDmg: 130, Hit: 80, Dodge: 5, ATKspd: 70, exp: 10 },
    bandit: { name: "土匪", HP: 85, ATK: 14, DEF: 5, Crit: 5, CritDmg: 140, Hit: 85, Dodge: 6, ATKspd: 100, exp: 25 },
    sect_novice: { name: "门派入门弟子", HP: 130, ATK: 20, DEF: 9, Crit: 8, CritDmg: 150, Hit: 90, Dodge: 8, ATKspd: 110, exp: 50 }
  };
  // ---- 成长模型（历练等级 + 功法内功；占位，待 sim 调斜率）----
  function nextExp(level) { return Math.round(50 * Math.pow(level, 1.5)); }       // 升到下一级所需经验
  function baseAttrs(level, neigong) {
    var lv = level || 1, ng = neigong || 1;
    return { HP: 80 + lv * 15 + ng * 10, ATK: 10 + lv * 2 + ng, DEF: 5 + lv + Math.floor(ng / 2), Crit: 5, CritDmg: 150, Hit: 88 + lv, Dodge: 5 + Math.floor(lv / 2), ATKspd: 100 };
  }
  // 默认掉落配置（占位）
  var DROP = { potionRate: 0.35, potionHeal: 30, equipRate: 0.10, equipPool: ["wpn_iron_sword", "head_cloth", "body_cloth", "legs_cloth", "neck_lock", "belt_iron", "wpn_steel_saber", "legs_guard", "head_iron", "ring_jade", "body_softarmor"] };
  // 稀有度独立加权 roll（脱离模板，D2 风；@莱布尼茨 平衡报告①）
  var RARITY_WEIGHTS = [["common", 64], ["fine", 28], ["superior", 7], ["epic", 0.8], ["legend", 0.2]]; // 新手村(莱布尼茨报告②); 超高=绝品+秘传≈1%

  // ---- 可复现随机 (mulberry32) ----
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }

  function rollRarity(rng) {
    var tot = 0, i; for (i = 0; i < RARITY_WEIGHTS.length; i++) tot += RARITY_WEIGHTS[i][1];
    var r = rng() * tot; for (i = 0; i < RARITY_WEIGHTS.length; i++) { if (r < RARITY_WEIGHTS[i][1]) return RARITY_WEIGHTS[i][0]; r -= RARITY_WEIGHTS[i][1]; }
    return "common";
  }
  function rollDrop(rng, pool) {
    var tid = pool[Math.floor(rng() * pool.length)];
    var rarity = rollRarity(rng);                  // 稀有度独立加权，脱离模板
    var n = RARITY[rarity].affixes, p = AFFIX_POOL.slice(), affixes = [];
    for (var i = 0; i < n && p.length; i++) { var k = Math.floor(rng() * p.length), a = p.splice(k, 1)[0]; affixes.push({ s: a.s, v: a.a + Math.floor(rng() * (a.b - a.a + 1)) }); }
    return { id: tid, rarity: rarity, affixes: affixes };
  }

  function hitChance(atk, def) { var c = 0.6 + (atk.Hit - def.Dodge) * 0.01; return c < 0.3 ? 0.3 : (c > 0.99 ? 0.99 : c); }
  function strike(rng, atk, def) {
    if (rng() > hitChance(atk, def)) return { hit: false, dmg: 0 };
    var dmg = Math.max(1, atk.ATK * 100 / (100 + def.DEF));
    if (rng() < (atk.Crit || 0) / 100) dmg *= (atk.CritDmg || 150) / 100;
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
    var P0 = cfg.attrs;
    var lane = cfg.laneLen || 820, melee = cfg.meleeRange || 70, eSpeed = cfg.enemySpeed || 95;
    var spawnInt = cfg.spawnInterval || 1.3, maxField = cfg.maxOnField || 8;
    var spawnPool = cfg.spawnPool || ["thug"], cap = cfg.cap || 5000;
    var P = { hp: P0.HP, hpMax: P0.HP, atkInt: 1 / ((P0.ATKspd || 100) / 100), cd: 0 };
    var enemies = [], spawnCd = 0, uid = 1;
    var kills = 0, drops = [], bag = [], potions = 0, exp = 0, dmgDealt = 0, dmgTaken = 0, t = 0, done = false, outcome = null, bagFull = false, lastHit = null;
    function spawn() { var id = spawnPool[Math.floor(rng() * spawnPool.length)], E = ENEMIES[id]; if (!E) return; enemies.push({ uid: uid++, id: id, hp: E.HP, hpMax: E.HP, x: lane, cd: 0.3, atkInt: 1 / ((E.ATKspd || 100) / 100), E: E, anim: "idle", at: 0 }); }
    function nearest() { var best = null; for (var i = 0; i < enemies.length; i++) if (enemies[i].x <= melee + 1 && enemies[i].hp > 0) { if (!best || enemies[i].x < best.x) best = enemies[i]; } return best; }
    function killEnemy(e) {
      e.dead = true; kills++; exp += (e.E.exp || 0);
      if (rng() < drop.potionRate) { potions++; P.hp = Math.min(P.hpMax, P.hp + drop.potionHeal); }
      if (rng() < drop.equipRate) { if (bag.length < bagMax) { var it = rollDrop(rng, drop.equipPool); bag.push(it); drops.push(it); } else { bagFull = true; done = true; outcome = "win"; } }
    }
    function step(dt) {
      if (done) return; t += dt; if (t > cap) { done = true; outcome = "win"; return; }
      spawnCd -= dt; if (spawnCd <= 0 && enemies.length < maxField) { spawn(); spawnCd = spawnInt; }
      var i, e;
      for (i = 0; i < enemies.length; i++) { e = enemies[i]; if (e.x > melee) { e.x = Math.max(melee, e.x - eSpeed * dt); e.anim = "idle"; } }
      P.cd -= dt; lastHit = null;
      if (P.cd <= 0) { var tg = nearest(); if (tg) { var s = strike(rng, P0, tg.E); if (s.hit) { tg.hp -= s.dmg; dmgDealt += s.dmg; lastHit = { x: tg.x, dmg: s.dmg }; } tg.at = 0.18; P.cd = P.atkInt; if (tg.hp <= 0) killEnemy(tg); } }
      for (i = 0; i < enemies.length; i++) { e = enemies[i]; if (e.dead) continue; if (e.x <= melee) { e.cd -= dt; if (e.cd <= 0) { var s2 = strike(rng, e.E, P0); if (s2.hit) { P.hp -= s2.dmg; dmgTaken += s2.dmg; } e.cd = e.atkInt; e.at = 0.18; } } if (e.at > 0) e.at -= dt; }
      enemies = enemies.filter(function (q) { return !q.dead; });
      if (P.hp <= 0) { done = true; outcome = "lose"; }
    }
    return {
      step: step, isDone: function () { return done; },
      state: function () { return { P: P, enemies: enemies, kills: kills, t: t, lastHit: lastHit, lane: lane, melee: melee }; },
      result: function () { return { outcome: outcome || "win", ttk: Math.round(t * 100) / 100, kills: kills, drops: drops, expGained: exp, potionsUsed: potions, hpRemaining: Math.max(0, Math.round(P.hp)), bagFull: bagFull, dmgDealt: dmgDealt, dmgTaken: dmgTaken }; }
    };
  }
  function simulateRealtime(cfg) { var c = createCombat(cfg), dt = cfg.dt || 0.05, n = 0, lim = (cfg.cap || 5000) / dt + 10; while (!c.isDone() && n++ < lim) c.step(dt); return c.result(); }

  // 战力(CP) = √(DPS × EHP) ×10（@莱布尼茨 公式v1，互砍验证 ρ=0.99）。相对强度指数，用于 build/换装对比。
  function combatPower(a) {
    function cl(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
    var critMult = 1 + (a.Crit / 100) * (a.CritDmg / 100 - 1);
    var pHit = cl(0.6 + (a.Hit - 6) * 0.01, 0.3, 0.99);
    var atkEff = a.ATK * 100 / (100 + 6);
    var DPS = atkEff * (a.ATKspd / 100) * pHit * critMult;
    var eHitOnMe = cl(0.6 + (88 - a.Dodge) * 0.01, 0.3, 0.99);
    var EHP = a.HP * (100 + a.DEF) / 100 * (1 / eHitOnMe);
    return Math.round(Math.sqrt(DPS * EHP) * 10);
  }

  return { RARITY: RARITY, EQUIP_TPL: EQUIP_TPL, AFFIX_POOL: AFFIX_POOL, ENEMIES: ENEMIES, DROP: DROP, mulberry32: mulberry32, rollDrop: rollDrop, resolveCombat: resolveCombat, createCombat: createCombat, simulateRealtime: simulateRealtime, combatPower: combatPower, nextExp: nextExp, baseAttrs: baseAttrs };
});
