'use strict';
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys;
  const $ = (id) => document.getElementById(id);
  const Phone = SW.Phone = { viewing: null, tab: 'msgs', stack: [] };
  const S = () => SW.S;
  const nm = (id) => SW.name(id);
  const TABS = [['msgs', '💬', '訊息'], ['people', '👥', '人物'], ['journal', '📔', '回憶'], ['plan', '📅', '行程'], ['more', '📱', 'App']];

  const av = (id) => {
    const ch = SW.CH[id];
    if (id === 'group') return `<span class="av" style="background:#2f8f83">六</span>`;
    return `<span class="av" style="background:${ch ? ch.color : '#888'}">${U.esc((ch ? ch.name : id).slice(0, 1))}</span>`;
  };
  const threadTitle = (th) => (th === 'group' ? '轉角老位子（6）' : nm(th));

  Phone.open = function (tab, arg) {
    if (UI.sceneActive && !$('phone').hidden) return;
    $('phone').hidden = false;
    Phone.go(tab || Phone.tab || 'msgs', arg);
  };
  Phone.close = function () { $('phone').hidden = true; Phone.viewing = null; SW.save(); };
  Phone.go = function (tab, arg) {
    Phone.tab = ['msgs', 'people', 'journal', 'plan', 'more'].includes(tab) ? tab : Phone.tab;
    Phone.viewing = null; Phone.cur = [tab, arg];
    renderTabs();
    const fn = Phone.views[tab]; if (fn) fn(arg);
    $('phone-main').scrollTop = tab === 'thread' ? 1e6 : 0;
  };
  Phone.refresh = function () { if (!$('phone').hidden && Phone.cur) { const keep = $('phone-main').scrollTop; const [t, a] = Phone.cur; renderTabs(); Phone.views[t](a); $('phone-main').scrollTop = t === 'thread' ? 1e6 : keep; } };
  function renderTabs() {
    const st = S();
    const unread = Object.values(st.unread).reduce((a, b) => a + b, 0);
    $('phone-tabs').innerHTML = TABS.map(([k, ic, lb]) => `<button data-t="${k}" class="${Phone.tab === k ? 'on' : ''}"><i>${ic}</i>${lb}${k === 'msgs' && unread ? `<span class="badge">${unread}</span>` : ''}</button>`).join('');
    $('phone-tabs').querySelectorAll('button').forEach((b) => { b.onclick = () => Phone.go(b.dataset.t); });
  }
  function main(html, title, back) { $('phone-main').innerHTML = html; $('phone-title').textContent = title; $('phone-back').style.visibility = back ? 'visible' : 'hidden'; Phone.back = back || null; }

  Phone.views = {};
  // ---------- messages ----------
  Phone.views.msgs = function () {
    const st = S();
    const threads = Object.keys(st.msgs).sort((a, b) => last(b).t - last(a).t);
    function last(th) { const l = st.msgs[th]; return l[l.length - 1]; }
    const contacts = SW.CORE.concat(st.dating.matches || []);
    const html = `<div class="list">${threads.map((th) => { const l = last(th); return `<button class="row-btn" data-th="${th}">${av(th)}<span class="meta"><b>${U.esc(threadTitle(th))}</b><span>${l.from === 'me' ? '你：' : th === 'group' ? nm(l.from) + '：' : ''}${U.esc(l.text)}</span></span>${st.unread[th] ? '<span class="dot"></span>' : ''}</button>`; }).join('') || '<p class="muted">還沒有訊息。</p>'}</div>
      <p class="h" style="margin-top:16px">傳訊息給…</p><div class="chips">${contacts.map((id) => `<button data-c="${id}">${U.esc(nm(id))}</button>`).join('')}</div>`;
    main(html, '訊息');
    $('phone-main').querySelectorAll('[data-th]').forEach((b) => { b.onclick = () => Phone.go('thread', b.dataset.th); });
    $('phone-main').querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => Phone.go('thread', b.dataset.c); });
  };
  Phone.views.thread = function (th) {
    const st = S();
    Phone.viewing = th; st.unread[th] = 0;
    const list = st.msgs[th] || [];
    let html = `<div class="chat">`;
    let lastDay = null;
    for (const m of list) {
      const d = Math.floor(m.t / 1440) + 1;
      if (d !== lastDay) { html += `<div class="bub sys">${T.dayName(d)}</div>`; lastDay = d; }
      html += `<div class="bub ${m.from === 'me' ? 'me' : ''}">${th === 'group' && m.from !== 'me' ? `<small>${U.esc(nm(m.from))}</small>` : ''}${U.esc(m.text)}<small style="text-align:right;margin:2px 0 0">${U.fmt(m.t % 1440)}</small></div>`;
    }
    html += `</div>`;
    const pend = list.filter((m) => m.rk && !m.rd && SW.R[m.rk]).pop();
    const opts = [];
    if (pend) { const R = SW.R[pend.rk]; const ro = typeof R === 'function' ? R(st) : R; ro.filter((o) => o.if === undefined || o.if).forEach((o, i) => opts.push({ t: o.t, act: () => replyTo(th, pend, o) })); }
    if (th !== 'group' && SW.CH[th]) {
      for (const s of (SW.SENDS || [])) if (s.who === th && (!s.cond || s.cond(st))) opts.push({ t: s.t, act: () => { Sys.msg(th, 'me', s.say || s.t); s.run(st); Phone.refresh(); } });
      for (const p of st.prom.filter((p) => p.who === th && p.status === 'pending' && p.from - st.t < 600)) {
        if (!p.lateSent && st.t < p.until) opts.push({ t: `「抱歉，我會晚一點到」（${SW.tx(p.text)}）`, act: () => late(p) });
        opts.push({ t: `「抱歉，今天沒辦法去了」（${SW.tx(p.text)}）`, act: () => cancel(p) });
      }
      if (SW.CH[th].core || (st.dating.matches || []).includes(th)) {
        opts.push({ t: '📅 約對方…', act: () => { Phone.close(); SW.Acts.invite(th, true).then(() => Phone.open('thread', th)); } });
        if (!SW.dailyHas('hi_' + th)) opts.push({ t: '「在幹嘛？」', act: () => smalltalk(th) });
      }
    } else if (th === 'group' && !SW.dailyHas('grp')) opts.push({ t: '在群組丟一張貓咪貼圖', act: () => { SW.dailyOnce('grp'); Sys.msg('group', 'me', '（貓咪貼圖：我很好）'); Sys.msgLater(2, 'group', U.pick(SW.CORE), U.pick(['哈哈哈這隻好像你', '這張我要偷', '你今天是不是很累', '……收到'])); Phone.refresh(); } });
    if (opts.length) html += `<div class="replies">${opts.map((o, i) => `<button data-o="${i}" class="${i === 0 && pend ? '' : 'alt btn'}">${U.esc(SW.tx(o.t))}</button>`).join('')}</div>`;
    main(html, threadTitle(th), () => Phone.go('msgs'));
    $('phone-main').querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => opts[+b.dataset.o].act(); });
    renderTabs();
  };
  function replyTo(th, m, o) {
    m.rd = true;
    Sys.msg(th, 'me', o.say || o.t.replace(/^「|」$/g, ''));
    if (o.fn) o.fn(S());
    Phone.refresh();
  }
  function late(p) {
    p.lateSent = true; p.until += 60;
    Sys.msg(p.who, 'me', '抱歉，我會晚一點到！');
    Sys.ch(p.who, { trust: -1 }, true);
    Sys.msgLater(2, p.who, p.who, SW.Talk.lateReply(p.who));
    Phone.refresh();
  }
  function cancel(p) {
    Sys.msg(p.who, 'me', `抱歉，${SW.tx(p.text)}我今天沒辦法去了……`);
    const pen = Sys.cancelP(p.id);
    Sys.msgLater(3, p.who, p.who, SW.Talk.cancelReply(p.who, pen, p));
    Phone.refresh();
  }
  function smalltalk(th) {
    SW.dailyOnce('hi_' + th);
    Sys.msg(th, 'me', '在幹嘛？');
    Sys.msgLater(2, th, th, SW.Talk.textReply(th));
    Sys.ch(th, { comfort: 1 }, true);
    Phone.refresh();
  }

  // ---------- people ----------
  Phone.views.people = function () {
    const st = S();
    const ids = SW.CORE.concat((st.dating.matches || []));
    const html = `<div class="list">${ids.map((id) => {
      const tags = Sys.tiers(id).map(([t, c]) => `<span class="tag ${c}">${t}</span>`).join('');
      return `<button class="row-btn" data-p="${id}">${av(id)}<span class="meta"><b>${U.esc(nm(id))}<span class="muted">・${U.esc(SW.CH[id].job)}</span></b><span style="white-space:normal">${tags}</span></span></button>`;
    }).join('')}</div><p class="muted" style="margin-top:10px">關係不是一個數字。這裡寫的是你從他們的表情、語氣和行為感覺到的。</p>`;
    main(html, '人物');
    $('phone-main').querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => Phone.go('person', b.dataset.p); });
  };
  Phone.views.person = function (id) {
    const st = S(), ch = SW.CH[id];
    const mems = Sys.memsOf(id).slice().reverse();
    const proms = st.prom.filter((p) => p.who === id).slice(-6).reverse();
    const facts = Object.keys(st.knows.player).filter((f) => SW.FACTS[f].owner === id || (f === 'rumorLele' && (id === 'hsiu' || id === 'lele')));
    const pairs = SW.CORE.filter((o) => o !== id).map((o) => [o, SW.Talk.pairWord(id, o)]).filter(([, w]) => w);
    const tags = Sys.tiers(id).map(([t, c]) => `<span class="tag ${c}">${t}</span>`).join('');
    const html = `<div class="prof">${av(id).replace('class="av"', 'class="av" style="width:64px;height:64px;font-size:28px;margin:0 auto;background:' + ch.color + '"')}<div class="h" style="margin-top:8px">${U.esc(ch.name)}${ch.age ? `・${ch.age}歲` : ''}</div><div class="muted">${U.esc(ch.job)}</div><p style="font-size:13.5px;line-height:1.6;text-align:left">${U.esc(ch.bio || '')}</p><div>${tags}</div></div>
      <div class="card-sec"><h4>你們的共同回憶（${mems.length}）</h4>${mems.length ? `<ul>${mems.slice(0, 12).map((m) => `<li>${m.tone > 0 ? '💚' : m.tone < 0 ? '💢' : '・'} <b>${T.dayName(Math.floor(m.t / 1440) + 1)}</b> ${U.esc(m.text)}</li>`).join('')}</ul>` : '<p class="muted">還沒有。去認識對方吧。</p>'}</div>
      ${proms.length ? `<div class="card-sec"><h4>約定</h4><ul>${proms.map((p) => `<li>${{ pending: '⏳', kept: '✅', broken: '💔', cancelled: '↩️' }[p.status]} ${U.esc(SW.tx(p.text))}（${T.rel(p.from)}）</li>`).join('')}</ul></div>` : ''}
      ${facts.length ? `<div class="card-sec"><h4>你知道的事</h4><ul>${facts.map((f) => `<li>${SW.FACTS[f].false ? '❓' : '🔒'} ${U.esc(SW.FACTS[f].text)}</li>`).join('')}</ul></div>` : ''}
      ${pairs.length ? `<div class="card-sec"><h4>你感覺到的人際關係</h4><ul>${pairs.map(([o, w]) => `<li>${U.esc(ch.name)} ↔ ${U.esc(nm(o))}：${U.esc(w)}</li>`).join('')}</ul></div>` : ''}
      <div class="card-sec"><h4>對方在意的事</h4><p>${U.esc(ch.values || '還不太了解。')}</p></div>`;
    main(html, ch.name, () => Phone.go('people'));
  };

  // ---------- journal ----------
  Phone.views.journal = function () {
    const st = S();
    const byDay = {};
    for (const m of st.mem) { const d = Math.floor(m.t / 1440) + 1; (byDay[d] = byDay[d] || []).push(m); }
    const days = Object.keys(byDay).map(Number).sort((a, b) => b - a);
    const secrets = Object.keys(st.knows.player);
    const html = `${secrets.length ? `<div class="card-sec"><h4>你知道的事</h4><ul>${secrets.map((f) => `<li>${SW.FACTS[f].false ? '❓' : SW.FACTS[f].secret ? '🔒' : '📰'} ${U.esc(SW.FACTS[f].text)}</li>`).join('')}</ul></div>` : ''}
      ${days.map((d) => `<div class="card-sec"><h4>第 ${d} 天・${T.dayName(d)}</h4><ul>${byDay[d].map((m) => `<li>${m.tone > 0 ? '💚' : m.tone < 0 ? '💢' : '・'} ${U.esc(m.text)}${m.who.length ? `<span class="muted">（${m.who.map(nm).join('、')}）</span>` : ''}</li>`).join('')}</ul></div>`).join('') || '<p class="muted">這週才剛開始。</p>'}
      ${st.f.recapDone ? '<button class="btn" id="ph-recap" style="width:100%;margin-top:10px">再看一次「第一週回顧」</button>' : ''}`;
    main(html, '回憶');
    if ($('ph-recap')) $('ph-recap').onclick = () => { Phone.close(); SW.Story.recap(); };
  };

  // ---------- plan ----------
  Phone.views.plan = function () {
    const st = S();
    const pend = st.prom.filter((p) => p.status === 'pending').sort((a, b) => a.from - b.from);
    const done = st.prom.filter((p) => p.status !== 'pending').slice(-10).reverse();
    const events = (SW.EVENTS || []).filter((e) => (!e.known || e.known(st)) && e.at >= T.at(T.day(), '00:00') && e.at > st.t - 60).sort((a, b) => a.at - b.at);
    const html = `<div class="card-sec"><h4>你答應的事</h4>${pend.length ? `<ul>${pend.map((p) => `<li><b>${p.kind === 'task' ? T.rel(p.until) + ' 前' : T.rel(p.from)}</b> ${U.esc(SW.tx(p.text))}<span class="muted">（${nm(p.who)}・${SW.PLACES[p.map] ? SW.PLACES[p.map].name : ''}）</span></li>`).join('')}</ul><p class="muted">要改期或取消，到「訊息」裡跟對方說一聲，總比直接放鳥好。</p>` : '<p class="muted">目前沒有約定。</p>'}</div>
      ${events.length ? `<div class="card-sec"><h4>你知道的活動</h4><ul>${events.map((e) => `<li><b>${T.rel(e.at)}</b> ${U.esc(e.text)}</li>`).join('')}</ul></div>` : ''}
      ${done.length ? `<div class="card-sec"><h4>過去的約定</h4><ul>${done.map((p) => `<li>${{ kept: '✅', broken: '💔', cancelled: '↩️' }[p.status]} ${U.esc(SW.tx(p.text))}</li>`).join('')}</ul></div>` : ''}`;
    main(html, '行程');
  };

  // ---------- apps ----------
  Phone.views.more = function () {
    const html = `<div class="grid2">
      <button class="row-btn" data-a="map"><span class="av" style="background:#2f8f83">🗺️</span><span class="meta"><b>地圖</b><span>快速前往</span></span></button>
      <button class="row-btn" data-a="dating"><span class="av" style="background:#e46b7b">💘</span><span class="meta"><b>Swipe 緣</b><span>交友軟體</span></span></button>
      <button class="row-btn" data-a="invest"><span class="av" style="background:#6fb7de">📈</span><span class="meta"><b>小資投</b><span>竹科指數 ETF</span></span></button>
      <button class="row-btn" data-a="bag"><span class="av" style="background:#f2b33d">🎒</span><span class="meta"><b>包包</b><span>你的物品</span></span></button>
      <button class="row-btn" data-a="cats"><span class="av" style="background:#e39a4a">🐈</span><span class="meta"><b>街貓圖鑑</b><span>${Object.keys(SW.S.f.cats || {}).length}／8 隻</span></span></button>
      <button class="row-btn" data-a="settings"><span class="av" style="background:#5d6e78">⚙️</span><span class="meta"><b>設定</b><span>存檔、重新開始</span></span></button>
      <button class="row-btn" data-a="help"><span class="av" style="background:#22323b">❓</span><span class="meta"><b>操作說明</b><span>怎麼玩</span></span></button>
    </div>`;
    main(html, 'App');
    $('phone-main').querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => Phone.go(b.dataset.a); });
  };
  Phone.views.cats = function () {
    const st = S(), got = st.f.cats || {};
    const html = `<p class="muted">新竹街頭住著八隻貓。牠們有自己的地盤，靠近一點、慢慢蹲下來。</p><div class="grid2">${Object.entries(SW.CATS).map(([id, name]) => `<div class="prof" style="padding:10px"><div class="big" style="font-size:34px">${got[id] ? '🐈' : '❔'}</div><b>${got[id] ? U.esc(name) : '？？？'}</b><div class="muted">${got[id] ? '第 ' + got[id] + ' 天遇見' : '還沒遇到'}</div></div>`).join('')}</div>`;
    main(html, '街貓圖鑑', () => Phone.go('more'));
  };
  Phone.views.map = function () {
    const st = S();
    const here = st.p.map;
    const places = ['office', 'home', 'cafe', 'church', 'gym', 'bar', 'studio', 'city'];
    const html = `<div style="position:relative;border-radius:14px;overflow:hidden;background:#1f2d36"><canvas id="ph-map" style="width:100%;display:block"></canvas></div><p class="muted">你現在在：<b>${U.esc(SW.PLACES[here].name)}</b>。用走的可以看到路上的人；用地圖前往比較快，但也會花時間。</p><div class="list">${places.map((k) => `<button class="row-btn" data-g="${k}" ${k === here ? 'disabled' : ''}><span class="av" style="background:#e6ede8">${SW.PLACES[k].icon}</span><span class="meta"><b>${U.esc(SW.PLACES[k].name)}</b><span>${U.esc(SW.PLACES[k].desc)}</span></span></button>`).join('')}</div>`;
    main(html, '地圖', () => Phone.go('more'));
    if (SW.R3) {
      const base = SW.R3.mapCanvas('city'), cv = $('ph-map'), g = cv.getContext('2d');
      cv.width = base.c.width; cv.height = base.c.height; g.drawImage(base.c, 0, 0);
      const P = base.P; g.font = `700 ${P * 2.6}px ${SW.TX.FONT}`; g.textAlign = 'center'; g.lineWidth = P * 0.8; g.strokeStyle = 'rgba(20,28,34,0.85)'; g.fillStyle = '#fff';
      const lab = (t, x, y) => { g.strokeText(t, x * P, y * P); g.fillText(t, x * P, y * P); };
      for (const b of SW.BUILDINGS) lab(b.map ? SW.PLACES[b.map].name.replace('（你家）', '') : b.sign, b.x + b.w / 2, b.y + b.h / 2 + 3);
      lab('東門夜市', 92, 66); lab('籃球場', 46, 22); lab('頭前溪河濱公園', 60, 90); lab('光復路', 30, 48.8); lab('中央路', 61, 30);
      const pos = here === 'city' ? [st.p.x, st.p.y] : (() => { const b = SW.W.building(here); return b ? [b.door[0] + 0.5, b.door[1] + 1] : [60, 50]; })();
      g.fillStyle = '#f2b33d'; g.beginPath(); g.arc(pos[0] * P, pos[1] * P, P * 2.2, 0, 7); g.fill(); g.strokeStyle = '#1f2d36'; g.lineWidth = P * 0.6; g.stroke();
    }
    $('phone-main').querySelectorAll('[data-g]').forEach((b) => { b.onclick = async () => { const k = b.dataset.g; if (k !== 'city' && !Sys.canEnter(k)) return; Phone.close(); const mins = here === 'city' || k === 'city' ? 8 : 12; if (!(await Sys.confirmTime(mins, '移動'))) return; await Sys.advance(mins, '🚶 移動中……'); SW.W.travelTo(k); }; });
  };
  Phone.views.bag = function () {
    const st = S(); const inv = Object.keys(st.p.inv);
    const html = `<p class="muted">存款 ${U.money(st.p.money)}。超商可以買更多東西。</p><div class="list">${inv.map((k) => { const it = SW.ITEMS[k]; return `<div class="row-btn"><span class="av" style="background:#fff;font-size:22px">${it.icon}</span><span class="meta"><b>${U.esc(it.name)} ×${st.p.inv[k]}</b><span>${it.use ? '可以自己用' : ''}${it.gift ? (it.use ? '・' : '') + '可以送人' : ''}${it.cook ? '可以煮飯' : ''}</span></span>${it.use ? `<button class="btn" data-u="${k}">使用</button>` : ''}</div>`; }).join('') || '<p class="muted">包包空空的。</p>'}</div>`;
    main(html, '包包', () => Phone.go('more'));
    $('phone-main').querySelectorAll('[data-u]').forEach((b) => { b.onclick = () => { Sys.useItem(b.dataset.u); Phone.refresh(); }; });
  };
  Phone.views.invest = function () {
    const st = S(), mk = st.market, inv = st.p.invest;
    const max = Math.max(...mk.hist), min = Math.min(...mk.hist);
    const bars = mk.hist.map((v) => `<i style="display:inline-block;width:${100 / mk.hist.length}%;height:${8 + (v - min) / Math.max(1, max - min) * 60}px;background:${v >= mk.hist[0] ? '#2f8f83' : '#d4553f'};vertical-align:bottom;border-radius:3px 3px 0 0"></i>`).join('');
    const val = inv.units * mk.price, pl = val - inv.cost;
    const html = `<div class="card-sec"><h4>竹科指數 ETF（虛構）</h4><div style="height:72px;display:flex;align-items:flex-end;gap:2px">${bars}</div><p>現價 <b>${mk.price.toFixed(2)}</b>・持有 ${inv.units} 單位・市值 ${U.money(val)}・<span style="color:${pl >= 0 ? '#2f8f83' : '#d4553f'}">${pl >= 0 ? '+' : ''}${U.money(pl)}</span></p>
      <div class="chips"><button data-b="10">買 10 單位</button><button data-b="50">買 50 單位</button><button data-s="10" ${inv.units < 10 ? 'disabled' : ''}>賣 10</button><button data-s="all" ${!inv.units ? 'disabled' : ''}>全部賣出</button></div></div>
      <p class="muted">價格每天早上變動。這不是理財建議，這是新竹工程師的日常焦慮。</p>`;
    main(html, '小資投', () => Phone.go('more'));
    $('phone-main').querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => { const n = +b.dataset.b, c = n * mk.price; if (st.p.money < c) { UI.toast('存款不夠。'); return; } Sys.money(-c); inv.units += n; inv.cost += c; if (!st.f.invested) { st.f.invested = true; Sys.later(240, 'msg', { thread: 'hsiu', from: 'hsiu', text: '聽說你也開始買竹科 ETF？我上週追高，現在套牢。歡迎加入。' }); } Phone.refresh(); }; });
    $('phone-main').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { const n = b.dataset.s === 'all' ? inv.units : Math.min(10, inv.units); const avg = inv.units ? inv.cost / inv.units : 0; Sys.money(n * mk.price); inv.cost -= avg * n; inv.units -= n; UI.toast(`賣出 ${n} 單位，入帳 ${U.money(n * mk.price)}`); Phone.refresh(); }; });
  };
  Phone.views.dating = function () {
    const st = S(), d = st.dating;
    if (!d.app) {
      main(`<div class="prof"><div class="big">💘</div><div class="h">Swipe 緣</div><p class="muted">新竹最多工程師單身的交友軟體（自稱）。</p><button class="btn" id="dt-in" style="width:100%">下載並建立檔案</button></div>`, 'Swipe 緣', () => Phone.go('more'));
      $('dt-in').onclick = () => { d.app = true; Phone.refresh(); };
      return;
    }
    const pool = ['kai', 'yuna'].filter((id) => !d.seen.includes(id));
    if (!pool.length) {
      main(`<p class="muted">附近沒有新的人了。</p><div class="list">${d.matches.map((id) => `<button class="row-btn" data-m="${id}">${av(id)}<span class="meta"><b>${nm(id)}</b><span>已配對・點我聊天</span></span></button>`).join('') || '<p class="muted">還沒有配對。</p>'}</div>`, 'Swipe 緣', () => Phone.go('more'));
      $('phone-main').querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => Phone.go('thread', b.dataset.m); });
      return;
    }
    const id = pool[0], ch = SW.CH[id];
    main(`<div class="prof"><div style="display:flex;justify-content:center"><canvas id="dt-av" width="120" height="120" style="width:96px;height:96px"></canvas></div><div class="h">${U.esc(ch.name)}・${ch.age}</div><div class="muted">${U.esc(ch.job)}</div><p style="font-size:14px;line-height:1.6">${U.esc(ch.bio)}</p>
      <div class="grid2"><button class="btn alt" id="dt-no">👈 跳過</button><button class="btn" id="dt-yes">❤️ 右滑</button></div></div>`, 'Swipe 緣', () => Phone.go('more'));
    const c = $('dt-av').getContext('2d'); c.scale(2, 2); SW.W.drawChar(c, 30, 36, 46, ch.look, {});
    $('dt-no').onclick = () => { d.seen.push(id); Phone.refresh(); };
    $('dt-yes').onclick = () => {
      d.seen.push(id);
      if (Math.random() < 0.85) {
        d.matches.push(id); UI.toast(`💘 你和 ${ch.name} 配對成功！`, 'love');
        Sys.msgLater(1, id, id, id === 'kai' ? '嗨～你的照片在河堤拍的嗎？那邊的夕陽我拍過好幾次。' : '嗨！先說，我週末很常被急診叫走，如果約好又放鳥不是我願意的😅', id + '_hi');
      } else UI.toast(`${ch.name} 沒有右滑你。沒關係，新竹人很多。`);
      Phone.refresh();
    };
  };
  Phone.views.settings = function () {
    const html = `<div class="card-sec"><h4>存檔</h4><p class="muted">遊戲會自動存在這個瀏覽器裡（每小時、換場景、事件結束時）。</p><button class="btn" id="st-save" style="width:100%">立即存檔</button></div>
      <div class="card-sec"><h4>文字</h4><button class="btn alt" id="st-fast" style="width:100%">${SW.fastText ? '✅ ' : ''}對話直接顯示（不逐字）</button></div>
      <div class="card-sec"><h4>時間流速</h4><div class="chips">${[[0.6, '慢'], [1, '標準'], [1.6, '快']].map(([v, l]) => `<button data-sp="${v}" class="${SW.timeScale === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="card-sec"><h4>重新開始</h4><p class="muted">會刪除目前的存檔，回到角色建立畫面。</p><button class="btn warn" id="st-reset" style="width:100%">刪除存檔並重新開始</button><div id="st-confirm"></div></div>`;
    main(html, '設定', () => Phone.go('more'));
    $('st-save').onclick = () => { SW.save(true); UI.toast('💾 已存檔'); };
    $('st-fast').onclick = () => { SW.fastText = !SW.fastText; try { localStorage.setItem('sw-fast', SW.fastText ? '1' : '0'); } catch (e) { /* ignore */ } Phone.refresh(); };
    $('phone-main').querySelectorAll('[data-sp]').forEach((b) => { b.onclick = () => { SW.timeScale = +b.dataset.sp; Phone.refresh(); }; });
    $('st-reset').onclick = () => { $('st-confirm').innerHTML = '<p>確定嗎？這週發生的一切都會消失。</p><button class="btn warn" id="st-yes" style="width:100%">確定刪除</button>'; $('st-yes').onclick = () => { SW.clearSave(); location.reload(); }; };
  };
  Phone.views.help = function () {
    const html = `<div class="card-sec"><h4>移動</h4><p>電腦：WASD／方向鍵。手機：按住畫面拖曳出現搖桿；或直接點地面走過去。</p></div>
      <div class="card-sec"><h4>互動</h4><p>靠近人或物品，按 <b>E</b> 或右下角的大按鈕。也可以直接點人物。</p></div>
      <div class="card-sec"><h4>手機</h4><p>右上角 📱 或按 <b>P</b>。訊息、邀約、人物關係、回憶、行程都在這裡。</p></div>
      <div class="card-sec"><h4>時間</h4><p>時間會一直走。做事情會花時間，NPC 不會等你。重要的約會會出現在左上角的提醒。答應了做不到，傳個訊息改期，總比放鳥好。</p></div>
      <div class="card-sec"><h4>沒有正確答案</h4><p>認真上班、天天摸魚、談戀愛、什麼都不做——每一種生活都有自己的故事。這個世界會記得你怎麼活。</p></div>`;
    main(html, '操作說明', () => Phone.go('more'));
  };
})(window.SW);
