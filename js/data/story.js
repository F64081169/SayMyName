'use strict';
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys, Dir = SW.Dir, H = SW.H, Sched = SW.Sched;
  const S = () => SW.S;
  const nm = (id) => SW.name(id);
  const say = (w, t, e) => UI.say(w, t, e);
  const me = (t) => UI.say('me', t);
  const narr = (t) => UI.say('narr', t);
  const choose = (o, p) => UI.choose(o, p);
  const wait = (m, l) => Sys.advance(m, l);
  const K = (f) => Sys.knows('player', f);
  const here = (id) => SW.W.present(id);
  const msg = (th, from, text, reply, exp) => Sys.msg(th, from, text, { reply, exp });
  const later = (m, th, from, text, reply, expM) => Sys.msgLater(m, th, from, text, reply, expM);
  const add = (st) => Dir.add(st);
  const R = SW.R;
  const at = T.at;
  const Story = SW.Story = {};
  const pendingOrKept = (id) => { const p = Sys.prom(id); return p && (p.status === 'pending' || p.status === 'kept'); };

  // =====================================================================
  // EPISODE CARDS & HUD HINTS
  // =====================================================================
  SW.EPISODES = {
    1: { kicker: 'EP01・星期一', title: '今天可以準時下班嗎？', lines: [['A線', '主管要你下午五點前解掉 Bug #4521。'], ['B線', '晚上七點，米拉幫小沛辦了驚喜生日派對。不要說出去。'], ['C線', '樂樂覺得阿修最近怪怪的。']] },
    2: { kicker: '第二天・星期二', title: 'Code Review 是一種格鬥技', lines: [['A線', '早上十點，阿修主持 code review。Feature Owner 的位子只有一個。'], ['B線', '樂樂今晚和男友約在好日子餐酒館。氣氛好像不太妙。'], ['C線', '小沛的笑容越來越用力了。']] },
    3: { kicker: 'EP02・星期三', title: '誰睡在我們家沙發上？', lines: [['A線', '新的 Bug，舊的承諾。'], ['B線', '剛分手的樂樂需要一個地方住。'], ['C線', '晚上七點，轉角老位子。有人有話要說。']] },
    4: { kicker: '第四天・星期四', title: '小組、秘密與走音的情歌', lines: [['A線', '主管要找人留守週五晚上的 release。'], ['B線', '安森邀你參加今晚的教會小組，主題是「安息」。'], ['C線', '回聲工作室的預約表上，有一個奇怪的名字。']] },
    5: { kicker: 'EP03・星期五', title: '最糟糕的星期五', lines: [['A線', '18:00 FW 2.3 release。'], ['B線', '20:00 轉角 Live。'], ['C線', '教會的社區愛宴、你的約會，還有快撐不住的安森——全部都在今晚。']] },
    6: { kicker: '第六天・星期六', title: '宿醉、房東與澳洲', lines: [['A線', '下午兩點，房東陳伯來到轉角。'], ['B線', '有人在想要不要離開台灣。'], ['C線', '樂樂的人生，也需要一個新的地址。']] },
    7: { kicker: '第一季・第一週完結', title: '我們還有地方可以坐嗎？', lines: [['A線', '下午三點，房東會給答覆。'], ['B線', '週日的教會、週日的河堤、週日晚上的焦慮。'], ['C線', '晚上，大家約好再坐在一起一次——不管在哪裡。']] },
    generic: (d) => ({ kicker: `第 ${d} 天・${T.dayName(d)}`, title: U.pick(['日子還在繼續', '新的一週，舊的我們', '世界記得你']), lines: [['A線', d === 8 ? '今天公布 Feature Owner。' : '工作還在繼續。'], ['B線', (S().cafe.outcome === 'close' ? '轉角不在了，但大家還是找得到地方坐。' : '轉角（或它的新家）還是大家的老位子。')], ['C線', '這個世界記得你上週做過的每一件事。']], note: '第一季後續的故事會在之後的更新加入。現在，你可以自由地生活。' }),
  };
  SW.HINTS = [
    { day: 1, to: '11:00', cond: () => Sys.pendingReplies().length > 0, text: () => `📱 有 ${Sys.pendingReplies().length} 則訊息等你回覆（右上角手機 / P）` },
    { day: 1, to: '10:00', cond: (s) => s.p.map === 'home' && !Sys.pendingReplies().length, text: '🚪 出門上班——或不要。公司在家的北邊（看右上角小地圖）', go: 'office' },
    { day: 1, to: '17:00', cond: (s) => !s.f.bug4521 && !Sys.pending('bug4521'), text: '🐞 主管想要 Bug #4521 五點前修好（公司・你的座位 💻）', go: 'office' },
    { day: 1, from: '17:00', to: '19:00', cond: (s) => K('party') && !s.f.partyDone && !Sys.pending('party'), text: '🎂 19:00 小沛的驚喜派對在好日子餐酒館', go: 'bar' },
    { day: 2, to: '10:30', text: '💻 10:00 Code Review（公司會議室）', go: 'office' },
    { day: 2, from: '20:40', to: '23:30', cond: () => K('breakup') && !S().f.leleComforted, text: '🌙 樂樂一個人在河濱公園的長椅上', go: 'city:park1' },
    { day: 3, cond: (s) => !!s.f.leleAskPending, text: '🏠 樂樂想借住：跟米拉商量一下' },
    { day: 3, from: '17:00', to: '21:30', cond: (s) => !s.f.gatherDone, text: '☕ 19:00 大家在轉角老位子聚會', go: 'cafe' },
    { day: 4, from: '18:30', to: '21:30', text: '⛪ 19:30 教會小組（可以去，也可以不去）', go: 'church' },
    { day: 4, from: '20:30', to: '22:40', cond: (s) => (s.f.studioClue || s.f.eavesHsiu || s.f.sawNotebook) && !K('hsiuSong'), text: '🎸 回聲工作室今晚好像有人在偷偷練歌', go: 'studio' },
    { day: 5, to: '20:30', text: '📅 今晚好多事撞在一起，打開手機「行程」看看' },
    { day: 6, from: '12:30', to: '16:00', cond: () => K('lease'), text: '☕ 小沛下午兩點要和房東談判', go: 'cafe' },
    { day: 7, from: '09:00', to: '11:00', text: '⛪ 10:00 主日聚會（想去就去）', go: 'church' },
    { day: 7, from: '13:30', to: '15:30', cond: () => K('lease'), text: '☕ 15:00 房東要給答覆', go: 'cafe' },
    { day: 7, from: '17:00', to: '22:30', cond: (s) => !!s.cafe.outcome && !s.f.finaleDone, text: () => `🌙 今晚大家在${Story.finalePlaceName()}再聚一次`, go: () => Story.finalePlace() },
  ];
  SW.EVENTS = [];
  const EV = (d, hm, text, known) => SW.EVENTS.push({ at: at(d, hm), text, known });
  EV(1, '19:00', '小沛的驚喜生日派對（好日子餐酒館）', () => K('party'));
  EV(2, '10:00', 'Code Review（公司會議室）', () => T.day() >= 2);
  EV(3, '19:00', '轉角老位子聚會', () => T.day() >= 3);
  EV(4, '19:30', '教會小組（主題：安息）', (s) => !!s.f.ansonInvited);
  EV(5, '16:00', '教會社區愛宴（需要人手備餐）', (s) => !!s.f.ansonInvited);
  EV(5, '18:00', 'FW 2.3 Release', (s) => !!s.f.releaseOwner);
  EV(5, '20:00', '轉角 Live「我們還有地方可以坐嗎？」', (s) => !!s.f.gigPlanned);
  EV(6, '14:00', '小沛和房東陳伯談租約', () => K('lease'));
  EV(7, '10:00', '主日聚會（光鹽教會）', () => T.day() >= 5);
  EV(7, '15:00', '房東給答覆：轉角的去留', () => K('lease'));

  // =====================================================================
  // DAY 1 — EP01〈今天可以準時下班嗎？〉
  // =====================================================================
  add({ id: 'd1_wake', kind: 'scene', day: 1, where: 'home', from: '08:40', to: '11:00', prio: 100, run: async (st) => {
    if (st.p.roommate === 'mira') {
      await narr('星期一，08:45。煙霧警報器在尖叫。');
      await say('mira', '早安。不要問。', '😑');
      await say('mira', '吐司機背叛了我。');
      const c = await choose([{ t: '幫她開窗、拿鍋蓋搧風', v: 1 }, { t: '拍照傳到群組', v: 2 }, { t: '翻身繼續睡', v: 3 }]);
      if (c === 1) { await say('mira', '……謝謝。你今天是好室友。'); Sys.ch('mira', { comfort: 3 }, true); }
      else if (c === 2) { await say('mira', '你敢。'); await narr('你已經按下送出了。群組裡樂樂回了十二個笑臉。'); Sys.ch('mira', { tension: 2 }, true); Sys.ch('lele', { friend: 2 }, true); }
      else { await say('mira', '……很好。我會記住的。'); }
    } else {
      await narr('星期一，08:45。你被掃地機器人「小強」撞醒——它卡在你的充電線上，已經嗶嗶叫了二十分鐘。');
      const c = await choose([{ t: '把小強救出來', v: 1 }, { t: '把它翻過來，看它無助地轉輪子', v: 2 }, { t: '再睡五分鐘', v: 3 }]);
      await narr(c === 1 ? '你救出小強。它發出一聲感激的「嗶」，然後撞上桌腳。' : c === 2 ? '小強的輪子在空中轉了十秒。你覺得它很像週一早上的自己。' : '五分鐘變成了十五分鐘。小強還在叫。');
    }
    await narr('手機震了三下。');
    msg('boss', 'boss', '今天下午五點前，Bug 能解掉嗎？', 'd1_boss', at(1, '13:00'));
    msg('mira', 'mira', '晚上七點小沛生日，記得來！好日子餐酒館。不要說出去。', 'd1_mira', at(1, '18:45'));
    msg('lele', 'lele', '我覺得阿修最近怪怪的，你知道什麼嗎？', 'd1_lele', at(1, '23:30'));
    Sys.learn('player', 'party', 'mira', true);
    st.f.trust_party = true;
    UI.toast(SW.R3 && SW.R3.mobile ? '📱 點右上角手機回訊息。走到發亮的門口出門。' : '📱 按 P（或點右上角手機）回訊息。走到發亮的門口出門。');
  } });
  R.d1_boss = [
    { t: '「沒問題！五點前搞定。」', fn: (st) => { st.f.bossPromise = 'yes'; Sys.promise({ id: 'bug4521', who: 'boss', text: '修好 Bug #4521', map: 'office', from: st.t, until: at(1, '17:00'), kind: 'task', onBreak: 'bossBroken', onKeep: 'bossKept', breakText: '答應五點前修好 4521，沒做到', noWarn: false }); later(2, 'boss', 'boss', '好。我跟客戶說了。'); } },
    { t: '「我盡量。」', fn: (st) => { st.f.bossPromise = 'try'; later(2, 'boss', 'boss', '嗯。有問題早點說。'); } },
    { t: '「老實說，可能要到明天。」', fn: (st) => { st.f.bossPromise = 'honest'; st.work.bossTrust += 1; later(2, 'boss', 'boss', '好，謝謝你老實說。明天中午前。'); } },
  ];
  H.bossBroken = () => { S().work.bossTrust -= 8; };
  H.bossKept = () => { S().work.bossTrust += 5; };
  R.d1_mira = [
    { t: '「一定到！」', fn: (st) => { Sys.promise({ id: 'party', who: 'mira', text: '小沛的驚喜生日派對（好日子餐酒館）', map: 'bar', from: at(1, '19:00'), until: at(1, '21:40'), kind: 'meet', auto: false, weight: 12, breakText: '你答應會去小沛的生日派對，最後沒出現', echo: 'party' }); later(2, 'mira', 'mira', '好。她以為只是跟我吃飯。七點前到，躲在長桌後面。'); } },
    { t: '「我盡量🙏」', fn: (st) => { Sys.promise({ id: 'party', who: 'mira', text: '盡量去小沛的生日派對', map: 'bar', from: at(1, '19:00'), until: at(1, '21:40'), kind: 'meet', auto: false, weight: 6, breakText: '你說會盡量去小沛的派對，最後沒來', echo: 'party' }); later(2, 'mira', 'mira', '「盡量」是工程師的「不會」。……開玩笑的。來就對了。'); } },
    { t: '「我可能要加班……」', fn: (st) => { st.f.partyWarned = true; later(2, 'mira', 'mira', '……好吧。那至少跟我說一聲。'); } },
  ];
  R.d1_lele = [
    { t: '「真的？哪裡怪？」', fn: (st) => { Sys.learn('player', 'rumorLele', 'lele'); later(2, 'lele', 'lele', '他昨天問我「被拒絕的人通常多久會好」，然後一直往我這邊看！你說他是不是喜歡我？？', 'd1_lele2', 600); } },
    { t: '「我幫你觀察看看。」', fn: (st) => { st.f.askHsiu = true; Sys.learn('player', 'rumorLele', 'lele'); later(2, 'lele', 'lele', '好！你是我的臥底🕵️ 我懷疑他喜歡我！！'); } },
    { t: '「別亂猜啦，他只是累。」', fn: () => { later(2, 'lele', 'lele', '哼，你一定知道什麼。'); } },
  ];
  R.d1_lele2 = [
    { t: '「有可能喔！」', fn: (st) => { st.f.rumorConfirmed = true; later(2, 'lele', 'lele', '我就知道！！我魅力無法擋！'); } },
    { t: '「別亂猜，問清楚比較好。」', fn: (st) => { st.f.rumorDoubt = true; Sys.ch('lele', { trust: 2 }, true); later(2, 'lele', 'lele', '好啦好啦……你好理性喔。'); } },
    { t: '「我去幫你問問。」', fn: (st) => { st.f.askHsiu = true; later(2, 'lele', 'lele', '你最好了！！'); } },
  ];

  add({ id: 'd1_absent', kind: 'phone', day: 1, from: '11:30', cond: (st) => !st.f.v_office_1, run: (st) => { msg('boss', 'boss', '你今天沒進公司？', 'd1_absent', at(1, '14:00')); } });
  R.d1_absent = [
    { t: '「我在家遠端，等等就進去。」', fn: (st) => { st.work.bossTrust -= 1; } },
    { t: '「我今天身體不太舒服……」', fn: (st) => { st.f.sickLie = true; st.work.bossTrust -= 1; later(3, 'boss', 'boss', '好，多休息。4521 我先找阿修看。'); st.f.bug4521 = st.f.bug4521 || 'hsiu'; st.work.hsiuScore += 4; } },
    { t: '「我今天想請一天假。」', fn: (st) => { st.work.bossTrust -= 3; later(3, 'boss', 'boss', '……下次早點說。'); } },
  ];

  add({ id: 'd1_mira_test', kind: 'approach', npc: 'mira', day: 1, where: 'office', from: '08:50', to: '14:30', prio: 50, cond: (st) => !st.f.miraAsked, run: async (st) => {
    st.f.miraAsked = true;
    await say('mira', '欸，{N}。下午三點可以幫我跑一輪 regression 嗎？');
    await say('mira', '一個小時就好。我四點要交報告，一個人跑不完。');
    const clash = !st.f.bug4521 && Sys.pending('bug4521') ? '（會占掉你修 Bug #4521 的一小時）' : '';
    const c = await choose([{ t: '「好，三點我去實驗室。」', sub: clash, v: 'yes' }, { t: '「我今天 Bug 很趕，可能沒辦法。」', v: 'no' }, { t: '「請我喝咖啡就幫你。」', sub: clash, v: 'deal' }]);
    if (c === 'no') { await say('mira', '……好吧。我自己來。'); Sys.ch('mira', { trust: 1 }, true); st.f.miraTestDeclined = true; return; }
    if (c === 'deal') { await say('mira', '成交。'); await narr('她把一杯美式放在你桌上。'); Sys.item('coffee', 1); Sys.ch('mira', { comfort: 2 }, true); }
    else await say('mira', '謝了。三點。不要忘記。');
    Sys.promise({ id: 'miraTest', who: 'mira', text: '幫米拉跑 regression（實驗室）', map: 'office', from: at(1, '15:00'), until: at(1, '16:30'), kind: 'task', weight: 12, onBreak: 'miraTestBroken', echo: 'miraTest' });
  } });
  add({ id: 'd1_mira_test_msg', kind: 'phone', day: 1, from: '10:30', to: '14:30', cond: (st) => !st.f.miraAsked && st.p.map !== 'office', run: (st) => { st.f.miraAsked = true; msg('mira', 'mira', '你今天會進公司嗎？下午三點可以幫我跑 regression 嗎？一小時就好。', 'd1_miratest', at(1, '14:50')); } });
  R.d1_miratest = [
    { t: '「好，三點到。」', fn: (st) => { Sys.promise({ id: 'miraTest', who: 'mira', text: '幫米拉跑 regression（實驗室）', map: 'office', from: at(1, '15:00'), until: at(1, '16:30'), kind: 'task', weight: 12, onBreak: 'miraTestBroken', echo: 'miraTest', quiet: false }); later(2, 'mira', 'mira', '謝了。'); } },
    { t: '「今天可能不行，抱歉。」', fn: (st) => { st.f.miraTestDeclined = true; later(2, 'mira', 'mira', '了解。'); } },
  ];
  H.miraTestBroken = function () {
    const st = S();
    const fol = st.p.follower;
    st.f.miraTestWhy = fol && (SW.CH[fol].date || st.p.partner === fol) ? '去約會' : st.p.map === 'home' ? '在家' : st.p.map === 'office' ? '忙自己的事' : '跑去做別的事';
    if (fol && SW.CH[fol].date) st.f.mondayDate = true;
  };

  add({ id: 'd1_lunch', kind: 'scene', day: 1, where: 'office', from: '12:05', to: '12:55', cast: ['mira', 'hsiu'], prio: 40, run: async (st) => {
    await narr('茶水間。米拉和阿修在微波爐前對峙。');
    await say('hsiu', '我先來的。');
    await say('mira', '你的便當是魚。我拒絕在魚之後微波我的飯。');
    await say('hsiu', '公告寫的是「海鮮類」。鯖魚是魚，不是海鮮。');
    await say('mira', '……魚，住在，海裡。', '😑');
    const c = await choose([{ t: '站米拉這邊：「魚就是海鮮。」', v: 'mira' }, { t: '站阿修這邊：「嚴格來說他沒錯。」', v: 'hsiu' }, { t: '趁亂把自己的便當插隊放進去', v: 'cut' }, { t: '趁亂偷看阿修手上的筆記本', v: 'peek' }]);
    if (c === 'mira') { Sys.ch('mira', { friend: 2 }, true); Sys.ch('hsiu', { tension: 2 }, true); await say('hsiu', '你們聯合起來欺負我。'); }
    else if (c === 'hsiu') { Sys.ch('hsiu', { friend: 3 }, true); await say('mira', '工程師的「嚴格來說」。'); }
    else if (c === 'cut') { st.work.legend += 1; await say('mira', '……你是第三勢力。'); await say('hsiu', '我們先聯手對付這個人。'); Sys.pch('hsiu', 'mira', { friend: 2 }); }
    else {
      await narr('阿修的筆記本上寫著：「副歌：如果你的 log 裡有我——」……然後被用力劃掉了。');
      st.f.sawNotebook = true;
      if (Math.random() < 0.4) { await say('hsiu', '你看什麼！'); Sys.ch('hsiu', { tension: 3 }, true); }
      UI.toast('🔍 阿修在寫……歌詞？');
    }
    await narr('最後他們還是坐在同一張桌子吃飯。一邊吵 log 格式。');
    Sys.pch('hsiu', 'mira', { friend: 1, attract: 1 });
    Sys.mem(['mira', 'hsiu'], '茶水間的「鯖魚是不是海鮮」辯論', 0, 'fishDebate', true);
  } });

  add({ id: 'd1_boss_check', kind: 'approach', npc: 'boss', day: 1, where: 'office', from: '13:30', to: '16:50', prio: 30, cond: (st) => !st.f.bug4521, run: async (st) => {
    await say('boss', '4521 怎麼樣了？客戶在等。');
    const c = await choose([{ t: '「快了，再一個小時。」', v: 1 }, { t: '「卡住了。可以找人一起看嗎？」', v: 2 }, { t: '「老實說，我在摸魚。」', v: 3 }]);
    if (c === 1) await say('boss', '好。五點前給我好消息。');
    else if (c === 2) { await say('boss', '去找阿修，他之前碰過電源管理。或是請米拉幫你重現。'); await say('boss', '會求救是好事。'); st.work.bossTrust += 2; }
    else { await say('boss', '……我會當作沒聽到。'); st.work.bossTrust -= 3; st.work.legend += 2; }
  } });

  add({ id: 'd1_1700', kind: 'offscreen', day: 1, from: '17:00', run: (st) => {
    if (st.f.bug4521 === 'ontime') { msg('boss', 'boss', '4521 客戶那邊確認沒問題了。做得好。'); st.work.bossTrust += 3; return; }
    if (st.f.bug4521 === 'hsiu') return;
    if (st.f.bossPromise === 'honest') return;
    msg('boss', 'boss', st.f.bossPromise === 'yes' ? '……五點了。答應之前要先評估。今晚能留下來把它弄完嗎？' : '4521 還沒好？今晚能留下來嗎？', 'd1_overtime', at(1, '19:00'));
  } });
  R.d1_overtime = [
    { t: '「我留下來。」', fn: (st) => { st.f.overtime = true; Sys.promise({ id: 'overtime1', who: 'boss', text: '今晚留在公司修完 Bug #4521', map: 'office', from: st.t, until: at(1, '21:00'), kind: 'task', onBreak: 'bossBroken' }); } },
    { t: '「今晚有約，明天一早處理。」', fn: (st) => { st.work.bossTrust -= 2; later(2, 'boss', 'boss', '好。明天十點前。'); } },
    { t: '「我請阿修幫忙看一下？」', fn: (st) => {
      if (st.rel.hsiu.friend >= 50) { st.f.bug4521 = 'hsiu'; st.f.owesHsiu = true; st.work.hsiuScore += 4; later(3, 'hsiu', 'hsiu', '好啦，我幫你看。你欠我一次。'); }
      else { st.work.bossTrust -= 1; later(3, 'hsiu', 'hsiu', '我今天也很忙。'); }
    } },
  ];

  // ---------- the party ----------
  async function partyCore(st, late) {
    const pk = Sys.pending('party'); if (pk) { pk.status = 'kept'; pk.done = st.t; st.stats.kept++; pk.late = late; }
    const spoiled = st.f.partySpoiled;
    const fol = st.p.follower || ['kai', 'yuna'].find((id) => SW.W.present(id));
    const inside = st.f.lastEnter && st.f.lastEnter.map === 'bar' && st.t - st.f.lastEnter.t > 20;
    if (!late) {
      await narr('好日子餐酒館的長桌。燈關了一半，大家躲在桌子後面。');
      await say('mira', '噓——她來了。');
      await wait(Math.max(0, at(1, '19:00') - st.t), false);
      if (spoiled) {
        await say('pei', '驚、驚喜——！', '😅');
        await say('pei', '……對不起我演得很爛。我早就知道了。');
        await narr('米拉慢慢轉頭看向你。');
        await say('mira', '……{N}。', '😐');
        if (spoiled === 'player') { Sys.ch('mira', { trust: -8, tension: 10 }); Sys.mem('mira', '你把小沛的驚喜派對說溜嘴了', -1, 'spoiled'); }
      } else {
        await narr('門被推開。小沛探頭進來——「米拉？為什麼燈——」');
        await say('lele', '生日快樂——！！！');
        await say('pei', '你們……你們幹嘛啦！', '😭');
        await say('pei', '我以為米拉要請我吃安慰晚餐！');
        Sys.npcCh('pei', { mood: 20 });
      }
    } else {
      await narr(inside ? '你回過神來，長桌那邊已經唱完生日快樂歌了。蛋糕只剩一半。' : '你推開好日子的門。長桌上的蛋糕只剩一半，蠟燭已經吹熄了。');
      const p = Sys.prom('party');
      if (p && p.who === 'mira' && !p.lateSent) { await say('mira', '……你來了。', '😑'); Sys.ch('mira', { trust: -3, tension: 4 }, true); }
      else await say('mira', '來了就好。坐。');
      await say('pei', '{N}！你來了！我還以為你被 Bug 吃掉了！');
    }
    if (fol && SW.CH[fol].date) {
      await narr(`所有人都看向你身邊的${nm(fol)}。`);
      await say('lele', '等一下。這位是？？？');
      const c = await choose([{ t: `「這是${nm(fol)}，我們……剛認識。」`, v: 1 }, { t: '「路上撿到的。」', v: 2 }]);
      await say(fol, c === 2 ? '……我是被撿到的。生日快樂。' : '你好，生日快樂！不好意思突然打擾。');
      await say('pei', '多一個人多一份祝福！坐坐坐！');
      Sys.ch(fol, { comfort: c === 1 ? 4 : -2 }, true);
      Sys.mem(['pei', 'lele', 'mira'], `你帶著約會對象${nm(fol)}突然出現在生日派對`, 0, 'partyDate', true);
    }
    const c = await choose([{ t: '舉杯：「小沛，謝謝你讓我們一直有地方可以坐。」', v: 'sincere' }, { t: '舉杯：「祝你今年的拉花，都長得像拉花。」', v: 'joke' }, { t: '舉杯：「生日快樂！乾杯！」', v: 'plain' }], late ? null : '輪到你說生日祝福了。');
    if (c === 'sincere') { await say('pei', '……你幹嘛突然這樣。'); await narr('小沛的笑容停了一秒。只有一秒。'); Sys.ch('pei', { friend: 5, trust: 3 }); }
    else if (c === 'joke') { await say('pei', '哈哈哈哈！你很煩！'); for (const id of SW.CORE) if (here(id)) Sys.ch(id, { comfort: 3 }, true); }
    else await say('lele', '乾杯——！！');
    const gifts = Object.keys(st.p.inv).filter((k) => SW.ITEMS[k] && SW.ITEMS[k].gift);
    if (gifts.length) {
      const g = await choose([{ t: '送她禮物', v: 1 }, { t: '（之後再說）', v: 0 }]);
      if (g) { UI.closeDialog(); await SW.Acts.gift('pei'); }
    }
    if (!late) {
      await narr('小沛的手機響了。她看了一眼螢幕，笑容僵住。');
      await say('pei', '我、我出去接一下。');
      const f = await choose([{ t: '過一會兒，跟出去看看', v: 'follow' }, { t: '幫她擋住大家的視線，假裝沒事', v: 'cover' }, { t: '繼續吃蛋糕', v: 'cake' }]);
      if (f === 'follow') {
        await narr('你在門邊聽到她壓低聲音——');
        await say('pei', '陳伯，我知道……週日前……十五萬……我會想辦法……');
        Sys.learn('player', 'lease', null);
        const g = await choose([{ t: '走過去，什麼都不說，抱抱她', v: 'hug' }, { t: '假裝沒聽到，回去', v: 'back' }]);
        if (g === 'hug') {
          await say('pei', '……你聽到了喔。', '🥲');
          await say('pei', '拜託先不要跟大家說。今天是我生日，我不想變成那種生日。');
          st.f.trust_lease = true; st.f.peiAskedSecret = true;
          Sys.ch('pei', { trust: 6, comfort: 4 });
          Sys.mem('pei', '生日那晚，你在餐酒館門口抱了接完房東電話的小沛', 1, 'bdayHug');
        }
      } else if (f === 'cover') {
        await say('mira', '她怎麼了？');
        await me('「沒事，接個電話而已。來，切蛋糕。」');
        Sys.ch('pei', { trust: 3 }, true); st.f.coveredPei = true;
      }
    } else {
      await say('mira', '（小聲）她剛剛接了一通電話，回來之後一直在笑。笑得很奇怪。');
      st.f.miraNoticedPei = true;
    }
    if (Sys.knows('lele', 'rumorLele') && !st.f.leleKnowsHsiu) {
      await say('lele', '（小聲）你看，阿修是不是一直往我這邊看？');
      const r = await choose([{ t: '「他看的是米拉吧。」', v: 'mira' }, { t: '「好像是耶！」', v: 'yes' }, { t: '「我不知道。」', v: 'no' }]);
      if (r === 'mira') { await say('lele', '……米拉？？？'); st.f.leleDoubt = true; Sys.forget('lele', 'rumorLele'); }
      else if (r === 'yes') { st.f.rumorConfirmed = true; await say('lele', '我就知道！'); }
    }
    if (here('anson') || late) {
      await narr('安森最後才到，眼睛下面掛著兩個黑眼圈。');
      await say('anson', '抱歉，家長會拖到現在。小沛，生日快樂。');
      await narr('他遞給小沛一張手寫卡片。字很工整，好像寫了很多遍。');
    }
    await wait(Math.max(30, at(1, '21:30') - st.t), '🎂 派對一路熱鬧到十點……');
    st.f.partyDone = late ? 'late' : 'ontime';
    const who = SW.CORE.filter((id) => id !== 'pei' || true);
    Sys.mem(who, late ? '一起幫小沛過生日（你遲到了）' : '一起幫小沛過了二十五歲生日', 1, 'party');
    for (const id of SW.CORE) Sys.ch(id, { friend: late ? 1 : 3, comfort: 2 }, true);
  }
  add({ id: 'd1_party', kind: 'scene', day: 1, where: 'bar', from: '18:20', to: '19:40', cast: ['mira'], prio: 90, cond: (st) => !st.f.partyDone, run: (st) => partyCore(st, T.mod() > 19 * 60 + 10) });
  add({ id: 'd1_party_late', kind: 'scene', day: 1, where: 'bar', from: '19:40', to: '21:40', prio: 90, cond: (st) => !st.f.partyDone && st.fired.d1_party === undefined, run: (st) => partyCore(st, true) });
  add({ id: 'd1_party_absent', kind: 'offscreen', day: 1, from: '21:40', cond: (st) => !st.f.partyDone, run: (st) => {
    st.f.partyDone = 'absent';
    msg('group', 'pei', '謝謝大家！！我今天超級幸福🎂🎂🎂');
    later(1, 'group', 'mira', '（照片：長桌、蛋糕、五個人，和一張空著的椅子）');
    later(2, 'group', 'lele', '{N} 你去哪了啦！！');
    const p = Sys.prom('party');
    if (p && p.status === 'pending') Sys.breakP('party');
    later(5, 'pei', 'pei', '沒關係啦～下次補請我咖啡😆');
    Sys.ch('pei', { friend: -2 }, true);
    if (st.f.partyWarned) { later(8, 'mira', 'mira', '我們有留蛋糕給你。'); st.f.fridgeCake = st.p.roommate === 'mira' ? '給加班的笨蛋。——米拉' : null; Sys.ch('mira', { trust: 1 }, true); }
    else if (st.p.roommate === 'mira') st.f.fridgeCake = '給爽約的室友。不是原諒你，是蛋糕不能浪費。——米拉';
    st.f.miraNoticedPei = true;
    Sys.pch('hsiu', 'mira', { attract: 4, friend: 2 });
  } });
  add({ id: 'd1_night_home', kind: 'scene', day: 1, where: 'home', from: '21:40', to: '23:59', cast: ['mira'], prio: 20, cond: (st) => st.p.roommate === 'mira', run: async (st) => {
    const broke = Sys.prom('party') && Sys.prom('party').status === 'broken';
    if (broke) {
      await narr('米拉坐在沙發上，電視開著，但沒有聲音。');
      await say('mira', '冰箱有蛋糕。留給你的。');
      const c = await choose([{ t: '「對不起，今天……」', v: 1 }, { t: '「謝謝。」', v: 2 }]);
      await say('mira', c === 1 ? '明天再說。我累了。' : '嗯。');
      await narr('她走回房間，輕輕關上門。');
      return;
    }
    if (st.f.partyDone === 'absent') { await say('mira', '你回來啦。冰箱有蛋糕。'); return; }
    await say('mira', '今天謝謝你來。小沛很開心。');
    await say('mira', '……不過她接了那通電話之後，就怪怪的。你有注意到嗎？');
    const c = await choose([{ t: '「她跟我說了一些事……但我答應不說。」', v: 'keep', if: K('lease') }, { t: '把租約的事告訴米拉', v: 'tell', if: K('lease') }, { t: '「沒注意耶。」', v: 'no' }]);
    if (c === 'keep') { await say('mira', '……好。那我不問。'); await say('mira', '你是個守得住秘密的人。這很好。'); Sys.ch('mira', { trust: 4 }); }
    else if (c === 'tell') { await me('「她的租約出問題了。週日前要湊十五萬。」'); Sys.tell('mira', 'lease'); await say('mira', '……她什麼都沒跟我們說。'); }
    else await say('mira', '嗯。可能是我想太多。');
  } });
  add({ id: 'd1_night_solo', kind: 'phone', day: 1, from: '22:30', cond: (st) => st.f.partyDone === 'ontime' || st.f.partyDone === 'late', run: () => { msg('pei', 'pei', '今天謝謝你來😊 我很開心。真的。'); } });

  // =====================================================================
  // DAY 2
  // =====================================================================
  add({ id: 'd2_morning', kind: 'phone', day: 2, from: '08:00', run: (st) => {
    msg('boss', 'boss', '10 點 code review，阿修主持。準時。');
    msg('anson', 'anson', '週四晚上的小組，要來嗎？不勉強😊 主題是「安息」——我自己最需要的那種。', 'd2_anson', at(4, '19:00'));
    st.f.ansonInvited = true;
    if (K('lease') && st.f.trust_lease) msg('pei', 'pei', '昨天的事……可以先不要跟大家說嗎？我還沒準備好。', 'd2_pei', at(3, '23:00'));
  } });
  R.d2_anson = [
    { t: '「好，我會去。」', fn: (st) => { Sys.promise({ id: 'group', who: 'anson', text: '教會小組（光鹽教會）', map: 'church', from: at(4, '19:30'), until: at(4, '21:00'), kind: 'meet', auto: false, weight: 6 }); later(2, 'anson', 'anson', '太好了！我會泡高山茶😊'); } },
    { t: '「我考慮一下。」', fn: () => { later(2, 'anson', 'anson', '好～隨時都歡迎。'); } },
    { t: '「我不太習慣教會，但謝謝你。」', fn: (st) => { st.f.ansonInviteFri = true; later(2, 'anson', 'anson', '完全理解！那週五來社區愛宴吃飯？不用信什麼，吃就好😄'); } },
  ];
  R.d2_pei = [
    { t: '「好，我不說。」', fn: (st) => { st.f.keepLeaseSecret = true; Sys.ch('pei', { trust: 3 }, true); later(2, 'pei', 'pei', '謝謝你。🙏'); } },
    { t: '「我們都想幫你。讓大家知道吧？」', fn: (st) => { st.cafe.will += 2; later(2, 'pei', 'pei', '……我知道。再給我兩天。'); } },
    { t: '「需要什麼就跟我說，不用客氣。」', fn: (st) => { st.cafe.will += 3; Sys.ch('pei', { trust: 2 }, true); later(2, 'pei', 'pei', '嗯。有你這句話就夠了。'); } },
  ];

  add({ id: 'd2_code_review', kind: 'scene', day: 2, where: 'office', from: '09:55', to: '11:30', cast: ['hsiu'], prio: 60, run: async (st) => {
    await narr('會議室。阿修把投影打開，清了清喉嚨。整個韌體組都在。');
    const done = st.f.bug4521;
    if (done === 'ontime' || done === 'late') {
      await say('hsiu', '今天 review 4521 的 patch。寫得……還可以。');
      await say('hsiu', '但這裡為什麼要同步等待時脈？會拖慢喚醒時間。');
      const c = await choose([{ t: '「時脈沒穩就讀 NAND 會壞資料。6ms 換 3% 客訴不划算。」', v: 'tech' }, { t: '「你說得對，我再改。」', v: 'concede' }, { t: '「你是嫉妒我修得比你快吧。」', v: 'jab' }]);
      if (c === 'tech') { if (st.p.skill.debug >= 3) { await say('hsiu', '……好。有道理。'); Sys.ch('hsiu', { trust: 4 }); st.work.perf += 1; } else { await say('hsiu', '可是你的 log 顯示的是另一回事。'); await narr('你們吵了二十分鐘。最後課長說：「先 merge，下週再說。」'); } }
      else if (c === 'concede') { await say('hsiu', '……喔。好。'); await narr('阿修好像有點失望——他準備了一整套反駁。'); Sys.ch('hsiu', { friend: 2 }, true); st.work.bossTrust -= 1; }
      else { await say('hsiu', '……嫉妒？', '😠'); Sys.ch('hsiu', { tension: 6 }); st.work.legend += 1; }
    } else if (done === 'hsiu') {
      await say('hsiu', '4521 是我昨晚修的。不用謝。');
      const c = await choose([{ t: '當著大家的面說：「謝謝你，真的。」', v: 'thank' }, { t: '「我本來也快修好了。」', v: 'nope' }]);
      if (c === 'thank') { await narr('會議室安靜了一秒。阿修的耳朵紅了。'); await say('hsiu', '……不、不客氣。'); Sys.ch('hsiu', { friend: 5, trust: 3 }); st.work.hsiuScore += 3; Sys.mem('hsiu', '你在大家面前謝謝他', 1, 'praisedPublic'); }
      else { Sys.ch('hsiu', { tension: 4 }, true); await say('hsiu', '喔。好喔。'); }
    } else {
      await say('hsiu', '既然 4521 還沒人修好，我們先看我的 GC patch。');
      const c = await choose([{ t: '當著大家的面稱讚他的寫法', v: 'praise' }, { t: '指出一個真正的問題', v: 'find' }, { t: '低頭滑手機', v: 'phone' }]);
      if (c === 'praise') { await say('hsiu', '……謝、謝謝。'); await narr('他整場會議都坐得特別直。'); Sys.ch('hsiu', { friend: 5 }); Sys.mem('hsiu', '你在 code review 上當眾稱讚他', 1, 'praisedPublic'); }
      else if (c === 'find') { if (st.p.skill.debug >= 3) { await say('hsiu', '……被你抓到了。好。我改。'); Sys.ch('hsiu', { trust: 3 }); st.work.perf += 1; } else { await say('hsiu', '那不是問題，那是設計。'); Sys.ch('hsiu', { tension: 3 }, true); } }
      else { st.work.bossTrust -= 2; }
    }
    await narr('會議快結束時，林課長推門進來。');
    await say('boss', '順便說一下。這季要選一位 Feature Owner，你們兩個都是候選人。下週一公布。');
    await narr('你和阿修同時看向對方。');
    st.f.featureRace = true;
  } });

  add({ id: 'd2_breakup_witness', kind: 'scene', day: 2, where: 'bar', from: '19:35', to: '20:40', cast: ['lele', 'zhe'], prio: 60, run: async (st) => {
    await narr('你一走進好日子，就看到卡座那邊的氣氛不太對。');
    await say('zhe', '我覺得我們……想要的東西不一樣。');
    await say('lele', '你是說，你想要的東西裡面，沒有我？');
    Sys.learn('player', 'breakup', null, true);
    const c = await choose([{ t: '走過去，坐到樂樂旁邊', v: 'sit' }, { t: '假裝沒看到，坐吧台', v: 'hide' }, { t: '傳訊息給米拉求救', v: 'mira' }]);
    if (c === 'sit') {
      await narr('阿哲看了你一眼，低聲說了句「對不起」，結帳走了。');
      await say('lele', '……{N}。你可以陪我一下嗎？', '🥲');
      await narr('你們在卡座坐到店打烊。她什麼都說了，從第一次約會的夜市，到他咖啡要幾分糖。');
      Sys.ch('lele', { friend: 6, trust: 6, comfort: 4 });
      Sys.mem('lele', '樂樂分手那晚，你坐到她身邊', 1, 'breakupNight');
      st.f.leleComforted = 'player';
      await wait(60, false);
    } else if (c === 'mira') {
      msg('mira', 'me', '樂樂在好日子分手了，你可以來嗎？');
      later(2, 'mira', 'mira', '……我十分鐘到。');
      st.f.leleComforted = 'mira'; Sys.pch('lele', 'mira', { friend: 8, tension: -6 });
      Sys.ch('mira', { trust: 2 }, true);
    } else { await narr('你點了一杯特調，盯著吧台的木紋。身後傳來一聲很輕的啜泣。'); st.f.sawBreakupHid = true; }
  } });
  add({ id: 'd2_breakup_off', kind: 'offscreen', day: 2, from: '20:45', run: (st) => {
    st.f.leleBrokeUp = true; st.f.leleHeartbroken = true; st.n.lele.mood = 25;
    msg('group', 'lele', '我分手了。不要問。');
    later(1, 'group', 'lele', '其實可以問。');
    later(2, 'group', 'lele', '他說我這週要搬出去😭😭😭');
    later(4, 'group', 'pei', '樂樂我在！！要不要來店裡！');
    later(5, 'group', 'anson', '我在，打給我。');
    later(6, 'group', 'hsiu', '……要我幫忙搬東西嗎');
    for (const id of SW.CORE.concat('player')) Sys.learn(id, 'breakup', 'lele', true);
  } });
  add({ id: 'd2_park', kind: 'talk', npc: 'lele', day: 2, from: '20:40', to: '23:30', where: 'city', label: '坐到樂樂旁邊', cond: (st) => !st.f.leleComforted || st.f.leleComforted === 'mira', run: async (st) => {
    await narr('樂樂坐在河堤的長椅上，手裡拿著一杯已經不冰的珍奶。');
    await say('lele', '……你怎麼知道我在這裡？');
    await choose([{ t: '「我猜的。你難過的時候都會來看河。」', v: 1 }, { t: '「群組看到的。」', v: 2 }, { t: '（什麼都不說，坐下來）', v: 3 }]);
    await say('lele', '他說，跟我在一起很累。');
    const c = await choose([{ t: '「我在這裡。你想說多久都可以。」', v: 'listen' }, { t: '「他不值得。」', v: 'bash' }, { t: '「要不要去吃鹹酥雞？」', v: 'food' }]);
    if (c === 'listen') { await narr('她說了很久。你一直聽。'); Sys.ch('lele', { trust: 6, comfort: 4 }); }
    else if (c === 'bash') { await say('lele', '……對。對！他不值得！（她大聲對著河喊了一次）'); Sys.ch('lele', { friend: 3 }, true); }
    else { await say('lele', '……你真的很懂我。'); Sys.money(-120); Sys.ch('lele', { friend: 4, comfort: 3 }); }
    await say('lele', '我這週要搬出他家……我不知道要去哪裡。');
    st.f.leleComforted = 'player';
    Sys.mem('lele', '分手那晚，你陪樂樂坐在河堤', 1, 'parkNight');
    await wait(45, false);
  } });
  add({ id: 'd2_anson_off', kind: 'offscreen', day: 2, from: '22:30', cond: (st) => !st.f.leleComforted, run: (st) => {
    st.f.leleComforted = 'anson'; Sys.npcCh('anson', { energy: -15 }); Sys.pch('anson', 'lele', { friend: 5 });
    msg('anson', 'anson', '我剛陪樂樂走回去。她還好。……我也還好。');
  } });

  add({ id: 'studio_band', kind: 'talk', npc: 'pei', where: 'studio', dow: [1, 3], from: '20:00', to: '22:00', once: false, cooldown: 1200, label: '聽小沛練團', run: async (st) => {
    await narr('回聲工作室裡，轉角樂團正在練一首新歌。小沛閉著眼睛唱，聲音比平常低。');
    const c = await choose([{ t: '拿起吉他加入', v: 'jam' }, { t: '坐在沙發上聽', v: 'listen' }]);
    if (c === 'jam') {
      const r = await SW.MG.rhythm({ title: '轉角樂團・即興', len: 18, partner: 'pei' });
      if (r.score > 70) { await say('pei', '欸！你跟上我了！週五要不要一起上台？'); st.f.peiJam = true; Sys.ch('pei', { friend: 4, attract: 2 }); }
      else await say('pei', '哈哈，有幾段很有味道！再練練！');
      Sys.skill('guitar', 0.4);
    } else { Sys.ch('pei', { comfort: 3 }, true); }
    if (!K('lease') && st.rel.pei.trust >= 50 && st.cafe.outcome === null) await say('pei', '……這首是我寫給轉角的。如果有一天它不在了，至少還有這首歌。');
    await wait(45, false);
  } });

  // =====================================================================
  // DAY 3 — EP02〈誰睡在我們家沙發上？〉
  // =====================================================================
  add({ id: 'd3_lele_ask', kind: 'phone', day: 3, from: '08:30', run: (st) => {
    msg('lele', 'lele', '{N}……我可以借住你家沙發幾天嗎？阿哲要我這週搬走，我還沒找到房子😭', st.p.housing === 'shared' ? 'd3_lele_shared' : 'd3_lele_solo', at(3, '18:00'));
  } });
  const leleIn = (st, rules) => { st.f.leleStay = 'player'; st.f.leleRules = !!rules; Sys.ch('lele', { friend: 6, trust: 4 }); Sys.mem('lele', '樂樂失戀無家可歸時，你讓她借住', 1, 'leleStay'); };
  R.d3_lele_solo = [
    { t: '「好啊，今晚就過來。」', fn: (st) => { leleIn(st); later(2, 'lele', 'lele', '你是天使！！我今晚九點到！我會很安靜！（我不會）'); } },
    { t: '「可以，但最多三晚，還要幫忙倒垃圾。」', fn: (st) => { leleIn(st, true); later(2, 'lele', 'lele', '成交！我是最好的房客！'); } },
    { t: '「我家真的太小了……抱歉。」', fn: (st) => { st.f.leleRefused = true; Sys.ch('lele', { friend: -2 }, true); later(2, 'lele', 'lele', '沒關係！我再問問看！💪'); } },
  ];
  R.d3_lele_shared = [
    { t: '「我得先問米拉。」', fn: (st) => { st.f.leleAskPending = true; later(2, 'lele', 'lele', '好！拜託拜託！🙏'); } },
    { t: '「沒問題，今晚過來！」（不問米拉）', fn: (st) => { leleIn(st); st.f.overrodeMira = true; later(2, 'lele', 'lele', '耶！！米拉也OK嗎？'); Sys.later(240, 'miraOverride', {}); } },
    { t: '「不太方便，抱歉。」', fn: (st) => { st.f.leleRefused = true; Sys.ch('lele', { friend: -2 }, true); later(2, 'lele', 'lele', '了解！我再想辦法！'); } },
  ];
  H.miraOverride = () => { const st = S(); Sys.ch('mira', { tension: 10, trust: -5 }); Sys.mem('mira', '你沒問她，就讓樂樂住進你們家', -1, 'override', true); msg('mira', 'mira', '樂樂說她今晚要住我們家？你什麼時候打算告訴我？'); };
  add({ id: 'd3_mira_negotiate', kind: 'talk', npc: 'mira', day: 3, label: '跟米拉商量：樂樂想借住', prio: 40, cond: (st) => !!st.f.leleAskPending, run: async (st) => {
    st.f.leleAskPending = false;
    await say('mira', '樂樂要來住？');
    const broke = st.prom.some((p) => p.who === 'mira' && p.status === 'broken');
    if (broke) await say('mira', '你連答應我的事都會忘了，現在要我相信你會管好借住規則？');
    const c = await choose([{ t: '「我們訂規則：三晚、她出菜錢、十一點後安靜。」', v: 'rules' }, { t: '「你決定。你說不行就不行。」', v: 'veto' }, { t: '「這也是我家。我想讓她來。」', v: 'force' }, { t: '「老實說我也有點怕，但我不想讓她一個人。」', v: 'honest' }]);
    if (c === 'rules') {
      if (st.rel.mira.trust >= 45) { await say('mira', '……可以。規則寫下來，貼冰箱。'); leleIn(st, true); Sys.ch('mira', { trust: 2 }, true); }
      else { await say('mira', '規則誰來執行？你嗎？'); await say('mira', '……算了。讓她來吧。但我不負責。'); leleIn(st, true); Sys.ch('mira', { tension: 4 }, true); }
    } else if (c === 'veto') {
      Sys.ch('mira', { trust: 5 });
      if (Sys.pair('lele', 'mira').friend >= 45) { await say('mira', '……讓她來吧。她現在需要人。'); leleIn(st); }
      else { await say('mira', '我真的沒辦法。抱歉。'); st.f.leleRefused = true; msg('lele', 'me', '米拉那邊不太方便……對不起。'); later(2, 'lele', 'lele', '沒關係！真的！我再問問！'); }
    } else if (c === 'force') { await say('mira', '……好。隨便你。', '😶'); leleIn(st); Sys.ch('mira', { tension: 10, trust: -5 }); Sys.mem('mira', '你說「這也是我家」，硬讓樂樂住進來', -1, 'force'); }
    else { await say('mira', '……你這個人。'); await say('mira', '好吧。三晚。'); leleIn(st, true); Sys.ch('mira', { comfort: 4, trust: 2 }); }
    if (st.f.leleStay === 'player') msg('lele', 'me', '米拉說OK！今晚過來吧！');
  } });
  add({ id: 'd3_lele_decide', kind: 'offscreen', day: 3, from: '12:00', cond: (st) => !!st.f.leleRefused || (!st.f.leleStay && T.mod() >= 18 * 60), run: (st) => {
    if (st.f.leleAskPending) {
      st.f.leleAskPending = false;
      if (Sys.pair('lele', 'mira').friend >= 50) { st.f.leleStay = 'player'; Sys.ch('mira', { tension: 4 }, true); msg('mira', 'mira', '樂樂直接來問我了。我說好。……你應該先跟我討論的。'); return; }
    }
    if (st.f.rumorConfirmed && !st.f.leleKnowsHsiu) {
      st.f.leleStay = 'hsiu';
      msg('group', 'lele', '阿修說我可以睡他家沙發！！（他沒說，是我說的，他沒拒絕）');
      later(2, 'group', 'hsiu', '……我有拒絕。只是你沒聽到。');
      Sys.pch('hsiu', 'lele', { friend: 3, tension: 6 });
    } else {
      st.f.leleStay = 'cafe';
      msg('group', 'pei', '樂樂這幾天先睡店裡的後台～有咖啡機的那種五星級！');
      later(3, 'group', 'lele', '小沛是我的救命恩人🥹');
      Sys.learn('lele', 'lease', 'pei', true);
      Sys.pch('lele', 'pei', { friend: 5 });
    }
  } });
  add({ id: 'd3_lele_movein', kind: 'scene', day: 3, where: 'home', from: '20:30', to: '23:59', cast: ['lele'], prio: 50, cond: (st) => st.f.leleStay === 'player', run: async (st) => {
    await narr('晚上九點。樂樂出現在門口：兩個行李箱、三個購物袋，和一隻比她還大的鯊魚玩偶。');
    await say('lele', '這是「阿哲的罪」。我要抱著它睡，直到我原諒全人類。');
    if (here('mira')) { await say('mira', '……那隻鯊魚不能上我的椅子。'); await say('lele', '好！'); await narr('她把鯊魚放在米拉的椅子上。'); }
    const c = await choose([{ t: '幫她把沙發鋪好', v: 'bed' }, { t: '立規矩：浴室時間表', v: 'rule' }, { t: '一起吃宵夜', v: 'food' }]);
    if (c === 'bed') { await say('lele', '你連枕頭套都幫我換了……我要哭了。'); Sys.ch('lele', { comfort: 4 }); }
    else if (c === 'rule') { await say('lele', '好嚴格喔！但我愛你！'); if (here('mira')) Sys.ch('mira', { trust: 3 }, true); }
    else { Sys.money(-150); await narr('你們吃完一整盒鹹酥雞。樂樂說了三次「我很好」，一次比一次小聲。'); Sys.ch('lele', { friend: 4 }); if (here('mira')) Sys.ch('mira', { comfort: 2 }, true); }
    Sys.mem(SW.W.npcsHere().filter((i) => SW.CH[i].core), '樂樂抱著鯊魚住進你家', 1, 'shark');
  } });

  // Monday's broken promise comes back
  add({ id: 'd3_mira_confront', kind: 'approach', npc: 'mira', day: [2, 3, 4, 5], from: '08:00', to: '22:30', prio: 70, cond: (st) => {
    const b = ['miraTest', 'party'].map((id) => Sys.prom(id)).filter((p) => p && p.status === 'broken' && !st.f['apol_' + p.id]);
    return b.length > 0 && T.day() >= 3;
  }, run: async (st) => {
    const broken = ['miraTest', 'party'].map((id) => Sys.prom(id)).filter((p) => p && p.status === 'broken');
    const why = st.f.miraTestWhy || (st.f.mondayDate ? '去約會' : '做別的事');
    await say('mira', '我想跟你說一件事。');
    if (broken.some((p) => p.id === 'miraTest')) await say('mira', `我不是生氣你${why === '去約會' ? '去約會' : why === '在家' ? '在家休息' : '去做別的事'}。`);
    else await say('mira', '我不是生氣你沒來小沛的派對。');
    await say('mira', '我只是以為，你至少會跟我講一聲。');
    const canFix = st.p.map === 'office' && !T.weekend();
    const c = await choose([{ t: '「對不起。我真的應該先說。」', v: 'sorry' }, { t: '「我那時候真的很忙……」', v: 'excuse' }, { t: '「我現在就補做測試給你。」', v: 'fix', if: canFix }, { t: '開玩笑：「我那天是去拯救世界了。」', v: 'joke' }, { t: '（直接走開）', v: 'leave' }]);
    for (const p of broken) st.f['apol_' + p.id] = c;
    if (c === 'sorry') { await say('mira', '……嗯。下次。'); Sys.ch('mira', { tension: -8, trust: 3 }); Sys.mem('mira', '你為爽約的事好好道了歉', 1, 'apolMira', true); }
    else if (c === 'excuse') { await say('mira', '大家都很忙。我也很忙。'); Sys.ch('mira', { tension: 2 }); }
    else if (c === 'fix') {
      await say('mira', '……現在？好。');
      const r = await SW.MG.debug(SW.Puzzles.forHelp('mira'), { partner: 'mira', title: '補跑米拉的 regression' });
      await wait(60, '⏳ 你們把那一輪 regression 補完……');
      await say('mira', r.solved ? '……好。這樣我比較能接受。' : '沒跑完。但你有回來，這比較重要。');
      Sys.ch('mira', { tension: -10, trust: 6 }); Sys.mem('mira', '你回來補跑了那一輪測試', 1, 'madeUp');
    } else if (c === 'joke') {
      if (st.rel.mira.comfort >= 60) { await say('mira', '……世界有比我的報告重要嗎？'); await narr('她差點笑出來。差一點。'); Sys.ch('mira', { tension: -3 }); }
      else { await say('mira', '我不覺得好笑。', '😑'); Sys.ch('mira', { tension: 6 }); }
    } else { st.f.miraWalkaway = true; await narr('你轉身走開。身後沒有聲音。'); Sys.ch('mira', { tension: 12, trust: -6 }); Sys.mem('mira', '她想好好談的時候，你走開了', -1, 'walkaway'); }
  } });

  // the crossover night
  add({ id: 'd3_gathering', kind: 'scene', day: 3, where: 'cafe', from: '19:05', to: '21:30', cast: ['pei'], prio: 80, cond: (st) => !st.f.gatherDone && SW.CORE.filter((i) => here(i)).length >= 3, run: async (st) => {
    await narr('週三晚上，轉角的老位子。窗邊那張桌子擠滿了人。');
    if (st.f.leleStay === 'cafe' || (Sys.knows('lele', 'lease') && here('lele'))) { await say('lele', '小沛，你要自己說，還是我說？'); await say('pei', '……樂樂！'); }
    await say('pei', '其實……我有一件事要跟大家說。');
    await say('pei', '轉角的租約到期了。房東要漲租。週日前我要湊到十五萬，不然就要收掉。');
    for (const id of SW.CORE.concat('player')) Sys.learn(id, 'lease', 'pei', true);
    if (here('lele')) await say('lele', '我們辦活動！週五來一場 Live！我幫你做募資頁！');
    if (here('hsiu')) await say('hsiu', '說實話，十五萬加上之後每個月的房租……要不要考慮接受現實？');
    if (here('anson')) { await say('anson', '我、我可以先借你一點！我有存款——'); await say('pei', '安森，不用……'); }
    if (here('mira')) await say('mira', '……我這週真的很忙。抱歉。', '😶');
    await narr('大家都看向你。');
    const c = await choose([
      { t: '「我們辦週五 Live！我上台彈吉他。」', v: 'gig' },
      { t: '「我去找合作的可能。公司、教會、工作室都可以問。」', v: 'partner' },
      { t: '「小沛，你自己想怎麼做？」', v: 'ask' },
      { t: '「阿修說得也有道理。」', v: 'accept' },
      { t: '（滑手機，不表態）', v: 'none' },
    ]);
    if (c === 'gig') { st.f.gigPlanned = true; st.f.playerGig = true; st.cafe.plan = 'gig'; st.cafe.will += 5; Sys.ch('lele', { friend: 3 }, true); await say('pei', '你要上台？好……好！我們來做！'); Sys.promise({ id: 'gig', who: 'pei', text: '轉角 Live（你答應上台）', map: 'cafe', from: at(5, '20:00'), until: at(5, '21:30'), kind: 'meet', auto: false, weight: 12 }); }
    else if (c === 'partner') { st.cafe.plan = 'partner'; st.f.partnerQuest = true; st.cafe.will += 6; await say('pei', '……謝謝你沒有叫我「加油」。'); if (here('anson')) { await say('anson', '教會一樓的交誼廳平日都空著，我可以去問牧師。'); st.f.churchOffer = true; } st.f.gigPlanned = true; }
    else if (c === 'ask') { st.cafe.will += 10; Sys.ch('pei', { trust: 6 }); await say('pei', '……我想試試看 Live。'); await say('pei', '但如果失敗了，我想要大家陪我一起接受。可以嗎？'); st.f.gigPlanned = true; st.cafe.plan = 'gig'; Sys.mem('pei', '你問小沛「你自己想怎麼做」', 1, 'askedPei'); }
    else if (c === 'accept') { st.cafe.will -= 8; st.cafe.plan = 'accept'; Sys.ch('hsiu', { friend: 3 }, true); Sys.ch('lele', { tension: 6 }); Sys.ch('pei', { trust: -3 }, true); await say('lele', '你們兩個很冷血耶！'); await say('pei', '……沒關係。他們說得對。'); }
    else { if (Sys.knows('lele', 'lease')) { st.f.gigPlanned = true; st.cafe.plan = 'gig'; } else st.cafe.plan = 'accept'; await narr('你低頭滑手機。等你抬頭，大家已經決定好了。'); }
    if (here('anson')) { await say('anson', '我可以在教會和學校放連署單。至少讓房東知道，有很多人在乎這個地方。'); st.f.petition = true; st.cafe.petition += 1; }
    if (st.f.gigPlanned && Sys.knows('lele', 'lease') && !st.cafe.crowd) st.cafe.crowd = 12000;
    await narr('那天晚上大家聊到店打烊。阿修和米拉為了募資頁的字型吵了半小時。');
    Sys.mem(SW.CORE.filter((i) => here(i)), '週三晚上，大家第一次一起面對轉角的危機', 1, 'gathering');
    st.f.gatherDone = true;
    await wait(60, false);
  } });
  add({ id: 'd3_gather_off', kind: 'offscreen', day: 3, from: '21:30', cond: (st) => !st.f.gatherDone, run: (st) => {
    st.f.gatherDone = 'absent';
    for (const id of SW.CORE) Sys.learn(id, 'lease', 'pei', true);
    if (!K('lease')) Sys.learn('player', 'lease', 'pei', true);
    st.f.gigPlanned = true; st.cafe.plan = 'gig'; st.cafe.crowd = st.cafe.crowd || 10000; st.f.petition = true;
    if (st.n.anson.energy > 25) { st.f.churchOffer = true; Sys.npcCh('anson', { energy: -10 }); }
    msg('group', 'pei', '謝謝大家今晚陪我。轉角的事……就交給週五了！🎸');
    later(2, 'group', 'lele', '{N} 你今天沒來！你錯過了我的簡報！！');
    later(4, 'group', 'hsiu', '我還是覺得要算清楚成本。');
    later(6, 'group', 'anson', '連署單我明天放到教會跟學校。');
  } });
  add({ id: 'd3_hsiu_lele', kind: 'offscreen', day: 3, from: '22:30', cond: (st) => st.f.leleStay === 'hsiu', run: (st) => {
    msg('group', 'hsiu', '樂樂在我家沙發上睡著了。手上還拿著一包洋芋片。我要怎麼辦。');
    Sys.later(600, 'msg', { thread: 'group', from: 'lele', text: '阿修家的枕頭好硬！但他早餐煎了蛋！！🍳' });
    Sys.pch('hsiu', 'lele', { friend: 5, tension: -3 });
  } });

  // =====================================================================
  // DAY 4
  // =====================================================================
  add({ id: 'd4_release_ask', kind: 'approach', npc: 'boss', day: 4, where: 'office', from: '09:20', to: '16:00', prio: 60, run: async (st) => {
    await say('boss', 'FW 2.3 明晚要出。需要一個人留守到十點，盯斷電測試。');
    await say('boss', '你，還是阿修？');
    const c = await choose([{ t: '「我來。」', v: 'me' }, { t: '「讓阿修來吧，他比較熟。」', v: 'hsiu' }, { t: '「與其留人，不如把斷電測試自動化。」', v: 'auto' }, { t: '「明天晚上我有事……」', v: 'busy' }]);
    if (c === 'me') { st.f.releaseOwner = 'player'; Sys.promise({ id: 'release', who: 'boss', text: '留守 FW 2.3 release', map: 'office', from: at(5, '18:00'), until: at(5, '19:30'), kind: 'meet', auto: false, onBreak: 'releaseBroken' }); await say('boss', '好。'); st.work.bossTrust += 2; }
    else if (c === 'hsiu') { st.f.releaseOwner = 'hsiu'; st.work.hsiuScore += 6; st.work.bossTrust -= 1; await say('boss', '好，那阿修。'); if (here('hsiu')) await say('hsiu', '……謝了。'); }
    else if (c === 'auto') {
      if (st.p.skill.debug >= 3.5) {
        await say('boss', '……你寫得出來？那今天就寫。寫好了，明天就不用留人。');
        await wait(120, '⌨️ 你寫了兩個小時的自動化腳本……');
        await narr('腳本跑起來了。斷電測試機在你面前自己開開關關，像一隻規律呼吸的動物。');
        st.f.releaseOwner = 'auto'; st.work.bossTrust += 6; st.work.perf += 3; Sys.skill('debug', 0.5);
        await say('boss', '……不錯。很不錯。');
      } else { await say('boss', '理想很好。但這週來不及。明天你留。'); st.f.releaseOwner = 'player'; Sys.promise({ id: 'release', who: 'boss', text: '留守 FW 2.3 release', map: 'office', from: at(5, '18:00'), until: at(5, '19:30'), kind: 'meet', auto: false, onBreak: 'releaseBroken' }); }
    } else { st.f.releaseOwner = 'hsiu'; st.work.bossTrust -= 2; st.work.hsiuScore += 6; await say('boss', '那阿修。'); }
  } });
  add({ id: 'd4_release_off', kind: 'offscreen', day: 4, from: '16:00', cond: (st) => !st.f.releaseOwner, run: (st) => { st.f.releaseOwner = 'hsiu'; st.work.hsiuScore += 6; msg('boss', 'boss', '明天的 release 我讓阿修留。'); } });
  H.releaseBroken = function () {
    const st = S();
    st.work.bossTrust -= 12; st.work.warn += 1;
    msg('boss', 'boss', '你在哪？');
    if (!st.f.hsiuSinging) { st.work.hsiuScore += 8; later(10, 'boss', 'boss', '阿修接手了。我們週一談。'); }
    else later(10, 'boss', 'boss', '我自己盯。我們週一談。');
  };

  add({ id: 'd4_group', kind: 'scene', day: 4, where: 'church', from: '19:15', to: '21:30', cast: ['anson'], prio: 60, run: async (st) => {
    const gp = Sys.pending('group'); if (gp) { gp.status = 'kept'; gp.done = st.t; st.stats.kept++; }
    await narr('光鹽教會的小組教室。七八個人圍著一張桌子，桌上有一壺高山茶和一盒餅乾。');
    await say('anson', '歡迎！今天的主題是「安息」。');
    await say('pastor', '有人說休息是為了走更長遠的路。但聖經裡的安息，比較像是——承認自己不是神。');
    await say('anson', '我們先輪流說說：你上一次真正休息，是什麼時候？');
    const c = await choose([{ t: '誠實說：「我不記得了。」', v: 'honest' }, { t: '「我不太確定自己信不信這些，但我想聽聽。」', v: 'doubt' }, { t: '「上次休息，是在茶水間沙發被課長抓到。」', v: 'joke' }, { t: '反問安森：「那你呢？」', v: 'ask' }]);
    if (c === 'honest') { await narr('大家都點頭。有一位阿姨說：「我也是。」'); Sys.ch('anson', { comfort: 3 }, true); Sys.mood(5); }
    else if (c === 'doubt') { await say('pastor', '那很好。問問題的人，比假裝有答案的人誠實。'); Sys.ch('anson', { trust: 2 }, true); }
    else if (c === 'joke') { await narr('整桌人都笑了。連牧師都笑了。'); for (const id of ['anson']) Sys.ch(id, { comfort: 3 }, true); }
    else { await say('anson', '我……'); await narr('安森停了很久。'); await say('anson', '我好像，很久沒有了。'); Sys.learn('player', 'ansonTired', 'anson'); st.f.ansonCare = (st.f.ansonCare || 0) + 1; Sys.ch('anson', { trust: 4 }); }
    await narr('安森幫大家倒茶的時候，手在抖。茶灑出來了一點。');
    const d = await choose([{ t: '接過茶壺，讓他坐下', v: 1 }, { t: '假裝沒看到', v: 0 }]);
    if (d) { await say('anson', '……謝謝。'); st.f.ansonCare = (st.f.ansonCare || 0) + 1; Sys.npcCh('anson', { energy: 5 }); }
    if (st.rel.anson.trust >= 50 || (st.f.ansonCare || 0) >= 1) {
      await say('anson', '明天的社區愛宴……我其實有點撐不住。下午可以來幫我嗎？');
      const e = await choose([{ t: '「好，四點我到。」', v: 'yes' }, { t: '「我找大家一起來幫忙！」', v: 'all' }, { t: '「明天我可能很忙……」', v: 'no' }]);
      if (e === 'yes') Sys.promise({ id: 'ansonFri', who: 'anson', text: '去教會幫安森備餐', map: 'church', from: at(5, '16:00'), until: at(5, '19:00'), kind: 'task', weight: 10 });
      else if (e === 'all') { st.f.ansonCare = (st.f.ansonCare || 0) + 2; msg('group', 'me', '明天下午教會愛宴缺人手，大家有空去幫安森嗎？'); later(3, 'group', 'lele', '我可以去洗碗！！'); later(5, 'group', 'mira', '我五點後可以。'); }
    }
    if (st.p.skill.guitar >= 2.5) {
      await say('anson', '還有……週日主日我們的吉他手出國了。你會彈吉他對吧？可以幫忙嗎？');
      const w = await choose([{ t: '「好，我試試看。」', v: 1 }, { t: '「我不太適合，抱歉。」', v: 0 }]);
      if (w) { st.f.worshipAsk = true; Sys.promise({ id: 'worship', who: 'anson', text: '主日幫忙彈吉他', map: 'church', from: at(7, '10:00'), until: at(7, '11:00'), kind: 'meet', auto: false, weight: 8 }); }
    }
    st.stats.church++;
    Sys.mem('anson', '你參加了週四的小組，主題是「安息」', 1, 'group');
    await wait(90, '⏳ 小組結束時，茶壺空了，餅乾也空了……');
  } });

  add({ id: 'd4_hsiu_studio', kind: 'scene', day: 4, where: 'studio', from: '21:00', to: '22:40', cast: ['hsiu'], prio: 70, run: async (st) => {
    await narr('工作室的門沒關緊。裡面傳出一個……很努力、但很走音的歌聲。');
    await say('hsiu', '♪ 如果你的 log 裡有我——就算只是 warning 也好——');
    await narr('阿修看到你，整個人僵住。');
    await say('hsiu', '……你什麼都沒聽到。', '😱');
    const knew = K('hsiuSong');
    Sys.learn('player', 'hsiuSong', 'hsiu', knew);
    st.f.hsiuPlan = true;
    const c = await choose([
      { t: '「我什麼都沒聽到。也不會說。」', v: 'keep' },
      { t: '「要不要我幫你伴奏？你的音準需要吉他撐著。」', v: 'coach' },
      { t: '（笑到蹲在地上）', v: 'laugh' },
      { t: '「直接去跟她說，不是比較快嗎？」', v: 'direct' },
      { t: '「……你知道米拉可能要去澳洲嗎？」', v: 'leak', if: K('holiday') },
    ]);
    if (c === 'keep') { st.f.trust_hsiuSong = true; Sys.ch('hsiu', { trust: 6 }); await say('hsiu', '……謝了。'); Sys.mem('hsiu', '你撞見阿修練歌，答應替他保密', 1, 'keepSong'); }
    else if (c === 'coach') {
      st.f.trust_hsiuSong = true;
      await say('hsiu', '……你會？好。拜託。');
      const r = await SW.MG.rhythm({ title: '幫阿修伴奏〈如果你的 log 裡有我〉', len: 20, partner: 'hsiu' });
      st.f.hsiuReady = (st.f.hsiuReady || 0) + (r.score > 60 ? 2 : 1);
      await say('hsiu', r.score > 60 ? '有你在後面撐著，我好像……沒那麼走音了。' : '我們兩個都很爛。但是一起爛，比較不丟臉。');
      Sys.ch('hsiu', { friend: 6, trust: 4 }); Sys.mem('hsiu', '你陪阿修練了一晚的情歌', 1, 'coachSong');
    } else if (c === 'laugh') { st.f.hsiuQuit = true; Sys.ch('hsiu', { tension: 10, friend: -4 }); await say('hsiu', '……我就知道。我不唱了。', '😞'); Sys.mem('hsiu', '你撞見他練歌，笑到蹲在地上', -1, 'laughSong'); }
    else if (c === 'direct') { await say('hsiu', '你不懂。有些話，用說的太輕了。'); Sys.ch('hsiu', { comfort: 2 }, true); st.f.trust_hsiuSong = true; }
    else { Sys.tell('hsiu', 'holiday'); st.f.hsiuKnowsHoliday = true; await narr('阿修的表情像是伺服器斷電。'); await say('hsiu', '……那我更要唱了。'); await say('hsiu', '在她走之前。'); }
    await wait(40, false);
  } });
  add({ id: 'hsiu_coach', kind: 'manual', once: false, run: async (st) => {
    await say('hsiu', '再一次。從副歌。');
    const r = await SW.MG.rhythm({ title: '陪阿修練歌', len: 18, partner: 'hsiu' });
    st.f.hsiuReady = (st.f.hsiuReady || 0) + (r.score > 60 ? 2 : 1);
    SW.dailyOnce('helped_hsiu');
    await say('hsiu', r.score > 60 ? '……這次高音沒破。' : '還是破了。但有比較少。');
    Sys.ch('hsiu', { friend: 3 }, true);
    await wait(30, false);
  } });
  add({ id: 'd4_lele_bar', kind: 'talk', npc: 'lele', day: [4, 5], where: 'bar', label: '樂樂好像喝多了', run: async (st) => {
    await say('lele', '{N}～你來啦！我跟你說，我決定了——');
    if (Sys.knows('lele', 'rumorLele') && !st.f.leleKnowsHsiu) {
      await say('lele', '我要跟阿修告白！他都對我那麼好，一定是喜歡我！');
      const c = await choose([{ t: '「等等……他其實喜歡的是米拉。」', v: 'truth', if: K('hsiuSong') }, { t: '「你確定你是喜歡他，還是不想一個人？」', v: 'ask' }, { t: '「去吧！轟轟烈烈！」', v: 'go' }]);
      if (c === 'truth') { Sys.tell('lele', 'hsiuSong'); st.f.leleKnowsHsiu = true; Sys.forget('lele', 'rumorLele'); await say('lele', '……蛤？？？'); await say('lele', '那我這幾天在幹嘛！好丟臉喔！！（她把臉埋進手裡）'); await say('lele', '……好。我決定當他的僚機。'); }
      else if (c === 'ask') { await say('lele', '……你好討厭。一句話就戳中。'); st.f.leleGrowth = (st.f.leleGrowth || 0) + 1; Sys.ch('lele', { trust: 4 }); }
      else { st.f.leleConfess = true; await say('lele', '好！我週六就說！'); }
    } else {
      await say('lele', '我要好好當一個人。從明天開始。');
      await say('lele', '今天先喝完這杯。');
      Sys.ch('lele', { comfort: 2 }, true);
    }
  } });

  // =====================================================================
  // DAY 5 — EP03〈最糟糕的星期五〉
  // =====================================================================
  add({ id: 'd5_morning', kind: 'phone', day: 5, from: '08:00', run: (st) => {
    if (st.f.gigPlanned && !Sys.prom('gig')) msg('pei', 'pei', '今晚八點，轉角 Live！你會來吧？🎸', 'd5_gig', at(5, '20:00'));
    if (!Sys.prom('ansonFri') && !st.f.ansonOk) msg('anson', 'anson', '今天下午四點開始備餐，有空的話可以來幫個忙嗎🙏', 'd5_anson', at(5, '16:30'));
    if (st.f.releaseOwner === 'player') msg('boss', 'boss', '今晚 18:00 release，記得。');
    if (st.f.releaseOwner === 'hsiu' && st.f.hsiuPlan !== false && !st.f.hsiuQuit) msg('hsiu', 'hsiu', '欸……你今晚可以幫我顧 release 嗎？我八點……有事。拜託。', 'd5_hsiu', at(5, '17:50'));
    st.f.hsiuPlan = st.f.hsiuPlan === undefined ? true : st.f.hsiuPlan;
  } });
  R.d5_gig = [
    { t: '「一定到！」', fn: (st) => { Sys.promise({ id: 'gig', who: 'pei', text: '轉角 Live', map: 'cafe', from: at(5, '20:00'), until: at(5, '21:30'), kind: 'meet', auto: false, weight: 9 }); later(2, 'pei', 'pei', '耶！！我會留最好的位子給你！'); } },
    { t: '「我盡量！」', fn: () => { later(2, 'pei', 'pei', '好～有空就來！'); } },
    { t: '「我今晚可能有事……」', fn: () => { later(2, 'pei', 'pei', '沒關係！我會錄影給你看😆'); } },
  ];
  R.d5_anson = [
    { t: '「好，四點到。」', fn: () => { Sys.promise({ id: 'ansonFri', who: 'anson', text: '去教會幫安森備餐', map: 'church', from: at(5, '16:00'), until: at(5, '19:00'), kind: 'task', weight: 10 }); later(2, 'anson', 'anson', '謝謝你。真的。'); } },
    { t: '「今天真的沒辦法，抱歉。你別太累。」', fn: (st) => { st.f.ansonCare = (st.f.ansonCare || 0) + 0.5; later(2, 'anson', 'anson', '沒關係！我可以的😊'); } },
  ];
  R.d5_hsiu = [
    { t: '「好，我幫你顧。」', fn: (st) => { st.f.releaseOwner = 'player'; st.f.hsiuFree = true; Sys.ch('hsiu', { friend: 6, trust: 5 }); Sys.promise({ id: 'release', who: 'boss', text: '留守 FW 2.3 release（幫阿修顧）', map: 'office', from: at(5, '18:00'), until: at(5, '19:30'), kind: 'meet', auto: false, onBreak: 'releaseBroken' }); later(2, 'hsiu', 'hsiu', '我欠你一次。不，兩次。'); Sys.mem('hsiu', '你替阿修顧 release，讓他能去唱歌', 1, 'coverRelease'); } },
    { t: '「我也有事，抱歉。」', fn: (st) => { st.f.hsiuStuck = true; later(2, 'hsiu', 'hsiu', '……喔。好。沒事。'); } },
    { t: '「你直接跟課長說實話啊。」', fn: (st) => { later(2, 'hsiu', 'hsiu', '說我要去唱情歌？'); Sys.later(60, 'hsiuHonest', {}); } },
  ];
  H.hsiuHonest = () => { const st = S(); st.f.hsiuFree = true; st.f.releaseOwner = 'boss'; msg('hsiu', 'hsiu', '我跟課長說了。他沉默了十秒，然後說：「我年輕的時候也唱過。去吧。」……我們課長是不是被掉包了。'); };

  add({ id: 'd5_release', kind: 'scene', day: 5, where: 'office', from: '17:45', to: '19:30', prio: 80, cond: (st) => st.f.releaseOwner === 'player' && !st.f.releaseDone, run: async (st) => {
    const rp = Sys.pending('release'); if (rp) { rp.status = 'kept'; rp.done = st.t; st.stats.kept++; }
    await say('boss', '來了。斷電測試第 97 次失敗。我們有一個 blocker。');
    const partner = here('hsiu') && !st.f.hsiuFree ? 'hsiu' : null;
    const r = await SW.MG.debug('release', { partner, title: 'FW 2.3 Release Blocker' });
    if (r.solved) {
      await wait(90, '⏳ 重新編譯、燒錄、跑斷電測試……第 98 次……第 99 次……');
      await say('boss', '……綠了。全部綠了。');
      await say('boss', '你今天救了這個 release。');
      st.work.bossTrust += 8; st.work.perf += 4; st.f.releaseDone = 'player';
      Sys.mem([], '你在週五晚上救了 FW 2.3 的 release', 1, 'release', true);
      const c = await choose([{ t: '趕去轉角（還來得及聽 Live 的後半）', v: 'go' }, { t: '留下來陪課長跑完最後的驗證', v: 'stay' }]);
      if (c === 'go') { await wait(10, '🏃 你一路衝向轉角……'); SW.W.travelTo('cafe'); }
      else { st.work.bossTrust += 3; await say('boss', '……謝謝。我請你吃宵夜。'); await wait(90, '⏳ 你們把驗證跑完，課長請你吃了一碗牛肉麵……'); }
    } else {
      await wait(150, '⏳ 你試了所有方法……');
      await say('boss', '……我來接手。你先回去吧。');
      st.work.bossTrust -= 4; st.f.releaseDone = 'boss';
    }
  } });
  add({ id: 'd5_release_hsiu', kind: 'offscreen', day: 5, from: '18:00', cond: (st) => st.f.releaseOwner === 'hsiu' && !st.f.hsiuFree, run: (st) => {
    st.f.hsiuStuck = true;
    Sched.override('hsiu', at(5, '18:00'), at(5, '22:00'), 'office', 'hsiuDesk', '盯 release', 'hsiuRelease');
  } });
  add({ id: 'd5_anson_feast', kind: 'scene', day: 5, where: 'church', from: '17:50', to: '20:00', cast: ['anson'], prio: 60, cond: (st) => !st.f.ansonCollapsed, run: async (st) => {
    await narr('教會一樓擺了六張大圓桌。附近的阿公阿嬤、外籍看護、帶小孩的爸媽，排隊領熱湯。');
    await say('anson', '你來了！');
    const c = await choose([{ t: '幫忙打菜', v: 'serve' }, { t: '坐下來陪一位阿嬤聊天', v: 'grandma' }, { t: '端一碗湯給安森，逼他坐下來吃', v: 'anson' }]);
    if (c === 'serve') { await narr('你打了四十碗湯。手很痠，心很滿。'); Sys.npcCh('anson', { energy: 10 }); Sys.ch('anson', { friend: 3 }, true); }
    else if (c === 'grandma') {
      await say('narr', '阿嬤說，她年輕的時候在光復路賣過豆花。');
      await say('narr', '「那時候我跟隔壁陳太太一起擺攤。她兒子現在當房東了喔。」');
      await say('narr', '「以前那條街，每個轉角都有可以坐的地方。現在只剩一間咖啡廳了。開店的那個女孩子，是我老朋友的孫女。」');
      st.f.douhua = true; UI.toast('🔍 小沛的外婆，和房東陳伯的媽媽，以前一起賣豆花？');
      Sys.mood(6);
    } else { await say('anson', '……好。我坐五分鐘。'); await narr('他坐了二十分鐘。中間差點睡著。'); st.f.ansonCare = (st.f.ansonCare || 0) + 2; st.f.ansonOk = true; Sys.npcCh('anson', { energy: 15 }); Sys.ch('anson', { trust: 4, comfort: 4 }); }
    st.stats.church++;
    Sys.mem('anson', '你參加了教會的社區愛宴', 1, 'feast', true);
    await wait(60, false);
  } });
  add({ id: 'd5_anson_check', kind: 'offscreen', day: 5, from: '19:30', run: (st) => {
    const helped = st.prom.some((p) => p.id === 'ansonFri' && p.status === 'kept') || SW.S.daily['5:helped_anson'];
    if (helped || st.f.ansonOk || (st.f.ansonCare || 0) >= 2 || st.n.anson.energy >= 42) { st.f.ansonOk = true; return; }
    st.f.ansonCollapsed = true;
    Sched.override('anson', at(5, '19:30'), at(5, '23:00'), 'church', 'pew3', '在長椅上躺著休息', 'ansonRest');
    msg('group', 'pei', '安森在教會昏倒了！！牧師說是過勞加低血糖，現在在教會躺著休息。');
    later(2, 'group', 'lele', '什麼！！我們要過去嗎！');
    later(4, 'group', 'anson', '我沒事……大家不要擔心，演出照常！');
    for (const id of SW.CORE.concat('player')) Sys.learn(id, 'ansonTired', null, true);
  } });
  add({ id: 'd5_anson_rest', kind: 'talk', npc: 'anson', day: 5, where: 'church', from: '19:30', to: '23:00', label: '坐到安森旁邊', cond: (st) => !!st.f.ansonCollapsed, run: async (st) => {
    await narr('安森躺在長椅上，額頭上放著一條濕毛巾。');
    await say('anson', '……你怎麼來了？今天晚上不是有 Live 嗎？');
    const c = await choose([{ t: '「Live 少我一個沒差。你比較重要。」', v: 1 }, { t: '「你嚇死我們了。」', v: 2 }, { t: '（什麼都不說，坐在旁邊）', v: 3 }]);
    await say('anson', c === 1 ? '……你這樣說，我會哭喔。' : c === 2 ? '對不起。我以為我可以的。' : '……謝謝你沒有問我「你還好嗎」。');
    await say('anson', '我一直覺得，如果我停下來，就沒有人需要我了。');
    await say('anson', '結果是身體幫我停下來的。');
    Sys.ch('anson', { friend: 8, trust: 6, comfort: 5 });
    Sys.mem('anson', '安森在教會倒下的那晚，你去陪他', 1, 'ansonRest');
    st.f.ansonVisited = true;
    await wait(40, false);
  } });

  // the Friday night show
  add({ id: 'd5_gig', kind: 'scene', day: 5, where: 'cafe', from: '19:45', to: '22:30', cast: ['pei'], prio: 85, cond: (st) => !st.f.gigDone, run: async (st) => gigScene(st, true) });
  add({ id: 'd5_gig_off', kind: 'offscreen', day: 5, from: '22:30', cond: (st) => !st.f.gigDone, run: (st) => { gigScene(st, false); } });
  async function gigScene(st, present) {
    st.f.gigDone = present ? 'present' : 'absent';
    if (present) Sys.keep('gig', true); // showing up is what was promised, whatever you do once there
    const big = !!st.f.gigPlanned;
    let raised = 0, playerScore = 0;
    const L = present ? async (w, t, e) => (w === 'narr' ? narr(t) : say(w, t, e)) : async () => {};
    if (big) {
      await L('narr', '週五晚上八點。轉角擠滿了人，比平常多三倍。門口貼著樂樂做的海報：「我們還有地方可以坐嗎？」');
      raised += 12000;
      if (st.cafe.crowd) { raised += 6000; await L('narr', '樂樂的募資頁已經被轉發了兩百多次。'); }
      if (!st.f.ansonCollapsed && st.f.ansonOk) { raised += 6000; await L('narr', '安森帶來一整群教會的阿姨，她們坐滿了兩張桌子。'); }
      await L('pei', '謝謝大家今天來。這間店……');
      await L('narr', '小沛停了一下。');
      await L('pei', '總之，今晚，請大家好好坐著。');
    } else {
      await L('narr', '週五晚上，轉角的固定演出。客人不多，燈光很暖。');
    }
    if (present && (st.f.playerGig || st.f.peiJam || st.p.skill.guitar >= 3)) {
      await say('pei', '{N}，上來！');
      const c = await choose([{ t: '上台', v: 'play' }, { t: '「我在台下幫你們錄影！」', v: 'film' }, { t: '站在最後面，安靜地聽', v: 'listen' }]);
      if (c === 'play') {
        UI.closeDialog();
        const r = await SW.MG.rhythm({ title: '轉角 Live〈我們還有地方可以坐嗎？〉', len: 24, partner: 'pei' });
        playerScore = r.score; raised += big ? Math.round(r.score * 150) : 0; Sys.skill('guitar', 0.6);
        await narr(r.score > 75 ? '最後一個和弦落下，整間店安靜了一秒，然後爆出掌聲。' : '你錯了幾個音，但小沛笑著對你點頭，台下也跟著打拍子。');
        Sys.ch('pei', { friend: 5, attract: r.score > 75 ? 3 : 1, trust: 3 }); st.stats.gigs++;
        Sys.mem('pei', '你在轉角的 Live 上台和小沛一起表演', 1, 'gigPlay');
      } else if (c === 'film') { raised += big ? 3000 : 0; st.cafe.promo += 1; await narr('你拍的影片後來被分享了好幾百次。'); }
      else Sys.ch('pei', { comfort: 2 }, true);
    }
    // 阿修's song
    const hsiuHere = st.n.hsiu.map === 'cafe' || (!st.f.hsiuStuck && st.f.releaseOwner !== 'hsiu') || st.f.hsiuFree;
    const miraHere = !(st.f.releaseOwner === 'player' && false);
    if (st.f.hsiuPlan && !st.f.hsiuQuit && hsiuHere && miraHere) {
      st.f.hsiuSinging = true; st.f.hsiuSang = true;
      await L('narr', '演出到一半，阿修突然走上台。他從口袋裡拿出一張皺巴巴的紙。');
      await L('hsiu', '我……我想唱一首歌。給一個每天跟我吵 log 格式的人。');
      const ready = st.f.hsiuReady || 0;
      await L('narr', ready >= 2 ? '他唱得很穩。高音沒有破。台下有人在偷偷擦眼淚。' : ready === 1 ? '高音破了一次。他沒有停下來。' : '高音破了三次。他每一次都繼續唱下去。');
      let a = Sys.pair('hsiu', 'mira').attract + ready * 4 + (st.f.miraForewarned ? 4 : 0) - (st.f.miraJealous ? 8 : 0) + (st.f.miraAdvice === 'go' ? -4 : 0);
      if (a >= 52) {
        st.f.hsiuMira = 'couple';
        await L('narr', '歌唱完了。米拉站起來，走上台。');
        await L('mira', '你的高音破了。我有數。');
        await L('mira', '……但我很喜歡。');
        await L('narr', '整間店都在尖叫。樂樂叫得最大聲。');
        Sys.pch('hsiu', 'mira', { attract: 20, tension: -20 });
        raised += big ? 5000 : 0;
      } else {
        st.f.hsiuMira = 'rejected';
        await L('narr', '歌唱完了。米拉沒有上台。她在角落站了很久，最後走到阿修身邊。');
        await L('mira', '阿修……謝謝你。真的。');
        await L('mira', '但我需要時間。我可能……要去澳洲了。');
        for (const id of SW.CORE.concat('player')) Sys.learn(id, 'holiday', 'mira', true);
        Sys.pch('hsiu', 'mira', { tension: 6 });
      }
      if (present) {
        const c = await choose([{ t: '帶頭鼓掌', v: 1 }, { t: '吹口哨', v: 2 }, { t: '拿手機錄影', v: 3 }]);
        if (c === 3) { raised += big ? 3000 : 0; }
        Sys.ch('hsiu', { friend: 4 }, true);
        Sys.mem(['hsiu', 'mira'], st.f.hsiuMira === 'couple' ? '週五晚上，你看著阿修在台上唱歌給米拉聽，然後他們在一起了' : '週五晚上，阿修在台上唱了一首歌給米拉', 1, 'hsiuSong');
      }
    } else if (st.f.hsiuPlan && st.f.hsiuStuck && !st.f.hsiuQuit) {
      Sys.later(5, 'msg', { thread: 'group', from: 'hsiu', text: '（照片：辦公室、一台斷電測試機、一張皺巴巴的歌詞）' });
      st.f.hsiuMissedGig = true;
    }
    if (big) { st.cafe.gig = raised; st.cafe.fund += raised; }
    await L('pei', '今晚……謝謝。不管結果怎樣，今晚我會記一輩子。');
    if (present) {
      Sys.mem(SW.CORE.filter((i) => here(i)), big ? `轉角 Live 的那一晚（募到 ${U.money(raised)}）` : '週五晚上在轉角聽小沛唱歌', 1, 'gigNight');
      await wait(Math.max(30, at(5, '22:30') - st.t), '🎸 Live 一直到很晚……');
    } else {
      if (big) msg('group', 'pei', `今晚募到 ${U.money(raised)}！！謝謝大家🥹`);
      if (st.f.hsiuMira === 'couple') later(2, 'group', 'lele', '{N} 你沒來！！！阿修上台唱歌給米拉聽然後他們在一起了！！！（影片）');
      else if (st.f.hsiuMira === 'rejected') later(2, 'group', 'lele', '今晚發生太多事了……米拉說她可能要去澳洲。');
      const g = Sys.pending('gig'); if (g) Sys.breakP('gig');
    }
  }

  // =====================================================================
  // DAY 6
  // =====================================================================
  add({ id: 'd6_morning', kind: 'scene', day: 6, where: 'home', from: '07:40', to: '11:30', prio: 30, cond: (st) => SW.W.npcsHere().some((i) => SW.CH[i].core), run: async (st) => {
    const ppl = SW.W.npcsHere().filter((i) => SW.CH[i].core);
    await narr(`週六早上。廚房裡有${ppl.length + 1}個人，兩個鍋，零個清醒的大腦。`);
    if (ppl.includes('lele')) await say('lele', '我昨天是不是在台下哭了？不要回答。');
    if (ppl.includes('mira')) await say('mira', st.f.hsiuMira === 'couple' ? '……不要看我。我什麼都不想討論。（她在笑）' : '我需要咖啡。很多很多咖啡。');
    const c = await choose([{ t: '煎一盤蛋給大家', v: 1 }, { t: '去巷口買蛋餅', v: 2 }, { t: '回去睡', v: 3 }]);
    if (c === 1) { await narr('蛋有點焦。沒有人抱怨。'); for (const i of ppl) Sys.ch(i, { comfort: 3 }, true); }
    else if (c === 2) { Sys.money(-180); await narr('你帶回四份蛋餅和一大杯豆漿。你是今天的英雄。'); for (const i of ppl) Sys.ch(i, { friend: 3 }, true); }
    Sys.mem(ppl, '週六早上，一起在廚房醒酒', 1, 'satMorning', true);
  } });
  add({ id: 'd6_landlord_ov', kind: 'offscreen', day: 6, from: '06:00', run: (st) => {
    Sched.override('landlord', at(7, '14:50'), at(7, '15:40'), 'cafe', 't5', '來給答覆', 'llSun');
  } });
  const pitchOptions = (st) => [
    { t: '「陳伯，我們有連署。附近很多人都想留下這裡。」', v: 'petition', if: !!st.f.petition },
    { t: '「轉角可以跟我們公司福委會長期合作。」', v: 'company', if: st.cafe.partner === 'company' },
    { t: '「您的母親，以前和小沛的外婆一起在這條街賣豆花，對吧？」', v: 'douhua', if: !!st.f.douhua },
    { t: '「陳伯，您在意的，是這間店有沒有人好好顧，對吧？」', v: 'care', if: !!st.f.landlordHint },
    { t: '「我可以當保證人。」', v: 'guar', if: st.p.money >= 20000 },
    { t: '（讓小沛自己說）', v: 'pei' },
  ];
  add({ id: 'd6_landlord', kind: 'scene', day: 6, where: 'cafe', from: '13:55', to: '16:00', cast: ['pei', 'landlord'], prio: 85, run: async (st) => {
    await narr('週六下午。轉角窗邊坐著一位頭髮花白的老先生——房東陳伯。小沛坐在對面，手在桌子底下絞著圍裙。');
    await say('pei', '（小聲）{N}……你可以坐在旁邊嗎？');
    await say('landlord', '阿沛啊，錢的事，你想得怎麼樣了？');
    await say('pei', `我們這週募到了 ${U.money(st.cafe.fund + st.cafe.crowd)}……還不夠。`);
    let cut = 0;
    const used = new Set();
    for (let round = 0; round < 2; round++) {
      const opts = pitchOptions(st).filter((o) => !used.has(o.v));
      const v = await choose(opts, round ? '還要再說什麼嗎？' : '你想替小沛說點什麼？');
      used.add(v);
      if (v === 'petition') { const n = 8 + st.cafe.petition * 7; await say('landlord', `${n} 個人……這麼多人在乎這間店喔。`); cut += 6000 + st.cafe.petition * 3000; }
      if (v === 'company') { await say('landlord', '有固定客人，那就比較不怕了。'); cut += 15000; }
      if (v === 'douhua') { await narr('陳伯愣住了。'); await say('landlord', '……你怎麼知道？'); await say('landlord', '我阿母跟她外婆，以前在這個轉角擺了二十年的攤。'); await narr('他摘下眼鏡，擦了很久。'); cut += 40000; Sys.mem('pei', '你在談判桌上說出了外婆和陳伯媽媽的豆花攤', 1, 'douhua'); }
      if (v === 'care') { await say('landlord', '……對。我不缺那幾萬塊。我只是不想看到這間店被隨便對待。'); cut += 15000; }
      if (v === 'guar') { await say('landlord', '你願意擔保？……年輕人，你很講義氣。'); cut += 8000; st.f.guarantor = true; Sys.ch('pei', { trust: 6 }); }
      if (v === 'pei') { await say('pei', '陳伯，我想留下來。不是因為我不能走，是因為我想讓這條街，還有地方可以坐。'); cut += 8000; st.cafe.will += 8; break; }
    }
    st.cafe.cut = cut;
    await say('landlord', '……我回去想想。明天下午三點，我給你答覆。');
    await say('pei', '謝謝你陪我。不管明天怎樣，我都會記得你今天坐在這裡。');
    Sys.ch('pei', { friend: 5, trust: 5 });
    Sys.mem('pei', '你陪小沛和房東談租約', 1, 'landlord');
    st.f.landlordDone = true;
    await wait(40, false);
  } });
  add({ id: 'd6_landlord_off', kind: 'offscreen', day: 6, from: '16:00', cond: (st) => !st.f.landlordDone, run: (st) => {
    st.f.landlordDone = 'absent';
    st.cafe.cut = (st.cafe.will >= 60 ? 8000 : 0) + (st.f.petition ? 6000 + st.cafe.petition * 3000 : 0) + (st.cafe.partner === 'company' ? 15000 : 0);
    msg('pei', 'pei', '剛剛跟房東談完了。他說明天三點給答覆。我好緊張。');
  } });
  add({ id: 'd6_mira_holiday', kind: 'talk', npc: 'mira', day: [6, 7], label: '米拉好像有話想說', prio: 50, cond: (st) => !st.f.miraAdvice && (K('holiday') || st.rel.mira.trust >= 55) && !st.f.miraDecision, run: async (st) => {
    if (!K('holiday')) {
      await say('mira', '我跟你說一件事。');
      await say('mira', '我申請上了澳洲打工度假。我明天要決定，要不要遞辭呈。');
      Sys.learn('player', 'holiday', 'mira'); st.f.trust_holiday = true;
    } else await say('mira', '你知道澳洲的事了。……我明天就要決定了。');
    await say('mira', '你覺得我應該去嗎？');
    const c = await choose([{ t: '「去吧。你值得看看不一樣的天空。」', v: 'go' }, { t: '「你確定嗎？這裡的一切怎麼辦？」', v: 'stay' }, { t: '「……你走了，我會很想你。」', v: 'miss' }, { t: '「這要你自己決定。不管你選什麼，我都在。」', v: 'self' }]);
    st.f.miraAdvice = c;
    await say('mira', { go: '……你是第一個叫我去的人。', stay: '對啊。我也一直在想這個。', miss: '……笨蛋。', self: '……謝謝你沒有幫我決定。' }[c]);
    Sys.ch('mira', { trust: 4, comfort: 3 });
    Sys.mem('mira', '米拉問你，她該不該去澳洲', 1, 'askedAdvice');
  } });
  add({ id: 'd6_lele_move', kind: 'talk', npc: 'lele', day: [6, 7], label: '幫樂樂找新家', prio: 40, cond: (st) => !!st.f.leleIndependent && !st.f.leleMoved, run: async (st) => {
    await say('lele', '我找到一間小套房了！在河堤旁邊！可是要自己買家具……你可以陪我去挑嗎？');
    const c = await choose([{ t: '「走！」', v: 1 }, { t: '「今天不行，抱歉。」', v: 0 }]);
    if (!c) { await say('lele', '好吧～那我自己去！我可以的！（應該）'); st.f.leleMoved = 'alone'; return; }
    await narr('你們在家具行逛了兩個小時。');
    const sofa = await choose([{ t: '推薦：一張很大的懶骨頭沙發', v: 'bean' }, { t: '推薦：一張小小的、只坐得下一個人的單人椅', v: 'single' }, { t: '推薦：兩張椅子', v: 'two' }]);
    await say('lele', sofa === 'single' ? '……一個人的椅子。好。我要練習坐在上面。' : sofa === 'two' ? '兩張……一張給我，一張給來找我的人。對吧？' : '這個可以塞下我跟鯊魚！買！');
    const r = await SW.MG.timing({ title: '把沙發搬上四樓（沒有電梯）', rounds: 3, verb: '抬！', labels: ['一樓轉角', '三樓樓梯間', '最後衝刺'], zone: 0.17 + st.p.skill.fitness * 0.012 });
    await say('lele', r.score > 60 ? '我們成功了！！！' : '沙發卡在三樓。我們叫了外送吃完才搬上去。');
    await wait(150, '⏳ 你們把樂樂的新家佈置好……');
    st.f.leleMoved = 'player'; st.f.leleStay = 'own'; st.f.leleHeartbroken = false;
    Sys.ch('lele', { friend: 6, trust: 4 }); Sys.mem('lele', '你陪樂樂挑家具、把沙發扛上四樓', 1, 'leleMove');
    Sys.energy(-15);
  } });
  add({ id: 'd6_lele_confess', kind: 'offscreen', day: 6, from: '12:00', cond: (st) => !!st.f.leleConfess && !st.f.leleKnowsHsiu, run: (st) => {
    st.f.leleRejectedByHsiu = true; Sys.pch('hsiu', 'lele', { tension: 12 }); Sys.npcCh('lele', { mood: -10 });
    Sys.forget('lele', 'rumorLele'); Sys.learn('lele', 'hsiuSong', 'hsiu', true);
    msg('lele', 'lele', '我今天做了一件很蠢的事。我跟阿修告白了。他說他喜歡的是米拉。……你是不是早就知道？');
    Sys.ch('lele', { trust: K('hsiuSong') ? -6 : 0 }, true);
  } });
  add({ id: 'trip', kind: 'manual', once: false, run: async (st) => {
    const fol = st.p.follower;
    if (!(await Sys.confirmTime(300, '南寮漁港小旅行'))) return;
    await narr('公車搖了四十分鐘，窗外的風景從科技廠房變成魚塭，然後是海。');
    await narr('南寮漁港。風很大。風箏在天上排成一排。');
    if (fol) {
      await say(fol, U.pick(['我好久沒看到海了。', '我們應該每個禮拜都來。', '這裡的風跟新竹市區的不一樣，比較鹹。']));
      const c = await choose([{ t: '一起去魚市場吃現烤透抽', v: 'food' }, { t: '一起放風箏', v: 'kite' }, { t: '坐在堤防上看夕陽', v: 'sunset' }]);
      if (c === 'food') { Sys.money(-300); await say(fol, '這個透抽……我要哭了。'); }
      else if (c === 'kite') { await say(fol, '它飛起來了！！你看！！'); }
      else { await narr('夕陽慢慢沉進海裡。你們誰都沒有說話。'); Sys.ch(fol, { attract: SW.S.p.partner === fol || SW.CH[fol].date ? 4 : 0 }, true); }
      Sys.ch(fol, { friend: 6, comfort: 6 });
      Sys.mem(fol, '一起搭公車去南寮漁港', 1, 'trip');
    } else { await narr('你一個人坐在堤防上，看著漁船進港。很久沒有這麼安靜了。'); Sys.mem([], '你一個人去了南寮漁港', 0, 'tripAlone', true); }
    await wait(300, '🌊 一整個下午過去了……');
    Sys.mood(15); SW.W.travelTo('city');
  } });

  // =====================================================================
  // DAY 7 — 週日・第一週完結
  // =====================================================================
  add({ id: 'd7_service', kind: 'scene', day: 7, where: 'church', from: '09:45', to: '12:00', prio: 70, run: async (st) => {
    const wpp = Sys.pending('worship'); if (wpp) { wpp.status = 'kept'; wpp.done = st.t; st.stats.kept++; }
    await narr('主日。陽光從彩色玻璃斜斜地照進來。後面有一壺咖啡，還有一盤阿姨做的蘿蔔糕。');
    if (st.f.ansonCollapsed) { await narr('安森坐在第三排。不是在台上，是在台下。'); await say('anson', '牧師說我這週只准坐著。……原來坐在這裡是這種感覺。'); }
    if (st.f.worshipAsk) {
      await say('anson', '{N}！你來了！第二首是你。');
      const r = await SW.MG.rhythm({ title: '主日詩歌〈在這安靜時刻〉', len: 18, slow: true });
      await narr(r.score > 60 ? '吉他聲很安靜，像有人輕輕拍著你的背。' : '你彈錯了幾個音，但會眾唱得很大聲，把你蓋過去了。');
      Sys.ch('anson', { friend: 6, trust: 4 });
      Sys.mem('anson', '你在主日幫忙彈吉他', 1, 'worship');
    }
    await say('pastor', '今天不講很長。只想說一句：你不需要先成為很厲害的人，才配得到休息。');
    const c = await choose([{ t: '安靜聽完', v: 1 }, { t: '偷偷滑手機', v: 2 }, { t: '聚會後留下來吃愛餐、幫忙收椅子', v: 3 }]);
    if (c === 1) Sys.mood(8);
    if (c === 3) { Sys.ch('anson', { friend: 3 }, true); await narr('收椅子的時候，一位阿伯塞給你一塊蘿蔔糕。「少年欸，下禮拜再來。」'); Sys.mood(6); }
    st.stats.church++;
    await wait(60, false);
  } });
  add({ id: 'd7_mira_decide', kind: 'offscreen', day: 7, from: '12:00', run: (st) => {
    let s = { go: 3, stay: -2, miss: -1, self: 1 }[st.f.miraAdvice] || 0;
    if (st.f.hsiuMira === 'couple') s -= 2;
    if (st.f.miraWalkaway) s += 1;
    if (st.rel.mira.trust >= 65) s += 0.5;
    s += Math.random() * 1.6 - 0.8;
    st.f.miraDecision = s > 0.6 ? 'go' : s < -0.6 ? 'stay' : 'delay';
  } });
  Story.outcome = function (st) {
    const c = st.cafe;
    const need = Math.max(60000, c.need - (c.cut || 0));
    const total = c.fund + (c.crowd || 0) + (c.partner === 'company' ? 20000 : 0);
    if (st.f.churchOffer && !c.partner) c.partner = 'church';
    if (total >= need && c.will >= 40) return 'renew';
    if (total >= need) { c.partner = c.partner || 'studio'; return 'relocate'; }
    if (c.partner || total >= need * 0.6) { c.partner = c.partner || 'studio'; return 'relocate'; }
    return 'close';
  };
  Story.finalePlace = () => (S().cafe.outcome === 'close' ? 'bar' : 'cafe');
  Story.finalePlaceName = () => SW.PLACES[Story.finalePlace()].name;
  function setFinale(st) {
    const place = Story.finalePlace();
    const spots = place === 'bar' ? ['long1', 'long2', 'long3', 'long4', 'long5'] : ['t1', 't2', 't3', 't4', 'counter'];
    SW.CORE.forEach((id, i) => Sched.override(id, at(7, '18:45'), at(7, '22:30'), place, id === 'pei' && place === 'cafe' ? 'counter' : spots[i], '週日的聚會', 'fin_' + id, { free: true }));
    if (st.f.miraDecision) { /* mira still comes either way */ }
  }
  add({ id: 'd7_decision', kind: 'scene', day: 7, where: 'cafe', from: '14:45', to: '15:40', cast: ['pei', 'landlord'], prio: 90, cond: (st) => !st.cafe.outcome, run: async (st) => {
    await narr('週日下午三點。陳伯準時推開轉角的門。小沛已經在吧台後面站了一個小時。');
    await say('pei', '{N}……你覺得，不管結果怎樣，我都可以接受嗎？');
    const c = await choose([{ t: '「可以。因為你不是一個人接受。」', v: 1 }, { t: '「不管怎樣，你都還是小沛。」', v: 2 }, { t: '「我不知道。但我會在。」', v: 3 }]);
    st.cafe.will += c === 1 ? 6 : c === 2 ? 5 : 4;
    const out = Story.outcome(st);
    st.cafe.outcome = out;
    if (out === 'renew') {
      await say('landlord', '阿沛，我想了一晚。');
      await say('landlord', `押金照舊。租金……就漲一點點意思意思。剩下的，你們這週湊到的錢，夠了。`);
      await narr('小沛整個人蹲在吧台後面。過了很久，她才站起來，眼睛紅紅的。');
      await say('pei', '……我們還有地方可以坐。');
    } else if (out === 'relocate') {
      await say('landlord', '阿沛，錢還是差一點。我也有我的難處。');
      await say('pei', '……我知道。');
      const where = { church: '教會一樓的交誼廳', company: '矽藍科技一樓的空間', studio: '回聲工作室的大廳' }[st.cafe.partner] || '新的地方';
      await say('pei', `不過，${where}說願意讓轉角搬過去。小一點，但窗戶很大。`);
      await say('landlord', '那很好。這個招牌……你帶走吧。');
    } else {
      await say('landlord', '阿沛，對不起。這次真的沒辦法。');
      await narr('小沛點點頭。她沒有哭。');
      await say('pei', '沒關係，陳伯。謝謝你這幾年。');
      await say('pei', '……我們會找到別的地方坐的。');
    }
    Sys.mem('pei', { renew: '轉角續約成功的那一刻，你在小沛身邊', relocate: '轉角決定搬家的那一刻，你在小沛身邊', close: '轉角決定結束的那一刻，你在小沛身邊' }[out], 1, 'decision');
    Sys.ch('pei', { friend: 6, trust: 5 });
    msg('group', 'pei', { renew: '轉角續約了！！！！！今晚大家來店裡！🎉', relocate: '轉角要搬家了，但不會消失！今晚大家來店裡，最後一次在老位子坐坐。', close: '轉角月底要收了。今晚大家來好日子吧，老蔡說長桌留給我們。' }[out]);
    setFinale(st);
  } });
  add({ id: 'd7_decision_off', kind: 'offscreen', day: 7, from: '15:40', cond: (st) => !st.cafe.outcome, run: (st) => {
    const out = Story.outcome(st);
    st.cafe.outcome = out;
    msg('group', 'pei', { renew: '轉角續約了！！！！！今晚大家來店裡！🎉', relocate: '轉角要搬家了，但不會消失！今晚大家來店裡，最後一次在老位子坐坐。', close: '轉角月底要收了。今晚大家來好日子吧，老蔡說長桌留給我們。' }[out]);
    setFinale(st);
  } });
  add({ id: 'd7_mira_news', kind: 'phone', day: 7, from: '17:30', cond: (st) => !!st.f.miraDecision, run: (st) => {
    const d = st.f.miraDecision;
    if (!K('holiday')) Sys.learn('player', 'holiday', 'mira', true);
    msg('group', 'mira', { go: '我決定了。我下個月要去澳洲。明天遞辭呈。', stay: '我決定留下來。澳洲的簽證……就當作一個「我做得到」的證明吧。', delay: '澳洲的事，我決定再等一年。不是不去，是想準備好再去。' }[d]);
    later(2, 'group', 'lele', d === 'go' ? '米拉😭😭😭 我們要辦歡送會！！' : '米拉🥹');
    if (st.f.hsiuMira === 'couple') later(3, 'group', 'hsiu', d === 'go' ? '……我會去看你。我查過機票了。' : '……好。');
  } });

  add({ id: 'd7_finale', kind: 'scene', day: 7, from: '18:50', to: '22:30', prio: 95, where: ['cafe', 'bar'], cond: (st) => !!st.cafe.outcome && !st.f.finaleDone && st.p.map === Story.finalePlace() && SW.CORE.filter((i) => here(i)).length >= 3, run: async (st) => {
    st.f.finaleDone = true;
    const out = st.cafe.outcome;
    await narr(out === 'close' ? '週日晚上。好日子餐酒館的長桌。老蔡在桌上放了一塊牌子：「轉角保留席」。' : '週日晚上。轉角窗邊的老位子。窗外的風很大，是新竹的風。');
    await say('pei', { renew: '敬轉角！敬還有地方可以坐的我們！', relocate: '敬轉角——它要換個地方繼續轉了。', close: '敬轉角。謝謝它讓我們坐了這麼久。' }[out]);
    // each friend remembers something about you
    for (const id of SW.CORE) { if (!here(id)) continue; await say(id, Story.finaleLine(id)); }
    const c = await choose([{ t: '舉杯：「敬轉角。」', v: 1 }, { t: '舉杯：「敬我們。」', v: 2 }, { t: '舉杯：「敬下一週。」', v: 3 }]);
    await narr(c === 1 ? '六個杯子碰在一起。' : c === 2 ? '大家同時笑了。樂樂說你很肉麻，但她舉得最高。' : '「下一週」——大家都知道，故事還沒結束。');
    if (st.f.ansonBrave && !st.f.ansonCollapsed && st.f.ansonPei !== 'couple' && here('anson') && here('pei')) {
      await narr('散場的時候，安森在門口叫住了小沛。你看到他說了很久，小沛聽了很久。');
      const a = Sys.pair('anson', 'pei').attract + (st.f.peiKnowsAnson ? 6 : 0);
      if (a >= 38) { st.f.ansonPei = 'couple'; await narr('最後，小沛踮起腳尖，抱了他一下。'); }
      else { st.f.ansonPei = 'over'; await narr('最後，小沛搖搖頭，然後笑著拍了拍他的肩膀。安森也笑了——是那種終於說出口的笑。'); }
    }
    for (const id of SW.CORE) if (here(id)) Sys.ch(id, { friend: 3, comfort: 3 }, true);
    Sys.mem(SW.CORE.filter((i) => here(i)), out === 'close' ? '第一週的最後一晚，大家在好日子的長桌上道別轉角' : '第一週的最後一晚，大家又坐在轉角的老位子上', 1, 'finale');
    await wait(60, '🌙 夜深了，大家陸續散去……');
    await Story.recap();
  } });
  Story.finaleLine = function (id) {
    const st = S(), has = (t) => Sys.hasMem(id, t);
    if (Sys.memsOf(id).filter((m) => m.tone !== 0).length === 0 && !['mira'].includes(id)) return '你這週去哪了？好像都沒看到你。下週……一起吃個飯吧？';
    if (id === 'mira') {
      const d = st.f.miraDecision;
      if (Sys.memsOf('mira').filter((m) => m.tone !== 0).length === 0) return '這週好像都沒怎麼跟你說到話。' + (st.f.miraDecision === 'go' ? '\n我下個月要去澳洲了。走之前，一起吃頓飯吧。' : '');
      let l = has('kept_test') ? '你週一準時來幫我跑測試的時候，我就知道你是可以信任的人。' : has('madeUp') ? '你那天放我鴿子，但你後來回來補完了。這比較重要。' : st.f.miraWalkaway ? '……我們之間還有一些話沒說完。下週吧。' : has('broke_miraTest') ? '我還記得週一的事喔。只是，記得不等於還在生氣。' : '這週好長。謝謝你在。';
      if (d === 'go') l += '\n下個月我就要走了。你要來機場送我。這是約定。';
      if (d === 'stay') l += st.f.miraAdvice ? '\n我決定留下來。……你的那句話，有一點點影響。' : '\n我決定留下來。至少現在。';
      return l;
    }
    if (id === 'hsiu') {
      if (st.f.hsiuMira === 'couple') return has('coachSong') ? '如果沒有你陪我練那首歌，我現在還在工作室裡走音。' : has('coverRelease') ? '你幫我顧了 release。我欠你一輩子。' : '我……我現在是有女朋友的人了。（他說得很小聲）';
      if (st.f.hsiuMira === 'rejected') return '我被拒絕了。但大家好像沒有笑我很久。……謝謝你們。';
      if (st.f.hsiuMissedGig) return '那首歌我還留著。下次吧。下次一定唱。';
      if (has('laughSong')) return '……你那天笑得很大聲。我還記得。';
      return has('praisedPublic') ? '你在大家面前說的那句話，我會記很久。' : 'Feature Owner 的事，明天見分曉。不管誰贏，請你吃飯。';
    }
    if (id === 'pei') {
      if (has('douhua')) return '你知道嗎？陳伯後來跟我說，他媽媽以前常提起我外婆。是你讓他們重新見面的。';
      if (has('voucher')) return '你預購的那些咖啡券，我每一張都會好好兌現。';
      if (has('gigPlay')) return '週五晚上跟你一起站在台上，是我今年最棒的一刻。';
      if (has('bdayHug')) return '我生日那天，你在門口抱我那一下……我撐過這一週，有一半是因為那一下。';
      return st.cafe.outcome === 'close' ? '不管在哪裡，只要你們在，我就有地方可以坐。' : '謝謝你這一週。真的。';
    }
    if (id === 'anson') {
      if (has('broke_ansonFri')) return '週五你說要來幫忙，最後沒來。……沒關係。我那天學到了，可以跟人說「我需要你」。';
      if (st.f.ansonCollapsed) return has('ansonRest') ? '我倒下那天，你來陪我。我第一次覺得，被照顧不是丟臉的事。' : '我這週學到一件事：休息不是偷懶。……說起來簡單。';
      if (has('helped_anson')) return '你那天在廚房幫我切了一百顆水餃的菜。我到現在手都不痠，因為是你切的。';
      if (has('helped_anson_grade')) return '你幫我對了三個班的考卷答案。那天晚上，我睡了七個小時。';
      return has('group') ? '謝謝你來小組。你說「不記得上次休息是什麼時候」，我一直在想那句話。' : '下週也一起吃飯吧。不用去教會也沒關係。';
    }
    if (id === 'lele') {
      if (st.f.leleMoved === 'player') return '我的新家有一張你挑的椅子。每次坐上去，我就覺得一個人也沒那麼可怕。';
      if (st.f.leleStay === 'player') return '謝謝你讓我睡你的沙發。鯊魚說它也很感謝你。';
      if (has('parkNight') || has('breakupNight')) return '分手那天晚上，如果你沒有出現……我大概會在河堤坐到天亮。';
      if (st.f.leleRejectedByHsiu) return '我這週跟阿修告白然後被拒絕了。我們現在可以拿來開玩笑了。對吧？對吧？';
      return '這週好亂喔。但是是好的那種亂。';
    }
    return '';
  };

  // =====================================================================
  // RECAP — what changed this week
  // =====================================================================
  Story.recap = async function () {
    const st = S();
    st.f.recapDone = true;
    const out = st.cafe.outcome;
    const world = [];
    world.push({ renew: '☕ 轉角咖啡廳續約成功了。大家還有地方可以坐。', relocate: `📦 轉角咖啡廳搬到了${{ church: '教會一樓的交誼廳', company: '矽藍科技一樓', studio: '回聲工作室的大廳' }[st.cafe.partner] || '新的地方'}。`, close: '🕯️ 轉角咖啡廳月底結束營業。朋友圈的新據點是好日子的長桌。' }[out] || '☕ 轉角的命運還沒有答案。');
    world.push({ player: '🛋️ 樂樂借住在你家的沙發上。', hsiu: '🛋️ 樂樂借住在阿修家，兩個人意外地合拍（或尷尬）。', cafe: '🛋️ 樂樂這週睡在咖啡廳的後台。', own: '🏠 樂樂搬進了自己的小套房。' }[st.f.leleStay] || '🛋️ 樂樂還在找自己的地方。');
    if (st.f.hsiuMira === 'couple') world.push('💕 阿修唱完那首歌之後，和米拉在一起了。');
    else if (st.f.hsiuMira === 'rejected') world.push('🎤 阿修唱了歌，米拉說她需要時間。');
    else if (st.f.hsiuMissedGig) world.push('📄 阿修那首歌，最後留在辦公室的斷電測試機旁邊。');
    world.push({ go: '✈️ 米拉決定去澳洲打工度假。', stay: '🏙️ 米拉決定留在新竹。', delay: '⏳ 米拉決定把澳洲延後一年。' }[st.f.miraDecision] || '');
    world.push(st.f.ansonCollapsed ? '🛌 安森在週五倒下了，第一次學著休息。' : '🍲 安森撐過了這一週。' + (st.f.ansonOk ? '因為有人幫他分擔。' : ''));
    if (st.f.ansonPei === 'couple') world.push('🌻 安森終於對小沛說出口。她抱了他。');
    if (st.p.partner) world.push(`❤️ 你和${nm(st.p.partner)}在一起了。`);
    const W = st.work;
    world.push(W.legend >= 10 ? '😈 你成了韌體部門的傳奇人物（不全是好事）。' : W.perf >= 8 ? '💻 你這週的工作表現很亮眼。Feature Owner 明天揭曉。' : '💻 Feature Owner 明天揭曉。');
    const ppl = SW.CORE.map((id) => {
      const all = Sys.memsOf(id).filter((m) => m.tone !== 0);
      const own = all.filter((m) => m.who.length === 1); // one-on-one moments say more than group ones
      const mems = own.slice(-4).concat(all.filter((m) => m.who.length > 1).slice(-Math.max(0, 4 - own.length))).sort((x, y) => x.t - y.t);
      const tags = Sys.tiers(id).map(([t, c]) => `<span class="tag ${c}">${t}</span>`).join('');
      return `<div class="card-sec"><h4>你和${nm(id)}</h4><div>${tags}</div>${mems.length ? `<ul>${mems.map((m) => `<li>${m.tone > 0 ? '💚' : '💢'} ${U.esc(m.text)}</li>`).join('')}</ul>` : '<p class="muted">這週你們幾乎沒有交集。</p>'}</div>`;
    }).join('');
    const s = st.stats;
    const titles = [];
    if (W.legend >= 10) titles.push('辦公室傳奇');
    if (s.kept >= 4 && s.broken === 0) titles.push('說到做到的人');
    if (s.broken >= 3) titles.push('爽約王');
    if (s.helped >= 4) titles.push('大家的後援');
    if (s.bugs >= 4) titles.push('Bug 獵人');
    if (st.f.lazyDays) titles.push('沙發哲學家');
    if (s.dates >= 2) titles.push('約會達人');
    if (s.church >= 2) titles.push('教會常客');
    if (s.gigs >= 1) titles.push('轉角的吉他手');
    if (!titles.length) titles.push('普通但真實的人');
    const html = `<div class="card-sec"><h4>這個世界現在的樣子</h4><ul>${world.filter(Boolean).map((w) => `<li>${U.esc(w)}</li>`).join('')}</ul></div>${ppl}
      <div class="card-sec"><h4>你這一週</h4><p>修好 ${s.bugs} 個 Bug・惡搞 ${s.pranks} 次・摸魚 ${s.slacked} 次・約會 ${s.dates} 次・守約 ${s.kept} 次・爽約 ${s.broken} 次・幫助別人 ${s.helped} 次・去教會 ${s.church} 次・運動 ${s.workouts} 次・下廚 ${s.cooked} 次</p><p>${titles.map((t) => `<span class="tag good">${t}</span>`).join('')}</p></div>
      <p class="muted">這不是結局。世界會繼續前進，而且會記得這一週。你可以繼續生活，或在手機「設定」重新開始，活一個完全不同的版本。</p>`;
    await UI.card({ kicker: '第一季・第一週回顧', title: '我們還有地方可以坐嗎？', html, buttons: [{ t: '繼續生活', v: 1 }] });
  };
  const baseMorning = Dir.morning;
  Dir.morning = async function () { if (!S().f.recapDone && T.day() >= 8) await Story.recap(); return baseMorning(); };
  add({ id: 'recap_auto', kind: 'scene', from: '22:30', day: 7, prio: 10, cond: (st) => !st.f.recapDone, run: async () => { await Story.recap(); } });
  add({ id: 'recap_auto2', kind: 'scene', day: [8, 9, 10], prio: 99, cond: (st) => !st.f.recapDone, run: async () => { await Story.recap(); } });

  // =====================================================================
  // WEEK 2+ — the world keeps going
  // =====================================================================
  // the outcome becomes physical: the café empties out and everyone's hangout moves with it
  add({ id: 'd8_cafe_move', kind: 'offscreen', from: '07:00', cond: (st) => T.day() >= 8 && !st.f.cafeEmptied && (st.cafe.outcome === 'close' || st.cafe.outcome === 'relocate'), run: (st) => {
    st.f.cafeEmptied = true;
    if (st.cafe.outcome === 'close') {
      msg('group', 'pei', '轉角的東西我這週慢慢搬。咖啡機先寄放在好日子，老蔡說吧台借我一角。之後想喝咖啡，來好日子找我☕');
    } else {
      const where = SW.PLACES[SW.Sched.cafeMap()].name;
      msg('group', 'pei', `搬家完成！！新轉角在「${where}」，今天開始營業～位子比較少，但窗戶很大🪟 大家的老位子我都留著。`);
    }
    if (st.f.leleStay === 'cafe') st.f.leleStay = 'own';
  } });
  add({ id: 'd8_feature', kind: 'approach', npc: 'boss', day: [8, 9, 10], where: 'office', prio: 60, run: async (st) => {
    const W = st.work;
    const me2 = W.perf * 3 + W.bossTrust * 0.6 + W.bugsDone.length * 3 + (st.f.releaseDone === 'player' ? 12 : 0) + (st.f.releaseOwner === 'auto' ? 10 : 0) - W.warn * 8 - Math.max(0, W.legend - 8);
    const hs = W.hsiuScore - 10 + (st.f.hsiuSupport ? 10 : 0) + (st.f.releaseOwner === 'hsiu' ? 12 : 0);
    const win = me2 >= hs;
    st.f.featureOwner = win ? 'player' : 'hsiu';
    await say('boss', '我宣布一下。這一季的 Feature Owner——');
    await say('boss', win ? `是 {N}。` : '是阿修。');
    if (win) {
      await narr('會議室響起掌聲。阿修也在拍手——拍得比誰都用力，然後低下頭。');
      const c = await choose([{ t: '走過去：「這次是運氣。下次換你。」', v: 1 }, { t: '「謝謝課長。」', v: 2 }]);
      if (c === 1) { await say('hsiu', '……少來。恭喜啦。真的。'); Sys.ch('hsiu', { friend: 5, trust: 3 }); }
      W.bossTrust += 3;
    } else {
      await narr('阿修愣在原地，好像不敢相信。');
      const c = await choose([{ t: '第一個站起來跟他說恭喜', v: 1 }, { t: '默默鼓掌', v: 2 }, { t: '「憑什麼？」', v: 3 }]);
      if (c === 1) { await say('hsiu', '……你是第一個跟我說恭喜的人。'); Sys.ch('hsiu', { friend: 8, trust: 5 }); Sys.mem('hsiu', '他當上 Feature Owner 時，你第一個說恭喜', 1, 'congrats'); }
      else if (c === 3) { Sys.ch('hsiu', { tension: 10 }); W.bossTrust -= 5; await say('boss', '……會後來我辦公室。'); }
    }
  } });
  add({ id: 'amb_group', kind: 'phone', once: false, cooldown: 1300, from: '09:00', to: '21:00', cond: () => T.day() >= 2, run: (st) => {
    const lines = [
      ['lele', '今天午餐要吃什麼！！我需要一個人幫我決定人生！'],
      ['hsiu', '有人知道公司咖啡機為什麼又壞了嗎'],
      ['pei', st.cafe.outcome === 'close' ? '我今天在家煮了咖啡，煮完才發現沒有客人可以喝。哈哈。' : '今天的蛋糕是檸檬塔！留了六塊！'],
      ['anson', '今天學生問我：老師你為什麼都不會累？我說我會。全班都嚇到了。'],
      ['mira', st.f.miraDecision === 'go' ? '今天把桌上的東西收了一箱。原來三年可以裝進一個紙箱。' : '今天的 regression 一次就過了。我很不安。'],
    ];
    const [who, text] = U.pick(lines);
    Sys.msg('group', who, text, { silent: true });
  } });
  for (const id of SW.CORE) {
    add({ id: 'echo_' + id, kind: 'talk', npc: id, once: false, cooldown: 600, prio: 45, label: `${nm(id)}好像還在介意什麼`, cond: (st) => {
      const p = st.prom.filter((p) => p.who === id && p.status === 'broken' && !st.f['apol_' + p.id] && p.id !== 'miraTest' && p.id !== 'party' && st.t - p.done > 360).pop();
      return !!p;
    }, run: async (st) => {
      const p = st.prom.filter((p) => p.who === id && p.status === 'broken' && !st.f['apol_' + p.id] && p.id !== 'miraTest' && p.id !== 'party').pop();
      const L = {
        mira: ['你上次說好的事……算了。', '我只是想知道，下次我還能不能相信你說的時間。'],
        hsiu: ['欸。上次那個約，你是忘了，還是不想來？', '……我不是在意。只是問問。'],
        pei: ['上次你沒來，我還以為你出事了。', '下次不能來，傳個訊息就好。我真的不介意，我只是會擔心。'],
        anson: ['上次的事，你不用放在心上。', '……不過我那天，其實有點需要人。'],
        lele: ['你上次放我鴿子！！', '我在那邊等了好久，還被店員同情了！'],
      }[id];
      for (const l of L) await say(id, l);
      const c = await choose([{ t: '「對不起，是我不好。」', v: 'sorry' }, { t: '「那天真的有事……」', v: 'excuse' }, { t: '「下次我一定到。我們重新約。」', v: 'remake' }]);
      st.f['apol_' + p.id] = c;
      if (c === 'sorry') { Sys.ch(id, { tension: -7, trust: 2 }); await say(id, '……嗯。好。'); }
      else if (c === 'excuse') { Sys.ch(id, { tension: -2 }); await say(id, '好吧。'); }
      else { Sys.ch(id, { tension: -5 }); await say(id, '你說的喔。'); UI.closeDialog(); await SW.Acts.invite(id, false); }
    } });
  }
  // favours return
  add({ id: 'fav_mira', kind: 'approach', npc: 'mira', day: [2, 3, 4, 5], where: 'office', from: '09:00', to: '17:00', prio: 20, cond: (st) => Sys.hasMem('mira', 'kept_test') || Sys.hasMem('mira', 'helped_test'), run: async (st) => {
    await say('mira', '今天你那個 bug，我早上順手幫你重現了。log 寄到你信箱了。');
    await say('mira', '……不是為了還你人情。只是剛好。');
    st.f.freeHint = true; Sys.ch('mira', { friend: 2 }, true);
  } });
  add({ id: 'fav_pei', kind: 'approach', npc: 'pei', where: 'cafe', prio: 20, cond: (st) => Sys.hasMem('pei', 'helped_shop') || Sys.hasMem('pei', 'bdayHug'), run: async () => {
    await say('pei', '今天這杯我請！還有這個可頌，剛出爐的。');
    await say('pei', '不要跟我客氣。你上次幫我那麼多。');
    Sys.item('coffee', 1); Sys.energy(10);
  } });
  add({ id: 'fav_hsiu', kind: 'offscreen', day: [3, 4, 5, 6], cond: (st) => Sys.hasMem('hsiu', 'praisedPublic') || Sys.hasMem('hsiu', 'helped_review'), run: (st) => {
    st.work.bossTrust += 3;
    Sys.later(30, 'msg', { thread: 'hsiu', from: 'hsiu', text: '課長今天問我 4521 誰修的比較漂亮。我說是你。不要謝我，我只是講事實。' });
  } });
  add({ id: 'fav_anson', kind: 'phone', day: [3, 4, 5, 6, 7], from: '11:30', cond: (st) => Sys.hasMem('anson', 'helped_anson') || Sys.hasMem('anson', 'ansonOpen'), run: (st) => {
    msg('anson', 'anson', '我幫你在超商買了一個便當，放在你家門口（或公司櫃檯）。不要又沒吃午餐😊');
    Sys.item('bento', 1);
  } });
  add({ id: 'fav_lele', kind: 'phone', day: [4, 5, 6, 7], from: '10:00', cond: (st) => Sys.hasMem('lele', 'parkNight') || Sys.hasMem('lele', 'breakupNight') || Sys.hasMem('lele', 'leleStay'), run: (st) => {
    msg('lele', 'lele', '我幫你在我們公司抽到兩張電影票！一張給你，一張給你想約的人😏');
    Sys.mood(5);
  } });
  // leaked secrets come back
  const LEAK = {
    lease: ['pei', ['樂樂說……是你跟她說的。', '我不是生氣大家知道。', '我是難過，第一個說出去的是你。']],
    hsiuSong: ['hsiu', ['米拉怎麼會知道？', '……你答應過我的。']],
    holiday: ['mira', ['阿修跑來問我是不是要去澳洲。', '我只跟你一個人說過。']],
    ansonPei: ['anson', ['小沛……好像知道了。', '是你說的吧。我沒有生氣。我只是……還沒準備好。']],
  };
  for (const f of Object.keys(LEAK)) {
    const [owner, lines] = LEAK[f];
    add({ id: 'leak_' + f, kind: 'approach', npc: owner, prio: 75, cond: (st) => !!st.f['leakFound_' + f] && !st.f['apol_leak_' + f], run: async (st) => {
      for (const l of lines) await say(owner, l);
      const c = await choose([{ t: '「對不起。我不應該說的。」', v: 'sorry' }, { t: '「我只是想幫你。」', v: 'help' }, { t: '（沉默）', v: 'quiet' }]);
      st.f['apol_leak_' + f] = c;
      if (c === 'sorry') { await say(owner, '……嗯。我知道你不是壞心。'); Sys.ch(owner, { tension: -6, trust: 2 }); }
      else if (c === 'help') { await say(owner, '我知道。可是我想自己說。'); Sys.ch(owner, { tension: -2 }); }
      else { Sys.ch(owner, { tension: 4 }); await narr(`${nm(owner)}等了一下，然後走開了。`); }
    } });
  }
  // skipping work has consequences
  add({ id: 'absent_work', kind: 'offscreen', once: false, cooldown: 1200, from: '20:30', to: '23:30', cond: (st) => !T.weekend() && T.day() >= 2 && !st.f['v_office_' + T.day()] && !st.f['absentDone_' + T.day()], run: (st) => {
    st.f['absentDone_' + T.day()] = true;
    const n = st.f.absentDays = (st.f.absentDays || (st.f.v_office_1 ? 0 : 1)) + 1;
    st.work.bossTrust -= 5; st.work.warn += n >= 3 ? 1 : 0;
    if (n === 1) msg('boss', 'boss', '你今天沒進公司？下次請假要先說。');
    else if (n === 2) msg('boss', 'boss', '今天也沒看到你。有什麼狀況，要說。');
    else if (n === 3) { msg('hsiu', 'hsiu', '你的 bug 我先幫你接了。課長問起來我說你身體不舒服。……你欠我。'); st.work.hsiuScore += 4; Sys.ch('hsiu', { trust: 2 }, true); }
    else if (n === 4) { msg('boss', 'boss', '明天早上九點半，來我辦公室一趟。人資也會在。'); st.f.hrTalk = T.day() + 1; }
    else msg('boss', 'boss', '……');
    Sys.mem([], `你第 ${n} 天沒去上班`, -1, 'absent', true);
  } });
  add({ id: 'hr_talk', kind: 'approach', npc: 'boss', where: 'office', from: '09:00', to: '18:00', prio: 70, cond: (st) => st.f.hrTalk && T.day() >= st.f.hrTalk, run: async (st) => {
    await say('boss', '坐。');
    await narr('課長辦公室裡多了一位人資，桌上放著一份你的出勤紀錄。');
    await say('boss', '這週你有好幾天沒出現。我不是要罵你，我想知道發生了什麼事。');
    const c = await choose([{ t: '「老實說……我好像有點撐不住了。」', v: 'honest' }, { t: '「家裡有點事。」', v: 'excuse' }, { t: '「我在思考人生。」', v: 'life' }]);
    if (c === 'honest') { await say('boss', '……謝謝你說實話。公司有諮商資源，下週先排兩天特休。回來之後，我們一起把工作量調整一下。'); st.work.bossTrust += 6; st.work.warn = Math.max(0, st.work.warn - 1); Sys.mood(8); }
    else if (c === 'excuse') { await say('boss', '好。下次請假要先說。這次記一支警告。'); st.work.warn += 1; }
    else { await say('boss', '……思考人生很好。在上班時間以外。'); await narr('人資在紀錄上寫了很長一段字。'); st.work.bossTrust -= 4; st.work.legend += 3; }
    st.f.hrTalk = null; st.f.absentDays = 0;
  } });
  add({ id: 'care_setup', kind: 'offscreen', day: [3, 4, 5, 6], from: '18:30', to: '19:30', cond: (st) => {
    const d = T.day(), out = (dd) => ['office', 'cafe', 'bar', 'church', 'gym', 'studio', 'city'].some((m) => st.f['v_' + m + '_' + dd]);
    return !out(d) && !out(d - 1) && st.p.map === 'home';
  }, run: (st) => {
    const who = ['lele', 'pei', 'anson', 'mira'].filter((id) => id !== st.p.roommate && !SW.Sched.busyAt(id, st.t + 40)).sort((a, b) => st.rel[b].friend - st.rel[a].friend)[0] || 'lele';
    st.f.careVisitor = who;
    SW.Sched.override(who, st.t + 25, st.t + 160, 'home', 'center', '來看你', 'care');
    msg(who, who, { lele: '你已經兩天沒出門了對吧？？我買了鹹酥雞，二十分鐘後到，不准說不。', pei: '你這兩天都沒來店裡……我帶點吃的過去喔。', anson: '我等一下拿點湯過去給你，放門口也可以。', mira: '你兩天沒出房門了。我煮了粥。不要問，吃就對了。' }[who]);
  } });
  add({ id: 'care_visit', kind: 'scene', where: 'home', prio: 55, cond: (st) => !!st.f.careVisitor && SW.W.present(st.f.careVisitor), run: async (st) => {
    const who = st.f.careVisitor; st.f.careVisitor = null;
    await narr('門鈴響了。');
    await say(who, { lele: '鹹酥雞外送！還有九層塔！快點吃！', pei: '我做了三明治，還有一杯熱拿鐵。店裡最好的豆子喔。', anson: '我煮了排骨湯。放涼了熱一下就好。', mira: '粥。不要說謝謝，先吃。' }[who]);
    await say(who, '你這兩天都沒出門。大家……有點擔心。');
    const c = await choose([{ t: '「我只是有點累。謝謝你來。」', v: 1 }, { t: '「我最近不太想見人……」', v: 2 }, { t: '「我在進行一個很重要的計畫：躺著。」', v: 3 }]);
    await say(who, c === 1 ? '累了就休息啊。但是休息完，要回來喔。' : c === 2 ? '那我坐在這裡就好，不講話也可以。' : '……很重要的計畫需要補充體力。來，吃。');
    Sys.energy(20); Sys.mood(12); Sys.ch(who, { friend: 5, comfort: 5, trust: 3 });
    Sys.mem(who, `你好幾天沒出門，${nm(who)}帶著吃的來看你`, 1, 'careVisit');
    SW.Sched.clearOv('care');
  } });
  add({ id: 'payday', kind: 'phone', day: 5, from: '10:00', run: (st) => {
    const missed = [1, 2, 3, 4].filter((d) => !st.f['v_office_' + d]).length, pay = 38000 - missed * 1800;
    Sys.money(pay);
    msg('boss', 'boss', missed ? `【人資通知】本月薪資已入帳。本週曠職 ${missed} 天，依規定扣薪 ${U.money(missed * 1800)}。` : '【人資通知】本月薪資已入帳，辛苦了。');
    UI.toast(`💰 薪水入帳 ${U.money(pay)}`);
  } });
  // a gentle nudge when the player has done nothing all day
  add({ id: 'lazy_check', kind: 'phone', once: false, cooldown: 1400, from: '16:00', to: '17:00', cond: (st) => st.p.map === 'home' && !st.f['v_office_' + T.day()] && !T.weekend() && T.day() <= 7, run: () => {
    const w = U.pick(['lele', 'pei', 'mira']);
    msg(w, w, { lele: '你今天在幹嘛！整天沒看到你！還活著嗎！', pei: '今天沒看到你耶～有空來喝杯咖啡？☕', mira: '你今天沒進公司？課長問了。我說你可能在閉關。' }[w]);
  } });
})(window.SW);
