'use strict';
/* Rendimiento (botón ⚡): perfiles Auto/Alto/Medio/Bajo, ajuste por módulo y modo de los botones 📖/🙂.
   Los módulos preguntan X.perf.q('nombre') → 0 apagado, 1 básico, 2 completo. En Auto detecta el equipo y baja un escalón
   si el juego va a menos de 30 fps durante ~5 s. Guardado en localStorage (eldoria.perf, eldoria.perf.o, eldoria.perf.hud).
   Para quitarlo: borrar este archivo y su <script> (los módulos usan "completo" si no existe). */
(() => {
  const X = window.EldExt; if (!X) return;
  const st = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const touch = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && matchMedia('(pointer:coarse)').matches);
  const LV = ['bajo', 'medio', 'alto'];
  const MODS = [['rf', 'Poderes realistas'], ['casas', 'Techos de casas'], ['ambiente', 'Clima, estaciones y animales'], ['gente', 'Gente del pueblo'], ['combate', 'Efectos de combate'], ['anim', 'Pesca y minería animadas'], ['gfx', 'Luces, partículas, hojas y lluvia (✨)']];
  const PRE = {
    alto: { rf: 2, casas: 2, ambiente: 2, gente: 2, combate: 2, anim: 1 },
    medio: { rf: 1, casas: 2, ambiente: 1, gente: 1, combate: 1, anim: 1 },
    bajo: { rf: 0, casas: 1, ambiente: 0, gente: 0, combate: 1, anim: 0 },
  };
  const detect = () => {
    const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    if (mem <= 2 || cores <= 2) return 'bajo';
    if (touch || mem <= 4 || cores <= 4) return 'medio';
    return 'alto';
  };
  let mode = st.get('eldoria.perf'); if (!['auto', 'alto', 'medio', 'bajo'].includes(mode)) mode = 'auto';
  let hud = st.get('eldoria.perf.hud'); if (!['visible', 'compact', 'hidden'].includes(hud)) hud = 'visible';
  let ov = {}; try { ov = JSON.parse(st.get('eldoria.perf.o') || '{}') || {}; } catch (e) { ov = {}; }
  let cap = null;                                                 // tope puesto por el vigilante de fps en Auto
  const subs = [];
  const safe = () => !!(window.EldSafe && window.EldSafe.on && window.EldSafe.on());
  const level = () => {
    if (safe()) return 'bajo';
    if (mode !== 'auto') return mode;
    const d = detect(); return cap != null && LV.indexOf(cap) < LV.indexOf(d) ? cap : d;
  };
  const q = (name) => { if (safe()) return PRE.bajo[name] || 0; const o = ov[name]; if (o === 0 || o === 1 || o === 2) return o; const v = PRE[level()][name]; return v == null ? 2 : v; };
  const gfxStored = () => { const v = st.get('eldoria.gfx'); return v === '0' || v === '1' || v === '2' || v === '3' ? +v : null; };
  const applyGfx = () => {                                      // controla también el sistema ✨ (luces, partículas, hojas, lluvia)
    if (!X.gfx || safe()) return;
    const o = ov.gfx, l = level(), s0 = gfxStored();
    if (o === 0 || o === 1 || o === 2) X.gfx.set(o);
    else if (l === 'bajo') X.gfx.set(0);
    else if (l === 'medio') X.gfx.set(Math.min(1, s0 == null ? 1 : s0));
    else X.gfx.set(s0);
  };
  const changed = () => { applyGfx(); if (X.perfApply) X.perfApply(); subs.forEach((f) => { try { f(); } catch (e) { /* nada */ } }); render(); updBtn(); };
  const save = () => { st.set('eldoria.perf', mode); st.set('eldoria.perf.hud', hud); st.set('eldoria.perf.o', JSON.stringify(ov)); };
  X.perf = { level, mode: () => mode, hud: () => hud, q, onChange: (f) => subs.push(f), open: () => open() };
  if (window.EldSafe && window.EldSafe.onChange) window.EldSafe.onChange(changed);

  const css = document.createElement('style');
  css.textContent = `.perfbtn{left:94px}body.touch .perfbtn{top:62px;left:94px}
@media (orientation:landscape) and (max-height:520px){body.touch .perfbtn{top:calc(50px + env(safe-area-inset-top));left:calc(164px + env(safe-area-inset-left));width:36px;height:36px}}
.pf-ov{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}
.pf-box{width:min(460px,calc(100vw - 20px));max-height:calc(100vh - 30px);overflow:auto;background:rgba(26,20,13,.98);border:1px solid #c9a24b;border-radius:12px;padding:14px 16px;color:#f1e6c8;font-size:14px}
.pf-box h3{margin:0 0 6px;color:#ffd77a;font-size:19px;display:flex;justify-content:space-between;align-items:center}
.pf-box h3 button{background:none;border:0;color:#c9b98e;font-size:20px;cursor:pointer}
.pf-box h4{margin:12px 0 5px;color:#e8cf8f;font-size:13px}.pf-note{color:#c9b98e;font-size:12px;margin:0 0 6px}
.pf-seg{display:flex;gap:5px;flex-wrap:wrap}.pf-seg button{flex:1;min-width:54px;padding:6px 8px;border-radius:8px;border:1px solid #6d5a34;background:#3b3220;color:#f1e6c8;cursor:pointer;font-weight:700}
.pf-seg button.on{background:#ffd77a;color:#1d1608;border-color:#ffd77a}
.pf-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:5px 0}.pf-row .pf-seg{flex:0 0 auto}.pf-row .pf-seg button{flex:0 0 auto;min-width:0;padding:4px 8px;font-size:12px}
.pj-bar.compact{flex-direction:column;align-items:flex-end}.pj-bar.compact button{opacity:.6}.pj-bar.compact .pj-more{display:block}.pj-bar.compact .pj-act{display:none}.pj-bar.compact.open .pj-act{display:block;opacity:.95}.pj-bar.hidden{display:none}`;
  document.head.append(css);

  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sndbtn perfbtn'; btn.textContent = '⚡';
  const updBtn = () => { const l = level(); btn.title = `Rendimiento: ${mode === 'auto' ? 'Auto (' + l + ')' : l} — pulsa para ajustar`; btn.setAttribute('aria-label', btn.title); };
  btn.addEventListener('click', () => open());
  const mount = () => { const s = document.getElementById('stage'); if (s && !btn.parentNode) s.append(btn); };
  document.addEventListener('DOMContentLoaded', mount); if (document.readyState !== 'loading') mount(); updBtn();

  let box = null, panel = null;
  const unsafe = () => { if (window.EldSafe && window.EldSafe.on && window.EldSafe.on()) window.EldSafe.set(false); };   // el Modo seguro 🛡️ ignora estos ajustes: si se toca uno, se quita
  const seg = (opts, cur, fn, keep) => { const d = document.createElement('div'); d.className = 'pf-seg'; for (const [v, t] of opts) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; if (v === cur) b.className = 'on'; b.addEventListener('click', () => { if (!keep) unsafe(); fn(v); }); d.append(b); } return d; };
  function render() {
    if (!panel) return; panel.textContent = '';
    const h3 = document.createElement('h3'); h3.append('⚡ Rendimiento'); const x = document.createElement('button'); x.textContent = '✕'; x.addEventListener('click', close); h3.append(x); panel.append(h3);
    if (safe()) { const w = document.createElement('div'); w.style.cssText = 'background:#4a3512;border:1px solid #ffd77a;border-radius:8px;padding:8px 10px;margin:0 0 8px;font-size:13px';
      w.append('🛡️ El Modo seguro está activado y ignora estos ajustes (sin 3D ni efectos). Toca cualquier opción de abajo para quitarlo, o '); const q2 = document.createElement('button'); q2.type = 'button'; q2.textContent = 'desactívalo aquí';
      q2.style.cssText = 'background:#ffd77a;color:#1d1608;border:0;border-radius:6px;padding:3px 8px;font-weight:700;cursor:pointer'; q2.addEventListener('click', () => { unsafe(); changed(); }); w.append(q2); panel.append(w); }
    const n = document.createElement('p'); n.className = 'pf-note'; n.textContent = mode === 'auto' ? `Auto: el juego detecta tu equipo y usa el perfil ${level()}; si va lento baja solo.` : `Perfil fijo: ${level()}.`; panel.append(n);
    panel.append(seg([['auto', 'Auto'], ['alto', 'Alto'], ['medio', 'Medio'], ['bajo', 'Bajo']], mode, (v) => { mode = v; cap = null; ov = {}; save(); changed(); }));
    const h = document.createElement('h4'); h.textContent = 'Activar o desactivar cada efecto'; panel.append(h);
    for (const [k, nm] of MODS) {
      const r = document.createElement('div'); r.className = 'pf-row'; const l = document.createElement('span'); l.textContent = nm; r.append(l);
      const on = k === 'gfx' ? (X.gfx ? X.gfx.level() > 0 : true) : q(k) > 0;
      r.append(seg([[2, 'Sí'], [0, 'No']], on ? 2 : 0, (v) => { ov[k] = v; save(); changed(); })); panel.append(r);
    }
    const h2 = document.createElement('h4'); h2.textContent = 'Botones 📖 álbum y 🙂 emotes'; panel.append(h2);
    panel.append(seg([['visible', 'Visibles'], ['compact', 'Compactos ⋯'], ['hidden', 'Ocultos']], hud, (v) => { hud = v; save(); changed(); }, true));
    const r2 = document.createElement('div'); r2.className = 'pf-row'; r2.style.marginTop = '8px';
    const a = document.createElement('button'), e = document.createElement('button'); a.textContent = '📖 Abrir álbum'; e.textContent = '🙂 Abrir emotes';
    for (const b of [a, e]) { b.type = 'button'; b.style.cssText = 'flex:1;padding:6px;border-radius:8px;border:1px solid #6d5a34;background:#3b3220;color:#f1e6c8;cursor:pointer'; }
    a.addEventListener('click', () => { close(); X.openAlbum && X.openAlbum(); }); e.addEventListener('click', () => { close(); X.openEmotes && X.openEmotes(); }); r2.append(a, e); panel.append(r2);
  }
  function open() { if (box) return; box = document.createElement('div'); box.className = 'pf-ov'; panel = document.createElement('div'); panel.className = 'pf-box'; box.append(panel); box.addEventListener('click', (ev) => { if (ev.target === box) close(); }); document.body.append(box); render(); }
  function close() { if (box) { box.remove(); box = null; panel = null; } }
  X.on('key', (k, ev) => { if (ev && ev.key === 'Escape' && box) { close(); return true; } return false; });

  /* vigilante: en Auto, menos de 30 fps durante ~5 s seguidos → baja un escalón */
  let last = performance.now(), acc = 0, frames = 0, slow = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = now - last; last = now;
    if (document.hidden || dt > 1000 || mode !== 'auto' || safe() || !(X.G && X.G.me)) { acc = 0; frames = 0; slow = 0; return; }
    acc += dt; frames++;
    if (acc >= 1000) {
      const fps = frames * 1000 / acc; acc = 0; frames = 0; slow = fps < 30 ? slow + 1 : 0;
      if (slow >= 5) { slow = 0; const i = LV.indexOf(level()); if (i > 0) { cap = LV[i - 1]; changed(); X.toast && X.toast(`⚡ Va lento: efectos bajados a ${cap}. Puedes cambiarlo con el botón ⚡`); } }
    }
  };
  requestAnimationFrame(loop);
  changed();
})();
