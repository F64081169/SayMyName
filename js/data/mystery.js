'use strict';
// THE SPINE OF WEEK ONE — 誰把小沛的數字說出去了？
// The game opens on Sunday afternoon ("你知道是誰，對不對？") and cuts back seven days. On Thursday night somebody
// at Wednesday's table hands 小沛's numbers to Bloom. The culprit is picked per playthrough and each has a reason
// that is not quite evil. You find clues by watching people, asking 老蔡, prying at Vivian or listening to a drunk
// friend — and on Sunday you name someone, or protect someone, or say nothing.
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys, Dir = SW.Dir, H = SW.H;
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
  const Mys = SW.Mystery = {};
  const SUSPECTS = ['lele', 'hsiu', 'mira', 'anson'];

  // what each of them did, and what it looks like from the outside
  const CASE = {
    lele: {
      motive: ['我想說，Bloom 如果請小沛當店長，她就不用那麼累了。', '所以我把數字給了他們。我以為我在幫她。'],
      observe: '她的手機桌布換成了一張 Bloom 的新品海報。發現你在看，她很快把手機翻過去。',
      tsai: '那個綁馬尾的——樂樂？上週四跟一個穿套裝的女生在這裡開會。那個女生的名片是綠色的。',
      vivian: '是一位行銷界的朋友告訴我的。她說，這樣小沛說不定能來當店長。',
      drunk: ['我好像做了一件很糟的事。', '我把小沛的數字給了 Bloom。我以為我在幫她……'],
      red: '她一直在群組裡傳夜市的照片，問大家週五要不要一起去。好像在刻意找話題。',
    },
    hsiu: {
      motive: ['那天練完歌，我一個人去好日子喝酒。有個女生坐在我旁邊，很會聽人講話。', '我把轉角的事全講出來了。我不是故意的。我只是……很想找人講話。'],
      observe: '他的手機跳出一則通知：「謝謝你那天告訴我那麼多 🙏 —V」。他很快把它滑掉了。',
      tsai: '阿修上週四練完歌來這裡喝悶酒，旁邊坐了一個穿套裝的女生，兩個人聊了很久。他喝多了。',
      vivian: '是一位工程師告訴我的。那天他喝得有點多，一直在講一個要去澳洲的女生。',
      drunk: ['那天我喝醉了……有個 Bloom 的人坐我旁邊。', '我好像把轉角的事全講出來了。'],
      red: '他整個早上都在看機票價格。看到你的時候，他把分頁關了。',
    },
    mira: {
      motive: ['我覺得小沛應該放手。十五萬，一個禮拜，不可能的。', '我自己做不到的決定，我想幫她做。……我是不是很自私？'],
      observe: '她的筆記本上寫著：「40,000 / 150,000」，下面畫了兩條線，旁邊寫著「長痛不如短痛」。',
      tsai: '米拉週四一個人來，打了一通很長的電話。我聽到她說「Bloom」，還說「這樣對她比較好」。',
      vivian: '是一位很理性的小姐。她說，這是在幫小沛早點解脫。',
      drunk: ['……是我。我跟 Bloom 說的。', '我只是覺得，早一點結束，比較不痛。'],
      red: '她在看澳洲的租屋網站，一邊用計算機算匯率。算到一半，她嘆了一口氣。',
    },
    anson: {
      motive: ['我在小組裡請大家為小沛禱告。我把數字也說了，想讓大家知道有多急。', '我以為那是安全的地方。原來，陳伯的媳婦也在。'],
      observe: '他的教會週報上，代禱事項第三條寫著：「為轉角咖啡廳的經濟需要禱告（尚缺十一萬）」。',
      tsai: '陳伯的媳婦上禮拜來吃飯，說她們教會在為一間咖啡廳禱告。連缺多少錢都知道。',
      vivian: '我們是從教會那邊聽說的。房東的媳婦也在那間教會。',
      drunk: ['我在小組裡請大家為小沛禱告……我把數字也說了。', '我以為我在幫她。我好像害了她。'],
      red: '他在週報的空白處寫了好幾個名字，每個名字旁邊都畫了一個小小的勾。',
    },
  };

  Mys.mole = () => S().f.mole;
  Mys.active = () => { const st = S(); return !!st.f.moleStart && !st.f.moleAsked && T.day() <= 7; };
  Mys.clues = () => S().f.clues || [];
  Mys.count = (id) => Mys.clues().filter((c) => c.who === id).length;
  Mys.strong = () => Mys.clues().filter((c) => c.who === Mys.mole() && !c.red).length;
  Mys.clue = function (src, who, text, red) {
    const st = S(), L = st.f.clues || (st.f.clues = []);
    if (L.some((c) => c.src === src && c.who === who)) return false;
    L.push({ src, who, text, red: !!red, t: st.t });
    UI.toast(`🔍 新線索（${nm(who)}）・目前 ${L.length} 條`, 'mem');
    return true;
  };

  // who it is: picked once, quietly, on the first morning
  add({ id: 'mole_pick', kind: 'offscreen', day: 1, run: (st) => { st.f.mole = U.pick(SUSPECTS); } });
  // the culprit has to have been at Wednesday's table
  add({ id: 'mole_knows', kind: 'offscreen', day: 3, from: '21:35', cond: (st) => !!st.f.mole, run: (st) => { Sys.learn(st.f.mole, 'lease', 'pei', true); } });

  // ---------------------------------------------------------------------
  // prologue: Sunday, before the answer
  // ---------------------------------------------------------------------
  Mys.prologue = async function () {
    document.body.classList.add('prologue');
    try { await SW.scene(async () => {
      await narr('週日下午。');
      await narr('轉角咖啡廳的窗邊。陳伯就快到了，他會給一個答覆：這間店還能不能留下來。');
      await narr('小沛坐在你對面。她的眼睛很紅。');
      await say('pei', '有人把我們的事告訴了 Bloom。');
      await say('pei', '……{N}，你知道是誰，對不對？');
      await choose([{ t: '「……」', v: 1 }, { t: '「我——」', v: 2 }]);
      await narr('——七天前。');
    }); } finally { document.body.classList.remove('prologue'); }
  };

  // ---------------------------------------------------------------------
  // Thursday night: the leak is discovered
  // ---------------------------------------------------------------------
  add({ id: 'mole_start', kind: 'phone', day: 4, from: '22:20', cond: (st) => !!st.f.mole && K('lease') && !st.cafe.outcome, run: (st) => {
    st.f.moleStart = true;
    msg('pei', 'pei', `陳伯的兒子剛剛打給我。他說：「聽說你們只湊到 ${U.money(st.cafe.fund)}？Bloom 願意出兩倍。」`);
    later(1, 'pei', 'pei', '……那個數字，只有星期三晚上坐在桌上的人知道。');
    later(2, 'pei', 'pei', '{N}，你可以幫我想想，是誰嗎？我不想懷疑任何人。可是我好想知道。', 'mole_start', 600);
  } });
  R.mole_start = [
    { t: '「我會幫你查。週日之前。」', fn: (st) => { st.f.moleHunt = true; Sys.ch('pei', { trust: 4 }, true); later(2, 'pei', 'pei', '……謝謝。不要讓任何人知道你在查。'); } },
    { t: '「會不會是誤會？」', fn: () => { later(2, 'pei', 'pei', '也許吧。……我希望是。'); } },
    { t: '「知道是誰，又能怎樣呢？」', fn: () => { Sys.ch('pei', { comfort: -2 }, true); later(2, 'pei', 'pei', '……我也不知道。我只是不想再坐在一張不知道誰會說出去的桌子旁邊。'); } },
  ];
  SW.HINTS.push({ day: [5, 6, 7], to: '14:45', cond: () => Mys.active(), text: () => `🔍 誰把小沛的數字說出去了？（${Mys.clues().length} 條線索・觀察朋友、問老蔡）` });

  // clue sources: watching people
  const baseObserve = SW.Acts.observe;
  SW.Acts.observe = async function (id) {
    await baseObserve(id);
    if (!Mys.active() || !CASE[id]) return;
    const st = S();
    if (id === Mys.mole()) { if (Mys.clue('observe', id, CASE[id].observe)) await SW.scene(async () => { await narr(CASE[id].observe); }); }
    else if (!Mys.clues().some((c) => c.src === 'observe' && c.who === id) && Math.random() < 0.6) { Mys.clue('observe', id, CASE[id].red, true); await SW.scene(async () => { await narr(CASE[id].red); }); }
    st.f['observed_' + id + '_' + T.day()] = true;
  };
  // the bar owner sees everything
  const baseMinor = SW.Talk.minorRun;
  SW.Talk.minorRun = async function (id, v) {
    if (id === 'tsai' && v === 'hint' && Mys.active() && !Mys.clues().some((c) => c.src === 'tsai')) {
      const m = Mys.mole();
      await SW.scene(async () => { await say('tsai', CASE[m].tsai); await say('tsai', '……我只是說我看到的。其他的，你自己判斷。'); });
      Mys.clue('tsai', m, CASE[m].tsai);
      return;
    }
    return baseMinor(id, v);
  };
  // Vivian, when you ask where her numbers came from
  Mys.vivian = async function () {
    if (!S().f.moleStart || S().f.moleAsked) return;
    const m = Mys.mole();
    await say('vivian', CASE[m].vivian);
    await say('vivian', '其他的，我不能說。');
    Mys.clue('vivian', m, CASE[m].vivian);
  };
  // a drunk friend says the thing
  Mys.drunk = async function (id) {
    if (!Mys.active() || id !== Mys.mole() || Mys.clues().some((c) => c.src === 'drunk')) return false;
    for (const l of CASE[id].drunk) await say(id, l);
    Mys.clue('drunk', id, `${nm(id)}喝醉的時候說：「${CASE[id].drunk[1]}」`);
    await inner('你聽到了。現在，你知道了。');
    return true;
  };

  // ---------------------------------------------------------------------
  // Sunday: name someone
  // ---------------------------------------------------------------------
  const accuseOpts = () => SUSPECTS.map((s) => ({ t: `「是${nm(s)}。」`, sub: Mys.count(s) ? `你有 ${Mys.count(s)} 條和${nm(s)}有關的線索` : '你沒有線索', v: s }));
  Mys.accuse = async function (who, viaPhone) {
    const st = S(), m = Mys.mole();
    st.f.moleAsked = who;
    const sure = Mys.strong() >= 2;
    if (who === m) {
      if (sure || st.rel.pei.trust >= 62) {
        st.f.moleCaught = true; st.cafe.will += 6; st.cafe.cut = (st.cafe.cut || 0) + 8000;
        if (!viaPhone) { await say('pei', `……${nm(m)}。`); await narr('小沛閉上眼睛，很久沒有說話。'); await say('pei', '我早該想到的。謝謝你。我會自己去問清楚。'); await say('pei', '還有——陳伯那邊，我知道要怎麼說了。Bloom 拿到的，只是一個星期三的數字。'); }
        else later(3, 'pei', 'pei', `……${nm(m)}。我早該想到的。謝謝你。`);
        Sys.ch('pei', { trust: 8, friend: 4 }); Sys.pch('pei', m, { tension: 15, trust: -12 });
        Sys.mem('pei', `你幫她找出了是${nm(m)}把數字說出去的`, 1, 'moleFound');
      } else {
        st.f.moleCaught = 'guess';
        if (!viaPhone) { await say('pei', '……你有證據嗎？'); await inner('你沒有。你只是覺得。'); await say('pei', '……我會去問。但如果不是，我不知道要怎麼面對。'); }
        Sys.pch('pei', m, { tension: 8 });
      }
      Sys.at(st.t + 70, 'moleFace', {});
    } else if (who === 'me') {
      if (st.f.bloom === 'sold') {
        st.f.bloomRevealed = 'confess'; Sys.ch('pei', { trust: -18, friend: -10, tension: 14 }); Sys.mem('pei', '你承認收了 Bloom 的錢', -1, 'bloomBetray');
        if (!viaPhone) { await say('pei', '……你？'); await narr('她看著你，好像第一次看清楚你的臉。'); }
      } else if (st.rel.pei.trust >= 60 && !viaPhone) {
        await say('pei', '……不是你。'); await say('pei', '我知道不是你。你在保護誰？');
        const c = await choose(accuseOpts().concat([{ t: '（什麼都不說）', v: 'none' }]));
        if (c !== 'none') return Mys.accuse(c, viaPhone);
        st.f.moleAsked = 'none';
        await say('pei', '……好。我不逼你。');
      } else {
        st.f.moleTookFall = true; Sys.ch('pei', { trust: -15, friend: -8 }); Sys.mem('pei', '你說是你把數字說出去的', -1, 'tookFall');
        Sys.ch(m, { trust: 12, friend: 6 }, true); Sys.mem(m, '你替他／她扛下了洩密的事', 1, 'tookFallFor', true);
        if (!viaPhone) { await say('pei', '……為什麼？'); await inner(`你沒有回答。${nm(m)}會知道你做了什麼。`); }
      }
    } else if (who === 'none') {
      if (Mys.strong() >= 2) { Sys.lie({ id: 'moleSilent', to: 'pei', text: '你說你不知道是誰洩密的', w: [m], weight: 12, chance: 0.15, caught: `${nm(m)}自己跟我說了。……你早就知道，對不對？` }); if (!viaPhone) await inner('你知道。你選擇不說。'); }
      if (!viaPhone) await say('pei', '……嗯。沒關係。');
    } else {
      st.f.moleWrong = who;
      if (!viaPhone) { await say('pei', `……${nm(who)}？真的嗎？`); await say('pei', '我會去問。'); }
      Sys.pch('pei', who, { tension: 12 });
      Sys.at(st.t + 90, 'moleWrong', { who });
    }
  };
  add({ id: 'mole_ask', kind: 'scene', day: 7, where: 'cafe', from: '13:20', to: '14:44', cast: ['pei'], prio: 92, cond: () => Mys.active(), run: async (st) => {
    await narr('週日下午。轉角的窗邊。陳伯就快到了。');
    await narr('小沛坐在你對面。她的眼睛很紅。');
    await say('pei', '有人把我們的事告訴了 Bloom。');
    await say('pei', '……{N}，你知道是誰，對不對？');
    await inner('七天前，你還不知道這一刻會來。');
    const c = await choose(accuseOpts().concat([{ t: '「……是我。」', v: 'me' }, { t: '「我不知道。」', v: 'none' }]));
    await Mys.accuse(c, false);
  } });
  add({ id: 'mole_ask_phone', kind: 'phone', day: 7, from: '14:30', cond: () => Mys.active() && !S().fired.mole_ask, run: () => {
    msg('pei', 'pei', '陳伯快到了。……你知道是誰說出去的嗎？', 'mole_ask', 20);
  } });
  const byPhone = (who) => () => { if (!S().f.moleAsked) Mys.accuse(who, true); };
  R.mole_ask = () => SUSPECTS.map((s) => ({ t: `「是${nm(s)}。」`, fn: byPhone(s) })).concat([{ t: '「我不知道。」', fn: byPhone('none') }]);
  // the one you named comes to you
  H.moleFace = function () { S().f.moleFaceReady = true; };
  for (const id of SUSPECTS) add({ id: 'mole_face_' + id, kind: 'approach', npc: id, prio: 80, cond: (st) => !!st.f.moleFaceReady && !st.f.moleFaced && st.f.mole === id, run: () => Mys.face(id) });
  Mys.face = async function (id) {
    const st = S();
    st.f.moleFaced = true;
    await say(id, '小沛來問我了。');
    for (const l of CASE[id].motive) await say(id, l);
    const c = await choose([{ t: '「你應該自己跟她說對不起。不是跟我。」', v: 'pei' }, { t: '「我懂你為什麼這樣做。」', v: 'understand' }, { t: '「你差點毀了她。」', v: 'harsh' }]);
    if (c === 'pei') { await say(id, '……嗯。我現在就去。'); Sys.pch('pei', id, { tension: -8 }); Sys.ch(id, { trust: 3 }); }
    else if (c === 'understand') { await say(id, '……謝謝你沒有把我當壞人。'); Sys.ch(id, { comfort: 6, trust: 4 }); }
    else { await say(id, '……我知道。'); Sys.ch(id, { tension: 8 }); await inner(`${nm(id)}低下頭。你說的是事實。事實有時候也是一把刀。`); }
    Sys.mem(id, '洩密的事被發現之後，你們談過', c === 'harsh' ? -1 : 1, 'moleTalk');
  };
  // the wrong name
  H.moleWrong = function (d) {
    const st = S();
    Sys.ch(d.who, { trust: -18, tension: 16 }, true);
    Sys.mem(d.who, `你在小沛面前說是${nm(d.who)}洩密的`, -1, 'accusedWrong', true);
    st.f.moleWrongReady = d.who;
  };
  for (const id of SUSPECTS) add({ id: 'mole_wrong_' + id, kind: 'approach', npc: id, prio: 79, cond: (st) => st.f.moleWrongReady === id && !st.f.moleWrongFaced, run: async (st) => {
    st.f.moleWrongFaced = true;
    await say(id, '小沛問我，是不是我把她的數字說出去的。');
    await say(id, '她說，是你跟她說的。');
    const c = await choose([{ t: '「對不起。我猜錯了。」', v: 'sorry' }, { t: '「我只是說了我的推測。」', v: 'guess' }, { t: '「所以真的不是你？」', v: 'doubt' }]);
    if (c === 'sorry') { Sys.ch(id, { tension: -6 }); await say(id, '……下次猜之前，可以先問我嗎？'); }
    else if (c === 'guess') { await say(id, '你的推測，讓小沛整個下午都不敢看我。'); }
    else { Sys.ch(id, { tension: 8, trust: -5 }); await say(id, '……你真的覺得我會這樣做？'); }
  } });
  // week two: the truth surfaces if it wasn't found
  add({ id: 'mole_w2', kind: 'phone', day: [9, 10], from: '10:00', cond: (st) => !!st.f.moleStart && st.f.moleCaught !== true && !st.f.moleRevealedW2, run: (st) => {
    st.f.moleRevealedW2 = true;
    const m = st.f.mole;
    msg('pei', 'pei', `Vivian 不小心說溜嘴了。洩密的是${nm(m)}。`);
    if (st.f.moleWrong) later(2, 'pei', 'pei', `……那天你說是${nm(st.f.moleWrong)}。我差點就信了。`);
    else if (st.f.moleAsked === 'none' && Mys.strong() >= 2) later(2, 'pei', 'pei', '你那天說你不知道。……你真的不知道嗎？');
    Sys.pch('pei', m, { tension: 12, trust: -10 });
    st.f.moleFaceReady = true;
  } });
  // the leak itself moves the outcome
  Mys.outcomeNeed = () => { const st = S(); return st.f.moleStart && st.f.moleCaught !== true ? 12000 : 0; };

  // what the recap should know
  Mys.profile = function () {
    const st = S(), t3 = [], hidden = [];
    if (!st.f.moleStart) return { t3, hidden };
    const m = st.f.mole, a = st.f.moleAsked;
    if (a === m) t3.push(st.f.moleCaught === true ? `你找出了是${nm(m)}把小沛的數字說出去的` : `你猜對了是${nm(m)}，但沒有證據`);
    else if (st.f.moleTookFall) t3.push(`你替${nm(m)}扛下了洩密的事`);
    else if (st.f.moleWrong) t3.push(`你在小沛面前冤枉了${nm(st.f.moleWrong)}`);
    else if (a === 'none' && Mys.strong() >= 2) hidden.push(`你知道是${nm(m)}洩的密，但你沒有說`);
    return { t3, hidden };
  };

  // ---------------------------------------------------------------------
  // every night ends on a question
  // ---------------------------------------------------------------------
  const hook = (id, day, from, cond, fn) => add({ id, kind: 'phone', day, from, cond, run: fn });
  hook('hook_d1', 1, '22:40', () => true, () => msg('lele', 'lele', '阿哲約我明天晚上在好日子見面，說有事要說。……我有不好的預感😶'));
  hook('hook_d2', 2, '23:00', (st) => K('lease') || !!st.f.leleBrokeUp, () => msg('group', 'pei', '明天晚上七點，老位子。大家都來好不好？我有一件事想說。'));
  hook('hook_d3', 3, '23:10', () => true, () => msg('hsiu', 'hsiu', '你明天晚上……算了。沒事。晚安。'));
  hook('hook_d5', 5, '23:40', (st) => !st.f.miraAdvice, () => msg('mira', 'mira', '明天我要決定一件很大的事。……可以找你聊聊嗎？'));
  hook('hook_d6', 6, '23:00', (st) => K('lease') && !st.cafe.outcome, () => { msg('pei', 'pei', '明天三點。……你會來吧？'); if (Mys.active()) later(1, 'pei', 'pei', '還有，我還是想知道是誰。'); });
  hook('hook_d8', 8, '22:30', (st) => !!st.f.featureOwner, (st) => msg('boss', 'boss', st.f.featureOwner === 'player' ? '明天九點半會議室。分工由你來。' : '明天九點半會議室。阿修會分工，你配合。'));
  hook('hook_d9', 9, '23:00', () => true, () => msg('hsiu', 'hsiu', '客戶那邊好像出事了。我睡不著。'));
  hook('hook_d10', 10, '23:20', (st) => !st.f.ansonW2 || st.f.ansonW2 === 'believe', () => msg('group', 'anson', '大家晚安！我很好喔！😊'));
  hook('hook_d12', 12, '23:00', (st) => st.cafe.outcome === 'renew' || st.cafe.outcome === 'close', (st) => { if (st.cafe.outcome === 'renew') msg('group', 'lele', '明天公司活動在轉角！！我好興奮！！'); else msg('pei', 'pei', '明天要給 Bloom 答覆了。我還是不知道。'); });
})(window.SW);
