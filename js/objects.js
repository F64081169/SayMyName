'use strict';
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys, H = SW.H;
  const S = () => SW.S;
  const nm = (id) => SW.name(id);
  const say = (w, t, e) => UI.say(w, t, e);
  const me = (t) => UI.say('me', t);
  const narr = (t) => UI.say('narr', t);
  const choose = (o, p) => UI.choose(o, p);
  const here = (id) => SW.W.present(id);
  const OBJ = SW.OBJ = {};
  const SUB = SW.OBJ_SUB = {};
  const wd = () => !T.weekend();

  async function timed(mins, label, fn) {
    if (!(await Sys.confirmTime(mins, label))) return false;
    await SW.scene(async () => { if (fn) await fn(); await Sys.advance(mins, `⏳ ${label}……`); });
    return true;
  }

  // ===== OFFICE =====
  SUB.mydesk = () => { const b = SW.Puzzles.today(); return b ? `今天的 Bug：${b.title}` : '今天的 Bug 都清完了'; };
  OBJ.mydesk = () => {
    const st = S(), bug = SW.Puzzles.today();
    return [
      bug ? { icon: '🐞', t: `修 Bug：${bug.short}`, sub: '約 90 分鐘・Debug 小遊戲（中途放棄只花 15 分鐘）', v: 'bug', run: () => workBug(bug) } : null,
      { icon: '📝', t: '寫週報', sub: '60 分鐘・主管會看', v: 'report', run: () => timed(60, '寫週報', null).then((ok) => { if (ok) { st.work.perf += 1; st.work.bossTrust += 1; UI.toast('週報寫完了。主管應該會滿意。'); } }) },
      { icon: '📺', t: '摸魚', sub: '30 分鐘・心情變好、但有風險', v: 'slack', run: slack },
      { icon: '😈', t: '惡搞同事', sub: '辦公室傳奇的誕生', v: 'prank', run: prankMenu },
      { icon: '🏃', t: '準時下班', sub: '直接走到公司門口', v: 'leave', run: () => { const b = SW.W.building('office'); SW.W.enter('city', b.door[0] + 0.5, b.door[1] + 2.4, 'down'); } },
    ];
  };
  async function workBug(bug) {
    if (!(await Sys.confirmTime(90, `修 ${bug.short}`))) return;
    const st = S();
    const partner = st.f.freeHint || (here('mira') && SW.W.distTo('mira') < 6) ? 'mira' : here('hsiu') && SW.W.distTo('hsiu') < 6 ? 'hsiu' : null;
    st.f.freeHint = false;
    let res;
    await SW.scene(async () => {
      res = await SW.MG.debug(bug.id, { partner, title: bug.title });
      await Sys.advance(res.solved ? 90 : res.quit ? 15 : 60, res.solved ? '⏳ 寫 patch、跑測試、送 PR……' : '⏳ 你盯著 log 到眼睛發酸……');
      if (res.solved) {
        st.work.bugsDone.push(bug.id); st.stats.bugs++; st.work.perf += res.mistakes <= 1 ? 3 : 2; st.work.bossTrust += res.mistakes <= 1 ? 4 : 2;
        Sys.skill('debug', 0.5);
        await narr(res.mistakes <= 1 ? `✅ ${bug.short} 修好了，乾淨俐落。` : `✅ ${bug.short} 修好了。過程有點狼狽，但它綠了。`);
        if (bug.id === 'ps4wake') { st.f.bug4521 = st.t <= T.at(1, '17:00') ? 'ontime' : 'late'; if (Sys.pending('bug4521')) Sys.keep('bug4521', true); }
        if (partner) { Sys.ch(partner, { friend: 3, trust: 2 }); Sys.mem(partner, `你們一起修好了 ${bug.short}`, 1, 'debug_' + bug.id, true); if (partner === 'hsiu') st.work.hsiuScore += 2; }
      } else {
        await narr('❌ 還沒找到根因。也許換個腦袋再來，或找人一起看。');
        st.work.perf += 0.5;
      }
    });
    Sys.energy(-12);
  }
  async function slack() {
    const st = S();
    await SW.scene(async () => {
      const v = await choose([{ t: '看貓咪影片', v: 'cat' }, { t: '偷逛購物網站', v: 'shop' }, { t: '在群組跟朋友聊天', v: 'chat' }, { t: '研究「如何優雅地離職」', v: 'quit' }]);
      const caught = here('boss') && Math.random() < 0.38;
      if (caught) {
        await narr('背後傳來皮鞋聲。');
        await say('boss', '……你在看什麼？');
        const c = await choose([{ t: '「在研究競品的 SSD 拆解影片。」', v: 'lie' }, { t: '「休息一下，馬上回來。」', v: 'honest' }, { t: '光速切回 IDE，假裝打字', v: 'alt' }]);
        if (c === 'lie') { if (st.p.skill.debug >= 4) { await say('boss', '喔？那寫一頁心得給我。'); st.work.bossTrust += 1; } else { await say('boss', '螢幕上那隻貓也在拆 SSD 嗎？'); st.work.bossTrust -= 6; st.work.warn++; } }
        else if (c === 'honest') { await say('boss', '休息可以，有限度。Bug 記得。'); st.work.bossTrust -= 2; }
        else { await say('boss', '……你的 IDE 怎麼在播 BGM？'); st.work.bossTrust -= 4; st.work.legend += 2; }
      } else {
        await narr({ cat: '你看了二十分鐘的貓咪影片。其中一隻貓長得很像林課長。', shop: '你把一台咖啡機加入購物車，然後關掉頁面。成熟的大人。', chat: '群組裡大家在吵晚餐吃什麼。你提議鹹酥雞，全票通過。', quit: '你看完一篇〈三十歲前一定要離職一次〉，然後心滿意足地回去工作。' }[v]);
        st.work.legend += 1;
      }
      await Sys.advance(30, false);
    });
    Sys.mood(8); Sys.energy(4); st.stats.slacked++;
  }
  async function prankMenu() {
    const st = S();
    const v = await UI.sheet('惡搞誰？', '搞事要有喜劇效果，也要承擔後果。', [
      { icon: '📅', t: '發假會議：「跨部門 Bug 祈福大會」', sub: '下午三點、會議室、全部門', v: 'meeting', dis: SW.dailyHas('prank_meeting') || T.mod() > 14 * 60 + 30 },
      { icon: '🐱', t: '把米拉的桌布換成一百隻貓', sub: here('mira') && SW.W.distTo('mira') < 5 ? '她就在旁邊，太危險' : '趁她不在', v: 'wall', dis: (here('mira') && SW.W.distTo('mira') < 5) || st.f.prankWall },
      { icon: '⌨️', t: '把阿修的鍵帽排成「我愛QA」', sub: here('hsiu') && SW.W.distTo('hsiu') < 5 ? '他就在旁邊' : '趁他不在', v: 'keys', dis: (here('hsiu') && SW.W.distTo('hsiu') < 5) || st.f.prankKeys },
    ]);
    if (!v) return;
    st.stats.pranks++; SW.dailyOnce('prank_' + v);
    if (v === 'meeting') {
      await SW.scene(async () => { await narr('你用公司系統寄出會議邀請：「跨部門 Bug 祈福大會｜請攜帶您最痛恨的 Bug 一隻」。'); await narr('收件人：整個韌體部門。按下送出的瞬間，你感到一種神聖的平靜。'); });
      st.f.fakeMeeting = T.day(); Sys.at(T.today('15:00'), 'fakeMeeting', {});
    } else if (v === 'wall') {
      await SW.scene(async () => { await narr('你在米拉的螢幕上設定了一百隻貓的桌布，還附上一行字：「QA = Quite Adorable」。'); });
      st.f.prankWall = T.day(); Sys.later(60, 'prankWall', {});
    } else {
      await SW.scene(async () => { await narr('你花了十分鐘，把阿修的機械鍵盤鍵帽重新排列。現在左手區寫著「我愛QA」。'); });
      st.f.prankKeys = T.day(); Sys.later(50, 'prankKeys', {});
    }
    st.work.legend += 2;
  }
  H.fakeMeeting = function () {
    const st = S();
    st.work.legend += 4; st.work.bossTrust -= 3;
    Sys.ch('hsiu', st.rel.hsiu.friend > 55 ? { friend: 2 } : { tension: 4 }, true);
    Sys.msg('group', 'mira', '有人知道「跨部門 Bug 祈福大會」是誰發的嗎？會議室擠了三十個人，阿修真的帶了一張印出來的 crash log 來。');
    Sys.msgLater(4, 'group', 'hsiu', '我以為是正式活動。我還準備了講稿。');
    Sys.msgLater(8, 'group', 'lele', '我要哭了這是我今年聽過最好笑的事');
    Sys.mem(['mira', 'hsiu'], '「跨部門 Bug 祈福大會」事件', 0, 'fakeMeeting', true);
    st.f.bossMemo = T.day() + 1;
  };
  H.prankWall = function () {
    const st = S(), r = st.rel.mira;
    if (r.friend >= 60 && r.tension < 25) { Sys.msg('mira', 'mira', '……QA = Quite Adorable 是誰寫的。我要截圖存證。（我沒有要換回來）'); Sys.ch('mira', { comfort: 4, friend: 2 }, true); Sys.mem('mira', '你把米拉的桌布換成一百隻貓，她偷偷留著', 1, 'prankWall', true); }
    else { Sys.msg('mira', 'mira', '我在跑重要的測試報告，主管走過來看到一百隻貓。謝謝你喔。'); Sys.ch('mira', { tension: 6, trust: -2 }, true); Sys.mem('mira', '你在她趕報告的時候惡搞她的電腦', -1, 'prankWall', true); }
  };
  H.prankKeys = function () {
    const st = S(), r = st.rel.hsiu;
    if (r.friend >= 55) { Sys.msg('hsiu', 'hsiu', '你很閒是不是。……米拉看到笑到噴咖啡。好啦，算你贏。'); Sys.ch('hsiu', { comfort: 4 }, true); Sys.pch('hsiu', 'mira', { attract: 3, tension: -3 }); }
    else { Sys.msg('hsiu', 'hsiu', '我花了二十分鐘才裝回來。下次我會報復。'); Sys.ch('hsiu', { tension: 7 }, true); }
    Sys.mem('hsiu', '你把阿修的鍵帽排成「我愛QA」', 0, 'prankKeys', true);
  };

  OBJ.testbench = () => {
    const st = S(), pr = Sys.pending('miraTest');
    return [
      pr && SW.W.present('mira') ? { icon: '🧪', t: '幫米拉跑 regression', sub: '你答應過的', v: 'mira', run: () => SW.Acts.helpMira() } : null,
      pr && !SW.W.present('mira') ? { icon: '🧪', t: '先自己把米拉的測試跑起來', sub: '她不在，但你可以先開始', v: 'mira2', run: async () => { await timed(60, '跑 regression', async () => { await narr('你把米拉留下的測試腳本跑完，把結果整理好放在她桌上。'); }); Sys.keep('miraTest'); Sys.ch('mira', { trust: 5 }); Sys.mem('mira', '你守約，替米拉把 regression 跑完', 1, 'kept_test'); } } : null,
      { icon: '🔬', t: '自己做壓力測試', sub: '60 分鐘・工作表現', v: 'self', run: () => timed(60, '做壓力測試', async () => { await narr('SSD 在 70 度的恆溫箱裡跑了一小時，沒有掉速。很好，你也沒有掉速。'); }).then((ok) => { if (ok) { st.work.perf += 1; Sys.energy(-6); } }) },
    ];
  };
  OBJ.meeting = () => {
    const st = S();
    return [
      { icon: '🤡', t: '開一場荒謬會議', sub: '拉同事來討論「SSD 會不會做夢」', v: 'absurd', run: async () => {
        await SW.scene(async () => {
          await narr('你在白板寫下議題：「如果 SSD 會做夢，它會夢到什麼？」');
          const pre = SW.W.npcsHere().filter((i) => i === 'mira' || i === 'hsiu');
          if (pre.includes('hsiu')) await say('hsiu', '……夢到沒有 bad block 的世界。（他竟然認真回答）');
          if (pre.includes('mira')) await say('mira', '它會夢到有人在上線前一天才給它新韌體。');
          if (!pre.length) await narr('結果只來了兩個實習生。他們很認真地做了筆記。');
          await Sys.advance(30, false);
        });
        st.work.legend += 3; st.work.bossTrust -= 2; Sys.mood(6);
        for (const i of SW.W.npcsHere().filter((i) => SW.CH[i].core)) Sys.ch(i, { comfort: 3 }, true);
      } },
      { icon: '🧘', t: '躲在會議室冷靜一下', sub: '15 分鐘', v: 'calm', run: () => timed(15, '在會議室發呆', async () => { await narr('白板上還留著上一場會議的字：「先求有，再求好，最後求下班」。'); }).then((ok) => { if (ok) Sys.mood(5); }) },
    ];
  };
  OBJ.coffeeMachine = () => [
    { icon: '☕', t: '泡一杯咖啡', sub: '+體力・10 分鐘', v: 'brew', run: async () => { await Sys.advance(10, false); Sys.energy(12); UI.toast('☕ 公司咖啡，難喝但有用。'); } },
    { icon: '😀', t: '在阿修的馬克杯畫笑臉', sub: '小小的惡作劇', v: 'mug', dis: SW.dailyHas('mug'), run: async () => { SW.dailyOnce('mug'); await SW.scene(async () => { await narr('你用白板筆在阿修的馬克杯上畫了一個很像他的笑臉。'); }); Sys.later(40, 'mugFound', {}); S().work.legend += 1; } },
  ];
  H.mugFound = () => { const st = S(); if (st.rel.hsiu.comfort > 45) { Sys.msg('hsiu', 'hsiu', '杯子上那個是我？我才沒有那麼醜。……不過我拍下來當大頭貼了。'); Sys.ch('hsiu', { comfort: 3 }, true); } else Sys.msg('hsiu', 'hsiu', '誰在我杯子上亂畫。'); };
  OBJ.microwave = () => [
    Sys.has('bento') ? { icon: '🍱', t: '熱便當來吃', sub: '+體力', v: 'eat', run: async () => { Sys.item('bento', -1); await Sys.advance(15, false); Sys.energy(30); Sys.mood(3); UI.toast('🍱 熱騰騰的雞腿便當。'); } } : null,
    { icon: '🐟', t: '微波一整條鯖魚', sub: '傳說級行為・後果自負', v: 'fish', dis: !!S().f.fish, run: async () => {
      const st = S(); st.f.fish = T.day();
      await SW.scene(async () => {
        await narr('你把一整條鹽烤鯖魚放進微波爐，按下三分鐘。');
        await narr('三十秒後，整層樓都知道了。');
        if (here('mira')) await say('mira', '……是誰。是誰！！');
        if (here('hsiu')) await say('hsiu', '我的鍵盤上都是魚的味道。我要提告。');
        if (here('boss')) await say('boss', '（從辦公室走出來，深呼吸，又走回去）');
      });
      st.work.legend += 5; st.work.bossTrust -= 4; for (const id of ['mira', 'hsiu']) Sys.ch(id, { tension: 3 }, true);
      for (const id of SW.CORE) Sys.learn(id, 'fish', null, true);
      Sys.later(120, 'msg', { thread: 'group', from: 'lele', text: '聽說你們公司有人微波鯖魚？？？？這是我今年聽過第二好笑的事' });
    } },
  ];
  OBJ.officeFridge = () => [
    { icon: '🥤', t: '拿自己的飲料', sub: '+體力', v: 'drink', run: async () => { Sys.energy(6); UI.toast('你喝掉了自己放了三天的豆漿。'); } },
    { icon: '🍮', t: '偷吃阿修的布丁', sub: '上面寫著「修的 勿動」', v: 'pudding', dis: !!S().f.pudding, run: async () => {
      S().f.pudding = T.day();
      await SW.scene(async () => { await narr('你吃掉了阿修的布丁。焦糖很香，罪惡感更香。'); });
      Sys.mood(4); Sys.later(90, 'puddingFound', {});
    } },
  ];
  H.puddingFound = () => {
    if (Math.random() < 0.65) { Sys.msg('group', 'hsiu', '誰吃了我的布丁。我有寫名字。我有。寫。名字。'); Sys.ch('hsiu', { tension: 5 }, true); SW.S.f.puddingSuspect = true; }
  };
  OBJ.officeSofa = () => [
    { icon: '😴', t: '偷睡午覺', sub: '45 分鐘・+體力・有風險', v: 'nap', run: async () => {
      const st = S();
      await SW.scene(async () => {
        await Sys.advance(45, '💤 你在茶水間沙發上睡著了……');
        if (wd() && T.mod() > 9 * 60 && T.mod() < 18 * 60 && Math.random() < 0.3) {
          await narr('你醒來時，林課長正站在旁邊泡咖啡，看著你。');
          await say('boss', '睡得好嗎？……下午的 demo 你負責開場。');
          st.work.bossTrust -= 3;
        } else await narr('沒人發現。你像一顆充飽電的 SSD。');
      });
      Sys.energy(22);
    } },
  ];
  OBJ.officeBoard = () => [{ icon: '📌', t: '看公告', v: 'read', run: () => SW.scene(async () => { for (const l of SW.Talk.board('office')) await narr(l); }) }];
  OBJ.deskMira = () => [
    { icon: '📝', t: '留一張便利貼', sub: '寫點鼓勵的話', v: 'note', dis: SW.dailyHas('note_mira'), run: () => note('mira') },
    { icon: '🐱', t: '惡搞她的電腦', sub: '換桌布', v: 'p', dis: here('mira') && SW.W.distTo('mira') < 5 || !!S().f.prankWall, run: prankMenu },
  ];
  OBJ.deskHsiu = () => [
    { icon: '📝', t: '留一張便利貼', sub: '寫點鼓勵的話', v: 'note', dis: SW.dailyHas('note_hsiu'), run: () => note('hsiu') },
    { icon: '⌨️', t: '惡搞他的鍵盤', sub: '重排鍵帽', v: 'p', dis: here('hsiu') && SW.W.distTo('hsiu') < 5 || !!S().f.prankKeys, run: prankMenu },
  ];
  async function note(id) {
    SW.dailyOnce('note_' + id);
    const v = await UI.sheet('寫什麼？', '', [
      { icon: '💪', t: '「你今天也很努力，辛苦了」', v: 'kind' },
      { icon: '😂', t: '畫一隻很醜的貓', v: 'cat' },
      { icon: '🔧', t: '「你昨天那個 fix 很漂亮」', v: 'praise' },
    ]);
    if (!v) return;
    const fav = (id === 'hsiu' && v === 'praise') || (id === 'mira' && v === 'cat');
    Sys.later(45, 'noteFound', { id, fav });
    UI.toast('📝 你把便利貼貼在螢幕邊。');
  }
  H.noteFound = (d) => { Sys.ch(d.id, { friend: d.fav ? 5 : 3, comfort: 2 }, true); Sys.msg(d.id, d.id, d.id === 'mira' ? (d.fav ? '那隻貓醜到很可愛。我貼在螢幕上了。' : '……便利貼收到了。謝謝。') : (d.fav ? '……那個 fix 本來就很漂亮。（但謝了）' : '幹嘛突然這麼溫馨。'), {}); };

  // ===== HOME =====
  OBJ.bed = () => {
    const m = T.mod();
    return [
      { icon: '🌙', t: '睡覺（到明天早上）', sub: m < 18 * 60 && m > 6 * 60 ? '⚠️ 現在睡會跳過今天剩下的一切' : '恢復體力', v: 'sleep', run: async () => { if (m < 18 * 60 && m > 6 * 60 && !(await sureSleep())) return; if (!(await Sys.confirmTime((T.today('07:45') + (m > 7 * 60 ? 1440 : 0)) - S().t, '睡覺'))) return; await Sys.sleepUntil('07:45'); } },
      { icon: '😴', t: '小睡一小時', sub: '+體力', v: 'nap', run: async () => { if (!(await Sys.confirmTime(60, '小睡'))) return; await Sys.advance(60, '💤 小睡一下……'); Sys.energy(20 + (S().p.restBonus ? 8 : 0)); } },
      { icon: '🛌', t: '什麼都不做，躺一整天', sub: '直接睡到明天早上', v: 'lazy', dis: m > 16 * 60, run: lazyDay },
    ];
  };
  async function sureSleep() {
    let ok = false;
    await SW.scene(async () => { await narr(`現在才 ${U.fmt(T.mod())}。睡下去會直接到明天早上，今天的事都會在你睡覺時發生。`); ok = await choose([{ t: '還是要睡', v: true }, { t: '算了，起來', v: false }]); });
    return ok;
  }
  async function lazyDay() {
    if (!(await sureSleep())) return;
    if (!(await Sys.confirmTime((T.today('07:45') + 1440) - S().t, '躺一整天'))) return;
    await SW.scene(async () => {
      await narr('你決定今天什麼都不做。');
      await narr('窗外的風很大。手機震了幾次，你沒有看。天花板上有一塊水漬，形狀很像台灣。');
    });
    S().f.lazyDays = (S().f.lazyDays || 0) + 1; Sys.mood(10);
    await Sys.sleepUntil('07:45');
    Sys.mem([], '你在家躺了一整天，什麼都沒做', 0, 'lazy', true);
  }
  OBJ.wardrobe = () => [{ icon: '👕', t: '換造型', sub: '髮色、穿搭', v: 'look', run: () => SW.Main.editLook() }];
  OBJ.homeDesk = () => {
    const st = S();
    return [
      { icon: '📈', t: '打開投資 App', sub: '竹科指數 ETF', v: 'inv', run: () => SW.Phone.open('invest') },
      { icon: '💻', t: '上線上課程', sub: '60 分鐘・Debug 技巧提升', v: 'study', run: async () => { if (await timed(60, '上線上課程', async () => { await narr('講師用了四十分鐘解釋 FTL 對照表。你終於懂了，或是你以為你懂了。'); })) { Sys.skill('debug', 0.6); Sys.energy(-6); } } },
      { icon: '🏠', t: '看租屋網', sub: st.p.housing === 'solo' ? '找室友合租？' : '搬去自己住？', v: 'house', run: houseMenu },
    ];
  };
  async function houseMenu() {
    const st = S();
    if (st.f.moving) { UI.toast('搬家已經安排好了，明天早上生效。'); return; }
    if (st.p.housing === 'solo') {
      const cands = ['mira', 'lele'].filter((id) => !(id === 'mira' && st.f.miraLeaving === 'go'));
      const v = await UI.sheet('邀請朋友合租', '換到兩房的合租公寓，室友會跟你一起生活。', cands.map((id) => ({ icon: '🏠', t: `問${nm(id)}要不要一起住`, sub: SW.Talk.relWord(id), v: id })));
      if (!v) return;
      const r = st.rel[v]; const ok = r.friend >= 62 && r.tension < 30 && (v !== 'lele' || st.f.leleStay !== 'hsiu' || r.friend >= 70);
      await SW.scene(async () => {
        if (ok) { await say(v, v === 'mira' ? '……合租？規則先講好：冰箱分區、垃圾輪流、晚上十一點以後不准唱歌。成交。' : '真的嗎！！！我可以把鯊魚帶過去嗎！'); }
        else await say(v, '我很喜歡你，但一起住……我還沒準備好。');
      });
      if (ok) { st.f.moving = { housing: 'shared', roommate: v }; Sys.at(T.at(T.day() + 1, '07:00'), 'moveHouse', {}); Sys.mem(v, `你邀請${nm(v)}一起合租`, 1, 'roommate', true); }
    } else {
      const rm = st.p.roommate;
      const v = await UI.sheet('搬去獨立套房？', `押金 NT$15,000。${rm ? nm(rm) + '會怎麼想？' : ''}`, [{ icon: '📦', t: '搬', v: 'go', dis: st.p.money < 15000 }, { icon: '✋', t: '算了', v: 'no' }]);
      if (v !== 'go') return;
      Sys.money(-15000);
      if (rm) { await SW.scene(async () => { await say(rm, st.rel[rm].friend > 65 ? '……你要搬走？我還以為我們住得不錯。好啦，我會想念你偷吃我的布丁。' : '喔。好。那我得找新室友了。'); }); Sys.ch(rm, { friend: -4, tension: 4 }); Sys.mem(rm, '你決定搬出去自己住', 0, 'moveOut', true); }
      st.f.moving = { housing: 'solo', roommate: null }; Sys.at(T.at(T.day() + 1, '07:00'), 'moveHouse', {});
    }
  }
  H.moveHouse = () => {
    const st = S(), mv = st.f.moving; if (!mv) return;
    st.p.housing = mv.housing; st.p.roommate = mv.roommate; st.f.moving = null;
    if (mv.roommate === 'lele') st.f.leleStay = 'player';
    SW.W.reset();
    if (st.p.map === 'home') { const [x, y] = SW.W.spot('home', 'bed'); SW.W.enter('home', x + 0.5, y + 0.5, 'down'); }
    UI.toast(mv.housing === 'shared' ? '📦 搬家完成！你現在住在合租公寓。' : '📦 搬家完成！你現在一個人住套房。');
  };
  OBJ.kitchen = () => {
    const others = SW.W.npcsHere().filter((i) => SW.CH[i].core);
    return [
      others.length ? { icon: '🍳', t: `和${nm(others[0])}一起煮晚餐`, sub: '需要食材包', v: 'cookTog', run: () => SW.Acts.joint(others[0], 'cook') } : null,
      { icon: '🍳', t: '自己煮一餐', sub: Sys.has('groceries') ? '用掉一份食材包・45 分鐘' : '沒有食材包（超商有賣）', v: 'cook', dis: !Sys.has('groceries'), run: async () => {
        Sys.item('groceries', -1);
        let res; await SW.scene(async () => { res = await SW.MG.timing({ title: '一個人的晚餐', rounds: 3, verb: '翻炒！', labels: ['熱鍋', '下料', '收汁'], zone: 0.16 + S().p.skill.cook * 0.012 }); await Sys.advance(45, false); await narr(res.score > 70 ? '你做出一盤看起來很像食譜照片的炒飯。' : '你做出一盤……能吃的東西。'); });
        Sys.skill('cook', 0.5); Sys.energy(28); Sys.mood(res.score > 70 ? 8 : 3); S().stats.cooked++;
      } },
      { icon: '🍜', t: '泡碗泡麵', sub: '+體力・5 分鐘', v: 'noodle', run: async () => { await Sys.advance(5, false); Sys.energy(14); Sys.mood(-1); UI.toast('🍜 宵夜之神保佑。'); } },
    ];
  };
  OBJ.fridge = () => {
    const st = S();
    return [
      st.f.fridgeCake ? { icon: '🎂', t: '吃冰箱裡的蛋糕', sub: st.f.fridgeCake, v: 'cake', run: async () => { await SW.scene(async () => { await narr(`蛋糕上貼著一張便利貼：「${st.f.fridgeCake}」`); }); st.f.fridgeCake = null; Sys.mood(8); Sys.energy(8); } } : null,
      { icon: '🧊', t: '打開冰箱看看', v: 'look', run: () => SW.scene(async () => { await narr(SW.Talk.fridge()); }) },
    ];
  };
  OBJ.sofa = () => {
    const others = SW.W.npcsHere().filter((i) => SW.CH[i].core);
    return [
      { icon: '📺', t: others.length ? `和${others.map(nm).join('、')}一起看劇` : '躺在沙發上追劇', sub: '60 分鐘・+心情', v: 'tv', run: async () => {
        if (!(await timed(60, '看劇', async () => { await narr(others.length ? `你們看了兩集台劇。${nm(others[0])}在第二集偷偷哭了，然後否認。` : '你看了兩集台劇。第二集的反轉你早就猜到了，但還是很爽。'); }))) return;
        Sys.mood(8); Sys.energy(8); for (const o of others) { Sys.ch(o, { comfort: 4, friend: 2 }, true); }
        if (others.length) Sys.mem(others, '窩在沙發一起看台劇', 1, 'tv', true);
      } },
    ];
  };
  OBJ.guitar = () => [{ icon: '🎸', t: '練電吉他', sub: '45 分鐘・節奏小遊戲', v: 'play', run: practice }];
  async function practice(where) {
    let res;
    if (!(await Sys.confirmTime(45, '練吉他'))) return;
    await SW.scene(async () => {
      res = await SW.MG.rhythm({ title: '練習：〈新竹的風很大〉', len: 20 });
      await Sys.advance(45, false);
      const listeners = SW.W.npcsHere().filter((i) => SW.CH[i].core);
      if (listeners.length) { await say(listeners[0], res.score > 70 ? '欸，好聽欸。再一次！' : '……加油。（默默戴上耳機）'); Sys.ch(listeners[0], { comfort: res.score > 70 ? 3 : -1 }, true); }
    });
    Sys.skill('guitar', res.score > 60 ? 0.6 : 0.4); Sys.mood(5); Sys.energy(-5);
  }
  OBJ.dining = () => {
    const others = SW.W.npcsHere().filter((i) => SW.CH[i].core);
    return [
      others.length ? { icon: '🍽️', t: `和${nm(others[0])}一起吃飯`, sub: '需要食材包，或叫外送', v: 'eat', run: () => SW.Acts.joint(others[0], 'cook') } : null,
      { icon: '🪑', t: '坐下來發呆', sub: '15 分鐘', v: 'sit', run: () => timed(15, '在餐桌前發呆', null).then((ok) => ok && Sys.mood(2)) },
    ];
  };

  // ===== CAFE =====
  OBJ.counter = () => {
    const st = S(), pei = here('pei');
    return [
      { icon: '☕', t: '點一杯拿鐵', sub: 'NT$80・+體力', v: 'order', run: async () => {
        if (!Sys.pay(80)) return; Sys.energy(14); st.cafe.fund += 80;
        if (pei) await SW.scene(async () => { await say('pei', U.pick(['老樣子？燕麥奶、少冰、多一點耐心。', '今天的豆子是衣索比亞，聞起來像草莓。', '給你～拉花是一隻貓，雖然看起來比較像馬鈴薯。'])); });
        else UI.toast('☕ 店員幫你做了一杯拿鐵。');
      } },
      Sys.knows('player', 'lease') && pei ? { icon: '🎟️', t: '預購咖啡券', sub: '用她能接受的方式支持咖啡廳', v: 'voucher', run: voucher } : null,
      { icon: '🥐', t: '買個可頌', sub: 'NT$65・+體力', v: 'croissant', run: async () => { if (!Sys.pay(65)) return; Sys.energy(10); st.cafe.fund += 65; UI.toast('🥐 酥到掉滿桌。'); } },
    ];
  };
  async function voucher() {
    const st = S();
    const v = await UI.sheet('預購咖啡券', `存款 ${U.money(st.p.money)}`, [
      { icon: '🎟️', t: '10 杯（NT$1,000）', v: 1000, dis: st.p.money < 1000 },
      { icon: '🎟️', t: '50 杯（NT$5,000）', v: 5000, dis: st.p.money < 5000 },
      { icon: '🎟️', t: '150 杯（NT$15,000）', v: 15000, dis: st.p.money < 15000 },
      { icon: '💸', t: '直接塞錢給她', sub: '不包裝成任何東西', v: 'cash', dis: st.p.money < 5000 },
    ]);
    if (!v) return;
    await SW.scene(async () => {
      if (v === 'cash') {
        await say('pei', '……收回去。我不是要大家可憐我。');
        const c = await choose([{ t: '「不是可憐，是我想要這裡繼續存在。」', v: 1 }, { t: '默默收回', v: 0 }]);
        if (c) { await say('pei', '……那你用買的。我不收白給的錢。'); }
        st.cafe.will -= 3; Sys.ch('pei', { tension: 3 }, true);
        return;
      }
      Sys.money(-v); st.cafe.fund += v; st.cafe.vouchers += v; st.cafe.will += v >= 5000 ? 6 : 3;
      await say('pei', v >= 15000 ? '一百五十杯……你是要喝到明年嗎？（她轉過身擦了擦眼睛）……謝謝。' : '好，我記下來了。你每一杯我都會好好做。');
      Sys.ch('pei', { trust: 4, friend: 3 });
      if (v >= 5000) Sys.mem('pei', `你預購了 ${v / 100} 杯咖啡券，用她能接受的方式撐住轉角`, 1, 'voucher');
    });
  }
  OBJ.stage = () => {
    const st = S(), gig = T.dow() === 4 && T.mod() >= 19 * 60 + 30;
    return [
      { icon: '🎸', t: gig ? '上台表演（週五 Live）' : '上台自彈自唱', sub: gig ? '劇情' : '開放麥克風・節奏小遊戲', v: 'play', run: gig ? () => SW.Dir.runById('d5_gig') : async () => {
        if (!(await Sys.confirmTime(30, '上台表演'))) return;
        let res; await SW.scene(async () => {
          res = await SW.MG.rhythm({ title: '轉角開放麥克風', len: 20 });
          await Sys.advance(30, false);
          const tips = Math.round(res.score * 6);
          await narr(res.score > 70 ? `店裡響起掌聲。吉他盒裡多了 ${U.money(tips)}。` : `有一個小朋友很認真地拍手。吉他盒裡有 ${U.money(tips)} 和一顆糖。`);
          Sys.money(tips);
          if (here('pei')) { await say('pei', res.score > 70 ? '欸你很可以！週五要不要上台？' : '勇氣滿分！'); Sys.ch('pei', { friend: 3, attract: res.score > 80 ? 2 : 0 }, true); }
        });
        Sys.skill('guitar', 0.4); Sys.mood(6);
      } },
    ];
  };
  OBJ.cafeTable = () => [
    { icon: '📖', t: '坐下來看書', sub: '45 分鐘・+心情', v: 'read', run: () => timed(45, '在咖啡廳看書', async () => { const ov = SW.Talk.cafeOverhear(); if (ov) for (const l of ov) await say(l[0], l[1]); else await narr('窗邊的位置很曬，你看完了半本小說。'); }).then((ok) => ok && Sys.mood(6)) },
    { icon: '💻', t: '帶筆電加班', sub: '60 分鐘・工作表現', v: 'work', run: () => timed(60, '在咖啡廳加班', async () => { await narr('隔壁桌在聊創業，你在修 code review 的意見。這就是新竹。'); }).then((ok) => { if (ok) { S().work.perf += 1; Sys.energy(-6); } }) },
  ];
  OBJ.cafeBoard = () => {
    const st = S();
    return [
      { icon: '📌', t: '看布告欄', v: 'read', run: () => SW.scene(async () => { for (const l of SW.Talk.board('cafe')) await narr(l); }) },
      st.f.petition && !st.f.signed ? { icon: '✍️', t: '在連署單上簽名', sub: '「我們想留下轉角」', v: 'sign', run: () => { st.f.signed = true; st.cafe.petition += 1; UI.toast('✍️ 你簽下名字。連署單上的名字又多了一個。'); } } : null,
    ];
  };
  OBJ.peiDesk = () => [
    { icon: '🗂️', t: '偷看桌上的文件', sub: '這是小沛的私人空間', v: 'snoop', dis: Sys.knows('player', 'lease') && SW.S.f.snooped, run: async () => {
      const st = S();
      const caught = here('pei') && (SW.W.distTo('pei') < 6 || Math.random() < 0.3);
      await SW.scene(async () => {
        await narr('桌上壓著一封房東的存證信函：「租約到期不續，若欲續租，請於本週日前補足押金及調漲租金，合計十五萬元。」');
        if (caught) { await say('pei', '……你在看什麼？'); await narr('小沛把信抽走，摺起來，塞進圍裙口袋。'); await say('pei', '那是我的事。拜託你，先不要跟任何人說。'); }
      });
      st.f.snooped = true; Sys.learn('player', 'lease', null);
      if (caught) { Sys.ch('pei', { trust: -10, tension: 10 }); Sys.mem('pei', '你偷看了她的租約文件', -1, 'snooped'); st.f.trust_lease = true; }
    } },
  ];

  // ===== CHURCH =====
  OBJ.pulpit = () => [{ icon: '✝️', t: '站上講台看看', sub: '從這裡看出去是什麼感覺？', v: 'stand', run: () => SW.scene(async () => { await narr('從講台往下看，一排排空長椅在午後的光裡很安靜。你突然理解，為什麼有人會想在這裡說話。'); if (here('anson')) await say('anson', '很嚇人對吧？我第一次上台，手一直在抖。'); }) }];
  OBJ.piano = () => [{ icon: '🎹', t: S().f.worshipAsk ? '練習主日要彈的詩歌' : '隨手彈彈', sub: '節奏小遊戲', v: 'p', run: async () => {
    let res; await SW.scene(async () => { res = await SW.MG.rhythm({ title: S().f.worshipAsk ? '詩歌練習〈在這安靜時刻〉' : '鋼琴隨手彈', len: 18, slow: true }); await Sys.advance(30, false); });
    Sys.skill('guitar', 0.3); Sys.mood(5); if (S().f.worshipAsk) S().f.worshipPractice = (S().f.worshipPractice || 0) + res.score;
  } }];
  OBJ.pew = () => [
    { icon: '🕯️', t: '安靜坐一下', sub: '20 分鐘・不需要任何理由', v: 'sit', run: () => timed(20, '安靜坐著', async () => { await narr(U.pick(['彩色玻璃在地上投出一小塊藍色。你腦袋裡的待辦清單，慢慢安靜下來。', '你不確定自己信什麼。但坐在這裡的二十分鐘，沒有人要你證明任何事。', '有個阿嬤在前排小聲禱告。你聽不清楚內容，但聽得出她很認真。'])); }).then((ok) => ok && Sys.mood(7)) },
  ];
  OBJ.churchBoard = () => [{ icon: '📌', t: '看教會公告', v: 'read', run: () => SW.scene(async () => { for (const l of SW.Talk.board('church')) await narr(l); }) }];
  OBJ.groupTable = () => [{ icon: '📖', t: T.dow() === 3 && T.in('19:00', '21:40') ? '加入小組' : '看看小組桌', sub: '週四 19:30 小組聚會', v: 'g', run: () => (T.dow() === 3 && T.in('19:00', '21:40') ? SW.Dir.runById('d4_group') : SW.scene(async () => { await narr('桌上放著幾本筆記和一盒喝了一半的麥香。小組時間是週四晚上七點半。'); })) }];
  OBJ.churchKitchen = () => [{ icon: '🍲', t: T.dow() === 4 && T.in('15:30', '20:00') ? '幫忙準備社區愛宴' : '看看廚房', v: 'k', run: () => (T.dow() === 4 && T.in('15:30', '20:00') && here('anson') ? SW.Acts.helpAnson('church') : SW.scene(async () => { await narr('廚房的白板寫著：「週五 社區愛宴 18:00｜需要人手：切菜、洗碗、陪伴」'); })) }];

  // ===== GYM =====
  async function workout(kind) {
    if (!(await Sys.confirmTime(45, '運動'))) return;
    let res;
    await SW.scene(async () => {
      res = await SW.MG.timing({ title: kind === 'run' ? '跑步機・間歇跑' : '重訓・深蹲', rounds: 4, verb: kind === 'run' ? '衝！' : '起！', labels: kind === 'run' ? ['暖身', '衝刺', '再衝', '最後一圈'] : ['第一組', '第二組', '第三組', '力竭組'], zone: 0.17 + S().p.skill.fitness * 0.012 });
      await Sys.advance(45, false);
      if (here('hsiu') && kind === 'lift') { await say('hsiu', res.score > 70 ? '……還行嘛。' : '姿勢不對啦。膝蓋不要內夾。'); Sys.ch('hsiu', { friend: 2, comfort: 2 }, true); }
      if (here('coach')) await say('coach', res.score > 70 ? '讚啦！這週會長肌肉！' : '慢慢來，安全第一！');
    });
    Sys.skill('fitness', 0.5); Sys.energy(-14); Sys.mood(8); S().stats.workouts++;
  }
  OBJ.treadmill = () => [{ icon: '🏃', t: '跑步', sub: '45 分鐘・時機小遊戲', v: 'run', run: () => workout('run') }];
  OBJ.weights = () => [{ icon: '🏋️', t: '重訓', sub: '45 分鐘・時機小遊戲', v: 'lift', run: () => workout('lift') }];
  OBJ.yoga = () => [{ icon: '🧘', t: '伸展放鬆', sub: '30 分鐘・+心情 +一點體力', v: 'y', run: () => timed(30, '伸展', async () => { if (here('mira')) { await say('mira', '……你也來做瑜珈？不要跟別人說我在這裡。'); Sys.ch('mira', { comfort: 3 }, true); } else await narr('你的筋骨發出各種聲音。你決定原諒它們。'); }).then((ok) => { if (ok) { Sys.mood(6); Sys.energy(5); } }) }];
  OBJ.gymCounter = () => [
    { icon: '🥤', t: '買高蛋白飲', sub: 'NT$90・+體力', v: 'shake', run: () => { if (!Sys.pay(90)) return; Sys.energy(15); UI.toast('🥤 巧克力口味，喝起來像融化的雪糕。'); } },
    here('coach') ? { icon: '🐻', t: '跟大熊教練聊天', v: 'coach', run: () => SW.Acts.minor('coach') } : null,
  ];

  // ===== BAR =====
  OBJ.barCounter = () => [
    { icon: '🍸', t: '點一杯好日子特調', sub: 'NT$250・+心情', v: 'drink', run: async () => { if (!Sys.pay(250)) return; Sys.mood(10); Sys.drink(); if (here('tsai')) await SW.scene(async () => { await say('tsai', U.pick(['特調一杯。今天看起來需要雙倍的「好日子」。', '慢慢喝。這杯的名字叫「明天再說」。', '你的臉寫著「上班好累」，我幫你多加了一點檸檬。'])); }); else UI.toast('🍸 微酸、微甜、很好日子。'); } },
    here('tsai') ? { icon: '🧔', t: '跟老蔡聊天', sub: '他看過太多人的故事', v: 'tsai', run: () => SW.Acts.minor('tsai') } : null,
  ];
  OBJ.jukebox = () => [{ icon: '🎵', t: '點一首歌', sub: 'NT$20', v: 'song', run: async () => {
    const v = await UI.sheet('點什麼歌？', '', [{ icon: '🎤', t: '台語老歌', v: 'old' }, { icon: '🎸', t: '樂團搖滾', v: 'rock' }, { icon: '🕯️', t: '慢歌情歌', v: 'slow' }]);
    if (!v || !Sys.pay(20)) return; Sys.mood(4);
    const ps = SW.W.npcsHere().filter((i) => SW.CH[i].core);
    await SW.scene(async () => {
      if (!ps.length) { await narr({ old: '老蔡跟著哼了起來。整間店突然像辦桌。', rock: '鼓聲一下，隔壁桌的上班族默默點頭。', slow: '燈好像暗了一點。' }[v]); return; }
      const o = ps[0];
      if (v === 'rock' && (o === 'pei' || o === 'hsiu')) { await say(o, '這首！我高中第一次練團就是這首！'); Sys.ch(o, { friend: 3, comfort: 2 }, true); }
      else if (v === 'slow' && SW.S.p.partner === o) { await say(o, '……你是故意的吧。（靠過來）'); Sys.ch(o, { attract: 3 }, true); }
      else if (v === 'old') { await say(o, '哈哈哈這是我阿公的愛歌！'); Sys.ch(o, { comfort: 2 }, true); }
      else await say(o, '這首不錯欸。');
    });
  } }];
  OBJ.booth = () => [{ icon: '🕯️', t: '坐在卡座休息', sub: '30 分鐘', v: 'sit', run: () => timed(30, '坐在卡座', async () => { await narr('卡座的燈很暗，適合發呆，也適合說真心話。'); }).then((ok) => ok && Sys.mood(4)) }];
  OBJ.longTable = () => [{ icon: '🍽️', t: '坐在長桌', sub: '30 分鐘', v: 'sit', run: () => timed(30, '坐一下', async () => { await narr('長桌上還留著上一群客人的蛋糕屑。'); }).then((ok) => ok && Sys.mood(2)) }];

  // ===== STUDIO =====
  OBJ.studioGuitar = () => [{ icon: '🎸', t: '借吉他練習', sub: '45 分鐘・節奏小遊戲', v: 'p', run: practice }];
  OBJ.drums = () => [{ icon: '🥁', t: '打鼓發洩一下', sub: '20 分鐘・+心情', v: 'd', run: () => timed(20, '打鼓', async () => { await narr('你用盡全力敲了二十分鐘。今天所有的會議都被你打碎了。'); }).then((ok) => { if (ok) { Sys.mood(10); Sys.energy(-6); } }) }];
  OBJ.mic = () => [{ icon: '🎤', t: '對著麥克風唱一首', sub: '15 分鐘', v: 'm', run: () => timed(15, '唱歌', async () => { await narr(SW.S.p.skill.guitar > 4 ? '你的聲音在隔音牆裡繞了一圈，回來的時候比你想像中好聽。' : '你唱完，隔音牆好像也鬆了一口氣。'); }).then((ok) => ok && Sys.mood(6)) }];
  OBJ.recBooth = () => [{ icon: '🎧', t: '錄一段 demo 上傳', sub: S().p.skill.guitar >= 4 ? '60 分鐘' : '吉他技巧還不夠（需要多練習）', v: 'rec', dis: S().p.skill.guitar < 4 || SW.dailyHas('rec'), run: async () => {
    if (!(await timed(60, '錄 demo', async () => { await narr('你錄了一段三分鐘的器樂 demo，取名〈新竹的風很大〉，上傳到網路。'); }))) return;
    SW.dailyOnce('rec'); S().f.demo = (S().f.demo || 0) + 1; Sys.later(240, 'demoViews', {});
  } }];
  H.demoViews = () => { const n = U.ri(80, 900) * (SW.S.f.demo || 1); Sys.msg('pei', 'pei', `欸！你上傳的那首〈新竹的風很大〉有 ${n} 次播放欸！我分享到樂團粉專了～`); Sys.ch('pei', { friend: 3, attract: 2 }, true); };
  OBJ.studioBoard = () => [{ icon: '📅', t: '看本週預約表', v: 'r', run: () => SW.scene(async () => {
    await narr('預約表上手寫著這週的練團時段：');
    await narr('週二 20:00-22:00｜轉角樂團（主唱：沛）\n週四 20:00-22:00｜轉角樂團\n週四 21:00-22:40｜個人練習（修）—— 備註：請勿打擾！！！');
    if (!SW.S.f.studioClue) { SW.S.f.studioClue = true; UI.toast('🔍 「修」？阿修為什麼要偷偷來練習？'); }
  }) }];
  OBJ.sofaStudio = () => [{ icon: '🛋️', t: '癱在沙發上', sub: '20 分鐘', v: 's', run: () => timed(20, '休息', null).then((ok) => { if (ok) { Sys.energy(6); Sys.mood(3); } }) }];

  // ===== CITY =====
  OBJ.shop = () => [{ icon: '🛒', t: '進去逛逛', sub: '飲料、禮物、食材', v: 'shop', run: () => Sys.shop() }];
  OBJ.ubike = () => [{ icon: '🚲', t: '騎 YouBike', sub: 'NT$10・快速移動', v: 'go', run: () => SW.Acts.travel(false) }];
  OBJ.bench = () => [{ icon: '🌊', t: '坐著看河', sub: '20 分鐘・+心情', v: 'sit', run: () => timed(20, '看河', async () => {
    const m = T.mod();
    await narr(m > 19 * 60 || m < 5 * 60 ? '對岸的竹科燈火通明。你想起那些還在加班的人，也想起今天的自己。' : m > 16 * 60 + 30 ? '夕陽把頭前溪染成橘紅色。新竹的風把你的頭髮吹得亂七八糟。' : '河邊有人在放風箏，風箏比你今天的心情飛得高。');
    if (SW.S.p.follower) { await say(SW.S.p.follower, '……這裡真好。'); Sys.ch(SW.S.p.follower, { comfort: 3 }, true); }
  }).then((ok) => ok && Sys.mood(6)) }];
  OBJ.busStop = () => [{ icon: '🚌', t: '小旅行：南寮漁港', sub: T.weekend() && T.in('08:00', '15:30') ? '約 5 小時・週末限定' : '只有週末 08:00-15:30 有車', v: 'trip', dis: !(T.weekend() && T.in('08:00', '15:30')), run: () => SW.Dir.runById('trip') }];
})(window.SW);

// ===== CITY LIFE: night market, shrine, court, street cats =====
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys;
  const S = () => SW.S;
  const nm = (id) => SW.name(id);
  const say = (w, t, e) => UI.say(w, t, e);
  const narr = (t) => UI.say('narr', t);
  const choose = (o, p) => UI.choose(o, p);
  const OBJ = SW.OBJ, SUB = SW.OBJ_SUB;
  const fol = () => S().p.follower;
  const marketOpen = () => T.mod() >= 17 * 60 || T.mod() < 30;
  const buy = (price) => Sys.pay(price);
  async function folLine(lines) { const f = fol(); if (f && lines[f]) { await say(f, lines[f]); Sys.ch(f, { comfort: 2 }, true); } }

  OBJ.breakfast = () => {
    const open = T.in('06:00', '12:30');
    if (!open) return [{ icon: '🔒', t: '鐵捲門拉下來了', sub: '早餐店只開到中午', v: 'x', dis: true }];
    return [
      { icon: '🥪', t: '蛋餅＋大冰奶', sub: 'NT$75・+體力', v: 'a', run: async () => { if (!buy(75)) return; Sys.energy(20); Sys.mood(3); await SW.scene(async () => { await say('narr', '老闆娘：「帥哥美女，老樣子喔！蛋餅要不要加起司？」'); const c = await choose([{ t: '「加！」', v: 1 }, { t: '「今天想吃清淡一點。」', v: 0 }]); await narr(c ? '起司蛋餅的香氣讓你原諒了星期一。' : '老闆娘：「年輕人要吃多一點啦！」她還是偷偷多放了一片火腿。'); await folLine({ lele: '我要跟你一樣的！再加一份薯餅！', anson: '我平常只喝黑咖啡……今天就吃一份吧。', mira: '大冰奶是 QA 的燃料。' }); }); } },
      { icon: '🍝', t: '鐵板麵加蛋', sub: 'NT$85・+體力', v: 'b', run: async () => { if (!buy(85)) return; Sys.energy(26); UI.toast('🍝 黑胡椒醬淋在鐵板上，滋滋作響。'); } },
      { icon: '👂', t: '跟老闆娘聊兩句', sub: '早餐店什麼都知道', v: 'c', run: () => SW.scene(async () => { const st = S(); const lines = []; if (st.n.anson.energy < 45) lines.push('老闆娘：「那個戴眼鏡的老師，最近每天早上只買一杯黑咖啡就跑了，都沒吃早餐。你們是朋友吧？叫他吃飯啦。」'); if (st.cafe.outcome === null && T.day() <= 7) lines.push('老闆娘：「轉角那間咖啡廳的妹妹，最近來買早餐都在嘆氣。是不是房租的問題？這條街很多人都被漲了。」'); lines.push('老闆娘：「你們工程師喔，眼睛都好累的樣子。來，送你一杯豆漿。」'); await narr(U.pick(lines)); if (/戴眼鏡/.test(lines[0]) && !Sys.knows('player', 'ansonTired')) Sys.learn('player', 'ansonTired', null); }) },
    ];
  };
  OBJ.bobashop = () => {
    if (!T.in('10:00', '22:30')) return [{ icon: '🔒', t: '飲料店還沒開', sub: '10:00–22:30', v: 'x', dis: true }];
    return [{ icon: '🧋', t: '買一杯珍珠奶茶', sub: 'NT$65・放進包包，可以送人', v: 'a', run: async () => {
      if (!buy(65)) return;
      await SW.scene(async () => {
        await narr('店員：「甜度冰塊？」');
        const c = await choose([{ t: '「全糖去冰。」', v: 1 }, { t: '「微糖微冰。」', v: 2 }, { t: '「無糖少冰，珍珠多一點。」', v: 3 }]);
        await narr(c === 1 ? '店員默默點頭。你感受到了尊重。' : c === 2 ? '標準的新竹上班族。' : '店員：「……珍珠多一點的無糖。好喔。」');
        await folLine({ lele: '幫我也買一杯！全糖！', mira: '你是那種會喝全糖的人嗎……我不評論。', hsiu: '珍奶不是飲料，是一餐。' });
      });
      Sys.item('boba', 1);
    } }];
  };
  OBJ.fountain = () => [{ icon: '🪙', t: '丟一枚硬幣許願', sub: 'NT$10', v: 'w', dis: SW.dailyHas('wish'), run: async () => {
    if (!Sys.pay(10)) return; SW.dailyOnce('wish');
    await SW.scene(async () => {
      const c = await choose([{ t: '希望這週可以準時下班', v: 'work' }, { t: '希望轉角可以留下來', v: 'cafe' }, { t: '希望遇到喜歡的人', v: 'love' }, { t: '希望大家都好好的', v: 'all' }]);
      await narr('硬幣在水面上轉了一圈，沉下去了。');
      await narr({ work: '旁邊一個實習生也在丟硬幣。你們對看一眼，同時嘆氣。', cafe: '噴水池的水聲好像大了一點。不知道是不是錯覺。', love: '一對情侶從你身後經過。你決定把這當成好兆頭。', all: '你許了一個很普通的願望。普通到有點想哭。' }[c]);
      if (c === 'cafe') S().cafe.will += 1;
      await folLine({ pei: '你許了什麼願？……不要說，說了就不靈了。', lele: '我也要許！我希望我的前任發胖！', anson: '我小時候也很愛丟硬幣。', mira: '……許願池的收入去哪了，我一直很好奇。' });
    });
    Sys.mood(4);
  } }];
  OBJ.hoop = () => [{ icon: '🏀', t: '投籃', sub: '時機小遊戲・+體能', v: 'h', run: async () => {
    if (!(await Sys.confirmTime(20, '投籃'))) return;
    let r;
    await SW.scene(async () => {
      r = await SW.MG.timing({ title: '光復公園籃球場', rounds: 5, verb: '出手！', labels: ['罰球線', '左側四十五度', '底線', '三分線', '最後一球'], zone: 0.15 + S().p.skill.fitness * 0.012 });
      const made = Math.round(r.score / 20);
      await narr(made >= 4 ? `${made} 投 ${made} 中……不對，是五投${made}中。旁邊的國中生吹了一聲口哨。` : made >= 2 ? `五投${made}中。籃框對你很冷淡。` : '五投零中。一顆球彈回來打到你的頭。');
      if (SW.W.present('hsiu') && SW.W.distTo('hsiu') < 15) { await say('hsiu', r.score > 70 ? '……可以喔。來鬥牛？' : '手腕要壓！來，我教你。'); Sys.ch('hsiu', { friend: 3, comfort: 2 }); }
      await folLine({ pei: '帥喔！再一球！', lele: '我幫你拍慢動作！', anson: '我高中是籃球隊的……替補的替補。', mira: '你的姿勢……很有個人風格。' });
      await Sys.advance(20, false);
    });
    Sys.skill('fitness', 0.3); Sys.energy(-6); Sys.mood(5);
  } }];
  const FORTUNE = {
    work: ['聖筊。這週的 Bug 會在你放棄前一刻現形。', '笑筊。土地公好像覺得你的問題很好笑。也許答案你早就知道了。', '陰筊。不是現在。先去吃飯。'],
    love: ['聖筊。你在意的那個人，也在注意你。', '笑筊。土地公笑了。也許你該先問問自己想要什麼。', '陰筊。時機未到，但不代表沒有。'],
    cafe: ['聖筊。這條街會記得它的轉角。', '笑筊。有些事不是錢能解決的——但錢也很有用。', '陰筊。辦法不只一個，換個方向試試。'],
    friends: ['聖筊。你身邊有人需要你，你也需要他們。', '笑筊。朋友之間的誤會，通常一頓宵夜就能解決。', '陰筊。有一句「對不起」或「謝謝」，你還沒說出口。'],
  };
  OBJ.temple = () => [{ icon: '🙏', t: '拜拜、擲筊', sub: '問土地公一件事', v: 't', dis: SW.dailyHas('temple'), run: async () => {
    SW.dailyOnce('temple');
    await SW.scene(async () => {
      await narr('你點了三炷香。煙往上飄，被新竹的風吹歪了。');
      const q = await choose([{ t: '問工作', v: 'work' }, { t: '問感情', v: 'love' }, { t: '問轉角咖啡廳', v: 'cafe' }, { t: '問朋友', v: 'friends' }]);
      await narr('你雙手捧著兩片紅色的筊，往地上一擲——');
      const r = Math.random(), i = r < 0.5 ? 0 : r < 0.75 ? 1 : 2;
      await narr(FORTUNE[q][i]);
      if (q === 'cafe' && i === 0) S().cafe.will += 2;
      await folLine({ anson: '我不拜拜，但我很喜歡這裡的安靜。每個人都有自己跟天說話的方式。', lele: '我上次問感情是陰筊。……然後我就分手了。土地公好準。', mira: '我阿嬤每次來都會幫我問工作。……她問了三年。', hsiu: '這不科學。……但我還是想知道我的結果。', pei: '我外婆以前每個月都會來這裡。' });
    });
    Sys.mood(6);
  } }];
  OBJ.vending = () => [
    { icon: '🥤', t: '麥香奶茶', sub: 'NT$20・+體力', v: 'a', run: () => { if (!buy(20)) return; Sys.energy(7); UI.toast('🥤 機器「喀啷」一聲。麥香奶茶，台灣人的靈魂。'); } },
    { icon: '⚡', t: '能量飲料', sub: 'NT$45・放進包包', v: 'b', run: () => { if (!buy(45)) return; Sys.item('energy', 1); UI.toast('⚡ 一罐能量飲料滾了出來。'); } },
  ];
  const STALL = {
    chicken: { price: 80, energy: 25, mood: 5, text: '雞排比你的臉還大。老闆問：「要切要辣？」', fol: { lele: '不切不辣！用啃的才是靈魂！', hsiu: '這個熱量……算了，今天練過腿。', mira: '切。我不想被別人看到我在啃雞排。' } },
    tofu: { price: 70, energy: 15, mood: 4, text: '臭豆腐的味道從三十公尺外就開始宣示主權。泡菜很脆。', fol: { mira: '……這個味道是不是跟公司茶水間的鯖魚有親戚關係。', pei: '這家的泡菜是我的最愛！', anson: '我小時候很怕這個味道，長大才知道它是好人。' } },
    corn: { price: 60, energy: 14, mood: 3, text: '烤玉米刷了三層醬，黑胡椒的香氣很霸道。', fol: { hsiu: '玉米要從哪邊開始啃，是人格測驗。', lele: '我的牙縫！我的牙縫！' } },
    gua: { price: 60, energy: 16, mood: 3, text: '刈包裡的滷肉肥瘦剛好，花生粉灑得到處都是。', fol: { anson: '花生粉掉在我的外套上了。……沒關係，很香。' } },
    cake: { price: 50, energy: 8, mood: 7, text: '雞蛋糕是小熊形狀的。你從頭開始吃，有點罪惡感。', fol: { pei: '我要吃有奶油餡的那隻！', lele: '小熊好可愛我捨不得吃（吃掉）', mira: '……我先吃耳朵。' } },
  };
  OBJ.stall = (o) => {
    if (!marketOpen()) return [{ icon: '🔒', t: '攤位還沒開', sub: '東門夜市 17:00 才營業', v: 'x', dis: true }];
    const k = o.stall;
    if (k === 'boba') return [{ icon: '🧋', t: '珍珠奶茶', sub: 'NT$55・放進包包', v: 'b', run: () => { if (!buy(55)) return; Sys.item('boba', 1); UI.toast('🧋 夜市珍奶，珍珠比奶茶還多。'); } }];
    if (k === 'balloon') return [{ icon: '🎯', t: '射氣球（10 發）', sub: 'NT$100・中越多獎品越大', v: 'g', run: async () => {
      if (!buy(100)) return;
      let r;
      await SW.scene(async () => {
        r = await SW.MG.timing({ title: '射氣球', rounds: 5, verb: '砰！', labels: ['紅色', '藍色', '黃色', '那顆在晃的', '最後一發'], zone: 0.14 });
        if (r.score >= 80) { await narr('老闆敲了一下鐵板：「大獎！」你抱走一隻比你小腿還大的熊熊娃娃。'); Sys.item('plush', 1); }
        else if (r.score >= 50) { await narr('老闆：「小獎喔～」你拿到一包貓咪貼紙。'); Sys.item('sticker', 1); }
        else await narr('老闆：「參加獎！」一支塑膠風車。它轉得很努力。');
        const f = fol(); if (f) { await say(f, r.score >= 80 ? (SW.CH[f].date || S().p.partner === f ? '……要送我嗎？' : '你太強了吧！') : '哈哈哈，再來一次！'); Sys.ch(f, { comfort: 3, attract: (SW.CH[f].date || S().p.partner === f) && r.score >= 80 ? 3 : 0 }, true); }
      });
      Sys.mood(5);
    } }];
    if (k === 'fish') return [{ icon: '🐟', t: '撈金魚', sub: 'NT$80', v: 'f', run: async () => {
      if (!buy(80)) return;
      let r;
      await SW.scene(async () => {
        r = await SW.MG.timing({ title: '撈金魚（紙網很脆弱）', rounds: 3, verb: '撈！', labels: ['第一隻', '第二隻', '紙網快破了'], zone: 0.12 });
        const n = Math.round(r.score / 34);
        await narr(n >= 2 ? `你撈到 ${n} 隻金魚。老闆用塑膠袋裝好，綁了一個漂亮的結。` : n === 1 ? '撈到一隻！牠在袋子裡看起來很困惑。' : '紙網破了。金魚們好像在笑你。老闆送你一隻安慰獎。');
        await narr('你把金魚送給旁邊一個哭著說沒撈到的小朋友。他停止哭泣，盯著你看了三秒，然後說謝謝。');
        const f = fol(); if (f) { await say(f, '……你這個人，真的很容易對陌生人好欸。'); Sys.ch(f, { trust: 3, attract: SW.CH[f].date || S().p.partner === f ? 2 : 0 }, true); }
      });
      Sys.mood(6);
    } }];
    const s = STALL[k];
    return [{ icon: o.icon, t: `買${o.label}`, sub: `NT$${s.price}・+體力`, v: 'e', run: async () => {
      if (!buy(s.price)) return;
      await SW.scene(async () => { await narr(s.text); await folLine(s.fol); });
      Sys.energy(s.energy); Sys.mood(s.mood);
    } }];
  };
  SUB.stall = (o) => (marketOpen() ? '東門夜市・營業中' : '晚上五點開市');

  // ----- street cats -----
  SW.CATS = { cat_latte: '橘貓「拿鐵」', cat_calico: '三花貓', cat_black: '黑貓', cat_tabby: '虎斑貓', cat_white: '白貓', cat_tux: '賓士貓', cat_grey: '灰貓', cat_chonk: '胖橘' };
  OBJ.cat = (o) => {
    const st = S(), found = st.f.cats && st.f.cats[o.cat];
    return [{ icon: '🐈', t: found ? `摸摸${o.label}` : `蹲下來，慢慢靠近${o.label}`, sub: found ? '牠認得你了' : '新竹街貓圖鑑', v: 'c', run: async () => {
      st.f.cats = st.f.cats || {};
      await SW.scene(async () => {
        if (found) { await narr(U.pick(['牠瞇著眼睛看你，尾巴晃了一下。', '牠翻肚了。這是信任，也可能是陷阱。', '牠蹭了蹭你的鞋子，然後假裝什麼都沒發生。'])); return; }
        await narr(U.pick(['你蹲下來，伸出一根手指。牠聞了聞，用頭頂了一下。', '牠先是警戒地看著你，然後慢慢瞇起眼睛。', '牠「喵」了一聲，好像在說：你終於來了。']));
        st.f.cats[o.cat] = T.day();
        const n = Object.keys(st.f.cats).length;
        UI.toast(`🐈 新竹街貓圖鑑：${n}／8`);
        if (o.cat === 'cat_latte') {
          await narr('牠的項圈上寫著兩個字：「拿鐵」。轉角咖啡廳布告欄上那張尋貓啟事！');
          await narr('你拍了照片傳給小沛。');
          Sys.msg('pei', 'me', '（照片：河堤上的胖橘貓）這是拿鐵嗎！？');
          Sys.msgLater(2, 'pei', 'pei', '拿鐵！！！！！牠是我們店的店貓！失蹤兩個禮拜了！我馬上過去！！謝謝你謝謝你謝謝你😭😭');
          Sys.ch('pei', { friend: 6, trust: 4 }); Sys.mem('pei', '你在河堤找到了失蹤的店貓拿鐵', 1, 'latteCat'); st.f.latteFound = true; st.cafe.will += 4;
        }
        if (n === 8) { await narr('你集滿了八隻新竹街貓。手機相簿現在有兩百張貓的照片。'); Sys.msg('mira', 'me', '（八張貓咪照片）我集滿了這附近所有的街貓。'); Sys.msgLater(3, 'mira', 'mira', '……你是我見過最無聊也最了不起的人。把照片全部傳給我。全部。'); Sys.ch('mira', { friend: 6, comfort: 5 }); Sys.mem('mira', '你集滿了新竹街貓圖鑑，把兩百張照片傳給米拉', 1, 'catDex'); }
        const f = fol(); if (f) { await say(f, { mira: '……可以讓我摸一下嗎。一下就好。', lele: '好可愛好可愛好可愛！', pei: '牠的毛好亮，一定有人在餵。', anson: '牠好像在笑。', hsiu: '我對貓過敏。（他還是伸手摸了）', kai: '別動，我拍一張。', yuna: '公的、三歲左右、有結紮。……職業病，抱歉。' }[f] || '好可愛。'); Sys.ch(f, { comfort: 3 }, true); }
      });
      Sys.mood(found ? 1 : 5);
    } }];
  };
})(window.SW);
