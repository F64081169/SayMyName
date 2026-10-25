'use strict';
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys, Sched = SW.Sched, H = SW.H;
  const S = () => SW.S;
  const nm = (id) => SW.name(id);
  const say = (w, t, e) => UI.say(w, t, e);
  const me = (t) => UI.say('me', t);
  const narr = (t) => UI.say('narr', t);
  const choose = (o, p) => UI.choose(o, p);
  const Acts = SW.Acts = {};

  // Run an interactive scene: pauses the world, closes the dialogue box afterwards, saves.
  SW.scene = async function (fn) {
    const was = UI.sceneActive;
    UI.sceneActive = true;
    try { return await fn(); } catch (e) { console.error(e); } finally {
      UI.closeDialog();
      if (!was) { UI.sceneActive = false; SW.save(true); setTimeout(() => SW.Dir && SW.Dir.tick(), 50); }
    }
  };

  SW.ACTS = {
    coffee: { name: '喝咖啡聊天', map: 'cafe', spots: ['t6', 'g2'], icon: '☕', dur: 60 },
    walk: { name: '河濱散步', map: 'city', spots: ['park3', 'park4'], icon: '🌇', dur: 60 },
    dinner: { name: '吃晚餐／喝一杯', map: 'bar', spots: ['booth2', 'booth2b'], icon: '🍽️', dur: 90 },
    gym: { name: '一起健身', map: 'gym', spots: ['center', 'yoga2'], icon: '🏋️', dur: 60 },
    jam: { name: '練團', map: 'studio', spots: ['guitar', 'center'], icon: '🎸', dur: 60 },
    cook: { name: '來我家吃飯', map: 'home', spots: ['dining', 'center'], icon: '🍳', dur: 90 },
  };
  const PREF = {
    mira: { coffee: 10, walk: 10, gym: 6, jam: -12, dinner: 0, cook: 6 },
    hsiu: { gym: 15, dinner: 10, jam: 4, coffee: 0, walk: -5, cook: 0 },
    pei: { jam: 20, dinner: 8, walk: 6, coffee: -8, gym: -5, cook: 8 },
    anson: { coffee: 10, walk: 12, cook: 15, dinner: 0, gym: -6, jam: 4 },
    lele: { dinner: 15, coffee: 10, cook: 6, walk: 4, gym: -2, jam: 2 },
    kai: { walk: 20, coffee: 10, dinner: 8, jam: 0, gym: -10, cook: 5 },
    yuna: { dinner: 12, walk: 6, coffee: 6, gym: 4, jam: -5, cook: 5 },
  };

  Sys.interact = function (tg) {
    if (!tg || UI.busy()) return;
    if (tg.type === 'npc') return Acts.npc(tg.id);
    return Acts.obj(tg.obj);
  };

  // ---------- NPC menu ----------
  Acts.others = (id) => SW.W.npcsHere().filter((o) => o !== id && SW.W.distTo(o) < 5);
  Acts.taken = function (id) {
    const st = S();
    if (st.p.partner && st.p.partner !== id) return 'player';
    if ((id === 'hsiu' || id === 'mira') && st.f.hsiuMira === 'couple') return id === 'hsiu' ? 'mira' : 'hsiu';
    if ((id === 'anson' || id === 'pei') && st.f.ansonPei === 'couple') return id === 'anson' ? 'pei' : 'anson';
    return null;
  };

  Acts.npc = async function (id) {
    const st = S(), ch = SW.CH[id], n = st.n[id];
    if (!ch.core && !ch.date) return Acts.minor(id);
    const story = SW.Dir.talkFor(id);
    const need = Acts.need(id);
    const griev = Acts.grievance(id);
    const gifts = Object.keys(st.p.inv).filter((k) => SW.ITEMS[k] && SW.ITEMS[k].gift);
    const r = st.rel[id];
    const near = Acts.others(id).filter((o) => SW.CH[o].core || o === 'zhe' || o === 'landlord');
    const items = [
      story ? { icon: '💬', t: story.label || `${ch.name}好像有話想說`, sub: '劇情', v: 'story', hot: true } : null,
      { icon: '🗨️', t: '聊天', sub: '聊聊近況', v: 'talk' },
      { icon: '😂', t: '開玩笑', sub: '冷笑話／吐槽／自嘲', v: 'joke' },
      { icon: '😏', t: '調情', sub: '看對方怎麼接', v: 'flirt' },
      griev ? { icon: '🙏', t: '道歉', sub: griev.text, v: 'apology' } : null,
      need ? { icon: '🤝', t: need.t, sub: need.sub, v: 'help' } : null,
      gifts.length ? { icon: '🎁', t: '送禮', sub: `包包裡有 ${gifts.length} 種禮物`, v: 'gift' } : null,
      { icon: '📅', t: '邀約', sub: '約時間做點什麼', v: 'invite' },
      st.p.follower === id ? { icon: '👋', t: '先各自行動', sub: '不再一起走', v: 'unfollow' } : { icon: '🚶', t: '一起走', sub: '請對方跟你一起移動', v: 'follow' },
      st.p.follower === id && Acts.placeActs().length ? { icon: '✨', t: '一起做點什麼', sub: '在這裡共同行動', v: 'joint' } : null,
      { icon: '🗣️', t: '八卦', sub: '交換消息、說秘密或澄清', v: 'gossip' },
      { icon: '👀', t: '觀察', sub: '看看對方現在的樣子', v: 'observe' },
      near.length ? { icon: '🎧', t: `假裝路過偷聽`, sub: `${ch.name}正在和${near.map(nm).join('、')}說話`, v: 'eaves' } : null,
      st.p.partner !== id && r.attract >= 55 && r.friend >= 50 ? { icon: '💌', t: '告白', sub: '說出你的心意', v: 'confess' } : null,
      st.p.partner === id ? { icon: '💔', t: '談談我們的關係', sub: '認真聊聊', v: 'breakup' } : null,
    ];
    const v = await UI.sheet(ch.name, `${ch.job}・現在：${n.act || '—'}`, items);
    if (!v) return;
    switch (v) {
      case 'story': return SW.Dir.run(story);
      case 'talk': return Acts.talk(id);
      case 'joke': return Acts.joke(id);
      case 'flirt': return Acts.flirt(id);
      case 'apology': return Acts.apologize(id, griev);
      case 'help': return need.run();
      case 'gift': return Acts.gift(id);
      case 'invite': return Acts.invite(id, false);
      case 'follow': return Acts.follow(id);
      case 'unfollow': st.p.follower = null; UI.toast(`${ch.name} 去忙自己的事了。`); return;
      case 'joint': return Acts.chooseJoint(id);
      case 'gossip': return Acts.gossip(id);
      case 'observe': return Acts.observe(id);
      case 'eaves': return Acts.eaves(id, near[0]);
      case 'confess': return Acts.confess(id);
      case 'breakup': return Acts.breakup(id);
    }
  };

  // ---------- talk ----------
  Acts.talk = async function (id) {
    const pick = SW.Talk.pick(id);
    await SW.scene(async () => {
      for (const ln of pick.lines) await say(ln[0], ln[1], ln[2]);
      if (pick.after) await pick.after();
    });
    const first = SW.dailyOnce('talk_' + id);
    Sys.ch(id, first ? { friend: 2, comfort: 2 } : { comfort: 0.5 }, true);
    if (first) Sys.npcCh(id, { mood: 3 });
  };

  // ---------- jokes ----------
  Acts.joke = async function (id) {
    const v = await UI.sheet('要開什麼玩笑？', '同一個玩笑，對不同的人、在不同的時候，效果完全不一樣。', [
      { icon: '🥶', t: '冷笑話', sub: '諧音梗，賭一把', v: 'pun' },
      { icon: '🔥', t: '吐槽對方', sub: '熟的人才敢', v: 'roast' },
      { icon: '🙃', t: '自嘲', sub: '拿自己開刀最安全？', v: 'self' },
    ]);
    if (!v) return;
    const st = S(), r = st.rel[id], ch = SW.CH[id], n = st.n[id];
    let score = (ch.humor[v] || 0) + (r.comfort - 40) / 20 - r.tension / 22 + (n.mood - 55) / 30 + (Math.random() * 1.6 - 0.8);
    const crowd = Acts.others(id).length;
    if (v === 'roast' && id === 'hsiu' && crowd) score -= 2.5;
    if (v === 'roast' && r.tension > 35) score -= 2;
    if (id === 'lele' && st.f.leleHeartbroken && v !== 'self') score -= 1.2;
    if (id === 'anson' && n.energy < 25) score -= 0.8;
    if (!SW.dailyOnce('joke_' + id)) score -= 1.2;
    const res = score > 1.5 ? 'good' : score > -0.2 ? 'ok' : 'bad';
    const j = SW.Talk.joke(id, v, res, crowd);
    await SW.scene(async () => {
      await me(j.mine);
      for (const ln of j.react) await say(ln[0], ln[1], ln[2]);
    });
    if (res === 'good') { Sys.ch(id, { friend: 3, comfort: 4, tension: -2 }); Sys.npcCh(id, { mood: 6 }); Sys.mood(3); }
    else if (res === 'ok') Sys.ch(id, { comfort: 1 }, true);
    else { Sys.ch(id, { tension: 7, comfort: -3, friend: -1 }); Sys.npcCh(id, { mood: -6 }); if (id === 'hsiu' && crowd) Sys.mem(id, '你當眾吐槽他，讓他很沒面子', -1, 'roastPublic', true); }
  };

  // ---------- flirting (consent-aware) ----------
  Acts.receptive = function (id) {
    const st = S(), r = st.rel[id];
    if (Acts.taken(id)) return false;
    if (st.f['rejected_' + id]) return false;
    let need = 26;
    if (id === 'hsiu' && st.f.hsiuMira !== 'over') need = 58;
    if (id === 'anson' && st.f.ansonPei !== 'over') need = 44;
    if (id === 'mira' && st.f.hsiuMira === 'couple') return false;
    if (id === 'lele' && st.f.leleHeartbroken) return false;
    return r.attract >= need && r.comfort >= 40 && r.tension < 40;
  };
  Acts.flirt = async function (id) {
    const v = await UI.sheet('怎麼調情？', '對方有權不接。看表情，不要硬來。', [
      { icon: '✨', t: '稱讚對方', sub: '真心誇獎', v: 'compliment' },
      { icon: '😏', t: '曖昧的玩笑', sub: '輕輕試探', v: 'tease' },
      { icon: '👁️', t: '認真看著對方說話', sub: '不說破', v: 'sincere' },
    ]);
    if (!v) return;
    const st = S(), r = st.rel[id];
    const ok = Acts.receptive(id);
    const declinedToday = SW.dailyHas('flirtNo_' + id);
    const f = SW.Talk.flirt(id, v, ok ? 'yes' : (st.f['rejected_' + id] || declinedToday ? 'firm' : 'soft'));
    await SW.scene(async () => {
      await me(f.mine);
      for (const ln of f.react) await say(ln[0], ln[1], ln[2]);
    });
    if (ok) {
      const gain = SW.dailyOnce('flirt_' + id) ? 6 : 2;
      Sys.ch(id, { attract: gain, comfort: 2 }); Sys.mood(4);
      if (st.p.partner && st.p.partner !== id && SW.W.present(st.p.partner)) { Sys.ch(st.p.partner, { trust: -12, tension: 14 }); Sys.mem(st.p.partner, `你在${nm(st.p.partner)}面前跟${nm(id)}調情`, -1, 'flirtInFront'); }
    } else if (st.f['rejected_' + id] || declinedToday) {
      Sys.ch(id, { tension: 8, comfort: -6 }); Sys.mem(id, '對方已經說不了，你還是繼續調情', -1, 'pushedFlirt', true);
    } else {
      SW.dailyOnce('flirtNo_' + id);
      Sys.ch(id, { comfort: -1 }, true);
    }
  };

  Acts.confess = async function (id) {
    const st = S(), r = st.rel[id];
    const yes = Acts.receptive(id) && r.attract >= 66 && r.trust >= 45 && r.comfort >= 55;
    const c = SW.Talk.confess(id, yes);
    await SW.scene(async () => {
      await narr('你深呼吸。這句話一說出口，就收不回來了。');
      const how = await choose([{ t: '「我喜歡你。不是朋友那種。」', v: 1 }, { t: '「我想試試看，我們不只是朋友。」', v: 2 }, { t: '（還是算了）', v: 0 }]);
      if (!how) { await narr('你把話吞了回去。也許還不是時候。'); return; }
      for (const ln of c) await say(ln[0], ln[1], ln[2]);
      if (yes) {
        st.p.partner = id; Sys.ch(id, { attract: 8, trust: 6, comfort: 6 });
        Sys.mem(id, `你向${nm(id)}告白，對方答應了`, 1, 'together');
        Sys.later(90, 'coupleNews', { id });
      } else {
        st.f['rejected_' + id] = true; Sys.ch(id, { attract: -10, comfort: -4, tension: 4 });
        Sys.mem(id, `你向${nm(id)}告白，對方溫柔地拒絕了`, 0, 'confessNo');
        await narr('被拒絕不代表一切結束。只是有些門，要用別的方式走進去。');
      }
    });
  };
  H.coupleNews = (d) => { Sys.msg('group', 'lele', `等一下？？？我剛剛聽說 ${SW.S.p.name} 跟${nm(d.id)}在一起了？？？？？`); Sys.msgLater(3, 'group', 'pei', '恭喜啦～請客請客🎉'); Sys.msgLater(6, 'group', 'hsiu', '……我就知道。'); };
  Acts.breakup = async function (id) {
    await SW.scene(async () => {
      await say(id, '怎麼了？你的表情好認真。');
      const v = await choose([{ t: '「我想我們還是當朋友比較好。」', v: 'end' }, { t: '「沒事，只是想說我很珍惜你。」', v: 'stay' }]);
      if (v === 'stay') { Sys.ch(id, { trust: 3, comfort: 3 }); await say(id, '……幹嘛突然這樣，害我很緊張。（笑）'); return; }
      S().p.partner = null; Sys.ch(id, { attract: -20, tension: 20, friend: -8, trust: -6 });
      await say(id, '……好。我需要一點時間。');
      Sys.mem(id, `你和${nm(id)}分手了`, -1, 'breakup');
    });
  };

  // ---------- gifts ----------
  Acts.gift = async function (id) {
    const st = S();
    const gifts = Object.keys(st.p.inv).filter((k) => SW.ITEMS[k] && SW.ITEMS[k].gift);
    const v = await UI.sheet(`送什麼給${nm(id)}？`, '每個人喜歡的東西不一樣。', gifts.map((k) => ({ icon: SW.ITEMS[k].icon, t: SW.ITEMS[k].name, sub: `剩 ${st.p.inv[k]}`, v: k })));
    if (!v) return;
    Sys.item(v, -1);
    const like = (SW.CH[id].likes || {})[v] || 0;
    const fresh = SW.dailyOnce('gift_' + id);
    const bday = id === 'pei' && T.day() === 1;
    const lines = SW.Talk.gift(id, v, like);
    await SW.scene(async () => { for (const ln of lines) await say(ln[0], ln[1], ln[2]); });
    const mult = (fresh ? 1 : 0.3) * (bday ? 2 : 1);
    if (like >= 2) Sys.ch(id, { friend: Math.round(5 * mult), comfort: Math.round(3 * mult), trust: Math.round(2 * mult) });
    else if (like === 1) Sys.ch(id, { friend: Math.round(3 * mult), comfort: Math.round(2 * mult) }, true);
    else if (like < 0) Sys.ch(id, { comfort: -2 }, true);
    if (like >= 2 && fresh) Sys.mem(id, `你送了${nm(id)}${SW.ITEMS[v].name}`, 1, 'gift_' + v, true);
    if (bday) S().f.peiBdayGift = v;
    Sys.npcCh(id, { mood: like * 4 });
  };

  // ---------- follow / invite ----------
  Acts.follow = async function (id) {
    const st = S(), n = st.n[id], base = Sched.base(id);
    if (base.busy && !/吃午餐/.test(base.act)) {
      await SW.scene(async () => { await say(id, SW.Talk.busyLine(id, base.act)); });
      return;
    }
    const r = st.rel[id];
    if (r.tension > 55 || r.friend < 25) { await SW.scene(async () => { await say(id, '……我現在想自己待著。'); }); return; }
    st.p.follower = id; delete n.approach;
    UI.toast(`🚶 ${nm(id)} 跟著你一起走。走到咖啡廳、公園、餐酒館、健身房、工作室或你家，可以一起做點什麼。`);
  };
  Acts.placeActs = function () {
    const map = S().p.map;
    return Object.entries(SW.ACTS).filter(([k, a]) => a.map === map && (k !== 'walk' || SW.W.get('city') && S().p.y > 28)).map(([k]) => k);
  };
  Acts.chooseJoint = async function (id) {
    const opts = Acts.placeActs();
    if (!opts.length) { UI.toast('這裡沒有適合一起做的事。'); return; }
    const v = await UI.sheet(`和${nm(id)}一起…`, '', opts.map((k) => ({ icon: SW.ACTS[k].icon, t: SW.ACTS[k].name, sub: `約 ${SW.ACTS[k].dur} 分鐘`, v: k })));
    if (!v) return;
    if (!(await Sys.confirmTime(SW.ACTS[v].dur, SW.ACTS[v].name))) return;
    return Acts.joint(id, v);
  };

  Acts.slots = function (byPhone) {
    const st = S(), now = st.t, d = T.day();
    const out = [];
    if (!byPhone) out.push({ abs: 'now', label: '現在就走', sub: '對方跟你一起移動' });
    else out.push({ abs: now + 30, label: '半小時後', sub: T.rel(now + 30) });
    const cand = [[d, '12:30', '今天中午 12:30'], [d, '18:30', '今天 18:30'], [d, '19:30', '今天晚上 19:30'], [d, '21:00', '今天 21:00'], [d + 1, '12:30', '明天中午 12:30'], [d + 1, '19:30', '明天晚上 19:30'], [d + 2, '19:30', `${T.dayName(d + 2)}晚上 19:30`], [d + 2, '14:00', `${T.dayName(d + 2)}下午 14:00`]];
    for (const [dd, hm, label] of cand) { const abs = T.at(dd, hm); if (abs > now + 25) out.push({ abs, label, sub: T.dayName(dd) }); }
    return out;
  };
  Acts.answer = function (id, actId, abs, romantic) {
    const st = S(), r = st.rel[id], n = st.n[id], A = SW.ACTS[actId];
    const when = abs === 'now' ? st.t : abs;
    const busy = abs === 'now' ? (Sched.base(id).busy && !/吃午餐/.test(Sched.base(id).act) ? Sched.base(id).act : null) : (Sched.busyAt(id, when) || Sched.busyAt(id, when + 45));
    if (busy) {
      let alt = null;
      for (let k = 1; k < 10; k++) { const t2 = (abs === 'now' ? st.t : when) + k * 90; const hm = t2 % 1440; if (hm < 9 * 60 || hm > 22 * 60) continue; if (Sched.freeAt(id, t2)) { alt = t2; break; } }
      return { ok: false, line: SW.Talk.busyLine(id, busy) + (alt ? `\n${T.rel(alt)}以後應該可以？` : '') };
    }
    const clash = st.prom.find((p) => p.status === 'pending' && p.who === id && Math.abs(p.from - when) < 120);
    if (clash) return { ok: false, line: `我們不是已經約了${T.rel(clash.from)}了嗎？` };
    if (A.map === 'home' && st.p.housing === 'shared' && st.p.roommate && st.p.roommate !== id && st.rel[st.p.roommate] && st.rel[st.p.roommate].tension > 50) return { ok: false, line: '你家……現在氣氛好像不太適合有客人吧？' };
    let score = r.friend * 0.6 + r.comfort * 0.4 - r.tension * 0.9 + ((PREF[id] || {})[actId] || 0) + (n.mood - 55) * 0.3;
    if (romantic) { if (Acts.taken(id)) return { ok: false, line: SW.Talk.romanticNo(id, true) }; score += (r.attract - 35) * 0.8; }
    if (id === 'lele' && st.f.leleHeartbroken) score += 25;
    if (id === 'anson' && n.energy < 25) score -= 12;
    if (SW.CH[id].date) score = 40 + r.attract * 0.6 + r.comfort * 0.4 - r.tension;
    const ok = score >= 48;
    return { ok, line: ok ? SW.Talk.inviteYes(id, actId, romantic) : (romantic ? SW.Talk.romanticNo(id, false) : SW.Talk.inviteNo(id, actId)) };
  };
  Acts.invite = async function (id, byPhone) {
    const st = S();
    const acts = Object.keys(SW.ACTS);
    const a = await UI.sheet(`約${nm(id)}…`, '對方會看自己的行程和心情決定。', acts.map((k) => ({ icon: SW.ACTS[k].icon, t: SW.ACTS[k].name, sub: SW.PLACES[SW.ACTS[k].map].name, v: k })));
    if (!a) return;
    const slot = await UI.sheet('什麼時候？', SW.ACTS[a].name, Acts.slots(byPhone).map((s) => ({ icon: '🕒', t: s.label, sub: s.sub, v: s.abs })));
    if (slot === null || slot === undefined) return;
    let romantic = !!SW.CH[id].date;
    if (!romantic && SW.CH[id].core && st.rel[id].attract >= 30) {
      const v = await UI.sheet('這算約會嗎？', '說清楚比較不會誤會。', [{ icon: '🙂', t: '朋友聚聚', v: 'f' }, { icon: '💗', t: '約會', sub: '讓對方知道你是認真的', v: 'r' }]);
      if (!v) return; romantic = v === 'r';
    }
    const ans = Acts.answer(id, a, slot, romantic);
    if (byPhone) {
      Sys.msg(id, 'me', `要不要${slot === 'now' ? '現在' : T.rel(slot)}一起${SW.ACTS[a].name}？${romantic ? '（約會的那種😳）' : ''}`);
      Sys.msgLater(2, id, id, ans.line);
      if (ans.ok) Acts.book(id, a, slot, romantic, true);
      return;
    }
    await SW.scene(async () => { await say(id, ans.line); });
    if (!ans.ok) { if (romantic) Sys.ch(id, { comfort: -1 }, true); return; }
    if (slot === 'now') { st.p.follower = id; st.f.pendingJoint = { id, act: a, romantic }; UI.toast(`🚶 ${nm(id)} 跟著你。一起去${SW.PLACES[SW.ACTS[a].map].name}吧！`); if (st.p.map === SW.ACTS[a].map) Acts.joint(id, a, { romantic }); return; }
    Acts.book(id, a, slot, romantic);
  };
  Acts.book = function (id, a, abs, romantic, quiet) {
    const A = SW.ACTS[a];
    const key = 'inv_' + id + '_' + abs;
    const spot = A.spots[0];
    Sched.override(id, abs - 15, abs + 70, A.map, A.map === 'home' ? 'dining' : spot, romantic ? '等你赴約' : '等你', key, { free: false });
    Sys.promise({ id: key, who: id, text: `和${nm(id)}${A.name}${romantic ? '（約會）' : ''}`, map: A.map, from: abs, until: abs + 60, kind: 'meet', auto: true, onKeep: 'inviteKept', act: a, romantic, ov: key, weight: romantic ? 12 : 9 });
    if (romantic) S().stats.dates++;
  };
  H.inviteKept = function (p) { setTimeout(() => Acts.joint(p.who, p.act, { romantic: p.romantic, promise: p.id }), 200); };

  // ---------- joint activities ----------
  Acts.joint = async function (id, actId, opt) {
    opt = opt || {};
    const st = S(), A = SW.ACTS[actId];
    if (UI.busy() && !UI.sceneActive) return;
    st.f.pendingJoint = null;
    st.p.follower = id;
    let result = 0;
    await SW.scene(async () => {
      await say(id, SW.Talk.jointIntro(id, actId, opt.romantic));
      result = await (Acts.J[actId] || Acts.J.coffee)(id, opt);
      await Acts.heart(id, opt.romantic);
      await Sys.advance(A.dur, `⏳ 你和${nm(id)}${A.name}……`);
      await say(id, SW.Talk.jointBye(id, actId, opt.romantic, result));
    });
    st.p.follower = null;
    if (opt.promise) Sched.clearOv(opt.promise);
    const first = !Sys.hasMem(id, 'joint_' + actId);
    Sys.ch(id, { friend: 4 + (result > 70 ? 2 : 0), comfort: 4, attract: opt.romantic ? 4 : 0, tension: -3 });
    Sys.mem(id, `和${nm(id)}一起${A.name}${opt.romantic ? '（約會）' : ''}`, 1, 'joint_' + actId, !first);
    Sys.npcCh(id, { mood: 8 }); Sys.mood(6);
  };
  Acts.J = {
    coffee: async (id) => {
      const price = 160;
      const v = await choose([{ t: `我請客（${U.money(price)}）`, v: 'treat' }, { t: '各付各的', v: 'split' }, { t: `${nm(id)}說要請你`, v: 'them' }]);
      if (v === 'treat') { Sys.money(-price); Sys.ch(id, { friend: 1 }, true); await say(id, '那我就不客氣了～下次換我。'); }
      else if (v === 'split') { Sys.money(-price / 2); }
      else { await say(id, SW.S.rel[id].comfort > 60 ? '好啦好啦，今天我請。' : '……我什麼時候說的？好啦，這次就請你。'); }
      Sys.energy(12);
      return 60;
    },
    walk: async (id, opt) => {
      const ev = U.pick(['rain', 'dog', 'sunset', 'friend']);
      if (ev === 'rain') {
        await narr('走到一半，突然下起了午後雷陣雨。');
        const v = await choose([{ t: '撐開你的折疊傘，靠近一點', v: 'share' }, { t: '拉著對方衝去便利商店躲雨', v: 'run' }, { t: '乾脆淋雨，笑得像白癡', v: 'dance' }]);
        if (v === 'share') { await say(id, opt.romantic ? '……你的傘也太小了吧。（但沒有走開）' : '你的傘只遮得住半個人欸。'); Sys.ch(id, { comfort: 3, attract: opt.romantic ? 3 : 1 }, true); }
        else if (v === 'run') { await say(id, '哈！差點滑倒！我的鞋全濕了啦！'); Sys.ch(id, { friend: 2 }, true); }
        else { await say(id, '你瘋了……（然後也跟著淋）好啦，這個我會記一輩子。'); Sys.ch(id, { comfort: 5 }, true); Sys.mem(id, '你們一起在河堤淋雨大笑', 1, 'rain', true); }
      } else if (ev === 'dog') {
        await narr('一隻流浪狗跟了你們一路，最後乾脆躺在你們腳邊。');
        const v = await choose([{ t: '蹲下來摸摸牠', v: 'pet' }, { t: '幫牠取名字', v: 'name' }]);
        if (v === 'name') { await say(id, `叫牠「${U.pick(['Bug', '韌體', '小沛二號', '週五'])}」好了。`); }
        else await say(id, '牠好像很喜歡你。動物都知道誰是好人。');
        Sys.ch(id, { comfort: 3 }, true);
      } else if (ev === 'sunset') {
        await narr('頭前溪的夕陽把整條河染成橘色。風很大，是新竹的風。');
        const v = await choose([{ t: '拿出手機幫對方拍照', v: 'photo' }, { t: '什麼都不說，一起看', v: 'quiet' }]);
        if (v === 'photo') await say(id, '拍好看一點喔！……欸這張不錯欸，傳給我。');
        else await say(id, '……謝謝你沒有一直講話。這樣很好。');
        Sys.ch(id, { comfort: 4, attract: opt.romantic ? 3 : 0 }, true);
      } else {
        const others = SW.CORE.filter((o) => o !== id);
        const o = U.pick(others);
        await narr(`你們在河堤遇到了${nm(o)}。`);
        await say(o, `欸？你們兩個怎麼會在一起散步？${opt.romantic ? '……喔～～～～' : ''}`);
        const v = await choose([{ t: `邀${nm(o)}一起走`, v: 'join' }, { t: '「我們剛好遇到而已。」', v: 'deny' }, { t: '大方承認在約會', v: 'own', if: !!opt.romantic }]);
        if (v === 'join') { Sys.ch(o, { friend: 3 }, true); await say(o, '好啊！不過我只走到便利商店。'); }
        else if (v === 'deny') { if (opt.romantic) { Sys.ch(id, { trust: -4, comfort: -3 }); await say(id, '……「剛好遇到」喔。'); } }
        else { Sys.ch(id, { trust: 4, attract: 3 }); await say(o, '好喔好喔，我什麼都沒看到。（拿出手機）'); Sys.learn(o, 'breakup', null, true); }
      }
      return 60;
    },
    dinner: async (id, opt) => {
      const v = await choose([{ t: '你決定菜單', v: 'me' }, { t: `讓${nm(id)}點`, v: 'them' }, { t: '一起看菜單討論', v: 'both' }]);
      const pr = 520; Sys.money(-pr);
      if (v === 'me') await say(id, SW.S.rel[id].comfort > 55 ? '你點的都是我愛吃的欸。你是不是偷偷觀察我？' : '嗯……也可以啦。');
      else if (v === 'them') await say(id, '那我要點炸物拼盤、鹹酥雞沙拉，還有……兩杯好日子特調！');
      else { await say(id, '欸這個看起來好怪，我們點來挑戰看看？'); Sys.ch(id, { comfort: 3 }, true); }
      if (opt.romantic) {
        const t = await choose([{ t: '舉杯：「敬今天。」', v: 'today' }, { t: '舉杯：「敬你。」', v: 'you' }]);
        await say(id, t === 'you' ? '……幹嘛啦。（臉紅）乾杯。' : '敬今天！乾杯～');
        if (t === 'you') Sys.ch(id, { attract: 3 }, true);
      }
      Sys.energy(20);
      return 70;
    },
    gym: async (id) => {
      const res = await SW.MG.timing({ title: `和${nm(id)}一起重訓`, rounds: 4, verb: '推！', labels: ['熱身', '深蹲', '臥推', '最後一組'], zone: 0.18 + S().p.skill.fitness * 0.012 });
      Sys.skill('fitness', 0.5); Sys.energy(-14); Sys.mood(6); S().stats.workouts++;
      if (id === 'hsiu') await say(id, res.score > 70 ? '……可以喔。下次比硬舉。' : '你這樣不行啦，核心要出力！來，我示範。');
      else await say(id, res.score > 70 ? '你今天狀態很好欸！' : '沒關係，有動就好！');
      return res.score;
    },
    jam: async (id) => {
      const res = await SW.MG.rhythm({ title: `和${nm(id)}練團`, len: 22, partner: id });
      Sys.skill('guitar', 0.5);
      if (id === 'pei') { await say(id, res.score > 75 ? '欸！你跟上我了！我們週五可以一起上台！' : '節奏再穩一點就好，我很喜歡你那段 solo。'); if (res.score > 75) S().f.peiJam = true; }
      else await say(id, res.score > 70 ? '我們是不是可以組團了？' : '好吵（稱讚）。');
      return res.score;
    },
    cook: async (id) => {
      const st = S();
      if (!Sys.has('groceries')) { await narr('冰箱空空的。你們臨時叫了外送。'); Sys.money(-300); return 40; }
      Sys.item('groceries', -1);
      const dish = await choose([{ t: '番茄炒蛋＋三杯雞（家常）', v: 'home' }, { t: '韓式部隊鍋（大份量）', v: 'pot' }, { t: '挑戰：舒芙蕾鬆餅', v: 'risky' }]);
      const res = await SW.MG.timing({ title: '一起做晚餐', rounds: 3, verb: '下鍋！', labels: ['切菜', '火候', '調味'], zone: (dish === 'risky' ? 0.11 : 0.16) + st.p.skill.cook * 0.012 });
      Sys.skill('cook', 0.5); st.stats.cooked++;
      if (res.score > 70) await say(id, dish === 'risky' ? '它……真的膨起來了！你是天才！' : '好好吃。我可以每週來嗎？');
      else await say(id, dish === 'risky' ? '這是……鬆餅的屍體嗎？（還是吃光了）' : '有點鹹，但我很喜歡。');
      Sys.energy(25);
      return res.score;
    },
  };

  // deep conversations unlock layer by layer
  Acts.heart = async function (id, romantic) {
    const st = S(), list = (SW.HEART || {})[id];
    const lv = st.f['heart_' + id] || 0;
    if (!list || lv >= list.length) { const p = SW.Talk.pick(id); for (const ln of p.lines.slice(0, 3)) await say(ln[0], ln[1], ln[2]); return; }
    const h = list[lv];
    if (!h.ok(st)) {
      const p = SW.Talk.pick(id); for (const ln of p.lines.slice(0, 2)) await say(ln[0], ln[1], ln[2]);
      await narr(h.hint || `（${nm(id)}好像還有很多話沒說。也許等你們更熟、更互相信任的時候。）`);
      return;
    }
    await h.run(romantic);
    st.f['heart_' + id] = lv + 1;
  };

  // ---------- grievances & apology ----------
  Acts.grievance = function (id) {
    const st = S();
    const br = st.prom.filter((p) => p.who === id && p.status === 'broken' && !st.f['apol_' + p.id] && st.t - p.done < 4 * 1440).pop();
    if (br) return { key: br.id, text: `為「${SW.tx(br.text)}」爽約`, kind: 'promise' };
    for (const f of Object.keys(SW.FACTS)) if (SW.FACTS[f].owner === id && st.f['leakFound_' + f] && !st.f['apol_leak_' + f]) return { key: 'leak_' + f, text: `把「${SW.FACTS[f].short}」說出去`, kind: 'leak' };
    if (st.rel[id] && st.rel[id].tension >= 30 && !SW.dailyHas('apol_' + id)) return { key: 'tension', text: '最近的不愉快', kind: 'tension' };
    return null;
  };
  Acts.apologize = async function (id, g) {
    const st = S();
    const v = await UI.sheet(`向${nm(id)}道歉`, g.text, [
      { icon: '🙇', t: '真心道歉', sub: '不找理由', v: 'sincere' },
      { icon: '🗯️', t: '解釋原因', sub: '說明你當時的狀況', v: 'explain' },
      { icon: '😅', t: '用玩笑帶過', sub: '賭對方會笑', v: 'joke' },
    ]);
    if (!v) return;
    const lines = SW.Talk.apology(id, v, g);
    await SW.scene(async () => { await me(lines.mine); for (const ln of lines.react) await say(ln[0], ln[1], ln[2]); });
    st.f['apol_' + g.key] = v; SW.dailyOnce('apol_' + id);
    Sys.ch(id, lines.fx);
  };

  // ---------- gossip ----------
  Acts.gossip = async function (id) {
    const st = S();
    const myFacts = Object.keys(st.knows.player).filter((f) => !Sys.knows(id, f) && SW.FACTS[f].owner !== id && !SW.FACTS[f].false);
    const rumors = Object.keys(st.knows.player).filter((f) => SW.FACTS[f].false && !Sys.knows(id, f));
    const theirRumors = Object.keys(st.knows[id] || {}).filter((f) => SW.FACTS[f] && SW.FACTS[f].false);
    const v = await UI.sheet('八卦', `${nm(id)}的嘴有多緊？說出去的話，可能會傳回當事人耳裡。`, [
      { icon: '👂', t: '最近有聽說什麼嗎？', v: 'ask' },
      myFacts.length || rumors.length ? { icon: '🤫', t: '跟你說一件事……', sub: '分享你知道的消息', v: 'tell' } : null,
      theirRumors.length ? { icon: '🧹', t: '澄清傳聞', sub: `${nm(id)}好像相信了某個謠言`, v: 'clear' } : null,
    ]);
    if (!v) return;
    if (v === 'ask') {
      const res = SW.Talk.gossipAsk(id);
      await SW.scene(async () => { for (const ln of res.lines) await say(ln[0], ln[1], ln[2]); });
      if (res.fact) Sys.learn('player', res.fact, id);
      return;
    }
    if (v === 'tell') {
      const all = myFacts.concat(rumors);
      const f = await UI.sheet('要說哪件事？', '秘密一旦說出口就收不回來。', all.map((k) => ({ icon: SW.FACTS[k].secret ? '🔒' : SW.FACTS[k].false ? '❓' : '📰', t: SW.FACTS[k].short, sub: SW.FACTS[k].secret ? '這是別人的秘密' : SW.FACTS[k].false ? '未證實的傳聞' : '', v: k })));
      if (!f) return;
      const res = SW.Talk.gossipTell(id, f);
      await SW.scene(async () => {
        for (const ln of res.pre || []) await say(ln[0], ln[1], ln[2]);
        if (res.stop) { const c = await choose([{ t: '還是說了', v: 1 }, { t: '「……你說得對，當我沒說。」', v: 0 }]); if (!c) { Sys.ch(id, { trust: 3 }, true); await say(id, '嗯。謝謝你。'); res.cancel = true; return; } }
        await me(SW.FACTS[f].text + '。');
        for (const ln of res.lines) await say(ln[0], ln[1], ln[2]);
      });
      if (res.cancel) return;
      Sys.tell(id, f);
      Sys.ch(id, res.fx || {}, true);
      if (SW.FACTS[f].secret) Sys.mem(id, `你告訴${nm(id)}：${SW.FACTS[f].short}`, 0, 'told_' + f, true);
      if (res.after) res.after();
      return;
    }
    if (v === 'clear') {
      const f = theirRumors[0], truth = SW.FACTS[f].truth;
      const c = await UI.sheet('怎麼澄清？', SW.FACTS[f].short, [
        { icon: '🧹', t: '「那只是謠言啦，不要亂傳。」', v: 'deny' },
        Sys.knows('player', truth) ? { icon: '🔓', t: '說出真相', sub: `會洩漏：${SW.FACTS[truth].short}`, v: 'truth' } : null,
      ]);
      if (!c) return;
      const res = SW.Talk.clearRumor(id, f, c);
      await SW.scene(async () => { for (const ln of res) await say(ln[0], ln[1], ln[2]); });
      Sys.forget(id, f); st.f['cleared_' + f + '_' + id] = true;
      if (c === 'truth') Sys.tell(id, truth);
      Sys.ch(id, { trust: 3 }, true);
    }
  };

  Acts.observe = async function (id) {
    const lines = SW.Talk.observe(id);
    await SW.scene(async () => { for (const l of lines) await narr(l); });
    SW.S.f['observed_' + id + '_' + T.day()] = true;
  };

  Acts.eaves = async function (a, b) {
    const res = SW.Talk.eaves(a, b);
    await SW.scene(async () => {
      await narr(`你假裝在看手機，慢慢靠近${nm(a)}和${nm(b)}……`);
      for (const ln of res.lines) await say(ln[0], ln[1], ln[2]);
      if (res.caught) { await narr(`${nm(a)}突然轉頭看到你。`); await say(a, '……你在那裡多久了？'); }
    });
    for (const f of res.learn || []) Sys.learn('player', f, a);
    if (res.caught) { Sys.ch(a, { trust: -4, tension: 4 }, true); Sys.ch(b, { trust: -3 }, true); }
    if (res.after) res.after();
  };

  // ---------- needs (help) ----------
  Acts.need = function (id) {
    const st = S(), n = st.n[id], m = st.p.map, wd = !T.weekend();
    if (SW.dailyHas('helped_' + id)) return null;
    if (id === 'mira' && m === 'office' && wd && /測試|報告|加班/.test(n.act)) {
      const pr = Sys.pending('miraTest');
      return { t: pr ? '幫米拉跑 regression（你答應的）' : '幫米拉跑一輪測試', sub: '約 60 分鐘・Debug 小遊戲', run: () => Acts.helpMira() };
    }
    if (id === 'hsiu' && m === 'office' && wd && /code/.test(n.act)) return { t: '幫阿修 review code', sub: '約 60 分鐘・Debug 小遊戲', run: () => Acts.helpHsiu() };
    if (id === 'hsiu' && m === 'studio' && Sys.knows('player', 'hsiuSong')) return { t: '陪阿修練歌', sub: '吉他伴奏・節奏小遊戲', run: () => SW.Dir.runById('hsiu_coach') };
    if (id === 'pei' && m === 'cafe' && /顧店|整理/.test(n.act)) return { t: '幫小沛顧店', sub: '約 60 分鐘・拉花時機遊戲', run: () => Acts.helpPei() };
    if (id === 'anson' && m === 'cafe' && /改作業/.test(n.act)) return { t: '幫安森改考卷', sub: '約 30 分鐘', run: () => Acts.helpAnson('grade') };
    if (id === 'anson' && m === 'church' && /準備|布置/.test(n.act)) return { t: '幫安森準備', sub: '約 60 分鐘・一起煮', run: () => Acts.helpAnson('church') };
    if (id === 'lele' && (st.f.leleHeartbroken || st.cafe.crowd)) return { t: st.cafe.crowd && Sys.knows('lele', 'lease') ? '幫樂樂寫募資文案' : '陪樂樂聊聊', sub: '約 45 分鐘', run: () => Acts.helpLele() };
    return null;
  };
  Acts.helpMira = async function () {
    if (!(await Sys.confirmTime(60, '幫米拉跑測試'))) return;
    SW.dailyOnce('helped_mira');
    const kept = !!Sys.pending('miraTest');
    let res;
    await SW.scene(async () => {
      await say('mira', kept ? '你來了。……我還以為你忘了。' : '真的假的？你要幫我？好，這台機器的 log 交給你。');
      res = await SW.MG.debug(SW.Puzzles.forHelp('mira'), { partner: 'mira', title: '幫米拉跑 regression' });
      await Sys.advance(60, '⏳ 你們盯著 regression 跑完……');
      await say('mira', res.solved ? (res.mistakes <= 1 ? '你抓到的那個 timeout 正是我卡住的地方。……謝了，真的。' : '雖然繞了點路，但測完了。謝謝你。') : '沒關係，至少我們排除了一半的可能。');
    });
    if (kept) Sys.keep('miraTest');
    Sys.ch('mira', { trust: kept ? 6 : 5, friend: 4, comfort: 2 });
    Sys.mem('mira', kept ? '你守約，下午三點準時幫米拉跑 regression' : '你主動幫米拉跑測試', 1, kept ? 'kept_test' : 'helped_test');
    S().stats.helped++; Sys.skill('debug', 0.3); Sys.energy(-8);
  };
  Acts.helpHsiu = async function () {
    if (!(await Sys.confirmTime(60, '幫阿修 review'))) return;
    SW.dailyOnce('helped_hsiu');
    let res;
    await SW.scene(async () => {
      await say('hsiu', '……我又沒說需要幫忙。（但把螢幕轉過來了）');
      res = await SW.MG.debug(SW.Puzzles.forHelp('hsiu'), { partner: 'hsiu', title: 'Review 阿修的 code' });
      await Sys.advance(60, '⏳ 你們吵了一個小時的 code style……');
      const v = await choose([{ t: '「這段寫得其實很漂亮。」', v: 'praise' }, { t: '「你看，我就說是這裡吧。」', v: 'gloat' }, { t: '什麼都不說，讓他自己 commit', v: 'quiet' }]);
      if (v === 'praise') { await say('hsiu', '……廢話。（耳朵紅了）'); Sys.ch('hsiu', { friend: 5, trust: 4 }); S().work.hsiuScore += 4; }
      else if (v === 'gloat') { await say('hsiu', '好啦好啦你最厲害。'); Sys.ch('hsiu', { tension: 5 }); S().work.perf += 1; }
      else { await say('hsiu', '……謝了。'); Sys.ch('hsiu', { trust: 3, friend: 2 }); S().work.hsiuScore += 2; }
    });
    Sys.mem('hsiu', '你幫阿修 review 了 code', 1, 'helped_review', true);
    S().stats.helped++; Sys.skill('debug', 0.3); Sys.energy(-8);
  };
  Acts.helpPei = async function () {
    if (!(await Sys.confirmTime(60, '幫忙顧店'))) return;
    SW.dailyOnce('helped_pei');
    await SW.scene(async () => {
      await say('pei', '真的？那你負責拉花，我負責跟客人聊天。');
      const res = await SW.MG.timing({ title: '轉角咖啡廳・拉花挑戰', rounds: 3, verb: '倒奶！', labels: ['愛心', '鬱金香', '天鵝（地獄級）'], zone: 0.15 + S().p.skill.cook * 0.01 });
      await Sys.advance(60, '⏳ 下午的客人一波接一波……');
      if (res.score > 70) await say('pei', '客人說你的天鵝很像……鵝。我覺得很棒！今天營業額比平常好。');
      else await say('pei', '你拉的愛心比較像……腎臟？哈哈，但客人都笑了。');
      S().cafe.fund += res.score > 70 ? 2200 : 1200;
    });
    Sys.ch('pei', { friend: 4, comfort: 3, trust: 2 }); Sys.npcCh('pei', { mood: 8 });
    Sys.mem('pei', '你幫小沛顧了一個下午的店', 1, 'helped_shop');
    S().stats.helped++; Sys.energy(-10);
  };
  Acts.helpAnson = async function (kind) {
    const mins = kind === 'grade' ? 30 : 60;
    if (!(await Sys.confirmTime(mins, '幫安森'))) return;
    SW.dailyOnce('helped_anson');
    await SW.scene(async () => {
      if (kind === 'grade') {
        await say('anson', '咦？不用啦，這是我的工作……好吧，那你幫我對選擇題的答案就好。');
        await Sys.advance(30, '⏳ 你們對完了三個班的選擇題……');
        await say('anson', '有個學生在背面畫了我。……畫得有點像耶。謝謝你，我今天可以早點睡了。');
      } else {
        await say('anson', '你可以幫我切菜嗎？我……其實從中午就沒坐下過。');
        const res = await SW.MG.timing({ title: '教會廚房・幫忙備餐', rounds: 3, verb: '切！', labels: ['高麗菜', '紅蘿蔔', '一百顆水餃'], zone: 0.17 + S().p.skill.cook * 0.01 });
        await Sys.advance(60, '⏳ 你們煮了二十人份的晚餐……');
        await say('anson', res.score > 60 ? '天啊，速度好快。這是我這週第一次覺得來得及。' : '有點手忙腳亂，但有你在，我心裡踏實很多。');
        S().f.ansonHelped = (S().f.ansonHelped || 0) + 1;
        Sys.keep('ansonFri');
      }
    });
    Sys.npcCh('anson', { energy: kind === 'grade' ? 12 : 22 });
    Sys.ch('anson', { friend: 4, trust: 3, comfort: 3 });
    Sys.mem('anson', kind === 'grade' ? '你幫安森改考卷' : '你在教會廚房幫安森備餐', 1, 'helped_anson');
    S().stats.helped++; Sys.energy(kind === 'grade' ? -4 : -10);
  };
  Acts.helpLele = async function () {
    if (!(await Sys.confirmTime(45, '陪樂樂'))) return;
    SW.dailyOnce('helped_lele');
    const st = S();
    await SW.scene(async () => {
      if (st.cafe.crowd && Sys.knows('lele', 'lease')) {
        await say('lele', '標題我想了三個：「救救轉角」、「我們還有地方可以坐嗎？」、「小沛的拿鐵不能沒有你」。你選！');
        const v = await choose([{ t: '「我們還有地方可以坐嗎？」', v: 'seat' }, { t: '「救救轉角」', v: 'save' }, { t: '「小沛的拿鐵不能沒有你」', v: 'latte' }]);
        await say('lele', v === 'seat' ? '……這個好。很像我們。我要哭了。' : v === 'save' ? '直白！有力！行銷之神點頭！' : '哈哈哈哈好啦這個會紅。');
        st.cafe.crowd += v === 'seat' ? 15000 : 9000;
        await Sys.advance(45, '⏳ 你們把募資頁面改到第七版……');
      } else {
        await say('lele', '你知道最慘的是什麼嗎？不是分手。是我還記得他咖啡要幾分糖。');
        const v = await choose([{ t: '靜靜聽她說完', v: 'listen' }, { t: '「他不值得你記得。」', v: 'bash' }, { t: '「要不要去吃好吃的？」', v: 'food' }]);
        if (v === 'listen') { await say('lele', '……謝謝你沒有急著幫我下結論。'); Sys.ch('lele', { trust: 5, comfort: 4 }); }
        else if (v === 'bash') { await say('lele', '……嗯。（但她好像沒有比較好）'); Sys.ch('lele', { friend: 1 }); }
        else { await say('lele', '你真的很懂我。鹹酥雞。現在。'); Sys.ch('lele', { friend: 4 }); Sys.money(-120); }
        await Sys.advance(45, false);
      }
    });
    Sys.npcCh('lele', { mood: 10 });
    Sys.mem('lele', '你陪樂樂度過難熬的時間', 1, 'helped_lele', true);
    st.stats.helped++;
  };

  // ---------- minor NPCs ----------
  Acts.minor = async function (id) {
    const st = S();
    const items = SW.Talk.minorMenu(id);
    const v = await UI.sheet(nm(id), SW.CH[id].job, items);
    if (!v) return;
    return SW.Talk.minorRun(id, v);
  };

  // ---------- objects ----------
  Acts.obj = async function (o) {
    const items = (SW.OBJ[o.kind] || (() => []))(o).filter(Boolean);
    if (!items.length) { UI.toast('現在沒什麼可以做的。'); return; }
    const v = await UI.sheet(`${o.icon || ''} ${o.label}`, SW.OBJ_SUB[o.kind] ? SW.OBJ_SUB[o.kind](o) : '', items);
    if (!v) return;
    const it = items.find((i) => i.v === v);
    if (it && it.run) return it.run();
  };

  // travel: phone map / YouBike
  Acts.travel = async function (fromPhone) {
    const st = S();
    const dests = ['office', 'home', 'cafe', 'church', 'gym', 'bar', 'studio', 'city'].filter((k) => k !== st.p.map);
    const v = await UI.sheet(fromPhone ? '前往…' : 'YouBike：騎去哪？', '移動會花一點時間', dests.map((k) => ({ icon: SW.PLACES[k].icon, t: SW.PLACES[k].name, sub: SW.PLACES[k].desc, v: k })));
    if (!v) return;
    if (v !== 'city' && !Sys.canEnter(v)) return;
    const mins = st.p.map === 'city' || v === 'city' ? 8 : 12;
    if (!(await Sys.confirmTime(mins, '移動'))) return;
    if (st.p.map === 'city' && !fromPhone) Sys.money(-10);
    await Sys.advance(mins, `🚲 ${fromPhone ? '移動中' : '騎 YouBike'}……`);
    SW.W.travelTo(v);
  };
})(window.SW);
