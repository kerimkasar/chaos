// render.js — Canvas çizimi. Mantık içermez.
window.Game = window.Game || {};

Game.render = {
  ctx: null,

  init(canvas) {
    const cfg = Game.config;
    canvas.width = cfg.cols * cfg.tile;
    canvas.height = cfg.rows * cfg.tile;
    this.ctx = canvas.getContext('2d');
  },

  // mode: 'prep' (sahip olunan birimler, yıpranma gösterilir) | 'battle' (canlı)
  // preview: planlama safhasında soluk gösterilecek gelecek düşman dalgası
  draw(units, mode, highlight, preview) {
    const ctx = this.ctx;
    const cfg = Game.config;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let c = 0; c < cfg.cols; c++) {
      for (let r = 0; r < cfg.rows; r++) {
        const x = c * cfg.tile, y = r * cfg.tile;
        if (cfg.playerCols.includes(c)) ctx.fillStyle = '#16213e';
        else if (cfg.enemyCols.includes(c)) ctx.fillStyle = '#2a1622';
        else ctx.fillStyle = '#10101a';
        ctx.fillRect(x, y, cfg.tile, cfg.tile);
        // Sürükleme sırasında geçerli hedef kareyi vurgula
        if (highlight && highlight.col === c && highlight.row === r) {
          ctx.fillStyle = 'rgba(77,208,225,0.25)';
          ctx.fillRect(x, y, cfg.tile, cfg.tile);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.strokeRect(x, y, cfg.tile, cfg.tile);
      }
    }

    // Aksiyon çizgileri
    for (const u of units) {
      if (u.hp > 0 && u._atk) {
        ctx.strokeStyle = u._atk.heal ? 'rgba(120,255,150,0.9)' : 'rgba(255,230,120,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(u._atk.x, u._atk.y);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }

    for (const u of units) {
      if (u.hp <= 0) continue;
      const r = 34;
      ctx.fillStyle = u._hit > 0 ? '#ffffff' : u.def.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = u.team === 'player' ? '#4dd0e1' : '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1;

      ctx.fillStyle = '#0b0b12';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.def.name[0], u.x, u.y + 1);

      // Can / yıpranma barı
      const bw = 56, bh = 7;
      const bx = u.x - bw / 2, by = u.y - r - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, bh);
      let pct;
      if (mode === 'prep') {
        // Yıpranmaya göre etkin can oranı (worn → kısa bar)
        pct = Game.util.effMaxHp(u) / u.def.hp;
      } else {
        pct = Math.max(0, u.hp / u.maxHp);
      }
      ctx.fillStyle = u.team === 'player' ? (pct < 0.6 ? '#e8a13a' : '#4caf50') : '#e53935';
      ctx.fillRect(bx, by, bw * pct, bh);
    }

    // Planlama önizlemesi: gelecek düşman dalgası (soluk, kesik çizgili)
    if (preview && preview.length) {
      ctx.globalAlpha = 0.4;
      for (const u of preview) {
        ctx.fillStyle = u.def.color;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff6b6b';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.fillStyle = '#0b0b12';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(u.def.name[0], u.x, u.y + 1);
      }
      ctx.globalAlpha = 1;
    }
  },

  banner(text) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, ctx.canvas.height / 2 - 40, ctx.canvas.width, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, ctx.canvas.width / 2, ctx.canvas.height / 2);
  },
};
