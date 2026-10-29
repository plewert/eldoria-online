'use strict';
/* Controles táctiles: joystick virtual y panel lateral desplegable. Solo se activa en pantallas táctiles. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { el, $, store } = X;
  const touch = ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches) || /[?&#]touch/.test(location.href);
  if (!touch) return;
  document.body.classList.add('touch');

  const base = el('div', 'joy'), knob = el('div', 'knob'); base.append(knob);
  base.setAttribute('aria-label', 'Joystick de movimiento');
  const drawerBtn = el('button', 'drawerBtn', '🎒'); drawerBtn.type = 'button'; drawerBtn.setAttribute('aria-label', 'Abrir mochila y estadísticas');
  const mount = () => { const st = $('#stage'); if (!st || base.parentNode) return; st.append(base, drawerBtn); };
  document.addEventListener('DOMContentLoaded', mount); if (document.readyState !== 'loading') mount();
  drawerBtn.addEventListener('click', () => { const open = document.body.classList.toggle('drawer'); drawerBtn.textContent = open ? '✕' : '🎒'; });

  let id = null, cx = 0, cy = 0;
  const R = 46;
  const set = (ev) => {
    let dx = ev.clientX - cx, dy = ev.clientY - cy; const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / R);
    knob.style.transform = `translate(${(dx / d) * k * R}px, ${(dy / d) * k * R}px)`;
    const th = 0.32 * R;
    X.joy.dx = Math.abs(dx) > th && Math.abs(dx) > Math.abs(dy) * 0.45 ? Math.sign(dx) : 0;
    X.joy.dy = Math.abs(dy) > th && Math.abs(dy) > Math.abs(dx) * 0.45 ? Math.sign(dy) : 0;
  };
  const end = () => { id = null; knob.style.transform = ''; X.joy.dx = 0; X.joy.dy = 0; base.classList.remove('on'); };
  base.addEventListener('pointerdown', (ev) => { ev.preventDefault(); id = ev.pointerId; base.setPointerCapture(id); const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; base.classList.add('on'); set(ev); });
  base.addEventListener('pointermove', (ev) => { if (ev.pointerId === id) set(ev); });
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  /* ---- pantalla completa, zoom del mapa y gesto de pellizco ---- */
  const small = Math.min(innerWidth, innerHeight) < 520;
  if (store.get('eldoria.zoom') === null && small && X.setZoom) X.setZoom(0.8);           // en teléfono se ve más mapa de entrada
  const fs = el('button', 'sndbtn fsBtn', '⛶'); fs.type = 'button'; fs.title = 'Pantalla completa'; fs.setAttribute('aria-label', 'Pantalla completa');
  const de = document.documentElement, canFs = !!(de.requestFullscreen || de.webkitRequestFullscreen);
  const inFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  fs.addEventListener('click', async () => {
    try {
      if (inFs()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      await (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } catch (e) { /* no permitido */ }
  });
  const zb = el('div', 'zoomBtns'), zp = el('button', '', '＋'), zm = el('button', '', '－');
  zp.type = zm.type = 'button'; zp.title = 'Acercar'; zm.title = 'Alejar (ver más mapa)'; zp.setAttribute('aria-label', 'Acercar'); zm.setAttribute('aria-label', 'Alejar');
  zp.addEventListener('click', () => X.setZoom(X.zoom() * 1.2)); zm.addEventListener('click', () => X.setZoom(X.zoom() / 1.2));
  zb.append(zp, zm);
  const mount2 = () => { const st = $('#stage'); if (!st || zb.parentNode) return; if (canFs) st.append(fs); st.append(zb); const v = $('#view'); if (v) { v.style.touchAction = 'none'; pinch(v); } };
  document.addEventListener('DOMContentLoaded', mount2); if (document.readyState !== 'loading') mount2();
  function pinch(v) {
    let d0 = 0, z0 = 1, on = false, tEnd = 0;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;
    v.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = X.zoom(); on = true; X.joy.dx = X.joy.dy = 0; } }, { passive: true });
    v.addEventListener('touchmove', (e) => { if (on && e.touches.length === 2) { e.preventDefault(); X.setZoom(z0 * dist(e.touches) / d0, true); } }, { passive: false });
    const up = (e) => { if (on && e.touches.length < 2) { on = false; tEnd = performance.now(); X.setZoom(X.zoom()); } };
    v.addEventListener('touchend', up, { passive: true }); v.addEventListener('touchcancel', up, { passive: true });
    for (const n of ['click', 'mousedown', 'pointerdown', 'contextmenu']) v.addEventListener(n, (e) => { if (on || performance.now() - tEnd < 400) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }
  // el chat empieza plegado para ver más mapa
  if (store.get('eldoria.chat') === null) store.set('eldoria.chat', '0');
})();
