'use strict';
// Procedural canvas textures: ground, floors, walls, Taiwanese street facades, signs.
(function (SW) {
  const U = SW.U;
  const TX = SW.TX = {};
  const FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","Heiti TC",sans-serif';
  TX.FONT = FONT;
  TX.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; };
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  TX.seed = (s) => { seed = Math.max(1, Math.floor(s * 7919) % 2147483646); };
  TX.rnd = rnd;
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = U.clamp(Math.round(r * f), 0, 255); g = U.clamp(Math.round(g * f), 0, 255); b = U.clamp(Math.round(b * f), 0, 255); return `rgb(${r},${g},${b})`; };
  TX.shade = shade;
  function speckle(g, x, y, w, h, n, col, a, size) { g.fillStyle = col; for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.4 + rnd() * 0.6); const s = size * (0.5 + rnd()); g.fillRect(x + rnd() * w, y + rnd() * h, s, s); } g.globalAlpha = 1; }
  TX.speckle = speckle;

  // ---------- city ground (one big texture) ----------
  TX.ground = function (m, ppm) {
    TX.seed(42);
    const c = TX.canvas(m.w * ppm, m.h * ppm), g = c.getContext('2d');
    const P = ppm;
    const at = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 'g' : m.rows[y][x]);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = at(x, y), X = x * P, Y = y * P;
      if (t === 'r' || t === 'm') {
        g.fillStyle = t === 'm' ? '#4b4540' : '#41464b'; g.fillRect(X, Y, P, P);
        speckle(g, X, Y, P, P, 10, '#000', 0.25, 1.4); speckle(g, X, Y, P, P, 6, '#8a8f94', 0.25, 1.2);
      } else if (t === 's') {
        // Taiwanese red-brick sidewalk
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { g.fillStyle = (i + j + x + y) % 3 ? '#b4644f' : '#a85a46'; g.fillRect(X + i * P / 2, Y + j * P / 2, P / 2, P / 2); }
        g.strokeStyle = 'rgba(70,40,30,0.35)'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, P / 2, P / 2); g.strokeRect(X + P / 2 + 0.5, Y + P / 2 + 0.5, P / 2 - 1, P / 2 - 1);
        speckle(g, X, Y, P, P, 4, '#2b1a14', 0.2, 1.5);
      } else if (t === 'P' || t === 'D') {
        g.fillStyle = (x + y) % 2 ? '#b9b6ad' : '#c1beb5'; g.fillRect(X, Y, P, P);
        g.strokeStyle = 'rgba(60,60,55,0.25)'; g.strokeRect(X + 0.5, Y + 0.5, P - 1, P - 1); speckle(g, X, Y, P, P, 5, '#555', 0.15, 1.5);
      } else if (t === 'L') {
        g.fillStyle = '#8c8b86'; g.fillRect(X, Y, P, P); speckle(g, X, Y, P, P, 8, '#3f3e3a', 0.2, 2); if (rnd() < 0.05) { g.fillStyle = 'rgba(40,40,40,0.25)'; g.beginPath(); g.ellipse(X + P / 2, Y + P / 2, P * 0.4, P * 0.25, rnd(), 0, 7); g.fill(); }
      } else if (t === 'c') {
        g.fillStyle = '#3d7a5c'; g.fillRect(X, Y, P, P); speckle(g, X, Y, P, P, 4, '#2c5a44', 0.3, 1.5);
      } else if (t === 'p') {
        g.fillStyle = '#c9b48d'; g.fillRect(X, Y, P, P); speckle(g, X, Y, P, P, 10, '#8a7655', 0.35, 1.3);
      } else if (t === 'w') {
        g.fillStyle = '#2b5560'; g.fillRect(X, Y, P, P);
      } else if (t === 'B') {
        g.fillStyle = '#5a5a56'; g.fillRect(X, Y, P, P);
      } else {
        const k = t === 'k';
        g.fillStyle = k ? '#7fae5c' : '#6f9f50'; g.fillRect(X, Y, P, P);
        speckle(g, X, Y, P, P, 14, k ? '#5d8e3f' : '#4f7f38', 0.45, 1.6); speckle(g, X, Y, P, P, 6, '#a8cf7a', 0.35, 1.2);
        if (t === 'f') { const cols = ['#f2b33d', '#e46b7b', '#ffffff', '#c66bd1']; for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.arc(X + rnd() * P, Y + rnd() * P, P * 0.07, 0, 7); g.fill(); } }
      }
    }
    // curbs: light edge where sidewalk meets road
    g.fillStyle = '#c9c6bd';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (at(x, y) !== 's') continue;
      if (at(x, y + 1) === 'r') g.fillRect(x * P, (y + 1) * P - 2, P, 3);
      if (at(x, y - 1) === 'r') g.fillRect(x * P, y * P - 1, P, 3);
      if (at(x + 1, y) === 'r') g.fillRect((x + 1) * P - 2, y * P, 3, P);
      if (at(x - 1, y) === 'r') g.fillRect(x * P - 1, y * P, 3, P);
    }
    // road markings
    const line = (x0, y0, x1, y1, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.moveTo(x0 * P, y0 * P); g.lineTo(x1 * P, y1 * P); g.stroke(); g.setLineDash([]); };
    line(0, 47.92, 57.6, 47.92, '#e8c23d', 2); line(0, 48.08, 57.6, 48.08, '#e8c23d', 2); line(64.4, 47.92, m.w, 47.92, '#e8c23d', 2); line(64.4, 48.08, m.w, 48.08, '#e8c23d', 2);
    line(0, 46, 57, 46, '#f2f2f2', 1.5, [3 * P, 2 * P]); line(65, 46, m.w, 46, '#f2f2f2', 1.5, [3 * P, 2 * P]);
    line(0, 50, 57, 50, '#f2f2f2', 1.5, [3 * P, 2 * P]); line(65, 50, m.w, 50, '#f2f2f2', 1.5, [3 * P, 2 * P]);
    line(0, 81, 57.6, 81, '#e8c23d', 1.5, [3 * P, 2 * P]); line(64.4, 81, m.w, 81, '#e8c23d', 1.5, [3 * P, 2 * P]);
    line(61, 0, 61, 43.6, '#f2f2f2', 1.5, [3 * P, 2 * P]); line(61, 52.4, 61, 77.6, '#f2f2f2', 1.5, [3 * P, 2 * P]);
    // stop lines + zebra crossings
    const zebraH = (x0, x1, y0, y1) => { g.fillStyle = 'rgba(240,240,236,0.9)'; for (let y = y0 + 0.2; y < y1; y += 0.9) g.fillRect(x0 * P, y * P, (x1 - x0) * P, 0.45 * P); };
    const zebraV = (x0, x1, y0, y1) => { g.fillStyle = 'rgba(240,240,236,0.9)'; for (let x = x0 + 0.2; x < x1; x += 0.9) g.fillRect(x * P, y0 * P, 0.45 * P, (y1 - y0) * P); };
    zebraH(50, 54, 44, 52); zebraH(68, 72, 44, 52); zebraV(58, 64, 40.2, 43.8); zebraV(58, 64, 52.2, 55.8);
    zebraH(9, 13, 78, 84); zebraH(106, 110, 78, 84); zebraH(74, 78, 78, 84);
    g.fillStyle = 'rgba(232,194,61,0.85)'; g.font = `700 ${P * 1.4}px ${FONT}`; g.textAlign = 'center'; g.fillText('公車停靠', 92 * P, 45.4 * P);
    g.fillStyle = 'rgba(242,242,242,0.8)'; g.fillText('慢', 30 * P, 80.5 * P); g.fillText('慢', 90 * P, 82.6 * P);
    // scooter bays
    g.strokeStyle = 'rgba(245,245,245,0.75)'; g.lineWidth = 1.5;
    for (const [x, y] of SW.SCOOTERS || []) g.strokeRect(x * P + 1, y * P + 1, P - 2, P - 2);
    // basketball court lines
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
    g.strokeRect(38.4 * P, 10.4 * P, 15.2 * P, 16.2 * P); line(38.4, 18.5, 53.6, 18.5, '#fff', 2);
    g.beginPath(); g.arc(46 * P, 18.5 * P, 1.8 * P, 0, 7); g.stroke();
    g.fillStyle = 'rgba(190,70,60,0.8)'; g.fillRect(44.2 * P, 10.6 * P, 3.6 * P, 4.8 * P); g.fillRect(44.2 * P, 21.6 * P, 3.6 * P, 4.8 * P);
    g.beginPath(); g.arc(46 * P, 10.6 * P, 6.2 * P, 0.1, Math.PI - 0.1); g.stroke(); g.beginPath(); g.arc(46 * P, 26.4 * P, 6.2 * P, Math.PI + 0.1, -0.1); g.stroke();
    // tree pits on sidewalks
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (at(x, y) === 'T') { g.fillStyle = '#5a4630'; g.fillRect(x * P + P * 0.15, y * P + P * 0.15, P * 0.7, P * 0.7); }
    return c;
  };

  // ---------- interior floors ----------
  const FLOOR_STYLE = { office: 'carpet', home: 'wood', cafe: 'wood2', church: 'stone', gym: 'rubber', bar: 'darkwood', studio: 'concrete' };
  TX.floor = function (m, ppm) {
    TX.seed(m.id.length * 31);
    const c = TX.canvas(m.w * ppm, m.h * ppm), g = c.getContext('2d'), P = ppm;
    const style = FLOOR_STYLE[m.id] || 'wood';
    const roomAt = (x, y) => (m.def.rooms || []).find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const X = x * P, Y = y * P, room = roomAt(x, y);
      const base = room ? room.floor : m.def.floor[0];
      g.fillStyle = base; g.fillRect(X, Y, P, P);
      const st = room ? 'tile' : style;
      if (st === 'wood' || st === 'wood2' || st === 'darkwood') {
        const pl = P / 4;
        for (let i = 0; i < 4; i++) { g.fillStyle = shade(base, 0.86 + rnd() * 0.22); g.fillRect(X, Y + i * pl, P, pl - 1); const off = rnd() * P; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X + off, Y + i * pl, 1, pl); }
        speckle(g, X, Y, P, P, 6, '#3a2616', 0.12, 2);
      } else if (st === 'carpet') {
        g.fillStyle = shade(base, (x + y) % 2 ? 0.94 : 1.0); g.fillRect(X, Y, P, P); speckle(g, X, Y, P, P, 40, '#2d3a40', 0.12, 1.2);
        g.strokeStyle = 'rgba(0,0,0,0.08)'; g.strokeRect(X + 0.5, Y + 0.5, P - 1, P - 1);
      } else if (st === 'stone' || st === 'tile') {
        g.fillStyle = shade(base, 0.95 + rnd() * 0.08); g.fillRect(X, Y, P, P);
        g.strokeStyle = 'rgba(80,70,60,0.25)'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, P - 1, P - 1);
        if (st === 'tile') { g.strokeRect(X + 0.5, Y + 0.5, P / 2, P / 2); g.strokeRect(X + P / 2 + 0.5, Y + P / 2 + 0.5, P / 2 - 1, P / 2 - 1); }
        speckle(g, X, Y, P, P, 8, '#6b6458', 0.1, 1.5);
      } else if (st === 'rubber') {
        g.fillStyle = shade(base, (x + y) % 2 ? 0.92 : 1); g.fillRect(X, Y, P, P); speckle(g, X, Y, P, P, 50, '#2a2f33', 0.3, 1); speckle(g, X, Y, P, P, 10, '#c25a3a', 0.25, 1);
      } else {
        g.fillStyle = shade(base, 0.96 + rnd() * 0.06); g.fillRect(X, Y, P, P); speckle(g, X, Y, P, P, 20, '#222', 0.12, 1.5);
      }
      if (m.rows[y][x] === 'D') { g.fillStyle = '#6b5a45'; g.fillRect(X + 2, Y, P - 4, P); }
    }
    // a rug in the living areas
    if (m.id === 'home') { const sp = m.spots.sofa || [3, 7]; g.fillStyle = 'rgba(176,74,62,0.85)'; g.fillRect((sp[0] - 1) * P, (sp[1] - 0.5) * P, 3.4 * P, 1.6 * P); g.strokeStyle = 'rgba(255,230,190,0.6)'; g.lineWidth = 3; g.strokeRect((sp[0] - 0.8) * P, (sp[1] - 0.3) * P, 3 * P, 1.2 * P); }
    return c;
  };

  TX.wall = function (color) {
    TX.seed(color.length * 13 + 7);
    const c = TX.canvas(64, 192), g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 64, 192);
    speckle(g, 0, 0, 64, 192, 120, '#000', 0.05, 2); speckle(g, 0, 0, 64, 192, 80, '#fff', 0.06, 2);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 180, 64, 12);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, 178, 64, 2);
    return c;
  };

  // ---------- signs ----------
  TX.sign = function (text, bg, fg, opts) {
    opts = opts || {};
    const vertical = opts.vertical;
    const fs = 64;
    const c = vertical ? TX.canvas(fs * 1.5, fs * 1.15 * Math.max(2, text.length) + fs * 0.6) : TX.canvas(Math.max(fs * 2, text.length * fs * 0.95 + fs), fs * 1.6);
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 4; g.strokeRect(6, 6, c.width - 12, c.height - 12);
    g.fillStyle = fg || '#fff'; g.font = `800 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vertical) { [...text].forEach((ch, i) => g.fillText(ch, c.width / 2, fs * 0.9 + i * fs * 1.15)); }
    else g.fillText(text, c.width / 2, c.height / 2 + 2);
    return c;
  };

  // ---------- facades ----------
  // Returns {map, emissive} canvases for one face. w,h in meters; opts.front marks the street-facing side.
  TX.facade = function (o) {
    const ppm = Math.min(40, Math.floor(1024 / Math.max(o.w, o.h)));
    const W = o.w * ppm, Hh = o.h * ppm;
    const c = TX.canvas(W, Hh), e = TX.canvas(W, Hh);
    const g = c.getContext('2d'), ge = e.getContext('2d');
    ge.fillStyle = '#000'; ge.fillRect(0, 0, W, Hh);
    TX.seed((o.seed || 1) * 97 + o.w * 13 + o.h);
    const P = ppm;
    const win = (x, y, w, h, lit, frame, grille) => {
      // glass
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#2c3e4c'); gr.addColorStop(0.5, '#4f6b7e'); gr.addColorStop(1, '#22313c');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(x, y + h * 0.7); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.65, y); g.lineTo(x, y + h); g.fill();
      if (frame) { g.strokeStyle = frame; g.lineWidth = Math.max(2, P * 0.06); g.strokeRect(x, y, w, h); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke(); }
      if (lit) { const warm = rnd() < 0.7; ge.fillStyle = warm ? '#ffcf8a' : '#cfe6ff'; ge.globalAlpha = 0.65 + rnd() * 0.35; ge.fillRect(x + 1, y + 1, w - 2, h - 2); ge.globalAlpha = 1; g.fillStyle = 'rgba(255,214,150,0.12)'; g.fillRect(x, y, w, h); }
      if (grille) { // 鐵窗 iron window guards
        g.strokeStyle = grille; g.lineWidth = Math.max(1.5, P * 0.035);
        const bx = x - P * 0.12, by = y - P * 0.1, bw = w + P * 0.24, bh = h + P * 0.2;
        g.strokeRect(bx, by, bw, bh);
        for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(bx + bw * i / 7, by); g.lineTo(bx + bw * i / 7, by + bh); g.stroke(); }
        g.beginPath(); g.moveTo(bx, by + bh * 0.5); g.lineTo(bx + bw, by + bh * 0.5); g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(bx, by + bh, bw, P * 0.06);
      }
    };
    const signBand = (text, y, h, bg, fg, glow) => {
      g.fillStyle = bg; g.fillRect(P * 0.3, y, W - P * 0.6, h);
      g.fillStyle = fg; g.font = `800 ${Math.min(h * 0.62, (W - P) / Math.max(2, text.length) * 1.05)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, y + h / 2 + 1);
      if (glow) { ge.fillStyle = glow; ge.font = g.font; ge.textAlign = 'center'; ge.textBaseline = 'middle'; ge.fillText(text, W / 2, y + h / 2 + 1); ge.globalAlpha = 0.25; ge.fillRect(P * 0.3, y, W - P * 0.6, h); ge.globalAlpha = 1; }
    };
    const door = (cx, w, h, col, glass) => {
      const x = cx - w / 2, y = Hh - h;
      g.fillStyle = col; g.fillRect(x - P * 0.12, y - P * 0.12, w + P * 0.24, h + P * 0.12);
      if (glass) { win(x, y, w, h, true, '#cfd3d6', null); ge.fillStyle = '#ffe2b0'; ge.globalAlpha = 0.8; ge.fillRect(x, y, w, h); ge.globalAlpha = 1; }
      else { g.fillStyle = shade(col, 0.75); g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + w * 0.1, y + h * 0.1, w * 0.35, h * 0.8); g.fillRect(x + w * 0.55, y + h * 0.1, w * 0.35, h * 0.8); }
    };
    const tiles = (col, size) => { g.fillStyle = col; g.fillRect(0, 0, W, Hh); g.strokeStyle = 'rgba(0,0,0,0.07)'; g.lineWidth = 1; const s = P * size; for (let y = 0; y < Hh; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (let x = 0; x < W; x += s * 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh); g.stroke(); } speckle(g, 0, 0, W, Hh, W * Hh / 400, '#000', 0.05, 2); };
    const stains = () => { for (let i = 0; i < 6; i++) { const x = rnd() * W; const gr = g.createLinearGradient(x, 0, x, Hh); gr.addColorStop(0, 'rgba(60,50,40,0.18)'); gr.addColorStop(1, 'rgba(60,50,40,0)'); g.fillStyle = gr; g.fillRect(x, P * 0.5, P * (0.2 + rnd() * 0.5), Hh * (0.3 + rnd() * 0.5)); } };
    const floors = Math.max(1, Math.floor(o.h / 3));
    const s = o.style;
    if (s === 'glass') {
      const gr = g.createLinearGradient(0, 0, W, Hh); gr.addColorStop(0, '#3d6680'); gr.addColorStop(0.5, '#6d93a8'); gr.addColorStop(1, '#2e5268'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
      for (let f = 0; f < Math.floor(o.h / 3.4); f++) for (let i = 0; i < Math.floor(o.w / 1.6); i++) {
        const x = i * 1.6 * P, y = f * 3.4 * P;
        g.fillStyle = `rgba(${200 + rnd() * 40},${225 + rnd() * 30},255,${0.06 + rnd() * 0.12})`; g.fillRect(x + 2, y + 2, 1.6 * P - 4, 3.4 * P - 4);
        if (rnd() < 0.45) { ge.fillStyle = rnd() < 0.8 ? '#fff4dc' : '#d6ecff'; ge.globalAlpha = 0.5 + rnd() * 0.4; ge.fillRect(x + 3, y + 3, 1.6 * P - 6, 3.4 * P - 6); ge.globalAlpha = 1; }
      }
      g.strokeStyle = 'rgba(210,225,232,0.8)'; g.lineWidth = Math.max(2, P * 0.08);
      for (let x = 0; x <= W; x += 1.6 * P) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh); g.stroke(); }
      for (let y = 0; y <= Hh; y += 3.4 * P) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      if (o.front) {
        g.fillStyle = '#d7dde0'; g.fillRect(0, Hh - 5 * P, W, 0.5 * P);
        win(P * 0.5, Hh - 4.5 * P, W - P, 4.5 * P, true, '#c9d2d6', null);
        door(o.doorX * P, 3 * P, 3 * P, '#9aa5ab', true);
        signBand(o.sign, Hh - 6.6 * P, 1.3 * P, '#1f3d55', '#eaf4fb', '#bfe3ff');
      }
    } else if (s === 'apartment' || s === 'row') {
      const cols = ['#e8dccb', '#d9c4b0', '#cfd6d8', '#e6d2c9', '#d8d8c8'];
      tiles(o.tint !== undefined ? cols[o.tint % cols.length] : '#e2d6c2', 0.12);
      stains();
      const groundH = 3.4 * P;
      for (let f = 1; f < floors; f++) {
        const y = Hh - groundH - f * 3 * P + 0.6 * P;
        const n = Math.max(1, Math.floor(o.w / 2.6));
        for (let i = 0; i < n; i++) {
          const ww = 1.5 * P, x = (o.w / n) * (i + 0.5) * P - ww / 2;
          win(x, y, ww, 1.4 * P, rnd() < 0.55, '#bfc3c3', rnd() < 0.8 ? (rnd() < 0.7 ? '#e9ecea' : '#7b5a3c') : null);
          if (rnd() < 0.45) { g.fillStyle = '#d9dcd8'; g.fillRect(x + ww * 0.15, y + 1.65 * P, ww * 0.7, 0.5 * P); g.fillStyle = '#9aa0a0'; for (let k = 0; k < 4; k++) g.fillRect(x + ww * 0.2 + k * ww * 0.16, y + 1.72 * P, ww * 0.08, 0.36 * P); }
        }
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y + 2.25 * P, W, 0.12 * P);
      }
      if (o.front) {
        g.fillStyle = '#6f7275'; g.fillRect(0, Hh - groundH, W, groundH);
        if (s === 'row') {
          // open shopfront under a sign band
          const lit = rnd() < 0.85;
          g.fillStyle = '#3a3226'; g.fillRect(P * 0.4, Hh - groundH + 0.9 * P, W - P * 0.8, groundH - 0.9 * P);
          g.fillStyle = 'rgba(255,230,180,0.35)'; g.fillRect(P * 0.4, Hh - groundH + 0.9 * P, W - P * 0.8, groundH - 0.9 * P);
          for (let i = 0; i < 6; i++) { g.fillStyle = ['#c94f4f', '#e8a33a', '#3f7fb8', '#5aa05a', '#ddd'][i % 5]; g.fillRect(P * 0.6 + rnd() * (W - P * 1.6), Hh - P * (0.6 + rnd() * 1.6), P * 0.5, P * 0.4); }
          if (lit) { ge.fillStyle = '#ffd9a0'; ge.globalAlpha = 0.55; ge.fillRect(P * 0.4, Hh - groundH + 0.9 * P, W - P * 0.8, groundH - 0.9 * P); ge.globalAlpha = 1; }
          const bands = ['#c0392b', '#1f6f8b', '#e8a33a', '#2f8f83', '#6b4a7a', '#d35400'];
          const bc = bands[(o.seed || 0) % bands.length];
          signBand(o.sign, Hh - groundH, 0.85 * P, bc, '#fff', '#fff3d6');
        } else {
          // apartment entrance: rolling shutters + lobby gate
          g.fillStyle = '#a7aaab'; g.fillRect(0, Hh - groundH, W, groundH);
          g.strokeStyle = 'rgba(0,0,0,0.25)'; for (let y = Hh - groundH; y < Hh; y += P * 0.12) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
          door(o.doorX * P, 2 * P, 2.6 * P, '#5d4a3a', true);
          signBand(o.sign, Hh - groundH - 0.2 * P, 0.7 * P, '#2f3d34', '#f4e7c6', '#fff0c2');
        }
      }
    } else if (s === 'cafe') {
      g.fillStyle = '#efe3cc'; g.fillRect(0, 0, W, Hh); stains();
      // brick ground floor
      for (let y = Hh - 3.6 * P, r = 0; y < Hh; y += P * 0.22, r++) for (let x = (r % 2) * P * 0.25; x < W; x += P * 0.5) { g.fillStyle = shade('#9a4f36', 0.85 + rnd() * 0.3); g.fillRect(x, y, P * 0.48, P * 0.2); }
      for (let i = 0; i < Math.floor(o.w / 3); i++) win(i * 3 * P + P * 0.8, Hh - 6.2 * P, 1.4 * P, 1.6 * P, rnd() < 0.6, '#5b3a26', null);
      if (o.front) {
        win(P * 0.6, Hh - 3.2 * P, (o.doorX - 1.5) * P - P * 0.6, 2.6 * P, true, '#4a2e1e', null);
        win((o.doorX + 1.5) * P, Hh - 3.2 * P, W - (o.doorX + 1.5) * P - P * 0.6, 2.6 * P, true, '#4a2e1e', null);
        ge.fillStyle = '#ffbe6b'; ge.globalAlpha = 0.85; ge.fillRect(P * 0.6, Hh - 3.2 * P, W - P * 1.2, 2.6 * P); ge.globalAlpha = 1;
        door(o.doorX * P, 1.6 * P, 2.5 * P, '#5b3a26', true);
        signBand(o.sign, Hh - 4.3 * P, 0.9 * P, '#3a2416', '#f6e3c0', '#ffd99a');
      }
    } else if (s === 'church') {
      g.fillStyle = '#f1ede4'; g.fillRect(0, 0, W, Hh); stains();
      const n = Math.max(1, Math.floor(o.w / 3.2));
      for (let i = 0; i < n; i++) {
        const cx = (o.w / n) * (i + 0.5) * P, ww = 1.1 * P, y = Hh - 7 * P;
        if (o.front && Math.abs(cx / P - o.doorX) < 2) continue;
        g.save(); g.beginPath(); g.moveTo(cx - ww / 2, y + 4 * P); g.lineTo(cx - ww / 2, y + ww / 2); g.arc(cx, y + ww / 2, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, y + 4 * P); g.closePath(); g.clip();
        for (let k = 0; k < 30; k++) { g.fillStyle = ['#3567a8', '#c0392b', '#e8b33d', '#2f8f63', '#7a4fa0'][k % 5]; g.fillRect(cx - ww / 2 + rnd() * ww, y + rnd() * 4 * P, P * 0.35, P * 0.35); }
        g.restore();
        ge.save(); ge.beginPath(); ge.rect(cx - ww / 2, y, ww, 4 * P); ge.clip(); ge.fillStyle = '#b8c8ff'; ge.globalAlpha = 0.45; ge.fillRect(cx - ww / 2, y, ww, 4 * P); ge.restore(); ge.globalAlpha = 1;
        g.strokeStyle = '#cfc6b4'; g.lineWidth = 3; g.strokeRect(cx - ww / 2, y + ww / 2, ww, 4 * P - ww / 2);
      }
      if (o.front) {
        const dx = o.doorX * P, dw = 2.4 * P, dh = 3.4 * P;
        g.fillStyle = '#d8cfbf'; g.beginPath(); g.moveTo(dx - dw / 2 - P * 0.3, Hh); g.lineTo(dx - dw / 2 - P * 0.3, Hh - dh); g.arc(dx, Hh - dh, dw / 2 + P * 0.3, Math.PI, 0); g.lineTo(dx + dw / 2 + P * 0.3, Hh); g.fill();
        g.fillStyle = '#6b4128'; g.beginPath(); g.moveTo(dx - dw / 2, Hh); g.lineTo(dx - dw / 2, Hh - dh); g.arc(dx, Hh - dh, dw / 2, Math.PI, 0); g.lineTo(dx + dw / 2, Hh); g.fill();
        g.fillStyle = '#4a2c1a'; g.fillRect(dx - 2, Hh - dh - dw / 2, 4, dh + dw / 2);
        g.fillStyle = '#c9a24a'; g.fillRect(dx - P * 0.08, Hh - dh - 2.6 * P, P * 0.16, 1.4 * P); g.fillRect(dx - P * 0.45, Hh - dh - 2.2 * P, P * 0.9, P * 0.16);
        signBand(o.sign, P * 0.8, 1 * P, '#5b5170', '#fff', '#e6ddff');
      }
    } else if (s === 'gym') {
      g.fillStyle = '#3e4449'; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = 'rgba(255,255,255,0.06)'; for (let x = 0; x < W; x += P * 0.5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh); g.stroke(); }
      win(P * 0.5, Hh - 6.6 * P, W - P, 2.4 * P, true, '#222', null);
      g.fillStyle = 'rgba(20,20,20,0.6)'; for (let i = 0; i < 8; i++) g.fillRect(P + rnd() * (W - 3 * P), Hh - 5.2 * P, P * 0.8, P * 1.0);
      if (o.front) { win(P * 0.5, Hh - 3 * P, W - P, 2.6 * P, true, '#222', null); door(o.doorX * P, 2 * P, 2.6 * P, '#222', true); }
      if (o.front) signBand(o.sign, Hh - 3.9 * P, 0.8 * P, '#c25a3a', '#fff', '#ffb59a');
    } else if (s === 'shop') {
      g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#2f8f83'; g.fillRect(0, P * 0.4, W, P * 0.45); g.fillStyle = '#f2b33d'; g.fillRect(0, P * 0.85, W, P * 0.22); g.fillStyle = '#e46b7b'; g.fillRect(0, P * 1.07, W, P * 0.12);
      if (o.front) {
        win(P * 0.4, Hh - 3 * P, W - P * 0.8, 2.6 * P, true, '#d0d4d4', null);
        for (let r = 0; r < 3; r++) for (let i = 0; i < W / (P * 0.3); i++) { g.fillStyle = ['#e46b7b', '#f2b33d', '#3f7fb8', '#5aa05a', '#fff'][Math.floor(rnd() * 5)]; g.fillRect(P * 0.6 + i * P * 0.3, Hh - 2.6 * P + r * 0.75 * P, P * 0.22, P * 0.32); }
        ge.fillStyle = '#e8fff6'; ge.globalAlpha = 0.85; ge.fillRect(P * 0.4, Hh - 3 * P, W - P * 0.8, 2.6 * P); ge.globalAlpha = 1;
        door(o.doorX * P, 1.8 * P, 2.4 * P, '#c8cccc', true);
        g.fillStyle = '#2f8f83'; g.fillRect(0, Hh - 3.9 * P, W, P * 0.85);
        g.fillStyle = '#fff'; g.font = `800 ${P * 0.6}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.sign + '・24H', W / 2, Hh - 3.47 * P);
        ge.fillStyle = '#c8fff0'; ge.font = g.font; ge.textAlign = 'center'; ge.textBaseline = 'middle'; ge.fillText(o.sign + '・24H', W / 2, Hh - 3.47 * P);
      }
    } else if (s === 'bar') {
      for (let x = 0; x < W; x += P * 0.25) { g.fillStyle = shade('#4a2f1f', 0.8 + rnd() * 0.4); g.fillRect(x, 0, P * 0.24, Hh); }
      for (let i = 0; i < Math.floor(o.w / 3); i++) win(i * 3 * P + P, Hh - 5.8 * P, 1.6 * P, 1.4 * P, true, '#2a1a10', null);
      if (o.front) {
        win(P * 0.8, Hh - 2.9 * P, (o.doorX - 1.4) * P - P * 0.8, 2 * P, true, '#2a1a10', null);
        win((o.doorX + 1.4) * P, Hh - 2.9 * P, W - (o.doorX + 1.4) * P - P * 0.8, 2 * P, true, '#2a1a10', null);
        ge.fillStyle = '#ff9a4a'; ge.globalAlpha = 0.8; ge.fillRect(P * 0.8, Hh - 2.9 * P, W - P * 1.6, 2 * P); ge.globalAlpha = 1;
        door(o.doorX * P, 1.5 * P, 2.5 * P, '#2a1a10', false);
        signBand(o.sign, Hh - 4 * P, 0.8 * P, '#1d120b', '#ffcf7a', '#ffb347');
      }
    } else if (s === 'studio') {
      g.fillStyle = '#9a9c9c'; g.fillRect(0, 0, W, Hh);
      for (let y = P; y < Hh; y += P * 0.9) for (let x = P * 0.5; x < W; x += P * 1.2) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.arc(x, y, P * 0.04, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(0,0,0,0.1)'; for (let y = 0; y < Hh; y += P * 0.9) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let i = 0; i < Math.floor(o.w / 4); i++) win(i * 4 * P + P * 1.5, Hh - 6 * P, 1 * P, 1 * P, rnd() < 0.5, '#333', null);
      if (o.front) {
        door(o.doorX * P, 1.6 * P, 2.4 * P, '#333', false);
        g.font = `800 ${P * 1.1}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c9b8ff'; g.fillText(o.sign, W / 2, Hh - 4 * P);
        ge.font = g.font; ge.textAlign = 'center'; ge.textBaseline = 'middle'; ge.shadowColor = '#a07bff'; ge.shadowBlur = 20; ge.fillStyle = '#d9c9ff'; ge.fillText(o.sign, W / 2, Hh - 4 * P); ge.shadowBlur = 0;
      }
    } else if (s === 'temple') {
      g.fillStyle = '#b8322a'; g.fillRect(0, 0, W, Hh); speckle(g, 0, 0, W, Hh, 200, '#6a1410', 0.15, 2);
      g.fillStyle = '#7a6a58'; g.fillRect(0, Hh - 0.6 * P, W, 0.6 * P);
      if (o.front) {
        const dx = o.doorX * P;
        g.fillStyle = '#7a1c14'; g.fillRect(dx - 1.3 * P, Hh - 3 * P, 2.6 * P, 3 * P);
        g.fillStyle = '#e8b33d'; g.fillRect(dx - 1.2 * P, Hh - 2.9 * P, 1.15 * P, 2.8 * P); g.fillRect(dx + 0.05 * P, Hh - 2.9 * P, 1.15 * P, 2.8 * P);
        g.fillStyle = '#b8322a'; for (const ox of [-0.65, 0.6]) { g.beginPath(); g.arc(dx + ox * P, Hh - 2 * P, 0.35 * P, 0, 7); g.fill(); }
        signBand(o.sign, Hh - 4 * P, 0.8 * P, '#1f1a12', '#e8b33d', '#ffcf7a');
        for (const ox of [-2.6, 2.6]) { g.fillStyle = '#e8402e'; g.beginPath(); g.ellipse(dx + ox * P, Hh - 3.2 * P, 0.35 * P, 0.45 * P, 0, 0, 7); g.fill(); ge.fillStyle = '#ff7a4a'; ge.beginPath(); ge.ellipse(dx + ox * P, Hh - 3.2 * P, 0.35 * P, 0.45 * P, 0, 0, 7); ge.fill(); }
      }
    } else {
      tiles('#d8d2c4', 0.12);
    }
    // side faces of most buildings get a few windows and AC units
    if (!o.front && s !== 'glass' && s !== 'church' && s !== 'temple' && s !== 'shop' && o.w > 3) {
      for (let f = 1; f < floors; f++) for (let i = 0; i < Math.floor(o.w / 5); i++) if (rnd() < 0.6) {
        const x = (i * 5 + 1.5 + rnd()) * P, y = Hh - f * 3 * P - 1.6 * P;
        win(x, y, 1 * P, 1.2 * P, rnd() < 0.4, '#bfc3c3', s === 'row' || s === 'apartment' ? '#e3e6e3' : null);
        if (rnd() < 0.5) { g.fillStyle = '#e0e2de'; g.fillRect(x + 1.3 * P, y + 0.4 * P, 0.8 * P, 0.55 * P); g.fillStyle = '#9aa0a0'; g.beginPath(); g.arc(x + 1.7 * P, y + 0.67 * P, 0.18 * P, 0, 7); g.fill(); }
      }
    }
    return { map: c, emissive: e };
  };

  // roof top: concrete with drain stains
  TX.roof = function () {
    TX.seed(5);
    const c = TX.canvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#8d8c86'; g.fillRect(0, 0, 128, 128); speckle(g, 0, 0, 128, 128, 400, '#55534e', 0.3, 2); speckle(g, 0, 0, 128, 128, 200, '#b8b6ae', 0.2, 2);
    return c;
  };

  // label sprite canvas
  TX.label = function (text, bg, fg) {
    const fs = 44, c = TX.canvas(text.length * fs * 0.95 + fs, fs * 1.5), g = c.getContext('2d');
    g.fillStyle = bg; const r = c.height / 2;
    g.beginPath(); g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r); g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.fill();
    g.fillStyle = fg; g.font = `700 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 2);
    return c;
  };
  TX.emoji = function (e) {
    const c = TX.canvas(96, 96), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath(); g.arc(48, 48, 44, 0, 7); g.fill();
    g.font = '56px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 48, 52);
    return c;
  };
  // screen content textures (code, oscilloscope, menus)
  TX.screen = function (kind) {
    TX.seed(kind.length * 17);
    const c = TX.canvas(256, 160), g = c.getContext('2d');
    if (kind === 'code') { g.fillStyle = '#1e2a33'; g.fillRect(0, 0, 256, 160); for (let i = 0; i < 14; i++) { g.fillStyle = ['#7fd1b9', '#f2b33d', '#c9d6df', '#e46b7b'][i % 4]; g.fillRect(12 + (i % 3) * 14, 10 + i * 10, 40 + rnd() * 150, 4); } }
    else if (kind === 'scope') { g.fillStyle = '#0d1a12'; g.fillRect(0, 0, 256, 160); g.strokeStyle = '#3cff8f'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x < 256; x += 4) g.lineTo(x, 80 + Math.sin(x / 9) * 30 * (x % 64 < 32 ? 1 : 0.2)); g.stroke(); }
    else if (kind === 'menu') { g.fillStyle = '#2b2b2b'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#f6e3c0'; g.font = `700 22px ${FONT}`; g.fillText('MENU', 96, 26); g.font = `16px ${FONT}`; ['美式 70', '拿鐵 90', '燕麥拿鐵 110', '手沖 160', '可頌 65'].forEach((t, i) => g.fillText(t, 30, 54 + i * 22)); }
    else if (kind === 'tv') { const gr = g.createLinearGradient(0, 0, 256, 160); gr.addColorStop(0, '#34607a'); gr.addColorStop(1, '#a5446a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160); }
    else if (kind === 'jukebox') { for (let i = 0; i < 8; i++) { g.fillStyle = ['#ff5a5a', '#ffb347', '#ffe066', '#7cff8a', '#5ad1ff', '#b07cff'][i % 6]; g.fillRect(0, i * 20, 256, 20); } }
    else if (kind === 'vending') { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 256, 160); for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) { g.fillStyle = ['#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad'][(r + i) % 5]; g.fillRect(12 + i * 30, 10 + r * 36, 18, 28); } }
    else if (kind === 'board') { g.fillStyle = '#b8874f'; g.fillRect(0, 0, 256, 160); for (let i = 0; i < 9; i++) { g.fillStyle = ['#fff7b0', '#ffffff', '#ffd1dc', '#cdeefe'][i % 4]; g.save(); g.translate(20 + (i % 3) * 80, 14 + Math.floor(i / 3) * 48); g.rotate((rnd() - 0.5) * 0.2); g.fillRect(0, 0, 60, 40); g.fillStyle = '#d33'; g.fillRect(27, -3, 6, 6); g.restore(); } }
    return c;
  };
})(window.SW);
