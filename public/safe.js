'use strict';
/* Modo seguro: apaga todos los gráficos pesados (vista 3D, efectos, portada animada y pantalla de alta resolución)
 * para teléfonos y PC que se quedan en blanco o se pegan. Se activa con el botón 🛡️, con la casilla de la pantalla
 * de inicio, con ?seguro=1 en la dirección (y ?seguro=0 lo quita) o solo si el juego detecta que va muy lento. */
(() => {
  const K = 'eldoria.safe', PREV = 'eldoria.safeprev';
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  try { const q = new URLSearchParams(location.search).get('seguro'); if (q === '1') { put(K, '1'); if (get('eldoria.gfx') !== '0') put(PREV, get('eldoria.gfx') || ''); put('eldoria.gfx', '0'); put('eldoria.3d', '0'); } else if (q === '0') put(K, null); } catch (e) { /* nada */ }
  /* Rescate tras un cierre brusco: si la página murió mientras se veía (memoria agotada, pantalla congelada) y quien juega la
   * vuelve a abrir, se activa solo el Modo seguro. Al cerrar normalmente o pasar a segundo plano la marca se borra. */
  try {
    const B = 'eldoria.boot', was = get(B);
    if (was === 'run' && get(K) !== '1') { put(K, '1'); put(PREV, get('eldoria.gfx') || ''); put('eldoria.gfx', '0'); put('eldoria.3d', '0'); put('eldoria.autonote', '1'); }
    put(B, 'run');
    window.addEventListener('pagehide', () => put(B, null));
    document.addEventListener('visibilitychange', () => put(B, document.hidden ? null : 'run'));
  } catch (e) { /* sin almacenamiento */ }
  const subs = [];
  const S = window.EldSafe = {
    on: () => get(K) === '1',
    onChange: (f) => subs.push(f),
    set(v, auto) {
      if (v === S.on()) return;
      if (v) { put(PREV, get('eldoria.gfx') || ''); put(K, '1'); put('eldoria.gfx', '0'); put('eldoria.3d', '0'); }
      else { put(K, null); const p = get(PREV); put('eldoria.gfx', p === '' ? null : p); put(PREV, null); }
      const X = window.EldExt;
      if (X) { if (v && X.set3d) X.set3d(false); if (X.gfx && X.gfx.set) X.gfx.set(v ? 0 : (get('eldoria.gfx') == null ? null : +get('eldoria.gfx'))); if (X.resize) X.resize(); }
      for (const f of subs) f(v, !!auto);
      if (X && X.toast) X.toast(v ? (auto ? '🛡️ El juego iba muy lento: activé el Modo seguro (sin 3D ni efectos). Puedes quitarlo con el botón 🛡️.' : '🛡️ Modo seguro activado: sin 3D ni efectos.') : '🛡️ Modo seguro desactivado.', null, 6000);
    },
  };
  const ready = (f) => { document.addEventListener('DOMContentLoaded', f); if (document.readyState !== 'loading') f(); };
  ready(() => {
    const X = () => window.EldExt;
    const cb = document.getElementById('safeChk');                                    // casilla de la pantalla de inicio
    if (cb) { cb.checked = S.on(); cb.addEventListener('change', () => S.set(cb.checked)); S.onChange((v) => { cb.checked = v; }); }
    const mk = () => {
      const x = X(), st = document.getElementById('stage'); if (!x || !st) return setTimeout(mk, 300);
      const b = x.el('button', 'sndbtn safebtn'); b.type = 'button';
      const lab = () => { b.textContent = '🛡️'; b.classList.toggle('on', S.on()); b.title = 'Modo seguro (sin 3D ni efectos): ' + (S.on() ? 'ACTIVADO' : 'desactivado') + ' — pulsa para cambiar'; b.setAttribute('aria-label', b.title); };
      b.addEventListener('click', () => S.set(!S.on())); S.onChange(lab); lab(); st.append(b);
    };
    mk();
    if (get('eldoria.autonote') === '1') { put('eldoria.autonote', null); const w = () => { const x = X(); if (x && x.toast && x.G && x.G.me) x.toast('🛡️ La página se cerró de golpe la última vez: activé el Modo seguro para que no se congele. Puedes quitarlo con el botón 🛡️.'); else setTimeout(w, 1500); }; w(); }
    /* vigilante de fotogramas: si va a menos de 14 fps durante ~7 s seguidos dentro del juego, activa el modo seguro */
    let last = performance.now(), acc = 0, frames = 0, slow = 0;
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = now - last; last = now;
      if (document.hidden || dt > 1000 || S.on() || !(X() && X().G && X().G.me)) { acc = 0; frames = 0; slow = 0; return; }
      acc += dt; frames++;
      if (acc >= 1000) { const fps = frames * 1000 / acc; acc = 0; frames = 0; slow = fps < 14 ? slow + 1 : 0; if (slow >= 7) { slow = 0; S.set(true, true); } }
    };
    requestAnimationFrame(loop);
  });
})();
