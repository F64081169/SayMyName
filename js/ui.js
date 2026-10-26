'use strict';
(function (SW) {
  const U = SW.U, T = SW.T;
  const $ = (id) => document.getElementById(id);
  const UI = SW.UI = { sceneActive: false };
  SW.$ = $;

  UI.busy = function () {
    return !$('dialog').hidden || !$('sheet').hidden || !$('phone').hidden || !$('mini').hidden || !$('card').hidden || !$('fade').hidden || !$('title').hidden || UI.sceneActive;
  };

  // ---------- dialogue ----------
  let advance = null, typing = null;
  function face(who, emo) {
    const el = $('dlg-face');
    if (who === 'narr') { el.style.background = '#8a9aa3'; el.textContent = emo || '🎬'; return; }
    const ch = SW.CH[who];
    const color = who === 'me' ? '#f2b33d' : ch ? ch.color : '#6d7f86';
    el.style.background = color;
    el.textContent = emo || (who === 'me' ? SW.S.p.name.slice(0, 1) : (ch ? ch.name.slice(0, 1) : String(who).slice(0, 1)));
  }
  function showText(text, cls) {
    const el = $('dlg-text'); el.className = cls || '';
    text = SW.tx(text);
    if (typing) clearInterval(typing.iv);
    el.textContent = '';
    let i = 0;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || SW.fastText) { el.textContent = text; typing = null; return; }
    typing = { text, iv: setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing.iv); typing = null; } }, 24) };
  }
  function finishTyping() { if (typing) { clearInterval(typing.iv); $('dlg-text').textContent = typing.text; typing = null; return true; } return false; }

  UI.say = function (who, text, emo) {
    if (typeof who === 'string' && who.includes('|')) { const [w, e] = who.split('|'); who = w; emo = e; }
    $('dialog').hidden = false; $('dlg-choices').innerHTML = ''; $('dlg-next').hidden = false;
    if (SW.IN) SW.IN.release();
    if (SW.R3) SW.R3.focus(who);
    face(who, emo);
    const nm = who === 'narr' ? '' : who === 'me' ? SW.S.p.name : SW.name(who);
    $('dlg-name').textContent = nm; $('dlg-name').hidden = !nm;
    showText(text, who === 'narr' ? 'narr' : who === 'me' ? 'me' : '');
    return new Promise((res) => { advance = res; });
  };
  UI.narr = (text) => UI.say('narr', text);

  UI.choose = function (opts, prompt) {
    opts = opts.filter((o) => o && (o.if === undefined || o.if));
    finishTyping();
    $('dialog').hidden = false; $('dlg-next').hidden = true;
    if (prompt) { face('me'); $('dlg-name').textContent = SW.S.p.name; $('dlg-name').hidden = false; showText(prompt, 'me'); finishTyping(); }
    const box = $('dlg-choices'); box.innerHTML = '';
    return new Promise((res) => {
      advance = null;
      opts.forEach((o, i) => {
        const b = document.createElement('button');
        b.innerHTML = `<span class="k">${i + 1}.</span> ${U.esc(SW.tx(o.t))}${o.sub ? `<small>${U.esc(SW.tx(o.sub))}</small>` : ''}`;
        if (o.dis) b.disabled = true;
        b.onclick = (e) => { e.stopPropagation(); box.innerHTML = ''; UI._choiceRes = null; res(o.v !== undefined ? o.v : i); };
        box.appendChild(b);
      });
      UI._choiceRes = (i) => { const o = opts[i]; if (!o || o.dis) return; box.innerHTML = ''; UI._choiceRes = null; res(o.v !== undefined ? o.v : i); };
    });
  };
  UI.closeDialog = () => { $('dialog').hidden = true; $('dlg-choices').innerHTML = ''; advance = null; UI.lastClose = performance.now(); if (SW.R3) SW.R3.focus(null); };
  UI.dialogTap = function () {
    if (finishTyping()) return;
    if (advance) { const a = advance; advance = null; a(); }
  };

  // ---------- action sheet ----------
  let sheetRes = null;
  UI.sheet = function (title, sub, items) {
    $('sheet-title').innerHTML = U.esc(SW.tx(title)) + (sub ? `<small>${U.esc(SW.tx(sub))}</small>` : '');
    const box = $('sheet-items'); box.innerHTML = '';
    return new Promise((res) => {
      sheetRes = res;
      items.filter((it) => it && (it.if === undefined || it.if)).forEach((it) => {
        const b = document.createElement('button'); b.className = 'sitem' + (it.hot ? ' hot' : '');
        b.innerHTML = `<span class="ic">${it.icon || '•'}</span><span class="tx"><b>${U.esc(SW.tx(it.t))}</b>${it.sub ? `<span>${U.esc(SW.tx(it.sub))}</span>` : ''}</span>`;
        if (it.dis) { b.disabled = true; if (it.why) b.title = it.why; }
        b.onclick = () => { UI.closeSheet(); UI.lastClose = performance.now(); res(it.v); };
        box.appendChild(b);
      });
      $('sheet').hidden = false; UI.sheetOpened = performance.now();
      if (SW.IN) SW.IN.release();
    });
  };
  UI.closeSheet = function (cancel) { $('sheet').hidden = true; if (cancel && sheetRes) { const r = sheetRes; sheetRes = null; r(null); } sheetRes = null; };

  // ---------- toasts ----------
  // incoming messages collapse into one "N new messages" toast
  let msgToastEl = null, msgToastN = 0, msgToastTimer = null;
  UI.msgToast = function (text) {
    if (!$('phone').hidden) return;
    msgToastN++;
    if (msgToastEl && msgToastEl.isConnected) { msgToastEl.textContent = `📱 ${msgToastN} 則新訊息（點右上角手機）`; clearTimeout(msgToastTimer); msgToastTimer = setTimeout(() => { msgToastN = 0; }, 3600); return; }
    msgToastN = 1; msgToastEl = UI.toast(text); msgToastTimer = setTimeout(() => { msgToastN = 0; }, 3600);
  };
  UI.toast = function (text, cls) {
    const box = $('toasts');
    while (box.children.length > 1) box.removeChild(box.firstChild);
    const el = document.createElement('div'); el.className = 'toast ' + (cls || ''); el.textContent = SW.tx(text);
    box.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, 3400);
    return el;
  };

  // ---------- cards ----------
  UI.card = function (opt) {
    const body = $('card-body');
    body.innerHTML = `${opt.kicker ? `<div class="ep-kicker">${U.esc(opt.kicker)}</div>` : ''}${opt.title ? `<h2 class="ep-title">${U.esc(SW.tx(opt.title))}</h2>` : ''}<div class="card-html">${opt.html || ''}</div><div class="card-actions"></div>`;
    const act = body.querySelector('.card-actions');
    return new Promise((res) => {
      (opt.buttons || [{ t: '繼續', v: true }]).forEach((b) => {
        const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.t;
        el.onclick = () => { $('card').hidden = true; res(b.v); };
        act.appendChild(el);
      });
      $('card').hidden = false; body.scrollTop = 0; if (SW.IN) SW.IN.release();
    });
  };

  UI.fade = function (text, ms) {
    $('fade-text').textContent = SW.tx(text || ''); $('fade').hidden = false;
    return U.sleep(ms || 900).then(() => { $('fade').hidden = true; });
  };

  // ---------- HUD ----------
  let hudT = 0;
  UI.placeChanged = function () { hudT = 0; };
  UI.hud = function (dt) {
    hudT -= dt; if (hudT > 0) return; hudT = 0.25;
    const S = SW.S, p = S.p;
    $('hud-time').innerHTML = `<span class="hud-day">第${T.day()}天・</span>${T.dayName()} ${U.fmt(T.mod())}`;
    const place = p.map === 'home' ? (p.housing === 'shared' ? '你家（合租公寓）' : '你家（套房）') : (SW.PLACES[p.map] || {}).name;
    $('hud-place').textContent = '📍 ' + place;
    const moodFace = p.mood > 75 ? '😄' : p.mood > 50 ? '🙂' : p.mood > 30 ? '😐' : '😞';
    $('hud-stats').innerHTML = `<span title="體力">⚡<span class="bar"><i style="width:${Math.round(p.energy)}%;${p.energy < 20 ? 'background:#e46b7b' : ''}"></i></span></span><span title="心情">${moodFace}</span><span title="存款">💰${p.money >= 100000 ? Math.round(p.money / 1000) + 'k' : Math.round(p.money).toLocaleString('en-US')}</span>`;
    const unread = Object.values(S.unread).reduce((a, b) => a + b, 0);
    $('phone-badge').hidden = !unread; $('phone-badge').textContent = unread;
    UI.objective();
    const gd = $('guide'), g = !UI.busy() && SW.S.p ? SW.Sys.guide() : null;
    if (g) {
      const p = SW.S.p, dx = g.x - p.x, dy = g.y - p.y, dist = Math.hypot(dx, dy);
      const bearing = Math.atan2(-dx, -dy); let rel = bearing - (p.yaw || 0); while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
      gd.innerHTML = `<span class="arrow" style="transform:rotate(${-rel}rad)">⬆</span><span>${U.esc(g.label)}・${Math.round(dist)}m</span>`;
      gd.hidden = dist < 2;
    } else gd.hidden = true;
    // act button
    const tg = SW.W.target, btn = $('btn-act');
    if (tg && !UI.busy()) {
      btn.hidden = false;
      $('act-label').textContent = tg.type === 'npc' ? `和 ${SW.name(tg.id)} 互動` : `${tg.obj.icon || ''} ${tg.obj.label}`;
    } else btn.hidden = true;
  };

  let objCollapsed = false, lastObj = '';
  UI.objective = function () {
    const el = $('objective');
    if (UI.busy()) { el.hidden = true; return; }
    const lines = SW.Sys.objectives();
    if (!lines.length) { el.hidden = true; return; }
    const html = objCollapsed ? `<div class="row">📋 <b>提醒 (${lines.length})</b></div>` : lines.map((l) => `<div class="row">${l}</div>`).join('');
    if (html !== lastObj) { el.innerHTML = html; lastObj = html; }
    el.hidden = false;
  };
  UI.toggleObjective = () => { objCollapsed = !objCollapsed; lastObj = ''; };
})(window.SW);
