'use strict';
// First-person controls.
// Desktop: WASD / ↑↓ move, ←→ turn, mouse drag or pointer lock to look, E/click to interact, P phone.
// Touch: left side = floating joystick, right side = drag to look, quick tap = interact / walk there.
(function (SW) {
  const UI = SW.UI, W = SW.W;
  const $ = (id) => document.getElementById(id);
  const IN = SW.IN = { keys: {}, vec: { x: 0, y: 0 }, lookSens: 0.0042 };

  function dialogOpen() { return !$('dialog').hidden; }
  function look(dx, dy) {
    const p = SW.S && SW.S.p; if (!p || !SW.R3) return;
    p.yaw -= dx * IN.lookSens;
    SW.R3.pitch = Math.max(-1.25, Math.min(1.1, SW.R3.pitch - dy * IN.lookSens));
  }
  IN.release = () => { if (document.pointerLockElement) document.exitPointerLock(); };

  IN.init = function () {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (SW.MG.active()) { SW.MG.key(e); return; }
      const k = e.key;
      if (!$('card').hidden) { if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') { const b = $('card-body').querySelector('.card-actions .btn'); if (b) { e.preventDefault(); b.click(); } } return; }
      if (dialogOpen()) {
        const n = parseInt(k, 10);
        if (n >= 1 && n <= 9 && UI._choiceRes) { e.preventDefault(); UI._choiceRes(n - 1); return; }
        if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') { e.preventDefault(); UI.dialogTap(); }
        return;
      }
      if (!$('sheet').hidden) {
        if (k === 'Escape') UI.closeSheet(true);
        const n = parseInt(k, 10); if (n >= 1 && n <= 9) { const b = $('sheet-items').querySelectorAll('.sitem:not([disabled])')[n - 1]; if (b) b.click(); }
        return;
      }
      if (!$('phone').hidden) { if (k === 'Escape' || k === 'p' || k === 'P') SW.Phone.close(); return; }
      if (!$('title').hidden || UI.busy()) return;
      IN.keys[k.toLowerCase()] = true;
      if ((k === 'e' || k === 'E') && performance.now() - (UI.lastClose || 0) > 350) { e.preventDefault(); SW.Sys.interact(W.target); }
      if (k === 'p' || k === 'P' || k === 'Tab') { e.preventDefault(); IN.release(); SW.Phone.open(); }
      if (k === 'm' || k === 'M') { IN.release(); SW.Phone.open('map'); }
      if (k.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { IN.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { IN.keys = {}; });

    const cv = $('game');
    const touches = {}; // pointerId -> state
    document.addEventListener('mousemove', (e) => { if (document.pointerLockElement === cv && !UI.busy()) look(e.movementX, e.movementY); });
    document.addEventListener('pointerlockchange', () => { $('crosshair').classList.toggle('locked', document.pointerLockElement === cv); });

    cv.addEventListener('pointerdown', (e) => {
      if (dialogOpen()) { UI.dialogTap(); return; }
      if (UI.busy()) return;
      if (document.pointerLockElement === cv) { SW.Sys.interact(W.target); return; }
      cv.setPointerCapture(e.pointerId);
      const touch = e.pointerType === 'touch';
      const side = touch && e.clientX < window.innerWidth * 0.45 ? 'move' : 'look';
      touches[e.pointerId] = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), side, moved: false, touch };
      if (side === 'move') { const st = $('stick'); st.style.left = e.clientX + 'px'; st.style.top = e.clientY + 'px'; st.hidden = false; }
    });
    cv.addEventListener('pointermove', (e) => {
      const tc = touches[e.pointerId]; if (!tc) return;
      const dx = e.clientX - tc.x, dy = e.clientY - tc.y;
      if (Math.hypot(dx, dy) > 8) tc.moved = true;
      if (tc.side === 'move') {
        W.autoPath = null;
        const d = Math.min(Math.hypot(dx, dy), 55), a = Math.atan2(dy, dx);
        IN.vec.x = Math.cos(a) * d / 55; IN.vec.y = Math.sin(a) * d / 55;
        $('stick-knob').style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`;
      } else if (tc.moved && !UI.busy()) {
        look((e.clientX - tc.lx) * (tc.touch ? 1.25 : 1), (e.clientY - tc.ly) * (tc.touch ? 1.25 : 1));
      }
      tc.lx = e.clientX; tc.ly = e.clientY;
    });
    const end = (e) => {
      const tc = touches[e.pointerId]; if (!tc) return;
      delete touches[e.pointerId];
      if (tc.side === 'move') { IN.vec.x = 0; IN.vec.y = 0; $('stick').hidden = true; $('stick-knob').style.transform = ''; }
      const quick = !tc.moved && performance.now() - tc.t < 350;
      if (quick && !UI.busy()) tapAt(tc.x, tc.y, tc.touch);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());

    $('dialog').addEventListener('click', (e) => { if (e.target.closest('#dlg-choices button')) return; UI.dialogTap(); });
    $('btn-act').addEventListener('click', () => SW.Sys.interact(W.target));
    $('btn-phone').addEventListener('click', () => { if (!UI.busy()) { IN.release(); SW.Phone.open(); } });
    $('minimap').addEventListener('click', () => { if (!UI.busy()) { IN.release(); SW.Phone.open('map'); } });
    $('phone-close').addEventListener('click', () => SW.Phone.close());
    $('phone-back').addEventListener('click', () => { if (SW.Phone.back) SW.Phone.back(); });
    $('sheet-close').addEventListener('click', () => UI.closeSheet(true));
    $('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') UI.closeSheet(true); });
    $('phone').addEventListener('click', (e) => { if (e.target.id === 'phone') SW.Phone.close(); });
    $('objective').addEventListener('click', () => UI.toggleObjective());
  };

  function tapAt(sx, sy, touch) {
    const p = SW.S.p;
    const hit = SW.R3.pick(sx, sy);
    if (!hit) { if (!touch) requestLock(); return; }
    if (hit.type === 'ground') {
      if (!touch && !IN.lockHinted) { requestLock(); return; }
      const tx = Math.floor(hit.x), ty = Math.floor(hit.y);
      if (Math.hypot(hit.x - p.x, hit.y - p.y) > 0.8) W.walkTo(tx, ty);
      return;
    }
    const target = hit.type === 'npc' ? { type: 'npc', id: hit.id } : { type: 'obj', obj: hit.obj };
    const tx = hit.type === 'npc' ? SW.S.n[hit.id].x : SW.U.clamp(p.x, hit.obj.x, hit.obj.x + hit.obj.w);
    const ty = hit.type === 'npc' ? SW.S.n[hit.id].y : SW.U.clamp(p.y, hit.obj.y, hit.obj.y + hit.obj.h);
    if (Math.hypot(tx - p.x, ty - p.y) < 2.3) { SW.Sys.interact(target); return; }
    const gx = hit.type === 'npc' ? Math.floor(tx) : Math.floor(SW.U.clamp(p.x, hit.obj.x - 0.5, hit.obj.x + hit.obj.w + 0.5));
    const gy = hit.type === 'npc' ? Math.floor(ty) : Math.floor(SW.U.clamp(p.y, hit.obj.y - 0.5, hit.obj.y + hit.obj.h + 0.5));
    W.walkTo(gx, gy, () => SW.Sys.interact(target));
  }
  function requestLock() {
    const cv = $('game');
    if (SW.R3.mobile || !cv.requestPointerLock) return;
    IN.lockHinted = true;
    try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* not allowed here; drag-to-look still works */ }
    if (!IN.lockToast) { IN.lockToast = true; UI.toast('🖱️ 滑鼠控制視角・點擊互動・Esc 放開滑鼠'); }
  }

  IN.moveVec = function () {
    const k = IN.keys;
    let x = IN.vec.x, y = IN.vec.y;
    if (k.a) x -= 1; if (k.d) x += 1;
    if (k.w || k.arrowup) y -= 1; if (k.s || k.arrowdown) y += 1;
    return { x, y };
  };
  IN.turn = function () { const k = IN.keys; return (k.arrowleft || k.q ? 1 : 0) - (k.arrowright ? 1 : 0); };
})(window.SW);
