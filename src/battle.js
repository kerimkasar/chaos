// battle.js — SAF savaş simülasyonu. Canvas/DOM bilmez; sadece sayılarla çalışır.
window.Game = window.Game || {};

Game.battle = {
  units: [],
  status: 'idle', // 'idle' | 'ongoing' | 'win' | 'lose'
  time: 0,

  start(playerUnits, enemyUnits) {
    this.units = [...playerUnits, ...enemyUnits];
    this.status = 'ongoing';
    this.time = 0;
  },

  alive(team) {
    return this.units.filter((u) => u.team === team && u.hp > 0);
  },

  tick(dt) {
    if (this.status !== 'ongoing') return this.status;
    this.time += dt;

    for (const u of this.units) {
      if (u.hp <= 0) continue;
      if (u._hit > 0) u._hit = Math.max(0, u._hit - dt);
      if (u._atk) { u._atk.t -= dt; if (u._atk.t <= 0) u._atk = null; }

      if (u.def.role === 'medic') {
        this._actMedic(u, dt);
      } else {
        this._actFighter(u, dt);
      }
    }

    if (this.alive('enemy').length === 0) this.status = 'win';
    else if (this.alive('player').length === 0) this.status = 'lose';
    else if (this.time >= Game.config.maxBattleTime) {
      // Zaman aşımı: kalan toplam cana göre karar
      this.status = this._totalHp('player') >= this._totalHp('enemy') ? 'win' : 'lose';
    }
    return this.status;
  },

  _actFighter(u, dt) {
    if (!u.target || u.target.hp <= 0) u.target = this._nearestEnemy(u);
    const target = u.target;
    if (!target) return;

    const d = Game.util.dist(u, target);
    if (d > u.def.range) {
      const k = (u.def.moveSpeed * dt) / d;
      u.x += (target.x - u.x) * k;
      u.y += (target.y - u.y) * k;
    } else {
      u.cooldown -= dt;
      if (u.cooldown <= 0) {
        target.hp -= u.def.dmg;
        target._hit = 0.12;
        u._atk = { x: target.x, y: target.y, t: 0.08 };
        u.cooldown = 1 / u.def.atkSpeed;
      }
    }
  },

  _actMedic(u, dt) {
    // En çok yaralı (oransal) yaşayan müttefiki bul
    let ally = null;
    let worst = 1;
    for (const o of this.units) {
      if (o.team !== u.team || o.hp <= 0 || o === u) continue;
      const ratio = o.hp / o.maxHp;
      if (ratio < 1 && ratio < worst) { worst = ratio; ally = o; }
    }
    if (!ally) return; // iyileştirecek kimse yok → bekle (güvende kal)

    const d = Game.util.dist(u, ally);
    if (d > u.def.range) {
      const k = (u.def.moveSpeed * dt) / d;
      u.x += (ally.x - u.x) * k;
      u.y += (ally.y - u.y) * k;
    } else {
      u.cooldown -= dt;
      if (u.cooldown <= 0) {
        ally.hp = Math.min(ally.maxHp, ally.hp + u.def.heal);
        ally._hit = 0.12;
        u._atk = { x: ally.x, y: ally.y, t: 0.08, heal: true };
        u.cooldown = 1 / u.def.atkSpeed;
      }
    }
  },

  _nearestEnemy(u) {
    let best = null;
    let bestD = Infinity;
    for (const o of this.units) {
      if (o.team === u.team || o.hp <= 0) continue;
      const d = Game.util.dist(u, o);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  },

  _totalHp(team) {
    return this.units.reduce((s, u) => (u.team === team && u.hp > 0 ? s + u.hp : s), 0);
  },
};

// Tura göre düşman dalgası (bütçe tabanlı). Şifacı düşman dalgalarına dahil değil.
Game.makeWave = function (round) {
  const cfg = Game.config;
  const types = Object.keys(cfg.units).filter((t) => cfg.units[t].role !== 'medic');
  let budget = 4 + round * 3;
  const wave = [];
  const occupied = new Set();
  let guard = 0;

  while (budget > 0 && guard++ < 100) {
    const affordable = types.filter((t) => cfg.units[t].cost <= budget);
    if (affordable.length === 0) break;
    const t = affordable[Math.floor(Math.random() * affordable.length)];
    let placed = false;
    for (let tries = 0; tries < 30 && !placed; tries++) {
      const col = cfg.enemyCols[Math.floor(Math.random() * cfg.enemyCols.length)];
      const row = Math.floor(Math.random() * cfg.rows);
      const key = col + ',' + row;
      if (occupied.has(key)) continue;
      occupied.add(key);
      wave.push(Game.createUnit(t, 'enemy', col, row));
      budget -= cfg.units[t].cost;
      placed = true;
    }
    if (!placed) break;
  }
  return wave;
};
