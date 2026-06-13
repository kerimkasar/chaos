// units.js — Birim üretimi. "Sahip olunan" birimler (yedek/saha) kalıcı nesnelerdir;
// her birinin yaraları (wounds) turlar arası taşınır. Savaş için taze kopya çıkarılır.
window.Game = window.Game || {};
Game._nextId = 1;

Game.createUnit = function (typeId, team, col, row) {
  const def = Game.config.units[typeId];
  const pos = Game.util.gridCenter(col, row);
  return {
    id: Game._nextId++,
    typeId,
    def,
    team,
    col,
    row,
    wounds: 0,        // kalıcı yıpranma (turlar arası taşınır)
    hp: def.hp,
    maxHp: def.hp,
    cooldown: 0,
    target: null,
    src: null,        // savaş kopyasında: kaynak (sahip olunan) birime referans
    _atk: null,       // çizim: son aksiyon çizgisi {x,y,t,heal?}
    _hit: 0,
  };
};

// Sahip olunan bir birimi savaş için taze kopyalar.
// Etkin maksimum can = yaralara göre düşürülür; bittiğinde yaralar kaynağa yazılır.
Game.cloneForBattle = function (src, team) {
  const c = Game.createUnit(src.typeId, team, src.col, src.row);
  const eff = Game.util.effMaxHp(src);
  c.maxHp = eff;
  c.hp = eff;
  c.src = src;
  return c;
};
