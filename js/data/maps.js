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
      O('pew1o', 2, 4, 5, 1, 'pew', '長椅', '🪑', { color: '#a3835e' }),
      O('pew2o', 11, 4, 5, 1, 'pew', '長椅', '🪑', { color: '#a3835e' }),
      O('pew3o', 2, 6, 5, 1, 'pew', '長椅', '🪑', { color: '#a3835e' }),
      O('pew4o', 11, 6, 5, 1, 'pew', '長椅', '🪑', { color: '#a3835e' }),
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
      O('gymCounter', 1, 6, 2, 1, 'gymCounter', '櫃檯', '🥤', { color: '#c25a3a' }),
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

  // ---------- City (built procedurally) ----------
  const W = 46, H = 38;
  const BUILDINGS = SW.BUILDINGS = [
    { id: 'office', map: 'office', x: 2, y: 2, w: 12, h: 9, door: [8, 10], roof: '#5d7a8c', body: '#c7d3da', sign: '矽藍科技', signColor: '#2f6f9c' },
    { id: 'cafe', map: 'cafe', x: 15, y: 8, w: 6, h: 6, door: [17, 13], roof: '#9b5a3c', body: '#e8d2b0', sign: '轉角咖啡', signColor: '#8a4b2b' },
    { id: 'church', map: 'church', x: 26, y: 3, w: 9, h: 8, door: [30, 10], roof: '#7a6f8f', body: '#efe9df', sign: '光鹽教會', signColor: '#5b5170', steeple: true },
    { id: 'gym', map: 'gym', x: 37, y: 6, w: 7, h: 6, door: [40, 11], roof: '#3d464e', body: '#9aa5ad', sign: '竹風健身', signColor: '#c25a3a' },
    { id: 'home', map: 'home', x: 3, y: 19, w: 8, h: 7, door: [7, 25], roof: '#6f8f6a', body: '#e6dfcf', sign: '竹光公寓', signColor: '#3f6a4a', tiles: true },
    { id: 'shop', map: null, x: 13, y: 21, w: 5, h: 5, door: [15, 25], roof: '#2f8f83', body: '#f4f4ef', sign: '全家福超商', signColor: '#2f8f83', shop: true },
    { id: 'bar', map: 'bar', x: 26, y: 19, w: 8, h: 7, door: [30, 25], roof: '#5a3a2a', body: '#d8b08a', sign: '好日子餐酒館', signColor: '#a34a2a' },
    { id: 'studio', map: 'studio', x: 36, y: 20, w: 7, h: 6, door: [39, 25], roof: '#3b3f5a', body: '#b3b6c9', sign: '回聲音樂', signColor: '#4b4f8a' },
  ];

  function buildCity() {
    const g = [];
    for (let y = 0; y < H; y++) { g.push(new Array(W).fill('g')); }
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
    for (let x = 0; x < W; x++) { set(x, 15, 's'); set(x, 16, 'r'); set(x, 17, 'r'); set(x, 18, 's'); set(x, 26, 's'); set(x, 27, 'r'); set(x, 28, 'r'); set(x, 29, 's'); set(x, 34, 'p'); for (let y = 35; y < H; y++) set(x, y, 'w'); }
    for (let y = 0; y < 34; y++) { if (g[y][21] !== 'r') set(21, y, 's'); set(22, y, 'r'); set(23, y, 'r'); if (g[y][24] !== 'r') set(24, y, 's'); }
    for (let y = 30; y < 34; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'g') g[y][x] = 'k'; // park lawn
    for (let x = 1; x < 21; x++) set(x, 32, 'p');
    for (let x = 25; x < 45; x++) set(x, 32, 'p');
    for (let y = 31; y <= 33; y++) for (let x = 16; x <= 19; x++) set(x, y, 'w');
    for (let x = 16; x <= 19; x++) set(x, 32, 'w');
    // plazas to doors
    for (let y = 11; y <= 14; y++) for (let x = 6; x <= 10; x++) set(x, y, 'P');
    for (let x = 16; x <= 18; x++) set(x, 14, 'P');
    for (let y = 11; y <= 14; y++) { set(30, y, 'P'); set(29, y, y === 12 ? 'f' : 'g'); set(31, y, y === 12 ? 'f' : 'g'); }
    for (let y = 12; y <= 14; y++) set(40, y, 'P');
    for (const b of BUILDINGS) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) set(x, y, 'B');
      set(b.door[0], b.door[1], b.shop ? 'B' : 'D');
    }
    const trees = [[16, 1], [18, 2], [20, 1], [25, 1], [36, 1], [40, 2], [44, 2], [1, 3], [1, 7], [1, 11], [15, 3], [19, 5], [44, 5], [36, 13], [44, 13], [26, 13], [34, 13],
      [1, 20], [1, 23], [12, 19], [19, 22], [25, 21], [35, 22], [44, 20], [44, 24], [19, 25],
      [3, 30], [9, 30], [14, 30], [27, 30], [34, 30], [41, 30], [4, 33], [10, 33], [26, 33], [33, 33], [43, 33], [21 - 1, 30]];
    for (const [x, y] of trees) if (g[y][x] === 'g' || g[y][x] === 'k') set(x, y, 'T');
    return g.map((r) => r.join(''));
  }

  MAPS.city = {
    name: '光復生活圈', outdoor: true, w: W, h: H, ascii: buildCity(), rooms: [],
    objects: [
      O('busStop', 27, 14, 1, 1, 'busStop', '公車站', '🚏', { color: '#2f6f9c' }),
      O('ubike', 19, 19, 1, 1, 'ubike', 'YouBike 站', '🚲', { color: '#e8a33a' }),
      O('shopDoor', 15, 25, 1, 1, 'shop', '全家福超商', '🏪', { color: '#2f8f83', inBuilding: true }),
      O('bench1', 6, 31, 1, 1, 'bench', '長椅', '🪑', { color: '#9a7a52' }),
      O('bench2', 12, 31, 1, 1, 'bench', '長椅', '🪑', { color: '#9a7a52' }),
      O('bench3', 30, 31, 1, 1, 'bench', '長椅', '🪑', { color: '#9a7a52' }),
      O('bench4', 38, 31, 1, 1, 'bench', '長椅', '🪑', { color: '#9a7a52' }),
    ],
    spots: { park1: [6, 30], park2: [12, 30], park3: [30, 30], park4: [38, 30], parkRiver: [28, 34], shopFront: [15, 26], busStop: [27, 15], plaza: [8, 13], entry: [22, 20] },
    exits: [[0, 16], [45, 17], [22, 0], [0, 27], [45, 28]],
  };
})(window.SW);
