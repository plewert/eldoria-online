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
  // el chat empieza plegado para ver más mapa
  if (store.get('eldoria.chat') === null) store.set('eldoria.chat', '0');
})();
