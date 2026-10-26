'use strict';
/* Sonido procedural (WebAudio): efectos, música por zona y lluvia. Sin archivos de audio. */
(() => {
  const X = window.EldExt; if (!X) return;
  const { G, el, store } = X;
  let ac = null, master, sfxG, musG, rainG, rainSrc = null, muted = store.get('eldoria.mute') === '1', vol = parseFloat(store.get('eldoria.vol') || '0.6');
  const AC = window.AudioContext || window.webkitAudioContext;

  function init() {
    if (ac || !AC) return;
    try {
      ac = new AC(); master = ac.createGain(); sfxG = ac.createGain(); musG = ac.createGain(); rainG = ac.createGain();
      master.gain.value = muted ? 0 : vol; sfxG.gain.value = 0.55; musG.gain.value = 0.22; rainG.gain.value = 0;
      sfxG.connect(master); musG.connect(master); rainG.connect(master); master.connect(ac.destination);
      // ruido blanco en bucle para la lluvia
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = buf;
      startRain(); schedule();
    } catch (e) { ac = null; }
  }
  let noiseBuf = null;
  const resume = () => { init(); if (ac && ac.state === 'suspended') ac.resume(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, resume, { passive: true }));

  /* ---------- bloques de síntesis ---------- */
  function tone(f0, f1, dur, type = 'sine', vol0 = 0.3, delay = 0, dest = sfxG) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol0, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, freq = 1200, q = 1, vol0 = 0.3, type = 'bandpass', delay = 0, f1 = null) {
    if (!ac || muted || !noiseBuf) return;
    const t = ac.currentTime + delay, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(freq, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q;
    g.gain.setValueAtTime(vol0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxG); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const last = {};
  const gate = (k, ms) => { const n = performance.now(); if (n - (last[k] || 0) < ms) return false; last[k] = n; return true; };

  const SFX = {
    slash: () => { noise(0.12, 2600, 0.8, 0.35, 'bandpass', 0, 700); tone(180, 70, 0.1, 'square', 0.14); },
    heavy: () => { noise(0.2, 1400, 0.7, 0.45, 'bandpass', 0, 300); tone(110, 45, 0.22, 'sawtooth', 0.25); },
    bow: () => { tone(520, 180, 0.12, 'triangle', 0.22); noise(0.08, 3500, 2, 0.15); },
    magic: () => { tone(420, 900, 0.22, 'sine', 0.2); tone(630, 1350, 0.22, 'sine', 0.1, 0.02); },
    fire: () => { noise(0.35, 900, 0.6, 0.35, 'lowpass', 0, 200); tone(240, 90, 0.3, 'sawtooth', 0.12); },
    ice: () => { tone(1500, 2400, 0.18, 'triangle', 0.15); tone(1800, 900, 0.3, 'sine', 0.1, 0.05); },
    hit: () => { noise(0.07, 900, 1, 0.3); tone(140, 60, 0.08, 'square', 0.12); },
    hurt: () => { tone(200, 90, 0.18, 'sawtooth', 0.22); },
    crit: () => { tone(900, 1700, 0.12, 'square', 0.18); tone(1350, 2000, 0.16, 'triangle', 0.14, 0.06); },
    die: () => { noise(0.3, 600, 0.6, 0.3, 'lowpass', 0, 120); tone(160, 40, 0.35, 'triangle', 0.2); },
    heal: () => { [523, 659, 784].forEach((f, i) => tone(f, f, 0.25, 'sine', 0.14, i * 0.08)); },
    level: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.2, i * 0.1)); },
    coin: () => { tone(1320, 1320, 0.08, 'square', 0.1); tone(1760, 1760, 0.14, 'square', 0.1, 0.07); },
    pick: () => { tone(700, 1100, 0.08, 'triangle', 0.14); },
    click: () => { tone(900, 700, 0.04, 'square', 0.06); },
    quest: () => { [392, 523, 659].forEach((f, i) => tone(f, f, 0.28, 'triangle', 0.17, i * 0.12)); },
    skill: () => { noise(0.25, 700, 0.8, 0.3, 'bandpass', 0, 2400); tone(260, 520, 0.25, 'sawtooth', 0.14); },
    boss: () => { tone(90, 60, 0.9, 'sawtooth', 0.3); tone(135, 90, 0.9, 'square', 0.15, 0.1); noise(0.9, 300, 0.5, 0.2, 'lowpass'); },
    thunder: () => { noise(1.6, 220, 0.6, 0.55, 'lowpass', 0, 60); tone(70, 35, 1.2, 'sawtooth', 0.2); },
    ach: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, f, 0.35, 'sine', 0.18, i * 0.09)); },
  };
  function play(n) { if (!ac || muted) return; const f = SFX[n]; if (f && gate(n, n === 'hit' ? 60 : 40)) f(); }

  /* ---------- hooks del juego ---------- */
  X.sfx = play;
  X.on('fx', (f) => {
    if (!ac) return;
    const me = G.me; if (!me) return;
    const px = f.x !== undefined ? f.x : f.x1, py = f.y !== undefined ? f.y : f.y1;
    if (Math.hypot(px - me.x, py - me.y) > 14) return;
    switch (f.k) {
      case 's': play(f.cr ? 'crit' : /hacha|martillo|maza|mandoble|lanza/.test(f.w || '') ? 'heavy' : 'slash'); break;
      case 'p': play(f.s === 'ranged' ? 'bow' : f.s === 'fire' ? 'fire' : f.s === 'ice' ? 'ice' : 'magic'); break;
      case 'd': if (f.c === 'h') play('hit'); else if (f.c === 'p' && Math.hypot(px - me.x, py - me.y) < 1.5) play('hurt'); else if (f.c === 'g') play('heal'); break;
      case 'x': play('die'); break;
      case 'l': play('level'); break;
      case 'sk': play('skill'); break;
    }
  });
  let lastGold = null, lastN = -1;
  X.on('inv', (m) => { if (lastGold !== null && m.gold > lastGold) play('coin'); else if (lastN >= 0 && m.inv.filter(Boolean).length > lastN) play('pick'); lastGold = m.gold; lastN = m.inv.filter(Boolean).length; });
  X.on('msg', (m) => { if (m.t === 'quest_done') play('quest'); else if (m.t === 'ach') play('ach'); else if (m.t === 'event') play('boss'); });
  X.on('snap', () => { const z = X.zoneAt && G.me ? X.zoneAt(G.me.x, G.me.y) : null; if (z) mood = z.kind === 'dungeon' ? 'dungeon' : z.pvp ? 'pvp' : z.kind === 'town' ? 'town' : 'wild'; });

  /* ---------- música: arpegios suaves según la zona ---------- */
  const SCALES = {
    town: { root: 196, steps: [0, 4, 7, 9, 12, 14], bpm: 70, wave: 'triangle', pad: [0, 7, 12] },
    wild: { root: 175, steps: [0, 3, 5, 7, 10, 12], bpm: 64, wave: 'sine', pad: [0, 7, 10] },
    dungeon: { root: 110, steps: [0, 1, 5, 7, 8, 12], bpm: 52, wave: 'sine', pad: [0, 5, 8] },
    pvp: { root: 123, steps: [0, 3, 6, 7, 10, 12], bpm: 92, wave: 'sawtooth', pad: [0, 6, 7] },
  };
  let mood = 'town', nextT = 0, stepN = 0;
  const hz = (root, semis) => root * Math.pow(2, semis / 12);
  function musicNote(f, dur, type, vol0, when) {
    const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 1600;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol0, when + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(fl); fl.connect(g); g.connect(musG); o.start(when); o.stop(when + dur + 0.1);
  }
  function schedule() {
    if (!ac) return;
    setTimeout(schedule, 250);
    if (muted || ac.state !== 'running') { nextT = 0; return; }
    const sc = SCALES[mood] || SCALES.town, beat = 60 / sc.bpm;
    if (!nextT || nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.6) {
      const n = stepN++;
      if (n % 8 === 0) for (const p of sc.pad) musicNote(hz(sc.root / 2, p), beat * 7.5, 'sine', 0.1, nextT);        // acorde largo
      const pat = [0, 2, 4, 3, 5, 3, 4, 2][n % 8];
      if (Math.random() < 0.8) musicNote(hz(sc.root * 2, sc.steps[pat]), beat * 1.6, sc.wave, 0.07, nextT);
      if (mood === 'pvp' && n % 2 === 0) musicNote(hz(sc.root / 2, 0), beat * 0.4, 'square', 0.05, nextT);       // pulso grave
      nextT += beat;
    }
  }
  /* ---------- lluvia ---------- */
  function startRain() {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter();
    s.buffer = noiseBuf; s.loop = true; fl.type = 'highpass'; fl.frequency.value = 900;
    s.connect(fl); fl.connect(rainG); s.start(); rainSrc = s;
  }
  X.setRain = (a) => { if (ac) rainG.gain.setTargetAtTime(muted ? 0 : 0.16 * a, ac.currentTime, 0.6); };

  /* ---------- botón de sonido ---------- */
  const btn = el('button', 'sndbtn', muted ? '🔇' : '🔊'); btn.type = 'button'; btn.title = 'Sonido y música (M para silenciar)';
  function setMuted(v) { muted = v; store.set('eldoria.mute', v ? '1' : '0'); btn.textContent = v ? '🔇' : '🔊'; if (ac) master.gain.setTargetAtTime(v ? 0 : vol, ac.currentTime, 0.05); resume(); }
  btn.addEventListener('click', () => setMuted(!muted));
  document.addEventListener('DOMContentLoaded', () => { const st = document.querySelector('#stage'); if (st) st.append(btn); });
  if (document.readyState !== 'loading') { const st = document.querySelector('#stage'); if (st) st.append(btn); }
  X.on('key', (k) => { if (k === 'm') { setMuted(!muted); return true; } return false; });
  // ratón: clic suave en botones
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) play('click'); });
})();
