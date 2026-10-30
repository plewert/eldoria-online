'use strict';
/* Raid: Santuario de las Cinco Sombras — panel, barra del jefe, avisos de ataques, cofre final y su animación de apertura. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $, send } = X;
  const RAID_Y0 = 146;
  let R = null;                                        // último estado recibido del servidor
  const nameOf = (id) => (G.items[id] ? G.items[id].name : id);

  /* ---------- estilos ---------- */
  const st = document.createElement('style');
  st.textContent = `
.raidhud{position:absolute;top:104px;left:58px;z-index:7;width:236px;display:grid;gap:6px;padding:8px 10px;background:linear-gradient(180deg,rgba(30,14,48,.93),rgba(14,8,26,.93));border:1px solid #8a5ad8;color:#e8dcff;font:12px var(--sans);box-shadow:0 0 18px rgba(130,70,220,.4),0 6px 20px rgba(0,0,0,.55)}
.raidhud h4{margin:0;font:700 13px var(--serif);color:#e0c8ff;display:flex;justify-content:space-between;gap:6px;cursor:pointer}
.raidhud small{color:#b9a3e0}
.raidhud button{font:600 12px var(--sans);padding:6px 8px;border:1px solid #a97aff;background:linear-gradient(180deg,#5a2fa0,#331866);color:#fff;cursor:pointer}
.raidhud button:disabled{opacity:.45;cursor:default}
.raidhud button.gold{border-color:#e0b64a;background:linear-gradient(180deg,#a8761a,#6a4208);color:#fff2c4;animation:rdpulse 1.2s infinite}
.raidhud .row{display:flex;gap:6px}.raidhud .row button{flex:1}
.raidhud .team{display:grid;gap:2px;max-height:120px;overflow:auto}
.raidhud .tm{display:grid;grid-template-columns:70px 1fr;gap:5px;align-items:center;font-size:11px}
.raidhud .tm i{display:block;height:5px;background:#2a1b44}.raidhud .tm i b{display:block;height:100%;background:#58d868}
.raidhud .tm.dead{opacity:.4;text-decoration:line-through}
.raidhud .more{display:grid;gap:6px}.raidhud.min .more{display:none}
.rdboss{position:absolute;top:56px;left:50%;transform:translateX(-50%);z-index:7;width:min(460px,70%);text-align:center;color:#f1e6ff;font:700 13px var(--serif);text-shadow:0 1px 3px #000;pointer-events:none}
.rdboss .bar{height:12px;margin-top:3px;background:rgba(10,4,20,.85);border:1px solid #b98aff;box-shadow:0 0 12px rgba(160,90,255,.5)}
.rdboss .bar b{display:block;height:100%;background:linear-gradient(180deg,#e8506a,#8a1630);transition:width .6s}
.rdboss.sh .bar b{background:linear-gradient(180deg,#8ad8ff,#2a6ab0)}
.rdboss small{font:11px var(--sans);color:#d8c4ff}
@keyframes rdpulse{50%{box-shadow:0 0 14px #ffd96a}}
.rdloot{position:fixed;inset:0;z-index:40;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,rgba(40,20,70,.92),rgba(4,2,10,.97));animation:rdfade .5s}
.rdloot canvas{position:absolute;inset:0;width:100%;height:100%}
.rdloot .panel{position:relative;display:grid;gap:12px;justify-items:center;margin-top:30vh;max-width:94vw;text-align:center;color:#fff2c8;font:14px var(--sans)}
.rdloot h2{margin:0;font:700 22px var(--serif);color:#ffe9a0;text-shadow:0 0 18px #ffb830}
.rdloot .cards{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;min-height:132px}
.rdloot .card{width:118px;padding:10px 8px;display:grid;gap:6px;justify-items:center;background:rgba(18,10,30,.9);border:2px solid var(--c,#8aa);box-shadow:0 0 22px var(--c,#8aa);animation:rdcard .7s cubic-bezier(.2,1.4,.4,1) both}
.rdloot .card .ico{width:60px;height:60px;display:grid;place-items:center;font-size:40px;background:rgba(0,0,0,.4)}
.rdloot .card .ico canvas,.rdloot .card .ico img{position:static;max-width:56px;max-height:56px;width:auto;height:auto}
.rdloot .card b{font:700 12px var(--sans);color:#fff}.rdloot .card small{font:700 10px var(--sans);letter-spacing:.12em;color:var(--c)}
.rdloot .card.rare{--c:#ffcc3a;animation:rdcard .8s cubic-bezier(.2,1.4,.4,1) both,rdglow 1.1s infinite}
.rdloot button{font:700 14px var(--sans);padding:9px 22px;border:1px solid #e0b64a;background:linear-gradient(180deg,#a8761a,#6a4208);color:#fff2c4;cursor:pointer}
@keyframes rdfade{from{opacity:0}}
@keyframes rdcard{from{opacity:0;transform:translateY(60px) scale(.3) rotate(-8deg)}}
@keyframes rdglow{50%{filter:brightness(1.5)}}
@media (max-width:760px){.raidhud{top:auto;bottom:150px;width:200px;font-size:11px}.rdboss{top:52px}}
@media (max-height:520px){.raidhud{top:78px;left:8px;width:176px}.rdboss{top:84px;width:min(300px,38%)}}`;
  document.head.append(st);

  /* ---------- panel ---------- */
  const hud = el('div', 'raidhud'); hud.hidden = true;
  const bossBox = el('div', 'rdboss'); bossBox.hidden = true;
  const mount = () => { const s = $('#stage'); if (s && !hud.parentNode) s.append(hud, bossBox); };
  document.addEventListener('DOMContentLoaded', mount); if (document.readyState !== 'loading') mount();
  let minimised = document.body.classList.contains('touch');      // en el teléfono empieza plegado
  const ROOM_NAMES = ['', 'Ciénaga de Slyvra', 'Cráter de Koros', 'Forja de Aranak', 'Templo de Xaelis', 'Abismo de Malgathor'];
  const near = () => { const e = G.me; return R && R.chest && e && Math.max(Math.abs(e.x - R.chest.x), Math.abs(e.y - R.chest.y)) <= 3; };

  function render() {
    if (!R || !R.on || !G.me || G.me.y < RAID_Y0) { hud.hidden = true; bossBox.hidden = true; return; }
    hud.hidden = false; hud.classList.toggle('min', minimised); hud.style.cursor = minimised ? 'pointer' : '';
    const head = el('h4', '', ''); head.append(el('span', '', '🔮 Santuario de las Cinco Sombras'), el('span', '', minimised ? '▸' : '▾'));
    head.addEventListener('click', () => { minimised = !minimised; render(); });
    const more = el('div', 'more'); 
    const btn = (txt, fn, cls) => { const b = el('button', cls || '', txt); b.type = 'button'; b.addEventListener('click', fn); return b; };
    if (R.hall && !R.run) {
      more.append(el('small', '', 'Raid de 1 a 10 jugadores: 5 cámaras, 5 jefes y un cofre con botín raro al final. Quienes estén ahora en la antecámara entrarán juntos.'),
        btn('⚔️ Iniciar la Raid', () => send({ t: 'raid_go' }), 'gold'));
    } else if (R.run && !R.mine) {
      more.append(el('small', '', `Raid en curso: cámara ${R.room} de 5 (${R.n} jugadores).`), btn('Unirse (solo el primer minuto)', () => send({ t: 'raid_go' })));
    } else if (R.run) {
      more.append(el('small', '', `Cámara ${R.room} de 5 · ${ROOM_NAMES[R.room] || ''} · ${R.n} ${R.n === 1 ? 'jugador' : 'jugadores'} · vidas: ${'❤'.repeat(R.lives)}${'♡'.repeat(Math.max(0, 3 - R.lives))}`));
      if (R.phase === 'transition') more.append(el('b', '', `➡️ Siguiente cámara en ${R.cd}s`));
      if (R.phase === 'chest') {
        const c = R.chest;
        if (c && c.open) more.append(el('b', '', '✅ Ya abriste el cofre'));
        else if (c && !c.can) more.append(el('small', '', 'No participaste: no puedes abrir el cofre.'));
        else { const b = btn(near() ? '🎁 Abrir el cofre' : '🎁 Acércate al cofre', () => send({ t: 'raid_open' }), near() ? 'gold' : ''); b.disabled = !near(); more.append(b); }
        more.append(el('small', '', `El santuario se cierra en ${R.cd}s`));
      }
      if (R.team && R.team.length) { const t = el('div', 'team'); for (const q of R.team) { const r = el('div', 'tm' + (q.d ? ' dead' : '')); const bar = el('i'); const f = el('b'); f.style.width = Math.round(100 * q.h / Math.max(1, q.m)) + '%'; bar.append(f); r.append(el('span', '', q.n.slice(0, 10)), bar); t.append(r); } more.append(t); }
    }
    if (R.run && !R.mine && !R.hall) more.append(btn('Salir', () => send({ t: 'raid_leave' })));
    else if (!R.hall || R.mine) more.append(el('div', 'row'));
    const row = el('div', 'row');
    if (!R.hall) row.append(btn('↩ Salir', () => send({ t: 'raid_leave' })));
    if (R.hall && R.mine) row.append(btn('↪ A la cámara', () => send({ t: 'raid_go' })));
    if (row.children.length) more.append(row);
    hud.replaceChildren(head, more);
    // barra del jefe
    if (R.boss && R.mine) {
      bossBox.hidden = false; bossBox.classList.toggle('sh', !!R.boss.sh);
      bossBox.replaceChildren(el('span', '', R.boss.n + (R.boss.sh ? '  🛡️ inmune' : '')), (() => { const bar = el('div', 'bar'), f = el('b'); f.style.width = Math.max(0, 100 * R.boss.h / R.boss.m) + '%'; bar.append(f); return bar; })(),
        el('small', '', `${Math.round(R.boss.h).toLocaleString('es')} / ${Math.round(R.boss.m).toLocaleString('es')}`));
    } else bossBox.hidden = true;
  }
  X.handlers.raid = (m) => { R = m.on === false ? null : m; render(); };
  X.on('stats', () => { if (R && (!G.me || G.me.y < RAID_Y0)) { R = null; render(); } });
  setInterval(() => { if (R && G.me && G.me.y >= RAID_Y0) render(); }, 700);
  // al entrar en la antecámara pide el estado
  let lastIn = false;
  setInterval(() => { const inn = !!(G.me && G.me.y >= RAID_Y0); if (inn && !lastIn) send({ t: 'raid_info' }); if (!inn && lastIn) { R = null; render(); } lastIn = inn; }, 500);

  /* ---------- efectos de ataques ---------- */
  const TH = { poison: '120,230,70', quake: '240,140,70', fire: '255,110,30', light: '255,230,110', void: '176,100,255' };
  const EL = { poison: 'poison', quake: 'stone', fire: 'fire', light: 'sun', void: 'dark' };
  const px = (x) => X.sxOf(x) + X.TS / 2, py = (y) => X.syOf(y) + X.TS / 2;
  const FXL = [];
  const bossEnt = () => (R && R.boss ? G.ents.get(R.boss.id) : null);
  X.on('fx', (f) => {
    const now = performance.now();
    for (let i = FXL.length - 1; i >= 0; i--) if (now - FXL[i].t > FXL[i].T) FXL.splice(i, 1);
    switch (f.k) {
      case 'rd_w': FXL.push({ k: 'w', t: now, T: f.ms, f }); break;
      case 'rd_h': FXL.push({ k: 'h', t: now, T: 600, f }); X.burst(f.x, f.y, EL[f.th] || 'dark', f.big ? 40 : 18, { sp: f.big ? 7 : 4, up: 4, g: 5, life: 0.7, size: 3.2 }); X.ring(f.x, f.y, EL[f.th] || 'dark', 500, f.r * 30, f.big ? 6 : 4); G.shake = { t: now, m: f.big ? 9 : 3 }; break;
      case 'rd_lw': FXL.push({ k: 'lw', t: now, T: f.ms, f }); break;
      case 'rd_l': FXL.push({ k: 'l', t: now, T: 520, f }); G.shake = { t: now, m: 4 }; break;
      case 'rd_cast': X.casts.set(f.id, now + f.T + 300); X.rdc.set(f.id, { k: f.kind, t: now, T: f.T }); break;
      case 'rd_jump': { const q = X.rdc.get(f.id), e = G.ents.get(f.id); if (q && e) { q.jx = f.x - e.x; q.jy = f.y - e.y; } break; }
      case 'rd_land': { const e = bossEnt(); if (e) { e.rx = f.x; e.ry = f.y; } G.shake = { t: now, m: 8 }; X.burst(f.x, f.y, EL[f.th] || 'stone', 34, { sp: 6, up: 4, g: 4, life: 0.9, size: 3.4 }); X.ring(f.x, f.y, EL[f.th] || 'stone', 700, 90, 6); break; }
      case 'rd_safe': FXL.push({ k: 'safe', t: now, T: f.ms, f }); break;
      case 'rd_all': FXL.push({ k: 'all', t: now, T: 700, f }); G.shake = { t: now, m: 9 }; break;
      case 'rd_pool': FXL.push({ k: 'pool', t: now, T: f.ms, f, s: Math.random() * 99 }); break;
      case 'rd_pull': FXL.push({ k: 'pull', t: now, T: f.ms, f }); break;
      case 'rd_sh': for (let i = FXL.length - 1; i >= 0; i--) if (FXL[i].k === 'sh') FXL.splice(i, 1); if (f.ms > 0) FXL.push({ k: 'sh', t: now, T: f.ms, f }); break;
      case 'rd_chest': if (f.appear) { X.burst(f.x, f.y, 'sun', 50, { sp: 6, up: 6, g: 2, life: 1.2, size: 3.6 }); X.ring(f.x, f.y, 'sun', 900, 70, 6); } else { X.burst(f.x, f.y, f.rare ? 'sun' : 'magic', f.rare ? 70 : 36, { sp: 7, up: 8, g: 3, life: 1.3, size: 3.6 }); X.ring(f.x, f.y, f.rare ? 'sun' : 'magic', 900, 90, 6); } break;
      default: break;
    }
  });
  X.on('under', (c, now) => {
    const TS = X.TS;
    for (const b of FXL) {
      const p = Math.min(1, Math.max(0, (now - b.t) / b.T)), f = b.f, col = TH[f.th] || '176,100,255';
      if (b.k === 'w') {
        const x = px(f.x), y = py(f.y), r = f.r * TS;
        { const gw = c.createRadialGradient(x, y, r * 0.1, x, y, r); gw.addColorStop(0, `rgba(${col},${0.03 + 0.08 * p})`); gw.addColorStop(0.75, `rgba(${col},${0.12 + 0.2 * p})`); gw.addColorStop(1, `rgba(${col},${0.3 + 0.3 * p})`); c.fillStyle = gw; c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); c.fill(); }
        c.strokeStyle = `rgba(${col},${0.55 + 0.4 * Math.abs(Math.sin(now / 70))})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); c.stroke();
        c.strokeStyle = `rgba(255,255,255,${0.25 + 0.3 * p})`; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, r * p, r * 0.82 * p, 0, 0, 7); c.stroke();
        if (f.big) for (let i = 0; i < 10; i++) { const a = i * 0.628 + 0.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * p, y + Math.sin(a) * r * p * 0.82); c.stroke(); }
      } else if (b.k === 'h') {
        const x = px(f.x), y = py(f.y), r = f.r * TS, al = 1 - p, g = c.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${0.85 * al})`); g.addColorStop(0.5, `rgba(${col},${0.6 * al})`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r * (0.7 + 0.4 * p), r * 0.82 * (0.7 + 0.4 * p), 0, 0, 7); c.fill();
      } else if (b.k === 'lw' || b.k === 'l') {
        const x1 = px(f.x), y1 = py(f.y), x2 = px(f.x2), y2 = py(f.y2), a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), w = f.w * TS;
        c.save(); c.translate(x1, y1); c.rotate(a);
        if (b.k === 'lw') { c.fillStyle = `rgba(${col},${0.06 + 0.2 * p})`; c.fillRect(0, -w, L, w * 2); c.strokeStyle = `rgba(${col},${0.5 + 0.4 * Math.abs(Math.sin(now / 70))})`; c.lineWidth = 2; c.strokeRect(0, -w, L, w * 2); c.fillStyle = `rgba(255,255,255,${0.15 + 0.3 * p})`; c.fillRect(0, -2, L * p, 4); }
        else { const al = 1 - p, g = c.createLinearGradient(0, -w, 0, w); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(255,255,255,${al})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(0, -w * (1 - 0.4 * p), L, w * 2 * (1 - 0.4 * p)); c.fillStyle = `rgba(${col},${0.5 * al})`; c.fillRect(0, -w, L, w * 2); }
        c.restore();
      } else if (b.k === 'pool') {
        const x = px(f.x), y = py(f.y), r = f.r * TS, al = Math.min(1, (1 - p) * 6) * Math.min(1, p * 8 + 0.2), g = c.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, `rgba(${col},${0.55 * al})`); g.addColorStop(0.8, `rgba(${col},${0.3 * al})`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); c.fill();
        for (let i = 0; i < 6; i++) { const u = (now / 700 + i * 0.17 + b.s) % 1; c.fillStyle = `rgba(${col},${0.7 * al * (1 - u)})`; c.beginPath(); c.arc(x + Math.sin(i * 2.7 + b.s) * r * 0.65, y - u * 22 + Math.cos(i * 1.9) * r * 0.3, 2 + (1 - u) * 2, 0, 7); c.fill(); }
      } else if (b.k === 'pull') {
        const x = px(f.x), y = py(f.y), r = f.r * TS;
        for (let i = 0; i < 3; i++) { const u = ((now / 600 + i / 3) % 1); c.strokeStyle = `rgba(${col},${0.7 * (1 - u)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r * (1 - u), r * 0.82 * (1 - u), 0, 0, 7); c.stroke(); }
        const g = c.createRadialGradient(x, y, 1, x, y, TS * 2.2); g.addColorStop(0, `rgba(0,0,0,${0.9 * p})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, TS * 2.2, 0, 7); c.fill();
      } else if (b.k === 'safe') {                                                       // zona segura: el resto del suelo estalla
        const x = px(f.x), y = py(f.y), r = f.r * TS, al = p > 0.96 ? 0 : 1, pu = 0.5 + 0.5 * Math.sin(now / 120);
        const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, `rgba(190,255,200,${0.42 * al})`); g.addColorStop(0.8, `rgba(120,255,160,${(0.22 + 0.12 * pu) * al})`); g.addColorStop(1, 'rgba(120,255,160,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(210,255,225,${0.7 + 0.3 * pu})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y, r, r * 0.82, 0, 0, 7); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y, r * (1 - p), r * 0.82 * (1 - p), 0, 0, 7); c.stroke();
        c.fillStyle = 'rgba(0,0,0,.55)'; c.font = '700 11px sans-serif'; c.textAlign = 'center'; c.fillText('SEGURO', x + 1, y + 4); c.fillStyle = '#eafff0'; c.fillText('SEGURO', x, y + 3);
      } else if (b.k === 'all') {
        const x = px(f.x), y = py(f.y), g = c.createRadialGradient(x, y, 10, x, y, TS * 34); g.addColorStop(0, `rgba(${col},${0.5 * (1 - p)})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - TS * 34, y - TS * 34, TS * 68, TS * 68);
      } else if (b.k === 'sh') {
        const e = bossEnt(), x = e ? X.sxOf(e.rx != null ? e.rx : e.x) + TS / 2 : px(f.x), y = e ? X.syOf(e.ry != null ? e.ry : e.y) + TS / 2 : py(f.y), r = TS * 3, al = Math.min(1, (1 - p) * 4);
        c.fillStyle = `rgba(150,220,255,${0.13 * al})`; c.beginPath(); c.ellipse(x, y - TS * 0.6, r, r * 1.05, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(190,235,255,${0.5 * al + 0.2 * Math.sin(now / 150)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y - TS * 0.6, r, r * 1.05, 0, 0, 7); c.stroke();
      }
    }
    drawChest(c, now);
  });

  /* ---------- cofre ---------- */
  function chestShape(c, x, y, s, open, now, glow) {
    // x,y = centro de la base. s = tamaño (px por casilla). open 0..1
    const w = s * 1.3, h = s * 0.7, lidH = s * 0.45;
    if (glow) { const g = c.createRadialGradient(x, y - h * 0.4, 2, x, y - h * 0.4, s * (2.2 + open)); g.addColorStop(0, `rgba(255,220,120,${0.55 + 0.2 * Math.sin(now / 220)})`); g.addColorStop(1, 'rgba(255,200,80,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y - h * 0.4, s * (2.2 + open), 0, 7); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x, y + 2, w * 0.62, s * 0.18, 0, 0, 7); c.fill();
    const body = () => { const g = c.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, '#7a4a22'); g.addColorStop(1, '#4a2a10'); c.fillStyle = g; c.fillRect(x - w / 2, y - h, w, h); c.fillStyle = '#e0b64a'; c.fillRect(x - w / 2 - 1, y - h, w + 2, 3); c.fillRect(x - w / 2 - 1, y - 3, w + 2, 3); c.fillRect(x - w / 2 - 1, y - h, 4, h); c.fillRect(x + w / 2 - 3, y - h, 4, h); };
    if (open > 0.02) {                                            // interior iluminado
      c.fillStyle = '#2a1608'; c.fillRect(x - w / 2 + 3, y - h - 2, w - 6, 5);
      const bm = c.createLinearGradient(0, y - h, 0, y - h - s * 2.4 * open); bm.addColorStop(0, `rgba(255,236,160,${0.9 * open})`); bm.addColorStop(1, 'rgba(255,220,120,0)');
      c.fillStyle = bm; c.beginPath(); c.moveTo(x - w * 0.4, y - h); c.lineTo(x - w * 0.9, y - h - s * 2.4 * open); c.lineTo(x + w * 0.9, y - h - s * 2.4 * open); c.lineTo(x + w * 0.4, y - h); c.closePath(); c.fill();
    }
    body();
    c.save(); c.translate(x, y - h);                              // tapa articulada en la parte trasera
    const ang = -open * 1.25; c.translate(0, 0); c.rotate(ang * 0); c.scale(1, 1 - 0.55 * open); c.translate(0, -open * lidH * 0.9);
    const lg = c.createLinearGradient(0, -lidH, 0, 0); lg.addColorStop(0, '#9a6230'); lg.addColorStop(1, '#6a3c18'); c.fillStyle = lg;
    c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(-w / 2, -lidH * 1.35, 0, -lidH * 1.35); c.quadraticCurveTo(w / 2, -lidH * 1.35, w / 2, 0); c.closePath(); c.fill();
    c.fillStyle = '#e0b64a'; c.fillRect(-w / 2, -3, w, 3); c.fillRect(-4, -lidH * 1.3, 8, lidH * 1.3);
    c.fillStyle = '#fff1a0'; c.fillRect(-3, -lidH * 0.55, 6, 7);
    c.restore();
  }
  function drawChest(c, now) {
    if (!R || !R.on || !R.chest || !G.me || G.me.y < RAID_Y0) return;
    const x = px(R.chest.x), y = py(R.chest.y) + X.TS * 0.3;
    chestShape(c, x, y, X.TS, R.chest.open ? 0.9 : 0, now, true);
    if (!R.chest.open && R.mine && R.chest.can) { c.fillStyle = '#fff'; c.font = '700 11px sans-serif'; c.textAlign = 'center'; c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeText(near() ? 'E · Abrir' : '🎁 Cofre', x, y - X.TS * 1.3); c.fillText(near() ? 'E · Abrir' : '🎁 Cofre', x, y - X.TS * 1.3); }
  }
  const tryOpen = () => { if (R && R.chest && R.mine && !R.chest.open && near()) { send({ t: 'raid_open' }); return true; } return false; };
  X.on('key', (k) => (k === 'e' ? tryOpen() : false));
  X.on('click', (t) => (R && R.chest && Math.abs(t.x - R.chest.x) <= 1 && Math.abs(t.y - R.chest.y) <= 1 ? tryOpen() : false));

  /* ---------- animación de apertura ---------- */
  const RARITY = { common: '#8ac7ff', rare: '#ffcc3a' };
  X.handlers.raid_loot = (m) => {
    const ov = el('div', 'rdloot'), cv = el('canvas'), panel = el('div', 'panel'), title = el('h2', '', 'Abriendo el cofre…'), cards = el('div', 'cards');
    const ok = el('button', '', 'Recoger'); ok.type = 'button'; ok.hidden = true; ok.addEventListener('click', () => { stop = true; ov.remove(); });
    panel.append(title, cards, ok); ov.append(cv, panel); document.body.append(ov);
    const dpr = Math.min(2, window.devicePixelRatio || 1); const rs = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }; rs();
    const c = cv.getContext('2d'); let stop = false; const t0 = performance.now(); const parts = []; let revealed = 0;
    const rare = m.items.some((o) => o.rare);
    const items = m.items.slice(); const total = items.length;
    const spawn = (n, rareB) => { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, v = 160 + Math.random() * (rareB ? 520 : 320); parts.push({ x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 + Math.random() * 1.2, t: 0, s: 2 + Math.random() * 4, c: rareB ? ['#ffe27a', '#fff6c8', '#ffb830'][i % 3] : ['#bfe4ff', '#fff', '#8ac7ff'][i % 3] }); } };
    let shook = false, burst1 = false;
    const frame = (now) => {
      if (stop) return; const t = (now - t0) / 1000, W = cv.width, H = cv.height, s = Math.min(W, H) / dpr * 0.2 * dpr, cx = W / 2, cy = H * 0.3;
      c.clearRect(0, 0, W, H);
      const open = t < 1.6 ? 0 : Math.min(1, (t - 1.6) / 0.5);
      // rayos
      if (open > 0) { c.save(); c.translate(cx, cy - s * 0.4); c.globalCompositeOperation = 'lighter'; const nr = rare ? 16 : 10; for (let i = 0; i < nr; i++) { const a = i / nr * 6.283 + t * (rare ? 0.5 : 0.3); const g = c.createLinearGradient(0, 0, Math.cos(a) * s * 9, Math.sin(a) * s * 9); g.addColorStop(0, rare ? 'rgba(255,220,100,.5)' : 'rgba(170,215,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s * 9, a - 0.07, a + 0.07); c.closePath(); c.fill(); } c.restore(); }
      // temblor antes de abrir
      const sh = t < 1.6 ? Math.sin(t * 60) * (1 + t * 3) * (s / 60) : 0;
      chestShape(c, cx + sh, cy + s, s * 1.0, open, performance.now(), true);
      if (t >= 1.6 && !burst1) { burst1 = true; spawn(rare ? 120 : 60, rare); title.textContent = rare ? '✨ ¡BOTÍN RARO! ✨' : '¡El cofre se abre!'; if (X.sfx) try { X.sfx(rare ? 'levelup' : 'pickup'); } catch (e) { /* sin audio */ } }
      if (burst1 && revealed < total && t > 2.0 + revealed * 0.9) {
        const o = items[revealed++], it = G.items[o.id] || {}, card = el('div', 'card' + (o.rare ? ' rare' : '')); card.style.setProperty('--c', o.rare ? RARITY.rare : RARITY.common);
        const ic = el('div', 'ico'); ic.append(X.iconNode ? X.iconNode(o.id) : it.icon || '?'); card.append(ic, el('b', '', it.name || o.id), el('small', '', o.rare ? '★ RARO ★' : 'Botín de la Raid')); cards.append(card); spawn(o.rare ? 70 : 24, o.rare);
        if (revealed === total) { setTimeout(() => { if (stop) return; const g = el('div', 'card'); g.style.setProperty('--c', '#e0b64a'); const gi = el('div', 'ico', '💰'); g.append(gi, el('b', '', '+' + m.gold.toLocaleString('es') + ' oro'), el('small', '', 'Y recompensas')); for (const e of m.extra || []) g.append(el('b', '', `${G.items[e.id] ? G.items[e.id].icon : ''} ${nameOf(e.id)} ×${e.q}`)); cards.append(g); ok.hidden = false; }, 700); }
      }
      c.save(); c.translate(cx, cy - s * 0.4); c.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += 1 / 60; q.x += q.vx / 60; q.y += q.vy / 60; q.vy += 340 / 60; if (q.t > q.life) { parts.splice(i, 1); continue; } c.globalAlpha = 1 - q.t / q.life; c.fillStyle = q.c; c.fillRect(q.x, q.y, q.s, q.s); }
      c.restore();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    window.addEventListener('resize', rs, { once: true });
  };
})();
