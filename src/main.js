// main.js — Durum makinesi + oyun döngüsü + sürükle-bırak + ekonomi/yıpranma.
window.Game = window.Game || {};

Game.state = {
  phase: 'prep',  // 'prep' | 'battle' | 'gameover'
  gold: 0,
  lives: 0,
  round: 1,
  bench: [],      // sahip olunan ama sahada olmayan birimler (dinlenir)
  board: [],      // sahaya dizilmiş birimler (dövüşür)
  wave: [],       // bu turun düşman dalgası (önizleme + savaş aynı dalga)
  offers: [],     // dükkân teklifleri (typeId)
  message: '',
  outcome: '',
};

Game.main = {
  canvas: null,
  lastTime: 0,
  bannerText: '',
  bannerTimer: 0,
  drag: null,     // {unit, from:'bench'|'board', ghost}
  hover: null,    // sürüklerken vurgulanan kare {col,row}

  start() {
    this.canvas = document.getElementById('board');
    Game.render.init(this.canvas);

    // Sürükle-bırak: tüm belge üzerinde pointer olayları
    if (!this._wired) {
      document.addEventListener('pointerdown', (e) => this.onDown(e));
      document.addEventListener('pointermove', (e) => this.onMove(e));
      document.addEventListener('pointerup', (e) => this.onUp(e));
      this._wired = true;
    }

    const s = Game.state;
    s.phase = 'prep';
    s.gold = Game.config.startGold;
    s.lives = Game.config.startLives;
    s.round = 1;
    s.bench = [];
    s.board = [];
    s.wave = [];
    s.outcome = '';
    this.rollShop();
    this.setWave();
    s.message = 'Sağdaki soluk düşmanlar bu turun dalgası — ona göre diz. Sonra Savaş.';

    this.lastTime = performance.now();
    if (!this._looping) { this._looping = true; requestAnimationFrame((t) => this.loop(t)); }
    this.syncUI();
  },

  // ---- Dükkân / ekonomi ----
  rollShop() {
    const types = Object.keys(Game.config.units);
    Game.state.offers = [];
    for (let i = 0; i < Game.config.shopSize; i++) {
      Game.state.offers.push(types[Math.floor(Math.random() * types.length)]);
    }
  },

  // Bu turun düşman dalgasını üret (önizleme + savaş aynı dalgayı kullanır).
  setWave() {
    Game.state.wave = Game.makeWave(Game.state.round);
  },

  buy(index) {
    const s = Game.state;
    if (s.phase !== 'prep') return;
    const typeId = s.offers[index];
    if (!typeId) return;
    const def = Game.config.units[typeId];
    if (s.gold < def.cost) { this.flash('Yeterli altın yok'); return; }
    s.gold -= def.cost;
    s.bench.push(Game.createUnit(typeId, 'player', 0, 0)); // yedeğe düşer
    s.offers[index] = null;
    this.syncUI();
  },

  reroll() {
    const s = Game.state;
    if (s.phase !== 'prep') return;
    if (s.gold < Game.config.rerollCost) { this.flash('Reroll için altın yok'); return; }
    s.gold -= Game.config.rerollCost;
    this.rollShop();
    this.syncUI();
  },

  sell(unit, from) {
    const s = Game.state;
    const refund = Math.max(1, unit.def.cost - Game.config.sellRefund);
    s.gold += refund;
    const arr = from === 'board' ? s.board : s.bench;
    const i = arr.indexOf(unit);
    if (i !== -1) arr.splice(i, 1);
    this.flash(`${unit.def.name} satıldı (+${refund})`);
    this.syncUI();
  },

  // ---- Savaş ----
  fight() {
    const s = Game.state;
    if (s.phase !== 'prep') return;
    if (s.board.length === 0) { this.flash('Önce sahaya birim diz!'); return; }

    const playerUnits = s.board.map((u) => Game.cloneForBattle(u, 'player'));
    // Önizlemede gösterilen dalganın taze kopyası (s.wave bozulmasın diye)
    const enemyUnits = s.wave.map((w) => Game.createUnit(w.typeId, 'enemy', w.col, w.row));
    Game.battle.start(playerUnits, enemyUnits);
    s.phase = 'battle';
    s.message = `Tur ${s.round}: savaş başladı...`;
    this.syncUI();
  },

  resolveBattle(result) {
    const s = Game.state;
    const cfg = Game.config;

    // 1) Yıpranma: sahadaki (savaşan) birimlere yara yaz
    for (const c of Game.battle.units) {
      if (c.team !== 'player' || !c.src) continue;
      const def = c.src.def;
      if (c.hp <= 0) {
        c.src.wounds = Math.min(def.hp * cfg.woundCap, c.src.wounds + def.hp * cfg.woundOnDeath);
      } else {
        const hpLost = c.maxHp - c.hp;
        c.src.wounds = Math.min(def.hp * cfg.woundCap, c.src.wounds + hpLost * cfg.woundFactor);
      }
    }
    // 2) Yedektekiler dinlenir (yara iyileşir)
    for (const u of s.bench) {
      u.wounds = Math.max(0, u.wounds - u.def.hp * cfg.benchRecover);
    }

    // 3) Ekonomi / sonuç
    if (result === 'win') {
      this.banner('KAZANDIN');
      const interest = Math.min(Math.floor(s.gold / cfg.interestPer), cfg.interestCap);
      const gain = cfg.income + interest + cfg.winBonus;
      s.gold += gain;
      s.message = `Tur ${s.round} kazanıldı! +${gain} altın (faiz ${interest}).`;
      s.round++;
      if (s.round > cfg.maxRound) { s.phase = 'gameover'; s.outcome = 'win'; this.syncUI(); return; }
      this.setWave(); // yeni bölüm → yeni düşman dalgası
    } else {
      this.banner('KAYBETTİN — tekrar dene');
      s.lives -= 1;
      s.gold += cfg.income;
      s.message = `Tur ${s.round} geçilemedi. -1 can (kalan ${s.lives}), +${cfg.income} altın. Dizilişini değiştir, AYNI düşmanı tekrar dene.`;
      if (s.lives <= 0) { s.phase = 'gameover'; s.outcome = 'lose'; this.syncUI(); return; }
      // Aynı tur ve aynı dalga kalır → bölümü tekrar oyna
    }

    s.phase = 'prep';
    this.rollShop();
    this.syncUI();
  },

  // ---- Sürükle-bırak ----
  onDown(e) {
    if (Game.state.phase !== 'prep') return;
    // Yedek kartı mı?
    const card = e.target.closest && e.target.closest('.bench-card');
    if (card) {
      const u = Game.state.bench.find((x) => x.id === Number(card.dataset.id));
      if (u) { this.startDrag(u, 'bench', e); e.preventDefault(); }
      return;
    }
    // Sahadaki birim mi? (canvas üzerinde)
    if (e.target === this.canvas) {
      const cell = this.cellFromEvent(e);
      const u = Game.state.board.find((x) => x.col === cell.col && x.row === cell.row);
      if (u) { this.startDrag(u, 'board', e); e.preventDefault(); }
    }
  },

  startDrag(unit, from, e) {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = unit.def.name;
    ghost.style.background = unit.def.color;
    document.body.appendChild(ghost);
    this.drag = { unit, from, ghost };
    this.moveGhost(e);
  },

  onMove(e) {
    if (!this.drag) return;
    this.moveGhost(e);
    // Canvas üzerindeyse hedef kareyi vurgula
    if (e.target === this.canvas) this.hover = this.cellFromEvent(e);
    else this.hover = null;
  },

  moveGhost(e) {
    const g = this.drag.ghost;
    g.style.left = e.clientX + 'px';
    g.style.top = e.clientY + 'px';
  },

  onUp(e) {
    if (!this.drag) return;
    const { unit, from, ghost } = this.drag;
    ghost.remove();
    this.drag = null;
    this.hover = null;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el === this.canvas) {
      const cell = this.cellFromEvent(e);
      this.dropOnBoard(unit, from, cell.col, cell.row);
    } else if (el && el.closest('#sellzone')) {
      this.sell(unit, from);
    } else if (el && el.closest('#benchpanel')) {
      this.toBench(unit, from);
    }
    this.syncUI();
  },

  dropOnBoard(unit, from, col, row) {
    const s = Game.state;
    if (!Game.config.playerCols.includes(col) || row < 0 || row >= Game.config.rows) {
      this.flash('Sadece sol taraftaki karelere dizebilirsin'); return;
    }
    const occupant = s.board.find((u) => u.col === col && u.row === row);
    if (occupant && occupant !== unit) {
      if (from === 'board') { // iki saha birimini yer değiştir
        occupant.col = unit.col; occupant.row = unit.row;
        unit.col = col; unit.row = row;
      } else {
        this.flash('O kare dolu');
      }
      return;
    }
    if (from === 'bench') {
      // Karakter sayısı sınırı yok — tek sınır paran ve tahtadaki boş kare.
      const i = s.bench.indexOf(unit);
      if (i !== -1) s.bench.splice(i, 1);
      s.board.push(unit);
    }
    unit.col = col; unit.row = row;
    const p = Game.util.gridCenter(col, row);
    unit.x = p.x; unit.y = p.y;
  },

  toBench(unit, from) {
    const s = Game.state;
    if (from !== 'board') return;
    const i = s.board.indexOf(unit);
    if (i !== -1) s.board.splice(i, 1);
    s.bench.push(unit);
  },

  cellFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    return { col: Math.floor(x / Game.config.tile), row: Math.floor(y / Game.config.tile) };
  },

  // ---- Döngü ----
  loop(now) {
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    const s = Game.state;
    if (s.phase === 'battle') {
      const status = Game.battle.tick(dt);
      Game.render.draw(Game.battle.units, 'battle');
      if (status === 'win' || status === 'lose') this.resolveBattle(status);
    } else {
      Game.render.draw(s.board, 'prep', this.drag ? this.hover : null, s.wave);
      if (s.phase === 'gameover') {
        Game.render.banner(s.outcome === 'win' ? 'ZAFER!' : 'OYUN BİTTİ');
      }
    }
    if (this.bannerTimer > 0) Game.render.banner(this.bannerText);
    requestAnimationFrame((t) => this.loop(t));
  },

  banner(text) { this.bannerText = text; this.bannerTimer = 1.2; },
  flash(text) { Game.state.message = text; this.syncUI(); },

  // ---- UI (DOM) ----
  syncUI() {
    const s = Game.state;
    document.getElementById('round').textContent = `${s.round}/${Game.config.maxRound}`;
    document.getElementById('gold').textContent = s.gold;
    document.getElementById('lives').textContent = s.lives;
    document.getElementById('deploy').textContent = `${s.board.length}`;
    document.getElementById('message').textContent = s.message;

    // Dükkân
    const shop = document.getElementById('shop');
    shop.innerHTML = '';
    s.offers.forEach((typeId, i) => {
      const card = document.createElement('button');
      card.className = 'card';
      if (!typeId) { card.classList.add('empty'); card.textContent = '—'; card.disabled = true; }
      else {
        const def = Game.config.units[typeId];
        card.style.borderColor = def.color;
        const stat = def.role === 'medic'
          ? `${def.cost}💰 · ${def.hp}♥ · ${def.heal}✚`
          : `${def.cost}💰 · ${def.hp}♥ · ${def.dmg}⚔`;
        card.innerHTML = `<div class="cname" style="color:${def.color}">${def.name}</div><div class="cstat">${stat}</div>`;
        card.onclick = () => this.buy(i);
      }
      shop.appendChild(card);
    });

    // Yedek (bench)
    const bench = document.getElementById('bench');
    bench.innerHTML = '';
    if (s.bench.length === 0) {
      bench.innerHTML = '<div class="bench-empty">Yedek boş — dükkândan al</div>';
    }
    s.bench.forEach((u) => {
      const el = document.createElement('div');
      el.className = 'bench-card';
      el.dataset.id = u.id;
      el.style.borderColor = u.def.color;
      const wear = Math.round((1 - Game.util.effMaxHp(u) / u.def.hp) * 100);
      el.innerHTML = `<span style="color:${u.def.color}">${u.def.name}</span>` +
        (wear > 0 ? `<span class="wear">yıpranma %${wear}</span>` : `<span class="ready">hazır</span>`);
      bench.appendChild(el);
    });

    const inPrep = s.phase === 'prep';
    document.getElementById('fight').disabled = !inPrep;
    document.getElementById('reroll').disabled = !inPrep;
  },
};

window.addEventListener('DOMContentLoaded', () => Game.main.start());
window.GameUI = {
  fight: () => Game.main.fight(),
  reroll: () => Game.main.reroll(),
  restart: () => Game.main.start(),
};
