'use strict';
(function (SW) {
  const U = SW.U;
  SW.SAVE_KEY = 'shannons-world-save-v1';
  SW.VERSION = 2; // v2: first-person 3D city at 1 m per tile

  const BASE_REL = {
    mira: { friend: 55, trust: 50, attract: 8, comfort: 50, tension: 5 },
    hsiu: { friend: 45, trust: 40, attract: 5, comfort: 40, tension: 15 },
    pei: { friend: 60, trust: 48, attract: 18, comfort: 60, tension: 0 },
    anson: { friend: 50, trust: 55, attract: 10, comfort: 45, tension: 0 },
    lele: { friend: 55, trust: 40, attract: 10, comfort: 55, tension: 0 },
    kai: { friend: 5, trust: 10, attract: 15, comfort: 5, tension: 0 },
    yuna: { friend: 5, trust: 10, attract: 15, comfort: 5, tension: 0 },
  };
  const BASE_PAIRS = {
    'hsiu|mira': { friend: 50, attract: 45, tension: 40 },
    'anson|pei': { friend: 65, attract: 30, tension: 0 },
    'lele|pei': { friend: 72, attract: 0, tension: 0 },
    'hsiu|lele': { friend: 42, attract: 8, tension: 10 },
    'lele|mira': { friend: 48, attract: 0, tension: 18 },
    'anson|hsiu': { friend: 48, attract: 0, tension: 12 },
    'mira|pei': { friend: 62, attract: 0, tension: 0 },
    'hsiu|pei': { friend: 52, attract: 0, tension: 5 },
    'anson|mira': { friend: 56, attract: 0, tension: 0 },
    'anson|lele': { friend: 60, attract: 0, tension: 0 },
  };

  const BG = {
    engineer: { name: '工程師魂', desc: 'Debug 比較順，主管比較信任你。', apply: (S) => { S.p.skill.debug += 2; S.work.bossTrust += 8; } },
    social: { name: '社交咖', desc: '大家跟你相處都比較自在。', apply: (S) => { for (const k of SW.CORE) S.rel[k].comfort += 8; S.p.money += 0; } },
    guitar: { name: '文青吉他手', desc: '電吉他底子好，小沛特別欣賞你。', apply: (S) => { S.p.skill.guitar += 3; S.rel.pei.friend += 5; } },
    gym: { name: '健身狂', desc: '體力好、精神好，大熊教練認識你。', apply: (S) => { S.p.skill.fitness += 3; S.p.energy = 100; S.p.maxEnergyBonus = 10; } },
    couch: { name: '沙發馬鈴薯', desc: '很會休息，睡飽回血特別快。存款也比較多（因為都不出門）。', apply: (S) => { S.p.money += 6000; S.p.restBonus = 1; } },
  };
  SW.BACKGROUNDS = BG;

  SW.newState = function (opt) {
    const S = {
      v: SW.VERSION,
      t: 8 * 60 + 45,
      p: {
        name: opt.name || 'Shannon', pron: opt.pron || '她', look: opt.look, bg: opt.bg || 'engineer',
        housing: opt.housing || 'solo', roommate: opt.housing === 'shared' ? 'mira' : null,
        map: 'home', x: 3.5, y: 3.5, dir: 'down', energy: 85, mood: 60, money: 12000,
        skill: { debug: 2, guitar: 1, fitness: 1, cook: 1 }, inv: { coffee: 1 }, follower: null, partner: null,
        invest: { units: 0, cost: 0 }, maxEnergyBonus: 0, restBonus: 0,
      },
      rel: JSON.parse(JSON.stringify(BASE_REL)),
      pairs: JSON.parse(JSON.stringify(BASE_PAIRS)),
      n: {}, knows: { player: {} }, mem: [], prom: [], f: {}, fired: {}, fc: {}, q: [], ov: [],
      msgs: {}, unread: {}, log: [],
      work: { bossTrust: 50, perf: 0, legend: 0, warn: 0, hsiuScore: 50, bugsDone: [] },
      cafe: { fund: 40000, need: 150000, will: 50, plan: null, partner: null, petition: 0, promo: 0, crowd: 0, gig: 0, cut: 0, outcome: null, vouchers: 0 },
      dating: { app: false, seen: [], matches: [], chats: {} },
      market: { price: 100, hist: [100] },
      daily: {}, seenCards: {}, lastSave: 0,
      stats: { pranks: 0, bugs: 0, dates: 0, helped: 0, broken: 0, kept: 0, gigs: 0, church: 0, workouts: 0, cooked: 0, slacked: 0 },
    };
    for (const id of Object.keys(SW.CH)) { S.knows[id] = {}; S.n[id] = { map: 'away', x: 0, y: 0, act: '', mood: 60, energy: 80 }; }
    S.n.anson.energy = 55; // already overcommitted at the start of the week
    S.n.lele.mood = 65; S.n.pei.mood = 55;
    // what each NPC already knows on Monday morning
    S.knows.mira.party = { from: 'mira', t: 0 }; S.knows.hsiu.party = { from: 'mira', t: 0 }; S.knows.lele.party = { from: 'mira', t: 0 }; S.knows.anson.party = { from: 'mira', t: 0 };
    S.knows.pei.lease = { from: 'pei', t: 0 };
    S.knows.hsiu.hsiuSong = { from: 'hsiu', t: 0 };
    S.knows.mira.holiday = { from: 'mira', t: 0 };
    S.knows.anson.ansonTired = { from: 'anson', t: 0 }; S.knows.anson.ansonPei = { from: 'anson', t: 0 };
    S.knows.lele.rumorLele = { from: 'lele', t: 0 };
    if (S.p.roommate === 'mira') { S.rel.mira.comfort += 10; S.rel.mira.friend += 5; }
    const bg = BG[S.p.bg]; if (bg) bg.apply(S);
    return S;
  };

  SW.save = function (force) {
    if (!SW.S || SW.S.over) return false;
    if (!force && SW.UI && SW.UI.sceneActive) return false;
    try {
      SW.S.lastSave = Date.now();
      localStorage.setItem(SW.SAVE_KEY, JSON.stringify(SW.S));
      return true;
    } catch (e) { return false; }
  };
  SW.loadSave = function () {
    try { const raw = localStorage.getItem(SW.SAVE_KEY); if (!raw) return null; const s = JSON.parse(raw); return s && s.v === SW.VERSION ? s : null; } catch (e) { return null; }
  };
  SW.clearSave = function () { try { localStorage.removeItem(SW.SAVE_KEY); } catch (e) { /* storage blocked */ } };

  // Small helpers used everywhere
  SW.F = (k) => SW.S.f[k];
  SW.setF = (k, v) => { SW.S.f[k] = v === undefined ? true : v; };
  SW.name = (id) => (id === 'me' || id === 'player' ? SW.S.p.name : (SW.CH[id] ? SW.CH[id].name : id));
  SW.tx = (s) => String(s).replace(/\{N\}/g, SW.S.p.name).replace(/\{P\}/g, SW.S.p.pron);
  SW.dailyOnce = (key) => { const k = SW.T.day() + ':' + key; if (SW.S.daily[k]) return false; SW.S.daily[k] = 1; return true; };
  SW.dailyHas = (key) => !!SW.S.daily[SW.T.day() + ':' + key];
  U.noop = () => {};
})(window.SW);
