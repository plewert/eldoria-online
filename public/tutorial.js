'use strict';
/* Tutorial inicial guiado: moverse, hablar con un PNJ, equipar un arma y atacar. Flechas doradas señalan el objetivo
   (y una brújula en el panel, útil en la vista 3D). Se muestra una vez por personaje; F1 lo repite y «Saltar» lo cierra. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $, store } = X;
  const TS = 32;
  const touch = (() => { try { return 'ontouchstart' in window || matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } })();

  const css = document.createElement('style');
  css.textContent = `
.tut{position:absolute;top:58px;left:50%;transform:translateX(-50%);z-index:30;width:min(360px,calc(100% - 24px));background:rgba(14,18,24,.92);border:1px solid #c9a24b;border-radius:10px;padding:10px 12px 9px;color:#e8e2d0;box-shadow:0 6px 22px rgba(0,0,0,.55);font:13px/1.4 "Segoe UI",system-ui,sans-serif;animation:tutIn .35s ease-out}
.tut[hidden]{display:none}
.tut .hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.tut .hd b{flex:1;font:700 14px "Segoe UI",system-ui,sans-serif;color:#ffd77a}
.tut .hd small{color:#9aa6b4;font-size:11px}
.tut .skip{background:none;border:0;color:#8f9aa8;font-size:11px;cursor:pointer;text-decoration:underline;padding:2px 4px}
.tut p{margin:0 0 6px}
.tut .dots{display:flex;gap:5px;margin-top:6px}
.tut .dots i{flex:1;height:4px;border-radius:2px;background:#2a3544}
.tut .dots i.on{background:#7bb36f}.tut .dots i.cur{background:#ffd24a;animation:tutBlink 1s infinite}
.tut .dir{display:flex;align-items:center;gap:8px;margin-top:2px;color:#ffd77a;font-weight:600}
.tut .dir span{display:inline-block;font-size:18px;transition:transform .2s}
.tut .keys{display:inline-flex;gap:3px;margin-left:4px;vertical-align:middle}
.tut .keys kbd{min-width:20px;padding:1px 5px;border:1px solid #6c7a8a;border-bottom-width:2px;border-radius:4px;background:#1c2530;color:#fff;font:600 11px monospace;text-align:center}
.tut .ok{display:inline-block;margin-top:4px;padding:5px 14px;background:#3e7a3a;border:1px solid #7bb36f;border-radius:6px;color:#fff;font-weight:700;cursor:pointer}
.tut.win{border-color:#7bb36f}
.tut-pulse{outline:2px solid #ffd24a!important;outline-offset:1px;animation:tutP 1s ease-in-out infinite;position:relative;z-index:5}
@keyframes tutIn{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes tutBlink{50%{opacity:.35}}
@keyframes tutP{0%,100%{box-shadow:0 0 0 0 rgba(255,210,74,.7)}50%{box-shadow:0 0 12px 4px rgba(255,210,74,.9)}}
@media (max-width:700px),(pointer:coarse){.tut{top:46px;font-size:12px;padding:7px 9px}.tut .hd b{font-size:13px}}`;
  document.head.append(css);

  const box = el('div', 'tut'); box.hidden = true; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  const mount = () => { const st = $('#stage'); if (st && !box.parentNode) st.append(box); };
  document.addEventListener('DOMContentLoaded', mount); if (document.readyState !== 'loading') mount();

  const nearestMonster = () => {
    const me = G.me; if (!me) return null; let best = null, bd = 1e9;
    for (const e of G.ents.values()) { if (e.kind !== 'mo') continue; const d = G.mons[e.t]; if (!d || d.boss) continue; const dd = Math.hypot(e.rx - me.x, e.ry - me.y); if (dd < bd) { bd = dd; best = e; } }
    return best;
  };
  const npc = (id) => G.npcs.find((n) => n.id === id);
  const KEYS = '<span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span> o las <span class="keys"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></span>';

  const STEPS = [
    { id: 'move', title: 'Muévete', html: () => touch ? 'Usa el <b>joystick</b> o toca el suelo para caminar. Recorre unas 3 casillas.' : `Camina con ${KEYS}, o haz <b>clic en el suelo</b>. Recorre unas 3 casillas.` },
    { id: 'talk', title: 'Habla con Orin el Sabio', html: () => 'Sigue la <b>flecha dorada</b> hasta <b>Orin</b> y haz clic sobre él. Los PNJ te venden equipo, guardan tu oro y dan consejos.', target: () => { const n = npc('orin'); return n ? { x: n.x, y: n.y, label: 'Orin' } : null; } },
    { id: 'equip', title: 'Equipa un arma', html: () => 'En tu <b>mochila</b>, haz clic en el objeto que brilla para equiparlo. El <b>Arco Corto</b> dispara de lejos; la <b>Vara</b> lanza magia.' },
    { id: 'attack', title: 'Ataca a un monstruo', html: () => 'Sal de la ciudad hacia el <b>sur</b> y haz <b>clic en una rata o un conejo</b>. Tu personaje atacará solo. ¡Bebe una poción si baja tu vida!', target: () => { const m = nearestMonster(); return m ? { x: m.rx, y: m.ry, label: (G.mons[m.t] || {}).name || 'Monstruo' } : { x: 97, y: 76, label: 'Zona de ratas' }; } },
    { id: 'end', title: '¡Listo, aventurero!', html: () => 'Los <b>rombos del minimapa</b> son portales a otras zonas (rojo: PvP). Habla con los PNJ para misiones y mejora tu equipo. Pulsa <b>F1</b> para repetir este tutorial.' },
  ];

  let step = -1, name = '', started = false, moved0 = null, w0 = null, lastTg = -1e9, doneAt = 0, pulseT = null;
  const flagKey = () => 'eldoria.tut.' + name;
  const finish = (mark) => { step = -1; box.hidden = true; clearPulse(); if (mark) store.set(flagKey(), '1'); };
  const clearPulse = () => { document.querySelectorAll('.tut-pulse').forEach((n) => n.classList.remove('tut-pulse')); if (pulseT) { clearInterval(pulseT); pulseT = null; } };

  function render() {
    if (step < 0) return;
    const s = STEPS[step], last = step === STEPS.length - 1;
    box.hidden = false; box.classList.toggle('win', last);
    box.innerHTML = '';
    const hd = el('div', 'hd'); hd.append(el('b', '', (last ? '🎉 ' : '📖 ') + s.title), el('small', '', last ? '' : `Paso ${step + 1} de ${STEPS.length - 1}`));
    const sk = el('button', 'skip', 'Saltar'); sk.type = 'button'; sk.addEventListener('click', () => finish(true)); if (!last) hd.append(sk);
    const p = el('p'); p.innerHTML = s.html(); box.append(hd, p);
    if (s.target || s.id === 'move') { const d = el('div', 'dir'); d.id = 'tutDir'; d.hidden = !s.target; d.innerHTML = '<span>➤</span><em></em>'; box.append(d); }
    if (last) { const ok = el('button', 'ok', '¡A jugar!'); ok.type = 'button'; ok.addEventListener('click', () => finish(true)); box.append(ok); }
    const dots = el('div', 'dots'); STEPS.slice(0, -1).forEach((_, i) => dots.append(el('i', i < step ? 'on' : i === step ? 'cur' : ''))); if (!last) box.append(dots);
    clearPulse();
    if (s.id === 'equip') {                                                 // resalta la mochila y el arma recomendada
      const tick = () => {
        document.querySelectorAll('.tut-pulse').forEach((n) => n.classList.remove('tut-pulse'));
        const slots = [...document.querySelectorAll('#inv .slot')], pick = slots.find((n) => n._it && n._it[0] === 'arco_corto') || slots.find((n) => n._it && n._it[0] === 'vara_novato') || slots.find((n) => n._it && G.items[n._it[0]] && G.items[n._it[0]].type === 'weapon');
        if (pick) pick.classList.add('tut-pulse');
      };
      tick(); pulseT = setInterval(tick, 600);
    }
  }
  const go = (i) => { step = i; w0 = G.eq && G.eq.weapon ? G.eq.weapon[0] : null; render(); };
  const advance = () => {                                                  // pequeño aplauso antes de pasar al siguiente
    if (step < 0 || performance.now() - doneAt < 900) return; doneAt = performance.now();
    X.sfx && X.sfx(step === STEPS.length - 2 ? 'levelup' : 'pickup');
    if (G.me) { X.burst(G.me.x, G.me.y - 0.3, 'sun', 18, { sp: 3.4, up: 2, life: 0.8, size: 2.6 }); X.ring(G.me.x, G.me.y, 'sun', 600, 30, 3); }
    box.classList.add('win'); setTimeout(() => { box.classList.remove('win'); go(step + 1); }, 650);
  };

  function begin(force) {
    if (started && !force) return;
    const me = G.ents.get(G.id); if (!me || !G.stats || !G.me) return;
    name = me.n || ''; started = true;
    if (!force && (store.get(flagKey()) === '1' || G.stats.lv >= 5)) { store.set(flagKey(), '1'); return; }
    moved0 = { x: G.me.x, y: G.me.y }; go(0);
  }
  X.on('stats', () => begin(false));
  X.on('snap', () => {
    if (step < 0) { begin(false); return; }
    const me = G.me; if (!me) return;
    if (me.tg) lastTg = performance.now();
    if (STEPS[step].id === 'move' && moved0 && Math.max(Math.abs(me.x - moved0.x), Math.abs(me.y - moved0.y)) >= 3) advance();
    if (STEPS[step].id === 'equip' && G.eq && G.eq.weapon && G.eq.weapon[0] !== w0) advance();
    const s = STEPS[step], dir = $('#tutDir');
    if (dir && s.target) {
      const t = s.target(); if (!t) return;
      const dx = t.x - me.x, dy = t.y - me.y, d = Math.max(Math.abs(dx), Math.abs(dy));
      dir.querySelector('span').style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      dir.querySelector('em').textContent = d <= 1 ? `¡${t.label} está aquí!` : `${t.label}: a ${Math.round(Math.hypot(dx, dy))} casillas`;
    }
  });
  X.on('inv', () => { if (step >= 0 && STEPS[step].id === 'equip' && G.eq && G.eq.weapon && G.eq.weapon[0] !== w0) advance(); });
  X.on('chat', (m) => { if (step >= 0 && STEPS[step].id === 'talk' && m && m.k === 'n') advance(); });
  X.on('fx', (f) => {
    if (step < 0 || STEPS[step].id !== 'attack' || f.k !== 'x' || !G.me) return;
    if (Math.max(Math.abs(f.x - G.me.x), Math.abs(f.y - G.me.y)) <= 10) advance();
  });
  X.on('key', (k, ev) => { if (ev && ev.key === 'F1') { ev.preventDefault(); begin(true); return true; } return false; });

  /* flecha dorada que rebota sobre el objetivo; en el borde de la pantalla si queda fuera de vista (solo vista 2D) */
  X.on('draw', (c, now, cw, ch) => {
    if (step < 0 || !G.me || (X.mode3d && X.mode3d())) return;
    const s = STEPS[step]; if (!s.target) return; const t = s.target(); if (!t) return;
    const x = (t.x - G.cam.x) * TS + cw / 2, y = (t.y - G.cam.y) * TS + ch / 2, bob = Math.sin(now / 220) * 4, m = 26;
    c.save();
    if (x > m && x < cw - m && y > m + 30 && y < ch - m) {
      const gr = c.createRadialGradient(x, y + 8, 4, x, y + 8, 26); gr.addColorStop(0, 'rgba(255,210,74,.45)'); gr.addColorStop(1, 'rgba(255,210,74,0)');
      c.fillStyle = gr; c.beginPath(); c.ellipse(x, y + 10, 26, 12, 0, 0, 7); c.fill();
      c.strokeStyle = `rgba(255,224,120,${0.5 + 0.3 * Math.sin(now / 250)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y + 10, 18 + Math.sin(now / 250) * 3, 8, 0, 0, 7); c.stroke();
      const ay = y - 38 + bob;
      c.fillStyle = '#ffd24a'; c.strokeStyle = '#5a3a00'; c.lineWidth = 2; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(x, ay + 14); c.lineTo(x - 11, ay); c.lineTo(x - 4, ay); c.lineTo(x - 4, ay - 12); c.lineTo(x + 4, ay - 12); c.lineTo(x + 4, ay); c.lineTo(x + 11, ay); c.closePath(); c.stroke(); c.fill();
      X.outlined(c, t.label, x, ay - 20, '#ffe9a0', 'bold 12px "Segoe UI", sans-serif');
    } else {
      const ang = Math.atan2(y - ch / 2, x - cw / 2), ex = Math.max(m, Math.min(cw - m, cw / 2 + Math.cos(ang) * cw)), ey = Math.max(m + 36, Math.min(ch - m, ch / 2 + Math.sin(ang) * ch));
      c.translate(ex, ey); c.rotate(ang);
      c.fillStyle = '#ffd24a'; c.strokeStyle = '#5a3a00'; c.lineWidth = 2; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(14 + Math.sin(now / 220) * 3, 0); c.lineTo(-8, -11); c.lineTo(-3, 0); c.lineTo(-8, 11); c.closePath(); c.stroke(); c.fill();
    }
    c.restore();
  });
})();
