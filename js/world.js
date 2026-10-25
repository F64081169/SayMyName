'use strict';
(function (SW) {
  const U = SW.U, T = SW.T;
  const W = SW.W = { maps: {}, cam: { x: 0, y: 0 }, ts: 48, paths: {}, cache: {}, anim: 0, dpr: 1, vw: 0, vh: 0, marker: null, target: null, doorLock: null };
  const SOLID = { '#': 1, B: 1, T: 1, w: 1 };
  const NPC_SPEED = 3.4; // tiles per game minute
  const PLAYER_SPEED = 4.4; // tiles per real second

  W.reset = function () { W.maps = {}; W.cache = {}; W.paths = {}; };

  W.get = function (id) {
    if (W.maps[id]) return W.maps[id];
    const def = id === 'home' ? SW.HOME_LAYOUTS[SW.S.p.housing] : SW.MAPDEF[id];
    if (!def) return null;
    const rows = def.ascii, h = rows.length, w = rows[0].length;
    const solid = new Uint8Array(w * h);
    const doors = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (SOLID[c]) solid[y * w + x] = 1;
      if (c === 'D') doors.push({ x, y });
    }
    for (const o of def.objects) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) solid[y * w + x] = 1;
    const m = { id, def, w, h, rows, solid, doors, objects: def.objects, spots: def.spots, name: def.name };
    W.maps[id] = m;
    return m;
  };

  W.solidAt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? true : !!m.solid[y * m.w + x]);
  W.tileAt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? '#' : m.rows[y][x]);

  // Breadth-first path on the tile grid. Returns list of [x,y] tiles (excluding start).
  W.bfs = function (m, sx, sy, tx, ty) {
    sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
    if (W.solidAt(m, tx, ty)) {
      let best = null, bd = 1e9;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const nx = tx + dx, ny = ty + dy; if (W.solidAt(m, nx, ny)) continue;
        const d = Math.abs(nx - sx) + Math.abs(ny - sy); if (d < bd) { bd = d; best = [nx, ny]; }
      }
      if (!best) return null; tx = best[0]; ty = best[1];
    }
    if (sx === tx && sy === ty) return [];
    const N = m.w * m.h, prev = new Int32Array(N).fill(-1), start = sy * m.w + sx, goal = ty * m.w + tx;
    const q = [start]; prev[start] = start;
    while (q.length) {
      const cur = q.shift(); if (cur === goal) break;
      const cx = cur % m.w, cy = (cur / m.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (W.solidAt(m, nx, ny)) continue;
        const ni = ny * m.w + nx; if (prev[ni] !== -1) continue; prev[ni] = cur; q.push(ni);
      }
    }
    if (prev[goal] === -1) return null;
    const out = []; let c = goal;
    while (c !== start) { out.push([c % m.w, (c / m.w) | 0]); c = prev[c]; }
    return out.reverse();
  };

  W.building = (mapId) => SW.BUILDINGS.find((b) => b.map === mapId);
  W.spot = function (mapId, spot) {
    const m = W.get(mapId); if (!m) return null;
    if (spot && m.spots[spot]) return m.spots[spot];
    return m.spots.entry || m.spots.center || [Math.floor(m.w / 2), Math.floor(m.h / 2)];
  };
  W.entrySpawn = function (mapId) { const m = W.get(mapId); const d = m.doors[0]; return [d.x, d.y - 1]; };

  // ---------- player ----------
  W.enter = function (mapId, x, y, dir) {
    const S = SW.S, p = S.p, from = p.map;
    p.map = mapId; p.x = x; p.y = y; p.dir = dir || 'down';
    W.doorLock = [Math.floor(x), Math.floor(y)];
    W.marker = null; W.autoPath = null;
    if (p.follower && S.n[p.follower]) {
      const n = S.n[p.follower]; n.map = mapId; n.x = x + (dir === 'up' ? 0 : 0); n.y = y + (dir === 'up' ? 1 : -1);
      if (W.solidAt(W.get(mapId), Math.floor(n.x), Math.floor(n.y))) { n.x = x; n.y = y; }
      delete W.paths[p.follower];
    }
    if (SW.UI) SW.UI.placeChanged();
    if (from !== mapId && SW.Dir) SW.Dir.onEnter(mapId, from);
  };

  W.useDoor = function () {
    const p = SW.S.p, m = W.get(p.map);
    if (m.id === 'city') {
      const tx = Math.floor(p.x), ty = Math.floor(p.y);
      const b = SW.BUILDINGS.find((b) => b.door[0] === tx && b.door[1] === ty && b.map);
      if (!b) return;
      if (SW.Sys && !SW.Sys.canEnter(b.map)) { p.y += 0.6; return; }
      const [sx, sy] = W.entrySpawn(b.map);
      W.enter(b.map, sx + 0.5, sy + 0.5, 'up');
    } else {
      const b = W.building(m.id);
      W.enter('city', b.door[0] + 0.5, b.door[1] + 1.5, 'down');
    }
  };

  // fast travel (phone map / YouBike): costs game time, lands you just inside
  W.travelTo = function (mapId) {
    if (mapId === 'city') { const b = W.building(SW.S.p.map); if (b) W.enter('city', b.door[0] + 0.5, b.door[1] + 1.5, 'down'); return; }
    const [sx, sy] = W.entrySpawn(mapId);
    W.enter(mapId, sx + 0.5, sy + 0.5, 'up');
  };

  function blocked(m, x, y) {
    const r = 0.28;
    for (const [ox, oy] of [[-r, -r * 0.4], [r, -r * 0.4], [-r, r], [r, r]]) {
      const tx = Math.floor(x + ox), ty = Math.floor(y + oy);
      if (W.solidAt(m, tx, ty)) return true;
    }
    return false;
  }

  W.movePlayer = function (vx, vy, dt) {
    const p = SW.S.p, m = W.get(p.map);
    const len = Math.hypot(vx, vy); if (len < 0.01) { p.moving = false; return; }
    if (len > 1) { vx /= len; vy /= len; }
    const tired = p.energy < 12 ? 0.65 : 1;
    const sp = PLAYER_SPEED * tired * dt;
    const nx = p.x + vx * sp, ny = p.y + vy * sp;
    if (!blocked(m, nx, p.y)) p.x = nx;
    if (!blocked(m, p.x, ny)) p.y = ny;
    p.moving = true;
    if (Math.abs(vx) > Math.abs(vy)) p.dir = vx > 0 ? 'right' : 'left'; else p.dir = vy > 0 ? 'down' : 'up';
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    if (W.doorLock && (W.doorLock[0] !== tx || W.doorLock[1] !== ty)) W.doorLock = null;
    if (!W.doorLock && W.tileAt(m, tx, ty) === 'D') W.useDoor();
  };

  // tap-to-move: walk a BFS path, optionally interacting at the end
  W.walkTo = function (tx, ty, then) {
    const p = SW.S.p, m = W.get(p.map);
    const path = W.bfs(m, p.x, p.y, tx, ty);
    if (!path) return false;
    W.autoPath = { pts: path, i: 0, then };
    W.marker = { x: tx + 0.5, y: ty + 0.5, t: 0 };
    return true;
  };
  W.followPath = function (dt) {
    const ap = W.autoPath; if (!ap) return false;
    const p = SW.S.p;
    if (ap.i >= ap.pts.length) { W.autoPath = null; W.marker = null; p.moving = false; if (ap.then) ap.then(); return false; }
    const [tx, ty] = ap.pts[ap.i];
    const dx = tx + 0.5 - p.x, dy = ty + 0.5 - p.y, d = Math.hypot(dx, dy);
    if (d < 0.12) { ap.i++; return true; }
    const mapBefore = p.map;
    W.movePlayer(dx / d, dy / d, Math.min(dt, d / PLAYER_SPEED + 0.001));
    if (p.map !== mapBefore) { W.autoPath = null; }
    return true;
  };

  // ---------- NPCs ----------
  function nearestExit(tx, ty) {
    const ex = W.get('city').def.exits; let best = ex[0], bd = 1e9;
    for (const e of ex) { const d = Math.abs(e[0] - tx) + Math.abs(e[1] - ty); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function goalPoint(goal) {
    if (goal.map === 'away') return null;
    if (goal.xy) return goal.xy;
    return W.spot(goal.map, goal.spot);
  }
  // Move one NPC one hop between maps (interior -> city -> interior / away)
  function hop(id, n, goal, instant) {
    const playerMap = SW.S.p.map;
    for (let guard = 0; guard < 5 && n.map !== goal.map; guard++) {
      if (n.map === 'away') {
        const b = W.building(goal.map); const target = b ? b.door : goalPoint(goal) || [22, 20];
        const e = nearestExit(target[0], target[1]);
        n.map = 'city'; n.x = e[0] + 0.5; n.y = e[1] + 0.5; delete W.paths[id];
        if (playerMap === 'city' && !instant) return;
        continue;
      }
      if (n.map !== 'city') {
        const m = W.get(n.map); const d = m.doors[0];
        if (playerMap === n.map && !instant) {
          if (Math.floor(n.x) === d.x && Math.floor(n.y) === d.y) { /* at door */ } else { return walkToward(id, n, d.x, d.y); }
        }
        const b = W.building(n.map);
        n.map = 'city'; n.x = b.door[0] + 0.5; n.y = b.door[1] + 1.5; delete W.paths[id];
        if (playerMap === 'city' && !instant) return;
        continue;
      }
      // in city
      if (goal.map === 'away') {
        const e = nearestExit(Math.floor(n.x), Math.floor(n.y));
        if (playerMap === 'city' && !instant && !(Math.floor(n.x) === e[0] && Math.floor(n.y) === e[1])) return walkToward(id, n, e[0], e[1]);
        n.map = 'away'; delete W.paths[id]; return;
      }
      const b = W.building(goal.map);
      if (!b) { n.map = goal.map; const pt = goalPoint(goal); n.x = pt[0] + 0.5; n.y = pt[1] + 0.5; return; }
      const ox = b.door[0], oy = b.door[1] + 1;
      if (playerMap === 'city' && !instant && !(Math.floor(n.x) === ox && Math.floor(n.y) === oy)) return walkToward(id, n, ox, oy);
      const [sx, sy] = W.entrySpawn(goal.map);
      n.map = goal.map; n.x = sx + 0.5; n.y = sy + 0.5; delete W.paths[id];
      if (playerMap === goal.map && !instant) return;
    }
  }
  let stepBudget = 0;
  function walkToward(id, n, tx, ty) {
    const m = W.get(n.map);
    let pc = W.paths[id];
    if (!pc || pc.map !== n.map || pc.tx !== tx || pc.ty !== ty) {
      const pts = W.bfs(m, n.x, n.y, tx, ty);
      if (!pts) { n.x = tx + 0.5; n.y = ty + 0.5; return; }
      pc = W.paths[id] = { map: n.map, tx, ty, pts, i: 0 };
    }
    let budget = stepBudget;
    n.moving = false;
    while (budget > 0 && pc.i < pc.pts.length) {
      const [px, py] = pc.pts[pc.i];
      const dx = px + 0.5 - n.x, dy = py + 0.5 - n.y, d = Math.hypot(dx, dy);
      if (d <= budget) { n.x = px + 0.5; n.y = py + 0.5; pc.i++; budget -= d; }
      else { n.x += dx / d * budget; n.y += dy / d * budget; budget = 0; }
      n.moving = true;
      if (Math.abs(dx) > Math.abs(dy)) n.dir = dx > 0 ? 'right' : 'left'; else n.dir = dy > 0 ? 'down' : 'up';
    }
  }

  W.updateNPCs = function (dtMin, instant) {
    const S = SW.S;
    for (const id of Object.keys(SW.CH)) {
      const n = S.n[id]; if (!n) continue;
      const goal = SW.Sched.goal(id);
      n.act = goal.act || '';
      n.gmap = goal.map;
      stepBudget = NPC_SPEED * dtMin;
      if (n.map !== goal.map) { hop(id, n, goal, instant); if (n.map !== goal.map) continue; }
      if (goal.map === 'away') continue;
      const pt = goal.follow ? null : goalPoint(goal);
      if (goal.follow) {
        const p = S.p, d = Math.hypot(p.x - n.x, p.y - n.y);
        if (instant || d > 8) { n.x = p.x; n.y = p.y + 0.9; if (W.solidAt(W.get(n.map), Math.floor(n.x), Math.floor(n.y))) n.y = p.y; continue; }
        if (d > 1.25) walkToward(id, n, Math.floor(p.x), Math.floor(p.y)); else n.moving = false;
        if (d > 1.25 && W.paths[id] && W.paths[id].pts.length) { /* path keeps refreshing as player moves */ if (W.paths[id].i > 2) delete W.paths[id]; }
        continue;
      }
      if (!pt) continue;
      if (instant) { n.x = pt[0] + 0.5; n.y = pt[1] + 0.5; n.moving = false; delete W.paths[id]; n.dir = 'down'; continue; }
      if (Math.floor(n.x) !== pt[0] || Math.floor(n.y) !== pt[1] || Math.hypot(n.x - pt[0] - 0.5, n.y - pt[1] - 0.5) > 0.05) walkToward(id, n, pt[0], pt[1]);
      else { n.moving = false; if (goal.face) n.dir = goal.face; }
      if (goal.approach) { const p = S.p; if (Math.hypot(p.x - n.x, p.y - n.y) < 1.4) { n.dir = Math.abs(p.x - n.x) > Math.abs(p.y - n.y) ? (p.x > n.x ? 'right' : 'left') : (p.y > n.y ? 'down' : 'up'); } }
    }
  };

  W.npcsHere = function () {
    const S = SW.S, out = [];
    for (const id of Object.keys(SW.CH)) { const n = S.n[id]; if (n && n.map === S.p.map) out.push(id); }
    return out;
  };
  W.present = (id) => SW.S.n[id] && SW.S.n[id].map === SW.S.p.map;
  W.distTo = (id) => { const n = SW.S.n[id], p = SW.S.p; return Math.hypot(n.x - p.x, n.y - p.y); };

  // ---------- interaction target ----------
  W.nearest = function () {
    const S = SW.S, p = S.p, m = W.get(p.map);
    let best = null, bd = 1.55;
    for (const id of W.npcsHere()) {
      const n = S.n[id]; const d = Math.hypot(n.x - p.x, n.y - p.y) - 0.15;
      if (d < bd) { bd = d; best = { type: 'npc', id }; }
    }
    for (const o of m.objects) {
      if (o.kind === 'decor') continue;
      const cx = U.clamp(p.x, o.x, o.x + o.w), cy = U.clamp(p.y, o.y, o.y + o.h);
      const d = Math.hypot(cx - p.x, cy - p.y) + 0.1;
      if (d < bd) { bd = d; best = { type: 'obj', obj: o }; }
    }
    return best;
  };

  W.pick = function (wx, wy) {
    const S = SW.S, m = W.get(S.p.map);
    for (const id of W.npcsHere()) { const n = S.n[id]; if (Math.abs(n.x - wx) < 0.55 && wy > n.y - 1.1 && wy < n.y + 0.5) return { type: 'npc', id }; }
    for (const o of m.objects) { if (o.kind === 'decor') continue; if (wx >= o.x && wx < o.x + o.w && wy >= o.y && wy < o.y + o.h) return { type: 'obj', obj: o }; }
    return null;
  };

  // ---------- rendering ----------
  W.resize = function (canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth, vh = window.innerHeight;
    W.dpr = dpr; W.vw = vw; W.vh = vh;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    const ts = Math.round(U.clamp(Math.min(vw, vh) / 9.2, 36, 58));
    if (ts !== W.ts) { W.ts = ts; W.cache = {}; }
  };

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  W.rr = rr;

  function renderStatic(m) {
    const ts = W.ts * W.dpr;
    const c = document.createElement('canvas'); c.width = m.w * ts; c.height = m.h * ts;
    const g = c.getContext('2d');
    const def = m.def;
    if (def.outdoor) drawCity(g, m, ts); else drawInterior(g, m, ts);
    // objects
    for (const o of m.objects) {
      if (o.inBuilding) continue;
      const x = o.x * ts, y = o.y * ts, w = o.w * ts, h = o.h * ts;
      g.fillStyle = 'rgba(0,0,0,0.18)'; rr(g, x + ts * 0.08, y + ts * 0.14, w - ts * 0.1, h - ts * 0.06, ts * 0.16); g.fill();
      g.fillStyle = o.color || '#999'; rr(g, x + ts * 0.06, y + ts * 0.04, w - ts * 0.12, h - ts * 0.12, ts * 0.16); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; rr(g, x + ts * 0.1, y + ts * 0.07, w - ts * 0.2, ts * 0.16, ts * 0.08); g.fill();
      if (o.icon) {
        g.font = `${Math.round(ts * 0.52)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(o.icon, x + w / 2, y + h / 2 - ts * 0.02);
      }
    }
    return c;
  }

  function drawInterior(g, m, ts) {
    const def = m.def;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const ch = m.rows[y][x];
      if (ch === '#') continue;
      g.fillStyle = def.floor[(x + y) % 2]; g.fillRect(x * ts, y * ts, ts + 1, ts + 1);
    }
    for (const r of def.rooms || []) {
      g.fillStyle = r.floor; g.globalAlpha = 0.9; g.fillRect(r.x * ts, r.y * ts, r.w * ts, r.h * ts); g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.05)';
      for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) if ((xx + yy) % 2) g.fillRect(xx * ts, yy * ts, ts, ts);
    }
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const ch = m.rows[y][x];
      if (ch === '#') {
        g.fillStyle = def.wall; g.fillRect(x * ts, y * ts, ts + 1, ts + 1);
        if (y + 1 < m.h && m.rows[y + 1][x] !== '#') { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x * ts, y * ts + ts * 0.7, ts + 1, ts * 0.3); }
      } else if (ch === 'D') {
        g.fillStyle = '#e9d9a6'; g.fillRect(x * ts + ts * 0.1, y * ts, ts * 0.8, ts);
        g.fillStyle = '#3b2f24'; g.font = `${Math.round(ts * 0.34)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('出口', x * ts + ts / 2, y * ts + ts / 2);
      }
    }
    g.font = `600 ${Math.round(ts * 0.3)}px ${getComputedStyle(document.body).fontFamily}`;
    g.fillStyle = 'rgba(31,45,54,0.35)'; g.textAlign = 'left'; g.textBaseline = 'top';
    for (const r of def.rooms || []) g.fillText(r.label, r.x * ts + ts * 0.15, (r.y + r.h) * ts - ts * 0.42);
  }

  function drawCity(g, m, ts) {
    const col = { g: ['#8fbf76', '#89b970'], k: ['#9ccc80', '#96c67a'], s: ['#d9d4c8', '#d2cdc0'], r: ['#5d646b', '#5a6168'], p: ['#d8c9a3', '#d2c39c'], P: ['#cfc8b8', '#c9c2b2'], f: ['#8fbf76', '#8fbf76'], w: ['#4f97c4', '#4b92bf'], T: ['#8fbf76', '#89b970'], D: ['#cfc8b8', '#cfc8b8'], B: ['#8fbf76', '#89b970'] };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const ch = m.rows[y][x]; const c = col[ch] || col.g;
      g.fillStyle = c[(x + y) % 2]; g.fillRect(x * ts, y * ts, ts + 1, ts + 1);
      if (ch === 'f') { for (let i = 0; i < 5; i++) { g.fillStyle = ['#f2b33d', '#e46b7b', '#fff'][i % 3]; g.beginPath(); g.arc(x * ts + ts * (0.2 + 0.15 * i), y * ts + ts * (0.3 + 0.4 * U.hash(x + ',' + y + i)), ts * 0.07, 0, 7); g.fill(); } }
      if (ch === 'w') { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = ts * 0.04; g.beginPath(); g.moveTo(x * ts + ts * 0.2, y * ts + ts * 0.5); g.quadraticCurveTo(x * ts + ts * 0.5, y * ts + ts * 0.35, x * ts + ts * 0.8, y * ts + ts * 0.5); g.stroke(); }
    }
    // road markings
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let x = 0; x < m.w; x += 2) { if (x === 22) continue; g.fillRect(x * ts + ts * 0.2, 17 * ts - ts * 0.04, ts * 0.6, ts * 0.08); g.fillRect(x * ts + ts * 0.2, 28 * ts - ts * 0.04, ts * 0.6, ts * 0.08); }
    for (let y = 0; y < 34; y += 2) { if (y === 16 || y === 27) continue; g.fillRect(23 * ts - ts * 0.04, y * ts + ts * 0.2, ts * 0.08, ts * 0.6); }
    // crosswalks
    g.fillStyle = 'rgba(255,255,255,0.6)';
    for (const [cx, cy] of [[22, 16], [22, 27]]) for (let i = 0; i < 4; i++) { g.fillRect((cx - 1) * ts + ts * 0.15, cy * ts + i * ts * 0.5 + ts * 0.05, ts * 0.7, ts * 0.25); g.fillRect((cx + 2) * ts + ts * 0.15, cy * ts + i * ts * 0.5 + ts * 0.05, ts * 0.7, ts * 0.25); }
    // trees
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.rows[y][x] === 'T') {
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x * ts + ts * 0.55, y * ts + ts * 0.8, ts * 0.4, ts * 0.16, 0, 0, 7); g.fill();
      g.fillStyle = '#7a5a3a'; g.fillRect(x * ts + ts * 0.44, y * ts + ts * 0.5, ts * 0.12, ts * 0.32);
      g.fillStyle = U.hash(x + 't' + y) > 0.5 ? '#4f8f4a' : '#5c9a52'; g.beginPath(); g.arc(x * ts + ts * 0.5, y * ts + ts * 0.38, ts * 0.38, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(x * ts + ts * 0.38, y * ts + ts * 0.26, ts * 0.14, 0, 7); g.fill();
    }
    // buildings
    const font = getComputedStyle(document.body).fontFamily;
    for (const b of SW.BUILDINGS) {
      const x = b.x * ts, y = b.y * ts, w = b.w * ts, h = b.h * ts;
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + ts * 0.15, y + ts * 0.2, w, h);
      g.fillStyle = b.body; g.fillRect(x, y, w, h);
      g.fillStyle = b.roof; g.fillRect(x, y, w, h * 0.38);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y, w, ts * 0.18);
      if (b.tiles) { g.fillStyle = 'rgba(255,255,255,0.25)'; for (let yy = y + h * 0.4; yy < y + h - ts; yy += ts * 0.25) g.fillRect(x, yy, w, 1); }
      // windows
      g.fillStyle = 'rgba(70,110,140,0.55)';
      for (let yy = b.y + Math.ceil(b.h * 0.42); yy < b.y + b.h - 1; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) {
        if ((xx - b.x) % 2 === 1 || xx === b.door[0]) continue; g.fillRect(xx * ts + ts * 0.2, yy * ts + ts * 0.2, ts * 0.6, ts * 0.5);
      }
      if (b.steeple) { g.fillStyle = '#5b5170'; g.beginPath(); g.moveTo(x + w / 2 - ts * 0.6, y); g.lineTo(x + w / 2, y - ts * 1.3); g.lineTo(x + w / 2 + ts * 0.6, y); g.fill(); g.fillStyle = '#f2e7c9'; g.fillRect(x + w / 2 - ts * 0.04, y - ts * 1.25, ts * 0.08, ts * 0.45); g.fillRect(x + w / 2 - ts * 0.18, y - ts * 1.12, ts * 0.36, ts * 0.08); }
      // sign
      const fs = Math.round(ts * 0.42); g.font = `700 ${fs}px ${font}`; const tw = g.measureText(b.sign).width + ts * 0.5;
      const sx = x + w / 2 - tw / 2, sy = y + h * 0.38 - fs * 0.7;
      g.fillStyle = b.signColor; rr(g, sx, sy, tw, fs * 1.45, ts * 0.12); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.sign, x + w / 2, sy + fs * 0.74);
      // door
      const dx = b.door[0] * ts, dy = b.door[1] * ts;
      g.fillStyle = b.shop ? '#bfe7df' : '#3b2f24'; g.fillRect(dx + ts * 0.12, dy + ts * 0.1, ts * 0.76, ts * 0.9);
      g.fillStyle = b.shop ? '#2f8f83' : '#f2b33d'; g.fillRect(dx + ts * 0.12, dy + ts * 0.1, ts * 0.76, ts * 0.12);
      if (b.shop) { g.fillStyle = '#2f8f83'; g.fillRect(x, y + h * 0.38, w, ts * 0.14); g.fillStyle = '#f2b33d'; g.fillRect(x, y + h * 0.38 + ts * 0.14, w, ts * 0.08); }
    }
    // lamps
    for (const [lx, ly] of W.lamps()) { g.fillStyle = '#3d454c'; g.fillRect(lx * ts + ts * 0.45, ly * ts + ts * 0.15, ts * 0.1, ts * 0.7); g.fillStyle = '#f5e3a1'; g.beginPath(); g.arc(lx * ts + ts * 0.5, ly * ts + ts * 0.15, ts * 0.12, 0, 7); g.fill(); }
  }
  W.lamps = function () {
    if (W._lamps) return W._lamps;
    const out = [];
    for (let x = 3; x < 46; x += 6) { out.push([x, 15]); out.push([x, 26]); }
    for (let x = 6; x < 46; x += 8) out.push([x, 34]);
    W._lamps = out.filter(([x, y]) => x !== 21 && x !== 24); return W._lamps;
  };

  // ---------- characters ----------
  W.drawChar = function (g, cx, cy, s, look, opt) {
    opt = opt || {};
    const dir = opt.dir || 'down', bob = opt.bob || 0;
    const y0 = cy + bob;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(cx, cy + s * 0.42, s * 0.26, s * 0.08, 0, 0, 7); g.fill();
    // legs
    g.fillStyle = '#2d3640'; const legSw = opt.moving ? Math.sin(W.anim * 14) * s * 0.05 : 0;
    g.fillRect(cx - s * 0.13, y0 + s * 0.22 + legSw, s * 0.1, s * 0.18); g.fillRect(cx + s * 0.03, y0 + s * 0.22 - legSw, s * 0.1, s * 0.18);
    // body
    g.fillStyle = look.outfit; rr(g, cx - s * 0.22, y0 - s * 0.08, s * 0.44, s * 0.36, s * 0.12); g.fill();
    if (look.acc === 'apron') { g.fillStyle = '#f6f0e3'; rr(g, cx - s * 0.14, y0 - s * 0.02, s * 0.28, s * 0.3, s * 0.06); g.fill(); }
    if (look.acc === 'cardigan') { g.fillStyle = 'rgba(80,70,60,0.55)'; g.fillRect(cx - s * 0.22, y0 - s * 0.05, s * 0.09, s * 0.32); g.fillRect(cx + s * 0.13, y0 - s * 0.05, s * 0.09, s * 0.32); }
    if (look.acc === 'flannel') { g.fillStyle = 'rgba(160,40,40,0.4)'; for (let i = 0; i < 3; i++) g.fillRect(cx - s * 0.22, y0 - s * 0.04 + i * s * 0.1, s * 0.44, s * 0.03); }
    if (look.acc === 'tie') { g.fillStyle = '#b8433a'; g.beginPath(); g.moveTo(cx - s * 0.04, y0 - s * 0.07); g.lineTo(cx + s * 0.04, y0 - s * 0.07); g.lineTo(cx, y0 + s * 0.15); g.fill(); }
    // head
    const hy = y0 - s * 0.27, hr = s * 0.21;
    if (look.style === 'long' || look.style === 'pony') { g.fillStyle = look.hair; rr(g, cx - hr * 1.05, hy - hr * 0.2, hr * 2.1, hr * 2.0, hr * 0.6); g.fill(); }
    g.fillStyle = look.skin; g.beginPath(); g.arc(cx, hy, hr, 0, 7); g.fill();
    g.fillStyle = look.hair;
    const st = look.style;
    if (st === 'bald') { g.fillRect(cx - hr, hy - hr * 0.1, hr * 0.25, hr * 0.5); g.fillRect(cx + hr * 0.75, hy - hr * 0.1, hr * 0.25, hr * 0.5); }
    else {
      g.beginPath(); g.arc(cx, hy - hr * 0.08, hr * 1.04, Math.PI, 0); g.fill();
      if (dir === 'up') { g.beginPath(); g.arc(cx, hy, hr * 1.02, 0, 7); g.fill(); }
      if (st === 'bob') { g.fillRect(cx - hr * 1.04, hy - hr * 0.1, hr * 0.35, hr * 1.0); g.fillRect(cx + hr * 0.69, hy - hr * 0.1, hr * 0.35, hr * 1.0); }
      if (st === 'spiky') { for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * hr * 0.4 - hr * 0.2, hy - hr * 0.7); g.lineTo(cx + i * hr * 0.4, hy - hr * 1.45); g.lineTo(cx + i * hr * 0.4 + hr * 0.2, hy - hr * 0.7); g.fill(); } }
      if (st === 'pony') { g.beginPath(); g.arc(cx + hr * 0.95, hy - hr * 0.7, hr * 0.42, 0, 7); g.fill(); }
      if (st === 'neat') { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(cx - hr * 0.3, hy - hr * 1.0, hr * 0.08, hr * 0.5); }
      if (st === 'beard') { g.fillStyle = look.hair; g.beginPath(); g.arc(cx, hy + hr * 0.35, hr * 0.62, 0, Math.PI); g.fill(); }
    }
    if (look.acc === 'cap') { g.fillStyle = look.outfit; g.beginPath(); g.arc(cx, hy - hr * 0.25, hr * 1.02, Math.PI, 0); g.fill(); g.fillRect(cx - hr * 0.2, hy - hr * 0.35, hr * 1.4, hr * 0.22); }
    if (dir !== 'up') {
      const ex = dir === 'left' ? -hr * 0.3 : dir === 'right' ? hr * 0.3 : 0;
      g.fillStyle = '#1f2328';
      if (dir !== 'right') g.fillRect(cx - hr * 0.42 + ex, hy + hr * 0.05, hr * 0.16, hr * 0.22);
      if (dir !== 'left') g.fillRect(cx + hr * 0.26 + ex, hy + hr * 0.05, hr * 0.16, hr * 0.22);
      if (look.acc === 'glasses') { g.strokeStyle = '#1f2328'; g.lineWidth = Math.max(1, s * 0.025); g.strokeRect(cx - hr * 0.58 + ex, hy - hr * 0.02, hr * 0.48, hr * 0.36); g.strokeRect(cx + hr * 0.1 + ex, hy - hr * 0.02, hr * 0.48, hr * 0.36); }
      g.fillStyle = 'rgba(230,110,110,0.35)'; g.beginPath(); g.arc(cx - hr * 0.55 + ex, hy + hr * 0.45, hr * 0.14, 0, 7); g.arc(cx + hr * 0.55 + ex, hy + hr * 0.45, hr * 0.14, 0, 7); g.fill();
    }
  };

  W.render = function (ctx) {
    const S = SW.S, p = S.p, m = W.get(p.map), ts = W.ts, dpr = W.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = m.def.outdoor ? '#3d4a3a' : '#1f2d36'; ctx.fillRect(0, 0, W.vw, W.vh);
    const vwT = W.vw / ts, vhT = W.vh / ts;
    let cx = p.x - vwT / 2, cy = p.y - vhT / 2;
    if (m.w <= vwT) cx = (m.w - vwT) / 2; else cx = U.clamp(cx, 0, m.w - vwT);
    if (m.h <= vhT - 1.5) cy = (m.h - vhT) / 2 - 0.4; else cy = U.clamp(cy, -1.4, m.h - vhT + 1.6);
    W.cam.x = cx; W.cam.y = cy;
    let st = W.cache[m.id];
    if (!st) st = W.cache[m.id] = renderStatic(m);
    ctx.drawImage(st, -cx * ts, -cy * ts, m.w * ts, m.h * ts);

    const target = W.target;
    if (target && !SW.UI.busy()) {
      ctx.strokeStyle = 'rgba(242,179,61,' + (0.6 + 0.4 * Math.sin(W.anim * 6)) + ')'; ctx.lineWidth = 3;
      if (target.type === 'obj') { const o = target.obj; rr(ctx, (o.x - cx) * ts + 2, (o.y - cy) * ts + 2, o.w * ts - 4, o.h * ts - 4, ts * 0.18); ctx.stroke(); }
    }
    if (W.marker) { const mk = W.marker; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse((mk.x - cx) * ts, (mk.y - cy) * ts + ts * 0.25, ts * 0.25 + Math.sin(W.anim * 8) * 2, ts * 0.1, 0, 0, 7); ctx.stroke(); }

    // characters sorted by y
    const list = [];
    for (const id of W.npcsHere()) list.push({ id, n: S.n[id] });
    list.push({ id: 'me', n: p });
    list.sort((a, b) => a.n.y - b.n.y);
    const font = '600 ' + Math.round(ts * 0.27) + 'px ' + getComputedStyle(document.body).fontFamily;
    for (const it of list) {
      const n = it.n, sx = (n.x - cx) * ts, sy = (n.y - cy) * ts - ts * 0.12;
      const look = it.id === 'me' ? p.look : SW.CH[it.id].look;
      const bob = n.moving ? Math.sin(W.anim * 14 + (it.id.length)) * ts * 0.03 : 0;
      W.drawChar(ctx, sx, sy, ts * 1.05, look, { dir: n.dir || 'down', bob, moving: n.moving });
      if (target && target.type === 'npc' && target.id === it.id && !SW.UI.busy()) { ctx.strokeStyle = 'rgba(242,179,61,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy + ts * 0.42, ts * 0.38, ts * 0.13, 0, 0, 7); ctx.stroke(); }
      // name tag
      ctx.font = font; const label = it.id === 'me' ? p.name : SW.CH[it.id].name;
      const tw = ctx.measureText(label).width + 10, ty = sy - ts * 0.78;
      ctx.fillStyle = it.id === 'me' ? 'rgba(242,179,61,0.92)' : 'rgba(31,45,54,0.72)'; rr(ctx, sx - tw / 2, ty - ts * 0.17, tw, ts * 0.34, ts * 0.17); ctx.fill();
      ctx.fillStyle = it.id === 'me' ? '#1f2d36' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, sx, ty + 1);
      if (it.id !== 'me') {
        const bub = SW.Sys.bubble(it.id);
        if (bub) {
          const by = ty - ts * 0.42 + Math.sin(W.anim * 4) * 2;
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, by, ts * 0.24, 0, 7); ctx.fill();
          ctx.font = `${Math.round(ts * 0.3)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.fillText(bub, sx, by + 1);
        }
      }
    }

    // lighting
    const dark = T.dark();
    if (m.def.outdoor && dark > 0.01) {
      ctx.fillStyle = `rgba(14,22,48,${dark})`; ctx.fillRect(0, 0, W.vw, W.vh);
      ctx.globalCompositeOperation = 'lighter';
      for (const [lx, ly] of W.lamps()) {
        const x = (lx + 0.5 - cx) * ts, y = (ly + 0.3 - cy) * ts; if (x < -ts * 3 || y < -ts * 3 || x > W.vw + ts * 3 || y > W.vh + ts * 3) continue;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, ts * 2.4); gr.addColorStop(0, `rgba(255,214,140,${0.45 * dark / 0.55})`); gr.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - ts * 2.4, y - ts * 2.4, ts * 4.8, ts * 4.8);
      }
      for (const b of SW.BUILDINGS) {
        const x = (b.door[0] + 0.5 - cx) * ts, y = (b.door[1] + 0.8 - cy) * ts;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, ts * 1.6); gr.addColorStop(0, `rgba(255,200,120,${0.4 * dark / 0.55})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - ts * 1.6, y - ts * 1.6, ts * 3.2, ts * 3.2);
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (!m.def.outdoor && dark > 0.3) {
      ctx.fillStyle = `rgba(30,24,10,${(dark - 0.3) * 0.25})`; ctx.fillRect(0, 0, W.vw, W.vh);
    }
  };

  W.screenToWorld = (sx, sy) => ({ x: sx / W.ts + W.cam.x, y: sy / W.ts + W.cam.y });
})(window.SW);
