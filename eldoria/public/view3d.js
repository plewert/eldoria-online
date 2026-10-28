'use strict';
/* Botón 🧊 de los ajustes: activa o desactiva la vista 3D (suelo en perspectiva y figuras de pie mirando a la cámara). */
(() => {
  const X = window.EldExt; if (!X || !X.set3d) return;
  const { el, $ } = X;
  const btn = el('button', 'sndbtn v3dbtn'); btn.type = 'button';
  const label = () => { const on = X.mode3d(); btn.textContent = '🧊'; btn.classList.toggle('on', on); btn.title = 'Vista 3D: ' + (on ? 'ACTIVADA' : 'desactivada') + ' — pulsa para cambiar'; btn.setAttribute('aria-label', btn.title); };
  btn.addEventListener('click', () => { X.set3d(!X.mode3d()); label(); });
  label();
  const mount = () => { const st = $('#stage'); if (st && !btn.parentNode) st.append(btn); };
  document.addEventListener('DOMContentLoaded', mount); if (document.readyState !== 'loading') mount();
  X.on('key', (k) => { if (k === 'y') { X.set3d(!X.mode3d()); label(); return true; } return false; });
})();
