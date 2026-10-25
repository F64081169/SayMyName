'use strict';
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys;
  // Narrative Director: picks conditional storylets from world time, place, cast presence, memories and flags.
  const Dir = SW.Dir = { list: [], byId: {} };
  let running = false;

  Dir.add = function (st) {
    st.kind = st.kind || 'scene';
    st.prio = st.prio || 0;
    if (st.once === undefined) st.once = true;
    Dir.list.push(st); Dir.byId[st.id] = st;
    Dir.list.sort((a, b) => b.prio - a.prio);
  };

  Dir.eligible = function (st, ignorePlace) {
    const S = SW.S;
    if (st.once && S.fired[st.id] !== undefined) return false;
    if (st.cooldown && S.fired[st.id] !== undefined && S.t - S.fired[st.id] < st.cooldown) return false;
    if (st.day !== undefined && ![].concat(st.day).includes(T.day())) return false;
    if (st.dow !== undefined && ![].concat(st.dow).includes(T.dow())) return false;
    if (st.from && T.mod() < U.hm(st.from)) return false;
    if (st.to && T.mod() >= U.hm(st.to)) return false;
    if (!ignorePlace) {
      if (st.where && ![].concat(st.where).includes(S.p.map)) return false;
      if (st.cast) for (const c of st.cast) if (!SW.W.present(c)) return false;
    }
    if (st.cond) { try { if (!st.cond(S)) return false; } catch (e) { console.error('cond', st.id, e); return false; } }
    return true;
  };

  Dir.fire = function (st) { const S = SW.S; S.fired[st.id] = S.t; S.fc[st.id] = (S.fc[st.id] || 0) + 1; };

  Dir.tick = function (opts) {
    const S = SW.S; if (!S || S.over) return;
    opts = opts || {};
    for (const st of Dir.list) {
      if (st.kind !== 'offscreen' && st.kind !== 'phone') continue;
      if (!Dir.eligible(st, true)) continue;
      Dir.fire(st);
      try { st.run(S); } catch (e) { console.error('offscreen', st.id, e); }
    }
    if (opts.offscreenOnly || running || UI.busy()) return;
    // NPCs walking over to talk
    for (const id of Object.keys(S.n)) {
      const n = S.n[id]; if (!n.approach) continue;
      const st = Dir.byId[n.approach];
      if (!st || n.map !== S.p.map || !Dir.eligible(st, true)) { delete n.approach; continue; }
      if (SW.W.distTo(id) < 1.7) { Dir.run(st); return; }
    }
    for (const st of Dir.list) {
      if (st.kind === 'scene' && Dir.eligible(st)) { Dir.run(st); return; }
    }
    if (Object.keys(S.n).some((id) => S.n[id].approach)) return;
    for (const st of Dir.list) {
      if (st.kind !== 'approach') continue;
      if (!SW.W.present(st.npc)) continue;
      if (!Dir.eligible(st, true)) continue;
      if (st.where && ![].concat(st.where).includes(S.p.map)) continue;
      if (S.p.follower === st.npc) { Dir.run(st); return; }
      S.n[st.npc].approach = st.id;
      return;
    }
  };

  Dir.run = async function (st) {
    if (running) return;
    running = true;
    const S = SW.S;
    for (const id of Object.keys(S.n)) if (S.n[id].approach === st.id) delete S.n[id].approach;
    Dir.fire(st);
    try { await SW.scene(async () => { await st.run(S); }); }
    finally { running = false; }
    setTimeout(() => Dir.tick(), 30);
  };
  Dir.runById = function (id) {
    const st = Dir.byId[id]; if (!st) return;
    if (st.can && !st.can(SW.S)) { if (st.cannot) UI.toast(st.cannot(SW.S)); return; }
    return Dir.run(st);
  };

  Dir.talkFor = function (npc) {
    for (const st of Dir.list) if (st.kind === 'talk' && st.npc === npc && Dir.eligible(st, !st.where)) return st;
    return null;
  };
  Dir.hasTalk = function (npc) { const st = Dir.talkFor(npc); return !!st && st.hint !== false; };

  Dir.onEnter = function (mapId) {
    const S = SW.S;
    S.f['v_' + mapId + '_' + T.day()] = true;
    const pj = S.f.pendingJoint;
    if (pj && S.p.follower === pj.id && SW.ACTS[pj.act].map === mapId) { setTimeout(() => SW.Acts.joint(pj.id, pj.act, { romantic: pj.romantic }), 250); return; }
    if (S.p.follower && SW.Acts.placeActs().length && !pj) UI.toast(`✨ 點${SW.name(S.p.follower)} →「一起做點什麼」`);
    setTimeout(() => Dir.tick(), 60);
    SW.save();
  };

  Dir.hints = function () {
    const out = [];
    for (const h of SW.HINTS || []) {
      if (h.day !== undefined && ![].concat(h.day).includes(T.day())) continue;
      if (h.from && T.mod() < U.hm(h.from)) continue;
      if (h.to && T.mod() >= U.hm(h.to)) continue;
      if (h.cond && !h.cond(SW.S)) continue;
      out.push(typeof h.text === 'function' ? h.text(SW.S) : h.text);
    }
    return out.slice(0, 2);
  };

  Dir.episodeCard = async function () {
    const S = SW.S, d = T.day();
    if (S.seenCards[d]) return;
    const ep = (SW.EPISODES || {})[d] || (SW.EPISODES && SW.EPISODES.generic ? SW.EPISODES.generic(d) : null);
    if (!ep) return;
    S.seenCards[d] = true;
    const lines = ep.lines.map(([k, t]) => `<div><b>${k}</b><span>${U.esc(SW.tx(typeof t === 'function' ? t(S) : t))}</span></div>`).join('');
    await UI.card({ kicker: ep.kicker, title: ep.title, html: `<div class="ep-lines">${lines}</div><p class="muted">${U.esc(ep.note || '你可以參與、打斷、改寫，或完全無視這些事。世界會照自己的步調前進。')}</p>`, buttons: [{ t: '開始這一天', v: 1 }] });
  };
  Dir.morning = async function () {
    await Dir.episodeCard();
    Dir.tick();
  };
})(window.SW);
