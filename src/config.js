// config.js — Tüm sabitler ve denge değerleri burada.
// Oyunu dengelemek = çoğunlukla bu dosyadaki sayıları değiştirmek.
window.Game = window.Game || {};

Game.config = {
  // Tahta (grid)
  cols: 8,
  rows: 5,
  tile: 100,
  playerCols: [0, 1, 2],
  enemyCols: [5, 6, 7],

  // Ekonomi
  startGold: 14,
  startLives: 5,
  income: 5,
  winBonus: 1,
  interestPer: 10,
  interestCap: 5,
  rerollCost: 2,
  shopSize: 4,
  sellRefund: 1,
  maxRound: 10,

  // Saha (tedarik) limiti — aynı anda kaç birim dövüşebilir.
  // Tura göre artar; yıpranma sistemini anlamlı kılan kısıt budur.
  baseDeployCap: 4,
  deployCapPerRounds: 2, // her 2 turda +1
  maxDeployCap: 8,

  // Yıpranma (attrition)
  woundFactor: 0.20,    // savaşta kaybedilen canın %20'si kalıcı yaraya döner
  woundOnDeath: 0.55,   // savaşta ölürse maxHP'nin %55'i kadar yara
  woundCap: 0.60,       // yara tavanı: birim hiçbir zaman maxHP'nin %40'ından zayıf olmaz
  benchRecover: 0.50,   // yedekte dinlenince her tur maxHP'nin %50'si kadar yara iyileşir

  // Savaş güvenliği: bu süreyi aşarsa kalan cana göre sonuç verilir (sonsuz döngü engeli)
  maxBattleTime: 25,

  // Birimler. atkSpeed = saniyedeki saldırı/iyileştirme sayısı. heal>0 ise şifacı.
  units: {
    knight: { name: 'Şövalye', cost: 3, hp: 120, dmg: 14, range: 90,  atkSpeed: 1.0, moveSpeed: 60, role: 'melee',  color: '#6ab04c' },
    archer: { name: 'Okçu',    cost: 3, hp: 60,  dmg: 12, range: 240, atkSpeed: 1.1, moveSpeed: 55, role: 'ranged', color: '#22a6b3' },
    mage:   { name: 'Büyücü',  cost: 4, hp: 55,  dmg: 30, range: 220, atkSpeed: 0.6, moveSpeed: 50, role: 'ranged', color: '#be2edd' },
    brute:  { name: 'Dev',     cost: 5, hp: 260, dmg: 22, range: 90,  atkSpeed: 0.7, moveSpeed: 45, role: 'tank',   color: '#e1701a' },
    medic:  { name: 'Şifacı',  cost: 4, hp: 70,  dmg: 0,  heal: 18, range: 200, atkSpeed: 0.9, moveSpeed: 55, role: 'medic', color: '#f6c945' },
  },
};

Game.util = {
  gridCenter(col, row) {
    const t = Game.config.tile;
    return { x: col * t + t / 2, y: row * t + t / 2 };
  },
  dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  },
  // Bir turdaki saha limiti
  deployCap(round) {
    const c = Game.config;
    return Math.min(c.maxDeployCap, c.baseDeployCap + Math.floor((round - 1) / c.deployCapPerRounds));
  },
  // Yaralara göre etkin maksimum can
  effMaxHp(u) {
    return Math.max(1, Math.round(u.def.hp - (u.wounds || 0)));
  },
};
