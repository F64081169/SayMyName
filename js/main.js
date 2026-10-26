'use strict';
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, W = SW.W, Sys = SW.Sys;
  const $ = (id) => document.getElementById(id);
  const Main = SW.Main = {};
  SW.timeScale = 0.85;
  try { SW.fastText = localStorage.getItem('sw-fast') === '1'; } catch (e) { SW.fastText = false; }

  const HAIR = ['#1d1c24', '#4a2f22', '#7a3b22', '#c9a063', '#c94f86', '#3f5f8f', '#e8e3d8'];
  const SKIN = ['#f6d6bd', '#efc6a0', '#e2b48c', '#c99266', '#9a6a46'];
  const OUTFIT = ['#f2b33d', '#2f8f83', '#e46b7b', '#4a6fa5', '#3d3d48', '#f4f7f3', '#8a6bb8'];
  const STYLES = [['bob', '鮑伯頭'], ['long', '長髮'], ['short', '短髮'], ['pony', '馬尾'], ['spiky', '刺蝟頭'], ['neat', '旁分']];

  function lookEditor(look, onChange) {
    const sw = (arr, key) => `<div class="swatches">${arr.map((c) => `<button data-k="${key}" data-v="${c}" class="${look[key] === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;
    const html = `<div style="display:flex;justify-content:center"><canvas id="avatar-prev" width="220" height="260" style="width:180px;height:212px"></canvas></div>
      <div><label class="lab">髮型</label><div class="chips">${STYLES.map(([v, l]) => `<button data-k="style" data-v="${v}" class="${look.style === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div><label class="lab">髮色</label>${sw(HAIR, 'hair')}</div>
      <div><label class="lab">膚色</label>${sw(SKIN, 'skin')}</div>
      <div><label class="lab">衣服</label>${sw(OUTFIT, 'outfit')}</div>
      <div><label class="lab">配件</label><div class="chips">${[['none', '無'], ['glasses', '眼鏡'], ['cap', '帽子'], ['cardigan', '針織外套']].map(([v, l]) => `<button data-k="acc" data-v="${v}" class="${look.acc === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
    return {
      html,
      bind(root) {
        const draw = () => { const c = root.querySelector('#avatar-prev'); try { SW.R3.preview(c, look); } catch (e) { const g = c.getContext('2d'); g.clearRect(0, 0, 192, 192); W.drawChar(g, 96, 112, 150, look, {}); } };
        root.querySelectorAll('[data-k]').forEach((b) => {
          b.onclick = () => { look[b.dataset.k] = b.dataset.v; root.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach((x) => x.classList.toggle('on', x === b)); draw(); if (onChange) onChange(); };
        });
        draw();
      },
    };
  }

  Main.title = function () {
    const save = SW.loadSave();
    const el = $('title');
    el.hidden = false;
    el.innerHTML = `<div class="t-wrap">
      <h1 class="t-logo">Shannon's <span>World</span></h1>
      <div class="t-sub">新竹人生模擬器・第一季《我們還有地方可以坐嗎？》</div>
      <p class="t-tag">不要只是生活在世界裡。<br>讓整個世界記得你曾經怎麼生活。</p>
      <div class="t-btns">
        ${save ? `<button class="btn primary" id="t-cont">繼續：${U.esc(save.p.name)}・${T.DAYS[(Math.floor(save.t / 1440)) % 7]} ${U.fmt(save.t % 1440)}</button>` : ''}
        <button class="btn ${save ? 'alt' : 'primary'}" id="t-new">${save ? '開始新的人生（會覆蓋存檔）' : '開始新的人生'}</button>
        ${save ? '' : '<button class="btn alt" id="t-quick">用預設角色直接開始（Shannon・獨居）</button>'}
      </div>
      <p class="t-note">支援電腦與手機瀏覽器。電腦用 WASD／方向鍵移動、E 互動、P 打開手機；手機拖曳畫面移動、點擊互動。遊戲會自動存在這個瀏覽器裡。<br>所有公司、人物與事件皆為虛構。</p>
    </div>`;
    if (save) $('t-cont').onclick = () => Main.start(save);
    $('t-new').onclick = () => Main.create();
    if ($('t-quick')) $('t-quick').onclick = () => Main.start(SW.newState({ name: 'Shannon', pron: '她', bg: 'engineer', housing: 'solo', look: { hair: '#1d1c24', style: 'long', skin: '#f6d6bd', outfit: '#f2b33d', acc: 'none' } }), true);
  };

  Main.create = function () {
    const look = { hair: '#1d1c24', style: 'long', skin: '#f6d6bd', outfit: '#f2b33d', acc: 'none' };
    const opt = { name: 'Shannon', pron: '她', bg: 'engineer', housing: 'solo', look };
    const el = $('title');
    const ed = lookEditor(look);
    const bgs = Object.entries(SW.BACKGROUNDS);
    el.innerHTML = `<div class="t-wrap"><h2 class="t-logo" style="font-size:34px;margin-top:2vh">你是誰？</h2>
      <div class="form">
        <div><label class="lab" for="f-name">名字</label><input type="text" id="f-name" maxlength="10" value="Shannon" autocomplete="off"></div>
        <div><label class="lab">別人提到你時用</label><div class="chips" id="f-pron">${['她', '他', 'TA'].map((p) => `<button data-v="${p}" class="${p === opt.pron ? 'on' : ''}">${p}</button>`).join('')}</div></div>
        <div id="f-look">${ed.html}</div>
        <div><label class="lab">背景</label><p class="muted" style="margin:0 0 6px">25 歲，SSD 韌體工程師，進公司一年。你比較像……</p><div class="opt-cards" id="f-bg">${bgs.map(([k, b]) => `<button data-v="${k}" class="${k === opt.bg ? 'on' : ''}"><b>${b.name}</b><span>${b.desc}</span></button>`).join('')}</div></div>
        <div><label class="lab">住哪裡？</label><div class="opt-cards" id="f-house">
          <button data-v="solo" class="on"><b>獨居套房</b><span>私人空間多。安靜，有時候太安靜。</span></button>
          <button data-v="shared"><b>和米拉合租</b><span>每天都有室友事件。冰箱會分區，會吵架，也會一起看劇。</span></button>
        </div></div>
        <button class="btn" id="f-go" style="font-size:17px;min-height:54px;text-align:center">星期一 08:45，起床</button>
        <button class="ghost" id="f-back">返回</button>
      </div></div>`;
    ed.bind($('f-look'));
    const grp = (id, key) => $(id).querySelectorAll('button').forEach((b) => { b.onclick = () => { opt[key] = b.dataset.v; $(id).querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }; });
    grp('f-pron', 'pron'); grp('f-bg', 'bg'); grp('f-house', 'housing');
    $('f-back').onclick = () => Main.title();
    $('f-go').onclick = () => {
      opt.name = ($('f-name').value || 'Shannon').trim().slice(0, 10) || 'Shannon';
      const S = SW.newState(opt);
      Main.start(S, true);
    };
  };

  Main.editLook = async function () {
    const look = SW.S.p.look;
    const ed = lookEditor(look);
    const p = UI.card({ kicker: '衣櫃', title: '換個造型', html: `<div class="form" style="padding:0">${ed.html}</div>`, buttons: [{ t: '完成', v: 1 }] });
    ed.bind($('card-body'));
    await p;
    SW.S.f.newLook = T.day();
  };

  Main.start = function (S, fresh) {
    SW.S = S;
    W.reset();
    $('title').hidden = true; $('hud').hidden = false;
    if (fresh) {
      const [x, y] = W.spot('home', 'center');
      S.p.map = 'home'; S.p.x = x + 0.5; S.p.y = y + 0.5; S.p.dir = 'down'; S.p.yaw = Math.PI;
    }
    W.updateNPCs(0, true);
    if (S.p.yaw === undefined) S.p.yaw = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[S.p.dir] || 0;
    SW.R3.resize();
    SW.R3.enter(S.p.map);
    $('minimap').hidden = false; $('crosshair').hidden = false;
    SW.save(true);
    if (!Main.loopOn) { Main.loopOn = true; requestAnimationFrame(loop); }
    Main.booting = true;
    setTimeout(async () => { await SW.Dir.episodeCard(); Main.booting = false; SW.Dir.tick(); if (fresh) setTimeout(() => SW.UI.toast(SW.R3.mobile ? '👆 左半邊拖曳移動・右半邊拖曳轉頭・點人或東西互動' : '⌨️ WASD 移動・滑鼠轉頭（點畫面鎖定）・E 互動・P 手機・M 地圖'), 600); }, 60);
  };

  let last = 0, dirT = 0, exT = 0;
  function loop(ts) {
    const dt = Math.min(0.1, last ? (ts - last) / 1000 : 0.016); last = ts;
    const S = SW.S;
    if (S && $('title').hidden) {
      const busy = UI.busy();
      if (!busy && !document.hidden) {
        const gm = dt * SW.timeScale; // 1 real second = 1 game minute
        const before = T.day();
        S.t += gm;
        if (T.day() !== before) Sys.dayStart();
        Sys.tick(gm, false);
        if (!W.followPath(dt)) {
          const v = SW.IN.moveVec(), yaw = S.p.yaw || 0;
          if (v.x || v.y) { W.autoPath = null; W.marker = null; }
          const f = -v.y, s = v.x;
          W.movePlayer(-Math.sin(yaw) * f + Math.cos(yaw) * s, -Math.cos(yaw) * f - Math.sin(yaw) * s, dt);
        }
        S.p.yaw = (S.p.yaw || 0) + SW.IN.turn() * dt * 2.2;
        dirT -= dt; if (dirT <= 0 && !Main.booting) { dirT = 0.5; SW.Dir.tick(); }
        exT -= dt; if (exT <= 0) { exT = 2; Sys.checkExhaust(); }
      } else {
        S.p.moving = false;
        W.updateNPCs(0, false);
      }
      W.target = busy ? null : W.nearest();
      SW.R3.render(dt);
      UI.hud(dt);
    } else if (!$('title').hidden && !document.hidden) {
      try { SW.R3.backdrop(dt); } catch (e) { /* title still works without the 3D backdrop */ }
    }
    requestAnimationFrame(loop);
  }

  // Debug helpers for playtesting from the browser console (SW.debug.skip(3,'19:00') etc.)
  SW.debug = {
    skip: async (day, hm) => { const target = T.at(day, hm); if (target > SW.S.t) await Sys.advance(target - SW.S.t, false); W.updateNPCs(0, true); SW.Dir.tick(); },
    go: (map) => W.travelTo(map),
    money: (n) => Sys.money(n),
    state: () => SW.S,
    where: () => Object.fromEntries(Object.keys(SW.S.n).map((id) => [id, `${SW.S.n[id].map} ${SW.S.n[id].act}`])),
  };

  window.addEventListener('resize', () => { SW.R3.resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) SW.save(); });
  window.addEventListener('pagehide', () => SW.save());

  window.addEventListener('DOMContentLoaded', () => {
    SW.R3.init($('game'));
    SW.IN.init();
    Main.title();
    if (!Main.loopOn) { Main.loopOn = true; requestAnimationFrame(loop); }
  });
})(window.SW);
