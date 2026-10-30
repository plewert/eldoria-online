'use strict';
/* Mascotas vivas (solo visual): respiran, mueven la cola, se sientan y miran a su alrededor, saltan de alegría al recoger botín o subir de nivel,
   se ponen en guardia si su dueño recibe daño, y las crías de jefe llevan aura, estela de partículas, nombre de color y sombra marcada. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G } = X;
  const PAL = {                                       // color del aura/estela de cada cría de jefe: [aura, estela, tipo de partícula]
    ignaros: ['255,120,40', '255,170,60', 'ember'], anubis: ['255,205,100', '120,255,170', 'spark'], leviatan: ['110,200,255', '170,230,255', 'bubble'],
    aracnido_fuego: ['255,80,50', '255,150,70', 'ember'], dragon_sombra: ['170,90,255', '120,60,200', 'smoke'], hidra_jade: ['70,230,130', '160,255,190', 'spark'],
    arcangel: ['255,240,190', '255,255,230', 'feather'], coloso_ancestral: ['255,170,70', '220,180,120', 'dust'], rey_esqueleto: ['190,200,255', '150,160,220', 'smoke'],
    senor_orco: ['120,200,90', '160,140,90', 'dust'], demonio_supremo: ['255,60,60', '255,110,60', 'ember'], cangrejo_colosal: ['255,130,90', '255,200,170', 'bubble'],
    maestro_forjador: ['255,150,50', '255,210,110', 'ember'], hidra: ['90,210,120', '160,240,160', 'spark'], rey_escorpion: ['255,200,80', '220,180,110', 'dust'],
    faraon: ['255,215,110', '200,170,255', 'spark'], reina_hielo: ['160,225,255', '230,248,255', 'spark'], serafin_fuego: ['255,140,60', '255,220,140', 'ember'],
    serafin_tormenta: ['170,200,255', '255,255,220', 'spark'], amenkhet: ['255,190,70', '240,210,130', 'dust'], reina_coral: ['255,130,190', '170,235,255', 'bubble'],
    raid_slyvra: ['150,110,255', '200,170,255', 'smoke'], raid_koros: ['255,150,60', '255,210,120', 'ember'], raid_aranak: ['120,255,160', '200,255,220', 'spark'],
    raid_xaelis: ['110,200,255', '190,235,255', 'bubble'], raid_malgathor: ['200,60,255', '255,140,255', 'smoke'],
  };
  const COMMON = { lobo: '200,190,170', kobold: '200,170,140', murcielago: '150,140,170', goblin: '150,200,120', dragon: '255,160,100', espectro_helado: '180,220,255', pet_pelicano: '210,220,230', pet_pulpo: '190,150,230' };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lastOwner = new Map();                         // id dueño -> { lv, gold, hp }

  /** Eventos del dueño: subir de nivel, recoger oro/botín y recibir daño. */
  const watch = (e, pp, now) => {
    let w = lastOwner.get(e.id); if (!w) { w = { lv: 0, gold: -1, hp: e.h, inv: -1 }; lastOwner.set(e.id, w); }
    if (e.id === G.id && G.stats) {
      if (w.lv && G.stats.lv > w.lv) pp.joy = now + 1400;
      if (w.gold >= 0 && G.stats.gold > w.gold) pp.joy = Math.max(pp.joy || 0, now + 700);
      w.lv = G.stats.lv; w.gold = G.stats.gold;
      const n = (G.inv || []).reduce((a, it) => a + (it ? it[1] : 0), 0); if (w.inv >= 0 && n > w.inv) pp.joy = Math.max(pp.joy || 0, now + 800); w.inv = n;
    }
    if (typeof e.h === 'number' && w.hp !== undefined && e.h < w.hp - 1) pp.alert = now + 4500;
    w.hp = e.h;
  };

  X.drawPet = (c, e, d, pp, sx, sy, dd, now) => {
    const spr = X.SPR[d.mon]; if (!spr || d.emoji || !X.sprReady()) return false;
    const boss = !!PAL[d.mon] && /^Cría/.test(d.name || '');
    const pal = PAL[d.mon], t = now / 1000, ph = (e.id || 0) * 0.9, moving = dd > 0.12;
    watch(e, pp, now);
    if (moving) { pp.lastMove = now; pp.sit = false; } else if (!pp.lastMove) pp.lastMove = now;
    if (!moving && now - pp.lastMove > 5000) pp.sit = true;
    if (!moving && !pp.sit && now > (pp.look || 0)) { pp.look = now + rnd(3000, 7000); if (Math.random() < 0.5) pp.f = -(pp.f || 1); }     // mira a su alrededor
    // salto de alegría y guardia
    const joyP = pp.joy > now ? 1 - (pp.joy - now) / 1400 : -1, alert = pp.alert > now;
    const jump = pp.joy > now ? Math.abs(Math.sin(joyP * Math.PI * 3)) * 11 * (1 - joyP * 0.5) : 0;
    const hop = moving ? Math.abs(Math.sin(now / 150 + ph)) * 3.2 : 0;
    const sitK = pp.sit && !alert && jump === 0 ? 0.9 : 1;
    const breathe = 1 + 0.02 * Math.sin(t * 2.4 + ph) * (pp.sit ? 1.5 : 1);
    const k = d.scale || 0.5, f = spr.f[moving && spr.f.length > 1 ? Math.floor(now / 140 + ph) % spr.f.length : 0], w = f[2] * k, h = f[3] * k * breathe * sitK;
    const fl = (pp.f || 1) < 0, lift = hop + jump, shake = alert ? Math.sin(now / 45) * 0.9 : 0;
    // sombra (más marcada en crías de jefe) y aura
    const sh = Math.max(7, w * 0.4);
    c.fillStyle = `rgba(0,0,0,${boss ? 0.45 : 0.3})`; c.beginPath(); c.ellipse(sx, sy + 1, sh * (1 - lift * 0.02), (boss ? 3.6 : 3), 0, 0, 7); c.fill();
    const ac = pal ? pal[0] : null;
    if (ac) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(sx, sy - h * 0.5 - lift, 2, sx, sy - h * 0.5 - lift, Math.max(18, h * 0.95)); g.addColorStop(0, `rgba(${ac},${0.2 + 0.1 * Math.sin(t * 3 + ph)})`); g.addColorStop(1, `rgba(${ac},0)`); c.fillStyle = g; c.fillRect(sx - 40, sy - h - 30 - lift, 80, h + 60); c.restore(); }
    // dibujo en tiras: respiración y cola/pelaje que se balancean
    c.save(); c.imageSmoothingEnabled = true; c.translate(Math.round(sx + shake), Math.round(sy - lift)); if (fl) c.scale(-1, 1);
    const step = Math.max(1, Math.round(f[3] / 28)), tail = moving ? 1.6 : 1;
    for (let r = 0; r < f[3]; r += step) {
      const u = (r + step / 2) / f[3], dy = -h + (r / f[3]) * h, hh = (step / f[3]) * h + 0.5;
      const sw = Math.sin(t * 3.2 + ph + u * 2.6) * 1.1 * u * u * tail + (pp.sit ? 0 : Math.sin(t * 1.3 + ph) * 0.4 * (1 - u));
      c.drawImage(X.sprImg, f[0], f[1] + r, f[2], step, -w / 2 + sw, dy, w, hh);
    }
    c.restore();
    // reacciones
    c.textAlign = 'center';
    if (alert) { c.font = 'bold 12px sans-serif'; c.fillStyle = '#ff6a5a'; c.strokeStyle = '#000'; c.lineWidth = 2.5; c.strokeText('!', sx, sy - h - 6 - lift); c.fillText('!', sx, sy - h - 6 - lift); }
    if (pp.joy > now && Math.random() < 0.35) pp.parts = (pp.parts || []).concat({ x: sx + rnd(-8, 8), y: sy - h * 0.8 - lift, vx: rnd(-8, 8), vy: rnd(-34, -18), life: 0.9, t: now, heart: Math.random() < 0.5 });
    if (pp.sit && !alert && Math.random() < 0.01) pp.parts = (pp.parts || []).concat({ x: sx + 8, y: sy - h, vx: 6, vy: -14, life: 1.2, t: now, z: true });     // se duerme: Z
    // estela y chispas de aura
    const kind = pal ? pal[2] : 'dust', col = pal ? pal[1] : (COMMON[d.mon] || '200,190,160');
    if (moving ? Math.random() < (pal ? 0.55 : 0.18) : pal && Math.random() < 0.18) {
      const up = kind === 'ember' || kind === 'spark' || kind === 'bubble' || kind === 'feather' ? -1 : -0.3;
      pp.parts = (pp.parts || []).concat({ x: sx + rnd(-w * 0.3, w * 0.3), y: sy - rnd(0, h * (moving ? 0.35 : 0.9)), vx: rnd(-6, 6) - (moving ? (fl ? -8 : 8) : 0), vy: rnd(8, 22) * up, life: rnd(0.5, 1.1), t: now, kind, col });
    }
    if (pp.parts) {
      c.save(); c.textBaseline = 'middle';
      pp.parts = pp.parts.filter((p) => now - p.t < p.life * 1000);
      for (const p of pp.parts) {
        const a = 1 - (now - p.t) / (p.life * 1000), dt = (now - p.t) / 1000, x = p.x + p.vx * dt + (p.kind === 'feather' ? Math.sin(dt * 5) * 4 : 0), y = p.y + p.vy * dt;
        if (p.heart) { c.font = '9px sans-serif'; c.globalAlpha = a; c.fillText('💖', x, y); }
        else if (p.z) { c.font = 'bold 9px sans-serif'; c.globalAlpha = a; c.fillStyle = '#cfe3ff'; c.fillText('z', x, y); }
        else { c.globalAlpha = a * 0.8; c.fillStyle = `rgb(${p.col})`; const sz = p.kind === 'bubble' ? 2.4 : p.kind === 'smoke' ? 3 : p.kind === 'dust' ? 2.4 : 1.8; if (p.kind === 'bubble') { c.strokeStyle = `rgb(${p.col})`; c.lineWidth = 1; c.beginPath(); c.arc(x, y, sz, 0, 7); c.stroke(); } else c.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
      }
      c.restore(); c.globalAlpha = 1;
    }
    // nombre con el color de su aura (solo crías de jefe)
    if (boss && ac) { c.font = '8px sans-serif'; c.textAlign = 'center'; c.fillStyle = `rgb(${ac})`; c.strokeStyle = 'rgba(0,0,0,.85)'; c.lineWidth = 2; const nm = d.name.replace(/^Cría de /, '').split(',')[0]; c.strokeText(nm, sx, sy + 11); c.fillText(nm, sx, sy + 11); }
    return true;
  };
})();
