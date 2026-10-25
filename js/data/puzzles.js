'use strict';
(function (SW) {
  // Fictional, simplified SSD firmware bugs. No real company code or unreleased technology.
  SW.PUZZLES = {
    ps4wake: {
      title: 'Bug #4521：從低功耗喚醒後偶爾讀不到資料', short: 'Bug #4521',
      desc: '客戶回報：筆電闔上一整晚，打開後 SSD 有 3% 機率讀取逾時。你拿到一份喚醒過程的 log。',
      logs: ['[00.000] PS4 → PS0 喚醒請求', '[00.002] PLL 時脈開始重新上鎖', '[00.003] NAND 控制器恢復，開始讀 L2P 表', '[00.009] PLL 時脈上鎖完成', '[00.011] L2P 讀取 CRC 錯誤，重試 3 次', '[00.250] Host 讀取逾時'],
      badLog: 2,
      code: ['void ps4_exit(void) {', '    pll_relock_start();', '    pll_wait_locked_async(); // 加速喚醒', '    nand_ctrl_resume();', '    l2p_load_from_nand();', '}'],
      badCode: 2,
      fixes: [{ t: '把 L2P 讀取重試從 3 次加到 10 次' }, { t: '改成同步等待時脈上鎖，再恢復 NAND 控制器', ok: true }, { t: '把 Host 逾時從 250ms 拉長到 1 秒' }],
      explain: '時脈還沒穩定就去讀 NAND，資料當然會壞。為了「加速喚醒」省下的 6ms，換來 3% 的客訴。',
    },
    wearlevel: {
      title: 'Bug #4533：磨損平均把不存在的 block 操爆', short: 'Bug #4533',
      desc: '耐久測試跑到第三天，保留區莫名其妙被寫滿。看看磨損平均（Wear Leveling）的 log。',
      logs: ['WL: 掃描 block 0~1023 抹寫次數', 'WL: 最少抹寫 block = 17 (count=210)', 'WL: 搬移 hot data → block 17', 'WL: block 1024 count=0 → 加入候選', 'WL: 搬移 hot data → block 1024', 'NAND: 位址超出範圍，寫入保留區'],
      badLog: 3,
      code: ['for (i = 0; i <= BLOCK_COUNT; i++) {', '    if (erase_cnt[i] < min_cnt) {', '        min_cnt = erase_cnt[i];', '        min_blk = i;', '    }', '}'],
      badCode: 0,
      fixes: [{ t: '把 erase_cnt 陣列加大一格' }, { t: '迴圈條件改成 i < BLOCK_COUNT', ok: true }, { t: '每次挑選前隨機打亂 block 順序' }],
      explain: '經典 off-by-one。陣列外那一格剛好是 0，演算法一直覺得它「最少被用過」。',
    },
    trim: {
      title: 'Bug #4540：TRIM 之後，下一個檔案開頭不見了', short: 'Bug #4540',
      desc: '使用者刪掉一個檔案後，旁邊另一個檔案的標頭壞了。看看 TRIM 的處理流程。',
      logs: ['HOST: TRIM LBA 1000，長度 8', 'FTL: 標記無效 LBA 1000~1008', 'GC: 回收 block 中的無效頁', 'HOST: 讀取 LBA 1008', 'FTL: LBA 1008 無對應，回傳全 0'],
      badLog: 1,
      code: ['void trim(lba_t start, u32 len) {', '    lba_t end = start + len;   // 不包含 end', '    for (lba_t l = start; l <= end; l++)', '        l2p_invalidate(l);', '}'],
      badCode: 2,
      fixes: [{ t: '迴圈改成 l < end', ok: true }, { t: 'GC 的時候跳過 LBA 1008' }, { t: '要求 Host 不要 TRIM 偶數長度' }],
      explain: '註解寫「不包含 end」，迴圈卻用 <=。註解和程式碼吵架的時候，通常程式碼贏，客戶輸。',
    },
    thermal: {
      title: 'Bug #4547：SSD 在 40 度就開始降速', short: 'Bug #4547',
      desc: '冷氣房裡的測試機，寫入速度卻掉到四分之一。看看溫控（Thermal Throttling）的 log。',
      logs: ['THERM: 感測器 raw=3132（單位 0.1K）', 'THERM: temp = 313', 'THERM: 門檻 THERM_LIMIT_C = 70', 'THERM: 313 > 70 → 降速 Level 3', 'PERF: 寫入速度 3200 → 800 MB/s'],
      badLog: 3,
      code: ['u16 raw = therm_read();', 'u16 temp = raw / 10;           // 單位：K', 'if (temp > THERM_LIMIT_C)      // 單位：°C', '    throttle(LEVEL_3);'],
      badCode: 2,
      fixes: [{ t: '先轉成攝氏再比較：temp = raw / 10 - 273', ok: true }, { t: '把 THERM_LIMIT_C 改成 700' }, { t: '關掉 Level 3 降速' }],
      explain: '開爾文跟攝氏差了 273 度。SSD 在冷氣房裡以為自己在火爐。',
    },
    gc: {
      title: 'Bug #4561：GC 跟主機寫入撞在一起，讀到舊資料', short: 'Bug #4561',
      desc: '壓力測試偶發：剛寫進去的資料，讀出來卻是舊的。看看垃圾回收（GC）的 log。',
      logs: ['GC: 開始搬移 block 88 的有效頁', 'HOST: 寫入 LBA 7777', 'FTL: 更新 L2P[7777] → block 120', 'GC: 搬移完成，更新 L2P[7777] → block 201', 'HOST: 讀取 LBA 7777 → 舊資料'],
      badLog: 3,
      code: ['void gc_move_page(page_t *p) {', '    copy_page(p, new_blk);', '    l2p_set(p->lba, new_blk);', '}'],
      badCode: 2,
      fixes: [{ t: '更新前確認 L2P 仍指向舊位置才覆蓋（compare-and-swap）', ok: true }, { t: 'GC 期間暫停所有主機寫入' }, { t: '把 GC 改到半夜才跑' }],
      explain: 'GC 搬完資料時，主機早就寫了新的。沒先確認就覆蓋對照表，等於把新資料丟進垃圾桶。',
    },
    release: {
      title: 'Release Blocker #4555：斷電後最後一筆資料遺失', short: 'Blocker #4555',
      desc: 'FW 2.3 今晚要出。斷電測試第 97 次失敗：Host 以為寫完的資料，重開機後不見了。',
      logs: ['HOST: WRITE LBA 5000', 'FW: 資料寫入 DRAM cache，回報完成', 'PWR: 偵測到斷電（電容剩 8ms）', 'FW: 寫入除錯 log 到 NAND（耗時 6ms）', 'FW: 開始 flush cache…剩 2ms', 'FW: flush 未完成，資料遺失'],
      badLog: 3,
      code: ['void on_power_loss(void) {', '    dump_debug_log();', '    flush_write_cache();', '    save_l2p_delta();', '}'],
      badCode: 1,
      fixes: [{ t: '把電容換成更大顆' }, { t: '先 flush cache 和 L2P，最後有剩電才寫 debug log', ok: true }, { t: '直接關閉 write cache' }],
      explain: '斷電時的每一毫秒都是跟電容借來的。先救使用者的資料，再救自己的 log。',
    },
    badblock: {
      title: 'Bug #4570：壞塊表滿了之後直接當機', short: 'Bug #4570',
      desc: '老化測試的機台在第 64 個壞塊出現時 HardFault。',
      logs: ['BBT: 新增壞塊 #63', 'BBT: 目前壞塊數 63/64', 'BBT: 新增壞塊 #64', 'BBT: 寫入 bbt[64]', 'FW: HardFault @ 0x0800_1A2C'],
      badLog: 3,
      code: ['if (bbt_count > BBT_MAX)', '    return ERR_BBT_FULL;', 'bbt[bbt_count] = blk;', 'bbt_count++;'],
      badCode: 0,
      fixes: [{ t: '條件改成 bbt_count >= BBT_MAX', ok: true }, { t: '把 BBT_MAX 加到 65' }, { t: '當機時自動重開機' }],
      explain: '陣列有 64 格，索引只到 63。差一個等號，差一台當機的 SSD。',
    },
    smart: {
      title: 'Bug #4578：SMART 健康度永遠顯示 100%', short: 'Bug #4578',
      desc: '用了兩年的測試碟，健康度還是 100%。QA 覺得這個 SSD 在說謊。',
      logs: ['SMART: 平均抹寫次數 = 1500', 'SMART: 額定抹寫次數 = 3000', 'SMART: 已用壽命 = 0%', 'SMART: 健康度 = 100%'],
      badLog: 2,
      code: ['u32 used = avg_erase / rated_erase * 100;', 'u32 health = 100 - used;', 'smart_report(health);'],
      badCode: 0,
      fixes: [{ t: '先乘再除：avg_erase * 100 / rated_erase', ok: true }, { t: '改用浮點數計算' }, { t: '健康度最低顯示 1%' }],
      explain: '整數除法：1500 / 3000 = 0。先乘 100 再除，才會得到 50。很多「永遠健康」的 SSD 就是這樣來的。（而且這顆 MCU 沒有浮點運算單元。）',
    },
  };

  const DAILY = { 1: 'ps4wake', 2: 'wearlevel', 3: 'trim', 4: 'thermal', 5: 'gc' };
  const CYCLE = ['badblock', 'smart', 'wearlevel', 'trim', 'gc', 'thermal'];
  SW.Puzzles = {
    today() {
      const d = SW.T.day(); if (SW.T.weekend()) return null;
      const id = DAILY[d] || CYCLE[(d - 8 + CYCLE.length * 10) % CYCLE.length];
      if (SW.S.work.bugsDone.includes(id) && SW.S.work.bugsDone.filter((b) => b === id).length >= Math.ceil(d / 7)) return null;
      return Object.assign({ id }, SW.PUZZLES[id]);
    },
    forHelp(who) {
      const pool = who === 'mira' ? ['smart', 'badblock', 'thermal'] : ['gc', 'trim', 'wearlevel'];
      const used = SW.S.f['helpPz_' + who] || [];
      const id = pool.find((p) => !used.includes(p)) || SW.U.pick(pool);
      SW.S.f['helpPz_' + who] = used.concat(id);
      return id;
    },
  };
})(window.SW);
