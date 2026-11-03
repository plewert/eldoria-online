'use strict';
/* Guía de paneles: visita guiada que resalta cada panel y botón del juego y explica para qué sirve.
   - Sale sola una vez para los jugadores nuevos, cuando terminan (o saltan) el tutorial inicial.
   - El botón ❓ de la barra (o F2) la abre cuando quieras; a veces un aviso recuerda que existe.
   - Flechas ← → o Enter para moverte, Esc para cerrar. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, $, store } = X;

  const css = document.createElement('style');
  css.textContent = `
.gd-spot{position:fixed;z-index:70;border:2px solid #ffd77a;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.68),0 0 16px 3px rgba(255,215,122,.65);pointer-events:none;transition:all .25s ease}
.gd-pop{position:fixed;z-index:71;width:min(340px,calc(100vw - 20px));background:rgba(26,20,13,.97);border:1px solid #c9a24b;border-radius:12px;padding:12px 14px 12px;color:#ece4d2;font:14px/1.45 "Segoe UI",system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.6)}
.gd-pop small{color:#c9b98e;font-size:11px;letter-spacing:.4px}
.gd-pop h3{margin:2px 0 6px;color:#ffd77a;font-size:19px}
.gd-pop p{margin:0 0 5px}
.gd-bar{height:5px;border-radius:3px;background:#46391f;margin:8px 0 10px;overflow:hidden}.gd-bar i{display:block;height:100%;background:#ffd77a}
.gd-row{display:flex;align-items:center;gap:8px}
.gd-row .sk{background:none;border:0;color:#a89d82;font-size:12px;text-decoration:underline;cursor:pointer;padding:2px 0;margin-right:auto}
.gd-row button.b{min-height:34px;padding:0 14px;border-radius:8px;border:1px solid #c9a24b;background:#3b3220;color:#f1e6c8;font-weight:700;cursor:pointer}
.gd-row button.b.main{background:#ffd77a;color:#1d1608}
.gd-hint{position:fixed;z-index:55;top:58px;left:50%;transform:translateX(-50%);max-width:min(380px,calc(100vw - 20px));background:rgba(26,20,13,.96);border:1px solid #c9a24b;border-radius:10px;padding:8px 12px;color:#ece4d2;font:13px/1.4 "Segoe UI",system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.5)}
.gd-hint b{color:#ffd77a}
@media (max-width:700px){.gd-pop{font-size:13px}}`;
  document.head.append(css);

  const menuBtn = (t) => () => [...document.querySelectorAll('.menu2 button')].find((b) => (b.title || '').startsWith(t));
  const q = (s) => () => document.querySelector(s);
  // cada paso: título, elemento a resaltar y texto (lista de párrafos). Si el elemento no está visible, el paso se omite.
  const STEPS = [
    { t: 'Tu mochila', sel: q('#inv'), p: ['Aquí guardas tus objetos. <b>Clic</b> para usar o equipar, <b>arrastra</b> para moverlos (en móvil, mantén pulsado y arrastra).', 'Con <b>Shift + clic</b> sueltas el objeto al suelo.'] },
    { t: 'Equipo', sel: q('#equip'), p: ['Lo que llevas puesto: arma, armadura, anillos, amuleto y más. Arrastra un objeto de la mochila a su casilla para equiparlo.', 'Clic derecho (o mantener pulsado) en un objeto muestra sus estadísticas y sus ranuras de gemas.'] },
    { t: 'Habilidades', sel: q('#skills'), p: ['Tu nivel y tus habilidades de combate (cuerpo a cuerpo, arco, magia), pesca y minería. Suben solas al usarlas.'] },
    { t: 'Auto golpe', sel: q('#autoRet'), p: ['Si lo activas, respondes automáticamente a quien te ataque, sin tener que hacer clic.'] },
    { t: 'Chat', sel: q('#chatBar'), p: ['Aquí salen los mensajes del juego y de otros jugadores. Escribe <b>/ayuda</b> para ver los comandos y <b>/torneo</b> para inscribirte al torneo.'] },
    { t: 'Colección de jefes', sel: menuBtn('Colección'), key: 'B', p: ['Los objetos que ya soltó cada jefe. Sirve para saber qué te falta conseguir.'] },
    { t: 'Misiones', sel: menuBtn('Misiones'), key: 'Q', p: ['Lo que te piden los PNJ y cuánto te falta. Dan oro, experiencia y objetos.', 'Habla con Boris, Orin o Nilo para recibir nuevas.'] },
    { t: 'Logros y títulos', sel: menuBtn('Logros'), key: 'L', p: ['Metas del juego. Al cumplirlas ganas títulos que puedes mostrar junto a tu nombre.'] },
    { t: 'Grupo y gremio', sel: menuBtn('Grupo'), key: 'G', p: ['Crea un grupo para cazar con amigos (comparten experiencia) o únete a un gremio con chat propio.'] },
    { t: 'Ranking', sel: menuBtn('Ranking'), key: 'R', p: ['Los mejores jugadores del servidor por nivel y por jefes derrotados.'] },
    { t: 'Mercado de jugadores', sel: menuBtn('Mercado'), key: 'P', p: ['Compra y vende objetos a otros jugadores al precio que tú pongas. El mercado cobra una pequeña comisión por vender.'] },
    { t: 'Fabricar', sel: menuBtn('Fabricar'), key: 'F', p: ['Convierte materiales que recolectas en pociones, equipo y herramientas.'] },
    { t: 'Pesca', sel: menuBtn('Pesca'), key: 'O', p: ['Pesca con una caña en el agua. Los peces se venden o se cocinan, y con suerte salen mascotas raras.'] },
    { t: 'Minería', sel: menuBtn('Miner'), key: 'U', p: ['Rompe rocas con un pico en las minas. Dan minerales y, muy rara vez, gemas para engarzar en tu equipo.'] },
    { t: 'Mapa del mundo', sel: menuBtn('Mapa'), key: 'N', p: ['Todo el mundo de Eldoria con tu posición. Los rombos son portales a otras zonas; en rojo, las zonas PvP.'] },
    { t: 'Diario de Historia', sel: menuBtn('Diario'), key: 'Y', p: ['Cada cueva de jefe tiene su historia: lee las 3 tablillas y derrota al jefe para completarla.'] },
  ];

  const spot = el('div', 'gd-spot'), pop = el('div', 'gd-pop');
  spot.hidden = pop.hidden = true; document.body.append(spot, pop);
  let list = [], idx = -1, name = '';
  const gk = () => 'eldoria.guia.' + name;
  const visible = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.left < innerWidth && r.top < innerHeight ? r : null; };

  function place(r) {
    const pad = 6, w = pop.offsetWidth || 340, h = pop.offsetHeight || 180, M = 10;
    Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    let x, y;
    if (innerWidth < 560) { x = (innerWidth - w) / 2; y = r.top > innerHeight / 2 ? Math.max(M, r.top - h - 14) : Math.min(innerHeight - h - M, r.bottom + 14); }
    else if (r.right + 16 + w < innerWidth) { x = r.right + 16; y = r.top + r.height / 2 - h / 2; }
    else if (r.left - 16 - w > 0) { x = r.left - 16 - w; y = r.top + r.height / 2 - h / 2; }
    else { x = r.left + r.width / 2 - w / 2; y = r.bottom + 14 + h < innerHeight ? r.bottom + 14 : r.top - h - 14; }
    pop.style.left = Math.max(M, Math.min(innerWidth - w - M, x)) + 'px'; pop.style.top = Math.max(M, Math.min(innerHeight - h - M, y)) + 'px';
  }
  function render() {
    if (idx < 0) return;
    const s = list[idx], r = visible(s.sel());
    if (!r) { list.splice(idx, 1); if (idx >= list.length) idx = list.length - 1; if (idx < 0) return close(true); return render(); }
    spot.hidden = pop.hidden = false; pop.innerHTML = '';
    const last = idx === list.length - 1;
    pop.append(el('small', '', `GUÍA DEL JUEGO · Paso ${idx + 1} de ${list.length}`), el('h3', '', s.t));
    for (const t of s.p) { const p = el('p'); p.innerHTML = t; pop.append(p); }
    if (s.key) pop.append(el('small', '', `Atajo de teclado: ${s.key}`));
    const bar = el('div', 'gd-bar'), i = el('i'); i.style.width = ((idx + 1) / list.length * 100) + '%'; bar.append(i); pop.append(bar);
    const row = el('div', 'gd-row'), sk = el('button', 'sk', last ? '' : 'Saltar guía'); sk.type = 'button'; sk.addEventListener('click', () => close(true));
    const back = el('button', 'b', '‹ Atrás'), next = el('button', 'b main', last ? '¡Entendido!' : 'Siguiente ›');
    back.type = next.type = 'button'; back.disabled = idx === 0; back.addEventListener('click', () => go(-1)); next.addEventListener('click', () => go(1));
    row.append(...(last ? [] : [sk]), ...(idx ? [back] : []), next); pop.append(row);
    place(r);
  }
  function go(d) { if (idx + d >= list.length) return close(true); idx = Math.max(0, idx + d); render(); }
  function close(mark) { idx = -1; spot.hidden = pop.hidden = true; window.removeEventListener('keydown', kd, true); window.removeEventListener('resize', render); if (mark && name) store.set(gk(), '1'); }
  const kd = (ev) => {
    if (ev.key === 'Escape') close(true); else if (ev.key === 'ArrowRight' || ev.key === 'Enter' || ev.key === ' ') go(1); else if (ev.key === 'ArrowLeft') go(-1); else return;
    ev.preventDefault(); ev.stopPropagation();
  };
  function open() {
    if (!name) { const me = G.ents.get(G.id); name = (me && me.n) || ''; }
    document.querySelectorAll('.gd-hint').forEach((n) => n.remove());
    list = STEPS.slice(); idx = 0; window.addEventListener('keydown', kd, true); window.addEventListener('resize', render); render();
  }
  X.guia = { open };

  /* botón ❓ en la barra y atajo F2 */
  const mk = () => { const b0 = document.querySelector('.menu2'); if (!b0 || b0.querySelector('.gd-btn')) return; const b = el('button', 'gd-btn', '❓'); b.type = 'button'; b.title = 'Guía de paneles (F2)'; b.setAttribute('aria-label', 'Guía de paneles'); b.addEventListener('click', open); b0.append(b); };
  document.addEventListener('DOMContentLoaded', () => setTimeout(mk, 80)); if (document.readyState !== 'loading') setTimeout(mk, 80);
  X.on('key', (k, ev) => { if (ev && ev.key === 'F2') { ev.preventDefault(); open(); return true; } return false; });

  /* aparición: sola para jugadores nuevos (tras el tutorial); a veces un aviso recuerda que existe la ayuda */
  function hint() {
    const h = el('div', 'gd-hint'); h.innerHTML = '💡 ¿Necesitas ayuda? Pulsa <b>❓</b> o <b>F2</b> para ver la guía de paneles.'; document.body.append(h);
    const rm = () => h.remove(); h.addEventListener('click', () => { rm(); open(); }); setTimeout(rm, 9000);
  }
  let started = false;
  X.on('stats', () => {
    if (started) return; const me = G.ents.get(G.id); if (!me || !G.stats) return; started = true; name = me.n || '';
    if (store.get(gk()) === '1') { if (G.stats.lv < 30 && Math.random() < 0.25) setTimeout(hint, 4000); return; }
    if (G.stats.lv >= 10) { store.set(gk(), '1'); return; }                                   // los jugadores veteranos solo la abren con ❓
    let tries = 0;
    const wait = () => {                                                                       // espera a que acabe el tutorial inicial y a que no haya ventanas abiertas (p. ej. el código de recuperación)
      if (store.get('eldoria.tut.' + name) === '1' && !document.querySelector('.tut:not([hidden])') && !document.querySelector('.modal:not([hidden])')) return setTimeout(() => { if (idx < 0 && store.get(gk()) !== '1') open(); }, 1200);
      if (++tries < 400) setTimeout(wait, 1500);
    };
    wait();
  });
})();
