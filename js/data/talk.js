'use strict';
(function (SW) {
  const U = SW.U, T = SW.T, UI = SW.UI, Sys = SW.Sys;
  const S = () => SW.S;
  const nm = (id) => SW.name(id);
  const say = (w, t, e) => UI.say(w, t, e);
  const narr = (t) => UI.say('narr', t);
  const me = (t) => UI.say('me', t);
  const choose = (o, p) => UI.choose(o, p);
  const K = (f) => Sys.knows('player', f);
  const here = (id) => SW.W.present(id);
  const R = (id) => S().rel[id];
  const Talk = SW.Talk = {};

  // ---------- small talk pools: c = condition, l = lines ----------
  const P = {
    mira: [
      { l: [['mira', '這個 regression 已經跑第四次了。我覺得它在針對我。']] },
      { l: [['mira', '你知道 QA 最痛苦的是什麼嗎？你永遠在證明別人錯了，但沒有人想聽。']] },
      { c: () => T.mod() < 10 * 60, w: 3, l: [['mira', '早。不要跟我說話，我還沒喝咖啡。'], ['mira', '……好啦，早。']] },
      { c: () => S().p.map === 'home', w: 3, l: [['mira', '冰箱上層是我的，下層是你的，中間是戰區。'], ['mira', '昨天戰區的布丁是你吃的嗎？不要說謊，我有拍照。']] },
      { c: () => S().p.map === 'home' && T.mod() > 19 * 60, w: 3, l: [['mira', '要不要一起叫外送？我想吃鹹酥雞，但不想一個人罪惡。']] },
      { c: () => S().p.map === 'cafe', l: [['mira', '我有時候在想，如果我不是做 QA，我會在做什麼。'], ['mira', '……大概在別家公司做 QA。']] },
      { c: () => R('mira').tension > 40, w: 6, l: [['mira', '嗯。'], ['narr', '米拉沒有抬頭。']] },
      { c: () => Sys.hasMem('mira', 'kept_test'), w: 4, l: [['mira', '上次你幫我跑的那輪，主管說報告很完整。'], ['mira', '我有跟他說是你幫的。……不用謝。']] },
      { c: () => !!S().f.fish, w: 4, l: [['mira', '我到現在還聞得到鯖魚。是誰。你知道是誰嗎？'], ['mira', '……你的表情很可疑。']] },
      { c: () => S().f.leleStay === 'player' && S().p.roommate === 'mira', w: 5, l: [['mira', '樂樂把她的鯊魚放在我的椅子上。'], ['mira', '我現在跟一隻鯊魚共用椅子。這就是我的人生。']] },
      { c: () => here('hsiu'), w: 3, l: [['mira', '（小聲）阿修今天又在跟我吵 log 格式。'], ['mira', '……他其實講得有道理。但我不會說。']] },
      { c: () => T.weekend(), w: 2, l: [['mira', '週末就是要什麼都不做。'], ['mira', '然後週日晚上開始焦慮。']] },
      { c: () => S().f.hsiuMira === 'couple', w: 6, l: [['mira', '阿修……他其實很笨拙。'], ['mira', '但很認真。（她低頭笑了一下）']] },
      { c: () => Sys.knows('mira', 'lease'), w: 3, l: [['mira', '我不知道能幫小沛什麼。'], ['mira', '我最擅長的是找問題，不是解決問題。']] },
      { c: () => T.day() >= 3 && R('mira').trust >= 50 && !K('holiday'), w: 3, l: [['mira', '你有沒有想過，如果明天不用來上班，你會去哪裡？'], ['mira', '……沒事。隨便問問。']] },
      { c: () => S().f.miraDecision === 'go', w: 8, l: [['mira', '我在查墨爾本的租屋網站。那邊的房子都有後院。'], ['mira', '……我有點怕。但是是好的那種怕。']] },
    ],
    hsiu: [
      { l: [['hsiu', '你看過我昨天那個 PR 嗎？三行解決一個月的 issue。'], ['hsiu', '三行。']] },
      { l: [['hsiu', 'QA 開的 bug 有一半是 user error，另一半是我還沒看。']] },
      { c: () => S().p.map === 'office', l: [['narr', '阿修正在對一台測試機說話。'], ['hsiu', '……你為什麼要這樣對我。']] },
      { c: () => T.in('12:00', '13:00'), w: 3, l: [['hsiu', '公司微波爐前面永遠在排隊。'], ['hsiu', '人生就是一場排隊。']] },
      { c: () => S().p.map === 'gym', w: 4, l: [['hsiu', '今天練腿。不要跟我說話，我在跟重力吵架。']] },
      { c: () => Sys.hasMem('hsiu', 'helped_review'), w: 3, l: [['hsiu', '……你上次 review 說我那段寫得漂亮。'], ['hsiu', '是真心的吧？'], ['narr', '他假裝在看螢幕。']] },
      { c: () => Sys.hasMem('hsiu', 'roastPublic'), w: 5, l: [['narr', '阿修看了你一眼，沒有說話。'], ['hsiu', '我在忙。']] },
      { c: () => here('mira'), w: 3, l: [['hsiu', '米拉，你的 log 格式又跑掉了。'], ['mira', '那是你的 parser 有問題。'], ['hsiu', '……我幫你改好了啦。']] },
      { c: () => T.day() <= 4 && !K('hsiuSong'), w: 4, l: [['hsiu', '欸，我問你。'], ['hsiu', '一個人如果被拒絕，大家會笑他多久？'], ['hsiu', '……我在問朋友的事。']] },
      { c: () => K('hsiuSong') && !S().f.hsiuSang, w: 5, l: [['hsiu', '那件事……你沒跟別人說吧？'], ['hsiu', '我還在練。高音那段一直破。']] },
      { c: () => !!S().f.invested, w: 3, l: [['hsiu', '我上週追高竹科 ETF。'], ['hsiu', '我現在是長期投資者了。被迫的。']] },
      { c: () => T.day() >= 2 && T.day() <= 7, w: 2, l: [['hsiu', 'Feature Owner 那個位子……你想要嗎？'], ['hsiu', '我是說，我無所謂啦。'], ['narr', '他很有所謂。']] },
      { c: () => S().f.hsiuMira === 'couple', w: 7, l: [['hsiu', '我昨天幫米拉修她的 parser。'], ['hsiu', '她說謝謝。她從來沒跟我說過謝謝。（他看起來快要飄起來）']] },
      { c: () => S().f.hsiuMira === 'rejected', w: 7, l: [['hsiu', '我沒事。真的。'], ['hsiu', '……至少我唱完了。']] },
    ],
    pei: [
      { c: () => /顧店/.test(S().n.pei.act), w: 2, l: [['pei', '今天的豆子是衣索比亞日曬，有莓果味。你喝喝看～']] },
      { l: [['pei', '有個客人每天點一杯水坐四個小時。'], ['pei', '我很想收他房租。……開玩笑的。']] },
      { c: () => T.day() <= 4 && !K('lease'), w: 3, l: [['pei', '最近？很好啊！超好！'], ['pei', '你看我笑得多燦爛。'], ['narr', '她笑得太用力了。']] },
      { c: () => K('lease') && S().cafe.outcome === null, w: 4, l: [['pei', '謝謝你沒有把那件事說得很嚴重。'], ['pei', '我只是……還在想要怎麼面對。']] },
      { l: [['pei', '週二週四我們樂團練團，你要不要來聽？'], ['pei', '雖然吉他手常常遲到。']] },
      { c: () => T.day() >= 2 && S().cafe.outcome === null, w: 2, l: [['pei', '如果有一天轉角不在了，你們還會每週見面嗎？'], ['pei', '……我隨便問問。']] },
      { c: () => T.day() === 1 && T.mod() < 19 * 60, w: 9, l: [['pei', '今天是我生日欸，但大家好像都忘了。'], ['pei', '米拉說晚上要找我吃飯，大概是可憐我吧。哈哈。']] },
      { c: () => S().p.skill.guitar >= 4, w: 3, l: [['pei', '你最近吉他是不是有偷練？'], ['pei', '手指的繭變厚了喔。']] },
      { c: () => here('anson'), w: 3, l: [['pei', '安森每天都來改作業，我都不收他錢，他還硬要付。'], ['anson', '因為你的咖啡值得。'], ['pei', '你看，他就是這樣。']] },
      { c: () => S().cafe.outcome === 'renew', w: 9, l: [['pei', '我們還有地方可以坐。'], ['pei', '每次想到這句話，我就想哭。好的那種。']] },
      { c: () => S().cafe.outcome === 'relocate', w: 9, l: [['pei', '新的地方很小，但是窗戶很大。'], ['pei', '我覺得轉角換個角度轉，也還是轉角。']] },
      { c: () => S().cafe.outcome === 'close', w: 9, l: [['pei', '我還是會煮咖啡。只是換個地方。'], ['pei', '你要記得來找我喔。不管我在哪裡。']] },
    ],
    anson: [
      { l: [['anson', '今天三個班都在月考。我改到眼睛在冒煙。']] },
      { l: [['anson', '你吃飯了嗎？'], ['anson', '……不要騙我，你一定又沒吃。']] },
      { c: () => T.dow() <= 3, w: 2, l: [['anson', '週四小組你要來嗎？不勉強，真的。'], ['anson', '來喝茶也很好。']] },
      { c: () => T.day() >= 3, w: 2, l: [['anson', '我最近在想「安息」這件事。'], ['anson', '神叫人休息，我卻覺得休息是一種罪惡感。很矛盾吧。']] },
      { c: () => S().n.anson.energy < 35, w: 6, l: [['anson', '我沒事啦，只是有點累。'], ['anson', '……真的沒事。'], ['narr', '他說「真的」的時候，眼神飄開了。']] },
      { c: () => S().p.map === 'church', w: 3, l: [['anson', '這裡安靜的時候很好。人多的時候也很好。'], ['anson', '我最喜歡的，是剛好有一個人在的時候。']] },
      { c: () => Sys.knows('anson', 'lease'), w: 3, l: [['anson', '我一直在想要怎麼幫小沛。'], ['anson', '可是她好像……不想被幫。']] },
      { c: () => here('pei'), w: 3, l: [['anson', '小沛的拿鐵是全新竹最好喝的。這是客觀事實。'], ['narr', '他說完，偷偷看了小沛一眼。']] },
      { c: () => !!S().f.ansonCollapsed, w: 8, l: [['anson', '那天謝謝你們。'], ['anson', '我好像第一次知道，被照顧是什麼感覺。']] },
      { l: [['anson', '我不覺得信仰是一本答案本。'], ['anson', '比較像一盞燈，照得到下一步，照不到全部。']] },
      { c: () => !S().stats.church, w: 2, l: [['anson', '不來教會也沒關係啊。'], ['anson', '你來咖啡廳，我也一樣很開心。']] },
    ],
    lele: [
      { l: [['lele', '你知道我們公司新的企劃嗎？我們要幫一款牙膏辦演唱會。'], ['lele', '我不知道為什麼。']] },
      { c: () => !S().f.leleKnowsHsiu && T.day() <= 4 && Sys.knows('lele', 'rumorLele'), w: 4, l: [['lele', '我覺得阿修最近怪怪的。他一直往我們這邊看。'], ['lele', '……你說，他是不是喜歡我？']] },
      { c: () => !!S().f.leleHeartbroken, w: 6, l: [['lele', '我很好！我超好！我把他所有照片都刪了！'], ['lele', '……除了雲端的。']] },
      { c: () => S().f.leleStay === 'player', w: 5, l: [['lele', '你家的沐浴乳好香喔！我用了一半。'], ['lele', '我會買新的！明天！']] },
      { l: [['lele', '人生就是要轟轟烈烈！'], ['lele', '……但我今天只想躺著。']] },
      { c: () => Sys.knows('lele', 'lease') && S().cafe.outcome === null, w: 4, l: [['lele', '我在想，如果幫小沛辦募資，標題要很會。'], ['lele', '我是專業的。行銷之神附身中。']] },
      { l: [['lele', '你有聽說嗎？……算了，我答應過不說的。'], ['narr', '三秒後。'], ['lele', '好啦我跟你說——欸不行！我要當一個守口如瓶的人！']] },
      { c: () => !!S().f.leleIndependent, w: 6, l: [['lele', '我在想，我是不是太怕一個人了。'], ['lele', '所以我要練習。從一個人吃火鍋開始。']] },
      { c: () => T.weekend(), w: 2, l: [['lele', '週末要不要去逛街！'], ['lele', '我需要新衣服來展開新的人生！']] },
    ],
    kai: [
      { l: [['kai', '新竹的風很適合拍照。頭髮亂掉的人看起來都很自由。']] },
      { l: [['kai', '我今天拍到一隻在漁港睡午覺的貓。牠比我還會生活。']] },
    ],
    yuna: [
      { l: [['yuna', '今天幫一隻柴犬拔牙。牠咬了我兩次。我們現在是朋友了。']] },
      { l: [['yuna', '我手機裡有三千張貓的照片。不是我的貓。']] },
    ],
  };

  Talk.pick = function (id) {
    const pool = (P[id] || []).filter((e) => !e.c || e.c());
    const fresh = pool.filter((e) => !SW.dailyHas('tk_' + id + '_' + (P[id].indexOf(e))));
    const list = fresh.length ? fresh : pool;
    if (!list.length) return { lines: [[id, '嗯？']] };
    let tot = list.reduce((a, e) => a + (e.w || 1), 0), r = Math.random() * tot, pick = list[0];
    for (const e of list) { r -= (e.w || 1); if (r <= 0) { pick = e; break; } }
    SW.dailyOnce('tk_' + id + '_' + P[id].indexOf(pick));
    let lines = pick.l;
    if (S().f.newLook === T.day() && SW.dailyOnce('look_' + id)) lines = [[id, '欸，你今天換造型了？很適合你。']].concat(lines);
    return { lines };
  };

  // ---------- jokes ----------
  const MYJOKE = {
    pun: ['「你知道 SSD 最怕什麼嗎？……怕被『抹』黑。」', '「為什麼工程師不喜歡去森林？因為有太多 bug。」', '「我最近在吃『輕』食……輕輕鬆鬆就吃完兩個便當。」', '「你知道新竹的風為什麼那麼大嗎？因為它很『竹』急。」'],
    roast: { mira: '「米拉，你的黑眼圈都可以拿去當 QA 的 KPI 了。」', hsiu: '「阿修，你的 commit message 比你的髮型還亂。」', pei: '「小沛，你的拉花是抽象派的嗎？」', anson: '「安森，你是不是連睡覺都在幫別人改作業？」', lele: '「樂樂，你一個月談的戀愛比我一年的 commit 還多。」', kai: '「你拍了一百個港口，是在逃避什麼嗎？」', yuna: '「你看貓的眼神比看人溫柔一百倍。」' },
    self: ['「我今天唯一修好的 bug，是我自己的鬧鐘。」', '「我的人生就像沒有 cache 的 SSD，什麼都要重新讀取。」', '「我上次運動，是追公車。沒追到。」', '「我煮的東西連微波爐都會拒絕加熱。」'],
  };
  const JREACT = {
    mira: { good: [['mira', '……噗。（她摀住嘴）不要讓我笑，我在工作。', '😂']], ok: [['mira', '……嗯。我會把它記錄成 known issue。']], bad: [['mira', '這不好笑。', '😑'], ['mira', '我今天真的沒心情。']] },
    hsiu: { good: [['hsiu', '哈！好啦，這個我給你。', '😆']], ok: [['hsiu', '……好冷。（但他嘴角動了一下）']], bad: [['hsiu', '……很好笑嗎？', '😠'], ['narr', '阿修的耳朵紅了，不是害羞的那種。']] },
    pei: { good: [['pei', '哈哈哈哈哈哈哈！你很煩耶！再講一個！', '🤣']], ok: [['pei', '哈哈，你今天很有梗喔。']], bad: [['pei', '……哈哈。（她笑得有點勉強）'], ['pei', '我今天可能不太適合開玩笑，抱歉。']] },
    anson: { good: [['anson', '哈哈哈！這個我明天要拿去講給學生聽。', '😄']], ok: [['anson', '（他很有禮貌地笑了）有趣。']], bad: [['anson', '……嗯。（他笑了一下，但看起來很累）']] },
    lele: { good: [['lele', '哈哈哈哈我要截圖！你等一下，我要發限動！', '🤣']], ok: [['lele', '哈，普通好笑。給你六十分。']], bad: [['lele', '……你現在跟我開這種玩笑喔。', '🥲']] },
    kai: { good: [['kai', '（他笑出聲）你很有趣。我喜歡。']], ok: [['kai', '哈。我需要一點時間消化。']], bad: [['kai', '……嗯。（尷尬的沉默）']] },
    yuna: { good: [['yuna', '哈哈！你很適合來我們醫院當吉祥物。']], ok: [['yuna', '還行。我同事的更冷。']], bad: [['yuna', '這個……我不太欣賞。']] },
  };
  Talk.joke = function (id, type, res, crowd) {
    const mine = type === 'roast' ? (MYJOKE.roast[id] || '「你今天看起來很像星期一。」') : U.pick(MYJOKE[type]);
    let react = (JREACT[id] || JREACT.anson)[res];
    if (res === 'bad' && type === 'roast' && id === 'hsiu' && crowd) react = [['hsiu', '……很好笑嗎？（大家都在看）', '😠'], ['narr', '阿修的臉色很難看。你讓他在別人面前下不了台。']];
    if (res === 'good' && type === 'pun' && id === 'mira') react = [['mira', '……（三秒的沉默）'], ['mira', '我恨我自己笑了。', '😂']];
    return { mine, react };
  };

  // ---------- flirting ----------
  const MYFLIRT = {
    compliment: ['「你今天看起來特別好看。」', '「你笑起來的時候，整個空間都亮了。」', '「跟你說話的時候，時間過得特別快。」'],
    tease: ['「如果我說我今天是專程來看你的，你信嗎？」', '「你這樣看我，我會以為你喜歡我喔。」'],
    sincere: ['（你看著對方的眼睛，認真地聽每一句話，什麼都沒說破。）'],
  };
  const FREACT = {
    mira: { yes: [['mira', '……你很會講話耶。', '😳'], ['narr', '米拉別過頭，但耳朵紅了。']], soft: [['mira', '你是不是喝了公司的咖啡？那個會讓人產生幻覺。']], firm: [['mira', '{N}，我說過了。'], ['mira', '我們是朋友，好嗎？你這樣我會不自在。']] },
    hsiu: { yes: [['hsiu', '你、你在說什麼啦。', '😳'], ['narr', '他把鍵盤敲得很大聲。']], soft: [['hsiu', '哈哈……你最近是不是在練交友軟體的台詞？']], firm: [['hsiu', '欸，我真的沒有那個意思。'], ['hsiu', '我們維持現在這樣就好，好嗎？']] },
    pei: { yes: [['pei', '哇喔，今天的你很大膽喔。', '😏'], ['narr', '她笑著靠近了一點。'], ['pei', '我喜歡。']], soft: [['pei', '哈哈，這句我拿去寫歌詞好了！'], ['narr', '她輕巧地把話題帶開。']], firm: [['pei', '{N}，我很珍惜我們現在的樣子。'], ['pei', '拜託不要讓它變奇怪，好嗎？']] },
    anson: { yes: [['anson', '……謝謝。', '😊'], ['narr', '他推了推眼鏡，笑得有點不知所措。'], ['anson', '你這樣說，我會當真的。']], soft: [['anson', '哈哈，你今天心情很好喔。要不要喝點茶？']], firm: [['anson', '我覺得我們之間這樣剛剛好。'], ['anson', '我不想讓你誤會，所以想說清楚。']] },
    lele: { yes: [['lele', '欸～～你很壞耶！', '😆'], ['narr', '但她明顯很開心。']], soft: [['lele', '哈哈哈你在練習撩人嗎？我給你八十分！']], firm: [['lele', '好啦，我知道你是開玩笑。'], ['lele', '但我現在真的不想要這種玩笑。']] },
    kai: { yes: [['kai', '你知道嗎？我拍照的時候都在等一個瞬間。'], ['kai', '……剛剛那個好像就是。']], soft: [['kai', '哈，你很直接欸。我們慢慢來好嗎？']], firm: [['kai', '我覺得我們不太適合。抱歉，我想誠實一點。']] },
    yuna: { yes: [['yuna', '你這樣講我會害羞……'], ['yuna', '騙你的，我不會。再講一次。']], soft: [['yuna', '先說好，我對很會撩的人有戒心。（她笑了）']], firm: [['yuna', '我說得很清楚了，我沒有那個意思。']] },
  };
  Talk.flirt = function (id, style, out) {
    let react = (FREACT[id] || FREACT.anson)[out];
    if (out === 'soft' && id === 'lele' && S().f.leleHeartbroken) react = [['lele', '你不要對我太好啦……'], ['lele', '我現在腦袋很亂，我怕我會搞砸，然後連朋友都當不成。']];
    if (out !== 'yes' && SW.Acts.taken(id) === 'player') react = [[id, '你不是在跟' + nm(S().p.partner) + '交往嗎？'], [id, '……這樣不好吧。']];
    else if (out !== 'yes' && SW.Acts.taken(id)) react = [[id, '我……我現在心裡有人了。抱歉。']];
    return { mine: U.pick(MYFLIRT[style]), react };
  };
  Talk.confess = function (id, yes) {
    const Y = {
      mira: [['mira', '……'], ['mira', '我以為我會先說的。'], ['mira', '好。我們試試看。但你要準時。每一次都要。', '🥹']],
      hsiu: [['hsiu', '我、我……'], ['hsiu', '……你確定你不是在整我？'], ['hsiu', '好。好啊。（他的聲音在抖）']],
      pei: [['pei', '你知道嗎？我等這句話等了好一陣子。'], ['pei', '好啊。我們試試看。', '🥰']],
      anson: [['anson', '我……我不太習慣被選擇。'], ['anson', '但我想要。我想要試試看。謝謝你。', '☺️']],
      lele: [['lele', '真的嗎？不是因為可憐我？'], ['lele', '……好。這次我想慢慢來。', '🥹']],
      kai: [['kai', '我本來想等夕陽的時候說的。'], ['kai', '好。我們在一起吧。']],
      yuna: [['yuna', '終於。我還在想要不要我先說。'], ['yuna', '好。但我被急診 call 走的時候你不能生氣。']],
    };
    const N = {
      mira: [['mira', '……謝謝你告訴我。'], ['mira', '可是我現在連自己要不要留在台灣都不知道。我不能這樣對你。']],
      hsiu: [['hsiu', '……對不起。'], ['hsiu', '我心裡有一個人。很久了。我不想騙你。']],
      pei: [['pei', '{N}……你對我很重要。'], ['pei', '但我現在沒辦法把心放在這裡。我連咖啡廳都快顧不住了。對不起。']],
      anson: [['anson', '謝謝你。真的。'], ['anson', '但我……我心裡其實一直有一個人。我不想讓你當我的退路。']],
      lele: [['lele', '……你很好。真的。'], ['lele', '但我才剛學會一個人睡覺。我不想再用一段關係逃避自己了。']],
      kai: [['kai', '我覺得我們還不夠了解彼此。抱歉。']],
      yuna: [['yuna', '我很喜歡跟你出來。但我覺得我們當朋友比較好。']],
    };
    return (yes ? Y : N)[id] || [[id, yes ? '好。' : '對不起。']];
  };

  // ---------- gifts ----------
  const GSPECIAL = {
    'mira:sticker': '貓咪貼紙……（她立刻貼在筆電上）這隻的表情好像我在跑 regression。',
    'mira:energy': '能量飲料？你是覺得我很累嗎。……我是很累。',
    'hsiu:keycaps': '這是……限量配色！你、你哪裡買到的！我要立刻裝！',
    'hsiu:sticker': '貼紙……我又不是小學生。（但他收進口袋了）',
    'pei:picks': '這組 Pick 是我一直想買的！週五就用它！',
    'pei:sunflower': '向日葵……你知道我最喜歡向日葵嗎？因為它很努力地在找光。',
    'pei:coffee': '你……買咖啡送咖啡廳店長？（她笑到彎腰）好啦，我收下，這是我今年收過最好笑的禮物。',
    'anson:tea': '高山烏龍！我可以在小組的時候泡給大家喝嗎？',
    'anson:novel': '《慢慢來也沒關係》……你是在暗示我什麼嗎？（他笑了）我會好好看的。',
    'anson:beer': '我不太喝酒耶……不過我可以拿去給老蔡。謝謝你。',
    'lele:boba': '珍奶！！你是天使！全糖少冰對不對！',
    'lele:novel': '書？（她翻了兩頁）好多字……我會努力的。',
    'kai:novel': '我在火車上讀過這本的一半。你怎麼知道。',
    'yuna:sticker': '貓咪！！我要貼在診療室！',
  };
  Talk.gift = function (id, item, like) {
    const it = SW.ITEMS[item];
    const sp = GSPECIAL[id + ':' + item];
    if (sp) return [[id, sp, like >= 2 ? '🥰' : like < 0 ? '😅' : '🙂']];
    const g = like >= 3 ? `${it.name}！你怎麼知道我超愛這個！` : like === 2 ? `哇，${it.name}！謝謝你！` : like === 1 ? '謝謝～我很喜歡。' : like === 0 ? '喔……謝謝。' : '……我其實不太喜歡這個。不過，謝謝你的心意。';
    const lines = [[id, g, like >= 2 ? '🥰' : like < 0 ? '😅' : '🙂']];
    if (id === 'pei' && T.day() === 1) lines.push(['pei', '這是生日禮物嗎？……謝謝你記得。']);
    return lines;
  };

  // ---------- invites ----------
  Talk.busyLine = (id, act) => {
    if (id === 'pei' && /壽星/.test(act)) act = '跟米拉吃晚餐'; // she must not hear about her own surprise party
    act = String(act).replace(/^在/, '');
    return ({ mira: `我在${act}，晚點再說好嗎？`, hsiu: `我那時候要${act}。很忙。`, pei: `啊，我那時候在${act}耶～`, anson: `抱歉，我那時候在${act}。`, lele: `我那時候在${act}啦～`, kai: '那個時間我有拍攝工作。', yuna: '那時候我在值班。' }[id] || `我那時候在${act}。`);
  };
  Talk.inviteYes = function (id, act, rom) {
    const Y = {
      mira: ['好啊。準時喔，我會看錶。', '……約會？好。（停頓）我會準時。你也是。'],
      hsiu: ['可以啊，反正我也沒事。', '你、你確定是約會嗎？……好。'],
      pei: ['好耶！我會很期待～', '約會嗎？好啊。不要讓我等太久喔。'],
      anson: ['好啊，我會空下來。', '……好。我其實，很開心你約我。'],
      lele: ['好啊好啊！要拍照！', '欸？約會？……好啊！我要穿漂亮一點！'],
      kai: ['好，我帶相機。', '好，我帶相機。還有一點勇氣。'],
      yuna: ['好啊，如果沒被急診 call 走的話。', '好啊，如果沒被急診 call 走的話。我會很期待。'],
    }[id] || ['好啊。', '好啊。'];
    return Y[rom ? 1 : 0];
  };
  Talk.inviteNo = (id) => ({ mira: '這週我真的很累，下次好嗎？', hsiu: '那個……我不太想。', pei: '啊……我最近有點忙，下次啦！', anson: '我那天可能想早點休息，抱歉。', lele: '我現在沒心情欸……改天！', kai: '我這週有點忙，抱歉。', yuna: '下次吧。' }[id] || '下次吧。');
  Talk.romanticNo = (id, taken) => taken ? '我……現在心裡有人了。當朋友出去可以，但約會不行。' : ({ mira: '我們當朋友出去，好嗎？我現在沒辦法想那些。', hsiu: '欸……我們當朋友就好吧。', pei: '當朋友去的話，我很樂意喔。', anson: '我很重視你。但我想先當朋友。', lele: '我現在真的不能約會啦……我會搞砸的。' }[id] || '我們先當朋友吧。');

  const JINTRO = {
    coffee: { mira: '我點美式。黑的。跟我的心一樣。', hsiu: '我要最大杯的。今天的 code 不配我清醒。', pei: '在別人的咖啡廳喝咖啡，像是去敵營偷看。……開玩笑的，這是我的店。', anson: '我點熱拿鐵。今天想喝溫暖一點的。', lele: '我要最甜的那個！今天的我需要糖！', _: '來吧，坐窗邊。' },
    walk: { mira: '走吧，我需要風。', hsiu: '散步？……好吧，算有氧。', pei: '河堤！我最喜歡在這裡寫歌。', anson: '走一走很好，腦袋會比較安靜。', lele: '河堤！拍照！夕陽！', _: '走吧。' },
    dinner: { mira: '我好餓。我今天午餐只吃了一顆茶葉蛋。', hsiu: '我要點炸物。全部。', pei: '老蔡的特調我可以喝三杯！', anson: '好久沒好好坐下來吃飯了。', lele: '乾杯！為了單身！……還是為了你？', _: '餓死了。' },
    gym: { mira: '你確定你跟得上我？', hsiu: '終於有人陪我練腿了。', pei: '我只會跳舞喔，不會舉重。', anson: '我……很久沒運動了。手下留情。', lele: '我穿了新的運動服！所以今天一定要拍照！', _: '來吧！' },
    jam: { mira: '我不會樂器喔。我只會按錄音鍵。', hsiu: '我……我只會一點點。真的只有一點點。', pei: '來！你彈吉他，我唱！', anson: '我可以打鈴鼓。教會的鈴鼓手就是我。', lele: '我負責尖叫跟拍手！', _: '來練吧！' },
    market: { mira: '我只吃三樣。……好啦五樣。', hsiu: '雞排我請。不要跟我搶。', pei: '我知道哪一攤的臭豆腐最好吃！跟我走！', anson: '好久沒逛夜市了。人好多，好有活力。', lele: '夜市！！我的主場！！', kai: '夜市的燈很適合拍人像。你站好。', yuna: '我今天沒被 call！快，先吃再說！', _: '走！我要吃三輪！' },
    cook: { mira: '我負責洗菜。我洗菜很專業。', hsiu: '我會煮泡麵。很強的那種。', pei: '把廚房交給我……不，交給你，我今天想被照顧。', anson: '我可以幫忙切菜。我切菜很快喔，教會訓練的。', lele: '我負責吃！跟拍照！', _: '來煮吧！' },
  };
  Talk.jointIntro = function (id, act, rom) {
    const base = (JINTRO[act] || {})[id] || (JINTRO[act] || {})._ || '走吧。';
    return rom && SW.CH[id].date ? base + '（他們看起來有點緊張，也有點期待）'.replace('他們', '對方') : base;
  };
  Talk.jointBye = function (id, act, rom, score) {
    if (rom) return { mira: '今天……謝謝你。我很開心。真的。', hsiu: '那個……下次，還可以再約嗎？', pei: '今天是這週最好的一天。（她揮了揮手，倒退著走）', anson: '謝謝你今天選了我。……我是說，約了我。', lele: '我今天沒有想到他耶！一次都沒有！', kai: '下次我想帶你去看漁港的日落。', yuna: '我很開心。我會記得今天的。' }[id] || '下次見。';
    return { mira: '今天不錯。下次再約。', hsiu: '……還行啦。下次再來。', pei: '謝謝你陪我！我充飽電了！', anson: '謝謝你。這是我這週最輕鬆的時間。', lele: '好開心！下次換我請！（她不會請）', kai: '今天很好。', yuna: '下次見囉。' }[id] || '下次見。';
  };

  // ---------- apology ----------
  const MYAPOL = { sincere: '「對不起。是我的錯，我不找理由。」', explain: '「對不起，那時候我真的被事情卡住了……」', joke: '「欸，原諒我嘛，我請你喝一百杯咖啡？」' };
  Talk.apology = function (id, style, g) {
    const r = R(id), leak = g.kind === 'leak';
    const A = {
      mira: { sincere: [[['mira', leak ? '秘密之所以是秘密，就是因為我只跟你說。' : '……嗯。我收到了。'], ['mira', '下次至少傳個訊息給我。']], { tension: leak ? -5 : -8, trust: 3 }], explain: [[['mira', '理由我聽到了。'], ['mira', '但我在意的不是理由，是你有沒有把我放在心上。']], { tension: -3 }], joke: r.comfort >= 60 && !leak ? [[['mira', '……一百杯。我會記帳。'], ['narr', '她嘴角上揚了。']], { tension: -6 }] : [[['mira', '我現在不想開玩笑。']], { tension: 3 }] },
      hsiu: { sincere: [[['hsiu', '……好啦。我也沒有很在意。'], ['narr', '他很在意。但他的肩膀放鬆了。']], { tension: -7, trust: 2 }], explain: [[['hsiu', '喔，你很忙喔。大家都很忙。']], { tension: -2 }], joke: [[['hsiu', '一百杯能量飲料可以考慮。']], { tension: -5 }] },
      pei: { sincere: [[['pei', leak ? '我知道你不是壞心……但那是我還沒準備好說的事。' : '哎呀，沒關係啦！我知道你不是故意的。'], ['pei', '抱一個？']], { tension: leak ? -6 : -10, trust: 3 }], explain: [[['pei', '嗯嗯，我懂。謝謝你跟我說。']], { tension: -7 }], joke: [[['pei', '哈哈哈好，一百杯，你說的喔！']], { tension: leak ? -3 : -8 }] },
      anson: { sincere: [[['anson', '謝謝你願意說。'], ['anson', '我比較擔心的是，你最近是不是也太累了？']], { tension: -9, trust: 4 }], explain: [[['anson', '我懂，真的。我自己也常常這樣。']], { tension: -7 }], joke: [[['anson', '（他笑了）好，我接受。但你要好好睡覺。']], { tension: -6 }] },
      lele: { sincere: [[['lele', '哼。好啦原諒你。'], ['lele', '但你要請我喝珍奶。']], { tension: -8 }], explain: [[['lele', '我不要聽理由！'], ['lele', '……好啦我聽。嗯。好吧。']], { tension: -5 }], joke: [[['lele', '一百杯珍奶！成交！']], { tension: -9 }] },
    }[id] || { sincere: [[[id, '好，我接受。']], { tension: -6 }], explain: [[[id, '嗯。']], { tension: -3 }], joke: [[[id, '……哈。']], { tension: -2 }] };
    const [react, fx] = A[style];
    return { mine: MYAPOL[style], react, fx };
  };

  // ---------- gossip ----------
  const ORDER = ['breakup', 'ansonTired', 'lease', 'hsiuSong', 'holiday', 'ansonPei', 'rumorLele', 'fish', 'party'];
  Talk.gossipAsk = function (id) {
    const r = R(id);
    const will = (f) => {
      const fact = SW.FACTS[f];
      if (fact.owner === id) return false;
      if (f === 'party' && (T.day() > 1 || id === 'pei')) return false;
      if (!fact.secret) return id !== 'anson' || f !== 'ansonTired';
      if (id === 'lele') return true;
      if (id === 'anson') return false;
      if (id === 'mira') return r.trust >= 65;
      if (id === 'hsiu') return r.friend >= 60;
      if (id === 'pei') return r.trust >= 60;
      return false;
    };
    const f = ORDER.find((k) => Sys.knows(id, k) && !K(k) && will(k));
    if (!f) {
      const hint = { mira: '倒是阿修最近一直在哼歌。很吵。', hsiu: '倒是小沛最近好像一直在講電話，臉色不太好。', pei: '倒是安森最近好像都沒睡。', anson: '我不太喜歡講別人的事。但如果你擔心誰，可以直接去關心他。', lele: '我最近都在處理自己的爛事啦……' }[id];
      return { lines: [[id, '最近？沒什麼特別的耶。'], [id, hint || '……沒有啦。']] };
    }
    const txt = SW.FACTS[f].text;
    const intro = { lele: `你知道嗎！！${txt}！不要說是我說的！`, mira: `……你沒聽說？${txt}。`, hsiu: `跟你說，${txt}。我什麼都沒說喔。`, pei: `嗯……${txt}。我覺得你應該知道。`, anson: `${txt}。我想，你可以多關心一下。` }[id] || txt;
    return { lines: [[id, intro]], fact: f };
  };
  Talk.gossipTell = function (id, f) {
    const fact = SW.FACTS[f], st = S();
    const out = { pre: [], lines: [], fx: {} };
    if (fact.secret && id === 'anson') { out.pre = [['anson', '等等——這是對方想讓我知道的嗎？']]; out.stop = true; }
    if (fact.secret && id === 'mira') { out.pre = [['mira', '……你確定這可以說？']]; out.stop = true; }
    const def = { lele: [['lele', '真的假的！！！'], ['narr', '樂樂已經開始打字了。'], ['lele', '我、我沒有要傳出去！我只是在……打草稿。']], mira: [['mira', '……我知道了。']], hsiu: [['hsiu', '喔。……我不知道你為什麼要跟我說這個。']], pei: [['pei', '……謝謝你告訴我。我會小心處理的。']], anson: [['anson', '……好。我會當作沒聽過。但我會多注意。']] };
    out.lines = def[id] || [[id, '原來如此。']];
    if (id === 'lele') out.fx = { friend: 2, comfort: 2 };
    if (fact.secret) out.fx.trust = (out.fx.trust || 0) - 2;
    // special combinations
    if (f === 'hsiuSong' && id === 'lele') { out.lines = [['lele', '什麼！！阿修喜歡米拉！？'], ['lele', '那我這幾天在幹嘛！！我還以為……（她摀住臉）好丟臉喔！'], ['lele', '……好。我決定了。我要當他的僚機。']]; out.after = () => { st.f.leleKnowsHsiu = true; Sys.forget('lele', 'rumorLele'); }; }
    if (f === 'hsiuSong' && id === 'mira') { out.lines = [['mira', '……阿修？喜歡我？'], ['narr', '米拉沉默了五秒。'], ['mira', '……他那個笨蛋。']]; out.after = () => { st.f.miraForewarned = true; }; }
    if (f === 'rumorLele' && id === 'mira') { out.lines = [['mira', '……喔。是喔。'], ['mira', '很好啊。很配。'], ['narr', '她用力敲了三下鍵盤。']]; out.after = () => { Sys.pch('hsiu', 'mira', { attract: -6, tension: 6 }); st.f.miraJealous = true; }; }
    if (f === 'rumorLele' && id === 'hsiu') { out.lines = [['hsiu', '什麼？我？樂樂？'], ['hsiu', '不是啦！！是——'], ['narr', '他突然閉上嘴。'], ['hsiu', '……總之不是。拜託你幫我澄清。']]; out.after = () => { Sys.forget('hsiu', 'rumorLele'); if (!K('hsiuSong')) UI.toast('🔍 阿修差點說出一個名字。'); }; }
    if (f === 'lease') {
      if (id === 'mira') out.lines = [['mira', '……小沛都沒說。'], ['mira', '她一定很難受。']];
      if (id === 'anson') out.lines = [['anson', '……我一直覺得她不對勁。'], ['anson', '我想幫她。我應該怎麼做？']];
      if (id === 'lele') { out.lines = [['lele', '什麼！！轉角要倒了！？'], ['lele', '不行！我們要辦活動！我要寫企劃！我要開募資！'], ['narr', '樂樂眼睛裡燃起了熊熊的行銷之火。']]; out.after = () => { if (!st.cafe.crowd) st.cafe.crowd = 10000; }; }
      if (id === 'hsiu') out.lines = [['hsiu', '十五萬？'], ['hsiu', '……說實話，咖啡廳這種生意本來就很難。']];
    }
    if (f === 'holiday' && id === 'hsiu') { out.lines = [['hsiu', '……澳洲？'], ['narr', '阿修看起來像被拔掉電源的伺服器。'], ['hsiu', '她要走？……喔。']]; out.after = () => { st.f.hsiuKnowsHoliday = true; }; }
    if (f === 'ansonTired' && id !== 'anson') { out.lines = [[id, id === 'pei' ? '我就覺得他最近臉色很差！我明天開始逼他吃飯。' : id === 'lele' ? '安森！？他是我們之中最會照顧人的耶……換我們照顧他！' : id === 'mira' ? '……他上週幫我搬了三箱測試機。我都沒注意到。' : '他喔……我會叫他早點睡。']]; out.after = () => { st.f.ansonCare = (st.f.ansonCare || 0) + 1; }; out.fx = { trust: 2 }; }
    if (f === 'ansonPei' && id === 'pei') { out.lines = [['pei', '……安森？'], ['pei', '我、我從來沒有……'], ['narr', '小沛的臉慢慢紅起來。']]; out.after = () => { st.f.peiKnowsAnson = true; Sys.pch('anson', 'pei', { attract: 6 }); }; }
    if (f === 'party' && id === 'pei') { out.lines = [['pei', '咦？驚喜派對？'], ['pei', '……好，我會假裝很驚訝！'], ['narr', '她已經很驚訝了。']]; out.after = () => { st.f.partySpoiled = 'player'; }; }
    return out;
  };
  Talk.clearRumor = function (id, f, mode) {
    if (mode === 'truth' && id === 'lele') { S().f.leleKnowsHsiu = true; return [['lele', '什麼！！他喜歡米拉！？'], ['lele', '那我這幾天自作多情的那些……'], ['lele', '好丟臉喔！！！不過，好啦，我要幫他！']]; }
    if (mode === 'truth') return [[id, '……原來是這樣。'], [id, '那你最好別再跟別人說了。']];
    return [[id, '是喔？可是他真的很怪耶……'], [id, '好啦，我不亂講了。']];
  };

  // ---------- observation ----------
  Talk.observe = function (id) {
    const st = S(), n = st.n[id], r = R(id), ch = SW.CH[id], out = [];
    const a = ch.name;
    out.push(`${a}正在${n.act || '發呆'}。`);
    if (n.mood > 75) out.push('看起來心情很好，嘴角一直往上。'); else if (n.mood < 40) out.push('眉頭一直沒有鬆開。');
    if (n.energy < 25) out.push('黑眼圈很深，動作比平常慢半拍。');
    if (r) {
      if (st.p.partner === id) out.push('你們的視線交會，彼此都笑了。');
      else if (r.tension > 50) out.push(`注意到你的視線時，${a}刻意轉開了頭。`);
      else if (r.attract > 55) out.push(`和你對到眼的時候，${a}愣了半秒。`);
      else if (r.friend > 70) out.push(`看到你時，${a}的眼睛亮了一下。`);
      else if (r.comfort < 35) out.push(`你靠近的時候，${a}的姿勢有點僵硬。`);
    }
    if (id === 'pei' && !K('lease') && st.cafe.outcome === null) out.push('她每隔幾分鐘就看一次手機，然後把螢幕蓋起來。圍裙口袋裡露出一角信封。');
    if (id === 'hsiu' && !K('hsiuSong')) out.push('他筆記本的角落寫著幾行字，劃掉又重寫——看起來像……歌詞？');
    if (id === 'hsiu' && here('mira')) out.push('他的視線一直往米拉的方向飄。');
    if (id === 'anson' && n.energy < 40) { out.push('他倒水的時候，手在微微發抖。'); if (!K('ansonTired')) { Sys.learn('player', 'ansonTired', null); } }
    if (id === 'mira' && T.day() >= 3 && !K('holiday') && !st.f.miraHint) { out.push('她的螢幕角落有一個分頁：「打工度假簽證｜核發通知」。她很快把它切掉了。'); st.f.miraHint = true; }
    if (id === 'lele' && st.f.leleHeartbroken) out.push('她一直滑手機，停在同一張照片很久。');
    if (id === 'anson' && here('pei')) out.push('他跟小沛說話的時候，聲音會不自覺地放輕。');
    return out;
  };

  // ---------- eavesdropping ----------
  Talk.eaves = function (a, b) {
    const st = S(), pair = U.pairKey(a, b), out = { lines: [], learn: [] };
    const caught = Math.random() < 0.22 + (R(a) && R(a).comfort < 40 ? 0.15 : 0);
    if (pair === 'hsiu|mira') { out.lines = [['hsiu', '你的 log 格式又錯了。'], ['mira', '你的 code 也是。'], ['hsiu', '……週五晚上，你有要去咖啡廳嗎？'], ['mira', '幹嘛？'], ['hsiu', '沒、沒事。問問而已。']]; out.after = () => { if (!st.f.eavesHsiu) { st.f.eavesHsiu = true; UI.toast('🔍 阿修好像……在約米拉？'); } }; }
    else if (pair === 'lele|pei' && st.cafe.outcome === null) { out.lines = [['lele', '你最近怎麼了？你都不笑了。'], ['pei', '我有笑啊！你看——'], ['lele', '那不是笑，那是客服。'], ['pei', '……房東要漲租。很多。週日前要給答覆。']]; out.learn = ['lease']; Sys.learn('lele', 'lease', 'pei', true); }
    else if ((a === 'pei' || b === 'pei') && (a === 'landlord' || b === 'landlord')) { out.lines = [['landlord', '阿沛啊，我也不是要逼你……'], ['pei', '我知道，陳伯。我會想辦法。'], ['landlord', '我只是想知道，這間店以後，還有沒有人好好顧。']]; out.after = () => { st.f.landlordHint = true; UI.toast('🔍 陳伯在意的，好像不只是錢。'); }; }
    else if ((a === 'pei' || b === 'pei') && st.cafe.outcome === null && T.day() <= 6) { const o = a === 'pei' ? b : a; out.lines = [[o, '你最近好像很累？'], ['pei', '我沒事啦～'], ['pei', '只是……房東那邊……算了，不說了。']]; out.learn = ['lease']; }
    else if (pair === 'hsiu|lele') { out.lines = [['lele', '阿修～你最近是不是有心事？'], ['hsiu', '沒、沒有啊。'], ['lele', '（壓低聲音）你是不是喜歡……'], ['hsiu', '不是你！……我是說，不是。'], ['lele', '？？？']]; out.after = () => UI.toast('🔍 「阿修喜歡樂樂」好像是誤會。'); }
    else if (pair === 'lele|mira') { out.lines = [['lele', '米拉，你覺得我會不會一輩子都一個人？'], ['mira', '你才二十五歲。'], ['lele', '所以還有好幾十年可以一個人！'], ['mira', '……你今晚要不要來吃飯。']]; Sys.pch('lele', 'mira', { friend: 2, tension: -2 }); }
    else if (a === 'anson' || b === 'anson') { const o = a === 'anson' ? b : a; out.lines = [['anson', '……我沒事。只是這週有點滿。'], [o, '你上次也這樣說。'], ['narr', '安森笑了一下，沒有回答。']]; out.learn = ['ansonTired']; }
    else if (pair === 'lele|zhe') { out.lines = [['zhe', '我覺得我們……想要的東西不一樣。'], ['lele', '你是說，你想要的東西裡面沒有我？'], ['zhe', '不是這樣——'], ['lele', '那是怎樣？你說啊。']]; out.learn = ['breakup']; }
    else out.lines = [[a, '……所以我就跟他說，那不是我的問題。'], [b, '哈哈哈，真的假的。']];
    out.caught = caught;
    return out;
  };
  Talk.cafeOverhear = function () {
    const here2 = SW.W.npcsHere().filter((i) => SW.CH[i].core || i === 'landlord');
    if (here2.length < 2) return null;
    return Talk.eaves(here2[0], here2[1]).lines;
  };

  // ---------- minor NPCs ----------
  Talk.minorMenu = function (id) {
    const st = S();
    if (id === 'boss') return [
      { icon: '🗨️', t: '聊兩句', v: 'talk' },
      { icon: '📊', t: '報告進度', v: 'report' },
      T.day() >= 2 && !st.f.promoAsked ? { icon: '🎯', t: '爭取 Feature Owner', sub: '主動表態', v: 'promo' } : null,
      K('lease') && !st.f.pitched ? { icon: '☕', t: '提案：福委會和轉角咖啡廳合作', sub: '幫小沛找長期客戶', v: 'pitch' } : null,
      T.mod() < 17 * 60 && !T.weekend() ? { icon: '🏃', t: '申請早退', v: 'leave' } : null,
    ];
    if (id === 'tsai') return [{ icon: '🗨️', t: '聊天', v: 'talk' }, { icon: '👂', t: '「最近有看到什麼嗎？」', sub: '酒館老闆什麼都知道', v: 'hint' }];
    if (id === 'coach') return [{ icon: '🗨️', t: '聊天', v: 'talk' }, { icon: '💪', t: '請教訓練', sub: '一次性小提升', v: 'tip', dis: !!st.f.coachTip }];
    if (id === 'pastor') return [{ icon: '🗨️', t: '聊天', v: 'talk' }, { icon: '🕊️', t: '談談心事', v: 'heart' }];
    return [{ icon: '🗨️', t: '聊天', v: 'talk' }];
  };
  Talk.minorRun = async function (id, v) {
    const st = S(), W = st.work;
    await SW.scene(async () => {
      if (id === 'boss') {
        if (v === 'talk') { await say('boss', U.pick(['你知道我們這行最重要的是什麼嗎？不是聰明，是不要在週五下午 merge。', '我年輕的時候也很拚。後來我發現，拚到最後，只有 SSD 記得你。', '茶水間那個公告，不是針對你。……除非是你。'])); }
        if (v === 'report') {
          const done = W.bugsDone.length;
          if (st.f.bug4521 === 'ontime') await say('boss', '4521 那個修得很漂亮。客戶那邊安靜了。');
          else if (done) await say('boss', `這週修了 ${done} 個。不錯。繼續保持。`);
          else await say('boss', '嗯……進度有點慢。有卡住要說，不要自己悶著。');
          if (W.legend >= 8) await say('boss', '還有，聽說你在部門裡很有名。……不是因為 Bug。');
          W.bossTrust += done ? 1 : 0;
        }
        if (v === 'promo') {
          st.f.promoAsked = true;
          await say('boss', '你想要 Feature Owner？');
          const c = await choose([{ t: '「我想要。我準備好了。」', v: 'want' }, { t: '「我覺得阿修也很適合，但我想試試。」', v: 'fair' }, { t: '「其實我只是想知道標準是什麼。」', v: 'ask' }]);
          if (c === 'want') { await say('boss', W.perf >= 6 && W.bossTrust >= 58 ? '……我會認真考慮。這週表現給我看。' : '想要是好事。但先讓我看到你能扛。'); W.bossTrust += 2; }
          else if (c === 'fair') { await say('boss', '會稱讚對手的人，通常比較適合帶人。我記下了。'); W.bossTrust += 4; Sys.ch('hsiu', { trust: 2 }, true); }
          else await say('boss', '標準很簡單：能不能在出事的時候，讓別人放心。');
        }
        if (v === 'pitch') {
          st.f.pitched = true;
          await me('「課長，福委會不是一直在找下午茶的合作廠商嗎？轉角咖啡廳就在公司旁邊……」');
          if (W.bossTrust >= 56) {
            await say('boss', '……你連這個都在想？好。我幫你問福委會，每月固定訂單、部門活動場地，可以談。');
            st.cafe.partner = st.cafe.partner || 'company';
            Sys.later(30, 'msg', { thread: 'boss', from: 'boss', text: '福委會說可以談。週六前讓店家準備報價。' });
            Sys.later(32, 'pitchToPei', {});
            Sys.mem([], '你在公司幫轉角爭取到福委會的合作機會', 1, 'pitch', true);
          } else { await say('boss', '這種事要有人背書。你先把自己的事做好，我才好開口。'); }
        }
        if (v === 'leave') { W.bossTrust -= 2; await say('boss', '……去吧。明天早點來。'); const b = SW.W.building('office'); SW.W.enter('city', b.door[0] + 0.5, b.door[1] + 2.4, 'down'); }
      }
      if (id === 'tsai') {
        if (v === 'talk') await say('tsai', U.pick(['開店二十年，我學到一件事：人喝醉了才說真話，但清醒時說的真話比較值錢。', '你們那群朋友啊，每次都坐那張長桌，吵得要死。……我很喜歡。', '好日子不是每天都有。所以店名才叫好日子。']));
        if (v === 'hint') {
          const hints = [];
          if (T.day() <= 2) hints.push(['tsai', '那個綁馬尾的女生——樂樂？她禮拜二晚上訂了卡座，跟一個男的。我看那個男的表情，不太妙。']);
          if (S().n.anson.energy < 45) hints.push(['tsai', '你們那個戴眼鏡的朋友，安森？上週在這裡點了一杯熱牛奶，然後趴著睡著了。']);
          hints.push(['tsai', '陳伯——轉角的房東——是我國中同學。他啊，嘴巴硬、心很軟。他最在意的是那間店有沒有人好好顧，不是錢。']);
          if (T.day() >= 4) hints.push(['tsai', '阿修上週四練完歌，跑來這裡喝悶酒，一直說「如果她去了澳洲怎麼辦」。我也不知道她是誰。']);
          const h = hints.find((x) => !SW.dailyHas('tsaiHint_' + x[1].slice(0, 6))) || hints[hints.length - 1];
          SW.dailyOnce('tsaiHint_' + h[1].slice(0, 6));
          await say(h[0], h[1]);
          if (/陳伯/.test(h[1])) st.f.landlordHint = true;
          if (/澳洲/.test(h[1])) st.f.tsaiHoliday = true;
        }
      }
      if (id === 'coach') {
        if (v === 'talk') await say('coach', U.pick(['肌肉不會背叛你。但你的膝蓋會。所以要熱身。', '你們工程師啊，肩膀都很緊。每坐一小時要起來動一動！', '阿修？他很認真，就是太愛面子，重量都拿太重。']));
        if (v === 'tip') { st.f.coachTip = true; await say('coach', '重點是呼吸。出力吐氣、放下吸氣。來，跟我做一次。'); Sys.skill('fitness', 0.6); }
      }
      if (id === 'pastor') {
        if (v === 'talk') await say('pastor', U.pick(['歡迎來坐坐。這裡不用打卡。', '信不信都沒關係，椅子都一樣舒服。', '我們週五有社區愛宴，很多附近的阿公阿嬤會來。缺人洗碗喔。']));
        if (v === 'heart') {
          await say('pastor', '最近好嗎？');
          const c = await choose([{ t: '「我最近有點迷惘，不知道自己在忙什麼。」', v: 'lost' }, { t: '「我不太確定自己信什麼。」', v: 'doubt' }, { t: '「我有個朋友好像快撐不住了。」', v: 'friend' }]);
          if (c === 'lost') await say('pastor', '迷惘不一定是壞事。很多時候，是你終於停下來，才發現自己一直在跑。');
          if (c === 'doubt') await say('pastor', '那很好啊。問問題的人，比假裝有答案的人誠實。你不需要先確定，才能來這裡坐。');
          if (c === 'friend') { await say('pastor', '是安森吧？'); await say('pastor', '他是我見過最會照顧人的年輕人，也是最不會讓人照顧他的。也許你可以試試看——不是幫他做事，是讓他停下來。'); st.f.pastorHint = true; }
          Sys.mood(5);
        }
      }
      if (id === 'landlord') await say('landlord', U.pick(['這間店，我阿母以前也在這裡賣過豆花。', '年輕人，你也是這間店的常客喔？']));
      if (id === 'zhe') await say('zhe', '……你是樂樂的朋友吧。幫我跟她說聲對不起。我不是壞人，我只是……不夠好。');
    });
  };
  SW.H.pitchToPei = () => { Sys.msg('pei', 'me', '我們公司福委會說可以跟轉角談合作！每月固定訂單，還有部門活動場地！'); Sys.msgLater(4, 'pei', 'pei', '真的嗎？？？……我需要消化一下。謝謝你。真的。'); SW.S.cafe.will += 8; Sys.ch('pei', { trust: 5, friend: 3 }, true); Sys.mem('pei', '你在公司幫轉角爭取到福委會的合作', 1, 'pitchPei', true); };

  // ---------- environment text ----------
  Talk.board = function (place) {
    const st = S();
    if (place === 'office') {
      const l = ['【福委會公告】請勿在茶水間微波海鮮類食物。', '【部門公告】韌體部門 Feature Owner 遴選，結果於下週一公布。'];
      if (st.f.bossMemo && T.day() >= st.f.bossMemo) l.push('【課長手寫】請「跨部門 Bug 祈福大會」的主辦人，主動到我辦公室。（底下有人畫了一個雙手合十的表情）');
      if (st.f.fish) l.push('【再次公告】是誰。——全體同仁');
      if (T.day() >= 4) l.push('【Release】FW 2.3 預計週五晚間發布，請相關同仁待命。');
      return l;
    }
    if (place === 'cafe') {
      const l = ['🎸 轉角樂團 週二、週四晚上在回聲工作室練團，歡迎旁聽。', '🐱 尋貓啟事：橘貓「拿鐵」，很胖，會撒嬌，最後一次出現在河堤。'];
      if (st.cafe.plan === 'gig' || st.f.gigPlanned) l.push('📣 本週五 20:00「我們還有地方可以坐嗎？」轉角 Live —— 一起留下轉角！');
      if (st.f.petition) l.push(`✍️ 連署：我們想留下轉角（目前 ${8 + st.cafe.petition * 7} 人簽名）`);
      if (st.cafe.outcome === 'renew') l.push('🎉 轉角續約了！謝謝每一個人。——小沛');
      if (st.cafe.outcome === 'relocate') l.push(`📦 轉角要搬家了！新的地方：${{ church: '光鹽教會一樓交誼廳（平日）', company: '矽藍科技一樓（福委會合作）', studio: '回聲音樂工作室大廳' }[st.cafe.partner] || '再公告'}。`);
      if (st.cafe.outcome === 'close') l.push('🕯️ 轉角將在月底結束營業。謝謝這些年每一個坐下來的人。');
      return l;
    }
    return ['📖 週四 19:30 小組聚會｜主題：「安息」——你上一次真正休息，是什麼時候？', '🍲 週五 18:00 社區愛宴｜需要志工：切菜、洗碗、陪伴長輩。', '⛪ 週日 10:00 主日聚會｜第一次來的朋友歡迎坐後面，有咖啡。', '🎸 詩歌服事｜徵求吉他手一名（請洽安森）'];
  };
  Talk.fridge = function () {
    const st = S();
    if (st.f.leleStay === 'player') return '冰箱裡多了十二瓶珍奶、一盒寫著「樂樂的 勿動 ♡」的布丁，還有一顆不知道為什麼在冰箱裡的鯊魚玩偶。';
    if (st.p.roommate === 'mira') return '上層是米拉的豆漿和優格，每一罐都貼了名字。下層是你的……半顆高麗菜。';
    return '一瓶醬油、兩顆蛋、一盒不知道哪一年的泡菜。冰箱燈閃了兩下，好像在嘆氣。';
  };

  // ---------- phone replies ----------
  Talk.lateSeen = (id) => ({ mira: '……嗯。下次早點回。', hsiu: '喔。已讀不回是一種藝術。', pei: '沒關係啦～你一定很忙！', anson: '沒關係，我知道你很忙。', lele: '我以為你被外星人抓走了！！', kai: '沒事，我也常忘記回。', yuna: '哈，我懂，我也是看到就忘。', boss: '……下次早點回。' }[id] || '沒關係。');
  Talk.lateReply = (id) => ({ mira: '……好。我會等。但不要太晚。', hsiu: '喔。', pei: '沒問題～我幫你留位子！', anson: '慢慢來，路上小心。', lele: '快點啦！！我已經點了兩杯了！', kai: '好，我先拍點東西。', yuna: '沒關係，我也剛下班。' }[id] || '好。');
  Talk.cancelReply = function (id, pen, p) {
    const big = pen >= 6;
    return ({ mira: big ? '……我已經在這裡了。好吧。' : '謝謝你提早說。下次再約。', hsiu: big ? '早說嘛。' : '喔，好。', pei: big ? '啊……好吧，沒關係啦。下次喔！' : '好～下次見！', anson: '沒關係，你先忙。照顧好自己。', lele: big ? '蛤！！好啦……' : '好啦好啦，你欠我一次！', kai: '了解。下次吧。', yuna: '沒事，我懂臨時有事的感覺。' }[id]) || '好。';
  };
  Talk.textReply = function (id) {
    const n = S().n[id], act = n.act || '發呆';
    return ({ mira: `在${act}。你呢？……不要說你在摸魚。`, hsiu: `${act}。幹嘛？`, pei: `在${act}～你要來嗎？☕`, anson: `在${act}。你今天還好嗎？`, lele: `在${act}啦！！好無聊！！來找我！！`, kai: `在${act}。剛拍到一朵很醜的雲。`, yuna: `在${act}。剛被一隻貓抓。` }[id]) || `在${act}。`;
  };
  Talk.relWord = (id) => { const t = Sys.tiers(id); return t.map((x) => x[0]).slice(0, 2).join('、'); };
  Talk.pairWord = function (a, b) {
    const st = S(), k = U.pairKey(a, b), p = st.pairs[k]; if (!p) return null;
    if (k === 'hsiu|mira' && st.f.hsiuMira === 'couple') return '在一起了 💕';
    if (k === 'anson|pei' && st.f.ansonPei === 'couple') return '在一起了 💕';
    if (k === 'hsiu|mira' && K('hsiuSong')) return p.tension > 35 ? '常常鬥嘴（阿修暗戀米拉）' : '阿修暗戀米拉';
    if (k === 'anson|pei' && K('ansonPei')) return '安森一直默默喜歡小沛';
    if (k === 'hsiu|lele' && st.f.leleStay === 'hsiu') return p.tension > 30 ? '借住中，有點尷尬' : '借住中，意外合拍';
    if (p.tension > 35) return '常常鬥嘴';
    if (p.friend > 70) return '很要好';
    if (p.friend < 35) return '有點疏遠';
    return null;
  };

  // ---------- layered deep talks (unlock with friendship & trust) ----------
  SW.HEART = {
    mira: [
      { ok: (s) => s.rel.mira.friend >= 50, run: async () => {
        await say('mira', '我進公司三年了。三年，我測了大概四千個 bug。');
        await say('mira', '你知道最好笑的是什麼嗎？我記得每一個 bug 的編號，但我記不得上一次放假去了哪裡。');
        const c = await choose([{ t: '「那你想去哪裡？」', v: 1 }, { t: '「你很厲害啊。」', v: 2 }]);
        if (c === 1) { await say('mira', '……很遠的地方。遠到網路很慢的地方。'); Sys.ch('mira', { trust: 3 }, true); }
        else { await say('mira', '厲害沒有用。厲害只是讓你被留得更久。'); }
      } },
      { ok: (s) => s.rel.mira.trust >= 55 && s.rel.mira.friend >= 55, hint: '（米拉好像想說什麼，又吞回去。也許她需要更信任你。）', run: async () => {
        await say('mira', '我小時候想當攝影師。……不要笑。');
        await say('mira', '我爸說那不是工作。所以我就來做「找別人錯誤」的工作。很諷刺吧。');
        const c = await choose([{ t: '「現在開始也不晚。」', v: 1 }, { t: '「你找錯誤的眼光，其實跟攝影師很像。」', v: 2 }, { t: '「你爸說得也沒錯啦。」', v: 3 }]);
        if (c === 2) { await narr('米拉愣住了。'); await say('mira', '……沒有人這樣說過。'); Sys.ch('mira', { comfort: 5, trust: 3 }); }
        else if (c === 1) { await say('mira', '……也許吧。'); Sys.ch('mira', { trust: 2 }, true); }
        else { await say('mira', '嗯。大家都這樣說。'); Sys.ch('mira', { tension: 3 }, true); }
      } },
      { ok: (s) => s.rel.mira.trust >= 62, hint: '（你覺得米拉心裡壓著一件很大的事。她還不夠信任你說出口。）', run: async () => {
        const st = S();
        await say('mira', '我跟你說一件事，但你不能跟任何人說。');
        await say('mira', '我申請上了澳洲打工度假。簽證下來了。');
        await say('mira', '我要在這週日前決定，要不要遞辭呈。');
        Sys.learn('player', 'holiday', 'mira'); st.f.trust_holiday = true;
        const c = await choose([{ t: '「去吧。你值得看看不一樣的天空。」', v: 'go' }, { t: '「你確定嗎？這裡的一切怎麼辦？」', v: 'stay' }, { t: '「……你走了，我會很想你。」', v: 'miss' }]);
        st.f.miraAdvice = c;
        if (c === 'go') await say('mira', '……你是第一個叫我去的人。大家都叫我想清楚。');
        else if (c === 'stay') await say('mira', '對啊。我也一直在想這個。');
        else { await say('mira', '……笨蛋。'); Sys.ch('mira', { attract: 4 }, true); }
        Sys.mem('mira', '米拉把澳洲簽證的秘密告訴了你', 1, 'holidaySecret');
      } },
      { ok: (s) => s.rel.mira.trust >= 68 && s.rel.mira.friend >= 66 && s.f.hsiuMira !== 'couple', hint: '（米拉看著窗外，好像在想某個人。）', run: async () => {
        await say('mira', '我問你。');
        await say('mira', '如果有一個人，很笨拙地對你好，每天都跟你吵架，但會偷偷幫你改 parser……');
        await say('mira', '你要怎麼知道，那是真的？');
        const c = await choose([{ t: '「你在說阿修吧？」', v: 1 }, { t: '「也許你不需要知道，只需要給他一個機會。」', v: 2 }]);
        if (c === 1) { await say('mira', '……我什麼都沒說。'); await narr('但她沒有否認。'); }
        else await say('mira', '……機會啊。');
        Sys.pch('hsiu', 'mira', { attract: 6, tension: -4 });
      } },
    ],
    hsiu: [
      { ok: (s) => s.rel.hsiu.friend >= 45, run: async () => {
        await say('hsiu', '你知道我為什麼那麼愛爭嗎？');
        await say('hsiu', '我爸從來沒說過我做得好。考九十八分，他問我那兩分去哪了。');
        const c = await choose([{ t: '「你真的做得很好。」', v: 1 }, { t: '「所以你把每個 code review 都當期末考。」', v: 2 }]);
        if (c === 1) { await narr('阿修沉默了很久。'); await say('hsiu', '……你不要突然這樣講啦。'); Sys.ch('hsiu', { friend: 5, trust: 3 }); }
        else { await say('hsiu', '……哈。對。每一次都是。'); Sys.ch('hsiu', { comfort: 4 }, true); }
      } },
      { ok: (s) => s.rel.hsiu.friend >= 55 && s.rel.hsiu.trust >= 45, hint: '（阿修好像有心事。他還不太確定能不能信任你。）', run: async () => {
        const st = S();
        await say('hsiu', '我問你喔。');
        await say('hsiu', '如果你喜歡一個人，可是你們每天都在吵架，那……還有希望嗎？');
        await say('hsiu', '不是我。是我朋友。');
        const c = await choose([{ t: '「是米拉吧？」', v: 1 }, { t: '「吵架也是一種在乎。」', v: 2 }]);
        if (c === 1) {
          await narr('阿修的臉從脖子紅到耳朵。');
          await say('hsiu', '……你不能說出去。我、我在練一首歌。週五要唱給她聽。');
          Sys.learn('player', 'hsiuSong', 'hsiu'); st.f.trust_hsiuSong = true;
          Sys.mem('hsiu', '阿修把喜歡米拉的秘密告訴了你', 1, 'hsiuSecret');
        } else { await say('hsiu', '……在乎。嗯。'); Sys.pch('hsiu', 'mira', { attract: 2 }); }
      } },
      { ok: (s) => s.rel.hsiu.trust >= 58, hint: '（阿修還沒準備好跟你說真心話。）', run: async () => {
        const st = S();
        await say('hsiu', 'Feature Owner 那個位子，我其實很想要。');
        await say('hsiu', '不是為了錢。是我想要有一次，有人選我。');
        const c = await choose([{ t: '「那你去爭取。我支持你。」', v: 'yield' }, { t: '「我也想要。我們公平競爭。」', v: 'fair' }, { t: '「你需要的不是位子，是有人跟你說你很重要。」', v: 'heart' }]);
        if (c === 'yield') { st.f.hsiuSupport = true; st.work.hsiuScore += 6; await say('hsiu', '……謝了。我欠你一次。'); Sys.ch('hsiu', { friend: 5, trust: 4 }); }
        else if (c === 'fair') { await say('hsiu', '好。這樣才有意思。'); Sys.ch('hsiu', { trust: 4, comfort: 2 }); }
        else { await say('hsiu', '……你很重要。我是說，你這句話很重要。'); Sys.ch('hsiu', { friend: 6 }); }
      } },
    ],
    pei: [
      { ok: (s) => s.rel.pei.friend >= 50, run: async () => {
        await say('pei', '我外婆以前在這條街賣豆花。');
        await say('pei', '我頂下這間店的時候想說，這條街總要有一個地方，讓人可以坐下來。');
        await say('pei', '不用點很貴的東西，不用趕時間。就坐著。');
        Sys.ch('pei', { comfort: 3 }, true);
      } },
      { ok: (s) => s.rel.pei.trust >= 54 && s.cafe.outcome === null, hint: '（小沛的笑容底下好像藏著什麼。她還沒準備好說。）', run: async () => {
        const st = S();
        if (K('lease')) { await say('pei', '你早就知道了，對吧？'); await say('pei', '……謝謝你沒有說破。'); }
        else {
          await say('pei', '你可以……不要跟別人說嗎？');
          await say('pei', '房東要漲租，加上押金，我週日前要湊十五萬。');
          await say('pei', '我不想讓大家覺得我在討拍。');
          Sys.learn('player', 'lease', 'pei'); st.f.trust_lease = true;
        }
        const c = await choose([{ t: '「你想要我怎麼幫你？」', v: 'ask' }, { t: '「我們一起募資！我去找大家！」', v: 'rush' }, { t: '「也許……該接受現實？」', v: 'real' }]);
        if (c === 'ask') { await say('pei', '……你是第一個問我「想要」怎麼幫的人。'); await say('pei', '我想要……先不要被可憐。然後，如果真的要結束，我想自己決定怎麼結束。'); st.cafe.will += 10; Sys.ch('pei', { trust: 6 }); }
        else if (c === 'rush') { await say('pei', '等、等一下……我還沒準備好讓大家知道。'); st.cafe.will += 2; Sys.ch('pei', { comfort: -2 }, true); }
        else { await say('pei', '……嗯。我也這樣想過。'); st.cafe.will -= 6; }
        Sys.mem('pei', '小沛向你坦承了咖啡廳的租約危機', 1, 'leaseSecret');
      } },
      { ok: (s) => s.rel.pei.friend >= 60, hint: '（小沛還有一些話，只會跟很親近的人說。）', run: async () => {
        const st = S();
        await say('pei', '我其實很怕。');
        await say('pei', '不是怕關店。是怕關了店，我就不知道我是誰了。我一直是「轉角的小沛」。');
        const c = await choose([{ t: '「你是會唱歌的小沛。」', v: 1 }, { t: '「不管店在不在，你都是我們的中心。」', v: 2 }, { t: '「讓店成為你的一部分，不是全部。」', v: 3 }]);
        await say('pei', c === 1 ? '……對。我還會唱歌。（她笑了，這次是真的）' : c === 2 ? '你這樣講我會哭喔。' : '一部分……嗯。我喜歡這個說法。');
        st.cafe.will += 5; st.f.peiIdentity = c; Sys.ch('pei', { trust: 4, comfort: 4 });
      } },
      { ok: (s) => s.rel.pei.friend >= 68 && s.rel.pei.attract >= 40, hint: '（小沛看你的眼神，好像有什麼想說。）', run: async () => {
        await say('pei', '你知道嗎？每次你走進來，我都會不自覺地多拉一次花。');
        await say('pei', '……我是說，你的拿鐵都特別好看，對吧？');
        Sys.ch('pei', { attract: 5 });
      } },
    ],
    anson: [
      { ok: (s) => s.rel.anson.friend >= 45, run: async () => {
        await say('anson', '我教國中三年了。每天都覺得自己在救火。');
        await say('anson', '學生的、家長的、教會的……我好像一間二十四小時營業的便利商店。');
        Sys.ch('anson', { comfort: 3 }, true);
      } },
      { ok: (s) => s.rel.anson.trust >= 54, hint: '（安森總是說「我沒事」。他還沒準備好讓你看見他的累。）', run: async () => {
        const st = S();
        await say('anson', '說實話……我已經兩週沒好好睡了。');
        await say('anson', '可是每個人找我，我都覺得不能說不。如果我說不，我還有價值嗎？');
        Sys.learn('player', 'ansonTired', 'anson');
        const c = await choose([{ t: '「你的價值，不是你做了多少。」', v: 1 }, { t: '「那我幫你分擔一些。」', v: 2 }, { t: '「你要學會拒絕。」', v: 3 }]);
        if (c === 1) { await say('anson', '……這句話，我常常對學生說。原來聽的人是這種感覺。'); st.f.ansonCare = (st.f.ansonCare || 0) + 1; Sys.ch('anson', { trust: 5 }); }
        else if (c === 2) { await say('anson', '謝謝你。週五教會的愛宴……如果你能來幫忙，我會很感激。'); st.f.ansonAsked = true; Sys.npcCh('anson', { energy: 8 }); }
        else { await say('anson', '我知道。只是，好難。'); st.f.ansonCare = (st.f.ansonCare || 0) + 1; }
        Sys.mem('anson', '安森承認自己快撐不住了', 1, 'ansonOpen');
      } },
      { ok: (s) => s.rel.anson.trust >= 60, hint: '（安森的信仰裡有一些掙扎，他只會跟真正信任的人說。）', run: async () => {
        await say('anson', '有時候我禱告，覺得天花板好低。話好像都撞到天花板就掉下來了。');
        await say('anson', '我還是相信。只是信仰有時候比較像走夜路。');
        const c = await choose([{ t: '「我不太懂信仰，但我懂走夜路。」', v: 1 }, { t: '「也許你可以停下來，不用一直走。」', v: 2 }, { t: '（安靜地陪他坐著）', v: 3 }]);
        await say('anson', c === 3 ? '……謝謝你沒有急著給我答案。' : c === 2 ? '停下來……嗯。週四的小組主題就是「安息」。我自己都做不到。' : '那我們就一起走一段吧。');
        Sys.ch('anson', { comfort: 5, trust: 3 });
      } },
      { ok: (s) => s.rel.anson.friend >= 66, hint: '（安森好像有一個藏了很久的心事。）', run: async () => {
        const st = S();
        await say('anson', '你覺得……如果一個人總是在照顧別人，他有資格說他喜歡誰嗎？');
        const c = await choose([{ t: '「當然有。」', v: 1 }, { t: '「是小沛吧？」', v: 2 }]);
        if (c === 2) { await narr('安森的耳朵紅了。他沒有否認。'); Sys.learn('player', 'ansonPei', 'anson'); st.f.trust_ansonPei = true; }
        await say('anson', '……也許等這週過去，我會試著說說看。');
        st.f.ansonBrave = true;
      } },
    ],
    lele: [
      { ok: (s) => s.rel.lele.friend >= 45, run: async () => {
        await say('lele', '你知道我為什麼那麼常談戀愛嗎？');
        await say('lele', '因為我很怕回家的時候，房子是暗的。');
        Sys.ch('lele', { comfort: 4, trust: 2 }, true);
      } },
      { ok: (s) => s.rel.lele.trust >= 44 && !!s.f.leleBrokeUp, hint: '（樂樂今天的笑話特別多。也許她需要的不是笑話。）', run: async () => {
        const st = S();
        await say('lele', '阿哲說，跟我在一起很累。因為我需要很多很多的愛。');
        await say('lele', '……我是不是一個很麻煩的人？');
        const c = await choose([{ t: '「你不麻煩。你只是很真。」', v: 1 }, { t: '「也許你可以先多愛自己一點。」', v: 2 }, { t: '「他不懂你。」', v: 3 }]);
        if (c === 2) { await say('lele', '……愛自己。聽起來好像勵志書喔。'); await say('lele', '但我會想一想。'); st.f.leleGrowth = (st.f.leleGrowth || 0) + 1; }
        else if (c === 1) { await say('lele', '很真……你這樣講，我覺得我可以再相信自己一點。'); Sys.ch('lele', { trust: 4 }); }
        else { await say('lele', '對！他不懂！……可是我也不太懂我自己。'); }
      } },
      { ok: (s) => s.rel.lele.friend >= 58 && (s.f.leleGrowth || 0) >= 1, hint: '（樂樂好像在想一個很重要的決定。）', run: async () => {
        const st = S();
        await say('lele', '我決定了。我要搬去一個人住。');
        await say('lele', '不是因為我不怕。是因為我想試試看，一個人的房子是不是真的那麼可怕。');
        st.f.leleIndependent = true;
        Sys.mem('lele', '樂樂決定搬出去一個人住', 1, 'leleAlone');
      } },
    ],
    kai: [
      { ok: (s) => s.rel.kai.attract >= 15, run: async () => { await say('kai', '我以前也在科技公司上班。'); await say('kai', '有一天在無塵室裡，我突然想不起來外面的天空是什麼顏色。隔週我就離職了。'); } },
      { ok: (s) => s.rel.kai.attract >= 30, run: async () => { await say('kai', '我拍照是因為我記性不好。'); await say('kai', '我怕我會忘記那些讓我想停下來的時刻。……今天我會記得。'); Sys.ch('kai', { attract: 3 }, true); } },
    ],
    yuna: [
      { ok: (s) => s.rel.yuna.attract >= 15, run: async () => { await say('yuna', '我當獸醫，是因為小時候養的狗走了，我什麼都不能做。'); await say('yuna', '現在至少，我能做點什麼。'); } },
      { ok: (s) => s.rel.yuna.attract >= 30, run: async () => { await say('yuna', '我很直接，因為我沒時間繞圈子。'); await say('yuna', '動物不會等你想清楚才生病。人也是。'); Sys.ch('yuna', { attract: 3 }, true); } },
    ],
  };

  // phone reply sets for dating matches
  SW.R.kai_hi = [{ t: '「對！你也常去河堤？」', fn: () => { Sys.ch('kai', { attract: 4, comfort: 4 }, true); Sys.msgLater(3, 'kai', 'kai', '常去。要不要哪天一起去看夕陽？你可以從「訊息 → 約對方」約我。'); } }, { t: '「你的自介很像詩。」', fn: () => { Sys.ch('kai', { attract: 6 }, true); Sys.msgLater(3, 'kai', 'kai', '哈，被發現我是文青了。改天見個面？'); } }];
  SW.R.yuna_hi = [{ t: '「沒關係，救貓咪比較重要。」', fn: () => { Sys.ch('yuna', { attract: 6, comfort: 4 }, true); Sys.msgLater(3, 'yuna', 'yuna', '你很上道。要不要約吃飯？好日子餐酒館的炸物很好吃。'); } }, { t: '「那我們約平日？」', fn: () => { Sys.ch('yuna', { attract: 3, comfort: 3 }, true); Sys.msgLater(3, 'yuna', 'yuna', '平日晚上可以！約吧。'); } }];
})(window.SW);
