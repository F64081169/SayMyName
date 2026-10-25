'use strict';
window.SW = window.SW || {};
(function (SW) {
  const U = SW.U = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  U.hm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
  const pad = (n) => (n < 10 ? '0' : '') + n;
  U.fmt = (min) => { min = ((Math.floor(min) % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); };
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  U.money = (n) => 'NT$' + Math.round(n).toLocaleString('en-US');
  // Hash a string to a stable pseudo-random number in [0,1). Used for decor placement and daily variance.
  U.hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };

  const T = SW.T = {};
  T.DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  T.SHORT = ['一', '二', '三', '四', '五', '六', '日'];
  T.day = () => Math.floor(SW.S.t / 1440) + 1;
  T.mod = () => SW.S.t % 1440;
  T.dow = (d) => ((d || T.day()) - 1) % 7;
  T.at = (d, hm) => (d - 1) * 1440 + (typeof hm === 'string' ? U.hm(hm) : hm);
  T.today = (hm) => T.at(T.day(), hm);
  T.dayName = (d) => T.DAYS[T.dow(d)];
  T.weekend = (d) => T.dow(d) >= 5;
  T.in = (from, to) => { const m = T.mod(); return m >= U.hm(from) && m < U.hm(to); };
  T.label = (abs) => {
    const t = abs == null ? SW.S.t : abs; const d = Math.floor(t / 1440) + 1;
    return `${T.dayName(d)} ${U.fmt(t % 1440)}`;
  };
  T.rel = (abs) => {
    const d = Math.floor(abs / 1440) + 1; const today = T.day();
    const pre = d === today ? '今天' : d === today + 1 ? '明天' : d === today - 1 ? '昨天' : T.dayName(d);
    return pre + ' ' + U.fmt(abs % 1440);
  };
  // 0 = full day, 1 = deep night. Smooth dusk/dawn.
  T.dark = () => {
    const h = T.mod() / 60;
    if (h >= 7 && h < 17) return 0;
    if (h >= 17 && h < 19.5) return (h - 17) / 2.5 * 0.55;
    if (h >= 19.5 || h < 5) return 0.55;
    return 0.55 * (1 - (h - 5) / 2);
  };
})(window.SW);
