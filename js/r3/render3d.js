'use strict';
// First-person Three.js renderer: builds a scene per map, lights it by the game clock, animates people,
// cats and traffic, and works out what the player is looking at.
(function (SW) {
  const THREE = window.THREE;
  const U = SW.U, T = SW.T, TX = SW.TX, MD = SW.MD;
  const R3 = SW.R3 = { scenes: {}, pitch: -0.05, npc: {}, focusId: null };
  const box = MD.box, cyl = MD.cyl, sph = MD.sph, M = MD.mat;
  let renderer, camera, cur = null;
  const EYE = 1.6;
  R3.mobile = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || /iPhone|iPad|Android/i.test(navigator.userAgent);

  R3.init = function (canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !R3.mobile, powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    MD.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    camera = new THREE.PerspectiveCamera(72, 1, 0.05, 900);
    camera.rotation.order = 'YXZ';
    R3.camera = camera; R3.renderer = renderer;
    R3.resize();
  };
  R3.resize = function () {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, R3.mobile ? 1.6 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 78 : 70; camera.updateProjectionMatrix();
  };
  R3.reset = function () { for (const k of Object.keys(R3.scenes)) if (k.startsWith('home')) delete R3.scenes[k]; cur = null; };

  // ---------- sky / time of day ----------
  const C = (h) => new THREE.Color(h);
  const SKY = [
    // hour, top, horizon, sun color, sun intensity, hemi intensity
    [0, C('#070c1d'), C('#18233f'), C('#8fa3d6'), 0.12, 0.25],
    [5, C('#0e1630'), C('#2c3654'), C('#8fa3d6'), 0.12, 0.28],
    [6, C('#3a4f86'), C('#f2a46b'), C('#ffb37a'), 0.6, 0.45],
    [8, C('#4c8ad3'), C('#bcdcf2'), C('#fff1d9'), 1.25, 0.75],
    [15, C('#4a86d0'), C('#c7e2f4'), C('#fff1d9'), 1.25, 0.78],
    [17.3, C('#5b7fbe'), C('#f6c48f'), C('#ffc488'), 0.95, 0.6],
    [18.6, C('#3b3f78'), C('#f08a5d'), C('#ff8a5a'), 0.45, 0.42],
    [19.6, C('#141c3c'), C('#3b3557'), C('#8fa3d6'), 0.14, 0.3],
    [24, C('#070c1d'), C('#18233f'), C('#8fa3d6'), 0.12, 0.25],
  ];
  function skyAt(h) {
    let a = SKY[0], b = SKY[SKY.length - 1];
    for (let i = 0; i < SKY.length - 1; i++) if (h >= SKY[i][0] && h <= SKY[i + 1][0]) { a = SKY[i]; b = SKY[i + 1]; break; }
    const t = (h - a[0]) / Math.max(0.001, b[0] - a[0]);
    return { top: a[1].clone().lerp(b[1], t), horizon: a[2].clone().lerp(b[2], t), sun: a[3].clone().lerp(b[3], t), sunI: a[4] + (b[4] - a[4]) * t, hemiI: a[5] + (b[5] - a[5]) * t };
  }
  function makeSky(scene) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color('#2a3a30') } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vW; void main(){ float h = normalize(vW - cameraPosition).y; vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, min(1.0, -h * 5.0)); gl_FragColor = vec4(c, 1.0); }',
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
    const sunC = TX.canvas(128, 128), sg = sunC.getContext('2d'); const gr = sg.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.2, 'rgba(255,230,180,0.9)'); gr.addColorStop(1, 'rgba(255,200,140,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: MD.tex(sunC), depthWrite: false, fog: false, transparent: true })); sun.scale.set(70, 70, 1); scene.add(sun);
    const starG = new THREE.BufferGeometry(); const pts = [];
    for (let i = 0; i < 500; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3 + 0.12; pts.push(Math.cos(a) * Math.cos(e) * 450, Math.sin(e) * 450, Math.sin(a) * Math.cos(e) * 450); }
    starG.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    stars.frustumCulled = false; scene.add(stars);
    return { sky, mat, sun, stars };
  }

  // ---------- helpers ----------
  function mergeBoxes(list) {
    // list of {w,h,d,x,y,z}; returns one BufferGeometry
    const pos = [], nor = [], uv = [], idx = []; let off = 0;
    for (const b of list) {
      const g = new THREE.BoxGeometry(b.w, b.h, b.d); g.translate(b.x, b.y + b.h / 2, b.z);
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
      for (const i of g.index.array) idx.push(i + off); off += g.attributes.position.count; g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    return geo;
  }
  function faceOf(m, o) {
    if (o.face) return o.face;
    const wall = (x, y) => SW.W.tileAt(m, x, y) === '#';
    let n = 0, s = 0, w = 0, e = 0;
    for (let x = o.x; x < o.x + o.w; x++) { if (wall(x, o.y - 1)) n++; if (wall(x, o.y + o.h)) s++; }
    for (let y = o.y; y < o.y + o.h; y++) { if (wall(o.x - 1, y)) w++; if (wall(o.x + o.w, y)) e++; }
    const best = Math.max(n, s, w, e);
    if (!best || n === best) return 's'; if (s === best) return 'n'; if (w === best) return 'e'; return 'w';
  }
  const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
  function placeObject(rec, m, o) {
    if (o.hide || o.inBuilding) { if (o.inBuilding) rec.pickables.push(pickProxy(rec, o)); return null; }
    const face = faceOf(m, o);
    const along = face === 'e' || face === 'w' ? o.h : o.w, depth = face === 'e' || face === 'w' ? o.w : o.h;
    const g = new THREE.Group();
    g.position.set(o.x + o.w / 2, 0, o.y + o.h / 2); g.rotation.y = ROT[face];
    const key = o.model || o.kind;
    let fn = MD.F[key];
    if (!fn || key === 'decor') {
      const id = o.id;
      fn = MD.F[id] || (/^d\d+$/.test(id) ? MD.F.d : /lant/.test(id) ? MD.F.plant : null);
    }
    if (o.kind === 'cat') { const c = MD.cat(o.color, o.cat); c.rotation.y = U.hash(o.id) * 6.28; g.add(c); g.userData.cat = c; }
    else if (fn) fn(g, along, depth, { color: o.color, label: o.label });
    else box(g, along * 0.9, 0.8, depth * 0.9, M(o.color || '#999'), 0, 0, 0);
    g.userData.obj = o;
    if (o.kind !== 'decor') { g.userData.pick = { type: 'obj', obj: o }; rec.pickables.push(g); }
    rec.scene.add(g); rec.objs[o.id] = g;
    return g;
  }
  function pickProxy(rec, o) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(o.w, 2.4, o.h), new THREE.MeshBasicMaterial({ visible: false }));
    p.position.set(o.x + o.w / 2, 1.2, o.y + o.h / 2); p.userData.pick = { type: 'obj', obj: o }; p.userData.obj = o; rec.scene.add(p); rec.objs[o.id] = p; return p;
  }
  const signTexCache = {};
  function signMat(text, bg, fg, vertical) {
    const k = text + bg + (vertical ? 'v' : '');
    if (signTexCache[k]) return signTexCache[k];
    const c = TX.sign(text, bg, fg, { vertical });
    return (signTexCache[k] = new THREE.MeshStandardMaterial({ map: MD.tex(c), emissive: 0xffffff, emissiveMap: MD.tex(c), emissiveIntensity: 0.2, roughness: 0.5 }));
  }

  // ---------- buildings ----------
  function buildingMesh(rec, b, style, opts) {
    // b: {x,y,w,h,ht}; front side: 's' (+z) or 'n' (-z)
    const front = opts.front || 's';
    const faces = { px: [b.h, false], nx: [b.h, false], pz: [b.w, front === 's'], nz: [b.w, front === 'n'] };
    const doorX = opts.doorX;
    const mats = [];
    const mk = (w, isFront, seedAdd) => {
      const f = TX.facade({ w, h: b.ht, style, front: isFront, doorX: isFront ? (front === 's' ? doorX - b.x + 0.5 : b.x + b.w - doorX - 0.5) : 0, sign: opts.sign, tint: opts.tint, seed: (opts.seed || 0) + seedAdd });
      const mm = new THREE.MeshStandardMaterial({ map: MD.tex(f.map), emissive: 0xffffff, emissiveMap: MD.tex(f.emissive), emissiveIntensity: 0.1, roughness: style === 'glass' ? 0.25 : 0.85, metalness: style === 'glass' ? 0.35 : 0 });
      rec.emissives.push(mm); return mm;
    };
    const roof = rec.roofMat || (rec.roofMat = new THREE.MeshStandardMaterial({ map: MD.tex(TX.roof(), [4, 4]), roughness: 0.95 }));
    mats.push(mk(faces.px[0], false, 1), mk(faces.nx[0], false, 2), roof, roof, mk(faces.pz[0], faces.pz[1], 3), mk(faces.nz[0], faces.nz[1], 4));
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.ht, b.h), mats);
    mesh.position.set(b.x + b.w / 2, b.ht / 2, b.y + b.h / 2);
    mesh.castShadow = true; mesh.receiveShadow = true;
    rec.scene.add(mesh);
    return mesh;
  }
  function roofProps(rec, b, kind) {
    const g = new THREE.Group(); g.position.set(b.x + b.w / 2, b.ht, b.y + b.h / 2); rec.scene.add(g);
    // parapet
    const pm = M('#9a988f', { roughness: 0.95 });
    box(g, b.w, 0.5, 0.15, pm, 0, 0, -b.h / 2 + 0.07); box(g, b.w, 0.5, 0.15, pm, 0, 0, b.h / 2 - 0.07); box(g, 0.15, 0.5, b.h, pm, -b.w / 2 + 0.07, 0, 0); box(g, 0.15, 0.5, b.h, pm, b.w / 2 - 0.07, 0, 0);
    if (kind === 'tanks') {
      const n = Math.max(1, Math.round(b.w / 6));
      for (let i = 0; i < n; i++) {
        const x = -b.w / 2 + (b.w / n) * (i + 0.5);
        const stainless = U.hash(b.x + ',' + i) > 0.5;
        box(g, 1.3, 0.8, 1.3, M('#6b6a64'), x, 0, -b.h * 0.15);
        cyl(g, 0.6, 0.6, 1.2, stainless ? M('#c9cdd0', { metalness: 0.8, roughness: 0.3 }) : M('#3f72b8', { roughness: 0.5 }), x, 0.8, -b.h * 0.15, 18);
      }
      for (let i = 0; i < 2; i++) box(g, 0.9, 0.6, 0.6, M('#e3e5e2'), -b.w / 3 + i * 1.4, 0, b.h * 0.25);
    }
    return g;
  }
  function verticalSign(rec, x, z, y, text, color, side) {
    const g = new THREE.Group(); g.position.set(x, y, z); rec.scene.add(g);
    const mat = signMat(text, color, '#fff', true);
    const h = Math.max(2.2, text.length * 0.55 + 0.4);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.75), [M('#333'), M('#333'), M('#333'), M('#333'), mat, mat]);
    m.rotation.y = Math.PI / 2; m.position.set(side * 0.5, h / 2, 0); m.castShadow = true; g.add(m);
    rec.signs.push(mat);
    box(g, 0.6, 0.06, 0.06, M('#555'), side * 0.2, h - 0.2, 0);
  }

  // ---------- city ----------
  function buildCity(rec) {
    const m = rec.map, scene = rec.scene;
    // outer ground + extended roads
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M('#55794a', { roughness: 1 })); outer.rotation.x = -Math.PI / 2; outer.position.set(60, -0.03, 50); outer.receiveShadow = true; scene.add(outer);
    const asph = M('#41464b', { roughness: 0.95 });
    for (const [x, z, w, d] of [[-350, 48, 700, 8], [470, 48, 700, 8], [-350, 81, 700, 6], [470, 81, 700, 6], [61, -350, 6, 700]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asph); p.rotation.x = -Math.PI / 2; p.position.set(x, -0.01, z); p.receiveShadow = true; scene.add(p); }
    // ground texture for the playable block
    const gc = TX.ground(m, 16);
    const gt = MD.tex(gc);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.92 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(m.w / 2, 0, m.h / 2); ground.receiveShadow = true; scene.add(ground);
    rec.ground = ground;
    // curbs
    const curbs = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.rows[y][x] !== 's' && m.rows[y][x] !== 'T') continue;
      const r = (xx, yy) => SW.W.tileAt(m, xx, yy) === 'r';
      if (r(x, y + 1)) curbs.push({ w: 1, h: 0.12, d: 0.15, x: x + 0.5, y: 0, z: y + 0.92 });
      if (r(x, y - 1)) curbs.push({ w: 1, h: 0.12, d: 0.15, x: x + 0.5, y: 0, z: y + 0.08 });
      if (r(x + 1, y)) curbs.push({ w: 0.15, h: 0.12, d: 1, x: x + 0.92, y: 0, z: y + 0.5 });
      if (r(x - 1, y)) curbs.push({ w: 0.15, h: 0.12, d: 1, x: x + 0.08, y: 0, z: y + 0.5 });
    }
    const curbMesh = new THREE.Mesh(mergeBoxes(curbs), M('#bdbab1', { roughness: 0.9 })); curbMesh.receiveShadow = true; scene.add(curbMesh);
    // river
    const wc = TX.canvas(256, 256), wg = wc.getContext('2d'); wg.fillStyle = '#2f6a78'; wg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) { wg.strokeStyle = `rgba(${180 + Math.random() * 60},${220 + Math.random() * 30},255,${0.05 + Math.random() * 0.12})`; wg.lineWidth = 1 + Math.random() * 2; const x = Math.random() * 256, y = Math.random() * 256; wg.beginPath(); wg.moveTo(x, y); wg.quadraticCurveTo(x + 10, y - 3, x + 22, y); wg.stroke(); }
    const wt = MD.tex(wc, [60, 14]);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1000, 70), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.15, metalness: 0.45, color: 0xb9d7df }));
    water.rotation.x = -Math.PI / 2; water.position.set(60, 0.02, 92 + 35); scene.add(water); rec.waterTex = wt;
    // far bank, hills, the science-park skyline
    const bank = new THREE.Mesh(new THREE.PlaneGeometry(1400, 600), M('#4d6b45', { roughness: 1 })); bank.rotation.x = -Math.PI / 2; bank.position.set(60, 0.0, 162 + 300); scene.add(bank);
    const hillM = M('#3c5a3a', { roughness: 1, flatShading: true });
    for (let i = 0; i < 14; i++) { const r = 40 + Math.random() * 60; const hm = new THREE.Mesh(new THREE.ConeGeometry(r, 25 + Math.random() * 45, 7), hillM); hm.position.set(-250 + i * 45 + Math.random() * 20, 10, 330 + Math.random() * 80); scene.add(hm); }
    const skyF = TX.facade({ w: 14, h: 40, style: 'glass', front: false, seed: 9 });
    const towerM = new THREE.MeshStandardMaterial({ map: MD.tex(skyF.map), emissive: 0xffffff, emissiveMap: MD.tex(skyF.emissive), emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.3 });
    rec.emissives.push(towerM);
    for (let i = 0; i < 16; i++) { const h = 18 + Math.random() * 38; const t = new THREE.Mesh(new THREE.BoxGeometry(10 + Math.random() * 10, h, 10 + Math.random() * 8), towerM); t.position.set(-60 + i * 17 + Math.random() * 6, h / 2, 185 + Math.random() * 35); scene.add(t); }
    // bridge across the river
    const deck = new THREE.Group(); deck.position.set(112, 0, 0); scene.add(deck);
    box(deck, 7, 0.6, 72, M('#9a9890'), 0, 2.4, 128); for (let i = 0; i < 6; i++) box(deck, 1.2, 2.4, 1.2, M('#8a8880'), 0, 0, 98 + i * 12);
    for (const ex of [-3.4, 3.4]) box(deck, 0.15, 1.0, 72, M('#c9473f'), ex, 3.0, 128);
    // background buildings around the block
    const bgF = [0, 1, 2, 3].map((i) => { const f = TX.facade({ w: 12, h: 15, style: 'row', front: false, tint: i, seed: 30 + i }); const mm = new THREE.MeshStandardMaterial({ map: MD.tex(f.map), emissive: 0xffffff, emissiveMap: MD.tex(f.emissive), emissiveIntensity: 0.1, roughness: 0.9 }); rec.emissives.push(mm); return mm; });
    const bgAt = (x, z, w, d, h) => { const mm = bgF[Math.floor(U.hash(x + ':' + z) * 4)]; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm); b.position.set(x, h / 2, z); b.castShadow = false; b.receiveShadow = true; scene.add(b); };
    for (let x = -60; x < 190; x += 14) { bgAt(x, -14 - U.hash('n' + x) * 10, 12, 12, 10 + U.hash('h' + x) * 18); }
    for (let z = 0; z < 90; z += 14) { if (z > 40 && z < 56) continue; if (z > 74 && z < 88) continue; bgAt(-14 - U.hash('w' + z) * 6, z, 12, 12, 9 + U.hash('hw' + z) * 14); bgAt(134 + U.hash('e' + z) * 6, z, 12, 12, 9 + U.hash('he' + z) * 14); }
    // landmark & row buildings
    for (const b of SW.BUILDINGS) {
      buildingMesh(rec, b, b.style, { front: 's', doorX: b.door[0], sign: b.sign, seed: b.x });
      if (b.style === 'apartment') roofProps(rec, b, 'tanks'); else if (b.style !== 'temple') roofProps(rec, b, b.style === 'glass' ? null : 'tanks');
      if (b.steeple) { const st = new THREE.Group(); st.position.set(b.x + b.w / 2, b.ht, b.y + b.h - 3); scene.add(st); box(st, 4, 7, 4, M('#efe9df'), 0, 0, 0); const c = new THREE.Mesh(new THREE.ConeGeometry(3, 6, 4), M('#5b5170', { roughness: 0.6 })); c.position.y = 10; c.rotation.y = Math.PI / 4; c.castShadow = true; st.add(c); box(st, 0.25, 2.2, 0.25, M('#d4b25a', { metalness: 0.6, roughness: 0.3 }), 0, 13, 0); box(st, 1.2, 0.25, 0.25, M('#d4b25a', { metalness: 0.6, roughness: 0.3 }), 0, 14.3, 0); }
      if (b.style === 'temple') {
        const r = new THREE.Group(); r.position.set(b.x + b.w / 2, b.ht, b.y + b.h / 2); scene.add(r);
        const roofM = M('#c9762b', { roughness: 0.6 });
        const geo = new THREE.CylinderGeometry(0.01, 1, 1, 4, 1); geo.rotateY(Math.PI / 4);
        const rm = new THREE.Mesh(geo, roofM); rm.scale.set(b.w * 0.85, 2.2, b.h * 0.85); rm.position.y = 1.1; rm.castShadow = true; r.add(rm);
        box(r, b.w + 1.2, 0.25, b.h + 1.2, M('#2f7a5a'), 0, -0.1, 0);
        for (const ex of [-1, 1]) { const tip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 6), roofM); tip.position.set(ex * (b.w / 2 + 0.4), 0.5, b.h / 2 + 0.4); tip.rotation.z = ex * 0.9; r.add(tip); }
        box(r, 0.4, 0.4, 0.4, M('#e8b33d', { metalness: 0.5 }), 0, 2.2, 0);
      }
      if (b.style === 'cafe' || b.style === 'shop' || b.style === 'bar') {
        const cv = TX.canvas(128, 32), cg = cv.getContext('2d'); const cols = b.style === 'cafe' ? ['#2f5d4a', '#efe3cc'] : b.style === 'bar' ? ['#5a2a1a', '#d9a35a'] : ['#2f8f83', '#ffffff'];
        for (let i = 0; i < 8; i++) { cg.fillStyle = cols[i % 2]; cg.fillRect(i * 16, 0, 16, 32); }
        const aw = new THREE.Mesh(new THREE.BoxGeometry(b.w - 1, 0.08, 1.6), new THREE.MeshStandardMaterial({ map: MD.tex(cv, [b.w / 4, 1]), roughness: 0.9 }));
        aw.position.set(b.x + b.w / 2, b.style === 'shop' ? 3.4 : 3.2, b.y + b.h + 0.7); aw.rotation.x = 0.25; aw.castShadow = true; scene.add(aw);
      }
    }
    for (const r of SW.ROWHOUSES) {
      const ht = r.floors * 3 + 0.4;
      const bb = { x: r.x, y: r.y, w: r.w, h: r.h, ht };
      buildingMesh(rec, bb, 'row', { front: r.face === 'n' ? 'n' : 's', doorX: r.x + r.w / 2, sign: r.sign, tint: r.tint, seed: r.x * 3 + r.y });
      roofProps(rec, bb, 'tanks');
      if (r.face === 'n' && r.w >= 4) verticalSign(rec, r.x + r.w - 0.6, r.y - 0.45, 4.2, r.sign.slice(0, 4), ['#c0392b', '#1f6f8b', '#e8a33a', '#2f8f83', '#6b4a7a', '#d35400'][(r.x * 3 + r.y) % 6], 0);
      if (r.face === 'n') { // arcade (騎樓) beam + rolling shutter box
        box(scene, r.w - 0.1, 0.35, 0.3, M('#7d7a72'), r.x + r.w / 2, 3.3, r.y - 0.15);
      }
    }
    // trees (instanced)
    const trees = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.rows[y][x] === 'T') trees.push([x + 0.5, y + 0.5]);
    const trunkG = new THREE.CylinderGeometry(0.12, 0.18, 2.6, 7); trunkG.translate(0, 1.3, 0);
    const leafG = new THREE.IcosahedronGeometry(1.3, 1);
    const trunks = new THREE.InstancedMesh(trunkG, M('#6b5038', { roughness: 1 }), trees.length);
    const leaves = new THREE.InstancedMesh(leafG, M('#ffffff', { roughness: 0.9, flatShading: true }), trees.length * 3);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
    trees.forEach(([x, z], i) => {
      const s = 0.85 + U.hash('t' + i) * 0.5;
      mx.compose(ps.set(x, 0, z), q.identity(), sc.set(s, s, s)); trunks.setMatrixAt(i, mx);
      for (let k = 0; k < 3; k++) {
        const ox = (U.hash(i + 'x' + k) - 0.5) * 1.2, oz = (U.hash(i + 'z' + k) - 0.5) * 1.2, oy = 2.6 + k * 0.55;
        const ls = s * (1.05 - k * 0.18);
        mx.compose(ps.set(x + ox, oy * s, z + oz), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), k), sc.set(ls, ls * 0.85, ls)); leaves.setMatrixAt(i * 3 + k, mx);
        leaves.setColorAt(i * 3 + k, col.set(['#3f7a36', '#4f8a3c', '#5d9a44', '#46803a'][(i + k) % 4]));
      }
    });
    trunks.castShadow = leaves.castShadow = true; leaves.receiveShadow = true; scene.add(trunks, leaves); rec.leaves = leaves;
    // parked scooters (instanced parts)
    const sp = MD.scooterParts(), list = SW.SCOOTERS;
    const parts = [['body', '#ffffff', 0.35, 0], ['front', '#ffffff', 0.55, 0.55], ['seat', '#1d1d1d', 0.62, -0.18], ['bar', '#2b2b2b', 1.02, 0.5]];
    const inst = parts.map(([k, c]) => new THREE.InstancedMesh(sp[k], M(c, { roughness: 0.45, metalness: 0.15 }), list.length));
    const wheels = new THREE.InstancedMesh(sp.wheel, M('#151515', { roughness: 0.8 }), list.length * 2);
    const bodyCols = ['#e8e4dc', '#c0392b', '#2b6fd0', '#1d1d1d', '#9aa3a8', '#f2b33d', '#5aa05a', '#e46b7b'];
    list.forEach(([x, y], i) => {
      const yaw = (U.hash('s' + i) - 0.5) * 0.25 + (y < 50 ? 0 : 0);
      const base = new THREE.Matrix4().makeRotationY(yaw); base.setPosition(x + 0.5, 0, y + 0.5);
      parts.forEach(([k, , py, pz], j) => { const lm = new THREE.Matrix4().makeTranslation(0, py, pz); const out = base.clone().multiply(lm); inst[j].setMatrixAt(i, out); if (j < 2) inst[j].setColorAt(i, col.set(bodyCols[Math.floor(U.hash('c' + i) * bodyCols.length)])); });
      for (const [w, pz] of [[0, 0.5], [1, -0.45]]) { const lm = new THREE.Matrix4().makeTranslation(0, 0.2, pz).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)); wheels.setMatrixAt(i * 2 + w, base.clone().multiply(lm)); }
    });
    for (const im of inst) { im.castShadow = true; scene.add(im); }
    wheels.castShadow = true; scene.add(wheels);
    // street lamps + light pools
    const lampPos = [];
    for (let x = 4; x < m.w; x += 12) { lampPos.push([x + 0.5, 43.85], [x + 6.5, 52.15], [x + 2.5, 77.85]); }
    for (let x = 8; x < m.w; x += 16) lampPos.push([x, 87.6]);
    for (let z = 4; z < 40; z += 12) lampPos.push([57.85, z], [64.15, z + 6]);
    const poleG = new THREE.CylinderGeometry(0.06, 0.09, 5.2, 8); poleG.translate(0, 2.6, 0);
    const headG = new THREE.BoxGeometry(0.35, 0.14, 0.7); headG.translate(0, 5.15, 0.3);
    const poles = new THREE.InstancedMesh(poleG, M('#4a5258', { roughness: 0.5, metalness: 0.5 }), lampPos.length);
    const headM = new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffd28a, emissiveIntensity: 0 });
    const heads = new THREE.InstancedMesh(headG, headM, lampPos.length);
    const poolC = TX.canvas(128, 128), pg = poolC.getContext('2d'); const pgr = pg.createRadialGradient(64, 64, 0, 64, 64, 64); pgr.addColorStop(0, 'rgba(255,214,150,0.9)'); pgr.addColorStop(1, 'rgba(255,214,150,0)'); pg.fillStyle = pgr; pg.fillRect(0, 0, 128, 128);
    const poolM = new THREE.MeshBasicMaterial({ map: MD.tex(poolC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), poolM, lampPos.length);
    lampPos.forEach(([x, z], i) => {
      const face = z < 50 && z > 40 ? Math.PI : z > 50 && z < 60 ? 0 : z > 70 && z < 80 ? Math.PI : x < 60 ? -Math.PI / 2 : Math.PI / 2;
      mx.compose(ps.set(x, 0, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), face), sc.set(1, 1, 1)); poles.setMatrixAt(i, mx); heads.setMatrixAt(i, mx);
      mx.compose(ps.set(x + Math.sin(face) * 0.3, 0.03, z + Math.cos(face) * 0.3), q.identity(), sc.set(1, 1, 1)); pools.setMatrixAt(i, mx);
    });
    poles.castShadow = true; scene.add(poles, heads, pools); rec.lampHead = headM; rec.lampPool = poolM;
    // night market: lantern strings + entrance arches
    const lanternM = new THREE.MeshStandardMaterial({ color: 0xc8301e, emissive: 0xd8301a, emissiveIntensity: 0.2, roughness: 0.6 });
    const lanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8), lanternM, 42);
    const wirePts = [];
    for (let i = 0; i < 42; i++) { const row = i % 2, k = Math.floor(i / 2); const x = 89.6 + row * 4.8, z = 55.6 + k * 0.92, y = 3.55 - Math.sin(((k % 5) / 4) * Math.PI) * 0.35; mx.compose(ps.set(x, y, z), q.identity(), sc.set(1, 1.25, 1)); lanterns.setMatrixAt(i, mx); if (k) wirePts.push(new THREE.Vector3(x, y + 0.2, z - 0.92), new THREE.Vector3(x, y + 0.2, z)); }
    scene.add(lanterns); rec.lanterns = lanternM;
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wirePts), new THREE.LineBasicMaterial({ color: 0x222222 })));
    // warm light pools along the market lane (shown when the stalls are open)
    const mpool = new THREE.MeshBasicMaterial({ map: MD.tex(poolC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
    const mpools = new THREE.InstancedMesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), mpool, 8);
    for (let i = 0; i < 8; i++) { mx.compose(ps.set(i % 2 ? 94.5 : 89.5, 0.035, 58 + Math.floor(i / 2) * 4), q.identity(), sc.set(1, 1, 1)); mpools.setMatrixAt(i, mx); }
    scene.add(mpools); rec.marketPool = mpool;
    for (const z of [55.2, 74.8]) {
      const a = new THREE.Group(); a.position.set(92, 0, z); scene.add(a);
      for (const ex of [-5.6, 5.6]) cyl(a, 0.18, 0.18, 4.6, M('#b8322a'), ex, 0, 0, 10);
      const sm = signMat('東門夜市', '#b8322a', '#ffe08a'); rec.signs.push(sm);
      const s = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 0.3), [M('#7a1c14'), M('#7a1c14'), M('#7a1c14'), M('#7a1c14'), sm, sm]); s.position.y = 4.4; s.castShadow = true; a.add(s);
    }
    // basketball court fence
    const fenceM = new THREE.MeshStandardMaterial({ color: 0x5a7a6a, transparent: true, opacity: 0.35, roughness: 0.6, side: THREE.DoubleSide });
    for (const [x, z, w, d] of [[45.9, 9.9, 16, 0.05], [53.9, 18, 0.05, 16], [37.9, 18, 0.05, 16]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), fenceM); f.position.set(x, 1.5, z); scene.add(f); }
    // kite flyer on the riverbank
    const kiter = MD.human({ hair: '#d8d8d8', style: 'short', skin: '#d8a77f', outfit: '#3f6a8a', acc: 'cap' }, { height: 1.66, pants: '#4a4a44' });
    kiter.position.set(50.5, 0, 89.5); kiter.rotation.y = Math.PI; scene.add(kiter); rec.kiter = kiter;
    const kite = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xe8402e, side: THREE.DoubleSide, roughness: 0.6 })); kite.rotation.z = Math.PI / 4; scene.add(kite); rec.kite = kite;
    const strG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); const str = new THREE.Line(strG, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); scene.add(str); rec.kiteStr = str;
    // traffic
    rec.vehicles = [];
    const lanes = [{ z: 45.2, dir: -1, type: 's' }, { z: 46.9, dir: -1, type: 'c' }, { z: 49.1, dir: 1, type: 'c' }, { z: 50.8, dir: 1, type: 's' }, { z: 79.3, dir: -1, type: 's' }, { z: 82.6, dir: 1, type: 'c' }, { x: 59.4, dir: 1, type: 's', vert: true }, { x: 62.6, dir: -1, type: 's', vert: true }];
    lanes.forEach((ln, li) => { const n = ln.vert ? 2 : ln.type === 'c' ? 3 : 4; for (let i = 0; i < n; i++) rec.vehicles.push(makeVehicle(rec, ln, (i / n) * 260 - 70 + li * 13)); });
    // ambient pedestrians
    rec.peds = [];
    const pedLooks = [['#222', 'short', '#2b6fd0'], ['#4a2f22', 'long', '#e46b7b'], ['#1d1c24', 'pony', '#f2b33d'], ['#555', 'bald', '#6d7f5b'], ['#2a2018', 'neat', '#ffffff'], ['#7a3b22', 'bob', '#2f8f83'], ['#111', 'spiky', '#c0392b'], ['#ddd', 'short', '#8a6bb8'], ['#3a2a1e', 'long', '#f4f7f3'], ['#1d1c24', 'short', '#3d3d48']];
    pedLooks.forEach(([hair, style, outfit], i) => {
      const h = MD.human({ hair, style, skin: ['#f6d6bd', '#e2b48c', '#c99266', '#efc6a0'][i % 4], outfit, acc: i === 2 ? 'cap' : 'none' }, { height: 1.55 + U.hash('ph' + i) * 0.3, pants: ['#2c3446', '#3a3a3a', '#5a5246', '#e8e2d6'][i % 4] });
      scene.add(h); rec.peds.push({ mesh: h, path: null, i: 0, x: 0, z: 0, wait: Math.random() * 3 });
    });
    // vendors at the night market
    rec.vendors = [];
    for (const o of m.objects.filter((o) => o.kind === 'stall')) {
      const v = MD.human({ hair: '#1d1c24', style: U.hash(o.id) > 0.5 ? 'short' : 'bob', skin: '#e2b48c', outfit: '#f4f4f0', acc: 'apron' }, { height: 1.62, pants: '#333' });
      const back = o.face === 'e' ? -0.5 : 0.5; v.position.set(o.x + o.w / 2 + back * 0.6, 0, o.y + o.h / 2); v.rotation.y = o.face === 'e' ? Math.PI / 2 : -Math.PI / 2;
      scene.add(v); rec.vendors.push(v);
    }
  }
  function makeVehicle(rec, ln, offset) {
    const g = new THREE.Group();
    const carCols = ['#e8e4dc', '#1d1d1d', '#9aa3a8', '#2b6fd0', '#c0392b', '#f2b33d'];
    const c = carCols[Math.floor(Math.random() * carCols.length)];
    let len;
    if (ln.type === 'c') {
      len = 4.4;
      const taxi = Math.random() < 0.3;
      const bm = M(taxi ? '#f2c230' : c, { roughness: 0.25, metalness: 0.4 });
      box(g, 1.8, 0.7, 4.3, bm, 0, 0.3, 0); box(g, 1.6, 0.6, 2.2, bm, 0, 1.0, -0.2);
      box(g, 1.62, 0.45, 2.0, M('#1d2730', { roughness: 0.05, metalness: 0.6 }), 0, 1.05, -0.2);
      for (const [x, z] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) { const w = cyl(g, 0.33, 0.33, 0.25, M('#151515'), x, 0, z, 14); w.rotation.z = Math.PI / 2; w.position.y = 0.33; }
      const hl = M('#fff7e0', { emissive: 0xfff2c8, emissiveIntensity: 0.3 }); box(g, 0.35, 0.15, 0.05, hl, -0.6, 0.65, 2.15); box(g, 0.35, 0.15, 0.05, hl, 0.6, 0.65, 2.15);
      const tl = M('#8a1010', { emissive: 0xff2020, emissiveIntensity: 0.4 }); box(g, 0.35, 0.15, 0.05, tl, -0.6, 0.65, -2.15); box(g, 0.35, 0.15, 0.05, tl, 0.6, 0.65, -2.15);
      if (taxi) box(g, 0.5, 0.18, 0.25, M('#ffffff', { emissive: 0xffffff, emissiveIntensity: 0.3 }), 0, 1.6, -0.2);
    } else {
      len = 1.8;
      const bm = M(c, { roughness: 0.4, metalness: 0.2 });
      box(g, 0.34, 0.42, 1.25, bm, 0, 0.3, 0); box(g, 0.36, 0.7, 0.14, bm, 0, 0.5, 0.55); box(g, 0.3, 0.1, 0.6, M('#1d1d1d'), 0, 0.72, -0.18);
      for (const z of [0.55, -0.5]) { const w = cyl(g, 0.22, 0.22, 0.1, M('#151515'), 0, 0, z, 12); w.rotation.z = Math.PI / 2; w.position.y = 0.22; }
      const rider = MD.human({ hair: '#222', style: 'short', skin: '#e2b48c', outfit: ['#3d5a80', '#c0392b', '#f4f4f0', '#2f8f83'][Math.floor(Math.random() * 4)], acc: 'none' }, { height: 1.6, pants: '#333' });
      rider.position.set(0, 0.25, -0.15); rider.userData.parts.legs.forEach((l) => { l.rotation.x = -1.2; }); rider.userData.parts.arms.forEach((a) => { a.rotation.x = -1.1; }); g.add(rider);
      sph(rider, 0.15, M(['#f4f4f0', '#c0392b', '#2b6fd0', '#f2b33d'][Math.floor(Math.random() * 4)], { roughness: 0.3 }), 0, 1.65, 0, 1, 0.9, 1.05);
    }
    g.rotation.y = ln.vert ? (ln.dir > 0 ? 0 : Math.PI) : (ln.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    rec.scene.add(g);
    return { mesh: g, ln, pos: offset, speed: ln.type === 'c' ? 9 + Math.random() * 3 : 7 + Math.random() * 3, len, wait: 0 };
  }

  // ---------- interiors ----------
  const CEIL = { office: '#e9ecec', home: '#f2efe8', cafe: '#6b4a32', church: '#f3efe6', gym: '#3a4045', bar: '#2a1c14', studio: '#2c3038' };
  function buildInterior(rec) {
    const m = rec.map, scene = rec.scene, def = m.def;
    const fc = TX.floor(m, 48);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), new THREE.MeshStandardMaterial({ map: MD.tex(fc), roughness: m.id === 'bar' || m.id === 'cafe' ? 0.55 : 0.85 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(m.w / 2, 0, m.h / 2); floor.receiveShadow = true; scene.add(floor);
    const walls = [];
    const isWall = (x, y) => SW.W.tileAt(m, x, y) === '#';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (!isWall(x, y)) continue;
      let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = SW.W.tileAt(m, x + dx, y + dy); if (t !== '#' && !(x + dx < 0 || y + dy < 0 || x + dx >= m.w || y + dy >= m.h)) near = true; }
      if (near) walls.push({ w: 1, h: 3, d: 1, x: x + 0.5, y: 0, z: y + 0.5 });
    }
    const wc = new THREE.Color(def.wall).lerp(new THREE.Color('#f4f1ea'), m.id === 'gym' || m.id === 'bar' || m.id === 'studio' ? 0.25 : 0.62);
    const wallM = new THREE.MeshStandardMaterial({ map: MD.tex(TX.wall('#' + wc.getHexString())), roughness: 0.9 });
    const wm = new THREE.Mesh(mergeBoxes(walls), wallM); wm.castShadow = true; wm.receiveShadow = true; scene.add(wm);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), M(CEIL[m.id] || '#eee', { roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(m.w / 2, 3, m.h / 2); scene.add(ceil);
    // ceiling lights
    const lightM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: m.id === 'bar' ? 0xffb066 : m.id === 'studio' ? 0xb79cff : 0xfff3dc, emissiveIntensity: 1 });
    for (let y = 2; y < m.h - 1; y += 4) for (let x = 2; x < m.w - 1; x += 4) {
      if (isWall(x, y)) continue;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(m.id === 'office' ? 1.2 : 0.5, m.id === 'office' ? 0.6 : 0.5), lightM); p.rotation.x = Math.PI / 2; p.position.set(x + 0.5, 2.98, y + 0.5); scene.add(p);
    }
    const warm = { bar: 0xffa060, cafe: 0xffc890, studio: 0xc0a8ff, church: 0xfff0d8, gym: 0xf0f6ff, office: 0xf6fbff, home: 0xffe6c8 }[m.id] || 0xffffff;
    const hemi = new THREE.HemisphereLight(0xffffff, 0x6b6050, m.id === 'bar' ? 0.35 : 0.6); scene.add(hemi);
    const amb = new THREE.AmbientLight(warm, m.id === 'bar' ? 0.18 : 0.22); scene.add(amb);
    const nL = Math.max(1, Math.round((m.w * m.h) / 90));
    for (let i = 0; i < nL; i++) { const pl = new THREE.PointLight(warm, m.id === 'bar' ? 0.75 : 0.6, 16, 1.6); pl.position.set(((i + 0.5) / nL) * m.w, 2.7, m.h * (i % 2 ? 0.35 : 0.65)); scene.add(pl); }
    const dl = new THREE.DirectionalLight(warm, 0.45); dl.position.set(m.w * 0.3, 8, m.h * 0.2); dl.target.position.set(m.w / 2, 0, m.h / 2); dl.castShadow = true; dl.shadow.mapSize.set(1024, 1024);
    const sc = dl.shadow.camera; sc.left = -m.w; sc.right = m.w; sc.top = m.h; sc.bottom = -m.h; sc.near = 1; sc.far = 30; dl.shadow.bias = -0.0008; scene.add(dl, dl.target);
    // windows on the top wall (sky colour at runtime)
    const winM = new THREE.MeshBasicMaterial({ color: 0xbfe0f5 }); rec.winMat = winM;
    for (let x = 2; x < m.w - 2; x += 4) {
      if (!isWall(x, 0) || SW.W.tileAt(m, x, 1) === '#') continue;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), winM); w.position.set(x + 0.5, 1.75, 1.002); scene.add(w);
      const fr = M('#e9ecec'); box(scene, 1.62, 0.06, 0.06, fr, x + 0.5, 1.12, 1.02); box(scene, 1.62, 0.06, 0.06, fr, x + 0.5, 2.33, 1.02); box(scene, 0.06, 1.25, 0.06, fr, x + 0.5, 1.12, 1.02);
    }
    // exit door(s)
    for (const d of m.doors) {
      const g = new THREE.Group(); g.position.set(d.x + 0.5, 0, d.y); scene.add(g);
      const out = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.3), new THREE.MeshBasicMaterial({ color: 0xfff3dc, side: THREE.DoubleSide })); out.position.set(0, 1.15, 0.98); g.add(out); rec.doorGlow = out.material;
      const fm = M('#6b5a45'); box(g, 0.1, 2.35, 1.0, fm, -0.48, 0, 0.5); box(g, 0.1, 2.35, 1.0, fm, 0.48, 0, 0.5); box(g, 1.06, 0.65, 1.0, wallM, 0, 2.35, 0.5);
      const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.22), new THREE.MeshBasicMaterial({ map: MD.tex(TX.sign('出口 EXIT', '#1f8f4a', '#fff')) })); ex.position.set(0, 2.62, 0.0); g.add(ex);
    }
    // room labels
    for (const r of def.rooms || []) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.6, r.label.length * 0.32), 0.3), new THREE.MeshBasicMaterial({ map: MD.tex(TX.sign(r.label, '#2b3a44', '#fff')) }));
      s.position.set(r.x + r.w / 2, 2.55, r.y + r.h + 0.01); scene.add(s);
    }
  }

  // ---------- scene records ----------
  R3.sceneFor = function (mapId) {
    const key = mapId === 'home' ? 'home:' + SW.S.p.housing : mapId;
    if (R3.scenes[key]) return R3.scenes[key];
    const map = SW.W.get(mapId);
    const scene = new THREE.Scene();
    const rec = { id: mapId, key, map, scene, pickables: [], objs: {}, emissives: [], signs: [], outdoor: !!map.def.outdoor };
    if (rec.outdoor) {
      rec.skyObj = makeSky(scene);
      rec.sun = new THREE.DirectionalLight(0xffffff, 1.2); rec.sun.castShadow = true;
      const sm = R3.mobile ? 1024 : 2048; rec.sun.shadow.mapSize.set(sm, sm);
      const sc = rec.sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 200; rec.sun.shadow.bias = -0.0006; rec.sun.shadow.normalBias = 0.04;
      scene.add(rec.sun, rec.sun.target);
      rec.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a6a48, 0.6); scene.add(rec.hemi);
      scene.fog = new THREE.Fog(0xbcdcf2, 70, 300);
      buildCity(rec);
    } else {
      scene.background = new THREE.Color('#141a1f');
      buildInterior(rec);
    }
    for (const o of map.objects) placeObject(rec, map, o);
    R3.scenes[key] = rec;
    return rec;
  };

  R3.enter = function (mapId) {
    cur = R3.sceneFor(mapId);
    for (const id of Object.keys(R3.npc)) { const n = R3.npc[id]; if (n.parent && n.parent !== cur.scene) n.parent.remove(n); }
    R3.lastLight = -1;
  };

  // ---------- NPC models ----------
  const labelCache = {}, bubbleCache = {};
  function npcModel(id) {
    if (R3.npc[id]) return R3.npc[id];
    const ch = SW.CH[id];
    const h = MD.human(ch.look, { height: MD.HEIGHT[id] || 1.68, pants: MD.PANTS[id] });
    const lc = labelCache[id] || (labelCache[id] = TX.label(ch.name, ch.core ? 'rgba(31,45,54,0.82)' : 'rgba(70,70,70,0.75)', '#fff'));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: MD.tex(lc), depthTest: true, transparent: true }));
    sp.scale.set(0.2 * lc.width / lc.height, 0.2, 1); sp.position.y = h.userData.h + 0.3; h.add(sp);
    const bs = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true })); bs.scale.set(0.34, 0.34, 1); bs.position.y = h.userData.h + 0.62; bs.visible = false; h.add(bs);
    h.userData.label = sp; h.userData.bubble = bs; h.userData.pick = { type: 'npc', id };
    R3.npc[id] = h;
    return h;
  }
  function bubbleTex(e) { return bubbleCache[e] || (bubbleCache[e] = MD.tex(TX.emoji(e))); }

  // ---------- per frame ----------
  const tmpV = new THREE.Vector3();
  let mmT = 0;
  R3.skip = /[?&]norender/.test(location.search);
  R3.render = function (dt) {
    if (!renderer) return;
    const S = SW.S, p = S.p;
    if (!cur || cur.id !== p.map || (p.map === 'home' && cur.key !== 'home:' + p.housing)) R3.enter(p.map);
    const rec = cur, scene = rec.scene;
    const hour = T.mod() / 60, dark = T.dark();
    // lighting
    if (rec.outdoor) {
      const sk = skyAt(hour);
      rec.skyObj.mat.uniforms.top.value.copy(sk.top); rec.skyObj.mat.uniforms.horizon.value.copy(sk.horizon);
      scene.fog.color.copy(sk.horizon);
      const day = hour > 5.5 && hour < 19.2;
      const ang = day ? (hour - 6) / 13 * Math.PI : ((hour + 24 - 19.2) % 24) / 10.3 * Math.PI;
      const el = Math.max(0.12, Math.sin(ang) * (day ? 1.15 : 0.8));
      const dir = tmpV.set(Math.cos(ang) * 0.75, el, 0.45).normalize();
      rec.sun.position.set(p.x + dir.x * 80, dir.y * 80, p.y + dir.z * 80); rec.sun.target.position.set(p.x, 0, p.y);
      rec.sun.color.copy(sk.sun); rec.sun.intensity = sk.sunI;
      rec.hemi.intensity = sk.hemiI; rec.hemi.color.copy(sk.top).lerp(new THREE.Color('#ffffff'), 0.55);
      rec.skyObj.sun.position.copy(camera.position).addScaledVector(dir, 400); rec.skyObj.sun.material.color.copy(sk.sun); rec.skyObj.sun.scale.setScalar(day ? 60 : 30);
      rec.skyObj.stars.material.opacity = U.clamp((dark - 0.3) * 2.5, 0, 0.9);
      rec.skyObj.sky.position.copy(camera.position); rec.skyObj.stars.position.copy(camera.position);
      const glow = 0.08 + dark * 1.9;
      for (const mm of rec.emissives) mm.emissiveIntensity = glow;
      for (const mm of rec.signs) mm.emissiveIntensity = 0.15 + dark * 1.4;
      rec.lampHead.emissiveIntensity = dark > 0.25 ? 2.2 : 0.05; rec.lampPool.opacity = U.clamp((dark - 0.2) * 1.6, 0, 0.75);
      const open = hour >= 17 || hour < 0.5;
      rec.lanterns.emissiveIntensity = open ? 0.35 + dark * 0.9 : 0.05;
      rec.marketPool.opacity = open ? 0.25 + dark * 0.6 : 0;
      for (const v of rec.vendors) v.visible = open;
      for (const id of Object.keys(rec.objs)) { const g = rec.objs[id]; if (g.userData.bulb) g.userData.bulb.emissiveIntensity = open ? 1 + dark * 2 : 0; if (g.userData.signMat) g.userData.signMat.emissiveIntensity = open ? 0.3 + dark * 1.2 : 0.05; }
      if (rec.waterTex) { rec.waterTex.offset.x += dt * 0.004; rec.waterTex.offset.y += dt * 0.002; }
      renderer.toneMappingExposure = 1.05 + dark * 0.35;
      updateTraffic(rec, dt);
      updatePeds(rec, dt);
      if (rec.kite) { const t = performance.now() / 1000; rec.kite.position.set(54 + Math.sin(t * 0.4) * 2, 16 + Math.sin(t * 0.7) * 1.2, 101 + Math.cos(t * 0.3) * 2); rec.kite.rotation.y = Math.sin(t * 0.5) * 0.4; const a = rec.kiteStr.geometry.attributes.position; a.setXYZ(0, 50.9, 1.35, 89.2); a.setXYZ(1, rec.kite.position.x, rec.kite.position.y - 0.5, rec.kite.position.z); a.needsUpdate = true; }
    } else {
      const sk = skyAt(hour); if (rec.winMat) rec.winMat.color.copy(sk.horizon).lerp(sk.top, 0.3);
      if (rec.doorGlow) rec.doorGlow.color.copy(sk.horizon).lerp(new THREE.Color('#fff3dc'), 0.4);
      renderer.toneMappingExposure = 1.05;
    }
    // objects: cats, fountain
    const t = performance.now() / 1000;
    for (const id of Object.keys(rec.objs)) {
      const g = rec.objs[id];
      if (g.userData.cat) { const c = g.userData.cat; c.userData.tail.rotation.z = Math.sin(t * 2 + id.length) * 0.5; c.userData.head.rotation.y = Math.sin(t * 0.6 + id.length) * 0.4; const found = S.f.cats && S.f.cats[g.userData.obj.cat]; c.position.y = found ? Math.abs(Math.sin(t * 3)) * 0.02 : 0; }
      if (g.userData.jet) g.userData.jet.scale.y = 1 + Math.sin(t * 6) * 0.08;
    }
    // NPCs
    for (const id of Object.keys(SW.CH)) {
      const n = S.n[id]; if (!n) continue;
      const here = n.map === p.map;
      const mdl = here ? npcModel(id) : R3.npc[id];
      if (!mdl) continue;
      if (!here) { if (mdl.parent) mdl.parent.remove(mdl); continue; }
      if (mdl.parent !== scene) { scene.add(mdl); mdl.position.set(n.x, 0, n.y); }
      let ox = 0, oz = 0;
      for (const o2 of SW.W.npcsHere()) { if (o2 === id) continue; const n2 = S.n[o2]; if (Math.hypot(n2.x - n.x, n2.y - n.y) < 0.45) { const s2 = id < o2 ? -1 : 1; ox += s2 * 0.32; oz += s2 * 0.12; } }
      const dx = n.x + ox - mdl.position.x, dz = n.y + oz - mdl.position.z, mv = Math.hypot(dx, dz);
      mdl.position.set(n.x + ox, 0, n.y + oz);
      let targetYaw = mdl.rotation.y;
      if (mv > 0.004) targetYaw = Math.atan2(dx, dz);
      const dp = Math.hypot(p.x - n.x, p.y - n.y);
      const talking = R3.focusId === id || n.approach || S.p.follower === id;
      if ((dp < 2.6 && mv < 0.004) || (talking && mv < 0.004)) targetYaw = Math.atan2(p.x - n.x, p.y - n.y);
      let dy = targetYaw - mdl.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      mdl.rotation.y += dy * Math.min(1, dt * 8);
      MD.animHuman(mdl, dt, mv > 0.004, U.clamp(mv / Math.max(dt, 0.001) / 3, 0.6, 1.4));
      mdl.userData.label.visible = dp < 9;
      const bub = SW.Sys.bubble(id);
      const bs = mdl.userData.bubble;
      if (bub) { if (bs.userData.e !== bub) { bs.material.map = bubbleTex(bub); bs.material.needsUpdate = true; bs.userData.e = bub; } bs.visible = dp < 22; bs.position.y = mdl.userData.h + 0.62 + Math.sin(t * 3) * 0.03; } else bs.visible = false;
    }
    // camera
    const bob = p.moving ? Math.sin(t * 11) * 0.03 : 0;
    camera.position.set(p.x, EYE + bob, p.y);
    if (R3.focusId && !SW.$('dialog').hidden && S.n[R3.focusId] && S.n[R3.focusId].map === p.map) {
      const n = S.n[R3.focusId];
      const ty = Math.atan2(-(n.x - p.x), -(n.y - p.y));
      const dist = Math.max(0.6, Math.hypot(n.x - p.x, n.y - p.y));
      const tp = Math.atan2((MD.HEIGHT[R3.focusId] || 1.68) - 0.1 - EYE, dist);
      let d = ty - p.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      p.yaw += d * Math.min(1, dt * 4); R3.pitch += (tp - R3.pitch) * Math.min(1, dt * 4);
    }
    camera.rotation.set(R3.pitch, p.yaw, 0);
    // target highlight
    updateHighlight(rec);
    if (!R3.skip) renderer.render(scene, camera);
    mmT -= dt; if (mmT <= 0) { mmT = 0.2; R3.drawMinimap(); }
  };

  function updateTraffic(rec, dt) {
    const p = SW.S.p;
    for (const v of rec.vehicles) {
      const ln = v.ln;
      const along = ln.vert ? v.pos : v.pos;
      // stop for the player standing in the lane ahead
      let px = p.x, pz = p.y, ahead;
      if (ln.vert) ahead = (pz - along) * ln.dir; else ahead = (px - along) * ln.dir;
      const lat = ln.vert ? Math.abs(px - ln.x) : Math.abs(pz - ln.z);
      const blocked = ahead > 0 && ahead < v.len / 2 + 3.2 && lat < 1.1 && p.map === 'city';
      if (blocked) { v.wait += dt; if (v.wait > 1.2 && (!R3.honkT || performance.now() - R3.honkT > 15000)) { R3.honkT = performance.now(); SW.UI.toast(ln.type === 'c' ? '🚗 叭叭——！司機搖下車窗：「走路看路啦！」' : '🛵 叭——！機車騎士：「少年欸，馬路不是你家客廳！」', 'warn'); } }
      else { v.wait = 0; v.pos += v.speed * dt * ln.dir; }
      const lo = ln.vert ? -40 : -70, hi = ln.vert ? 86 : 190;
      if (v.pos > hi) v.pos = lo; if (v.pos < lo) v.pos = hi;
      if (ln.vert) v.mesh.position.set(ln.x, 0, v.pos); else v.mesh.position.set(v.pos, 0, ln.z);
    }
  }
  const PED_SPOTS = [[10, 42], [40, 42], [70, 42], [100, 42], [115, 53], [80, 53], [50, 53], [20, 53], [22, 70], [36, 72], [91, 60], [92, 72], [30, 76], [70, 76], [100, 76], [20, 89], [60, 89], [95, 89], [56, 20], [65, 30], [20, 36], [80, 39]];
  function updatePeds(rec, dt) {
    const m = rec.map;
    for (const pd of rec.peds) {
      if (!pd.path) {
        const a = U.pick(PED_SPOTS), b = U.pick(PED_SPOTS);
        pd.x = a[0] + 0.5; pd.z = a[1] + 0.5;
        pd.path = SW.W.bfs(m, a[0], a[1], b[0], b[1]) || []; pd.i = 0;
        pd.mesh.position.set(pd.x, 0, pd.z);
      }
      if (pd.wait > 0) { pd.wait -= dt; MD.animHuman(pd.mesh, dt, false); continue; }
      const pt = pd.path[pd.i];
      if (!pt) { pd.path = null; pd.wait = 1 + Math.random() * 4; continue; }
      const tx = pt[0] + 0.5, tz = pt[1] + 0.5, dx = tx - pd.x, dz = tz - pd.z, d = Math.hypot(dx, dz);
      const sp = 1.6 * dt;
      if (d <= sp) { pd.x = tx; pd.z = tz; pd.i++; } else { pd.x += dx / d * sp; pd.z += dz / d * sp; pd.mesh.rotation.y = Math.atan2(dx, dz); }
      pd.mesh.position.set(pd.x, 0, pd.z);
      MD.animHuman(pd.mesh, dt, true, 0.75);
    }
  }

  // ---------- targeting ----------
  let ring = null, boxHelper = null;
  function updateHighlight(rec) {
    const tg = SW.W.target, busy = SW.UI.busy();
    if (!ring) {
      ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2b33d, transparent: true, opacity: 0.85, depthWrite: false }));
      boxHelper = new THREE.Box3Helper(new THREE.Box3(), 0xf2b33d);
    }
    if (ring.parent !== rec.scene) rec.scene.add(ring);
    if (boxHelper.parent !== rec.scene) rec.scene.add(boxHelper);
    ring.visible = false; boxHelper.visible = false;
    if (!tg || busy) return;
    if (tg.type === 'npc') { const n = SW.S.n[tg.id]; ring.position.set(n.x, 0.03, n.y); ring.visible = true; ring.material.opacity = 0.6 + Math.sin(performance.now() / 160) * 0.3; }
    else { const g = rec.objs[tg.obj.id]; if (g) { boxHelper.box.setFromObject(g); boxHelper.box.expandByScalar(0.04); boxHelper.visible = true; } }
  }
  R3.computeTarget = function () {
    const S = SW.S, p = S.p, m = SW.W.get(p.map);
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let best = null, bs = 1e9;
    const consider = (tx, tz, item, reach) => {
      const dx = tx - p.x, dz = tz - p.y, d = Math.hypot(dx, dz);
      if (d > reach) return;
      const ang = d < 0.05 ? 0 : Math.acos(U.clamp((dx * fx + dz * fz) / d, -1, 1));
      if (ang > 0.8 && d > 0.95) return;
      const score = ang * 1.6 + d * 0.35;
      if (score < bs) { bs = score; best = item; }
    };
    for (const id of SW.W.npcsHere()) { const n = S.n[id]; consider(n.x, n.y, { type: 'npc', id }, 2.8); }
    for (const o of m.objects) {
      if (o.kind === 'decor' || o.hide) continue;
      const cx = U.clamp(p.x, o.x, o.x + o.w), cz = U.clamp(p.y, o.y, o.y + o.h);
      consider(cx, cz, { type: 'obj', obj: o }, o.inBuilding ? 1.8 : 2.2);
    }
    return best;
  };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  R3.pick = function (sx, sy) {
    if (!cur) return null;
    ndc.set(sx / window.innerWidth * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const objs = cur.pickables.concat(Object.values(R3.npc).filter((n) => n.parent === cur.scene));
    const hits = ray.intersectObjects(objs, true);
    for (const h of hits) {
      let o = h.object; while (o && !o.userData.pick) o = o.parent;
      if (o && h.distance < 14) return Object.assign({ dist: h.distance }, o.userData.pick);
    }
    // ground
    const t = -ray.ray.origin.y / ray.ray.direction.y;
    if (t > 0 && t < 60) { const gx = ray.ray.origin.x + ray.ray.direction.x * t, gz = ray.ray.origin.z + ray.ray.direction.z * t; return { type: 'ground', x: gx, y: gz }; }
    return null;
  };
  R3.focus = function (who) { R3.focusId = who && SW.CH[who] ? who : null; };

  // ---------- minimap ----------
  const mmCache = {};
  function mmBase(m) {
    const key = m.id === 'home' ? 'home:' + SW.S.p.housing : m.id;
    if (mmCache[key]) return mmCache[key];
    const P = m.def.outdoor ? 3 : 10;
    const c = TX.canvas(m.w * P, m.h * P), g = c.getContext('2d');
    const col = { r: '#4a5056', s: '#b98a76', P: '#c8c4ba', D: '#e8d5a0', L: '#9a9890', c: '#4f8a68', p: '#d6c39a', w: '#3d7f93', B: '#3a3f45', T: '#3f7a36', g: '#7fae5c', k: '#8dbb68', f: '#7fae5c', m: '#6b5a4a', '#': '#2b3238', '.': m.def.floor ? m.def.floor[0] : '#ccc' };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { g.fillStyle = col[m.rows[y][x]] || '#999'; g.fillRect(x * P, y * P, P, P); }
    for (const o of m.objects) { if (o.hide || o.inBuilding) continue; g.fillStyle = o.kind === 'decor' ? 'rgba(80,80,80,0.6)' : '#f2b33d'; g.fillRect(o.x * P, o.y * P, o.w * P, o.h * P); }
    if (m.def.outdoor) {
      g.font = `700 ${P * 3.2}px ${TX.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const b of SW.BUILDINGS) { const pl = b.map ? SW.PLACES[b.map] : null; g.fillStyle = '#fff'; g.fillText(pl ? pl.icon : b.id === 'shop' ? '🏪' : '⛩️', (b.x + b.w / 2) * P, (b.y + b.h / 2) * P); }
      g.fillText('🏮', 92 * P, 64 * P); g.fillText('🏀', 46 * P, 18 * P);
    }
    return (mmCache[key] = { c, P });
  }
  R3.mapCanvas = (mapId) => mmBase(SW.W.get(mapId));
  R3.drawMinimap = function () {
    const el = SW.$('minimap'); if (!el || el.hidden) return;
    const S = SW.S, p = S.p, m = SW.W.get(p.map), base = mmBase(m);
    const g = el.getContext('2d'), W = el.width, H = el.height;
    g.save(); g.clearRect(0, 0, W, H);
    g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, 7); g.clip();
    g.fillStyle = '#1f2d36'; g.fillRect(0, 0, W, H);
    const scale = m.def.outdoor ? (W / 64) / base.P : (W / Math.max(m.w, m.h) * 0.92) / base.P;
    g.translate(W / 2, H / 2); g.scale(scale, scale);
    if (m.def.outdoor) g.translate(-p.x * base.P, -p.y * base.P); else g.translate(-m.w / 2 * base.P, -m.h / 2 * base.P);
    g.drawImage(base.c, 0, 0);
    for (const id of SW.W.npcsHere()) { if (!SW.CH[id].core && !SW.CH[id].date) continue; const n = S.n[id]; g.fillStyle = SW.CH[id].color; g.beginPath(); g.arc(n.x * base.P, n.y * base.P, base.P * (m.def.outdoor ? 1.6 : 0.45), 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = base.P * 0.2; g.stroke(); }
    g.save(); g.translate(p.x * base.P, p.y * base.P); g.rotate(-p.yaw);
    g.fillStyle = '#f2b33d'; g.beginPath(); const a = base.P * (m.def.outdoor ? 2.4 : 0.7); g.moveTo(0, -a); g.lineTo(a * 0.7, a * 0.8); g.lineTo(0, a * 0.4); g.lineTo(-a * 0.7, a * 0.8); g.closePath(); g.fill(); g.strokeStyle = '#1f2d36'; g.lineWidth = base.P * 0.25; g.stroke();
    g.restore();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.font = `700 ${W * 0.11}px ${TX.FONT}`; g.textAlign = 'center'; g.fillText('N', W / 2, W * 0.13);
  };
})(window.SW);
