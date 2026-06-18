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
  var RARITY = { common: { name: "凡品", color: "#9a9a9a", affixes: 0 }, fine: { name: "精良", color: "#5fbf5f", affixes: 1 }, superior: { name: "上乘", color: "#5a9bff", affixes: 2 }, epic: { name: "绝品", color: "#b06bff", affixes: 3 }, legend: { name: "秘传", color: "#ffb43a", affixes: 4 } }; // 稀有度=词条数(白0/绿1/蓝2/紫3/橙4),基础属性不变,稀有度只加词条(WalyCai)
  // ---- 装备体系(WalyCai重构):等级=穿戴需求=装备强度;基础属性只看等级(平滑增长)、不看稀有度;命名每20级一档 ----
  var EQUIP_BRACKET = 20;
  function bracketOf(lv) { return Math.max(0, Math.min(4, Math.floor(((lv || 1) - 1) / EQUIP_BRACKET))); } // 5档:1-20/21-40/41-60/61-80/81-100+
  // 7部位:每部位5档名字 + 基础属性形态(lv1值,itemStats按等级平滑放大;同级所有稀有度基础一致)。base数值待莱布尼茨曲线
  var SLOT_DEF = {
    weapon: { type: "weapon", glyph: "⚔", names: ["铁剑", "精钢刀", "百炼宝刀", "玄铁重剑", "赤霄神兵"], base: { ATK: 18 } },
    head: { type: "head", glyph: "⛑", names: ["方巾", "铁盔", "精钢头铠", "玄武盔", "真武冠"], base: { DEF: 7, HP: 22 } },
    body: { type: "body", glyph: "🥋", names: ["布衣", "软猬甲", "锁子连环甲", "玄铁战甲", "龙鳞宝甲"], base: { DEF: 10, HP: 45 } },
    legs: { type: "legs", glyph: "🦵", names: ["粗布裤", "护腿", "精钢胫甲", "玄铁腿铠", "蟠龙护胫"], base: { DEF: 7, HP: 30 } },
    neck: { type: "neck", glyph: "📿", names: ["麻绳坠", "长命锁", "白玉佩", "龙纹项圈", "凤鸣玉璜"], base: { HP: 30 } },
    ring: { type: "ring", glyph: "💍", names: ["铜戒", "羊脂戒", "碧玉戒", "赤金戒", "盘龙宝戒"], base: { ATK: 8, HP: 15 } },
    belt: { type: "belt", glyph: "🎗", names: ["布带", "玄铁腰带", "精钢腰封", "蛟龙玉带", "紫金龙带"], base: { DEF: 6, HP: 18 } }
  };
  var EQUIP_TPL = {};
  for (var _sl in SLOT_DEF) EQUIP_TPL[_sl] = { name: SLOT_DEF[_sl].names[0], type: SLOT_DEF[_sl].type, glyph: SLOT_DEF[_sl].glyph, base: SLOT_DEF[_sl].base }; // 基础装 tid=部位
  // 套装件(专属,40级起;base也按等级走;数值/分布待莱布尼茨重做进新模型)
  var SET_ITEMS = {
    set_chixue_wpn: { name: "赤血刀", type: "weapon", glyph: "🗡", base: { ATK: 22 } }, set_chixue_body: { name: "赤血战甲", type: "body", glyph: "🥋", base: { HP: 50, DEF: 10 } }, set_chixue_legs: { name: "赤血护腿", type: "legs", glyph: "🦵", base: { DEF: 10, HP: 30 } }, set_chixue_belt: { name: "赤血腰带", type: "belt", glyph: "🎗", base: { HP: 36, DEF: 7 } },
    set_youlong_wpn: { name: "游龙剑", type: "weapon", glyph: "⚔", base: { ATK: 18 } }, set_youlong_head: { name: "游龙冠", type: "head", glyph: "⛑", base: { DEF: 8, HP: 20 } }, set_youlong_neck: { name: "游龙佩", type: "neck", glyph: "📿", base: { HP: 24 } }, set_youlong_ring: { name: "游龙戒", type: "ring", glyph: "💍", base: { ATK: 10, HP: 18 } },
    set_yantian_wpn: { name: "焰天杖", type: "weapon", glyph: "🪄", base: { ATK: 24, Mana: 20 } }, set_yantian_body: { name: "焰天袍", type: "body", glyph: "👘", base: { HP: 54, Mana: 24 } }, set_yantian_head: { name: "焰天冠", type: "head", glyph: "👑", base: { Mana: 30, DEF: 6 } }, set_yantian_ring: { name: "焰天戒", type: "ring", glyph: "💍", base: { ATK: 14, Mana: 22 } }
  };
  for (var _si in SET_ITEMS) EQUIP_TPL[_si] = SET_ITEMS[_si];
  function itemName(it) { var d = SLOT_DEF[it.tid]; return d ? d.names[bracketOf(it.lv)] : (EQUIP_TPL[it.tid] ? EQUIP_TPL[it.tid].name : it.tid); } // 基础装按等级档命名,套装件用专属名
  // 词条分层(莱布尼茨):第 i 条词条从 层0..层(i-1) 随机抽→暴击仅紫(3条)+、暴伤仅橙(4条)。基础三围flat随lv放大,率类词条不放大(GEAR_FLAT)
  var AFFIX_TIERS = [
    [{ s: "ATK", a: 1, b: 6 }, { s: "DEF", a: 1, b: 4 }, { s: "HP", a: 5, b: 25 }],   // 层0 基础(绿+)
    [{ s: "Hit", a: 1, b: 5 }, { s: "Dodge", a: 1, b: 3 }, { s: "ATKspd", a: 1, b: 3 }], // 层1 进阶(蓝+)
    [{ s: "Crit", a: 1, b: 3 }],                                                          // 层2 稀有(紫+)
    [{ s: "CritDmg", a: 5, b: 15 }]                                                       // 层3 极稀有(仅橙)
  ];
  var AFFIX_POOL = AFFIX_TIERS[0].concat(AFFIX_TIERS[1], AFFIX_TIERS[2], AFFIX_TIERS[3]); // 兼容旧引用

  // ---- 敌人梯度（占位数值，待 sim 调平衡）----
  var ENEMIES = {
    thug: { name: "小混混", HP: 24, ATK: 6, DEF: 2, Crit: 3, CritDmg: 130, Hit: 80, Dodge: 5, ATKspd: 70, exp: 10 },
    bandit: { name: "土匪", HP: 40, ATK: 14, DEF: 5, Crit: 5, CritDmg: 140, Hit: 85, Dodge: 6, ATKspd: 100, exp: 22 },
    sect_novice: { name: "门派入门弟子", HP: 64, ATK: 20, DEF: 9, Crit: 8, CritDmg: 150, Hit: 90, Dodge: 8, ATKspd: 110, exp: 40 },
    xie_jiao: { name: "邪教教众", HP: 90, ATK: 30, DEF: 13, Crit: 10, CritDmg: 155, Hit: 92, Dodge: 10, ATKspd: 115, exp: 65 }, // 占位值，待莱布尼茨整体重调
    mo_jiao: { name: "魔教精英", HP: 130, ATK: 42, DEF: 18, Crit: 12, CritDmg: 160, Hit: 94, Dodge: 12, ATKspd: 120, exp: 95 }, // 占位值，待莱布尼茨整体重调
    gui_zu: { name: "黄泉鬼卒", HP: 190, ATK: 60, DEF: 24, Crit: 12, CritDmg: 165, Hit: 96, Dodge: 13, ATKspd: 120, exp: 130 },   // 5-6区(占位)
    yao_xiu: { name: "罗刹妖修", HP: 280, ATK: 88, DEF: 32, Crit: 14, CritDmg: 170, Hit: 98, Dodge: 15, ATKspd: 125, exp: 170 }, // 6-7区
    mo_jiang: { name: "九幽魔将", HP: 420, ATK: 130, DEF: 44, Crit: 15, CritDmg: 175, Hit: 100, Dodge: 16, ATKspd: 128, exp: 210 }, // 7-8区
    gu_mo: { name: "上古魔神", HP: 640, ATK: 195, DEF: 60, Crit: 16, CritDmg: 180, Hit: 104, Dodge: 18, ATKspd: 130, exp: 260 }   // 8-9区
  };
  // ---- 成长模型（历练等级 + 功法内功；占位，待 sim 调斜率）----
  var EXP_CURVE_MULT = 4;                                                          // 升级曲线系数(莱布尼茨统一pass:×4慢升级=farm占时间;总长唯一旋钮,WalyCai要更长可×8≈9h/×12≈14h)
  function nextExp(level) { return Math.round(50 * Math.pow(level, 1.5) * EXP_CURVE_MULT); } // 升到下一级所需经验
  function baseAttrs(level, neigong) {
    var lv = level || 1, ng = neigong || 1;
    return { HP: 80 + lv * 15 + ng * 10, ATK: 10 + lv * 2 + ng, DEF: 5 + lv + Math.floor(ng / 2), Crit: 5, CritDmg: 150, Hit: 88 + lv, Dodge: 5 + Math.floor(lv / 2), ATKspd: 100, Mana: 40 + lv * 6, Tough: 0 };
  }
  // 默认掉落配置（占位）
  var DROP = { potionRate: 0.35, potionHeal: 30, equipRate: 0.10, equipPool: ["weapon", "head", "body", "legs", "neck", "ring", "belt"] }; // 掉落=随机部位,等级=怪等级,稀有度加权,词条数按稀有度
  var GOLD_PER_EXP = 0.0215; // 金币掉落=敌人经验×此系数(WalyCai:金币÷20,卖装备成主要金币源;0.43→0.0215。功法价是否同步降待A/B)
  var BOSS_HP_MULT = 1;    // boss血量全局缩放(默认1=中性)。各区 hpMult 才是莱布尼茨的逐图旋钮;此处保留一个全局总闸备用
  var ELITE = { hpMult: 2.5, atkMult: 1.5, defMult: 1.5, expMult: 2.5, dropMult: 2.5, qualityBonus: 1.5 }; // 精英怪(莱布尼茨终版):血×2.5·攻×1.5·防×1.5·经验×2.5·掉率×2.5·稀有度权重提升(高血低攻=可生还的高奖励赌注)
  // 套装:按穿戴件数触发加成(占位分组+数值,待莱布尼茨设计各档梯度)。更多装备加入后可扩更多套
  // 套装=专属稀有掉落(从源区低概率掉本套件)。Phase1三套·4件套(占weapon+3槽,抢槽=构建取舍)。2/4 bonus占位待莱布尼茨CP pass;6件marquee待200树触发设计
  var SET_DEFS = [
    { id: "chixue", name: "赤血战甲", line: "warrior_force", zone: 7, pieces: ["set_chixue_wpn", "set_chixue_body", "set_chixue_legs", "set_chixue_belt"], bonuses: { 2: { ATK: 60 }, 4: { ATK: 120, CritDmg: 30 } } }, // 妖兽森林(34-45),满4件+14%(攻+暴伤爆发)
    { id: "youlong", name: "百兵游龙", line: "warrior_arms", zone: 8, pieces: ["set_youlong_wpn", "set_youlong_head", "set_youlong_neck", "set_youlong_ring"], bonuses: { 2: { Crit: 8 }, 4: { Crit: 14, ATKspd: 16 } } }, // 九幽~lv50,满4件+13%(暴击连击核心)
    { id: "yantian", name: "赤焰天罗", line: "enchant_fire", zone: 9, pieces: ["set_yantian_wpn", "set_yantian_body", "set_yantian_head", "set_yantian_ring"], bonuses: { 2: { ATK: 90, Mana: 40 }, 4: { ATK: 200, ATKspd: 8 } } } // 天外~lv70,满4件+14%(内功攻击向)
  ];
  var SET_DROP_RATE = 0.15; // 在套装源区,掉落的装备有此概率是本套套件(占位待莱布尼茨)
  function setForZone(zi) { for (var i = 0; i < SET_DEFS.length; i++) if (SET_DEFS[i].zone === zi) return SET_DEFS[i]; return null; }
  function activeSets(equipped) { // 返回 [{set, count, applied:{stat}, grants:[{ext,lv}]}] 当前生效套装。skillGrant=6件marquee:某系技能+N(突破上限)
    var eqTids = {}, e = equipped || {}; for (var s in e) if (e[s]) eqTids[e[s].tid] = 1;
    var out = [];
    SET_DEFS.forEach(function (set) {
      var cnt = 0; set.pieces.forEach(function (t) { if (eqTids[t]) cnt++; }); if (cnt < 2) return;
      var applied = {}, grants = [];
      for (var th in set.bonuses) { if (cnt >= +th) { var b = set.bonuses[th]; for (var st in b) { if (st === "skillGrant") grants.push(b[st]); else applied[st] = (applied[st] || 0) + b[st]; } } }
      out.push({ set: set, count: cnt, applied: applied, grants: grants });
    });
    return out;
  }
  function extLineOf(id) { var p = ("" + id).split("_x_"); if (p.length < 2) return null; var rest = p[1], r = rest.substring(0, rest.lastIndexOf("_")); return p[0] + "_" + r; } // 扩展节点 id → 所属线 key(如 warrior_force / enchant_fire)
  // ---- 内功附魔流(第二树) 数值常量 —— 占位,待莱布尼茨精调+验平衡 ----
  // 内功附魔流全部可调数值,单一可变对象(莱布尼茨 sim 可注入 C.ENCH.xxx 精校;DoT 按敌人最大HP百分比/秒——flat在HP跨度大的游戏早期碾压晚期可忽略,%血全程相关对高血boss尤强=附魔克boss幻想)
  var ENCH = {
    range:    { base: 165, coef: 0.5 }, // 射程(像素)=base+coef×内功级别(WalyCai/莱布尼茨:基数≈3身位先手,系数小→功法多也缓慢加不爆炸。内功级0→reach235)。学了 range 根技能才生效
    chillCap: 0.5,                   // 冰冻减速/减命中封顶(防冰流无敌)
    burn:   { chance: 0.3, fireFlatPer: 1.5, dpsPer: 0.12, durRoot: 3, durPer: 1, ampPer: 0.2, canCrit: true }, // 炎=内功树输出系:灼烧dps=**内力等级×fireFlatPer 的定值真伤**(WalyCai:不带百分比掉血,和内力挂钩;无视防御;可暴击)。fire_blaze +dpsPer/级。对boss几乎无效=故意(boss交给毒)。fireFlatPer 待莱布尼茨sim校
    poison: { chance: 0.4, dpsRoot: 0.01, dpsPer: 0.003, durRoot: 6, durPer: 1.5, ampPer: 0.2, maxStacks: 5 }, // 毒=攻坚系:每层%maxHP/s,可叠最多5层(防无限秒boss),并抑制中毒敌回血。poison_plague堆时长持久向
    chill:  { chance: 0.3, mvRoot: 0.15, asRoot: 0.10, hitRoot: 0.10, mvPer: 0.04, deepPer: 0.04, dur: 3, durPer: 0.4, chancePer: 0.04 } // 冰:ice_frost根;ice_glacier +移速减/级;ice_freeze +攻速命中减/级;ice_permafrost +时长&几率/级。封顶 ENCH.chillCap
  };
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
  function mkAffixes(rng, rarity) { // 第i条词条从 层0..层(i-1) 抽,不重复属性→越多词条(越高稀有)才够到稀有层
    var n = RARITY[rarity].affixes, used = {}, af = [];
    for (var i = 1; i <= n; i++) {
      var pool = []; for (var t = 0; t < i && t < AFFIX_TIERS.length; t++) for (var j = 0; j < AFFIX_TIERS[t].length; j++) { var c = AFFIX_TIERS[t][j]; if (!used[c.s]) pool.push(c); }
      if (!pool.length) break;
      var a = pool[Math.floor(rng() * pool.length)]; used[a.s] = 1; af.push({ s: a.s, v: a.a + Math.floor(rng() * (a.b - a.a + 1)) });
    }
    return af;
  }
  function rollDrop(rng, pool, weights) {
    var tid = pool[Math.floor(rng() * pool.length)];
    var rarity = rollRarity(rng, weights);         // 稀有度独立加权(可按区)，脱离模板
    return { id: tid, rarity: rarity, affixes: mkAffixes(rng, rarity) }; // 分层词条
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
    var eliteChance = cfg.eliteChance || 0, dropQuality = cfg.dropQuality || 0; // 居家技能:精英概率 / 掉落高品率(权重提升)
    function qualityWeights(extra) { var base = rw || ZONE_RARITY[0]; if (!extra) return rw; var m = 1 + extra; return base.map(function (p) { return (p[0] === "common" || p[0] === "fine") ? p : [p[0], p[1] * m]; }); } // 提升 superior/epic/legend 权重
    var enemyRegenPct = (0.2 + 0.05 * (cfg.zoneIdx || 0)) / 100; // 敌人每秒回血%maxHP(莱布尼茨温和版:轻DPS软底,挂机轻松盖过)
    var P0 = cfg.attrs;
    var lane = cfg.laneLen || 820, melee = cfg.meleeRange || 70, eSpeed = cfg.enemySpeed || 110;
    var enchant = cfg.enchant || {}, reach = melee + (cfg.playerRange || 0); // 附魔流:on-hit debuff + 射程(玩家攻击触及距离,>melee=远程先手)
    var spawnInt = cfg.spawnInterval || 1.8, maxField = cfg.maxOnField || 40; // WalyCai:去掉"屏上最多5敌"限制,允许被怪堆死(40为性能安全上限,实战极少触及)
    var spawnPool = cfg.spawnPool || ["thug"], cap = cfg.cap || 5000;
    var capTime = cfg.capTime || 0, capKills = cfg.capKills || 0; // 历练封顶(0=不限):时间秒/杀数,取先到
    var spawnTypes = cfg.spawnTypes || null, lvMin = cfg.lvMin || 1, lvMax = cfg.lvMax || 1; // 分区:类型池+等级区间(带级缩放)
    var bossFight = !!cfg.boss, bossKilled = false;
    var P = { hp: cfg.startHp != null ? Math.min(cfg.startHp, P0.HP) : P0.HP, hpMax: P0.HP, atkInt: 1 / ((P0.ATKspd || 100) / 100), cd: 0 }; // startHp=带伤出战(负伤有代价)
    var playerRegen = cfg.playerRegen || 0, regenT = 0, lastHeal = 0; // 内功自动回血:战斗中持续回血(WalyCai:主要就是为了战斗回血)
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
    function mkEnemy(E, isBoss) { return { uid: uid++, id: E.type, hp: E.HP, hpMax: E.HP, x: lane, cd: isBoss ? 0.5 : 0.3, atkInt: 1 / ((E.ATKspd || 100) / 100), E: E, lv: E.lv || 1, isBoss: !!isBoss, elite: !!E.elite, anim: "idle", at: 0, deb: { burnDps: 0, burnT: 0, poiStacks: 0, poiDps: 0, poiT: 0, chillT: 0, chillMv: 0, chillAs: 0, chillHit: 0 } }; }
    function makeElite(E) { // 精英化:血/攻防经验提升,标记 elite(渲染放大)
      return { name: "精英·" + E.name, HP: Math.round(E.HP * ELITE.hpMult), ATK: Math.round(E.ATK * ELITE.atkMult), DEF: Math.round((E.DEF || 0) * ELITE.defMult), Crit: E.Crit, CritDmg: E.CritDmg, Hit: E.Hit, Dodge: E.Dodge, Tough: E.Tough, ATKspd: E.ATKspd, exp: Math.round((E.exp || 0) * ELITE.expMult), lv: E.lv, type: E.type, elite: true };
    }
    function spawn() {
      var E;
      if (spawnTypes) { var id = spawnTypes[Math.floor(rng() * spawnTypes.length)], lv = lvMin + Math.floor(rng() * (lvMax - lvMin + 1)); E = leveledEnemy(id, lv); }
      else { var id2 = spawnPool[Math.floor(rng() * spawnPool.length)], b = ENEMIES[id2]; if (b) E = { name: b.name, HP: b.HP, ATK: b.ATK, DEF: b.DEF, Crit: b.Crit, CritDmg: b.CritDmg, Hit: b.Hit, Dodge: b.Dodge, ATKspd: b.ATKspd, exp: b.exp, lv: 1, type: id2 }; }
      if (E) { if (eliteChance > 0 && rng() < eliteChance) E = makeElite(E); enemies.push(mkEnemy(E, false)); }
    }
    if (bossFight) { var bE = leveledEnemy(cfg.boss.type, cfg.boss.lv || lvMax); bE.HP = Math.round(bE.HP * (cfg.boss.hpMult || 8) * BOSS_HP_MULT); bE.ATK = Math.round(bE.ATK * (cfg.boss.atkMult || 1.6)); bE.exp = Math.round(bE.exp * 5); bE.name = (cfg.boss.name || "首领"); var bm = mkEnemy(bE, true); bm.bossId = cfg.boss.bossId; enemies.push(bm); }
    function nearest() { var best = null; for (var i = 0; i < enemies.length; i++) if (enemies[i].x <= reach + 1 && enemies[i].hp > 0) { if (!best || enemies[i].x < best.x) best = enemies[i]; } return best; } // 玩家触及 reach(含射程),敌人进场途中即可被打
    function applyEnchant(tg) { // 玩家命中→按附魔流概率施加 debuff(刷新时长,取较强值)
      if (enchant.burn && rng() < enchant.burn.chance) { var bd = enchant.burn.dps; if (enchant.burn.canCrit) { var cr = critResolve(P0.Crit || 0, P0.CritDmg || 0); if (rng() * 100 < cr.crit) bd *= (1 + cr.critDmg / 100); } tg.deb.burnDps = Math.max(tg.deb.burnDps, bd); tg.deb.burnT = enchant.burn.dur; } // 炎:定值伤害,可暴击(吃玩家暴击/暴伤)
      if (enchant.poison && rng() < enchant.poison.chance) { tg.deb.poiStacks = Math.min(enchant.poison.maxStacks || 5, (tg.deb.poiStacks || 0) + 1); tg.deb.poiDps = enchant.poison.dps; tg.deb.poiT = enchant.poison.dur; } // 毒:叠层(封顶)
      if (enchant.chill && rng() < enchant.chill.chance) { var cc = ENCH.chillCap; tg.deb.chillMv = Math.min(cc, enchant.chill.mv); tg.deb.chillAs = Math.min(cc, enchant.chill.as); tg.deb.chillHit = Math.min(cc, enchant.chill.hit); tg.deb.chillT = enchant.chill.dur; }
    }
    function killEnemy(e) {
      e.dead = true; kills++; exp += (e.E.exp || 0); gold += Math.round((e.E.exp || 0) * GOLD_PER_EXP * (e.isBoss ? 2 : 1)); // 金币=经验×系数(boss额外2x)，待莱布尼茨调
      if (e.isBoss) {
        bossKilled = true; done = true; outcome = "win";
        // boss 首杀必掉高品质(高稀有度,非高等级需求)
        if (bag.length < bagMax) { var bit = rollDrop(rng, drop.equipPool); var rs = ["superior", "epic", "epic", "legend"]; bit.rarity = rs[Math.floor(rng() * rs.length)]; var rn = RARITY[bit.rarity].affixes, pp = AFFIX_POOL.slice(), af = []; for (var z = 0; z < rn && pp.length; z++) { var kk = Math.floor(rng() * pp.length), aa = pp.splice(kk, 1)[0]; af.push({ s: aa.s, v: aa.a + Math.floor(rng() * (aa.b - aa.a + 1)) }); } bit.affixes = af; bit.lv = e.lv || 1; bag.push(bit); drops.push(bit); }
        return;
      }
      if (rng() < drop.potionRate) { potions++; P.hp = Math.min(P.hpMax, P.hp + drop.potionHeal); }
      var eqRate = drop.equipRate * (e.elite ? ELITE.dropMult : 1), qb = (e.elite ? ELITE.qualityBonus : 0) + dropQuality; // 精英:掉率↑+品质↑;居家技能掉落高品率也提品质
      if (rng() < eqRate) { if (bag.length < bagMax) { var zs = ((cfg.zoneIdx != null) && (e.lv || 1) >= 40) ? setForZone(cfg.zoneIdx) : null, it; if (zs && rng() < SET_DROP_RATE) { var stid = zs.pieces[Math.floor(rng() * zs.pieces.length)]; it = { id: stid, rarity: "epic", affixes: mkAffixes(rng, "epic"), lv: e.lv || 1 }; } else { it = rollDrop(rng, drop.equipPool, qualityWeights(qb)); it.lv = e.lv || 1; } bag.push(it); drops.push(it); } else { bagFull = true; done = true; outcome = "win"; } } // 套装源区:概率掉本套套件
    }
    function step(dt) {
      if (done) return; t += dt; if (t > cap) { done = true; outcome = "win"; return; }
      if ((capTime && t >= capTime) || (capKills && kills >= capKills)) { done = true; outcome = "win"; return; } // 封顶收兵(保留战利品)
      if (!bossFight) { spawnCd -= dt; if (spawnCd <= 0 && enemies.length < maxField) { spawn(); spawnCd = spawnInt; } }
      else if (enemies.length === 0) { done = true; outcome = bossKilled ? "win" : "win"; return; }
      var i, e;
      for (i = 0; i < enemies.length; i++) {
        e = enemies[i]; if (e.dead) continue;
        var mvMul = e.deb.chillT > 0 ? (1 - e.deb.chillMv) : 1;                 // 冰冻减移速
        if (e.x > melee) { e.x = Math.max(melee, e.x - eSpeed * dt * mvMul); e.anim = "idle"; }
        if (enemyRegenPct > 0 && e.hp > 0 && e.hp < e.hpMax && e.deb.poiT <= 0) e.hp = Math.min(e.hpMax, e.hp + e.hpMax * enemyRegenPct * dt); // 敌人回血(中毒时被抑制)
        if (e.deb.burnT > 0) { var bd = e.deb.burnDps * dt; e.hp -= bd; dmgDealt += bd; e.deb.burnT -= dt; }   // 灼烧DoT(定值/s,非百分比血,可暴击)
        if (e.deb.poiT > 0) { var pd = e.hpMax * e.deb.poiDps * e.deb.poiStacks * dt; e.hp -= pd; dmgDealt += pd; e.deb.poiT -= dt; if (e.deb.poiT <= 0) e.deb.poiStacks = 0; } // 中毒DoT(每层%maxHP/s×层数,封顶;到期清层)
        if (e.deb.chillT > 0) e.deb.chillT -= dt;
        if (e.hp <= 0 && !e.dead) killEnemy(e);                                  // DoT 可致死
      }
      if (haste > 0) haste -= dt;
      P.cd -= dt * (haste > 0 ? 1.6 : 1); lastHit = null; lastCast = null; lastHeal = 0; // 狂暴期间出手更快
      if (playerRegen > 0 && P.hp > 0) { regenT += dt; if (regenT >= 1) { var hAmt = Math.min(playerRegen, P.hpMax - P.hp); if (hAmt > 0) { P.hp += hAmt; lastHeal = Math.round(hAmt); } regenT -= 1; } } // 内功自动回血:每秒结算一次,显示+N
      if (P.cd <= 0) { var tg = nearest(); if (tg) { var s = strike(rng, P0, tg.E); if (s.hit) { tg.hp -= s.dmg; dmgDealt += s.dmg; lastHit = { x: tg.x, dmg: s.dmg }; mana = Math.min(manaMax, mana + manaRegen); applyEnchant(tg); } tg.at = 0.18; P.cd = P.atkInt; if (tg.hp <= 0) killEnemy(tg); } }
      // 主动技能：各技能独立 CD+固定耗蓝。选"最久未放的就绪技能"为下一个,蓝量够它才放、不够就攒(不放别的)→强制轮转,便宜技能不再饿死贵技能(WalyCai)
      for (i = 0; i < abilities.length; i++) if (abilities[i].cdT > 0) abilities[i].cdT -= dt;
      if (enemies.length) {
        var pick = null; for (i = 0; i < abilities.length; i++) { var ab = abilities[i]; if (ab.cdT <= 0 && (!pick || ab.lastT < pick.lastT)) pick = ab; } // CD就绪里最久未放优先(轮换顺序),不看蓝量
        if (pick && mana >= pick.cost) {
          if (pick.type === "aoe") { var atkEff = P0.ATK * 100 / 106, dd = Math.round(atkEff * pick.mult); for (var z = 0; z < enemies.length; z++) { var en = enemies[z]; if (en.x <= melee + 220 && !en.dead) { en.hp -= dd; dmgDealt += dd; if (en.hp <= 0) killEnemy(en); } } lastCast = { type: "aoe", id: pick.id, dmg: dd }; }
          else if (pick.type === "haste") { haste = pick.dur; lastCast = { type: "haste", id: pick.id }; }
          mana -= pick.cost; pick.cdT = pick.cd; pick.lastT = t;
        }
      }
      for (i = 0; i < enemies.length; i++) { e = enemies[i]; if (e.dead) continue; if (e.x <= melee) { var chilled = e.deb.chillT > 0; e.cd -= dt * (chilled ? (1 - e.deb.chillAs) : 1); if (e.cd <= 0) { var atkE = chilled && e.deb.chillHit ? { name: e.E.name, ATK: e.E.ATK, DEF: e.E.DEF, Crit: e.E.Crit, CritDmg: e.E.CritDmg, Hit: e.E.Hit * (1 - e.deb.chillHit), Dodge: e.E.Dodge, Tough: e.E.Tough } : e.E; var s2 = strike(rng, atkE, P0); if (s2.hit) { P.hp -= s2.dmg; dmgTaken += s2.dmg; } e.cd = e.atkInt; e.at = 0.18; } } if (e.at > 0) e.at -= dt; } // 冰冻:减敌攻速(cd走得慢)+减敌命中
      enemies = enemies.filter(function (q) { return !q.dead; });
      if (P.hp <= 0) { done = true; outcome = "lose"; }
    }
    return {
      step: step, isDone: function () { return done; },
      state: function () { return { P: P, enemies: enemies, kills: kills, t: t, lastHit: lastHit, lastHeal: lastHeal, lane: lane, melee: melee, mana: mana, manaMax: manaMax, haste: haste, lastCast: lastCast }; },
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
    { sys: "wai", base: { passive: { ATK: 1 }, active: { ATK: 3 } }, names: ["基础拳经", "罗汉拳", "伏虎劲", "崩山劲", "裂石掌", "金刚力", "霸王功", "破军势", "不灭金身", "战神决"] }, // 莱布尼茨:外功active去掉暴击/暴伤(暴击归装备)
    { sys: "qing", base: { passive: { ATKspd: 0.4, Hit: 1 }, active: { ATKspd: 2, Hit: 3, Dodge: 2 } }, names: ["基础身法", "燕回身", "踏雪痕", "草上飞", "凌波微步", "追风步", "梯云纵", "缩地术", "天罡步", "御风诀"] } // 莱布尼茨:轻功攻速 passive×0.4/active×0.5(攻速归装备)
  ];
  var GF_RATE_ADD = { Crit: 2, Hit: 2, Dodge: 1 }; // 率类每阶+固定(不×1.5)
  var GONGFA_TIER_MULT = 1.25; // 功法每阶加成倍率(WalyCai选A:数值收敛 ×1.5→×1.25, t9≈×7不再爆炸)；可调
  function gfScaleTier(o, t) { var r = {}, m = Math.pow(GONGFA_TIER_MULT, t); for (var k in o) r[k] = (GF_RATE_ADD[k] != null) ? (o[k] + GF_RATE_ADD[k] * t) : Math.round(o[k] * m); return r; } // 去掉 max(1) 底,允许削弱到<1/0(莱布尼茨:轻功攻速0.4等)
  var GONGFA_TIER0_ID = { nei: "nei_tuna", wai: "wai_quan", qing: "qing_shen" };
  var GONGFA = [], GONGFA_BY = {};
  function gfPrice(t) { return t <= 3 ? Math.round(240 * Math.pow(5, t)) : Math.round(30000 * Math.pow(3.5, t - 3)); } // 莱布尼茨:t0-3(240/1200/6000/紫30000),t4起×3.5/阶(橙10万/赤37万…长线gold sink,功法降为辅助)
  GONGFA_LINES.forEach(function (line) { for (var t = 0; t < 10; t++) { var g = { id: t === 0 ? GONGFA_TIER0_ID[line.sys] : line.sys + "_t" + t, name: line.names[t], sys: line.sys, tier: t, tierName: GONGFA_TIERS[t], color: GONGFA_TIER_COLOR[t], passive: gfScaleTier(line.base.passive, t), active: gfScaleTier(line.base.active, t), price: gfPrice(t) }; GONGFA.push(g); GONGFA_BY[g.id] = g; } });
  function gongfaById(id) { return GONGFA_BY[id] || null; }
  function gfProfReq(lv) { return Math.round(40 * lv * lv); }
  // ==== 装备等级缩放 + itemStats(单一源) ====
  var GEAR_LV_SCALE = 0.30; // 装备lv缩放(莱布尼茨:0.12→0.30,让高lv装备掉落=可感知CP跳变)
  var GEAR_THRESHOLDS = [{ minLv: 20, bonus: { ATK: 22, HP: 110 } }, { minLv: 40, bonus: { ATK: 55, HP: 300, ATKspd: 5 } }, { minLv: 60, bonus: { ATK: 130, HP: 700, CritDmg: 8 } }, { minLv: 80, bonus: { ATK: 200, HP: 1100 } }]; // 全身装备都≥门槛→累加被动(莱布尼茨:每档~13-17%,基础/提速/暴击/终极)
  var AFFIX_LV_SCALE = 0.1; // 词缀随装备lv放大→高lv高稀有=真jackpot
  var GEAR_FLAT = { ATK: 1, DEF: 1, HP: 1, Mana: 1 }; // 仅这些flat属性随lv缩放;率类(Crit/CritDmg/ATKspd/Hit/Dodge/Tough)不缩放保base值(莱布尼茨:防暴击随lv爆到上千%)
  function itemStats(it) { var t = EQUIP_TPL[it.tid]; if (!t) return {}; var lv = it.lv || 1, s = {}, m = 1 + GEAR_LV_SCALE * (lv - 1), am = 1 + AFFIX_LV_SCALE * (lv - 1); for (var k in t.base) s[k] = Math.round(t.base[k] * (GEAR_FLAT[k] ? m : 1)); (it.affixes || []).forEach(function (a) { s[a.s] = (s[a.s] || 0) + Math.round(a.v * (GEAR_FLAT[a.s] ? am : 1)); }); return s; }
  // ==== build → 实战(单一源)：game.js totalAttrs/abilities 与 @莱布尼茨 sim 共用 ====
  // build = {level, neigong, equipped:{slot:{tid,affixes,lv}}, skills:{nodeId:rank}, gongfa:{id:lv}, gongfaEquip:{nei,wai1,wai2,qing}}
  function neigongLevel(gf) { var s = 0; for (var gid in (gf || {})) s += gf[gid] || 0; return s; } // 内功级别=所有功法等级之和(WalyCai重定义,不再用打坐时间)
  // ---- 深度技能树扩展(WalyCai:每树3线~200节点,点数预算<<节点数→必取舍) ----
  // 每条线在原有手作节点之后再延伸 EXT_PER_ROUTE 层纯数值节点(eff加法,数值占位待莱布尼茨)。现有节点效果不动→不影响现有build CP
  var EXT_PER_ROUTE = 62;
  var SKILL_EXT_DEF = { // 每树3线:列/起始衔接的尾节点/主属性/每级加成(占位)/名
    warrior: [
      { route: "force", col: 0, tail: "whirlwind", stat: "ATK", per: 6, nm: "刚劲" },
      { route: "arms", col: 2, tail: "equip_atk", stat: "Crit", per: 1, nm: "技击" },
      { route: "body", col: 4, tail: "berserk", stat: "HP", per: 40, nm: "淬体" }
    ],
    enchant: [
      { route: "fire", col: 0, tail: "fire_conflag", stat: "ATK", per: 5, nm: "炎息" },
      { route: "ice", col: 2, tail: "ice_permafrost", stat: "ATKspd", per: 1, nm: "冰息" },
      { route: "poison", col: 4, tail: "poison_corrode", stat: "DEF", per: 4, nm: "毒息" }
    ]
  };
  var SKILL_EXT_EFF = {}; // {nodeId: {stat,per}} 供 buildToCombat 通用应用
  var STAT_CN = { ATK: "攻击", HP: "气血", DEF: "防御", Crit: "暴击率", CritDmg: "暴击伤害", Hit: "命中", ATKspd: "攻速", Mana: "内力", Dodge: "闪避", Tough: "韧性" };
  function genSkillExt(treeId, baseRow) {
    var out = [], defs = SKILL_EXT_DEF[treeId] || []; baseRow = baseRow || 5;
    defs.forEach(function (d) {
      var prev = d.tail, unit = (d.stat === "Crit" || d.stat === "CritDmg") ? "%" : "";
      var desc = (STAT_CN[d.stat] || d.stat) + " +" + d.per + unit + " / 级";
      for (var t = 0; t < EXT_PER_ROUTE; t++) {
        var id = treeId + "_x_" + d.route + "_" + t;
        SKILL_EXT_EFF[id] = { stat: d.stat, per: d.per };
        out.push({ id: id, name: d.nm + (t + 1) + "层", col: d.col, row: baseRow + t, max: 5, reqPts: 30 + t * 6, reqLv: Math.min(99, 14 + t * 1), prereq: [prev], eff: { stat: d.stat, per: d.per }, desc: desc, ext: true });
        prev = id;
      }
    });
    return out;
  }
  var SKILL_EXT_NODES = { warrior: genSkillExt("warrior", 5), enchant: genSkillExt("enchant", 5) };
  function buildToCombat(b) {
    b = b || {}; var sk = b.skills || {}, gf = b.gongfa || {}, ge = b.gongfaEquip || {};
    var ngLv = neigongLevel(gf);
    var a = baseAttrs(b.level || 1, ngLv);
    var eq = {}, eqp = b.equipped || {}; for (var slot in eqp) { var it = eqp[slot]; if (!it) continue; var s = itemStats(it); for (var k in s) eq[k] = (eq[k] || 0) + s[k]; }
    if (eq.ATK) eq.ATK *= 1 + (sk.equip_atk || 0) * 0.05; if (eq.HP) eq.HP *= 1 + (sk.equip_hp || 0) * 0.05;
    for (var k2 in eq) a[k2] = (a[k2] || 0) + eq[k2];
    a.HP += (sk.foundation || 0) * 15 + (sk.str_hp || 0) * 30; a.ATK += (sk.foundation || 0) * 2 + (sk.str_atk || 0) * 4; a.DEF += (sk.str_def || 0) * 3;
    a.Crit += (sk.crit || 0) * 2; a.CritDmg += (sk.critdmg || 0) * 10; a.Hit += (sk.hit || 0) * 3; a.ATKspd += (sk.atkspd || 0) * 3;
    a.ATK *= 1 + (sk.weapon_mastery || 0) * 0.03;
    for (var gid in gf) { var go = GONGFA_BY[gid], lv = gf[gid] || 0; if (!go || lv <= 0) continue; for (var pk in go.passive) a[pk] = (a[pk] || 0) + go.passive[pk] * lv; }
    GONGFA_SLOTS.forEach(function (sl) { var eid = ge[sl.key]; if (!eid) return; var go = GONGFA_BY[eid], lv = gf[eid] || 0; if (!go || lv <= 0) return; for (var ak in go.active) a[ak] = (a[ak] || 0) + go.active[ak] * lv; });
    var _sets = activeSets(eqp), skGrant = {}; // 套装技能授予(某系所有技能+N,突破上限)
    _sets.forEach(function (as) { (as.grants || []).forEach(function (g) { if (g && g.ext) skGrant[g.ext] = (skGrant[g.ext] || 0) + (g.lv || 0); }); });
    for (var xid in sk) { var xe = SKILL_EXT_EFF[xid], base = sk[xid] || 0; if (!xe || base <= 0) continue; var rk = base + (skGrant[extLineOf(xid)] || 0); a[xe.stat] = (a[xe.stat] || 0) + xe.per * rk; } // 扩展节点:已学等级 + 套装授予(只增已投入的技能,可超 max=突破上限)
    _sets.forEach(function (as) { for (var st in as.applied) a[st] = (a[st] || 0) + as.applied[st]; }); // 套装基础/战斗属性
    var eqItems = []; for (var es in eqp) if (eqp[es]) eqItems.push(eqp[es]); // 全身装备等级门槛被动:所有部位(8)都≥门槛→解锁累加被动(WalyCai)
    if (eqItems.length >= 8) { var minLv = 999; for (var ei = 0; ei < eqItems.length; ei++) minLv = Math.min(minLv, eqItems[ei].lv || 1); GEAR_THRESHOLDS.forEach(function (th) { if (minLv >= th.minLv) for (var bk in th.bonus) a[bk] = (a[bk] || 0) + th.bonus[bk]; }); }
    a.ATK = Math.round(a.ATK); a.HP = Math.round(a.HP); a.DEF = Math.round(a.DEF); a.ATKspd = Math.round(a.ATKspd); a.Mana = Math.round(a.Mana);
    var ab = [], wr = sk.whirlwind || 0, br = sk.berserk || 0;
    if (wr > 0) ab.push({ id: "whirlwind", type: "aoe", cost: 40, cd: 6, mult: 0.5 + 0.3 * wr });
    if (br > 0) ab.push({ id: "berserk", type: "haste", cost: 50, cd: 12, dur: 5 });
    // ---- 内功附魔流:on-hit debuff + 射程(第二树) ----
    var ench = {};
    if ((sk.fire_ignite || 0) > 0) ench.burn = { chance: ENCH.burn.chance, dps: ngLv * ENCH.burn.fireFlatPer * (1 + (sk.fire_blaze || 0) * ENCH.burn.dpsPer) * (1 + (sk.fire_conflag || 0) * ENCH.burn.ampPer), dur: ENCH.burn.durRoot + (sk.fire_inferno || 0) * ENCH.burn.durPer, canCrit: ENCH.burn.canCrit }; // 炎:定值真伤=内力等级×fireFlatPer(非百分比血),可暴击
    if ((sk.poison_venom || 0) > 0) ench.poison = { chance: ENCH.poison.chance, dps: (ENCH.poison.dpsRoot + (sk.poison_toxin || 0) * ENCH.poison.dpsPer) * (1 + (sk.poison_corrode || 0) * ENCH.poison.ampPer), dur: ENCH.poison.durRoot + (sk.poison_plague || 0) * ENCH.poison.durPer, maxStacks: ENCH.poison.maxStacks }; // 毒:每层dps,可叠 maxStacks 层
    if ((sk.ice_frost || 0) > 0) ench.chill = { chance: ENCH.chill.chance + (sk.ice_permafrost || 0) * ENCH.chill.chancePer, mv: ENCH.chill.mvRoot + (sk.ice_glacier || 0) * ENCH.chill.mvPer, as: ENCH.chill.asRoot + (sk.ice_freeze || 0) * ENCH.chill.deepPer, hit: ENCH.chill.hitRoot + (sk.ice_freeze || 0) * ENCH.chill.deepPer, dur: ENCH.chill.dur + (sk.ice_permafrost || 0) * ENCH.chill.durPer };
    var playerRange = (sk.range || 0) > 0 ? Math.round(ENCH.range.base + ENCH.range.coef * ngLv) : 0;
    return { attrs: a, abilities: ab, manaRegen: 8, enchant: ench, playerRange: playerRange, neigongLevel: ngLv };
  }
  return { RARITY: RARITY, EQUIP_TPL: EQUIP_TPL, AFFIX_POOL: AFFIX_POOL, ENEMIES: ENEMIES, DROP: DROP, SELL: SELL, GONGFA: GONGFA, GONGFA_SLOTS: GONGFA_SLOTS, GONGFA_MAXLV: GONGFA_MAXLV, gongfaById: gongfaById, gfProfReq: gfProfReq, gfScaleTier: gfScaleTier, GEAR_LV_SCALE: GEAR_LV_SCALE, itemStats: itemStats, buildToCombat: buildToCombat, mulberry32: mulberry32, rollDrop: rollDrop, resolveCombat: resolveCombat, createCombat: createCombat, simulateRealtime: simulateRealtime, combatPower: combatPower, critResolve: critResolve, toughDR: toughDR, nextExp: nextExp, EXP_CURVE_MULT: EXP_CURVE_MULT, BOSS_HP_MULT: BOSS_HP_MULT, neigongLevel: neigongLevel, ENCH: ENCH, ELITE: ELITE, SET_DEFS: SET_DEFS, activeSets: activeSets, SKILL_EXT_NODES: SKILL_EXT_NODES, SKILL_EXT_EFF: SKILL_EXT_EFF, itemName: itemName, bracketOf: bracketOf, SLOT_DEF: SLOT_DEF, GEAR_THRESHOLDS: GEAR_THRESHOLDS, mkAffixes: mkAffixes, AFFIX_TIERS: AFFIX_TIERS, baseAttrs: baseAttrs };
});
