'use strict';
(function (SW) {
  const U = SW.U, UI = SW.UI;
  const MG = SW.MG = {};
  const $ = (id) => document.getElementById(id);
  let keyHandler = null;
  MG.key = (e) => { if (keyHandler) { keyHandler(e); return true; } return false; };
  function open(html) { $('mini-body').innerHTML = html; $('mini').hidden = false; $('mini-body').scrollTop = 0; }
  function close() { $('mini').hidden = true; $('mini-body').innerHTML = ''; keyHandler = null; }
  MG.active = () => !$('mini').hidden;

  // ---------- Firmware debug puzzle ----------
  MG.debug = function (pid, opt) {
    opt = opt || {};
    const P = SW.PUZZLES[pid];
    const st = SW.S;
    return new Promise((resolve) => {
      let step = 0, mistakes = 0, helped = false;
      const partner = opt.partner;
      const steps = [
        { key: 'logs', prompt: '① 找出「第一個」不正常的 log 行。', items: P.logs, ans: P.badLog },
        { key: 'code', prompt: '② 對照程式碼，哪一行最可疑？', items: P.code, ans: P.badCode },
        { key: 'fix', prompt: '③ 選擇修正方式。', items: P.fixes.map((f) => f.t), ans: P.fixes.findIndex((f) => f.ok) },
      ];
      const gone = [new Set(), new Set(), new Set()];
      const wrongPicked = [new Set(), new Set(), new Set()];
      let note = '';
      function render() {
        const s = steps[step];
        MG._cur = { pid, step };
        const isFix = s.key === 'fix';
        const list = s.items.map((t, i) => {
          const cls = gone[step].has(i) ? 'gone' : wrongPicked[step].has(i) ? 'bad' : '';
          return `<button data-i="${i}" class="${cls}" ${gone[step].has(i) || wrongPicked[step].has(i) ? 'disabled' : ''}><span class="ln">${isFix ? String.fromCharCode(65 + i) : i + 1}</span>${U.esc(t)}</button>`;
        }).join('');
        const help = partner && !helped ? `<button class="btn alt" id="mg-help">${partner === 'mira' ? '🔎 請米拉幫忙重現' : '💡 問阿修'}</button>` : '';
        open(`<div class="mg-head"><h3>🐞 ${U.esc(opt.title || P.title)}</h3><span class="muted">失誤 ${mistakes}／5</span></div>
          <div class="muted" style="line-height:1.5">${U.esc(P.desc)}</div>
          <div class="mg-step">${s.prompt}${note ? `<br><b>${U.esc(note)}</b>` : ''}</div>
          <div class="code ${isFix ? 'fixes' : ''}">${list}</div>
          <div class="mg-foot">${help}<button class="btn alt" id="mg-quit">先放棄</button></div>`);
        $('mini-body').querySelectorAll('.code button').forEach((b) => { b.onclick = () => pick(+b.dataset.i); });
        if ($('mg-help')) $('mg-help').onclick = helpMe;
        $('mg-quit').onclick = () => { close(); resolve({ solved: false, mistakes }); };
      }
      function pick(i) {
        const s = steps[step];
        if (i === s.ans) {
          note = '';
          step++;
          if (step >= steps.length) {
            open(`<div class="mg-head"><h3>✅ 修好了！</h3><span class="muted">失誤 ${mistakes} 次</span></div><div class="mg-step">${U.esc(P.explain)}</div><div class="mg-foot"><span></span><button class="btn" id="mg-ok">提交 Patch</button></div>`);
            $('mg-ok').onclick = () => { close(); resolve({ solved: true, mistakes }); };
            keyHandler = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'e') { close(); resolve({ solved: true, mistakes }); } };
            return;
          }
          render(); return;
        }
        mistakes++; wrongPicked[step].add(i);
        note = U.pick(['不是這行。再看看時間戳記。', '這行看起來正常。', '方向錯了，想想什麼時候開始變奇怪的。', '嗯……不像根因。']);
        if (mistakes >= 5) {
          open(`<div class="mg-head"><h3>❌ 今天先到這裡</h3></div><div class="mg-step">腦袋過熱了。換個時間、或找個夥伴一起看吧。</div><div class="mg-foot"><span></span><button class="btn" id="mg-ok">好</button></div>`);
          $('mg-ok').onclick = () => { close(); resolve({ solved: false, mistakes }); };
          return;
        }
        render();
      }
      function helpMe() {
        helped = true;
        const s = steps[step];
        const wrong = s.items.map((_, i) => i).filter((i) => i !== s.ans && !gone[step].has(i) && !wrongPicked[step].has(i));
        if (partner === 'mira') {
          U.shuffle(wrong).slice(0, Math.max(1, wrong.length - 1)).forEach((i) => gone[step].add(i));
          note = '米拉：「我剛剛重現了一次。劃掉的那些都正常。」';
          SW.Sys.ch('mira', { comfort: 1 }, true);
        } else {
          const good = st.rel.hsiu.friend >= 50 && st.rel.hsiu.tension < 35;
          note = good ? `阿修：「看第 ${s.key === 'fix' ? String.fromCharCode(65 + s.ans) : s.ans + 1} 個。我很確定。」` : `阿修：「一定是第 ${s.key === 'fix' ? String.fromCharCode(65 + wrong[0]) : wrong[0] + 1} 個。相信我，絕對是 cache 的問題。」`;
        }
        render();
      }
      keyHandler = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) pick(n - 1); };
      render();
    });
  };

  // ---------- Rhythm (guitar) ----------
  MG.rhythm = function (opt) {
    opt = opt || {};
    const skill = SW.S.p.skill.guitar;
    return new Promise((resolve) => {
      const len = opt.len || 20;
      const colors = ['#e46b7b', '#f2b33d', '#2f8f83'];
      open(`<div class="mg-head"><h3>🎸 ${U.esc(opt.title || '練吉他')}</h3><span class="muted" id="rh-stat">準備…</span></div>
        <div class="rhythm-wrap"><canvas id="rh-canvas"></canvas></div>
        <div class="lanes">${[0, 1, 2].map((i) => `<button data-l="${i}" style="background:${colors[i]}">${['A', 'S', 'D'][i]}</button>`).join('')}</div>
        <div class="mg-foot"><span class="muted">音符碰到底線時點對應按鈕（鍵盤 A／S／D 或 J／K／L）</span><button class="btn alt" id="rh-skip">跳過（自動演奏）</button></div>`);
      const cv = $('rh-canvas'), g = cv.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = cv.clientWidth, Hh = cv.clientHeight; cv.width = W * dpr; cv.height = Hh * dpr; g.scale(dpr, dpr);
      const bpm = opt.slow ? 84 : 100 + Math.min(skill, 6) * 4;
      const beat = 60 / bpm;
      const notes = [];
      let t = 1.6;
      while (t < len) {
        const lane = U.ri(0, 2); notes.push({ t, lane, hit: null });
        if (Math.random() < 0.18 + skill * 0.02) { notes.push({ t, lane: (lane + U.ri(1, 2)) % 3, hit: null }); }
        t += beat * (Math.random() < 0.3 ? 0.5 : 1);
      }
      const win = 0.12 + Math.min(skill, 8) * 0.008, perfectW = win * 0.45;
      const speed = Hh * 0.55; // px per second
      const lineY = Hh - 40;
      let start = null, raf = 0, combo = 0, best = 0, done = false, flash = [0, 0, 0], msg = '';
      function hit(lane) {
        if (start === null || done) return;
        const now = (performance.now() - start) / 1000;
        let bestN = null, bd = 1e9;
        for (const n of notes) { if (n.hit !== null || n.lane !== lane) continue; const d = Math.abs(n.t - now); if (d < bd) { bd = d; bestN = n; } }
        flash[lane] = 1;
        if (bestN && bd <= win) { bestN.hit = bd <= perfectW ? 2 : 1; combo++; best = Math.max(best, combo); msg = bd <= perfectW ? 'Perfect!' : 'Good'; }
        else { combo = 0; msg = 'Miss'; }
      }
      function frame() {
        if (done || !$('rh-stat')) return;
        const now = (performance.now() - start) / 1000;
        g.clearRect(0, 0, W, Hh);
        const lw = W / 3;
        for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'; g.fillRect(i * lw, 0, lw, Hh); if (flash[i] > 0) { g.fillStyle = `rgba(255,255,255,${flash[i] * 0.25})`; g.fillRect(i * lw, 0, lw, Hh); flash[i] -= 0.08; } }
        g.fillStyle = '#f4f7f3'; g.fillRect(0, lineY - 2, W, 4);
        for (const n of notes) {
          if (n.hit === null && now - n.t > win) { n.hit = 0; combo = 0; msg = 'Miss'; }
          if (n.hit) continue;
          const y = lineY - (n.t - now) * speed; if (y < -20 || y > Hh + 20) continue;
          g.fillStyle = colors[n.lane]; g.beginPath(); g.arc(n.lane * lw + lw / 2, y, 16, 0, 7); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
        }
        g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; g.fillText(msg, W / 2, 40);
        if (combo > 2) { g.font = '600 15px sans-serif'; g.fillText(`${combo} combo`, W / 2, 64); }
        const hitN = notes.filter((n) => n.hit).length;
        $('rh-stat').textContent = `命中 ${hitN}/${notes.length}`;
        if (now > len + 0.8) return finish();
        raf = requestAnimationFrame(frame);
      }
      function finish(auto) {
        if (done) return; done = true; cancelAnimationFrame(raf);
        let score;
        if (auto) score = U.clamp(38 + skill * 6 + U.ri(-6, 6), 20, 92);
        else { const tot = notes.length; const pts = notes.reduce((a, n) => a + (n.hit === 2 ? 1 : n.hit === 1 ? 0.65 : 0), 0); score = Math.round(pts / tot * 100); }
        const grade = score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 50 ? 'B' : 'C';
        keyHandler = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'e') { close(); resolve({ score, grade }); } };
        open(`<div class="mg-head"><h3>🎸 ${grade}｜${score} 分</h3><span class="muted">最高連擊 ${best}</span></div><div class="mg-step">${score >= 85 ? '整段一氣呵成，手指自己在跳舞。' : score >= 70 ? '很穩！有幾個地方很有感覺。' : score >= 50 ? '有幾段卡卡的，但聽得出旋律。' : '……嗯，至少你很有勇氣。'}</div><div class="mg-foot"><span></span><button class="btn" id="rh-ok">完成</button></div>`);
        $('rh-ok').onclick = () => { close(); resolve({ score, grade }); };
      }
      $('mini-body').querySelectorAll('.lanes button').forEach((b) => {
        const l = +b.dataset.l;
        b.addEventListener('touchstart', (e) => { e.preventDefault(); hit(l); }, { passive: false });
        b.addEventListener('mousedown', (e) => { e.preventDefault(); hit(l); });
      });
      $('rh-skip').onclick = () => finish(true);
      const map = { a: 0, s: 1, d: 2, j: 0, k: 1, l: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2, 1: 0, 2: 1, 3: 2 };
      keyHandler = (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (map[k] !== undefined) { e.preventDefault(); hit(map[k]); } };
      setTimeout(() => { if (done) return; start = performance.now(); raf = requestAnimationFrame(frame); }, 400);
    });
  };

  // ---------- Timing bar (cooking, gym, latte art, moving furniture) ----------
  MG.timing = function (opt) {
    opt = opt || {};
    return new Promise((resolve) => {
      const rounds = opt.rounds || 3, labels = opt.labels || [];
      let r = 0, pos = 0, dir = 1, raf = 0, last = null, scores = [], zone = null, lock = false;
      const zw = U.clamp(opt.zone || 0.16, 0.08, 0.32);
      function newZone() { const c = 0.2 + Math.random() * 0.6; zone = { a: c - zw / 2, b: c + zw / 2, pa: c - zw / 6, pb: c + zw / 6 }; }
      function render() {
        open(`<div class="mg-head"><h3>⏱️ ${U.esc(opt.title || '看準時機')}</h3><span class="muted">${r + 1}／${rounds}</span></div>
          <div class="mg-step">${U.esc(labels[r] || '')}・指針停在<b>綠色區域</b>內（黃色更好）</div>
          <div class="timing" id="tm-bar"><div class="zone" style="left:${zone.a * 100}%;width:${(zone.b - zone.a) * 100}%"></div><div class="zone perfect" style="left:${zone.pa * 100}%;width:${(zone.pb - zone.pa) * 100}%"></div><div class="needle" id="tm-n"></div></div>
          <button class="big-btn" id="tm-go">${U.esc(opt.verb || '就是現在！')}</button>
          <div class="mg-foot"><span class="muted" id="tm-res">${scores.length ? '上一回：' + ['失手', '不錯', '完美'][scores[scores.length - 1] === 100 ? 2 : scores[scores.length - 1] === 70 ? 1 : 0] : '按按鈕、空白鍵或 E'}</span><span></span></div>`);
        const go = $('tm-go');
        go.addEventListener('touchstart', (e) => { e.preventDefault(); stop(); }, { passive: false });
        go.addEventListener('mousedown', (e) => { e.preventDefault(); stop(); });
      }
      function loop(ts) {
        if (last === null) last = ts;
        const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
        const sp = 0.85 + r * 0.22;
        pos += dir * sp * dt; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
        const n = $('tm-n'); if (n) n.style.left = (pos * 100) + '%';
        raf = requestAnimationFrame(loop);
      }
      function stop() {
        if (lock) return; lock = true;
        const s = pos >= zone.pa && pos <= zone.pb ? 100 : pos >= zone.a && pos <= zone.b ? 70 : 20;
        scores.push(s);
        const bar = $('tm-bar'); if (bar) bar.style.boxShadow = `inset 0 0 0 3px ${s === 100 ? '#f2b33d' : s === 70 ? '#2f8f83' : '#d4553f'}`;
        setTimeout(() => {
          r++; lock = false;
          if (r >= rounds) { cancelAnimationFrame(raf); const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length); close(); resolve({ score }); return; }
          newZone(); render();
        }, 420);
      }
      keyHandler = (e) => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') { e.preventDefault(); stop(); } };
      newZone(); render(); raf = requestAnimationFrame(loop);
    });
  };
})(window.SW);
