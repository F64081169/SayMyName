'use strict';
// 「今天」: what matters today, why it matters, and a way to get there (or skip the wait) in one tap.
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys;
  const S = () => SW.S;
  const Today = SW.Today = {};

  // where each scheduled event happens and what is at stake
  const WHY = {
    '小沛的驚喜生日派對（好日子餐酒館）': ['bar', '米拉幫小沛辦的。七點準時開始，不要說出去。'],
    'Code Review（公司會議室）': ['office', '阿修主持。Feature Owner 的位子只有一個。'],
    '轉角老位子聚會': ['cafe', '小沛好像有一件事要跟大家說。'],
    '教會小組（主題：安息）': ['church', '安森邀你的。最需要休息的人，其實是他。'],
    '教會社區愛宴（需要人手備餐）': ['church', '安森一個人在扛整場。'],
    'FW 2.3 Release': ['office', '斷電測試要有人盯到十點。'],
    '轉角 Live「我們還有地方可以坐嗎？」': ['cafe', '小沛的募款演出。今晚募到的錢，決定週日。'],
    '小沛和房東陳伯談租約': ['cafe', '小沛說：「你可以坐在旁邊嗎？」'],
    '主日聚會（光鹽教會）': ['church', '想去就去。安森會在。'],
    '房東給答覆：轉角的去留': ['cafe', '一整週，就看這個下午。'],
    '老位子聚會': [() => SW.Week2.place(), '第一週的結局，開始收帳。'],
    '週日晚上的老位子（樂樂有事宣布）': [() => SW.Week2.place(), '樂樂說，不准缺席。'],
  };
  const placeOf = (e) => { const w = WHY[e.text]; if (!w) return null; return typeof w[0] === 'function' ? w[0]() : w[0]; };

  // the things worth doing next, soonest first
  Today.items = function () {
    const st = S(), now = st.t, out = [];
    const end = T.at(T.day() + 1, '06:00');
    for (const e of SW.EVENTS || []) {
      if (e.known && !e.known(st)) continue;
      if (e.at < now - 30 || e.at > end) continue;
      const w = WHY[e.text];
      out.push({ at: e.at, text: e.text, why: w ? w[1] : '', map: placeOf(e) });
    }
    for (const p of st.prom) {
      if (p.status !== 'pending' || p.kind === 'secret') continue;
      const t = p.from;
      if (p.until < now || t > end) continue;
      if (out.some((o) => Math.abs(o.at - t) < 20)) continue;
      out.push({ at: t, text: SW.tx(p.text), why: p.kind === 'task' ? `${U.fmt(p.until % 1440)} 前要完成。你答應過${SW.name(p.who)}。` : `你答應過${SW.name(p.who)}。`, map: p.map, promise: true });
    }
    return out.sort((a, b) => a.at - b.at);
  };
  Today.countdown = function () {
    const st = S(), c = st.cafe, lines = [];
    if (K('lease') && !c.outcome) {
      const short = Math.max(0, c.need - (c.cut || 0) - c.fund - (c.crowd || 0));
      const days = Math.max(0, 7 - T.day());
      lines.push(`☕ 轉角：還差 ${U.money(short)}・${days ? `${days} 天後` : '今天'}下午三點決定`);
    }
    if (st.f.miraDecision === 'go' && T.day() >= 8 && T.day() <= 27) lines.push(`✈️ 米拉：${27 - T.day()} 天後出發`);
    if (SW.Mystery && SW.Mystery.active()) lines.push(`🔍 誰把數字說出去了：${SW.Mystery.clues().length} 條線索`);
    return lines.join('\n');
  };
  const K = (f) => Sys.knows('player', f);

  const go = async (map) => {
    const st = S();
    if (map === st.p.map) { UI.toast('你已經在這裡了。'); return; }
    if (map !== 'city' && !Sys.canEnter(map)) return;
    const mins = st.p.map === 'city' || map === 'city' ? 8 : 12;
    if (!(await Sys.confirmTime(mins, '移動'))) return;
    await Sys.advance(mins, `🚲 前往${SW.PLACES[map].name}……`);
    SW.W.travelTo(map);
  };
  const waitUntil = async (t, label) => {
    const mins = Math.round(t - S().t);
    if (mins < 5) { UI.toast('快開始了，不用等。'); return; }
    await Sys.advance(mins, `⏩ ${label}`);
    SW.Dir.tick();
  };

  Today.open = async function () {
    const st = S(); if (!st || UI.busy()) return;
    const items = Today.items().slice(0, 6);
    const next = items.find((i) => i.at > st.t + 20);
    const rows = items.map((it, i) => ({
      icon: it.promise ? '🤝' : it.map ? SW.PLACES[it.map].icon : '📅',
      t: `${U.fmt(it.at % 1440)}${Math.floor(it.at / 1440) + 1 !== T.day() ? '（明天）' : ''}　${it.text}`,
      sub: [it.why, it.map ? `📍 ${SW.PLACES[it.map].name}` : ''].filter(Boolean).join('　'),
      v: 'i' + i,
      hot: i === 0 && it.at - st.t < 120,
    }));
    if (SW.Mystery && SW.Mystery.active()) rows.push({ icon: '🔍', t: '誰把小沛的數字說出去了？', sub: `已找到 ${SW.Mystery.clues().length} 條線索。看看你知道什麼。`, v: 'clues' });
    if (next) rows.push({ icon: '⏩', t: `跳到下一件事（${U.fmt((next.at - 15) % 1440)}）`, sub: next.text, v: 'skip' });
    if (!items.length) rows.push({ icon: '🌙', t: '今天沒有排定的事', sub: '自由時間：找人聊天、逛夜市、收集街貓，或回家睡覺。', v: 'free' });
    const head = Today.countdown();
    const v = await UI.sheet(`第 ${T.day()} 天・${T.dayName()}　${U.fmt(T.mod())}`, head || '這一天，你想怎麼過？', rows);
    if (!v || v === 'free') return;
    if (v === 'skip') return waitUntil(next.at - 15, `等到「${next.text}」……`);
    if (v === 'clues') return Today.clues();
    const it = items[+v.slice(1)];
    const opts = [];
    if (it.map && it.map !== st.p.map) opts.push({ icon: '🚲', t: `現在就去${SW.PLACES[it.map].name}`, sub: '騎 YouBike 大約 10 分鐘', v: 'go' });
    if (it.at - st.t > 25) opts.push({ icon: '⏩', t: `等到開始前 15 分鐘（${U.fmt((it.at - 15) % 1440)}）`, sub: '中間有人找你，或發生大事，會停下來', v: 'wait' });
    if (!opts.length) { UI.toast(it.map === st.p.map ? '就是這裡。' : '已經開始了。'); return; }
    const c = await UI.sheet(it.text, it.why, opts);
    if (c === 'go') return go(it.map);
    if (c === 'wait') return waitUntil(it.at - 15, `等到「${it.text}」……`);
  };
  Today.clues = async function () {
    const L = SW.Mystery.clues();
    const html = L.length
      ? `<ul>${L.map((c) => `<li><b>${U.esc(SW.name(c.who))}</b>：${U.esc(c.text)}</li>`).join('')}</ul><p class="muted">不是每條線索都指向真相。週日下午，小沛會問你。</p>`
      : '<p>還沒有線索。</p><p class="muted">知道那個數字的，是星期三晚上坐在桌上的人：樂樂、阿修、米拉、安森。<br>看看他們最近怪不怪（對人「觀察」）、問問好日子的老蔡，或者在對方喝醉的時候聽聽他說什麼。</p>';
    await UI.card({ kicker: '線索', title: '誰把小沛的數字說出去了？', html, buttons: [{ t: '好', v: 1 }] });
  };
})(window.SW);
