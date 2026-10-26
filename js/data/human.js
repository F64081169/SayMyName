'use strict';
// Human nature: lies and the people who saw the truth, temptations with a price, what people say after the
// second drink, and the person your choices add up to.
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys, Dir = SW.Dir, H = SW.H, Sched = SW.Sched;
  const S = () => SW.S;
  const nm = (id) => SW.name(id);
  const say = (w, t, e) => UI.say(w, t, e);
  const narr = (t) => UI.say('narr', t);
  const inner = (t) => UI.say('narr', `（${t}）`);
  const choose = (o, p) => UI.choose(o, p);
  const K = (f) => Sys.knows('player', f);
  const here = (id) => SW.W.present(id);
  const msg = (th, from, text, reply, exp) => Sys.msg(th, from, text, { reply, exp });
  const later = (m, th, from, text, reply, expM) => Sys.msgLater(m, th, from, text, reply, expM);
  const add = (st) => Dir.add(st);
  const R = SW.R;
  const at = T.at;
  const stat = (k, d) => { const s = S().stats; s[k] = (s[k] || 0) + (d === undefined ? 1 : d); };
  const Human = SW.Human = {};

  // =====================================================================
  // LIES — caught
  // =====================================================================
  const WHY = {
    mira: '我不在意你那天去哪。我在意的是，你看著我的眼睛說了謊。',
    hsiu: '……我以為我們至少是會跟對方說實話的那種關係。',
    pei: '你可以不告訴我。可是你不用騙我。',
    anson: '我不是要審判你。我只是想知道，你為什麼覺得需要說謊。',
    lele: '你騙我！！……我最討厭被騙了。你明明知道的。',
    boss: '我不在乎你去哪。我在乎的是，我以後還能不能相信你的回報。',
  };
  const FORGIVE = {
    mira: '……謝謝你沒有繼續編。', hsiu: '……嗯。這樣就好。', pei: '嗯。那我們重新開始。',
    anson: '說出來，比較輕鬆，對吧？', lele: '……好啦。下次直接跟我說。我會生氣，但我會原諒你。', boss: '……下不為例。',
  };
  Human.caughtLie = (id) => (S().lies || []).find((l) => l.exposed && l.exposed.to === id && !l.resolved);
  Human.confront = async function (id, l) {
    if (!l || !l.exposed) return;
    const st = S(), by = l.exposed.by, r = st.rel[id];
    await say(id, l.caught ? SW.tx(l.caught).replace('{W}', nm(by)) : `${nm(by)}跟我說了一些事。`);
    await say(id, WHY[id] || '你為什麼要騙我？');
    const sg = id === 'boss' ? null : SW.CORE.filter((x) => x !== id && x !== by && x !== l.victim).sort((a, b) => Sys.pair(id, b).tension - Sys.pair(id, a).tension)[0];
    const c = await choose([
      { t: '「對不起。我說謊了。」', v: 'confess' },
      { t: '「你誤會了，事情不是那樣……」', sub: '再圓一個謊', v: 'double' },
      sg ? { t: `「是${nm(sg)}叫我這樣說的。」`, sub: '把責任推出去', v: 'blame' } : null,
      { t: '（什麼都不說）', v: 'silent' },
    ].filter(Boolean));
    if (c === 'confess') {
      l.resolved = 'confess'; stat('confessed');
      if (r) Sys.ch(id, { trust: Math.round(l.weight * 0.5), tension: -Math.round(l.weight * 0.6) }); else st.work.bossTrust += 3;
      await say(id, FORGIVE[id] || '……嗯。');
      Sys.mem(id, '謊被拆穿之後，你沒有再狡辯', 1, 'confess_' + l.id, true);
    } else if (c === 'double') {
      const odds = 0.2 + (r ? r.comfort : 40) * 0.005 - l.doubled * 0.15;
      if (Math.random() < odds) {
        l.exposed = null; l.doubled++; stat('doubled');
        if (r) Sys.ch(id, { tension: -4 }, true);
        await say(id, '……好吧。我相信你。');
        await inner(`${nm(id)}選擇相信你。你以為會鬆一口氣，結果沒有。`);
      } else {
        l.resolved = 'caught2';
        if (r) Sys.ch(id, { trust: -l.weight, tension: l.weight }); else st.work.bossTrust -= 6;
        await say(id, '……你還要繼續嗎？');
        await narr(`${nm(id)}看著你，像在看一個陌生人。`);
        Sys.mem(id, '謊被拆穿之後，你還在編', -1, 'caught2_' + l.id, true);
      }
    } else if (c === 'blame') {
      l.resolved = 'blamed'; stat('blamed');
      Sys.ch(id, { tension: -5 }, true);
      Sys.pch(id, sg, { tension: 14, trust: -10 });
      await say(id, `……${nm(sg)}？`);
      await inner(`你看著${nm(id)}的表情從生氣變成困惑。原來把錯推出去，是這麼容易的事。`);
      Sys.lie({ id: l.id + '_blame', to: id, text: `你說是${nm(sg)}要你那樣說的`, w: [sg], victim: sg, weight: 16, chance: 0.3, caught: `我去問了${nm(sg)}。${SW.CH[sg].name}根本不知道這件事。` });
    } else {
      l.resolved = 'silent';
      if (r) Sys.ch(id, { tension: 4 }, true);
      await narr(`${nm(id)}等了很久。你什麼都沒說。`);
    }
  };
  for (const id of SW.CORE.concat(['boss'])) {
    add({ id: 'lieC_' + id, kind: 'approach', npc: id, prio: 72, once: false, cooldown: 20, where: id === 'boss' ? 'office' : undefined, cond: () => !!Human.caughtLie(id), run: async () => Human.confront(id, Human.caughtLie(id)) });
  }

  // =====================================================================
  // TEMPTATION 1 — whose discovery was it?
  // =====================================================================
  add({ id: 'd3_credit', kind: 'approach', npc: 'boss', day: 3, where: 'office', from: '09:30', to: '17:30', prio: 55, cond: (st) => { const p = Sys.prom('miraTest'); return !!p && p.status === 'kept'; }, run: async (st) => {
    await say('boss', '週一米拉那輪 regression，抓到一個很嚴重的掉電問題。客戶說這個發現幫他們省了一整批退貨。');
    await say('boss', '報告上是你們兩個的名字。我想知道——是誰先看到的？');
    await say('boss', '這件事，會放進 Feature Owner 的評估。');
    await inner('其實是米拉先看到的。她那時候盯著 log 說了一句「欸，這裡怪怪的」。');
    const c = await choose([{ t: '「是米拉。我只是幫忙跑測試。」', v: 'honest' }, { t: '「我們一起看到的。」', v: 'shared' }, { t: '「……是我。」', v: 'stole' }]);
    st.f.credit = c;
    if (c === 'honest') {
      st.work.bossTrust += 1;
      await say('boss', '……嗯。誠實。我記下來了。');
      Sys.ch('mira', { trust: 6, friend: 3 }, true);
      Sys.mem('mira', '你把發現的功勞還給了她', 1, 'creditHonest', true);
      later(200, 'mira', 'mira', '課長說你跟他講，那個問題是我先看到的。……謝謝。我以為會被吃掉。');
    } else if (c === 'shared') {
      st.work.perf += 1; st.work.bossTrust += 1;
      await say('boss', '好。團隊合作。');
      await inner('不算說謊。也不算說實話。');
    } else {
      st.work.perf += 3; st.work.bossTrust += 4; stat('betrayals');
      Sys.lie({ id: 'credit', to: 'boss', text: '你說那個掉電問題是你先發現的', w: ['mira'], weight: 10, chance: 0.04, caught: '米拉的 log 時間戳比你早四十分鐘。你要解釋一下嗎？' });
      await say('boss', '很好。這種敏銳度，就是我要的。');
      await inner('課長點點頭，在筆記本上寫下你的名字。走廊另一頭，米拉正在幫隔壁組修印表機。');
    }
  } });
  add({ id: 'd4_credit_reveal', kind: 'approach', npc: 'mira', day: [4, 5, 6, 7, 8, 9], from: '09:30', to: '22:00', prio: 66, cond: (st) => st.f.credit === 'stole' && !st.f.creditRevealed, run: async (st) => {
    await say('mira', '今天早上週會，課長說那個掉電問題是你抓到的。');
    await say('mira', '全組都在拍手。我也拍了。');
    await say('mira', '……我只想問你一句。為什麼？');
    const c = await choose([{ t: '「對不起。我現在就去跟課長說清楚。」', v: 'returned' }, { t: '「課長搞錯了。我有跟他說是你。」', sub: '（說謊）', v: 'lied' }, { t: '「職場就是這樣。換作是你，也會這樣做。」', v: 'owned' }]);
    st.f.creditRevealed = c;
    const cl = (st.lies || []).find((l) => l.id === 'credit');
    if (c === 'returned') {
      if (cl) cl.resolved = 'confess';
      await say('mira', '……你真的會去？');
      await narr('你敲了課長辦公室的門。課長聽完，沉默了一下。');
      await say('boss', '你知道這樣說，對你不利吧？');
      await say('boss', '……好。我會更正。謝謝你來說。');
      st.work.perf -= 2; st.work.bossTrust -= 1; stat('confessed');
      Sys.ch('mira', { trust: -3, tension: -6 });
      Sys.mem('mira', '你把搶走的功勞還了回去', 1, 'creditReturned');
    } else if (c === 'lied') {
      Sys.lie({ id: 'creditMira', to: 'mira', text: '你說是課長搞錯了功勞', w: ['boss'], weight: 16, chance: 0.3, caught: '我去問了課長。他說，是你親口說的。' });
      await say('mira', '……是喔。那我去問課長。');
      await inner('她會去問的。你知道她會去問。');
    } else {
      Sys.ch('mira', { trust: -16, tension: 16, friend: -6 });
      Sys.mem('mira', '你搶了她的功勞，還說職場就是這樣', -1, 'creditStolen');
      await say('mira', '……不會。我不會。');
      await narr('她轉身回到座位。那天下午，她的螢幕上開著一個澳洲打工度假的網站，一直沒有關。');
    }
  } });

  // =====================================================================
  // TEMPTATION 2 — the boss asks what you really think of 阿修
  // =====================================================================
  add({ id: 'd5_eval', kind: 'approach', npc: 'boss', day: 5, where: 'office', from: '09:30', to: '16:30', prio: 56, cond: (st) => !!st.f.featureRace, run: async (st) => {
    await say('boss', '下週一要公布 Feature Owner。我想私下聽聽你的看法。');
    await say('boss', '你覺得阿修怎麼樣？說實話，這裡沒有別人。');
    const c = await choose([
      { t: '「他很強。如果是他，我心服口服。」', v: 'praise' },
      { t: '「技術很好，但有時候太固執。」', v: 'honest' },
      { t: '「我不想評論同事。」', v: 'decline' },
      { t: '「他最近……好像心思不在工作上。」', v: 'undermine' },
      { t: '「他最近下班都在偷偷練歌，好像要追米拉。」', sub: '說出他的秘密', v: 'expose', if: K('hsiuSong') },
    ]);
    st.f.evalHsiu = c;
    const W = st.work;
    if (c === 'praise') { W.hsiuScore += 8; W.bossTrust += 1; await say('boss', '……你很有風度。'); }
    else if (c === 'honest') { W.hsiuScore -= 2; W.bossTrust += 2; await say('boss', '嗯。中肯。'); }
    else if (c === 'decline') { W.bossTrust -= 1; await say('boss', '……好。我尊重。'); }
    else if (c === 'undermine') { W.hsiuScore -= 8; stat('betrayals'); await say('boss', '喔？……我會留意。'); }
    else {
      W.hsiuScore -= 12; stat('betrayals');
      Sys.tell('boss', 'hsiuSong'); // recorded as a leak: the boss will say something to him
      await say('boss', '……練歌？上班時間的事我管，下班的事我不管。但我會記得。');
      Sys.at(at(5, '17:10'), 'evalLeak', {});
    }
    // the mirror: he was asked the same question
    await say('boss', '有趣的是，我昨天也問了阿修同樣的問題。');
    const r = st.rel.hsiu;
    const good = r.friend >= 58 || ['praisedPublic', 'congrats', 'coachSong', 'coverRelease'].some((t) => Sys.hasMem('hsiu', t));
    const bad = !good && (r.tension >= 35 || Sys.hasMem('hsiu', 'laughSong'));
    st.f.hsiuSaid = good ? 'praise' : bad ? 'bad' : 'neutral';
    if (good) { await say('boss', '他說：「如果是{N}，我心服口服。」'); W.bossTrust += 3; }
    else if (bad) { await say('boss', '他說你「很聰明，但不太可靠」。'); W.bossTrust -= 2; }
    else await say('boss', '他說你們「還在互相了解」。……很外交的回答。');
    const mean = c === 'undermine' || c === 'expose';
    if (mean && good) { await inner('他在你看不到的地方，替你說了好話。而你剛剛……'); Sys.mood(-10); }
    else if (c === 'praise' && bad) await inner('你替他說了好話。他沒有。你突然不知道，善良是不是一種吃虧。');
    else if (c === 'praise' && good) await inner('原來有些話，不用當面說，對方也聽得到。');
    else if (mean && bad) await inner('你們都在背後說了對方。這樣算扯平嗎？');
  } });
  H.evalLeak = function () {
    const st = S();
    st.f.hsiuKnowsEval = true;
    Sys.ch('hsiu', { trust: -15, tension: 15 }, true);
    Sys.mem('hsiu', '你在課長面前說出他在練歌的事', -1, 'evalLeak', true);
    if (st.rel.hsiu.trust < 45 || Math.random() < 0.5) { st.f.hsiuQuit = true; st.f.hsiuQuitEval = true; }
  };
  add({ id: 'd5_eval_leak', kind: 'approach', npc: 'hsiu', prio: 70, cond: (st) => !!st.f.hsiuKnowsEval && !st.f.evalLeakFaced, run: async (st) => {
    st.f.evalLeakFaced = true;
    await say('hsiu', '課長剛剛把我叫進去。他說：「專心工作，少練點歌。」');
    await say('hsiu', '這件事，公司裡只有你知道。');
    if (st.f.hsiuQuitEval) await say('hsiu', '……今晚那首歌，我不唱了。反正也不重要。');
    const c = await choose([{ t: '「對不起。我不該說的。」', v: 'sorry' }, { t: '「我只是說實話。」', v: 'truth' }, { t: '「不是我說的。」', sub: '（說謊）', v: 'lie' }]);
    if (c === 'sorry') { Sys.ch('hsiu', { tension: -5 }); await say('hsiu', '……說對不起有什麼用。'); await narr('他走開的時候，把筆記本塞進了抽屜最裡面。'); }
    else if (c === 'truth') { Sys.ch('hsiu', { tension: 4 }); await say('hsiu', '實話。……對。你說的都是實話。'); }
    else { Sys.lie({ id: 'evalDeny', to: 'hsiu', text: '你說不是你跟課長說他在練歌', w: ['boss'], weight: 14, chance: 0.12, caught: '我問了課長。他沒有說是誰，但他看了你的位子一眼。' }); await say('hsiu', '……那會是誰？'); await inner('他開始一個一個懷疑身邊的人。'); }
  } });

  // =====================================================================
  // TEMPTATION 3 — Bloom Coffee wants to know what 小沛 can afford
  // =====================================================================
  add({ id: 'd5_bloom_msg', kind: 'phone', day: 5, from: '10:30', cond: (st) => K('lease') && !st.cafe.outcome, run: () => {
    msg('vivian', 'vivian', '您好，我是 Bloom Coffee 展店部的 Vivian。聽說您是「轉角」的常客，想請教一些在地意見。諮詢費 NT$30,000，不會占用您太多時間。明天中午在好日子方便嗎？', 'bloom_ask', at(6, '11:00'));
  } });
  R.bloom_ask = [
    { t: '（把訊息截圖傳給小沛）', fn: (st) => {
      st.f.bloom = 'toldPei'; st.f.landlordSon = true; Sys.ch('pei', { trust: 5 }, true);
      later(4, 'pei', 'pei', 'Bloom……？他們上個月就去找過陳伯的兒子了。原來出高價的是他們。');
      later(6, 'pei', 'pei', '謝謝你跟我說。換作別人，可能就去了。');
      Sys.mem('pei', '你把 Bloom 的訊息直接給她看', 1, 'bloomTold', true);
    } },
    { t: '「不用了，謝謝。」', fn: (st) => { st.f.bloom = 'ignored'; later(2, 'vivian', 'vivian', '了解，打擾了。'); } },
    { t: '「好，明天中午見。」', fn: (st) => {
      st.f.bloomMeet = true;
      Sched.override('vivian', at(6, '11:40'), at(6, '13:20'), 'bar', 'booth1', '等你', 'bloomMeet', { free: false });
      later(2, 'vivian', 'vivian', '太好了。明天中午，好日子靠窗的位子。');
      Sys.at(at(6, '11:45'), 'msg', { thread: 'vivian', from: 'vivian', text: '我到了。不急，您慢慢來。' });
    } },
  ];
  // a stranger's appointment is not a promise to a friend: no-shows only close the door
  add({ id: 'd6_bloom_noshow', kind: 'offscreen', day: 6, from: '13:20', cond: (st) => !!st.f.bloomMeet && !st.f.bloom, run: (st) => { st.f.bloom = 'noshow'; msg('vivian', 'vivian', '看來您改變主意了。名片我留在老蔡那裡，有需要再聯絡。'); } });
  SW.HINTS.push({ day: 6, from: '10:30', to: '13:20', cond: (st) => !!st.f.bloomMeet && !st.f.bloom, text: '🍸 12:00 Vivian 在好日子等你（去不去都可以）', go: 'bar' });
  add({ id: 'd6_bloom', kind: 'scene', day: 6, where: 'bar', from: '11:40', to: '13:20', cast: ['vivian'], prio: 82, cond: (st) => !!st.f.bloomMeet && !st.f.bloom, run: async (st) => {
    await narr('Vivian 很準時。她點了一杯氣泡水，把一個信封放在桌上，沒有推過來。');
    await say('vivian', '我直說。陳伯的兒子想把店面租給我們，租金是現在的兩倍。陳伯還在猶豫。');
    await say('vivian', '我們想知道兩件事：小沛這週到底湊到多少，還有她的底線在哪裡。');
    await say('vivian', '對了，我們也願意請她當新店的店長。穩定的薪水，勞健保。說不定這對她比較好？');
    await inner('信封很薄。三萬塊原來這麼薄。');
    let asked = false;
    for (;;) {
      const c = await choose([
        { t: '「我不會出賣朋友。」', v: 'refused' },
        { t: '「她的事她自己決定。店長的事，你去跟她談。」', v: 'redirect' },
        { t: '「先告訴我，陳伯的兒子為什麼這麼急？」', sub: '反過來套話', v: 'pry', if: !asked },
        { t: '收下信封，給她假的數字', sub: '騙騙子', v: 'fooled' },
        { t: `收下信封：「她湊到 ${U.money(st.cafe.fund + st.cafe.crowd)}。底線……大概就是這樣。」`, v: 'sold' },
      ]);
      if (c === 'pry') {
        asked = true; st.f.landlordSon = true;
        await say('vivian', '……他做生意欠了一筆錢。陳伯不想租給我們，但他只有一個兒子。');
        await say('vivian', '所以，你懂的。這件事遲早會發生。你只是決定，要不要從中拿點什麼。');
        if (SW.Mystery) await SW.Mystery.vivian();
        continue;
      }
      st.f.bloom = c;
      if (c === 'refused') {
        await say('vivian', '理解。名片留給您，改變主意再聯絡。');
        await inner('你走出好日子，陽光很刺眼。你沒有後悔，只是有點想知道，三萬塊可以做什麼。');
      } else if (c === 'redirect') {
        await say('vivian', '……好。我會直接聯絡她。');
        later(240, 'pei', 'pei', 'Bloom 的人來找我，說要請我當店長。薪水比我現在自己顧店多。……我好亂。');
      } else if (c === 'fooled') {
        Sys.money(30000); stat('betrayals', 0.5);
        await say('vivian', '……謝謝。很有幫助。');
        await inner('你騙了一個想利用朋友的人。信封在口袋裡，比想像中重。');
      } else {
        Sys.money(30000); stat('betrayals');
        await say('vivian', '很有幫助。合作愉快。');
        await inner('說出口的時候，比你想像的容易。這才是最可怕的部分。');
      }
      break;
    }
    if (here('tsai')) await narr('吧台後面，老蔡擦著杯子，一直沒有抬頭。');
    Sched.clearOv('bloomMeet');
  } });
  // the truth about the envelope comes out in week two
  add({ id: 'd9_bloom_reveal', kind: 'approach', npc: 'pei', prio: 74, cond: (st) => (st.f.bloom === 'sold' || st.f.bloom === 'fooled') && !st.f.bloomRevealed && (T.day() >= 9 || (T.day() === 8 && T.mod() >= 17 * 60)), run: async (st) => {
    await say('pei', st.f.bloom === 'sold' ? '老蔡跟我說，上週六中午，你跟 Bloom 的人坐在他店裡。' : 'Bloom 的 Vivian 傳訊息給我。她說你收了他們的錢，然後給了假資料。');
    await say('pei', '……是真的嗎？');
    const c = await choose([
      { t: '「是真的。對不起。」', v: 'confess' },
      { t: '「我收了錢，但給的是假數字。我是在幫你。」', v: 'fooled', if: st.f.bloom === 'fooled' },
      { t: '「老蔡看錯了。」', sub: '（說謊）', v: 'lie', if: st.f.bloom === 'sold' },
    ]);
    st.f.bloomRevealed = c;
    if (c === 'confess') {
      const why = await choose([{ t: '「我需要那筆錢。」', v: 'money' }, { t: '「我以為店長的工作對你比較好。」', v: 'better' }, { t: '「我沒有理由。我就是做了。」', v: 'none' }]);
      await say('pei', { money: '……你可以跟我說的。我們可以一起想辦法。', better: '你不能替我決定什麼對我比較好。', none: '……謝謝你沒有編一個理由給我。' }[why]);
      Sys.ch('pei', { trust: -18, friend: -10, tension: 14 });
      Sys.mem('pei', '你承認收了 Bloom 的錢', -1, 'bloomBetray');
      await inner('她沒有哭。她只是把你常坐的那張椅子，往桌子裡推了一點。');
    } else if (c === 'fooled') {
      await say('pei', '所以你騙了他們，然後收了錢。我該謝謝你嗎？');
      Sys.ch('pei', { trust: -8, tension: 8 });
      Sys.mem('pei', '你騙了 Bloom，也收了 Bloom 的錢', -1, 'bloomFooled');
    } else {
      Sys.lie({ id: 'bloomDeny', to: 'pei', text: '你說老蔡看錯了，你沒見過 Bloom 的人', w: ['tsai', 'lele'], weight: 22, chance: 0.3, caught: '老蔡把那天的發票拿給我看了。兩杯，一杯氣泡水。' });
      await say('pei', '……好。我相信你。');
      await inner('她說「我相信你」的時候，聲音有一點抖。');
    }
  } });

  // =====================================================================
  // DRUNK TRUTHS — what people say after the second drink
  // =====================================================================
  const CONFESS = {
    mira: ['miraEscape', ['我想去澳洲，其實不是因為想看世界。', '我是想知道，如果我消失了，會不會有人來找我。']],
    hsiu: ['hsiuDad', ['我想當 Feature Owner，不是因為想升官。', '我爸到現在還跟親戚說，我在「電子廠上班」。我想要一個他講得出口的頭銜。']],
    pei: ['peiPromise', ['有時候我很討厭這間店。我討厭我這麼需要它。', '外婆走之前，我答應她不會讓這個轉角空掉。我不知道我是在顧店，還是在顧一個承諾。']],
    anson: ['ansonUseful', ['我常常覺得，大家喜歡我，只是因為我有用。', '如果哪天我不再幫忙了……大概就沒有人會找我了吧。']],
    lele: ['leleFault', ['……我跟阿哲分手，不全是他的錯。', '我先喜歡上別人的。什麼都沒發生，但我心裡先走了。所以他罵我的時候，我一句都沒有回。']],
  };
  Human.truthAbout = function (id) {
    const st = S(), r = st.rel[id];
    const caught = (st.lies || []).filter((l) => l.to.includes(id) && (l.exposed || l.resolved) && l.kind !== 'white');
    const open = Sys.openLies(id).filter((l) => l.kind !== 'white');
    const broken = st.prom.filter((p) => p.who === id && p.status === 'broken').length;
    if (id === 'mira' && st.f.creditRevealed === 'owned') return ['週會那天，我在廁所待了十分鐘。', '不是因為功勞。是因為是你。'];
    if (id === 'pei' && st.f.bloom === 'sold' && !st.f.bloomRevealed) return ['你知道嗎？這一週，你是我最不擔心的人。', '因為我知道，你不會走。'];
    if (id === 'hsiu' && st.f.hsiuSaid === 'praise' && (st.f.evalHsiu === 'undermine' || st.f.evalHsiu === 'expose') && !st.f.hsiuKnowsEval) return ['課長問過我你的事。我說了你的好話。', '……不知道為什麼，突然想跟你說。'];
    if (st.p.partner === id && st.f.affair && !Sys.knows(id, 'affair')) return ['我有時候會想，你是不是有一天會突然不見。', '……我知道你不會啦。'];
    if (caught.length) return ['你上次騙我的事……其實在別人跟我說之前，我就有點感覺了。', '我只是一直在等你自己說。'];
    if (open.length) return ['你是我身邊，少數不會騙我的人。', '這件事我很確定。'];
    if (broken >= 2) return ['你答應過我的事，有一半沒有做到。', '……但我還是一直相信下一次。這樣是不是很笨？'];
    if (r.tension >= 40) return ['老實說，我有時候不知道我們算什麼。', '朋友？還是只是剛好坐在一起的人？'];
    if (r.trust >= 68 || r.friend >= 72) return ['我很少這麼相信一個人。', '這讓我有點害怕。'];
    return ['我們好像從來沒有好好聊過。', '……這樣很好。現在這樣很好。'];
  };
  Human.canDrunkTalk = (id) => { const st = S(); return SW.CH[id].core && st.p.map === 'bar' && T.mod() >= 18 * 60 && Sys.tipsy() >= 2 && !st.f['drunkTalk_' + id]; };
  Human.drunkTalk = async function (id) {
    const st = S();
    st.f['drunkTalk_' + id] = T.day();
    await SW.scene(async () => {
      Sys.drink();
      await narr(`${U.pick(['你們又點了一輪。', '老蔡默默又放了兩杯在桌上。'])}${nm(id)}的臉有點紅，說話變得很慢。`);
      if (!(SW.Mystery && await SW.Mystery.drunk(id))) for (const l of Human.truthAbout(id)) await say(id, l);
      const [fact, lines] = CONFESS[id];
      if (!K(fact)) { await narr('沉默了一下。'); for (const l of lines) await say(id, l); Sys.learn('player', fact, id); st.f['trust_' + fact] = true; }
      const open = Sys.openLies(id).filter((l) => l.kind !== 'white');
      const pry = Object.keys(st.knows[id] || {}).filter((f) => SW.FACTS[f] && SW.FACTS[f].secret && SW.FACTS[f].owner && SW.FACTS[f].owner !== id && !K(f));
      const c = await choose([
        { t: '安靜地聽，然後輕輕碰一下對方的杯子', v: 'listen' },
        open.length ? { t: '「我也有一件事要跟你坦白……」', sub: `你曾經騙過${nm(id)}`, v: 'confess' } : null,
        { t: '「其實我也很怕被丟下。」', v: 'mine' },
        pry.length ? { t: `趁機套話：「那……${nm(SW.FACTS[pry[0]].owner)}最近有跟你說什麼嗎？」`, sub: '對方現在什麼都會說', v: 'pry' } : null,
      ].filter(Boolean));
      if (c === 'listen') {
        Sys.ch(id, { comfort: 6, trust: 4 });
        Sys.mem(id, `微醺的那晚，你安靜地聽${nm(id)}說了真心話`, 1, 'drunkListen');
      } else if (c === 'confess') {
        const l = open[open.length - 1];
        l.resolved = 'confess'; l.exposed = { to: id, by: 'player', t: st.t }; stat('confessed');
        await narr(`你把「${l.text.replace(/^你/, '')}」的真相說了出來。`);
        await say(id, Sys.rel(id).comfort >= 55 ? '……我就知道。謝謝你自己說出來。' : '……你為什麼要現在說？');
        Sys.ch(id, { trust: -Math.round(l.weight * 0.3), comfort: 4 });
        Sys.mem(id, '你在酒後主動坦白了一個謊', 1, 'drunkConfess_' + l.id);
      } else if (c === 'mine') {
        Sys.ch(id, { comfort: 8, friend: 3 });
        await say(id, '……那我們兩個都要好好的。說好了。');
        Sys.mem(id, '微醺的那晚，你們說了彼此的害怕', 1, 'drunkMine');
      } else {
        const f = pry[0];
        Sys.learn('player', f, id);
        await say(id, `${SW.FACTS[f].text}……噓。這是秘密喔。`);
        await inner(`你得到了你想要的。${nm(id)}趴在桌上，對你笑了一下。`);
        stat('pried');
        if (Math.random() < 0.55) Sys.at(at(T.mod() < 5 * 60 ? T.day() : T.day() + 1, '10:00'), 'pryRealize', { id });
      }
    });
    const day = T.mod() < 5 * 60 ? T.day() : T.day() + 1;
    Sys.at(at(day, '09:40'), 'msg', { thread: id, from: id, text: U.pick(['昨天晚上……我是不是說太多了😵 拜託忘掉。', '我昨天有說什麼奇怪的話嗎……不要回答。好啦還是回答。']), reply: 'hung_' + id });
  };
  H.pryRealize = function (d) {
    Sys.ch(d.id, { trust: -6, tension: 5 }, true);
    Sys.mem(d.id, `${nm(d.id)}喝醉那晚，你一直在問別人的事`, -1, 'pried', true);
  };
  for (const id of SW.CORE) {
    R['hung_' + id] = [
      { t: '「我什麼都不記得了😂」', fn: () => { Sys.lie({ id: 'hung_' + id + '_' + T.day(), to: id, text: '你說你不記得那晚的對話', kind: 'white' }); Sys.ch(id, { comfort: 2 }, true); later(2, id, id, '……太好了。（呼）'); } },
      { t: '「我記得。謝謝你願意跟我說。」', fn: () => { Sys.ch(id, { trust: 5 }, true); later(2, id, id, '……嗯。那你要幫我保密。'); } },
      { t: '「放心，我不會說出去。」', fn: () => { Sys.ch(id, { trust: 2 }, true); later(2, id, id, '你最好是🥲'); } },
    ];
  }
  // drunk confessions are secrets too: spreading them gets traced back
  const LEAK2 = {
    miraEscape: ['mira', '我喝醉那天說的話……為什麼樂樂會知道？'],
    hsiuDad: ['hsiu', '我爸的事，你跟誰說了？'],
    peiPromise: ['pei', '外婆的事，我只在那天晚上說過一次。'],
    ansonUseful: ['anson', '有人跟我說「你不用那麼有用也沒關係」。……是你說出去的吧。'],
    leleFault: ['lele', '現在大家都知道我跟阿哲的事了。是你說的對不對！！'],
  };
  for (const f of Object.keys(LEAK2)) {
    const [owner, line] = LEAK2[f];
    add({ id: 'leak_' + f, kind: 'approach', npc: owner, prio: 75, cond: (st) => !!st.f['leakFound_' + f] && !st.f['apol_leak_' + f], run: async (st) => {
      await say(owner, line);
      await say(owner, '那是我喝醉的時候說的。你明明知道。');
      const c = await choose([{ t: '「對不起。我不應該說的。」', v: 'sorry' }, { t: '「我只是想幫你。」', v: 'help' }, { t: '（沉默）', v: 'quiet' }]);
      st.f['apol_leak_' + f] = c;
      if (c === 'sorry') { Sys.ch(owner, { tension: -5, trust: 2 }); await say(owner, '……下次我不會在你面前喝酒了。'); }
      else if (c === 'help') { Sys.ch(owner, { tension: 2 }); await say(owner, '幫我？……你連問都沒有問我。'); }
      else { Sys.ch(owner, { tension: 5 }); await narr(`${nm(owner)}看著你，什麼都沒說。`); }
    } });
  }

  // =====================================================================
  // DATING SOMEONE ELSE
  // =====================================================================
  Human.afterDate = function (id) {
    const st = S(), P = st.p.partner;
    if (!P || P === id) return;
    stat('cheated');
    st.f.affair = { with: id, t: st.t };
    for (const w of SW.W.npcsHere().filter((x) => SW.CORE.includes(x) && x !== id && x !== P)) Sys.learn(w, 'affair', null, true);
    later(25, P, P, U.pick(['到家了嗎？今天好累，想聽你的聲音。', '你今天在幹嘛？我剛剛突然很想你。']));
  };
  for (const id of Object.keys(SW.CH).filter((k) => SW.CH[k].core || SW.CH[k].date)) {
    add({ id: 'affairC_' + id, kind: 'approach', npc: id, prio: 78, once: false, cooldown: 60, cond: (st) => st.p.partner === id && !!st.f.affair && Sys.knows(id, 'affair') && st.f.affairFaced !== st.f.affair.t, run: async (st) => {
      const X = st.f.affair.with;
      st.f.affairFaced = st.f.affair.t;
      await say(id, `我聽說了。你跟${nm(X)}的事。`);
      await say(id, '……是真的嗎？');
      const breakup = async (line) => { await say(id, line); st.p.partner = null; Sys.mem(id, `你和${nm(id)}因為${nm(X)}分手了`, -1, 'breakup'); };
      const c = await choose([
        { t: '「是真的。對不起。」', v: 'confess' },
        { t: '「只是朋友吃個飯，你想太多了。」', sub: '（說謊）', v: 'lie' },
        SW.CORE.includes(X) ? { t: `「是${nm(X)}一直來找我的。」`, sub: '把責任推出去', v: 'blame' } : null,
        { t: '「……我們分開吧。」', v: 'end' },
      ].filter(Boolean));
      const r = st.rel[id];
      if (c === 'confess') {
        Sys.ch(id, { trust: -20, attract: -12, tension: 18 }); stat('confessed');
        if (r.comfort >= 62 && r.attract >= 50) { await say(id, '……謝謝你沒有騙我。但我需要時間。不要現在跟我說話。'); Sys.mem(id, '你承認了跟別人約會', -1, 'affairConfess'); }
        else await breakup('……那我們先分開吧。至少你沒有騙我。');
      } else if (c === 'lie') {
        if (Math.random() < 0.3 + r.comfort * 0.004) {
          Sys.lie({ id: 'affair_' + st.f.affair.t, to: id, text: `你說跟${nm(X)}只是朋友吃飯`, w: [X], weight: 22, chance: 0.25, caught: '{W}跟我說了那天的事。全部。' });
          await say(id, '……真的嗎？好。我相信你。');
          await inner(`${nm(id)}抱了你一下。你的手機在口袋裡震了一聲，你沒有拿出來看。`);
        } else await breakup('你知道最傷人的是什麼嗎？不是你去約會。是你到現在還在騙我。');
      } else if (c === 'blame') {
        Sys.pch(id, X, { tension: 20, trust: -15 }); stat('blamed');
        Sys.lie({ id: 'affairBlame_' + st.f.affair.t, to: id, text: `你說是${nm(X)}一直來找你`, w: [X], victim: X, weight: 22, chance: 0.3, caught: `我去找${nm(X)}談了。${nm(X)}給我看了你們的對話紀錄。` });
        await say(id, `……我會去問清楚。`);
        await inner(`你想像${nm(id)}去找${nm(X)}的那個畫面。你沒有阻止。`);
      } else await breakup('……好。');
    } });
  }

  // =====================================================================
  // THE PERSON YOUR CHOICES ADD UP TO
  // =====================================================================
  Human.profile = function (span) {
    span = span || '這一週';
    const st = S(), s = st.stats, lies = (st.lies || []).filter((l) => l.kind !== 'white' && !/_blame$/.test(l.id));
    const caught = lies.filter((l) => l.exposed || l.resolved).length;
    const leaked = Object.keys(st.f).filter((k) => /^leak_/.test(k) && Array.isArray(st.f[k]) && st.f[k].length).length;
    const kept = ['lease', 'hsiuSong', 'holiday', 'ansonPei'].filter((f) => K(f) && !(st.f['leak_' + f] || []).length).length;
    const out = [];
    if (!lies.length) out.push(`${span}，你沒有對任何人說謊。這比聽起來難。`);
    else {
      let l = `${span}你說了 ${lies.length} 個謊，其中 ${caught} 個被拆穿。`;
      if (s.confessed) l += '被拆穿的時候，你至少有一次選擇了承認。';
      if (s.blamed) l += `你也曾經把責任推到別人身上。`;
      if (s.doubled) l += '有人選擇了相信你的第二個謊。';
      out.push(l);
    }
    if (s.whiteLies) out.push(`你還說了 ${s.whiteLies} 個善意的謊——為了讓某個人好過一點。`);
    if (kept && !leaked) out.push(`別人託付給你的秘密，你一個都沒有說出去。`);
    else if (leaked) out.push(`有 ${leaked} 個別人的秘密，是從你這裡傳出去的。`);
    const T3 = [];
    if (st.f.credit === 'honest') T3.push('課長問起功勞時，你說了米拉的名字');
    if (st.f.credit === 'stole') T3.push(st.f.creditRevealed === 'returned' ? '你搶了米拉的功勞，後來又還了回去' : '你把米拉的發現說成是自己的');
    if (st.f.evalHsiu === 'praise') T3.push('課長問你怎麼看阿修時，你替他說了好話');
    if (st.f.evalHsiu === 'undermine' || st.f.evalHsiu === 'expose') T3.push(st.f.hsiuSaid === 'praise' ? '你在課長面前扯了阿修後腿——而他替你說了好話' : '你在課長面前扯了阿修後腿');
    if (st.f.bloom === 'refused' || st.f.bloom === 'redirect') T3.push('面對 Bloom 的信封，你沒有收');
    if (st.f.bloom === 'toldPei') T3.push('Bloom 找上你的時候，你第一個告訴了小沛');
    if (st.f.bloom === 'sold') T3.push('你收下了 Bloom 的信封，說出了小沛的底線');
    if (st.f.bloom === 'fooled') T3.push('你收下了 Bloom 的信封，然後騙了他們');
    if (s.cheated) T3.push('你有另一半，卻還和別人約會');
    if (s.pried) T3.push('你趁別人喝醉，問了不該問的事');
    const mys = SW.Mystery ? SW.Mystery.profile() : { t3: [], hidden: [] };
    T3.push(...mys.t3);
    if (T3.length) out.push(T3.join('；') + '。');
    // what nobody knows yet
    const hidden = [];
    for (const l of lies) if (!l.exposed && !l.resolved) hidden.push(l.text);
    if (st.f.bloom === 'sold' && !st.f.bloomRevealed) hidden.push('那個信封');
    if (st.f.affair && !SW.CORE.some((id) => Sys.knows(id, 'affair'))) hidden.push(`你和${nm(st.f.affair.with)}的約會`);
    if (st.f.hsiuQuitEval) hidden.push('阿修那首歌為什麼沒有唱');
    hidden.push(...mys.hidden);
    // who you were
    const bad = (s.betrayals || 0) + (s.cheated || 0) + (s.blamed || 0);
    let title;
    if (bad >= 3) title = '精明的生存者';
    else if (bad >= 1 && (s.confessed || 0) >= 1) title = '會回頭的人';
    else if (lies.length >= 3 && s.whiteLies) title = '溫柔的騙子';
    else if (lies.length >= 3) title = '習慣說謊的人';
    else if (!lies.length && !bad && (st.f.bloom === 'refused' || st.f.bloom === 'toldPei' || st.f.credit === 'honest' || st.f.evalHsiu === 'praise')) title = '老實得有點吃虧的人';
    else if (s.helped >= 4) title = '大家的後盾';
    else if (s.broken >= 3) title = '總是缺席的人';
    else title = '有好有壞的普通人';
    const html = `<div class="card-sec"><h4>你是怎樣的人</h4>${out.map((l) => `<p>${U.esc(l)}</p>`).join('')}<p><span class="tag ${bad ? 'bad' : 'good'}">${title}</span></p></div>`
      + (hidden.length ? `<div class="card-sec"><h4>到現在還沒有人知道的事</h4><ul>${hidden.map((h) => `<li>🤫 ${U.esc(h)}</li>`).join('')}</ul><p class="muted">世界還在前進。秘密不會永遠是秘密。</p></div>` : '');
    return { html, title };
  };

  // Vivian is not a friend; she is a business card with a smile
  const baseMinorRun = SW.Talk.minorRun;
  SW.Talk.minorRun = async function (id, v) {
    if (id !== 'vivian') return baseMinorRun(id, v);
    await SW.scene(async () => { await say('vivian', U.pick(['這條街的人流，其實比數據上好看。', '我不是壞人。我只是比較早學會，每個東西都有價格。', '您的朋友很幸運，有人這麼在乎那間店。'])); });
  };
})(window.SW);
