'use strict';
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI;
  const Sys = SW.Sys = {};
  const H = SW.H = {};   // serializable handler registry: promises, queue items, message replies
  const R = SW.R = {};   // phone reply option sets
  const S = () => SW.S;
  const nm = (id) => SW.name(id);

  // ---------- relationships ----------
  Sys.rel = (id) => S().rel[id];
  Sys.ch = function (id, d, quiet) {
    const r = S().rel[id]; if (!r) return;
    for (const k of Object.keys(d)) if (r[k] !== undefined) r[k] = U.clamp(r[k] + d[k], 0, 100);
    if (quiet) return;
    const n = nm(id);
    if ((d.trust || 0) <= -7) UI.toast(`${n} 似乎對你有點失望。`, 'warn');
    else if ((d.tension || 0) >= 8) UI.toast(`你和 ${n} 之間的氣氛變僵了。`, 'warn');
    else if ((d.attract || 0) >= 6) UI.toast(`${n} 看你的眼神好像不太一樣了。`, 'love');
    else if ((d.trust || 0) >= 6) UI.toast(`${n} 更信任你了。`, 'mem');
    else if ((d.friend || 0) >= 6) UI.toast(`你和 ${n} 更親近了。`, 'mem');
    else if ((d.comfort || 0) >= 6) UI.toast(`${n} 跟你相處更自在了。`, 'mem');
    else if ((d.tension || 0) <= -8) UI.toast(`你和 ${n} 之間的結好像鬆開了一點。`, 'mem');
  };
  Sys.pair = (a, b) => { const k = U.pairKey(a, b); if (!S().pairs[k]) S().pairs[k] = { friend: 40, attract: 0, tension: 0 }; return S().pairs[k]; };
  Sys.pch = (a, b, d) => { const p = Sys.pair(a, b); for (const k of Object.keys(d)) p[k] = U.clamp((p[k] || 0) + d[k], 0, 100); };

  Sys.tiers = function (id) {
    const r = Sys.rel(id), out = [];
    if (!r) return out;
    out.push(r.friend < 25 ? ['有點疏遠', 'bad'] : r.friend < 45 ? ['普通朋友', ''] : r.friend < 65 ? ['朋友', 'good'] : r.friend < 80 ? ['好朋友', 'good'] : ['摯友', 'good']);
    out.push(r.trust < 30 ? ['不太信任你', 'bad'] : r.trust < 50 ? ['還在觀察你', ''] : r.trust < 70 ? ['信任你', 'good'] : ['什麼都願意跟你說', 'good']);
    out.push(r.comfort < 30 ? ['在你身邊有點拘謹', ''] : r.comfort < 55 ? ['相處還算自在', ''] : r.comfort < 75 ? ['跟你在一起很放鬆', 'good'] : ['在你面前完全不用演', 'good']);
    if (r.tension > 60) out.push(['你們之間有很大的心結', 'bad']); else if (r.tension > 35) out.push(['最近和你有點僵', 'bad']); else if (r.tension > 18) out.push(['偶爾有點小摩擦', 'bad']);
    if (S().p.partner === id) out.push(['交往中', 'love']);
    else if (r.attract > 70) out.push(['明顯對你有好感', 'love']); else if (r.attract > 50) out.push(['跟你說話時常常分心', 'love']); else if (r.attract > 32) out.push(['偶爾會多看你一眼', 'love']);
    return out;
  };

  // ---------- memories ----------
  Sys.mem = function (who, text, tone, tag, quiet) {
    who = [].concat(who);
    S().mem.push({ t: S().t, who, text: SW.tx(text), tone: tone || 0, tag: tag || null });
    if (!quiet) UI.toast(`💭 ${who.filter((w) => SW.CH[w]).map(nm).join('、')} 會記得這件事`, 'mem');
  };
  Sys.hasMem = (who, tag) => S().mem.some((m) => m.tag === tag && (!who || m.who.includes(who)));
  Sys.memsOf = (who) => S().mem.filter((m) => m.who.includes(who));
  Sys.log = (text) => S().log.push({ t: S().t, text: SW.tx(text) });

  // ---------- knowledge / gossip ----------
  Sys.knows = (who, f) => !!(S().knows[who] && S().knows[who][f]);
  Sys.learn = function (who, f, from, quiet) {
    const k = S().knows[who] || (S().knows[who] = {});
    if (k[f]) return false;
    const src = from && S().knows[from] && S().knows[from][f];
    k[f] = { from: from || null, t: S().t, origin: from === 'player' ? 'player' : src && src.origin ? src.origin : from || who };
    if (who === 'player' && !quiet) UI.toast(`📝 你得知：${SW.FACTS[f].short}`, 'mem');
    return true;
  };
  Sys.forget = (who, f) => { if (S().knows[who]) delete S().knows[who][f]; };
  // the player tells someone a fact
  Sys.tell = function (to, f) {
    const fact = SW.FACTS[f];
    Sys.learn(to, f, 'player', true);
    if (fact.secret && fact.owner && fact.owner !== to) {
      const key = 'leak_' + f; const arr = S().f[key] || []; if (!arr.includes(to)) arr.push(to); S().f[key] = arr;
      if (S().f['trust_' + f]) S().f['betray_' + f] = true; // the owner trusted the player with it
    }
  };
  // NPC-to-NPC spread; returns true if the owner discovered a leak traced to the player
  Sys.spreadGossip = function () {
    const st = S();
    const here = {};
    for (const id of SW.CORE) { const n = st.n[id]; if (n.map === 'away') continue; (here[n.map] = here[n.map] || []).push(id); }
    for (const ids of Object.values(here)) {
      if (ids.length < 2) continue;
      for (const a of ids) {
        const g = SW.CH[a].gossip || 0.1;
        for (const f of Object.keys(st.knows[a])) {
          const fact = SW.FACTS[f]; if (!fact) continue;
          const info = st.knows[a][f];
          if (fact.owner === a) continue; // owners keep their own secrets here
          if (f === 'party' && T.day() > 1) continue;
          for (const b of ids) {
            if (b === a || Sys.knows(b, f)) continue;
            if (b === fact.owner) {
              if (info.origin === 'player' && Math.random() < g * 0.6 && !st.f['leakFound_' + f]) {
                st.f['leakFound_' + f] = { by: a, t: st.t };
                Sys.ch(b, { trust: -14, tension: 14 }, true);
                Sys.mem(b, `從${nm(a)}那裡發現：你把「${fact.short}」說出去了`, -1, 'leak_' + f, true);
              }
              continue;
            }
            if (Math.random() < g * 0.35) Sys.learn(b, f, a);
          }
        }
      }
    }
  };

  // ---------- promises ----------
  Sys.promise = function (o) {
    const st = S();
    st.prom = st.prom.filter((p) => !(p.id === o.id && p.status === 'pending'));
    const p = Object.assign({ status: 'pending', made: st.t, kind: 'meet', auto: true }, o);
    st.prom.push(p);
    if (!o.quiet) UI.toast(`🤝 約定：${SW.tx(p.text)}（${p.kind === 'task' ? T.rel(p.until) + ' 前' : T.rel(p.from)}）`, 'mem');
    return p;
  };
  Sys.prom = (id) => { const l = S().prom.filter((p) => p.id === id); return l[l.length - 1] || null; };
  Sys.pending = (id) => { const p = Sys.prom(id); return p && p.status === 'pending' ? p : null; };
  Sys.keep = function (id, quiet) {
    const p = Sys.pending(id); if (!p) return false;
    p.status = 'kept'; p.done = S().t; S().stats.kept++;
    if (!quiet) Sys.ch(p.who, { trust: 3, friend: 2 }, true);
    if (p.onKeep && H[p.onKeep]) H[p.onKeep](p);
    return true;
  };
  Sys.breakP = function (id) {
    const p = Sys.pending(id); if (!p) return false;
    p.status = 'broken'; p.done = S().t; S().stats.broken++;
    const r = Sys.rel(p.who);
    if (r) Sys.ch(p.who, { trust: -(p.weight || 10), tension: Math.round((p.weight || 10) * 0.8), friend: -3 }, true);
    Sys.mem(p.who, p.breakText || `你答應「${p.text}」，最後卻沒出現`, -1, 'broke_' + p.id, true);
    UI.toast(`💔 你錯過了約定：${SW.tx(p.text)}`, 'warn');
    S().f['echo_' + p.id] = { who: p.who, t: S().t, text: p.text, kind: p.echo || 'generic' };
    if (p.onBreak && H[p.onBreak]) H[p.onBreak](p);
    return true;
  };
  Sys.cancelP = function (id) {
    const p = Sys.pending(id); if (!p) return;
    const lead = p.from - S().t;
    p.status = 'cancelled'; p.done = S().t;
    const pen = lead > 180 ? 2 : lead > 60 ? 4 : 7;
    Sys.ch(p.who, { trust: -pen, tension: Math.round(pen * 0.6) }, true);
    Sys.mem(p.who, `你提前跟${nm(p.who)}說「${p.text}」去不了`, 0, 'cancel_' + p.id, true);
    if (p.ov) SW.Sched.clearOv(p.ov);
    if (p.onCancel && H[p.onCancel]) H[p.onCancel](p, lead);
    return pen;
  };
  Sys.checkPromises = function () {
    const st = S();
    for (const p of st.prom) {
      if (p.status !== 'pending') continue;
      if (p.kind === 'meet' && p.auto && st.p.map === p.map && st.t >= p.from - 20 && st.t <= p.until && SW.W.present(p.who) && !UI.busy() && (p.map !== 'city' || SW.W.distTo(p.who) < 10)) {
        Sys.keep(p.id);
        continue;
      }
      if (st.t > p.until) { Sys.breakP(p.id); continue; }
      if (!p.reminded && p.kind === 'meet' && st.t >= p.from - 30 && st.t < p.from && st.p.map !== p.map) { p.reminded = true; UI.toast(`⏰ 30 分鐘後：${SW.tx(p.text)}（${(SW.PLACES[p.map] || {}).name || ''}）`, 'warn'); }
      if (!p.reminded && p.kind === 'task' && st.t >= p.until - 30 && st.t < p.until) { p.reminded = true; UI.toast(`⏰ 快到期了：${SW.tx(p.text)}`, 'warn'); }
    }
  };

  // ---------- messages ----------
  Sys.msg = function (thread, from, text, opt) {
    const st = S(); opt = opt || {};
    (st.msgs[thread] = st.msgs[thread] || []).push({ from, text: SW.tx(text), t: st.t, rk: opt.reply || null, rd: false, exp: opt.exp || null });
    if (from !== 'me' && !(SW.Phone && SW.Phone.viewing === thread)) {
      if (!opt.silent) st.unread[thread] = (st.unread[thread] || 0) + 1;
      if (!opt.silent) UI.msgToast(`💬 ${Sys.threadName(thread, from)}：${SW.tx(text).slice(0, 22)}${text.length > 22 ? '…' : ''}`);
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { /* no vibration */ }
    }
    if (SW.Phone && SW.Phone.refresh) SW.Phone.refresh();
  };
  Sys.threadName = (thread, from) => thread === 'group' ? `轉角老位子・${nm(from)}` : nm(from);
  Sys.msgLater = (mins, thread, from, text, reply, expMins) => Sys.later(mins, 'msg', { thread, from, text, reply, exp: expMins ? S().t + mins + expMins : null });
  H.msg = (d) => Sys.msg(d.thread, d.from, d.text, { reply: d.reply, exp: d.exp, silent: d.silent });
  // messages that still wait for a reply (not expired)
  Sys.pendingReplies = () => { const st = S(), out = []; for (const th of Object.keys(st.msgs)) { const l = st.msgs[th].filter((m) => m.rk && !m.rd); const m = l[l.length - 1]; if (m && (!m.exp || st.t <= m.exp)) out.push(th); } return out; };

  // ---------- queue ----------
  Sys.later = (mins, k, d) => S().q.push({ at: S().t + mins, k, d: d || {} });
  Sys.at = (abs, k, d) => S().q.push({ at: abs, k, d: d || {} });
  Sys.processQueue = function () {
    const st = S(); const due = st.q.filter((q) => q.at <= st.t);
    if (!due.length) return;
    st.q = st.q.filter((q) => q.at > st.t);
    for (const q of due) { if (H[q.k]) { try { H[q.k](q.d); } catch (e) { console.error('queue', q.k, e); } } }
  };

  // ---------- player stats ----------
  Sys.energy = (d) => { const p = S().p; p.energy = U.clamp(p.energy + d, 0, 100); };
  Sys.mood = (d) => { const p = S().p; p.mood = U.clamp(p.mood + d, 0, 100); };
  Sys.money = (d) => { S().p.money = Math.max(0, Math.round(S().p.money + d)); };
  // a purchase the player chose: refuses (and says so) instead of going into debt
  Sys.pay = (price) => { const m = S().p.money; if (m < price) { UI.toast(`💸 錢不夠（還差 ${U.money(price - m)}）`, 'warn'); return false; } Sys.money(-price); return true; };
  Sys.item = (id, d) => { const inv = S().p.inv; inv[id] = (inv[id] || 0) + (d === undefined ? 1 : d); if (inv[id] <= 0) delete inv[id]; };
  Sys.has = (id) => (S().p.inv[id] || 0) > 0;
  Sys.skill = (k, d) => { const s = S().p.skill; s[k] = U.clamp((s[k] || 0) + d, 0, 10); if (d >= 0.5) UI.toast(`📈 ${{ debug: 'Debug', guitar: '吉他', fitness: '體能', cook: '廚藝' }[k]}技巧提升了`, ''); };

  // ---------- time ----------
  let lastHour = null;
  Sys.tick = function (mins, instant) {
    const st = S();
    const before = st.p.energy;
    st.p.energy = U.clamp(st.p.energy - mins / 16, 0, 100);
    if (before > 15 && st.p.energy <= 15 && !instant) UI.toast('🥱 你好累。吃點東西、喝杯咖啡，或回家睡覺吧。', 'warn');
    for (const id of SW.CORE) { const n = st.n[id]; n.mood += (60 - n.mood) * 0.002 * mins; }
    SW.W.updateNPCs(mins, instant);
    Sys.processQueue();
    Sys.checkPromises();
    const hr = Math.floor(st.t / 60);
    if (lastHour !== null && hr !== lastHour) { Sys.hourly(); }
    lastHour = hr;
  };
  Sys.hourly = function () {
    const st = S();
    Sys.spreadGossip();
    // NPCs spending time together drift closer (or further)
    const here = {};
    for (const id of SW.CORE) { const n = st.n[id]; if (n.map !== 'away') (here[n.map] = here[n.map] || []).push(id); }
    for (const ids of Object.values(here)) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const k = U.pairKey(ids[i], ids[j]); Sys.pch(ids[i], ids[j], { friend: 0.4 });
      if (k === 'hsiu|mira') Sys.pch('hsiu', 'mira', { attract: 0.5, tension: -0.3 });
      if (k === 'anson|pei') Sys.pch('anson', 'pei', { attract: 0.3 });
    }
    // Anson burns energy every hour he is "helping"
    const an = st.n.anson; if (/準備|布置|帶小組|改作業|服事|上課/.test(an.act)) an.energy = U.clamp(an.energy - (/上課/.test(an.act) ? 0.4 : 3.2), 0, 100);
    if (T.mod() >= 23 * 60 || T.mod() < 6 * 60) { for (const id of SW.CORE) st.n[id].energy = U.clamp(st.n[id].energy + (id === 'anson' ? 0.7 : 6), 0, 100); }
    if (SW.save) SW.save();
  };
  Sys.dayStart = function () {
    const st = S();
    // investing: a fictional index with a story-flavoured daily move
    const mk = st.market; const day = T.day();
    const drift = { 2: 0.03, 3: -0.05, 4: 0.06, 5: -0.08, 6: 0.02, 7: 0.04 }[day] || 0;
    mk.price = Math.max(40, Math.round(mk.price * (1 + drift + (Math.random() - 0.5) * 0.06) * 100) / 100); mk.hist.push(mk.price); if (mk.hist.length > 14) mk.hist.shift();
  };

  // advance game time in 5 minute steps, letting the offscreen world run
  Sys.advance = async function (mins, label, opts) {
    const st = S(); opts = opts || {};
    if (label !== false) { SW.$('fade-text').textContent = label || `⏳ ${mins >= 60 ? (mins / 60).toFixed(mins % 60 ? 1 : 0) + ' 小時' : mins + ' 分鐘'}過去了…`; SW.$('fade').hidden = false; }
    const startDay = T.day();
    let left = mins;
    while (left > 0) {
      const step = Math.min(5, left); left -= step;
      st.t += step;
      Sys.tick(step, true);
      if (SW.Dir) SW.Dir.tick({ offscreenOnly: true });
      if (T.day() !== startDay && T.mod() < step) Sys.dayStart();
      if (opts.interrupt !== false && SW.Dir && SW.Dir.urgent()) { if (left > 10) UI.toast('⏸️ 有事情正在發生……'); break; }
    }
    SW.W.updateNPCs(0, true);
    if (label !== false) { await U.sleep(650); SW.$('fade').hidden = true; }
    SW.save();
  };

  // what would the player miss if they spent `mins` now?
  Sys.conflicts = function (mins) {
    const st = S(), end = st.t + mins, out = [];
    for (const p of st.prom) {
      if (p.status !== 'pending' || p.noWarn) continue;
      if (p.from >= end || p.until < st.t) continue;
      if (p.kind === 'task' && p.until > end) continue;
      out.push(p);
    }
    return out;
  };
  Sys.confirmTime = async function (mins, what) {
    const c = Sys.conflicts(mins);
    if (!c.length) return true;
    const list = c.map((p) => `・${T.rel(p.from)} ${SW.tx(p.text)}（${nm(p.who)}）`).join('\n');
    UI.say('narr', `⚠️ ${what || '這件事'}大約要花 ${mins} 分鐘，你可能會錯過：\n${list}`);
    const v = await UI.choose([{ t: '還是要做', v: true }, { t: '算了，先不要', v: false }]);
    UI.closeDialog();
    return v;
  };

  // pass out when the night runs too long
  Sys.checkExhaust = async function () {
    const st = S(), m = T.mod();
    if (UI.busy()) return;
    const late = m >= 90 && m < 360;
    if (!late && st.p.energy > 0) return;
    const where = st.p.map;
    UI.sceneActive = true;
    try {
      if (late) {
        await UI.fade('凌晨了。你撐不住，直接睡著了……', 1300);
        await Sys.sleepUntil('09:30', true);
        UI.toast(where === 'home' ? '你在沙發上醒來，脖子很痠。' : `你在${(SW.PLACES[where] || {}).name || '外面'}睡著了，被好心人叫醒後搖搖晃晃回家。`, 'warn');
      } else {
        // collapsing in daytime costs a few hours, never a whole day
        await UI.fade('你的體力見底，眼前一黑……', 1300);
        await Sys.advance(150, '💤 你在原地睡著了……', { interrupt: false });
        st.p.energy = 35;
        UI.toast(`你在${(SW.PLACES[where] || {}).name || '這裡'}睡了兩個半小時。有人在你身上蓋了一件外套。`, 'warn');
      }
      Sys.mood(-8);
    } finally { UI.sceneActive = false; }
  };

  Sys.sleepUntil = async function (hm, collapsed) {
    const st = S();
    let target = T.today(hm); if (target <= st.t + 60) target += 1440;
    const mins = target - st.t;
    if (st.p.follower) { st.p.follower = null; }
    await Sys.advance(mins, collapsed ? false : '🌙 晚安……', { interrupt: false });
    st.p.energy = collapsed ? 60 : U.clamp(70 + mins / 15 + (st.p.restBonus ? 10 : 0), 0, 100);
    Sys.mood(collapsed ? -5 : 5);
    const [x, y] = SW.W.spot('home', 'bed');
    SW.W.enter('home', x + 0.5, y + 0.5, 'down');
    SW.W.updateNPCs(0, true);
    if (SW.Dir) await SW.Dir.morning();
  };

  // ---------- schedule ----------
  const Sched = SW.Sched = {};
  const BUSY = /跑測試|寫測試報告|寫 code|學校|上班|顧店|帶小組|布置|服事|準備|演出|樂團練習|加班|派對|和阿哲|偷偷練歌|主管辦公室|release|談租約|帶學員|顧吧台|整理店務|講道|休息中|聚會|幫老蔡/;
  // after day 7 the café's crowd follows the café: to its new home, or to 好日子 if it closed
  const CAFE_MOVE = {
    bar: { counter: 'stool1', stage: 'booth1', t1: 'long1', t2: 'long2', t3: 'long3', t4: 'long4', t5: 'long5', t6: 'long6', g1: 'long5', g2: 'long6' },
    church: { counter: 'kitchen', stage: 'pulpit2', t1: 'group1', t2: 'group2', t3: 'group3', t4: 'kitchen2', t5: 'pew3', t6: 'pew4', g1: 'pew1', g2: 'pew2' },
    office: { counter: 'lobby', stage: 'lobby', t1: 'tea1', t2: 'tea2', t3: 'meet1', t4: 'meet2', t5: 'tea1', t6: 'tea2', g1: 'meet1', g2: 'meet2' },
    studio: { counter: 'center', stage: 'mic', t1: 'sofa', t2: 'drums', t3: 'guitar', t4: 'booth', t5: 'sofa', t6: 'center', g1: 'guitar', g2: 'drums' },
  };
  Sched.cafeMap = () => { const c = S().cafe; return c.outcome === 'close' ? 'bar' : ({ church: 'church', company: 'office', studio: 'studio' }[c.partner] || 'church'); };
  function movedCafe(id, r) {
    if (r.map !== 'cafe' || !S().f.cafeEmptied || S().cafe.outcome === 'renew') return r;
    const map = Sched.cafeMap(), spot = CAFE_MOVE[map][r.spot];
    if (!spot) return { map: 'away', spot: null, act: r.act, busy: r.busy };
    let act = r.act;
    if (id === 'pei' && /顧店|整理店務/.test(act)) act = map === 'bar' ? '在好日子幫老蔡' : '新轉角・顧店';
    else if (act === '在咖啡廳') act = map === 'bar' ? '在好日子' : '在新轉角';
    return Object.assign({}, r, { map, spot, act });
  }
  Sched.homeOf = function (id) {
    const st = S(), m = T.mod();
    if (st.p.roommate === id) return { map: 'home', spot: 'roomMate' };
    if (id === 'lele') {
      if (st.f.leleStay === 'player') return { map: 'home', spot: 'sofa' };
      if (st.f.leleStay === 'cafe' && (m >= 21 * 60 + 40 || m < 7 * 60 + 40)) return { map: 'cafe', spot: 'back' };
    }
    return { map: 'away', spot: null };
  };
  Sched.base = (id, abs) => movedCafe(id, baseSched(id, abs));
  function baseSched(id, abs) {
    const st = S(); const t = abs == null ? st.t : abs;
    const d = Math.floor(t / 1440) + 1, dow = (d - 1) % 7, m = t % 1440;
    // overrides (latest wins)
    for (let i = st.ov.length - 1; i >= 0; i--) {
      const o = st.ov[i]; if (o.who !== id) continue;
      if (t >= o.from && t < o.until) {
        if (o.map === 'HOME') { const h = Sched.homeOf(id); return { map: h.map, spot: h.spot, act: o.act, busy: !o.free }; }
        return { map: o.map, spot: o.spot, act: o.act, busy: !o.free, face: o.face };
      }
    }
    const list = SW.SCHED[id] || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (b.day && b.day !== d) continue;
      if (!b.d.includes(dow)) continue;
      const f = U.hm(b.f), to = U.hm(b.t);
      if (m < f || m >= to) continue;
      if (b.if && !b.if(st)) continue;
      if (b.map === 'HOME') { const h = Sched.homeOf(id); return { map: h.map, spot: b.spot === 'HOME' ? h.spot : (h.map === 'home' ? b.spot : h.spot), act: h.map === 'away' ? b.act : b.act, busy: false }; }
      return { map: b.map, spot: b.spot, act: b.act, busy: BUSY.test(b.act) };
    }
    return { map: 'away', spot: null, act: '' };
  }
  Sched.goal = function (id) {
    const st = S(), n = st.n[id];
    if (st.p.follower === id) return { map: st.p.map, follow: true, act: '跟你一起' };
    if (n && n.approach && n.map === st.p.map) return { map: st.p.map, xy: [Math.floor(st.p.x), Math.floor(st.p.y)], approach: true, act: '朝你走來' };
    return Sched.base(id);
  };
  Sched.override = function (who, from, until, map, spot, act, key, extra) {
    const st = S();
    if (key) st.ov = st.ov.filter((o) => o.key !== key);
    st.ov.push(Object.assign({ who, from, until, map, spot, act, key: key || null }, extra || {}));
  };
  Sched.clearOv = (key) => { S().ov = S().ov.filter((o) => o.key !== key); };
  Sched.busyAt = (id, abs) => { const b = Sched.base(id, abs); return b.busy ? b.act : null; };
  Sched.freeAt = (id, abs) => !Sched.busyAt(id, abs) && !Sched.busyAt(id, abs + 50);

  // ---------- NPC state helpers ----------
  Sys.npcMood = (id) => S().n[id].mood;
  Sys.npcCh = (id, d) => { const n = S().n[id]; for (const k of Object.keys(d)) n[k] = U.clamp((n[k] || 0) + d[k], 0, 100); };
  Sys.bubble = function (id) {
    const st = S(), n = st.n[id];
    if (n.approach) return '❗';
    if (SW.Dir && SW.Dir.hasTalk(id)) return '💬';
    if (st.p.follower === id) return st.p.partner === id ? '💕' : '🙂';
    if (/睡/.test(n.act)) return '💤';
    if (id === 'lele' && st.f.leleHeartbroken) return '💧';
    if (id === 'anson' && n.energy < 22) return '💦';
    const r = st.rel[id]; if (r && r.tension > 50) return '💢';
    if (/練|演出|唱/.test(n.act)) return '🎵';
    return null;
  };

  // ---------- objectives (HUD reminders) ----------
  Sys.objectives = function () {
    const st = S(), out = [];
    const pend = st.prom.filter((p) => p.status === 'pending' && p.until >= st.t && p.kind !== 'secret').sort((a, b) => (a.kind === 'task' ? a.until : a.from) - (b.kind === 'task' ? b.until : b.from)).slice(0, 3);
    for (const p of pend) {
      const t = p.kind === 'task' ? p.until : p.from, day = Math.floor(t / 1440) + 1;
      const when = p.kind === 'task' ? (p.from > st.t + 5 ? `${U.fmt(p.from % 1440)}–${U.fmt(p.until % 1440)}` : `${U.fmt(p.until % 1440)} 前`) : U.fmt(p.from % 1440);
      out.push(`⏰ <b>${when}</b>${day !== T.day() ? '（' + T.dayName(day) + '）' : ''} ${U.esc(SW.tx(p.text))}`);
    }
    if (SW.Dir) for (const h of SW.Dir.hints()) if (out.length < 4) out.push(h);
    return out;
  };

  // ---------- guide pointer ----------
  Sys.guide = function () {
    const st = S(), g = SW.Dir && SW.Dir.goal(); if (!g) return null;
    const here = st.p.map;
    if (g.map === here && here !== 'city') return null;
    if (here !== 'city') { const m = SW.W.get(here), d = m.doors[0]; return { x: d.x + 0.5, y: d.y + 0.5, label: '先出門・' + g.label }; }
    if (g.map === 'city') { const sp = SW.W.spot('city', g.spot); return sp ? { x: sp[0] + 0.5, y: sp[1] + 0.5, label: g.label } : null; }
    const b = SW.W.building(g.map); if (!b) return null;
    return { x: b.door[0] + 0.5, y: b.door[1] + 1, label: (SW.PLACES[g.map] || {}).name + '・' + g.label };
  };

  // ---------- shop ----------
  Sys.shop = async function () {
    const st = S();
    const ids = Object.keys(SW.ITEMS).filter((k) => !SW.ITEMS[k].prize);
    const v = await UI.sheet('全家福超商', `存款 ${U.money(st.p.money)}・買了會放進包包，送禮或自己用都可以`, ids.map((id) => {
      const it = SW.ITEMS[id];
      return { icon: it.icon, t: `${it.name}`, sub: `${U.money(it.price)}${st.p.inv[id] ? `・已有 ${st.p.inv[id]}` : ''}`, v: id, dis: st.p.money < it.price };
    }));
    if (!v) return;
    const it = SW.ITEMS[v];
    if (!Sys.pay(it.price)) return; Sys.item(v, 1);
    UI.toast(`🛍️ 買了 ${it.icon} ${it.name}`);
    return Sys.shop();
  };
  Sys.useItem = async function (id) {
    const it = SW.ITEMS[id]; if (!it || !it.use) return;
    Sys.item(id, -1);
    if (it.use.energy) Sys.energy(it.use.energy);
    if (it.use.mood) Sys.mood(it.use.mood);
    UI.toast(`${it.icon} 你用掉了 ${it.name}`);
  };

  Sys.canEnter = function (map) {
    const m = T.mod();
    if (map === 'office' && T.weekend() && !S().f.officeWeekendOk) { UI.toast('週末公司刷不了門禁卡。'); return false; }
    if (map === 'office' && (m >= 23 * 60 || m < 6 * 60 + 30)) { UI.toast('大樓已經鎖門了。'); return false; }
    if (map === 'church' && (m >= 22 * 60 || m < 7 * 60)) { UI.toast('教會的門鎖上了。'); return false; }
    if (map === 'gym' && (m >= 23 * 60 || m < 6 * 60)) { UI.toast('健身房打烊了。'); return false; }
    if (map === 'studio' && (m >= 24 * 60 || m < 10 * 60)) { UI.toast('工作室還沒開。'); return false; }
    if (map === 'cafe' && S().cafe.outcome === 'close' && S().f.cafeEmptied) { UI.toast('轉角咖啡廳的鐵門拉下來了。上面貼著一張手寫的「謝謝大家」。小沛現在在好日子。'); return false; }
    if (map === 'cafe' && S().cafe.outcome === 'relocate' && S().f.cafeEmptied) { UI.toast(`轉角搬家了。門上貼著新地址：${SW.PLACES[Sched.cafeMap()].name}。`); return false; }
    return true;
  };
})(window.SW);
