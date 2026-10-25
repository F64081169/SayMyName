'use strict';
(function (SW) {
  const UI = SW.UI, W = SW.W;
  const $ = (id) => document.getElementById(id);
  const IN = SW.IN = { keys: {}, joy: null, vec: { x: 0, y: 0 } };

  function dialogOpen() { return !$('dialog').hidden; }

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
      if (k === 'e' || k === 'E' || k === 'Enter' || k === ' ') { e.preventDefault(); SW.Sys.interact(W.target); }
      if (k === 'p' || k === 'P' || k === 'Tab') { e.preventDefault(); SW.Phone.open(); }
      if (k.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { IN.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { IN.keys = {}; });

    const cv = $('game');
    let down = null;
    cv.addEventListener('pointerdown', (e) => {
      if (dialogOpen()) { UI.dialogTap(); return; }
      if (UI.busy()) return;
      cv.setPointerCapture(e.pointerId);
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, joy: false };
    });
    cv.addEventListener('pointermove', (e) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y, d = Math.hypot(dx, dy);
      if (!down.joy && d > 14) {
        down.joy = true; W.autoPath = null; W.marker = null;
        const st = $('stick'); st.style.left = down.x + 'px'; st.style.top = down.y + 'px'; st.hidden = false;
      }
      if (down.joy) {
        const m = Math.min(d, 50), ang = Math.atan2(dy, dx);
        IN.vec.x = Math.cos(ang) * m / 50; IN.vec.y = Math.sin(ang) * m / 50;
        $('stick-knob').style.transform = `translate(${Math.cos(ang) * m}px, ${Math.sin(ang) * m}px)`;
      }
    });
    const end = (e) => {
      if (!down || e.pointerId !== down.id) return;
      const wasJoy = down.joy, short = performance.now() - down.t < 450;
      const pt = { x: down.x, y: down.y };
      down = null; IN.vec.x = 0; IN.vec.y = 0; $('stick').hidden = true; $('stick-knob').style.transform = '';
      if (!wasJoy && short && !UI.busy()) tapAt(pt.x, pt.y);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);

    $('dialog').addEventListener('click', (e) => { if (e.target.closest('#dlg-choices button')) return; UI.dialogTap(); });
    $('btn-act').addEventListener('click', () => SW.Sys.interact(W.target));
    $('btn-phone').addEventListener('click', () => { if (!UI.busy()) SW.Phone.open(); });
    $('phone-close').addEventListener('click', () => SW.Phone.close());
    $('phone-back').addEventListener('click', () => { if (SW.Phone.back) SW.Phone.back(); });
    $('sheet-close').addEventListener('click', () => UI.closeSheet(true));
    $('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') UI.closeSheet(true); });
    $('phone').addEventListener('click', (e) => { if (e.target.id === 'phone') SW.Phone.close(); });
    $('objective').addEventListener('click', () => UI.toggleObjective());
  };

  function tapAt(sx, sy) {
    const p = SW.S.p, w = W.screenToWorld(sx, sy);
    const hit = W.pick(w.x, w.y);
    if (hit) {
      const tx = hit.type === 'npc' ? SW.S.n[hit.id].x : hit.obj.x + hit.obj.w / 2, ty = hit.type === 'npc' ? SW.S.n[hit.id].y : hit.obj.y + hit.obj.h;
      if (Math.hypot(tx - p.x, ty - p.y) < 1.7) { SW.Sys.interact(hit); return; }
      const goal = hit.type === 'npc' ? [Math.floor(tx), Math.floor(ty)] : [Math.floor(hit.obj.x + hit.obj.w / 2), hit.obj.y + hit.obj.h];
      W.walkTo(goal[0], goal[1], () => {
        const n = W.nearest();
        if (n && ((n.type === 'npc' && hit.type === 'npc' && n.id === hit.id) || (n.type === 'obj' && hit.type === 'obj' && n.obj.id === hit.obj.id))) SW.Sys.interact(n);
        else SW.Sys.interact(hit.type === 'npc' && W.present(hit.id) && W.distTo(hit.id) < 2.2 ? hit : n);
      });
      return;
    }
    W.walkTo(Math.floor(w.x), Math.floor(w.y));
  }

  IN.moveVec = function () {
    const k = IN.keys;
    let x = IN.vec.x, y = IN.vec.y;
    if (k.a || k.arrowleft) x -= 1; if (k.d || k.arrowright) x += 1;
    if (k.w || k.arrowup) y -= 1; if (k.s || k.arrowdown) y += 1;
    return { x, y };
  };
})(window.SW);
