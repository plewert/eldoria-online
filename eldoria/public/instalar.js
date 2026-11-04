'use strict';
/* Botón «Instalar app» en la pantalla de inicio: usa el aviso nativo de instalación (Android/PC) o muestra los pasos (iPhone y otros). */
(() => {
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone === true;
  if (standalone()) return;
  const login = document.getElementById('login'); if (!login) return;
  let deferred = null;
  const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'installBtn'; btn.textContent = '📲 Instalar app (celular y PC)';
  const box = document.createElement('div'); box.id = 'installTip'; box.hidden = true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /android/i.test(navigator.userAgent);
  const steps = ios ? ['Abre esta página en <b>Safari</b>.', 'Toca el botón <b>Compartir</b> (cuadro con flecha hacia arriba).', 'Elige <b>«Añadir a pantalla de inicio»</b> y toca <b>Añadir</b>.']
    : android ? ['Abre esta página en <b>Chrome</b> (no dentro de WhatsApp, Facebook o Instagram).', 'Toca el menú <b>⋮</b> de arriba a la derecha.', 'Elige <b>«Instalar app»</b> o <b>«Añadir a pantalla de inicio»</b>.']
    : ['Usa <b>Chrome</b> o <b>Edge</b>.', 'Busca el icono de instalar a la derecha de la barra de direcciones, o el menú <b>⋮</b> → <b>«Instalar Eldoria Online»</b>.'];
  box.innerHTML = '<b>Instalar Eldoria Online</b><ol>' + steps.map((s) => '<li>' + s + '</li>').join('') + '</ol><small>Se instala con su icono y a pantalla completa. Necesita conexión para jugar.</small>';
  btn.addEventListener('click', async () => {
    if (deferred) { try { deferred.prompt(); await deferred.userChoice; } catch (e) { /* cancelado */ } deferred = null; return; }
    box.hidden = !box.hidden;
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; box.hidden = true; });
  window.addEventListener('appinstalled', () => { btn.remove(); box.remove(); });
  const form = document.getElementById('loginForm'); (form || login).append(btn, box);
})();
