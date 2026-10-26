'use strict';
// WEEK 2 — EP04〈新的位子〉／EP05〈誰來扛〉
// Power changes hands at the office, the café lives with last Sunday's outcome, and everyone owes somebody something.
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys, Dir = SW.Dir, H = SW.H, Sched = SW.Sched, Story = SW.Story;
  const S = () => SW.S;
  const nm = (id) => SW.name(id);
  const say = (w, t, e) => UI.say(w, t, e);
  const narr = (t) => UI.say('narr', t);
  const inner = (t) => UI.say('narr', `（${t}）`);
  const choose = (o, p) => UI.choose(o, p);
  const wait = (m, l) => Sys.advance(m, l);
  const K = (f) => Sys.knows('player', f);
  const here = (id) => SW.W.present(id);
  const msg = (th, from, text, reply, exp) => Sys.msg(th, from, text, { reply, exp });
  const later = (m, th, from, text, reply, expM) => Sys.msgLater(m, th, from, text, reply, expM);
  const add = (st) => Dir.add(st);
  const R = SW.R;
  const at = T.at;
  const stat = (k, d) => { const s = S().stats; s[k] = (s[k] || 0) + (d === undefined ? 1 : d); };
  const W2 = SW.Week2 = {};
  // where the friends sit now
  W2.place = () => (S().f.cafeEmptied ? Sched.cafeMap() : 'cafe');
  W2.placeName = () => SW.PLACES[W2.place()].name;
  const out = () => S().cafe.outcome;
  // 阿修 has reasons to make you pay
  W2.grudge = () => { const st = S(); return !!st.f.hsiuKnowsEval || st.rel.hsiu.tension >= 40 || Sys.hasMem('hsiu', 'laughSong') || st.f.w2Blame === 'warned'; };

  Object.assign(SW.EPISODES, {
    8: { kicker: 'EP04・星期一', title: '新的位子', lines: [
      ['A線', '今天公布 Feature Owner。'],
      ['B線', (s) => ({ renew: '轉角續約了。可是捐過錢的人，好像都覺得自己有一點股份。', relocate: '轉角搬家了。新的地方，有新的規矩。', close: '轉角收了。小沛在好日子的吧台後面，學著當別人的員工。' }[s.cafe.outcome] || '轉角的事還沒有結論。')],
      ['C線', (s) => ({ go: '米拉訂了機票。三週後的星期六。', stay: '米拉留下來了。她自己好像還不太確定。', delay: '米拉說再等一年。她說得很輕。' }[s.f.miraDecision] || '有人在想要不要離開。')],
    ] },
    9: { kicker: '第九天・星期二', title: '分工', lines: [
      ['A線', (s) => (s.f.featureOwner === 'player' ? '你是 owner 了。誰做什麼，由你決定。' : s.f.featureOwner === 'hsiu' ? '阿修是 owner 了。誰做什麼，由他決定。' : '新專案開工。')],
      ['B線', '安森這週又被排滿了。他說他很好。'],
      ['C線', '樂樂的公司在找活動場地。'],
    ] },
    10: { kicker: 'EP05・星期三', title: '誰來扛', lines: [
      ['A線', '客戶現場掉資料。事故報告上，要寫一個名字。'],
      ['B線', () => `晚上七點，${W2.placeName()}，老位子聚會。`],
      ['C線', '有人欠了人情，有人在算。'],
    ] },
    11: { kicker: '第十一天・星期四', title: '我很好', lines: [['A線', '報告交出去了。辦公室很安靜。'], ['B線', '安森說他很好。'], ['C線', (s) => (s.f.miraDecision === 'go' ? '米拉在整理桌上的東西。' : '米拉說她想談談。')]] },
    12: { kicker: '第十二天・星期五', title: '第二個星期五', lines: [['A線', '這個星期五，沒有 release。'], ['B線', '晚上的 Live 照常。只是地方和規矩，可能不一樣了。'], ['C線', '上週五發生過的事，有些人還沒忘。']] },
    13: { kicker: '第十三天・星期六', title: '人情', lines: [
      ['A線', '週末。'],
      ['B線', (s) => ({ renew: '樂樂公司的活動，今天在轉角。', relocate: '新地方的第一個週末。', close: '小沛今天要給 Bloom 答覆。' }[s.cafe.outcome] || '週末。')],
      ['C線', '有人要你幫忙，有人要你閉嘴。'],
    ] },
    14: { kicker: '第二週完結・星期日', title: '我們還是我們嗎？', lines: [['A線', '一週前，大家坐在一起敬了轉角。'], ['B線', '今晚，大家再坐在一起一次。'], ['C線', '樂樂說，她有一件大事要宣布。']] },
  });
  SW.HINTS.push(
    { day: 10, from: '17:00', to: '21:30', cond: (s) => !s.f.w2GatherDone, text: () => `☕ 19:00 老位子聚會（${W2.placeName()}）`, go: () => W2.place() },
    { day: 14, from: '16:00', to: '22:30', cond: (s) => !s.f.w2FinaleDone, text: () => `🌙 19:00 樂樂有大事宣布（${W2.placeName()}）`, go: () => W2.place() },
  );
  SW.EVENTS.push({ at: at(10, '19:00'), text: '老位子聚會', known: () => T.day() >= 8 }, { at: at(14, '19:00'), text: '週日晚上的老位子（樂樂有事宣布）', known: () => T.day() >= 13 });

  // =====================================================================
  // A — THE OFFICE: who owns what, and who takes the blame
  // =====================================================================
  add({ id: 'w2_feature_off', kind: 'offscreen', day: [9, 10], from: '17:00', cond: (st) => !st.f.featureOwner, run: (st) => {
    st.f.featureOwner = Story.featureWinner(st);
    msg('boss', 'boss', st.f.featureOwner === 'player' ? '昨天的會你沒來。這季的 Feature Owner 是你。今天開始分工。' : '昨天的會你沒來。這季的 Feature Owner 是阿修。你配合他。');
  } });
  add({ id: 'd8_owner_msgs', kind: 'phone', day: [8, 9, 10], cond: (st) => !!st.f.featureOwner, run: (st) => {
    if (st.f.featureOwner === 'player') {
      later(5, 'group', 'lele', '聽說有人當上 Feature Owner了！！請客！！');
      if (st.rel.hsiu.friend >= 55) later(30, 'hsiu', 'hsiu', '恭喜。真的。……下週的分工不要整我就好。');
    } else {
      later(5, 'group', 'lele', '阿修當上 Feature Owner了！！請客！！');
      later(20, 'hsiu', 'hsiu', K('hsiuDad') ? '我打給我爸了。他說「喔」。……然後他說「不錯」。他很少說不錯。' : '……我當上了。我還沒有真實感。');
    }
  } });

  // Tuesday: the first meeting with a new name on the whiteboard
  add({ id: 'w2_assign', kind: 'scene', day: 9, where: 'office', from: '09:40', to: '12:30', cast: ['hsiu'], prio: 62, cond: (st) => !!st.f.featureOwner && !st.f.w2Assign, run: async (st) => {
    const r = st.rel.hsiu;
    if (st.f.featureOwner === 'player') {
      await narr('會議室。這次站在白板前面的人是你。');
      await say('boss', '分工你決定。客戶的 #4602，睡眠喚醒後掉盤，最急。');
      const c = await choose([{ t: '「#4602 給阿修。電源管理他最熟。」', v: 'hsiu' }, { t: '「#4602 我跟阿修一起追。」', v: 'pair' }, { t: '「#4602 我自己來。」', v: 'me' }, { t: '「#4602 給米拉。她的測試最完整。」', v: 'mira' }]);
      st.f.w2Assign = c;
      if (c === 'hsiu') await say('hsiu', r.friend >= 55 ? '……好。交給我。' : '喔。所以最髒的給我。');
      else if (c === 'pair') { await say('hsiu', '……你確定？好。'); Sys.ch('hsiu', { comfort: 5, friend: 3 }); }
      else if (c === 'me') { await say('hsiu', '好喔。owner 自己來。'); Sys.ch('hsiu', { tension: 3 }, true); }
      else { await say('mira', '我？……好。我會跑到它求饒。'); Sys.ch('hsiu', { tension: 2 }, true); }
      await narr('散會的時候，阿修最後一個離開。他在門口停了一下。');
      if (K('hsiuDad')) { await say('hsiu', '我爸昨天問我，這次有沒有升。我說快了。'); await inner('他說「快了」的時候，沒有看你。'); }
      else await say('hsiu', '……恭喜。我是說真的。');
      return;
    }
    await narr('會議室。白板前面站的是阿修。他把簡報翻來翻去，翻了三次。');
    if (W2.grudge()) {
      await say('hsiu', '#4602 給米拉。文件整理和測試報告……給{N}。');
      await narr('會議室安靜了一下。那是整個專案最無聊的工作。');
      const c = await choose([{ t: '「好。」', v: 'accept' }, { t: '「這樣分工不太合理吧。」', v: 'public' }, { t: '散會後私下找他談', v: 'private' }]);
      st.f.w2Assign = 'docs';
      if (c === 'public') { await say('hsiu', '我是 owner。'); Sys.ch('hsiu', { tension: 6 }); await inner('米拉低頭看筆電。沒有人說話。'); }
      else if (c === 'private') {
        await say('hsiu', st.f.hsiuKnowsEval ? '你在課長面前說我的時候，有想過合不合理嗎？' : '……我需要可以信任的人追 #4602。就這樣。');
        if (st.f.hsiuKnowsEval) { const d = await choose([{ t: '「……對不起。那天我不該說。」', v: 1 }, { t: '「所以你在報復我。」', v: 0 }]); if (d) { Sys.ch('hsiu', { tension: -6 }); await say('hsiu', '……下週再看看吧。'); } else { Sys.ch('hsiu', { tension: 5 }); await say('hsiu', '我在當 owner。'); } }
      } else await inner('你點點頭。阿修好像鬆了一口氣，又好像有點失望。');
    } else if (r.friend >= 58 || Sys.hasMem('hsiu', 'praisedPublic') || Sys.hasMem('hsiu', 'congrats')) {
      st.f.w2Assign = 'pair';
      await say('hsiu', '#4602……{N}，你最會追這種 bug。我跟你一起。');
      await say('hsiu', '我第一次當 owner。如果我哪裡做得很爛，你要跟我說。');
      Sys.ch('hsiu', { trust: 3 }, true);
    } else {
      st.f.w2Assign = 'verify';
      await say('hsiu', '#4602 我自己追。{N} 幫我做驗證。');
    }
  } });

  // Wednesday: the field failure. The root cause is the GC patch merged in week one.
  const INCIDENT = ['客戶現場掉資料。根因是上個月 merge 的 GC patch，在睡眠喚醒的時候會跟 #4602 的時序打架。', '客戶要一份事故報告。責任人那一欄，owner 填。'];
  add({ id: 'w2_incident', kind: 'approach', npc: 'boss', day: 10, where: 'office', from: '09:30', to: '16:30', prio: 70, cond: (st) => st.f.featureOwner === 'player' && !st.f.w2Blame, run: async (st) => {
    for (const l of INCIDENT) await say('boss', l);
    await inner('GC patch 是阿修寫的。code review 那天，課長說「先 merge，下週再說」。');
    if (K('hsiuDad')) await inner('你想起他說的：「電子廠上班」。');
    const c = await choose([
      { t: '「寫我。我是 owner，這是我的責任。」', v: 'me' },
      { t: '「寫流程：review 和測試都漏了，我們一起改。」', v: 'process' },
      { t: '「我在 code review 的時候提過這個問題。」', sub: '有記錄', v: 'warned', if: !!st.f.gcWarned },
      { t: '「寫阿修。那是他的 patch。」', v: 'hsiu' },
      { t: '「米拉的 regression 應該要抓到才對。」', sub: '推給別人', v: 'mira' },
    ]);
    st.f.w2Blame = c;
    const W = st.work;
    if (c === 'me') {
      W.bossTrust -= 3;
      await say('boss', '……你確定？owner 扛責任，這很好。但下次不要讓我寫這種報告。');
      Sys.ch('hsiu', { trust: 10, friend: 6 }, true);
      Sys.mem('hsiu', '你把他的事故寫成自己的責任', 1, 'tookBlame', true);
      later(60, 'hsiu', 'hsiu', '報告我看到了。……為什麼？');
      stat('protected');
    } else if (c === 'process') {
      W.bossTrust += 2; W.perf += 1;
      await say('boss', '……成熟的答案。下週給我改善流程。');
      Sys.ch('hsiu', { trust: 4 }, true);
    } else if (c === 'warned') {
      W.bossTrust += 3;
      await say('boss', '有記錄就好。');
      Sys.ch('hsiu', { tension: 10, trust: -6 });
      Sys.mem('hsiu', '你在事故報告裡寫「我早就提醒過」', -1, 'warnedReport', true);
      await inner('你說的是事實。只是你知道，這句話會被所有人看到。');
    } else if (c === 'hsiu') {
      W.hsiuScore -= 6;
      await say('boss', '好。他會收到書面警告。');
      Sys.ch('hsiu', { trust: -8, tension: 8 });
      Sys.mem('hsiu', '你在事故報告上寫了他的名字', -1, 'namedHim', true);
      if (K('hsiuDad')) await inner('那封警告信會寄到他的信箱。他爸不會知道。……應該不會。');
    } else {
      stat('blamed');
      await say('boss', '好。我會跟她談測試範圍。');
      Sys.ch('mira', { trust: -12, tension: 12 });
      Sys.mem('mira', '你在事故報告上把責任推給她的測試', -1, 'blamedMira', true);
      await inner('下午，米拉被叫進了課長辦公室。出來的時候，她沒有看你。');
    }
  } });
  // 阿修 is the owner: he has to write a name too
  add({ id: 'w2_incident_hsiu', kind: 'approach', npc: 'hsiu', day: 10, where: 'office', from: '09:30', to: '16:30', prio: 70, cond: (st) => st.f.featureOwner === 'hsiu' && !st.f.w2Blame, run: async (st) => {
    await say('hsiu', '客戶現場掉資料。根因……是我的 GC patch。');
    if (W2.grudge()) {
      await say('hsiu', '報告的責任人，我會寫「驗證不足」。驗證是你做的。');
      if (st.f.hsiuKnowsEval) await say('hsiu', '你在課長面前怎麼說我，我都記得。');
      const c = await choose([
        { t: '「那是你的 patch。我們一起去找課長說清楚。」', v: 'fair' },
        { t: '「……好。我扛。」', v: 'swallow' },
        { t: '「你要我跟大家說你爸的事嗎？」', sub: '拿他的秘密威脅他', v: 'threat', if: K('hsiuDad') },
      ]);
      if (c === 'fair') {
        if (st.rel.hsiu.tension < 55 || Math.random() < 0.5) { await say('hsiu', '……'); await narr('他沉默了很久，然後把報告上的名字改掉了。'); await say('hsiu', '……是我的。我自己寫。'); st.f.w2Blame = 'hsiuSelf'; Sys.ch('hsiu', { tension: -6, trust: 4 }); }
        else { await say('hsiu', '課長會相信 owner。不會相信你。'); st.f.w2Blame = 'hsiuBlamedYou'; st.work.bossTrust -= 4; Sys.mem('hsiu', '他把事故推給了你', 0, 'hsiuBlamed', true); }
      } else if (c === 'swallow') {
        st.f.w2Blame = 'hsiuBlamedYou'; st.work.bossTrust -= 4; stat('swallowed');
        await say('hsiu', '……謝了。');
        await inner('他說謝了的時候，好像比你還難受。');
        Sys.mem('hsiu', '你替他扛了不是你的事故', 1, 'swallowed', true);
      } else {
        st.f.w2Blame = 'hsiuSelf'; stat('betrayals');
        await say('hsiu', '……你怎麼可以。');
        await narr('他的臉一下子變得很白。他把報告上的名字改成自己的，手在抖。');
        Sys.ch('hsiu', { trust: -25, tension: 25, friend: -10 });
        Sys.mem('hsiu', '你拿他爸爸的事威脅他', -1, 'threatened');
        await inner('你贏了。你不確定這叫不叫贏。');
      }
      return;
    }
    await say('hsiu', '報告我會寫我自己。這是我的。');
    if (K('hsiuDad') || st.rel.hsiu.friend >= 60) await say('hsiu', '……可是我爸那邊……算了。');
    await say('hsiu', '你……可以幫我一起扛嗎？寫「驗證不足」，算我們兩個的。');
    const c = await choose([{ t: '「好。算我們兩個的。」', v: 'share' }, { t: '「這是你的。但我陪你去跟課長說。」', v: 'walk' }, { t: '「抱歉，這個我不能扛。」', v: 'no' }]);
    if (c === 'share') { st.f.w2Blame = 'shared'; st.work.bossTrust -= 2; Sys.ch('hsiu', { friend: 10, trust: 8 }); Sys.mem('hsiu', '你答應跟他一起扛事故', 1, 'sharedBlame'); await say('hsiu', '……我欠你一次。'); }
    else if (c === 'walk') { st.f.w2Blame = 'hsiuSelf'; Sys.ch('hsiu', { trust: 6 }); Sys.mem('hsiu', '你陪他走進課長辦公室', 1, 'walkedWithHim'); await narr('你們一起站在課長辦公室門口。阿修深呼吸了三次才敲門。'); }
    else { st.f.w2Blame = 'hsiuSelf'; await say('hsiu', '……也是。抱歉，我不該問。'); }
  } });
  add({ id: 'w2_incident_off', kind: 'offscreen', day: 10, from: '17:00', cond: (st) => !st.f.w2Blame && !!st.f.featureOwner, run: (st) => {
    if (st.f.featureOwner === 'player') { st.f.w2Blame = 'absent'; st.work.bossTrust -= 6; msg('boss', 'boss', '客戶現場出事了，你今天不在。事故報告的責任人，我寫了 owner。'); }
    else if (W2.grudge()) { st.f.w2Blame = 'hsiuBlamedYou'; st.work.bossTrust -= 4; msg('boss', 'boss', '事故報告寫的是「驗證不足」。下週來我辦公室一趟。'); }
    else { st.f.w2Blame = 'hsiuSelf'; msg('hsiu', 'hsiu', '客戶那邊出事了。報告我寫我自己。你不用擔心。'); }
  } });

  // =====================================================================
  // B — WEDNESDAY NIGHT: what the outcome costs
  // =====================================================================
  const TERMS = {
    church: '教會的長輩說，週五的 Live 不能有酒，十點前要結束。還有……歌詞要先給他們看。',
    studio: '工作室老闆說，每個月的營業額要抽三成。',
    company: '福委會說，店名要改成「矽藍咖啡吧」，招牌換成公司的 logo。',
  };
  add({ id: 'w2_gathering', kind: 'scene', day: 10, from: '19:05', to: '21:30', where: ['cafe', 'bar', 'church', 'studio', 'office'], prio: 80, cond: (st) => !st.f.w2GatherDone && st.p.map === W2.place() && SW.CORE.filter((i) => here(i)).length >= 3, run: async (st) => {
    st.f.w2GatherDone = true;
    const o = out();
    await narr({ renew: '週三晚上，轉角窗邊的老位子。一切都跟以前一樣——除了每個人好像都欠了誰一點什麼。', relocate: `週三晚上，${W2.placeName()}。桌子比較小，大家坐得比較擠。`, close: '週三晚上，好日子的長桌。小沛穿著老蔡店裡的圍裙，替大家倒水。' }[o] || '週三晚上，老位子。');
    if (st.f.bloomRevealed && st.f.bloomRevealed !== 'lie' && here('pei')) await inner('小沛幫每個人倒了水。輪到你的時候，她停了一下。');
    if (o === 'renew') {
      if (here('lele')) await say('lele', '小沛！我們公司週六要辦新品發表，我跟老闆說可以借轉角！反正我有出錢嘛～免費的對吧？');
      else msg('group', 'lele', '小沛！我們公司週六要借轉角辦活動！反正我有出錢嘛～免費的對吧？');
      await narr('小沛笑了一下。是那種客服的笑。');
      await say('pei', '……嗯。可以啊。');
      await inner('週六，小沛原本要辦店慶。');
      const c = await choose([{ t: '「樂樂，小沛週六原本有店慶。捐錢不等於包場吧？」', v: 'pei' }, { t: '「要不要付個場地費，算公司的？」', v: 'mid' }, { t: '「好啊，熱鬧一點也不錯！」', v: 'lele' }, { t: '（低頭喝咖啡）', v: 'quiet' }]);
      st.f.w2Debt = c;
      if (c === 'pei') { await say('lele', '……我又不是那個意思。'); Sys.ch('lele', { tension: 6 }); Sys.ch('pei', { trust: 5 }); later(90, 'pei', 'pei', '謝謝你替我說。我自己說不出口。'); }
      else if (c === 'mid') { await say('lele', '……也對啦。我去問老闆，公司應該付得起。'); Sys.ch('pei', { trust: 3 }, true); }
      else if (c === 'lele') { await say('lele', '對嘛！就知道你挺我！'); Sys.ch('pei', { comfort: -3 }, true); }
      else await inner('沒有人說話。小沛把同一個杯子擦了第三遍。');
      Sched.override('lele', at(13, '13:00'), at(13, '17:00'), 'cafe', 't1', '公司活動', 'w2event', { free: true });
    } else if (o === 'relocate') {
      const p = st.cafe.partner;
      await say('pei', TERMS[p] || TERMS.studio);
      await say('pei', '我在想，要不要接受。');
      if (here('lele')) await say('lele', '不要！那就不是轉角了！');
      if (here('mira')) await say('mira', '先活下來，再談是不是轉角。');
      if (p === 'church' && here('anson')) await say('anson', '……長輩也是想保護大家。我會跟牧師說說看。');
      const c = await choose([{ t: '「去談。條件可以改。」', v: 'fight' }, { t: '「先接受。活下來最重要。」', v: 'accept' }, { t: '「不喜歡就走。Live 可以去好日子辦。」', v: 'leave' }, { t: '「你自己想要什麼？」', v: 'ask' }]);
      st.f.w2Terms = c;
      if (c === 'ask') { await say('pei', '……我想要的，是不用一直想這個問題。'); Sys.ch('pei', { comfort: 5 }); st.f.w2Terms = st.cafe.will >= 55 ? 'fight' : 'accept'; }
      else await say('pei', { fight: '……好。我去談。', accept: '……嗯。活下來。', leave: '去好日子……老蔡應該會答應吧。' }[c]);
    } else if (o === 'close') {
      await say('pei', 'Bloom 寄了正式的 offer 給我。新店店長，月薪四萬五。週六前要回覆。');
      if (here('lele')) await say('lele', '四萬五！！去啊！！');
      if (here('anson')) await say('anson', '……你想去嗎？');
      if (here('mira')) await say('mira', '穩定不是壞事。');
      if (st.f.bloom === 'sold' && !st.f.bloomRevealed) await inner('offer 的最後一行寫著：「感謝在地夥伴提供寶貴意見。」你知道那個夥伴是誰。');
      if (st.f.bloomRevealed === 'confess') await say('pei', '……你的意見，我還需要嗎？');
      const c = await choose([
        { t: '「你自己想要什麼？」', v: 'ask' },
        { t: '「不要去。轉角不是一份工作，是你。」', v: 'refuse' },
        { t: '「去吧。你值得穩定的生活。」', v: 'take' },
        { t: '「如果……我們在夜市擺一台咖啡車呢？我出一半。」', sub: 'NT$15,000', v: 'cart', dis: st.p.money < 15000 },
      ]);
      st.f.w2Advice = c;
      if (c === 'cart' && Sys.pay(15000)) { await say('pei', '……咖啡車？在夜市？'); await narr('小沛愣了很久。然後她笑了，是那種很久沒看到的笑。'); await say('pei', '外婆以前就是在夜市擺攤的。'); Sys.ch('pei', { friend: 8, trust: 6 }); Sys.mem('pei', '你說要跟她一起在夜市擺咖啡車', 1, 'coffeeCart'); }
      else if (c === 'ask') { await say('pei', '……我想要一個有名字的地方。不是 Bloom 的名字。'); Sys.ch('pei', { comfort: 5 }); }
      else await say('pei', c === 'take' ? '……嗯。我再想想。' : '……你說得好簡單。');
    }
    await narr('那天晚上，大家坐到很晚。');
    if (here('hsiu')) {
      const b = st.f.w2Blame;
      if (['me', 'shared'].includes(b) || (b === 'hsiuBlamedYou' && Sys.hasMem('hsiu', 'swallowed'))) { await say('hsiu', '……敬，那份報告。'); await inner('他舉杯的時候看著你。你們都知道他在說什麼。'); }
      else if (['hsiu', 'warned'].includes(b)) await inner('阿修坐在離你最遠的位子。他整晚都在看手機。');
    }
    Sys.mem(SW.CORE.filter((i) => here(i)), '第二週的週三，大家在老位子坐到很晚', 1, 'w2gather', true);
  } });
  add({ id: 'w2_gather_off', kind: 'offscreen', day: 10, from: '21:30', cond: (st) => !st.f.w2GatherDone, run: (st) => {
    st.f.w2GatherDone = 'absent';
    const o = out();
    if (o === 'renew') { st.f.w2Debt = 'absent'; msg('group', 'lele', '週六我們公司借轉角辦活動！小沛說可以！🎉'); Sched.override('lele', at(13, '13:00'), at(13, '17:00'), 'cafe', 't1', '公司活動', 'w2event', { free: true }); }
    if (o === 'relocate') { st.f.w2Terms = st.cafe.will >= 60 ? 'fight' : 'accept'; msg('group', 'pei', `新地方的條件……我決定${st.f.w2Terms === 'fight' ? '去談談看' : '先接受'}。`); }
    if (o === 'close') { st.f.w2Advice = 'absent'; msg('pei', 'pei', 'Bloom 給了我 offer。你今天沒來，我好想聽聽你的意見。'); }
  } });

  // =====================================================================
  // C — 安森 says he is fine (people lie to you too)
  // =====================================================================
  add({ id: 'w2_anson', kind: 'talk', npc: 'anson', day: [9, 10, 11, 12], label: '安森說他很好', prio: 50, cond: (st) => !st.f.ansonW2, run: async (st) => {
    if (st.f.ansonCollapsed) { await say('anson', '牧師問我要不要繼續帶這週六的青年營。我說好。'); await say('anson', '我很好啦，真的。上週只是意外。'); }
    else { await say('anson', '這週又排滿了。週六有青年營，週日要分享見證。'); await say('anson', '不過我很好！'); }
    await narr('他笑得很用力。眼睛下面是兩片很深的影子。');
    const c = await choose([
      { t: '「你的『很好』，我不太相信。」', v: 'call' },
      { t: '「你不用有用，我們也會找你。」', sub: '你記得那晚他說的話', v: 'useful', if: K('ansonUseful') },
      { t: '「週六營會我去幫你。」', v: 'help' },
      { t: '「那就好。」', v: 'believe' },
    ]);
    st.f.ansonW2 = c;
    if (c === 'believe') { await say('anson', '嗯！謝謝關心！'); await inner('你們都知道他在說謊。你們都選擇了沒拆穿。'); return; }
    if (c === 'useful') {
      await narr('安森愣住了。');
      await say('anson', '……我喝醉那天說的，你還記得。');
      await narr('他低下頭，很久都沒有說話。然後他拿出手機，打了一段很短的訊息給牧師。');
      await say('anson', '我跟牧師說，這次營會我不帶了。……我手在抖，你看。');
      Sys.ch('anson', { trust: 10, comfort: 10 });
      Sys.mem('anson', '你跟他說「你不用有用，我們也會找你」', 1, 'notUseful');
      Sched.override('anson', at(13, '00:00'), at(13, '23:59'), 'city', 'park2', '第一次什麼都不做', 'ansonFree', { free: true });
      return;
    }
    if (c === 'call') {
      await say('anson', '……被你看穿了。');
      await say('anson', '那我要怎麼跟牧師說不？我從來沒有說過。');
      const d = await choose([{ t: '幫他一起想那封訊息', v: 'write' }, { t: '「週六我去幫你。」', v: 'help' }]);
      if (d === 'write') {
        await narr('你們在手機上打了刪、刪了打。最後送出去的是：「牧師，這週我需要休息。對不起，謝謝。」');
        await say('anson', '……就這樣？這麼短？');
        st.f.ansonW2 = 'free'; Sys.ch('anson', { trust: 6, comfort: 5 }); Sys.mem('anson', '你陪他寫了第一封說「不」的訊息', 1, 'saidNo');
        Sched.override('anson', at(13, '00:00'), at(13, '23:59'), 'city', 'park2', '第一次什麼都不做', 'ansonFree', { free: true });
        return;
      }
      st.f.ansonW2 = 'help';
    }
    // help on Saturday
    await say('anson', '……真的嗎？那我就不客氣了。早上九點，教會廚房。');
    Sched.override('anson', at(13, '08:45'), at(13, '12:30'), 'church', 'kitchen', '準備青年營', 'ansonCamp', { free: false });
    Sys.promise({ id: 'ansonCamp', who: 'anson', text: '幫安森準備青年營（教會）', map: 'church', from: at(13, '09:00'), until: at(13, '12:00'), kind: 'meet', weight: 10 });
  } });
  add({ id: 'w2_anson_camp', kind: 'scene', day: 13, where: 'church', from: '08:50', to: '12:30', cast: ['anson'], prio: 70, cond: (st) => st.f.ansonW2 === 'help' && !st.f.ansonCampDone, run: async (st) => {
    st.f.ansonCampDone = true;
    const p = Sys.pending('ansonCamp'); if (p) Sys.keep('ansonCamp', true);
    await narr('教會廚房。三十人份的早餐、四十份講義、一箱還沒充氣的球。');
    const r = await SW.MG.timing({ title: '青年營準備', rounds: 3, verb: '搞定！', labels: ['三十份蛋餅', '四十份講義', '一箱球'], zone: 0.18 });
    await say('anson', r.score > 60 ? '……一個早上就弄完了。以前我一個人要弄到半夜。' : '有點亂，但是好好笑。我好久沒有在廚房裡笑了。');
    await say('anson', '原來讓別人幫忙，是這種感覺。');
    Sys.ch('anson', { friend: 8, trust: 5 }); st.stats.helped++;
    Sys.mem('anson', '你陪他準備青年營，他第一次讓別人扛一半', 1, 'campHelp');
    await wait(150, '⏳ 你們把營會的東西準備好……');
  } });
  add({ id: 'w2_anson_relapse', kind: 'offscreen', day: 13, from: '11:00', cond: (st) => { const camp = Sys.prom('ansonCamp'); return (st.f.ansonW2 === 'believe' || (!st.f.ansonW2 && st.n.anson.energy < 45) || (camp && camp.status === 'broken')) && !st.f.ansonRelapse; }, run: (st) => {
    st.f.ansonRelapse = true;
    msg('group', 'pei', '安森在營會上暈倒了……現在在教會辦公室躺著，牧師陪著他。');
    later(20, 'group', 'lele', '又來了！！！這個人！！！');
    Sched.override('anson', at(13, '11:00'), at(14, '18:00'), 'away', null, '在家休息', 'ansonRelapse', { free: true });
  } });

  // =====================================================================
  // D — 米拉: the person who wants to be looked for
  // =====================================================================
  add({ id: 'w2_mira', kind: 'talk', npc: 'mira', day: [10, 11, 12, 13], label: '米拉想跟你聊聊', prio: 48, cond: (st) => !st.f.miraW2 && !!st.f.miraDecision, run: async (st) => {
    if (st.f.creditRevealed === 'owned' || st.f.w2Blame === 'mira') {
      st.f.miraW2 = 'cold';
      await say('mira', '……我本來有事想跟你說。');
      await say('mira', '算了。現在不太想。');
      await inner('她轉身的時候，你突然很想叫住她。你沒有。');
      return;
    }
    const d = st.f.miraDecision;
    if (d === 'go') {
      await say('mira', '我訂好機票了。三週後的星期六。');
      await say('mira', '桌上那盆黃金葛，你可以幫我養嗎？它叫 Debug。');
      const c = await choose([
        { t: '「好。我會養到你回來。」', v: 'plant' },
        { t: '「我會去找你。」', sub: '你記得她那晚說的話', v: 'find', if: K('miraEscape') },
        { t: '「……留下來。」', v: 'stay' },
      ]);
      st.f.miraW2 = c;
      if (c === 'plant') { await say('mira', '它很好養。跟我不一樣。'); Sys.ch('mira', { friend: 5 }); Sys.mem('mira', '你答應幫她養那盆叫 Debug 的黃金葛', 1, 'plant'); }
      else if (c === 'find') { await narr('米拉看著你。過了很久。'); await say('mira', '……你記得我那天說的話。'); await say('mira', '好。那我就不用一直回頭看了。'); Sys.ch('mira', { trust: 10, comfort: 8 }); Sys.mem('mira', '你說你會去找她', 1, 'willFind'); }
      else {
        await say('mira', '……你現在才說。');
        await narr('她沒有哭，也沒有笑。她只是把機票的確認信從手機裡叫出來，又關掉。');
        Sys.ch('mira', { attract: 4, tension: 4 }); Sys.mem('mira', '在她訂好機票之後，你叫她留下來', 0, 'askedStay');
        if (st.rel.mira.attract >= 45 && st.rel.mira.comfort >= 60) st.f.miraWavering = true;
      }
      return;
    }
    await say('mira', d === 'stay' ? '我留下來了。可是我最近一直在想，我是不是只是不敢走。' : '我說再等一年。可是一年後，我會不會又說再等一年？');
    const c = await choose([
      { t: '「留下來不是不敢。是一種選擇。」', v: 'choice' },
      { t: '「不管你在哪裡，我都會找你。」', sub: '你記得她那晚說的話', v: 'find', if: K('miraEscape') },
      { t: '「那就再申請一次。這次我陪你寫。」', v: 'push' },
    ]);
    st.f.miraW2 = c;
    if (c === 'choice') { await say('mira', '……一種選擇。嗯。我喜歡這個說法。'); Sys.ch('mira', { comfort: 6 }); }
    else if (c === 'find') { await say('mira', '……笨蛋。我就在這裡啊。'); await narr('她笑了。那是你這兩週第一次看到她真的笑。'); Sys.ch('mira', { trust: 8, comfort: 8 }); Sys.mem('mira', '你說不管她在哪裡你都會找她', 1, 'willFind'); }
    else { await say('mira', '……你真的很煩。（她打開了申請表）'); Sys.ch('mira', { friend: 5 }); st.f.miraReapply = true; }
  } });

  // =====================================================================
  // E — SATURDAY: favours come due
  // =====================================================================
  add({ id: 'w2_event', kind: 'scene', day: 13, where: 'cafe', from: '13:30', to: '17:00', cast: ['pei'], prio: 75, cond: (st) => out() === 'renew' && !st.f.w2EventDone, run: async (st) => {
    st.f.w2EventDone = true;
    const free = ['lele', 'quiet', 'absent'].includes(st.f.w2Debt);
    if (!free) {
      await narr('樂樂公司的新品發表。他們付了場地費，還多訂了兩百杯咖啡。');
      await narr('小沛在吧台後面偷偷對你比了一個讚。');
      if (st.f.w2Debt === 'pei' && here('lele')) { await say('lele', '……我後來想想，你說得對啦。'); await say('lele', '我付錢的時候，小沛抱了我一下。我差點哭。'); Sys.ch('lele', { tension: -6, trust: 4 }); }
      Sys.ch('pei', { comfort: 4 }, true); st.cafe.fund += 20000;
      return;
    }
    await narr('轉角塞滿了穿公司 T-shirt 的人。音響很大聲。小沛一個人在吧台後面，做了第八十杯拿鐵。');
    await narr('然後她不見了。後台的門半掩著。');
    const c = await choose([{ t: '去後台找她', v: 'back' }, { t: '去跟樂樂說', v: 'lele' }, { t: '捲起袖子，進吧台幫忙出杯', v: 'bar' }]);
    if (c === 'back') {
      await narr('小沛坐在一箱牛奶上面，圍裙還沒脫。');
      await say('pei', '我是不是很沒用？連「不要」都說不出口。');
      await say('pei', '大家幫我湊了那麼多錢。我覺得我這輩子都不能拒絕任何人了。');
      const d = await choose([{ t: '「被幫助，不代表你要用一輩子還。」', v: 1 }, { t: '「那我幫你說。」', v: 2 }, { t: '安靜地坐在她旁邊', v: 3 }]);
      if (d === 1) { await say('pei', '……真的嗎？'); Sys.ch('pei', { trust: 6, comfort: 6 }); }
      else if (d === 2) { await narr('你走出去，把音響關小了一半，跟樂樂的主管說活動要在四點結束。沒有人反對。'); Sys.ch('pei', { trust: 8 }); Sys.ch('lele', { tension: 3 }, true); }
      else { await narr('你們在後台坐了十分鐘。外面有人在喊「咖啡呢？」。小沛站起來，把圍裙綁緊。'); Sys.ch('pei', { comfort: 8 }); }
      Sys.mem('pei', '店裡被借走的那個週六，你在後台陪她', 1, 'backroom');
    } else if (c === 'lele') {
      await say('lele', '……她哭了？為什麼不跟我說？');
      await narr('樂樂衝進後台。你聽到她說了很多次「對不起」，然後是兩個人一起笑的聲音。');
      Sys.pch('lele', 'pei', { friend: 6 }); Sys.ch('lele', { trust: 3 }, true);
      later(60, 'lele', 'lele', '我跟公司申請了場地費。補給小沛。謝謝你叫我。');
      st.cafe.fund += 15000;
    } else {
      const r = await SW.MG.timing({ title: '吧台救援', rounds: 3, verb: '出杯！', labels: ['第八十一杯', '第一百杯', '最後一杯'], zone: 0.16 + st.p.skill.cook * 0.01 });
      await say('pei', r.score > 60 ? '……你什麼時候學會拉花的？' : '這杯拉花是……一隻狗？還是一朵雲？');
      Sys.ch('pei', { friend: 6 }); Sys.mem('pei', '你在她最忙的那天跳進吧台幫忙', 1, 'barHelp');
    }
  } });
  add({ id: 'w2_relocate_sat', kind: 'offscreen', day: 12, from: '22:00', cond: (st) => out() === 'relocate' && !st.f.w2RelocDone, run: (st) => {
    st.f.w2RelocDone = true;
    const t = st.f.w2Terms || 'accept', church = st.cafe.partner === 'church';
    if (t === 'fight') {
      const won = st.cafe.will >= 55 || (church && st.rel.anson.trust >= 60);
      st.f.w2TermsResult = won ? 'won' : 'lost';
      msg('group', 'pei', won ? (church ? '跟長輩談完了！Live 可以，酒不行，十點半結束。安森幫我說了好多話🥹' : '談下來了！條件改得比較合理了！') : '談了。沒有談成。……我先照他們的規矩來。');
    } else if (t === 'leave') {
      st.f.w2TermsResult = 'moved';
      msg('group', 'pei', '今晚的 Live 搬到好日子了！老蔡說他的店從來沒這麼吵過。他好像很開心。');
    } else {
      st.f.w2TermsResult = 'accepted';
      msg('group', 'pei', church ? '今晚的 Live 改成不插電，十點準時結束。有一位阿嬤坐在第一排聽完全場。' : '新規矩的第一週。店還在。我還在。');
    }
  } });
  add({ id: 'w2_close_sat', kind: 'offscreen', day: 13, from: '12:00', cond: (st) => out() === 'close' && !st.f.peiFuture, run: (st) => {
    const a = st.f.w2Advice;
    const choice = a === 'cart' ? 'cart' : a === 'take' ? 'bloom' : a === 'refuse' ? 'stay' : (st.cafe.will >= 58 || (K('peiPromise') && st.rel.pei.trust >= 60)) ? 'stay' : 'bloom';
    st.f.peiFuture = choice;
    if (choice === 'cart') {
      msg('group', 'pei', '咖啡車訂好了！！今晚東門夜市見！！外婆以前的攤位就在附近☕');
      for (const d of [13, 20, 27]) Sched.override('pei', at(d, '17:30'), at(d, '23:00'), 'city', 'market1', '轉角咖啡車', 'cart' + d, { free: true });
    } else if (choice === 'bloom') {
      msg('group', 'pei', '我答應 Bloom 了。下週一開始受訓。……外婆應該會原諒我吧。');
      later(5, 'group', 'lele', '小沛……🫂');
      for (let d = 15; d <= 33; d++) if ((d - 1) % 7 < 5) Sched.override('pei', at(d, '08:00'), at(d, '18:00'), 'away', null, '在 Bloom 上班', 'bloom' + d, { free: false });
    } else {
      msg('group', 'pei', '我拒絕 Bloom 了。我還不知道下一步是什麼，但我知道不是那裡。');
    }
  } });

  // =====================================================================
  // F — SUNDAY NIGHT: are we still us?
  // =====================================================================
  add({ id: 'w2_finale_setup', kind: 'offscreen', day: 14, from: '10:00', run: (st) => {
    const p = W2.place();
    const spots = { cafe: ['t1', 't2', 't3', 't4', 'counter'], bar: ['long1', 'long2', 'long3', 'long4', 'long5'], church: ['group1', 'group2', 'group3', 'kitchen', 'kitchen2'], studio: ['sofa', 'drums', 'guitar', 'booth', 'center'], office: ['tea1', 'tea2', 'meet1', 'meet2', 'lobby'] }[p];
    SW.CORE.forEach((id, i) => { if (id === 'anson' && st.f.ansonRelapse && Math.random() < 0.5) return; Sched.override(id, at(14, '18:45'), at(14, '22:30'), p, spots[i], '週日的聚會', 'w2fin_' + id, { free: true }); });
    msg('group', 'lele', `今晚七點，${W2.placeName()}！我有超級大事要宣布！！不准缺席！！`);
  } });
  W2.line = function (id) {
    const st = S(), has = (t) => Sys.hasMem(id, t);
    if (id === 'hsiu') {
      if (has('threatened')) return '……';
      if (has('tookBlame')) return K('hsiuDad') ? '你把我的名字從報告上拿掉了。我爸問我這週怎麼樣，我說很好。這次是真的。' : '你把我的名字從報告上拿掉了。我還在想要怎麼還你。';
      if (has('sharedBlame')) return '「算我們兩個的」。這句話我會記很久。';
      if (has('walkedWithHim')) return '那天在課長門口，我差點轉身就走。謝謝你站在後面。';
      if (has('swallowed')) return '報告的事……對不起。我那時候只想到自己。';
      if (has('namedHim') || has('warnedReport')) return '報告的事，我知道你寫的是事實。我只是還需要一點時間。';
      return st.f.featureOwner === 'player' ? '下週的分工，可以讓我挑一次嗎？（笑）' : '當 owner 好累。我現在比較懂課長了。';
    }
    if (id === 'pei') {
      if (st.f.bloomRevealed && st.f.bloomRevealed !== 'lie') return '……我還在想，要怎麼重新相信你。但我今天還是來了。';
      if (has('backroom')) return '謝謝你那天坐在牛奶箱旁邊。我在練習說「不要」了。';
      if (has('barHelp')) return '你那天的拉花，我拍照了。很醜。我要留一輩子。';
      if (st.f.w2Debt === 'pei') return '謝謝你那天替我說「不」。下次，我想自己說。';
      if (st.f.peiFuture === 'cart') return '昨天咖啡車賣了一百二十杯！外婆一定會喜歡夜市。';
      if (st.f.peiFuture === 'bloom') return '明天開始，我就是 Bloom 的店長了。你們要來喝喔。打八折。（她笑得有點用力）';
      if (st.f.peiFuture === 'stay') return '我拒絕了 Bloom。我還不知道下一步是什麼。但我知道我想要一個有名字的地方。';
      if (st.f.w2TermsResult === 'won') return '我們談下來了！你那天說「條件可以改」，我一直記著。';
      if (st.f.w2TermsResult === 'moved') return '週五的 Live 搬到好日子了。原來轉角不是一個地址。';
      if (st.f.w2TermsResult === 'accepted' || st.f.w2TermsResult === 'lost') return '新的轉角很安靜。安靜也不錯。……我在說服自己。';
      return '這週好長。但店還在，我們也還在。';
    }
    if (id === 'anson') {
      if (has('notUseful')) return '你那天說「你不用有用」。我回家哭了一個小時。昨天，我第一次什麼都沒做。';
      if (has('saidNo')) return '那封訊息，牧師回我：「早該這樣了。」原來大家都在等我說不。';
      if (has('campHelp')) return '謝謝你週六來幫忙。我第一次讓別人扛一半。';
      if (st.f.ansonRelapse) return '我又倒了一次。……這次，我會學乖的。應該吧。';
      return '這週我睡得比較好。真的。這次是真的。';
    }
    if (id === 'mira') {
      if (st.f.miraW2 === 'cold') return st.f.w2Blame === 'mira' ? '事故報告的事，我知道了。我只想說：我的測試範圍，是我自己訂的。' : '……我今天會坐在這裡，是因為小沛約的。';
      if (has('willFind')) return st.f.miraDecision === 'go' ? '你說你會來找我。我把這句話寫在機票的背面了。' : '你說你會找我。所以我決定，不用跑那麼遠了。';
      if (has('plant')) return 'Debug 就拜託你了。它很好養。我走了之後，記得跟它說說話。';
      if (has('askedStay')) return '你叫我留下來。我還在想。這是你第一次讓我這麼難決定。';
      if (st.f.miraReapply) return '我把申請表寫完了。還沒送出去。但寫完了。';
      return st.f.miraDecision === 'go' ? '還有兩週。好快。' : '留下來的第二週，比第一週好一點。';
    }
    if (id === 'lele') {
      if (st.f.w2Debt === 'pei') return '你那天害我很丟臉。……但你是對的。';
      if (st.f.w2Debt === 'lele' || st.f.w2Debt === 'quiet') return '週六的活動超成功！……雖然我後來才知道小沛在後台哭。我是不是很糟？';
      return '這週大家都好累喔。所以——';
    }
    return '';
  };
  add({ id: 'w2_finale', kind: 'scene', day: 14, from: '18:50', to: '22:30', where: ['cafe', 'bar', 'church', 'studio', 'office'], prio: 95, cond: (st) => !st.f.w2FinaleDone && st.p.map === W2.place() && SW.CORE.filter((i) => here(i)).length >= 3, run: async (st) => {
    st.f.w2FinaleDone = true;
    await narr(`週日晚上，${W2.placeName()}。一週前，大家在這裡敬了轉角。`);
    for (const id of ['hsiu', 'pei', 'anson', 'mira', 'lele']) { if (!here(id)) continue; const l = W2.line(id); if (l) await say(id, l); }
    if (here('lele')) {
      await say('lele', '咳咳。好，大事宣布。');
      await say('lele', '下週六，是本人的生日。我訂了 KTV 包廂。');
      await say('lele', '規則只有一個：真心話大冒險。不准說謊。');
    }
    const open = (st.lies || []).filter((l) => !l.exposed && !l.resolved && l.kind !== 'white');
    if (open.length) { await narr('桌上安靜了一秒。'); await inner(`你在心裡數了一下，自己還有 ${open.length} 件事沒有說。`); }
    else await narr('大家笑成一團。阿修說他要先練歌。米拉說她要先想好怎麼不回答。');
    const c = await choose([{ t: '舉杯：「敬新的位子。」', v: 1 }, { t: '舉杯：「敬還坐在一起的我們。」', v: 2 }, { t: '舉杯：「敬下週六。」', v: 3 }]);
    await narr(c === 1 ? '杯子碰在一起。有人的位子變高了，有人的位子變了地方。但大家還坐在同一張桌子。' : c === 2 ? '樂樂說你又在肉麻。但她舉得最高。' : '「下週六」——大家都笑了。只有幾個人笑得比較慢。');
    for (const id of SW.CORE) if (here(id)) Sys.ch(id, { friend: 2, comfort: 2 }, true);
    Sys.mem(SW.CORE.filter((i) => here(i)), '第二週的最後一晚，樂樂宣布了她的生日 KTV', 1, 'w2finale', true);
    await wait(60, '🌙 夜深了，大家陸續散去……');
    await W2.recap();
  } });
  add({ id: 'w2_finale_off', kind: 'phone', day: 14, from: '22:30', cond: (st) => !st.f.w2FinaleDone, run: (st) => {
    st.f.w2FinaleDone = 'absent';
    msg('group', 'lele', '{N} 你沒來！！！下週六我生日！KTV！真心話大冒險！不准說謊！！這次不准缺席！！');
  } });

  W2.recap = async function () {
    const st = S();
    st.f.w2RecapDone = true;
    const world = [];
    world.push(st.f.featureOwner === 'player' ? '💼 你成了這一季的 Feature Owner。' : st.f.featureOwner === 'hsiu' ? '💼 阿修成了這一季的 Feature Owner。' : '');
    world.push({ me: '📄 事故報告上，你寫了自己的名字。', process: '📄 事故報告上，寫的是「流程」。', warned: '📄 事故報告上，你寫了「我早就提醒過」。', hsiu: '📄 事故報告上，你寫了阿修的名字。', mira: '📄 事故報告上，你把責任推給了米拉的測試。', absent: '📄 事故那天你不在。課長替你寫了 owner。', shared: '📄 你答應和阿修一起扛那份報告。', hsiuSelf: '📄 阿修在報告上寫了自己的名字。', hsiuBlamedYou: '📄 報告上寫的是「驗證不足」——也就是你。' }[st.f.w2Blame] || '');
    const o = out();
    if (o === 'renew') world.push(['pei', 'mid'].includes(st.f.w2Debt) ? '☕ 樂樂的公司付了場地費。人情和生意，第一次分開了。' : '☕ 轉角被免費借走了一天。小沛在後台哭了一次。');
    if (o === 'relocate') world.push({ won: '☕ 新地方的條件談下來了。', moved: '🎸 週五的 Live 搬到了好日子。', accepted: '☕ 轉角接受了新地方的規矩。', lost: '☕ 小沛去談了，沒有談成。' }[st.f.w2TermsResult] || '☕ 轉角在新地方過了第一週。');
    if (o === 'close') world.push({ cart: '🛒 小沛在東門夜市擺起了「轉角咖啡車」。', bloom: '🟢 小沛答應當 Bloom 的店長。', stay: '🕯️ 小沛拒絕了 Bloom。' }[st.f.peiFuture] || '');
    world.push(st.f.ansonRelapse ? '🛌 安森在青年營又倒下了。' : ['useful', 'free'].includes(st.f.ansonW2) ? '🕊️ 安森第一次對牧師說了「不」。' : st.f.ansonW2 === 'help' ? '🍳 有人陪安森準備了青年營。' : '');
    world.push({ plant: '🪴 你答應幫米拉養那盆叫 Debug 的黃金葛。', find: '✈️ 你跟米拉說，你會去找她。', stay: '✈️ 在她訂好機票之後，你叫米拉留下來。', cold: '🧊 米拉這週不太跟你說話。', push: '📝 米拉重新寫了打工度假的申請表。' }[st.f.miraW2] || '');
    const prof = SW.Human.profile('這兩週');
    const html = `<div class="card-sec"><h4>這一週改變的事</h4><ul>${world.filter(Boolean).map((w) => `<li>${U.esc(w)}</li>`).join('')}</ul></div>${prof.html}
      <div class="card-sec"><h4>下週</h4><p>EP06〈秘密的保存期限〉：樂樂生日的 KTV。真心話大冒險，不准說謊。</p></div>
      <p class="muted">第三週會在之後的更新加入。你可以繼續生活——世界會照自己的步調前進。</p>`;
    await UI.card({ kicker: '第一季・第二週回顧', title: '我們還是我們嗎？', html, buttons: [{ t: '繼續生活', v: 1 }] });
  };
  const morning = Dir.morning;
  Dir.morning = async function () { if (!S().f.w2RecapDone && T.day() >= 15) await W2.recap(); return morning(); };
})(window.SW);
