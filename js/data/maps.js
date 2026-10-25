'use strict';
(function (SW) {
  // Interior maps: ASCII walls ('#'), floor ('.'), exit door ('D'). Objects are separate rectangles.
  // Object kinds map to interaction handlers in sys.js; kind 'decor' is drawn but never offered as a button.
  const O = (id, x, y, w, h, kind, label, icon, extra) => Object.assign({ id, x, y, w, h, kind, label, icon }, extra || {});

  const MAPS = SW.MAPDEF = {};

  MAPS.office = {
    name: '矽藍科技', floor: ['#cfd8db', '#c6d0d4'], wall: '#56656e', light: true,
    ascii: [
      '########################',
      '#......#.......#.......#',
      '#......#.......#.......#',
      '#......#.......#.......#',
      '#......#.......#.......#',
      '###.#######.#######.####',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#####.#####............#',
      '#.........#............#',
      '#.........#............#',
      '#.........#............#',
      '#################D######',
    ],
    rooms: [
      { x: 1, y: 1, w: 6, h: 4, label: '主管辦公室', floor: '#d9d3c4' },
      { x: 8, y: 1, w: 7, h: 4, label: '會議室', floor: '#d2dbe0' },
      { x: 16, y: 1, w: 7, h: 4, label: '實驗室', floor: '#dfe5e6' },
      { x: 1, y: 12, w: 9, h: 3, label: '茶水間', floor: '#e5dccb' },
      { x: 11, y: 12, w: 12, h: 3, label: '大廳', floor: '#d6dcde' },
    ],
    objects: [
      O('bossDesk', 2, 2, 3, 1, 'decor', '主管辦公桌', '📁', { color: '#8a6a4a' }),
      O('bossPlant', 6, 1, 1, 1, 'decor', '', '🪴', { color: '#6a8f5a' }),
      O('meetTable', 9, 2, 5, 1, 'meeting', '會議桌', '📋', { color: '#a7845f' }),
      O('whiteboard', 10, 1, 3, 1, 'decor', '白板', '🧾', { color: '#f2f4f4' }),
      O('testBench', 17, 2, 4, 1, 'testbench', '測試機台', '🧪', { color: '#7f8f99' }),
      O('rack', 21, 1, 1, 2, 'decor', '', '🗄️', { color: '#3f4a52' }),
      O('myDesk', 2, 7, 2, 1, 'mydesk', '你的座位', '💻', { color: '#b88f63' }),
      O('miraDeskObj', 6, 7, 2, 1, 'deskMira', '米拉的座位', '🖥️', { color: '#b88f63' }),
      O('hsiuDeskObj', 10, 7, 2, 1, 'deskHsiu', '阿修的座位', '🖥️', { color: '#b88f63' }),
      O('d4', 14, 7, 2, 1, 'decor', '', '🖥️', { color: '#b88f63' }),
      O('d5', 18, 7, 2, 1, 'decor', '', '🖥️', { color: '#b88f63' }),
      O('d6', 2, 9, 2, 1, 'decor', '', '🖥️', { color: '#b88f63' }),
      O('d7', 6, 9, 2, 1, 'decor', '', '📚', { color: '#b88f63' }),
      O('d8', 10, 9, 2, 1, 'decor', '', '🖥️', { color: '#b88f63' }),
      O('d9', 14, 9, 2, 1, 'decor', '', '🖥️', { color: '#b88f63' }),
      O('d10', 18, 9, 2, 1, 'decor', '', '🪴', { color: '#b88f63' }),
      O('coffeeMachine', 1, 12, 1, 1, 'coffeeMachine', '咖啡機', '☕', { color: '#4b4f55' }),
      O('microwave', 3, 12, 1, 1, 'microwave', '微波爐', '♨️', { color: '#d7dadc' }),
      O('officeFridge', 8, 12, 1, 1, 'officeFridge', '公司冰箱', '🧊', { color: '#e9eef0' }),
      O('teaSofa', 2, 14, 3, 1, 'officeSofa', '茶水間沙發', '🛋️', { color: '#7d8fa3' }),
      O('teaTable', 6, 13, 2, 1, 'decor', '', '🍵', { color: '#c4a77f' }),
      O('officeBoard', 12, 12, 2, 1, 'officeBoard', '公告欄', '📌', { color: '#c79a5a' }),
      O('lobbyPlant', 22, 12, 1, 1, 'decor', '', '🪴', { color: '#6a8f5a' }),
    ],
    spots: { boss: [3, 3], meet1: [9, 3], meet2: [12, 3], lab: [18, 3], lab2: [20, 3], miraDesk: [7, 8], hsiuDesk: [11, 8], myChair: [3, 8], tea1: [6, 12], tea2: [7, 14], lobby: [15, 13], entry: [17, 14] },
  };

  const HOME_SOLO = {
    name: '你的套房', floor: ['#d8b98e', '#d2b287'], wall: '#7d6a58', light: true,
    ascii: [
      '##############',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '######D#######',
    ],
    rooms: [],
    objects: [
      O('bed', 1, 1, 2, 2, 'bed', '床', '🛏️', { color: '#8fa9c7' }),
      O('wardrobe', 4, 1, 1, 1, 'wardrobe', '衣櫃', '👕', { color: '#a07a55' }),
      O('homeDesk', 6, 1, 2, 1, 'homeDesk', '書桌', '💻', { color: '#a9835b' }),
      O('kitchen', 9, 1, 2, 1, 'kitchen', '廚房', '🍳', { color: '#c9ccc9' }),
      O('fridge', 12, 1, 1, 1, 'fridge', '冰箱', '🧊', { color: '#eef2f2' }),
      O('sofa', 2, 6, 3, 1, 'sofa', '沙發', '🛋️', { color: '#d07a5a' }),
      O('tv', 2, 8, 3, 1, 'decor', '', '📺', { color: '#33393f' }),
      O('guitar', 11, 6, 1, 1, 'guitar', '電吉他', '🎸', { color: '#c0392b' }),
      O('plantH', 12, 8, 1, 1, 'decor', '', '🪴', { color: '#6a8f5a' }),
    ],
    spots: { kitchen: [9, 2], sofa: [3, 7], bed: [3, 3], center: [6, 4], roomMate: [8, 4], entry: [6, 8] },
  };

  const HOME_SHARED = {
    name: '合租公寓', floor: ['#d8b98e', '#d2b287'], wall: '#7d6a58', light: true,
    ascii: [
      '##################',
      '#.....#....#.....#',
      '#.....#....#.....#',
      '#.....#....#.....#',
      '###.###....###.###',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '########D#########',
    ],
    rooms: [
      { x: 1, y: 1, w: 5, h: 3, label: '你的房間', floor: '#cfd9e0' },
      { x: 12, y: 1, w: 5, h: 3, label: '室友房間', floor: '#e2d3df' },
      { x: 7, y: 1, w: 4, h: 3, label: '廚房', floor: '#e1e1d8' },
    ],
    objects: [
      O('bed', 1, 1, 2, 2, 'bed', '床', '🛏️', { color: '#8fa9c7' }),
      O('homeDesk', 4, 1, 2, 1, 'homeDesk', '書桌', '💻', { color: '#a9835b' }),
      O('wardrobe', 5, 3, 1, 1, 'wardrobe', '衣櫃', '👕', { color: '#a07a55' }),
      O('kitchen', 7, 1, 3, 1, 'kitchen', '廚房', '🍳', { color: '#c9ccc9' }),
      O('fridge', 10, 1, 1, 1, 'fridge', '冰箱', '🧊', { color: '#eef2f2' }),
      O('rmBed', 15, 1, 2, 2, 'decor', '', '🛏️', { color: '#c79ab5' }),
      O('rmDesk', 12, 1, 1, 1, 'decor', '', '📚', { color: '#a9835b' }),
      O('dining', 8, 6, 3, 2, 'dining', '餐桌', '🍽️', { color: '#b58a5c' }),
      O('sofa', 2, 8, 3, 1, 'sofa', '沙發', '🛋️', { color: '#d07a5a' }),
      O('tv', 2, 10, 3, 1, 'decor', '', '📺', { color: '#33393f' }),
      O('guitar', 15, 6, 1, 1, 'guitar', '電吉他', '🎸', { color: '#c0392b' }),
      O('shoes', 13, 10, 1, 1, 'decor', '', '👟', { color: '#a08a6a' }),
      O('plantS', 16, 10, 1, 1, 'decor', '', '🪴', { color: '#6a8f5a' }),
    ],
    spots: { kitchen: [8, 2], roomMate: [13, 2], sofa: [3, 9], dining: [9, 8], dining2: [11, 6], center: [8, 5], bed: [3, 3], entry: [8, 10] },
  };
  SW.HOME_LAYOUTS = { solo: HOME_SOLO, shared: HOME_SHARED };
  MAPS.home = HOME_SOLO; // replaced at load by housing mode

  MAPS.cafe = {
    name: '轉角咖啡廳', floor: ['#c99a6b', '#c2935f'], wall: '#5b3f2c', light: true,
    ascii: [
      '################',
      '#..........#...#',
      '#..........#...#',
      '#..........#...#',
      '#..........##.##',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#######D########',
    ],
    rooms: [{ x: 12, y: 1, w: 3, h: 3, label: '後台', floor: '#b9a58c' }],
    objects: [
      O('stage', 1, 1, 3, 2, 'stage', '小舞台', '🎤', { color: '#6b4a7a' }),
      O('counter', 5, 2, 5, 1, 'counter', '吧台', '☕', { color: '#7a5233' }),
      O('tableA', 2, 6, 2, 1, 'cafeTable', '座位', '🪑', { color: '#e0c39a' }),
      O('tableB', 6, 6, 2, 1, 'cafeTable', '座位', '🪑', { color: '#e0c39a' }),
      O('tableC', 10, 6, 2, 1, 'cafeTable', '座位', '🪑', { color: '#e0c39a' }),
      O('tableD', 2, 9, 2, 1, 'cafeTable', '座位', '🪑', { color: '#e0c39a' }),
      O('tableE', 10, 9, 2, 1, 'cafeTable', '座位', '🪑', { color: '#e0c39a' }),
      O('cafeBoard', 14, 7, 1, 1, 'cafeBoard', '布告欄', '📌', { color: '#c79a5a' }),
      O('cafePlant', 13, 10, 1, 1, 'decor', '', '🪴', { color: '#6a8f5a' }),
      O('peiDesk', 12, 1, 2, 1, 'peiDesk', '小沛的辦公桌', '🗂️', { color: '#8a6a4a' }),
      O('boxes', 14, 3, 1, 1, 'decor', '', '📦', { color: '#b08a5a' }),
    ],
    spots: { counter: [7, 1], stage: [2, 3], t1: [2, 7], t2: [6, 7], t3: [10, 7], t4: [2, 10], t5: [10, 10], t6: [6, 8], g1: [4, 7], g2: [8, 7], back: [13, 2], entry: [7, 10] },
  };

  MAPS.church = {
    name: '光鹽教會', floor: ['#e3dccd', '#dcd4c3'], wall: '#7b7468', light: true,
    ascii: [
      '##################',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '#######....#######',
      '#.....#....#.....#',
      '#................#',
      '#.....#....#.....#',
      '########D#########',
    ],
    rooms: [
      { x: 1, y: 10, w: 5, h: 3, label: '小組教室', floor: '#d6dfe0' },
      { x: 12, y: 10, w: 5, h: 3, label: '廚房', floor: '#e4e0d4' },
    ],
    objects: [
      O('pulpitObj', 7, 1, 4, 1, 'pulpit', '講台', '✝️', { color: '#9a7b56' }),
      O('piano', 2, 1, 2, 1, 'piano', '鋼琴', '🎹', { color: '#2b2b2b' }),
      O('pew1o', 2, 4, 5, 1, 'pew', '長椅', '🪑', { color: '#a3835e', face: 'n' }),
      O('pew2o', 11, 4, 5, 1, 'pew', '長椅', '🪑', { color: '#a3835e', face: 'n' }),
      O('pew3o', 2, 6, 5, 1, 'pew', '長椅', '🪑', { color: '#a3835e', face: 'n' }),
      O('pew4o', 11, 6, 5, 1, 'pew', '長椅', '🪑', { color: '#a3835e', face: 'n' }),
      O('churchBoard', 16, 8, 1, 1, 'churchBoard', '教會公告', '📌', { color: '#c79a5a' }),
      O('groupTable', 2, 11, 2, 1, 'groupTable', '小組桌', '📖', { color: '#b9936a' }),
      O('churchKitchen', 13, 10, 3, 1, 'churchKitchen', '教會廚房', '🍲', { color: '#c9ccc9' }),
    ],
    spots: { pulpit: [8, 2], pulpit2: [10, 2], pew1: [4, 5], pew2: [13, 5], pew3: [4, 7], pew4: [13, 7], group1: [2, 12], group2: [4, 10], group3: [1, 11], kitchen: [13, 11], kitchen2: [15, 12], entry: [8, 12] },
  };

  MAPS.gym = {
    name: '竹風健身房', floor: ['#59636c', '#545e66'], wall: '#2f363c', light: true,
    ascii: [
      '################',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#######D########',
    ],
    rooms: [],
    objects: [
      O('tread1', 1, 1, 2, 1, 'treadmill', '跑步機', '🏃', { color: '#2b2f33' }),
      O('tread2', 4, 1, 2, 1, 'treadmill', '跑步機', '🏃', { color: '#2b2f33' }),
      O('weightsO', 9, 1, 3, 1, 'weights', '重訓架', '🏋️', { color: '#8a8f94' }),
      O('mats', 10, 6, 3, 1, 'yoga', '瑜珈墊', '🧘', { color: '#5fa89b' }),
      O('gymCounter', 1, 6, 2, 1, 'gymCounter', '櫃檯', '🥤', { color: '#c25a3a', face: 's' }),
    ],
    spots: { coach: [3, 6], tread: [2, 2], tread2: [5, 2], weights: [10, 2], weights2: [12, 2], yoga: [11, 7], yoga2: [13, 7], center: [7, 5], entry: [7, 8] },
  };

  MAPS.bar = {
    name: '好日子餐酒館', floor: ['#7a5638', '#734f33'], wall: '#3b2a1f', light: true,
    ascii: [
      '################',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#######D########',
    ],
    rooms: [],
    objects: [
      O('barCounter', 2, 2, 6, 1, 'barCounter', '吧台', '🍸', { color: '#3e2a1c' }),
      O('jukebox', 14, 1, 1, 1, 'jukebox', '點唱機', '🎵', { color: '#b8433a' }),
      O('boothA', 11, 4, 3, 1, 'booth', '卡座', '🕯️', { color: '#8c2f3a' }),
      O('boothB', 11, 7, 3, 1, 'booth', '卡座', '🕯️', { color: '#8c2f3a' }),
      O('longTable', 3, 6, 5, 1, 'longTable', '長桌', '🍽️', { color: '#a7784c' }),
    ],
    spots: { tsai: [4, 1], stool1: [3, 3], stool2: [5, 3], stool3: [7, 3], booth1: [12, 5], booth1b: [13, 5], booth2: [12, 8], booth2b: [13, 8], long1: [3, 5], long2: [5, 5], long3: [7, 5], long4: [3, 7], long5: [5, 7], long6: [7, 7], entry: [7, 9] },
  };

  MAPS.studio = {
    name: '回聲音樂工作室', floor: ['#4d5562', '#48505c'], wall: '#262b33', light: true,
    ascii: [
      '##############',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '######D#######',
    ],
    rooms: [],
    objects: [
      O('drums', 1, 1, 2, 2, 'drums', '鼓組', '🥁', { color: '#8a2f2f' }),
      O('guitarRack', 5, 1, 2, 1, 'studioGuitar', '吉他架', '🎸', { color: '#6b4a2f' }),
      O('micStand', 8, 2, 1, 1, 'mic', '麥克風', '🎤', { color: '#2a2a2a' }),
      O('recBooth', 10, 1, 3, 2, 'recBooth', '錄音間', '🎧', { color: '#3b4d63' }),
      O('studioBoard', 12, 6, 1, 1, 'studioBoard', '預約表', '📅', { color: '#c79a5a' }),
      O('studioSofa', 1, 7, 3, 1, 'sofaStudio', '沙發', '🛋️', { color: '#7a5a8a' }),
    ],
    spots: { mic: [8, 3], guitar: [6, 2], drums: [3, 2], booth: [11, 3], sofa: [2, 6], center: [6, 5], entry: [6, 8] },
  };

  // ---------- City (1 tile = 1 m, built procedurally) ----------
  // Blocks: north side of 光復路 has the office, 轉角咖啡廳 (on the corner), church, gym and a basketball court.
  // South side has row-house shops facing the road, alleys, 竹光公寓, the convenience store, a 土地公廟,
  // 好日子餐酒館, the 東門夜市 lane and the music studio. 河堤路 and the 頭前溪 riverside park run along the bottom.
  const W = 120, H = 100;
  const BUILDINGS = SW.BUILDINGS = [
    { id: 'office', map: 'office', x: 8, y: 8, w: 26, h: 24, door: [20, 31], ht: 24, style: 'glass', sign: '矽藍科技 SiLan Tech', signColor: '#2f6f9c' },
    { id: 'cafe', map: 'cafe', x: 42, y: 30, w: 12, h: 11, door: [47, 40], ht: 7.5, style: 'cafe', sign: '轉角咖啡 Corner Café', signColor: '#8a4b2b' },
    { id: 'church', map: 'church', x: 72, y: 14, w: 18, h: 24, door: [80, 37], ht: 9, style: 'church', sign: '光鹽教會', signColor: '#5b5170', steeple: true },
    { id: 'gym', map: 'gym', x: 96, y: 22, w: 20, h: 16, door: [105, 37], ht: 8, style: 'gym', sign: '竹風健身 IRON BAMBOO', signColor: '#c25a3a' },
    { id: 'home', map: 'home', x: 4, y: 64, w: 16, h: 11, door: [11, 74], ht: 16, style: 'apartment', sign: '竹光公寓', signColor: '#3f6a4a' },
    { id: 'shop', map: null, x: 24, y: 65, w: 11, h: 10, door: [29, 74], ht: 4.5, style: 'shop', sign: '全家福超商', signColor: '#2f8f83', shop: true },
    { id: 'temple', map: null, x: 39, y: 64, w: 9, h: 7, door: [43, 70], ht: 4.2, style: 'temple', sign: '福德宮', signColor: '#b8322a', deco: true },
    { id: 'bar', map: 'bar', x: 69, y: 64, w: 15, h: 11, door: [76, 74], ht: 7, style: 'bar', sign: '好日子餐酒館', signColor: '#a34a2a' },
    { id: 'studio', map: 'studio', x: 101, y: 64, w: 15, h: 11, door: [108, 74], ht: 8, style: 'studio', sign: '回聲音樂 ECHO', signColor: '#5b4f9a' },
  ];
  // Taiwanese row houses (透天厝) that give the streets their texture. Not enterable; a couple of storefronts are interactive.
  const ROWS = SW.ROWHOUSES = [];
  const rowSigns = ['美而美早餐', '阿嬤機車行', '安心藥局', '狀元補習班', '大碗自助餐', '茶湯會社', '金好運彩券', '小林眼鏡', '永和豆漿', '老王牛肉麵', '快樂洗衣', '甜甜手搖', '新竹貢丸', '阿婆米粉', '鴻記五金', '好視力診所', '萊爾富', '幸福婚紗', '一品火鍋', '佳佳文具'];
  let sgn = 0;
  const rowRun = (x0, x1, y, h, face) => { let x = x0; while (x <= x1) { const w = Math.min(x1 - x + 1, 4 + ((x * 7) % 3)); ROWS.push({ x, y, w, h, face, floors: 3 + ((x * 5) % 3), sign: rowSigns[sgn++ % rowSigns.length], tint: (x * 13) % 5 }); x += w; } };
  rowRun(2, 20, 55, 7, 'n'); rowRun(24, 34, 55, 7, 'n'); rowRun(38, 54, 55, 7, 'n');
  rowRun(67, 85, 55, 7, 'n'); rowRun(99, 118, 55, 7, 'n');
  rowRun(0, 54, 0, 5, 's'); rowRun(67, 119, 0, 6, 's');
  // fixed names for the two interactive storefronts
  const rhAt = (x, y) => ROWS.find((r) => y >= r.y && y < r.y + r.h && x >= r.x && x < r.x + r.w);
  rhAt(8, 55).sign = '美而美早餐'; rhAt(47, 55).sign = '甜甜手搖';

  function buildCity() {
    const g = [];
    for (let y = 0; y < H; y++) g.push(new Array(W).fill('g'));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
    const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
    // river park + river
    fill(0, 86, W - 1, 91, 'k'); fill(0, 88, W - 1, 89, 'p'); fill(0, 92, W - 1, H - 1, 'w');
    // sidewalks then roads (roads overwrite at intersections)
    fill(0, 41, W - 1, 43, 's'); fill(0, 52, W - 1, 54, 's');
    fill(0, 75, W - 1, 77, 's'); fill(0, 84, W - 1, 85, 's');
    fill(55, 0, 57, 85, 's'); fill(64, 0, 66, 85, 's');
    fill(0, 44, W - 1, 51, 'r'); fill(0, 78, W - 1, 83, 'r'); fill(58, 0, 63, 85, 'r');
    // plazas, yards, lanes
    fill(4, 32, 41, 40, 'P'); fill(70, 38, 92, 40, 'P'); fill(94, 38, 117, 40, 'P');
    fill(38, 10, 53, 26, 'c');
    fill(21, 55, 23, 74, 'L'); fill(35, 55, 37, 74, 'L'); fill(2, 62, 54, 63, 'L');
    fill(67, 62, 118, 63, 'L'); fill(84, 64, 85, 74, 'L'); fill(98, 64, 100, 74, 'L');
    fill(38, 71, 48, 74, 'P'); fill(49, 64, 54, 74, 'P');
    fill(86, 55, 97, 74, 'm');
    // flower beds at the church
    for (const x of [74, 76, 84, 86]) set(x, 39, 'f');
    // buildings
    for (const r of ROWS) fill(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1, 'B');
    for (const b of BUILDINGS) { fill(b.x, b.y, b.x + b.w - 1, b.y + b.h - 1, 'B'); if (b.map) set(b.door[0], b.door[1], 'D'); }
    // trees: street trees in curb rows, park and yard trees
    const trees = [];
    for (let x = 3; x < W; x += 9) { trees.push([x, 43], [x + 4, 52]); }
    for (let x = 5; x < W; x += 8) trees.push([x, 86], [x + 3, 91]);
    trees.push([2, 33], [2, 37], [39, 31], [40, 35], [38, 28], [55 - 20, 28], [92, 30], [93, 18], [118, 30], [69, 20], [69, 30], [117, 12], [36, 6], [36, 20], [2, 12], [2, 22], [118, 60], [118, 70]);
    for (const [x, y] of trees) if (g[y] && (g[y][x] === 'g' || g[y][x] === 'k' || g[y][x] === 's')) set(x, y, 'T');
    return g.map((r) => r.join(''));
  }
  // parked scooters along the curbs (with gaps so you can always cross)
  const scooters = [];
  const curb = (x0, x1, y) => { for (let x = x0; x <= x1; x++) if ((x % 7) < 4) scooters.push([x, y]); };
  curb(2, 52, 43); curb(68, 116, 43); curb(2, 52, 52); curb(68, 116, 52); curb(2, 116, 77);
  SW.SCOOTERS = scooters;

  const ascii = buildCity();
  SW.SCOOTERS = scooters.filter(([x, y]) => ascii[y][x] === 's' && !(x >= 50 && x <= 53) && !(x >= 68 && x <= 71) && !(x >= 18 && x <= 22) && !(x >= 78 && x <= 82) && !(x >= 104 && x <= 108) && !(x >= 9 && x <= 13 && y === 77) && !(x >= 27 && x <= 31) && !(x >= 74 && x <= 78 && y === 77) && !(x >= 106 && x <= 110 && y === 77) && !(x >= 40 && x <= 44 && y === 77) && !(x >= 86 && x <= 97));
  const CAT = (id, x, y, name, coat) => O(id, x, y, 1, 1, 'cat', name, '🐈', { color: coat, cat: id });
  MAPS.city = {
    name: '光復生活圈', outdoor: true, w: W, h: H, ascii, rooms: [],
    objects: [
      O('busStop', 91, 41, 3, 1, 'busStop', '公車站', '🚏', { color: '#2f6f9c' }),
      O('ubike', 6, 38, 4, 1, 'ubike', 'YouBike 站', '🚲', { color: '#e8a33a' }),
      O('ubike2', 50, 76, 3, 1, 'ubike', 'YouBike 站', '🚲', { color: '#e8a33a' }),
      O('shopDoor', 29, 74, 1, 1, 'shop', '全家福超商', '🏪', { color: '#2f8f83', inBuilding: true }),
      O('breakfast', 8, 55, 1, 1, 'breakfast', '美而美早餐', '🥪', { color: '#f2b33d', inBuilding: true }),
      O('bobaShop', 47, 55, 1, 1, 'bobashop', '甜甜手搖', '🧋', { color: '#e46b7b', inBuilding: true }),
      O('bench1', 20, 87, 1, 1, 'bench', '河堤長椅', '🪑', { color: '#9a7a52' }),
      O('bench2', 40, 87, 1, 1, 'bench', '河堤長椅', '🪑', { color: '#9a7a52' }),
      O('bench3', 80, 87, 1, 1, 'bench', '河堤長椅', '🪑', { color: '#9a7a52' }),
      O('bench4', 100, 87, 1, 1, 'bench', '河堤長椅', '🪑', { color: '#9a7a52' }),
      O('bench5', 30, 39, 2, 1, 'bench', '廣場長椅', '🪑', { color: '#9a7a52' }),
      O('fountain', 24, 35, 3, 3, 'fountain', '許願噴水池', '⛲', { color: '#9fb7c2' }),
      O('hoop', 45, 10, 1, 1, 'hoop', '籃球架', '🏀', { color: '#d0453a' }),
      O('hoop2', 45, 26, 1, 1, 'decor', '', '🏀', { color: '#d0453a', face: 'n', model: 'hoop' }),
      O('temple', 42, 72, 1, 1, 'temple', '土地公廟香爐', '🏮', { color: '#b8322a' }),
      O('vending', 37, 68, 1, 1, 'vending', '自動販賣機', '🥤', { color: '#c9473f', face: 'w' }),
      O('st_chicken', 86, 57, 2, 3, 'stall', '豪大雞排', '🍗', { color: '#d9792b', stall: 'chicken', face: 'e' }),
      O('st_tofu', 86, 61, 2, 3, 'stall', '阿嬤臭豆腐', '🫕', { color: '#9b6a3a', stall: 'tofu', face: 'e' }),
      O('st_balloon', 86, 65, 2, 3, 'stall', '射氣球', '🎈', { color: '#3f7fb8', stall: 'balloon', face: 'e' }),
      O('st_corn', 86, 69, 2, 3, 'stall', '烤玉米', '🌽', { color: '#c79a2b', stall: 'corn', face: 'e' }),
      O('st_boba', 96, 57, 2, 3, 'stall', '珍奶攤', '🧋', { color: '#a86b4b', stall: 'boba', face: 'w' }),
      O('st_fish', 96, 61, 2, 3, 'stall', '撈金魚', '🐟', { color: '#2f8fb0', stall: 'fish', face: 'w' }),
      O('st_gua', 96, 65, 2, 3, 'stall', '刈包', '🥙', { color: '#8a5a3a', stall: 'gua', face: 'w' }),
      O('st_cake', 96, 69, 2, 3, 'stall', '雞蛋糕', '🧇', { color: '#d8a64a', stall: 'cake', face: 'w' }),
      CAT('cat_latte', 62, 90, '橘貓「拿鐵」', '#e39a4a'),
      CAT('cat_calico', 40, 73, '三花貓', '#f1e6d6'),
      CAT('cat_black', 22, 67, '黑貓', '#26262b'),
      CAT('cat_tabby', 36, 58, '虎斑貓', '#9a7a52'),
      CAT('cat_white', 52, 27, '白貓', '#f4f4f0'),
      CAT('cat_tux', 89, 73, '賓士貓', '#2b2b30'),
      CAT('cat_grey', 71, 39, '灰貓', '#8d939a'),
      CAT('cat_chonk', 116, 39, '胖橘', '#e08b35'),
    ],
    spots: { park1: [20, 88], park2: [40, 88], park3: [80, 88], park4: [100, 88], parkRiver: [62, 89], shopFront: [29, 76], busStop: [92, 42], plaza: [20, 34], court: [46, 18], court2: [43, 20], temple: [43, 75], market1: [91, 64], market2: [93, 66], entry: [61, 60] },
    exits: [[0, 47], [119, 48], [60, 0], [0, 80], [119, 81]],
  };
  // scooters are solid obstacles
  MAPS.city.objects.push(...SW.SCOOTERS.map(([x, y], i) => O('sc' + i, x, y, 1, 1, 'decor', '', '', { scooter: true, hide: true })));
})(window.SW);
