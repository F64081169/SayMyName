'use strict';
// 3D models built from primitives: people, cats, furniture, street props, vehicles.
(function (SW) {
  const THREE = window.THREE;
  const TX = SW.TX;
  const MD = SW.MD = {};
  const matCache = {};
  MD.mat = function (color, o) {
    o = o || {};
    const key = color + JSON.stringify(o);
    if (matCache[key]) return matCache[key];
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, o));
    matCache[key] = m; return m;
  };
  const M = MD.mat;
  MD.tex = function (canvas, rep) {
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = MD.aniso || 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  };
  const geoCache = {};
  const BG = (w, h, d) => { const k = `b${w},${h},${d}`; return geoCache[k] || (geoCache[k] = new THREE.BoxGeometry(w, h, d)); };
  const CG = (rt, rb, h, s) => { const k = `c${rt},${rb},${h},${s}`; return geoCache[k] || (geoCache[k] = new THREE.CylinderGeometry(rt, rb, h, s || 14)); };
  const SG = (r, ws, hs) => { const k = `s${r},${ws},${hs}`; return geoCache[k] || (geoCache[k] = new THREE.SphereGeometry(r, ws || 16, hs || 12)); };
  MD.box = function (parent, w, h, d, mat, x, y, z, ry) {
    const m = new THREE.Mesh(BG(w, h, d), typeof mat === 'string' ? M(mat) : mat);
    m.position.set(x || 0, (y || 0) + h / 2, z || 0); if (ry) m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  MD.cyl = function (parent, rt, rb, h, mat, x, y, z, seg) {
    const m = new THREE.Mesh(CG(rt, rb, h, seg), typeof mat === 'string' ? M(mat) : mat);
    m.position.set(x || 0, (y || 0) + h / 2, z || 0); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  MD.sph = function (parent, r, mat, x, y, z, sx, sy, sz) {
    const m = new THREE.Mesh(SG(r), typeof mat === 'string' ? M(mat) : mat);
    m.position.set(x || 0, y || 0, z || 0); if (sx) m.scale.set(sx, sy || sx, sz || sx); m.castShadow = true; parent.add(m); return m;
  };
  const box = MD.box, cyl = MD.cyl, sph = MD.sph;
  const screenMat = {};
  MD.screen = (kind, glow) => screenMat[kind] || (screenMat[kind] = new THREE.MeshStandardMaterial({ map: MD.tex(TX.screen(kind)), emissive: 0xffffff, emissiveMap: MD.tex(TX.screen(kind)), emissiveIntensity: glow || 0.8, roughness: 0.4 }));

  // ---------- people ----------
  const PANTS = { mira: '#2c3446', hsiu: '#3c4a5c', pei: '#2f2a26', anson: '#6d6a60', lele: '#e8e2d6', boss: '#3a3d42', tsai: '#222', coach: '#222', pastor: '#4a4a44', landlord: '#5a5246', zhe: '#3a3a4a', kai: '#5b5f4a', yuna: '#2b2b35' };
  const HEIGHT = { mira: 1.6, hsiu: 1.74, pei: 1.63, anson: 1.78, lele: 1.57, boss: 1.7, tsai: 1.72, coach: 1.82, pastor: 1.68, landlord: 1.62, zhe: 1.76, kai: 1.77, yuna: 1.65 };
  const flannelMat = {};
  function torsoMat(look) {
    if (look.acc !== 'flannel') return M(look.outfit, { roughness: 0.9 });
    if (flannelMat[look.outfit]) return flannelMat[look.outfit];
    const c = TX.canvas(64, 64), g = c.getContext('2d'); g.fillStyle = look.outfit; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(150,30,30,0.55)'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 6, 64); g.fillRect(0, i, 64, 6); }
    return (flannelMat[look.outfit] = new THREE.MeshStandardMaterial({ map: MD.tex(c, [2, 2]), roughness: 0.9 }));
  }
  MD.human = function (look, opt) {
    opt = opt || {};
    const H = opt.height || 1.68, s = H / 1.68;
    const root = new THREE.Group();
    const body = new THREE.Group(); body.scale.setScalar(s); root.add(body);
    const skin = M(look.skin, { roughness: 0.7 }), hair = M(look.hair, { roughness: 0.6 }), pants = M(opt.pants || '#30343a', { roughness: 0.9 }), shoe = M('#1f1f22', { roughness: 0.6 });
    const outfit = torsoMat(look);
    const legLen = 0.8, hipY = 0.86;
    const legs = [];
    for (const sx of [-0.095, 0.095]) {
      const pivot = new THREE.Group(); pivot.position.set(sx, hipY, 0); body.add(pivot);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, legLen - 0.16, 4, 10), pants); leg.position.y = -legLen / 2 + 0.02; leg.castShadow = true; pivot.add(leg);
      const sh = new THREE.Mesh(BG(0.1, 0.07, 0.24), shoe); sh.position.set(0, -legLen + 0.03, 0.04); sh.castShadow = true; pivot.add(sh);
      legs.push(pivot);
    }
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.32, 6, 14), outfit);
    torso.scale.set(1.18, 1, 0.72); torso.position.y = hipY + 0.27; torso.castShadow = true; body.add(torso);
    const hips = new THREE.Mesh(BG(0.32, 0.14, 0.2), pants); hips.position.y = hipY + 0.02; body.add(hips);
    const arms = [];
    for (const sx of [-0.235, 0.235]) {
      const pivot = new THREE.Group(); pivot.position.set(sx, hipY + 0.52, 0); body.add(pivot);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), outfit); arm.position.y = -0.27; arm.castShadow = true; pivot.add(arm);
      const hand = new THREE.Mesh(SG(0.045), skin); hand.position.y = -0.55; pivot.add(hand);
      arms.push(pivot);
    }
    const neck = new THREE.Mesh(CG(0.05, 0.055, 0.1, 10), skin); neck.position.y = hipY + 0.62; body.add(neck);
    const head = new THREE.Group(); head.position.y = hipY + 0.78; body.add(head);
    const hr = 0.115;
    const skull = new THREE.Mesh(SG(hr, 20, 16), skin); skull.scale.set(0.92, 1.06, 0.98); skull.castShadow = true; head.add(skull);
    for (const ex of [-0.038, 0.038]) {
      const eye = new THREE.Mesh(SG(0.014, 8, 6), M('#1d1d22', { roughness: 0.3 })); eye.position.set(ex, 0.012, hr * 0.9); head.add(eye);
      const brow = new THREE.Mesh(BG(0.036, 0.008, 0.01), hair); brow.position.set(ex, 0.045, hr * 0.92); head.add(brow);
    }
    const nose = new THREE.Mesh(SG(0.014, 8, 6), skin); nose.position.set(0, -0.012, hr * 1.0); nose.scale.set(1, 1.2, 1); head.add(nose);
    const mouth = new THREE.Mesh(BG(0.034, 0.006, 0.006), M('#9b4a45')); mouth.position.set(0, -0.052, hr * 0.92); head.add(mouth);
    for (const ex of [-1, 1]) { const ear = new THREE.Mesh(SG(0.022, 8, 6), skin); ear.position.set(ex * hr * 0.92, 0, 0); ear.scale.set(0.5, 1, 0.8); head.add(ear); }
    // hair
    const st = look.style;
    if (st !== 'bald') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.08, 20, 14, 0, Math.PI * 2, 0, Math.PI * (st === 'spiky' ? 0.5 : 0.56)), hair);
      cap.rotation.x = -0.25; cap.position.set(0, 0.012, -0.008); cap.castShadow = true; head.add(cap);
      const back = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.07, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hair); back.rotation.x = -1.35; back.position.set(0, 0.0, -0.01); head.add(back);
    } else {
      const band = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.95, 0.022, 6, 18, Math.PI * 1.2), hair); band.rotation.set(Math.PI / 2, 0, Math.PI * -0.1 + Math.PI * 1.4); band.position.y = 0.0; head.add(band);
    }
    if (st === 'bob') { box(head, hr * 2.1, hr * 1.25, hr * 1.1, hair, 0, -hr * 0.95, -hr * 0.42); for (const ex of [-1, 1]) box(head, hr * 0.32, hr * 1.1, hr * 1.2, hair, ex * hr * 0.92, -hr * 0.85, -0.005); }
    if (st === 'long') { const L = box(head, hr * 2.1, hr * 3.1, hr * 0.8, hair, 0, -hr * 2.6, -hr * 0.62); L.scale.x = 1; for (const ex of [-1, 1]) box(head, hr * 0.28, hr * 2.2, hr * 0.9, hair, ex * hr * 0.9, -hr * 1.9, -hr * 0.15); }
    if (st === 'pony') { sph(head, hr * 0.42, hair, 0, hr * 0.45, -hr * 1.05); const tail = sph(head, hr * 0.35, hair, 0, -hr * 0.5, -hr * 1.25, 0.8, 2.2, 0.8); tail.rotation.x = 0.3; }
    if (st === 'spiky') { for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const c = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 6), hair); c.position.set(Math.cos(a) * hr * 0.55, hr * 0.85, Math.sin(a) * hr * 0.55 - 0.01); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); head.add(c); } }
    if (st === 'neat') { box(head, hr * 1.2, hr * 0.25, hr * 1.4, hair, hr * 0.2, hr * 0.78, 0.0); }
    if (st === 'beard') { const b = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.98, 16, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), hair); b.position.set(0, -0.005, 0.012); head.add(b); }
    if (look.acc === 'glasses') { const gm = M('#1d1d22', { roughness: 0.3 }); for (const ex of [-0.04, 0.04]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0045, 6, 16), gm); r.position.set(ex, 0.012, hr * 0.97); head.add(r); } box(head, 0.03, 0.005, 0.005, gm, 0, 0.012, hr * 0.98); }
    if (look.acc === 'cap') { const cp = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), M(look.outfit)); cp.position.y = 0.02; head.add(cp); box(head, hr * 1.5, 0.012, hr * 1.1, M(look.outfit), 0, 0.03, hr * 0.95); }
    if (look.acc === 'apron') { const a = box(body, 0.34, 0.5, 0.02, M('#f2ead8', { roughness: 0.9 }), 0, hipY - 0.12, 0.125); a.castShadow = false; }
    if (look.acc === 'tie') box(body, 0.05, 0.36, 0.02, M('#b8433a'), 0, hipY + 0.2, 0.125);
    if (look.acc === 'cardigan') { const cm = M(new THREE.Color(look.outfit).multiplyScalar(0.6).getStyle()); for (const ex of [-1, 1]) box(body, 0.12, 0.5, 0.25, cm, ex * 0.13, hipY + 0.04, 0.0); }
    root.userData.parts = { legs, arms, torso, head, body };
    root.userData.h = H;
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return root;
  };
  MD.HEIGHT = HEIGHT; MD.PANTS = PANTS;
  MD.animHuman = function (h, dt, moving, speed) {
    const p = h.userData.parts; if (!p) return;
    h.userData.ph = (h.userData.ph || Math.random() * 6) + dt * (moving ? 9 * (speed || 1) : 1.6);
    const ph = h.userData.ph;
    const sw = moving ? Math.sin(ph) * 0.55 : 0;
    p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw;
    p.arms[0].rotation.x = -sw * 0.8; p.arms[1].rotation.x = sw * 0.8;
    p.arms[0].rotation.z = -0.06; p.arms[1].rotation.z = 0.06;
    p.body.position.y = moving ? Math.abs(Math.cos(ph)) * 0.035 : Math.sin(ph) * 0.004;
    p.torso.scale.y = moving ? 1 : 1 + Math.sin(ph) * 0.012;
  };

  // ---------- cats ----------
  MD.cat = function (coat, id) {
    const g = new THREE.Group(), cm = M(coat, { roughness: 0.95 });
    const white = M('#f4f2ec', { roughness: 0.95 });
    const bodyM = sph(g, 0.16, cm, 0, 0.2, 0, 1.0, 0.75, 1.55); bodyM.castShadow = true;
    const head = new THREE.Group(); head.position.set(0, 0.32, 0.22); g.add(head);
    sph(head, 0.085, cm, 0, 0, 0, 1.1, 0.95, 1);
    for (const ex of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), cm); e.position.set(ex * 0.05, 0.075, -0.01); e.rotation.z = -ex * 0.25; head.add(e); const eye = sph(head, 0.012, M('#c9d84a', { emissive: 0x334400, roughness: 0.2 }), ex * 0.034, 0.012, 0.075); eye.castShadow = false; }
    sph(head, 0.012, M('#d88a8a'), 0, -0.012, 0.085);
    for (const [x, z] of [[-0.07, 0.15], [0.07, 0.15], [-0.07, -0.13], [0.07, -0.13]]) cyl(g, 0.025, 0.025, 0.16, cm, x, 0, z, 8);
    const tail = new THREE.Group(); tail.position.set(0, 0.24, -0.22); g.add(tail);
    const t1 = cyl(tail, 0.022, 0.026, 0.28, cm, 0, 0, 0, 8); t1.rotation.x = -0.9; t1.position.set(0, 0.08, -0.1);
    if (id === 'cat_calico') { sph(g, 0.08, M('#d9822b'), 0.06, 0.27, -0.05); sph(g, 0.07, M('#2b2b2b'), -0.07, 0.25, 0.08); }
    if (id === 'cat_tux' || id === 'cat_white') sph(g, 0.07, white, 0, 0.22, 0.16, 1, 1.2, 0.6);
    if (id === 'cat_tabby') for (let i = 0; i < 4; i++) { const s = box(g, 0.33, 0.02, 0.03, M('#5a4430'), 0, 0.31, -0.15 + i * 0.09); s.castShadow = false; }
    if (id === 'cat_chonk') g.scale.set(1.3, 1.15, 1.2);
    g.userData.tail = tail; g.userData.head = head;
    return g;
  };

  // ---------- street props ----------
  MD.tree = function () { /* instanced in render3d */ };
  MD.scooterParts = function () {
    return {
      body: new THREE.BoxGeometry(0.34, 0.42, 1.25),
      front: new THREE.BoxGeometry(0.36, 0.75, 0.14),
      seat: new THREE.BoxGeometry(0.3, 0.1, 0.6),
      wheel: new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14),
      bar: new THREE.BoxGeometry(0.62, 0.04, 0.04),
    };
  };

  // ---------- furniture / interactive objects ----------
  // local frame: width along x (along the wall), depth along z, front faces +z, origin at floor center.
  const F = MD.F = {};
  const wood = (c) => M(c || '#a07850', { roughness: 0.75 });
  const metal = (c) => M(c || '#9aa3a8', { roughness: 0.35, metalness: 0.6 });
  function desk(g, W, D, opt) {
    opt = opt || {};
    const top = wood(opt.top || '#c9a57b');
    box(g, W, 0.04, D * 0.8, top, 0, 0.72, -D * 0.05);
    for (const [x, z] of [[-W / 2 + 0.05, -D * 0.4], [W / 2 - 0.05, -D * 0.4], [-W / 2 + 0.05, D * 0.3], [W / 2 - 0.05, D * 0.3]]) box(g, 0.04, 0.72, 0.04, metal('#5a5f63'), x, 0, z);
    if (opt.monitor !== false) {
      box(g, 0.05, 0.25, 0.05, metal('#2b2f33'), -W * 0.15, 0.76, -D * 0.3);
      box(g, 0.62, 0.38, 0.03, M('#15181b'), -W * 0.15, 0.98, -D * 0.3);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.33), MD.screen(opt.screen || 'code')); scr.position.set(-W * 0.15, 1.17, -D * 0.3 + 0.017); g.add(scr);
      box(g, 0.45, 0.02, 0.15, M('#2b2f33'), -W * 0.15, 0.76, D * 0.05);
    }
    if (opt.chair !== false) chair(g, -W * 0.15, D * 0.55, Math.PI, opt.chairColor);
  }
  function chair(g, x, z, ry, color) {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry || 0; g.add(c);
    const cm = M(color || '#2f3a44', { roughness: 0.8 });
    box(c, 0.46, 0.08, 0.44, cm, 0, 0.44, 0); box(c, 0.46, 0.5, 0.06, cm, 0, 0.5, -0.2);
    cyl(c, 0.025, 0.025, 0.42, metal('#444'), 0, 0.02, 0, 8); box(c, 0.5, 0.03, 0.06, metal('#444'), 0, 0.02, 0); box(c, 0.06, 0.03, 0.5, metal('#444'), 0, 0.02, 0);
    return c;
  }
  function plant(g, x, z, h) {
    cyl(g, 0.18, 0.14, 0.35, M('#b86a45', { roughness: 0.9 }), x, 0, z);
    const lm = M('#3f7d3a', { roughness: 0.8 });
    for (let i = 0; i < 5; i++) sph(g, 0.16 + Math.random() * 0.08, lm, x + (Math.random() - 0.5) * 0.25, 0.45 + (h || 0.5) * Math.random() + 0.1, z + (Math.random() - 0.5) * 0.25);
  }
  function sofa(g, W, D, color) {
    const sm = M(color || '#7d8fa3', { roughness: 0.95 });
    box(g, W, 0.42, D * 0.85, sm, 0, 0, 0); box(g, W, 0.48, 0.2, sm, 0, 0.42, -D * 0.33);
    for (const ex of [-1, 1]) box(g, 0.18, 0.62, D * 0.85, sm, ex * (W / 2 - 0.09), 0, 0);
    const cush = M(new THREE.Color(color || '#7d8fa3').multiplyScalar(1.12).getStyle(), { roughness: 1 });
    const n = Math.max(2, Math.round(W / 0.9)); for (let i = 0; i < n; i++) box(g, (W - 0.4) / n - 0.04, 0.14, D * 0.55, cush, -W / 2 + 0.2 + ((W - 0.4) / n) * (i + 0.5), 0.42, 0.04);
  }
  function counter(g, W, D, top, body) {
    box(g, W, 0.9, D * 0.85, M(body || '#e9e6df', { roughness: 0.6 }), 0, 0, -D * 0.05);
    box(g, W + 0.04, 0.04, D * 0.9, M(top || '#d9d4cb', { roughness: 0.3 }), 0, 0.9, -D * 0.05);
  }
  function table(g, W, D, h, color, round) {
    const tm = wood(color || '#b58a5c');
    if (round) { cyl(g, Math.min(W, D) * 0.45, Math.min(W, D) * 0.45, 0.04, tm, 0, h - 0.04, 0, 24); cyl(g, 0.05, 0.05, h - 0.04, metal('#444'), 0, 0, 0, 8); cyl(g, 0.25, 0.28, 0.03, metal('#444'), 0, 0, 0, 16); }
    else { box(g, W, 0.05, D, tm, 0, h - 0.05, 0); for (const [x, z] of [[-W / 2 + 0.06, -D / 2 + 0.06], [W / 2 - 0.06, -D / 2 + 0.06], [-W / 2 + 0.06, D / 2 - 0.06], [W / 2 - 0.06, D / 2 - 0.06]]) box(g, 0.05, h - 0.05, 0.05, tm, x, 0, z); }
  }
  function guitar(g, x, z, color, ry) {
    const gg = new THREE.Group(); gg.position.set(x, 0, z); gg.rotation.y = ry || 0; g.add(gg);
    box(gg, 0.3, 0.02, 0.3, metal('#222'), 0, 0, 0);
    const bodyM = M(color || '#b8322a', { roughness: 0.35, metalness: 0.1 });
    const b = sph(gg, 0.17, bodyM, 0, 0.42, 0, 1, 1.3, 0.25); b.rotation.z = 0.12;
    box(gg, 0.05, 0.62, 0.03, wood('#6b4a2f'), 0.03, 0.62, 0.01).rotation.z = 0.12;
    box(gg, 0.08, 0.14, 0.03, M('#1d1d1d'), 0.1, 1.2, 0.01).rotation.z = 0.12;
  }
  F.bed = (g, W, D) => { box(g, W, 0.35, D, wood('#8a6a4a'), 0, 0, 0); box(g, W - 0.1, 0.18, D - 0.1, M('#f4f1ea', { roughness: 1 }), 0, 0.35, 0); box(g, W - 0.08, 0.1, D * 0.65, M('#8fa9c7', { roughness: 1 }), 0, 0.5, D * 0.15); box(g, W * 0.6, 0.12, 0.35, M('#ffffff', { roughness: 1 }), 0, 0.52, -D / 2 + 0.3); box(g, W, 0.9, 0.08, wood('#7a5a3a'), 0, 0, -D / 2 + 0.04); };
  F.wardrobe = (g, W, D) => { box(g, W * 0.95, 2.0, D * 0.6, wood('#a07a55'), 0, 0, -D * 0.2); box(g, 0.02, 1.9, 0.02, M('#5a4030'), 0, 0.05, D * 0.11); for (const ex of [-0.08, 0.08]) box(g, 0.02, 0.2, 0.03, metal(), ex, 1.0, D * 0.12); };
  F.homeDesk = (g, W, D) => { desk(g, W, D, { monitor: false, top: '#b8916a' }); box(g, 0.36, 0.02, 0.25, M('#c7c9cc', { metalness: 0.5, roughness: 0.3 }), -0.2, 0.76, 0); const lid = box(g, 0.36, 0.24, 0.015, M('#c7c9cc', { metalness: 0.5, roughness: 0.3 }), -0.2, 0.77, -0.12); lid.rotation.x = -0.25; const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), MD.screen('code', 0.6)); sc.position.set(-0.2, 0.9, -0.105); sc.rotation.x = -0.25; g.add(sc); cyl(g, 0.06, 0.08, 0.02, metal('#333'), W / 2 - 0.25, 0.76, -0.1); cyl(g, 0.01, 0.01, 0.35, metal('#333'), W / 2 - 0.25, 0.78, -0.1); sph(g, 0.07, M('#fff3c4', { emissive: 0xffdd88, emissiveIntensity: 0.8 }), W / 2 - 0.25, 1.15, -0.05); };
  F.kitchen = (g, W, D) => { counter(g, W, D, '#d9d4cb', '#e4e1da'); box(g, 0.5, 0.02, 0.4, metal('#b9c0c4'), -W * 0.25, 0.94, -D * 0.05); box(g, 0.55, 0.03, 0.45, M('#1e1e1e'), W * 0.25, 0.94, -D * 0.05); for (const [x, z] of [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.1], [0.12, 0.1]]) cyl(g, 0.07, 0.07, 0.01, M('#444'), W * 0.25 + x, 0.97, -D * 0.05 + z, 12); box(g, W, 0.6, D * 0.4, M('#efece6'), 0, 1.6, -D * 0.3); cyl(g, 0.12, 0.1, 0.12, metal('#888'), W * 0.25 + 0.12, 0.98, -D * 0.05 + 0.1); };
  F.fridge = (g, W, D) => { box(g, W * 0.8, 1.8, D * 0.7, M('#e9eef0', { roughness: 0.3, metalness: 0.2 }), 0, 0, -D * 0.1); box(g, W * 0.8, 0.02, 0.01, M('#c0c6c8'), 0, 1.15, D * 0.255); box(g, 0.03, 0.4, 0.04, metal(), W * 0.3, 1.25, D * 0.27); box(g, 0.03, 0.4, 0.04, metal(), W * 0.3, 0.6, D * 0.27); };
  F.officeFridge = F.fridge;
  F.sofa = (g, W, D) => sofa(g, W, D, '#c46a4c');
  F.officeSofa = (g, W, D) => sofa(g, W, D, '#5d7287');
  F.sofaStudio = (g, W, D) => sofa(g, W, D, '#6a4f7a');
  F.guitar = (g) => guitar(g, 0, 0, '#c0392b');
  F.dining = (g, W, D) => { table(g, W * 0.9, D * 0.8, 0.75, '#b58a5c'); for (const [x, z, r] of [[-W * 0.25, -D * 0.6, 0], [W * 0.25, -D * 0.6, 0], [-W * 0.25, D * 0.6, Math.PI], [W * 0.25, D * 0.6, Math.PI]]) chair(g, x, z, r, '#8a6a4a'); };
  F.tv = (g, W, D) => { box(g, W * 0.8, 0.45, D * 0.5, wood('#4a3a2c'), 0, 0, 0); box(g, W * 0.62, 0.62, 0.05, M('#111'), 0, 0.5, -0.05); const s = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.58, 0.56), MD.screen('tv', 0.5)); s.position.set(0, 0.81, -0.02); g.add(s); };
  F.plant = (g) => plant(g, 0, 0, 0.6);
  F.mydesk = (g, W, D) => { desk(g, W, D, {}); for (let i = 0; i < 4; i++) box(g, 0.06, 0.06, 0.005, M(['#fff59a', '#ffc4d6', '#c4f0ff', '#fff59a'][i]), -W * 0.15 - 0.26 + i * 0.08, 1.05 - (i % 2) * 0.08, -D * 0.3 + 0.022); };
  F.deskMira = (g, W, D) => { desk(g, W, D, {}); sph(g, 0.05, M('#e39a4a'), W * 0.3, 0.8, -0.05, 1, 0.9, 1); plant(g, W * 0.38, -D * 0.25, 0.2); };
  F.deskHsiu = (g, W, D) => { desk(g, W, D, { screen: 'scope' }); for (let i = 0; i < 3; i++) cyl(g, 0.033, 0.033, 0.12, M(['#1f8f4a', '#2b6fd0', '#1f8f4a'][i], { metalness: 0.6, roughness: 0.3 }), W * 0.25 + i * 0.08, 0.76, -0.1, 10); };
  F.meeting = (g, W, D) => { table(g, W * 0.95, D * 0.85, 0.75, '#a7845f'); for (let i = 0; i < 3; i++) { chair(g, -W / 2 + 0.7 + i * (W - 1.4) / 2, -D * 0.7, 0); chair(g, -W / 2 + 0.7 + i * (W - 1.4) / 2, D * 0.7, Math.PI); } };
  F.whiteboard = (g, W, D) => { box(g, W * 0.9, 1.0, 0.04, M('#f7f8f8', { roughness: 0.2 }), 0, 1.0, -D * 0.4); box(g, W * 0.9, 0.04, 0.08, metal(), 0, 0.98, -D * 0.37); };
  F.testbench = (g, W, D) => { table(g, W, D * 0.9, 0.9, '#7f8f99'); for (let i = 0; i < 6; i++) box(g, 0.35, 0.12, 0.25, M('#2b3036', { roughness: 0.4 }), -W / 2 + 0.4 + i * (W - 0.8) / 5, 0.9, -0.1); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), MD.screen('scope')); s.position.set(W * 0.3, 1.25, -D * 0.25); g.add(s); box(g, 0.56, 0.36, 0.25, M('#3b4248'), W * 0.3, 0.9, -D * 0.38); };
  F.rack = (g, W, D) => { box(g, 0.7, 2.0, Math.max(0.8, D * 0.9), M('#25292d', { roughness: 0.4, metalness: 0.4 }), 0, 0, 0); for (let i = 0; i < 12; i++) box(g, 0.04, 0.02, 0.01, M(i % 3 ? '#3cff8f' : '#ffb347', { emissive: i % 3 ? 0x3cff8f : 0xffb347, emissiveIntensity: 1 }), -0.25 + (i % 4) * 0.05, 0.3 + Math.floor(i / 4) * 0.5, D * 0.45 + 0.01); };
  F.coffeeMachine = (g, W, D) => { counter(g, W, D); box(g, 0.4, 0.5, 0.4, M('#3a3d42', { metalness: 0.5, roughness: 0.3 }), 0, 0.94, -0.1); cyl(g, 0.05, 0.05, 0.08, M('#fff'), 0, 0.98, 0.12, 10); };
  F.microwave = (g, W, D) => { counter(g, W, D); box(g, 0.5, 0.3, 0.38, M('#d7dadc', { roughness: 0.4 }), 0, 0.94, -0.1); box(g, 0.32, 0.22, 0.01, M('#1d2126', { roughness: 0.2 }), -0.05, 0.98, 0.095); };
  F.officeBoard = (g, W, D) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, 0.9), MD.screen('board', 0.05)); b.position.set(0, 1.45, -D / 2 + 0.03); g.add(b); box(g, W * 0.92, 0.94, 0.03, wood('#7a5a3a'), 0, 1.0, -D / 2 + 0.01); };
  F.cafeBoard = F.officeBoard; F.churchBoard = F.officeBoard; F.studioBoard = F.officeBoard;
  F.stage = (g, W, D) => { box(g, W, 0.3, D, wood('#5a3e2a'), 0, 0, 0); cyl(g, 0.015, 0.015, 1.4, metal('#222'), 0, 0.3, 0.2, 8); sph(g, 0.04, metal('#333'), 0, 1.72, 0.2); box(g, 0.5, 0.6, 0.35, M('#1d1d1d'), -W / 2 + 0.4, 0.3, -D / 2 + 0.3); box(g, 0.45, 0.4, 0.01, M('#3a3a3a'), -W / 2 + 0.4, 0.4, -D / 2 + 0.48); guitar(g, W / 2 - 0.4, -D / 2 + 0.3, '#2b5fa8'); };
  F.counter = (g, W, D) => { box(g, W, 1.05, D * 0.7, wood('#6b4428'), 0, 0, 0.05); box(g, W + 0.06, 0.05, D * 0.8, wood('#3a2416'), 0, 1.05, 0.05); box(g, 0.55, 0.45, 0.45, M('#c9ccd0', { metalness: 0.7, roughness: 0.25 }), -W * 0.25, 1.1, -0.05); const cs = box(g, 0.8, 0.4, 0.4, M('#e8f4ff', { transparent: true, opacity: 0.35, roughness: 0.05 }), W * 0.25, 1.1, 0); cs.castShadow = false; for (let i = 0; i < 4; i++) sph(g, 0.06, M('#d9a25a'), W * 0.25 - 0.25 + i * 0.16, 1.18, 0, 1.4, 0.7, 1); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), MD.screen('menu', 0.25)); m.position.set(0, 2.0, -D / 2 - 0.45); g.add(m); };
  F.cafeTable = (g, W, D) => { table(g, W * 0.6, D * 0.7, 0.74, '#e0c39a', true); chair(g, -W * 0.35, 0, Math.PI / 2, '#5b3a26'); chair(g, W * 0.35, 0, -Math.PI / 2, '#5b3a26'); cyl(g, 0.04, 0.035, 0.09, M('#fff'), 0.05, 0.74, 0.05, 10); };
  F.peiDesk = (g, W, D) => { desk(g, W, D, { monitor: false, top: '#8a6a4a' }); for (let i = 0; i < 5; i++) box(g, 0.21, 0.004, 0.29, M('#fbfbf6'), -0.3 + i * 0.06, 0.765 + i * 0.004, 0.02 * i, i * 0.15); };
  F.boxes = (g) => { box(g, 0.6, 0.45, 0.5, M('#b08a5a'), 0, 0, 0); box(g, 0.45, 0.35, 0.4, M('#c49a62'), 0.05, 0.45, 0.02, 0.3); };
  F.pulpit = (g, W, D) => { box(g, W, 0.25, D, wood('#8a6a46'), 0, 0, 0); box(g, 0.6, 1.1, 0.45, wood('#9a7b56'), 0, 0.25, 0.1); box(g, 0.68, 0.05, 0.5, wood('#7a5a36'), 0, 1.33, 0.1).rotation.x = 0.15; box(g, 0.14, 1.8, 0.08, wood('#6b4428'), 0, 1.3, -D / 2 - 0.4); box(g, 0.9, 0.14, 0.08, wood('#6b4428'), 0, 2.4, -D / 2 - 0.4); };
  F.piano = (g, W, D) => { box(g, W * 0.75, 1.25, 0.6, M('#141414', { roughness: 0.15 }), 0, 0, -0.1); box(g, W * 0.72, 0.04, 0.25, M('#f4f4f0'), 0, 0.72, 0.28); box(g, W * 0.7, 0.03, 0.12, M('#111'), 0, 0.75, 0.23); box(g, 0.7, 0.45, 0.35, M('#1d1d1d'), 0, 0, 0.75); };
  F.pew = (g, W, D) => { const wm = wood('#a3835e'); box(g, W, 0.06, 0.45, wm, 0, 0.45, 0); box(g, W, 0.55, 0.05, wm, 0, 0.5, -0.22); for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) box(g, 0.06, 0.9, 0.5, wm, x, 0, 0); };
  F.groupTable = (g, W, D) => { table(g, W, D, 0.74, '#b9936a', true); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; chair(g, Math.cos(a) * 0.9, Math.sin(a) * 0.9, -a - Math.PI / 2, '#8a6a4a'); } cyl(g, 0.07, 0.06, 0.16, M('#c9a24a', { metalness: 0.4 }), 0, 0.74, 0, 10); };
  F.churchKitchen = (g, W, D) => { counter(g, W, D); for (let i = 0; i < 3; i++) cyl(g, 0.17, 0.16, 0.26, metal('#a9b0b4'), -W / 2 + 0.5 + i * (W - 1) / 2, 0.94, -0.05, 16); };
  F.treadmill = (g) => { const t = new THREE.Group(); t.rotation.y = Math.PI / 2; g.add(t); box(t, 0.75, 0.18, 1.7, M('#2b2f33', { roughness: 0.5 }), 0, 0, 0); box(t, 0.6, 0.02, 1.4, M('#151515'), 0, 0.18, 0.05); for (const ex of [-0.33, 0.33]) box(t, 0.05, 1.2, 0.06, metal('#555'), ex, 0.18, -0.75); box(t, 0.7, 0.3, 0.1, M('#1d1d1d'), 0, 1.25, -0.72); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.18), MD.screen('scope', 1)); s.position.set(0, 1.42, -0.665); t.add(s); };
  F.weights = (g, W, D) => { for (const ex of [-W / 2 + 0.2, W / 2 - 0.2]) box(g, 0.1, 1.9, 0.1, metal('#555'), ex, 0, -0.2); box(g, W, 0.08, 0.1, metal('#555'), 0, 1.9, -0.2); cyl(g, 0.02, 0.02, W, metal('#bbb'), 0, 1.3, 0, 8).rotation.z = Math.PI / 2; for (const ex of [-W / 2 + 0.4, W / 2 - 0.4]) { const p = cyl(g, 0.22, 0.22, 0.06, M('#1f1f1f'), ex, 1.3, 0, 18); p.rotation.z = Math.PI / 2; p.position.y = 1.3; } box(g, 0.4, 0.42, 1.2, M('#2b2b2b'), 0, 0, 0.6); };
  F.yoga = (g, W, D) => { for (let i = 0; i < 3; i++) { const m = box(g, 0.6, 0.012, 1.7, M(['#5fa89b', '#c46a8a', '#6b8fd0'][i]), -W / 2 + 0.5 + i * (W - 1) / 2, 0, 0); m.castShadow = false; } };
  F.gymCounter = (g, W, D) => { counter(g, W, D, '#c25a3a', '#2b2f33'); for (let i = 0; i < 4; i++) cyl(g, 0.04, 0.04, 0.2, M(['#d0453a', '#f2b33d', '#2f8f83', '#fff'][i]), -0.4 + i * 0.25, 0.94, 0, 10); };
  F.barCounter = (g, W, D) => { box(g, W, 1.05, D * 0.6, wood('#3e2a1c'), 0, 0, 0.1); box(g, W + 0.1, 0.05, D * 0.75, wood('#22150c'), 0, 1.05, 0.1); for (let i = 0; i < 4; i++) { cyl(g, 0.2, 0.2, 0.05, M('#8c2f3a'), -W / 2 + 0.6 + i * (W - 1.2) / 3, 0.75, D * 0.75, 16); cyl(g, 0.03, 0.03, 0.75, metal('#888'), -W / 2 + 0.6 + i * (W - 1.2) / 3, 0, D * 0.75, 8); } box(g, W, 0.04, 0.3, wood('#3e2a1c'), 0, 1.6, -D / 2 - 0.85); for (let i = 0; i < 14; i++) cyl(g, 0.035, 0.04, 0.28, M(['#3d6b3a', '#7a3a2a', '#c9a24a', '#ddd', '#2b4a7a'][i % 5], { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }), -W / 2 + 0.3 + i * (W - 0.6) / 13, 1.64, -D / 2 - 0.85, 8); };
  F.jukebox = (g, W, D) => { box(g, 0.75, 1.4, 0.55, wood('#6b2a22'), 0, 0, 0); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), MD.screen('jukebox', 1.2)); s.position.set(0, 0.85, 0.28); g.add(s); sph(g, 0.37, wood('#6b2a22'), 0, 1.4, 0, 1, 0.6, 0.75); };
  F.booth = (g, W, D) => { const lm = M('#8c2f3a', { roughness: 0.5 }); box(g, W, 0.45, 0.5, lm, 0, 0, -D * 0.35); box(g, W, 0.6, 0.15, lm, 0, 0.45, -D * 0.55); table(g, W * 0.75, 0.6, 0.72, '#3e2a1c'); cyl(g, 0.03, 0.03, 0.08, M('#fff2c4', { emissive: 0xffaa44, emissiveIntensity: 1.5 }), 0, 0.72, 0, 8); };
  F.longTable = (g, W, D) => { table(g, W, D * 0.9, 0.75, '#a7784c'); for (let i = 0; i < 3; i++) { chair(g, -W / 2 + 0.8 + i * (W - 1.6) / 2, -D * 0.8, 0, '#5a3a26'); chair(g, -W / 2 + 0.8 + i * (W - 1.6) / 2, D * 0.8, Math.PI, '#5a3a26'); } };
  F.drums = (g, W, D) => { const dm = M('#8a2f2f', { roughness: 0.3, metalness: 0.2 }); const bd = cyl(g, 0.3, 0.3, 0.4, dm, 0, 0.3, 0.1, 18); bd.rotation.x = Math.PI / 2; bd.position.y = 0.32; cyl(g, 0.17, 0.17, 0.18, dm, -0.35, 0.55, 0.2, 16); cyl(g, 0.14, 0.14, 0.16, dm, 0.25, 0.75, 0, 16); cyl(g, 0.14, 0.14, 0.16, dm, -0.15, 0.75, 0, 16); const cy = M('#c9a24a', { metalness: 0.8, roughness: 0.3 }); cyl(g, 0.22, 0.22, 0.01, cy, 0.5, 1.2, -0.2, 20); cyl(g, 0.01, 0.01, 1.2, metal('#777'), 0.5, 0, -0.2, 6); cyl(g, 0.18, 0.18, 0.01, cy, -0.55, 1.05, -0.1, 20); cyl(g, 0.01, 0.01, 1.05, metal('#777'), -0.55, 0, -0.1, 6); chair(g, 0, -0.6, 0, '#222'); };
  F.studioGuitar = (g, W, D) => { box(g, W * 0.9, 0.08, 0.35, metal('#333'), 0, 0, 0); guitar(g, -0.5, 0, '#c9a24a'); guitar(g, 0, 0, '#2b2b2b'); guitar(g, 0.5, 0, '#3f7fb8'); box(g, 0.55, 0.6, 0.35, M('#1d1d1d'), W / 2 + 0.1, 0, -0.1); };
  F.mic = (g) => { cyl(g, 0.15, 0.15, 0.02, metal('#222'), 0, 0, 0, 14); cyl(g, 0.012, 0.012, 1.5, metal('#222'), 0, 0, 0, 8); sph(g, 0.045, metal('#555'), 0, 1.55, 0.03, 1, 1.4, 1); };
  F.recBooth = (g, W, D) => { const glass = M('#cfe8ff', { transparent: true, opacity: 0.25, roughness: 0.05 }); const gl = box(g, W * 0.95, 2.2, D * 0.95, glass, 0, 0, 0); gl.castShadow = false; for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) box(g, 0.06, 2.2, 0.06, M('#2b2b2b'), x * 0.95, 0, z * 0.95); box(g, W * 0.95, 0.06, D * 0.95, M('#2b2b2b'), 0, 2.2, 0); F.mic(g); const l = box(g, 0.3, 0.12, 0.04, M('#ff3b30', { emissive: 0xff3b30, emissiveIntensity: 1 }), 0, 2.3, D * 0.48); l.castShadow = false; };
  F.shoes = (g, W, D) => { box(g, W * 0.8, 0.5, 0.35, wood('#a08a6a'), 0, 0, 0); };
  F.rmBed = F.bed; F.rmDesk = (g, W, D) => { desk(g, W, D, { monitor: false }); for (let i = 0; i < 5; i++) box(g, 0.05, 0.25, 0.18, M(['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad'][i]), -0.15 + i * 0.06, 0.76, -0.15); };
  F.teaTable = (g, W, D) => table(g, W * 0.8, D * 0.7, 0.72, '#c4a77f');
  F.bossDesk = (g, W, D) => { desk(g, W, D, { top: '#6b4a2f', chairColor: '#1d1d1d' }); box(g, 0.25, 0.08, 0.32, M('#e8e2d0'), W * 0.3, 0.76, 0); };
  F.d = (g, W, D) => desk(g, W, D, { screen: Math.random() < 0.5 ? 'code' : 'scope' });
  F.testShelf = F.rack;
  // street props
  F.bench = (g, W, D) => { const wm = wood('#9a7a52'); for (let i = 0; i < 4; i++) box(g, W * 0.95, 0.04, 0.09, wm, 0, 0.44, -0.18 + i * 0.12); for (let i = 0; i < 2; i++) box(g, W * 0.95, 0.09, 0.04, wm, 0, 0.6 + i * 0.14, -0.26); for (const x of [-W * 0.4, W * 0.4]) box(g, 0.05, 0.44, 0.45, metal('#3a3f43'), x, 0, -0.04); };
  F.busStop = (g, W, D) => { const fm = metal('#2f6f9c'); for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) box(g, 0.08, 2.4, 0.08, fm, x, 0, -0.3); box(g, W, 0.08, 1.1, fm, 0, 2.4, 0); const gl = box(g, W - 0.2, 1.8, 0.03, M('#cfe8ff', { transparent: true, opacity: 0.3, roughness: 0.05 }), 0, 0.4, -0.35); gl.castShadow = false; box(g, W - 0.6, 0.06, 0.35, metal('#888'), 0, 0.45, -0.15); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshStandardMaterial({ map: MD.tex(TX.sign('光復路口', '#2f6f9c', '#fff')), emissive: 0xffffff, emissiveMap: MD.tex(TX.sign('光復路口', '#2f6f9c', '#fff')), emissiveIntensity: 0.3 })); s.position.set(0, 2.15, 0.56); g.add(s); };
  F.ubike = (g, W) => { const rack = metal('#c9cccf'); box(g, W, 0.06, 0.06, rack, 0, 0.6, -0.3); const n = Math.floor(W / 0.8); for (let i = 0; i < n; i++) { const x = -W / 2 + 0.4 + i * 0.8; const fm = M('#e8a33a', { roughness: 0.5 }); for (const z of [-0.45, 0.45]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 16), M('#1d1d1d')); w.position.set(x, 0.33, z); w.rotation.y = Math.PI / 2; g.add(w); } box(g, 0.05, 0.05, 0.9, fm, x, 0.55, 0); box(g, 0.05, 0.45, 0.05, fm, x, 0.33, -0.2); box(g, 0.4, 0.04, 0.04, metal('#333'), x, 0.95, 0.4); box(g, 0.14, 0.05, 0.25, M('#222'), x, 0.85, -0.2); box(g, 0.22, 0.14, 0.2, fm, x, 0.8, 0.5); } };
  F.fountain = (g, W, D) => { cyl(g, W * 0.5, W * 0.52, 0.45, M('#b9b6ad', { roughness: 0.6 }), 0, 0, 0, 28); const w = cyl(g, W * 0.46, W * 0.46, 0.02, M('#5aa7c7', { roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 }), 0, 0.38, 0, 28); w.castShadow = false; cyl(g, 0.18, 0.25, 1.2, M('#c9c6bd'), 0, 0.4, 0, 14); cyl(g, 0.5, 0.4, 0.12, M('#c9c6bd'), 0, 1.5, 0, 18); const j = cyl(g, 0.05, 0.2, 0.7, M('#cdeefe', { transparent: true, opacity: 0.55, emissive: 0x335566, roughness: 0.1 }), 0, 1.6, 0, 12); j.castShadow = false; g.userData.jet = j; };
  F.hoop = (g) => { cyl(g, 0.07, 0.07, 3.0, metal('#2b6fd0'), 0, 0, -0.5, 10); box(g, 0.1, 0.1, 0.8, metal('#2b6fd0'), 0, 2.9, -0.15); box(g, 1.8, 1.05, 0.04, M('#f4f4f4', { roughness: 0.3 }), 0, 2.75, 0.25); box(g, 0.6, 0.45, 0.01, M('#d0453a'), 0, 2.95, 0.275); const r = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 6, 20), M('#e8642a', { metalness: 0.5 })); r.rotation.x = Math.PI / 2; r.position.set(0, 3.05, 0.5); g.add(r); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.4, 12, 1, true), M('#ffffff', { wireframe: true })); n.position.set(0, 2.84, 0.5); g.add(n); };
  F.temple = (g) => { const br = M('#8a6a3a', { metalness: 0.6, roughness: 0.35 }); cyl(g, 0.38, 0.3, 0.45, br, 0, 0.45, 0, 18); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; cyl(g, 0.04, 0.04, 0.45, br, Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25, 6); } for (let i = 0; i < 7; i++) { const x = (Math.random() - 0.5) * 0.3, z = (Math.random() - 0.5) * 0.3; cyl(g, 0.006, 0.006, 0.35, M('#b8322a'), x, 0.85, z, 4); const t = sph(g, 0.012, M('#ff7a2a', { emissive: 0xff5a1a, emissiveIntensity: 2 }), x, 1.21, z); t.castShadow = false; } };
  F.vending = (g, W, D) => { box(g, 0.95, 1.85, 0.75, M('#c9473f', { roughness: 0.4 }), 0, 0, -0.1); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), MD.screen('vending', 0.9)); s.position.set(-0.05, 1.15, 0.28); g.add(s); box(g, 0.6, 0.18, 0.05, M('#1d1d1d'), -0.05, 0.25, 0.27); };
  F.stall = (g, W, D, o) => {
    const c = o.color || '#d9792b';
    box(g, W * 0.9, 0.95, D * 0.5, M('#d8d2c4', { roughness: 0.6 }), 0, 0, D * 0.15);
    box(g, W * 0.95, 0.05, D * 0.55, metal('#b9c0c4'), 0, 0.95, D * 0.15);
    for (const [x, z] of [[-W * 0.45, -D * 0.45], [W * 0.45, -D * 0.45], [-W * 0.45, D * 0.45], [W * 0.45, D * 0.45]]) box(g, 0.05, 2.4, 0.05, metal('#888'), x, 0, z);
    const cv = TX.canvas(128, 64), cg = cv.getContext('2d'); for (let i = 0; i < 8; i++) { cg.fillStyle = i % 2 ? '#ffffff' : c; cg.fillRect(i * 16, 0, 16, 64); }
    const can = box(g, W * 1.05, 0.06, D * 1.05, new THREE.MeshStandardMaterial({ map: MD.tex(cv, [2, 1]), roughness: 0.8 }), 0, 2.4, 0); can.rotation.z = 0.0;
    const sg = TX.sign(o.label, c, '#fff');
    const sm = new THREE.MeshStandardMaterial({ map: MD.tex(sg), emissive: 0xffffff, emissiveMap: MD.tex(sg), emissiveIntensity: 0.2 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(D, 2.6), 0.55), sm); sign.position.set(0, 2.1, D * 0.53); g.add(sign); g.userData.signMat = sm;
    const bulb = M('#fff2c4', { emissive: 0xffc46b, emissiveIntensity: 0 }); g.userData.bulb = bulb;
    for (let i = 0; i < 3; i++) { const b = sph(g, 0.05, bulb, -W * 0.3 + i * W * 0.3, 2.25, D * 0.45); b.castShadow = false; }
    for (let i = 0; i < 5; i++) sph(g, 0.07, M(['#d9a25a', '#c9472b', '#f2d06b', '#8a5a3a'][i % 4]), -W * 0.3 + i * 0.15, 1.02, D * 0.2, 1.3, 0.6, 1);
  };
  F.cat = () => {};
})(window.SW);
