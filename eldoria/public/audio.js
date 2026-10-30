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

  function bossRoar(k) {
    const f0 = 70 + (k % 7) * 14, wav = ['sawtooth', 'square', 'sawtooth'][k % 3];
    tone(f0 * 2.2, f0, 1.2, wav, 0.32); tone(f0 * 3.3, f0 * 1.5, 1.2, 'square', 0.12, 0.05); noise(1.2, 500 + (k % 5) * 150, 0.6, 0.3, 'lowpass', 0, 120);
    tone(f0 / 2, f0 / 2.6, 1.4, 'sine', 0.35, 0.1);
  }
  const hashStr = (t) => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  X.bossVoice = (type) => { if (ac && !muted && gate('roar', 600)) bossRoar(hashStr(type)); };
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
    quick: () => { noise(0.08, 3200, 0.8, 0.3, 'bandpass', 0, 1200); tone(260, 120, 0.07, 'square', 0.1); },
    poison: () => { noise(0.3, 500, 2, 0.25, 'bandpass', 0, 1200); tone(300, 140, 0.3, 'sawtooth', 0.1); tone(190, 280, 0.25, 'sine', 0.1, 0.05); },
    storm: () => { noise(0.25, 3000, 1, 0.3, 'highpass'); tone(1200, 200, 0.2, 'sawtooth', 0.14); tone(80, 40, 0.3, 'square', 0.12, 0.05); },
    arcane: () => { tone(500, 1500, 0.28, 'sine', 0.18); tone(750, 2250, 0.28, 'triangle', 0.1, 0.03); tone(250, 750, 0.28, 'sine', 0.1, 0.06); },
    water: () => { noise(0.3, 700, 1.5, 0.25, 'bandpass', 0, 2200); tone(500, 900, 0.18, 'sine', 0.12); tone(700, 400, 0.2, 'sine', 0.1, 0.1); },
    dark: () => { tone(130, 55, 0.4, 'sawtooth', 0.2); noise(0.35, 400, 0.8, 0.2, 'lowpass', 0, 100); },
    holy: () => { [784, 988, 1175].forEach((f, i) => tone(f, f, 0.35, 'sine', 0.12, i * 0.05)); },
    /* jefes */
    charge: () => { tone(110, 330, 0.9, 'sawtooth', 0.12); noise(0.9, 300, 1, 0.12, 'bandpass', 0, 1800); },
    roar: () => bossRoar(1),
    dragonbreath: () => { noise(0.9, 1800, 0.5, 0.5, 'lowpass', 0, 250); tone(90, 50, 0.9, 'sawtooth', 0.28); tone(200, 80, 0.7, 'square', 0.1, 0.05); },
    fireball: () => { noise(0.45, 1100, 0.6, 0.4, 'lowpass', 0, 220); tone(300, 100, 0.4, 'sawtooth', 0.16); },
    inferno: () => { noise(1.4, 2000, 0.5, 0.45, 'lowpass', 0, 200); tone(70, 45, 1.3, 'sawtooth', 0.3); tone(105, 60, 1.2, 'square', 0.12, 0.1); },
    explosion: () => { noise(0.9, 900, 0.5, 0.6, 'lowpass', 0, 70); tone(100, 30, 0.7, 'sine', 0.45); tone(60, 28, 0.9, 'sawtooth', 0.2); },
    quake: () => { noise(1.0, 200, 0.6, 0.6, 'lowpass', 0, 50); tone(55, 30, 1.0, 'sine', 0.5); tone(80, 40, 0.8, 'sawtooth', 0.15); },
    lava: () => { noise(2.2, 350, 0.7, 0.4, 'lowpass', 0, 120); tone(48, 40, 2.0, 'sine', 0.35); },
    acid: () => { noise(0.5, 1800, 3, 0.25, 'bandpass', 0, 700); tone(900, 250, 0.4, 'sawtooth', 0.08); },
    rubble: () => { noise(0.6, 500, 0.7, 0.5, 'lowpass', 0, 90); tone(70, 38, 0.5, 'square', 0.2); },
    whoosh: () => { noise(0.7, 400, 1, 0.3, 'bandpass', 0, 2500); },
    nova: () => { tone(300, 1800, 0.7, 'sine', 0.25); noise(0.7, 1500, 0.8, 0.3, 'highpass'); tone(150, 600, 0.6, 'triangle', 0.15, 0.05); },
    teleport: () => { tone(1800, 300, 0.3, 'sine', 0.15); tone(300, 1800, 0.3, 'sine', 0.12, 0.25); },
    beam: () => { tone(220, 330, 0.5, 'sawtooth', 0.14); noise(0.5, 1500, 1, 0.2, 'bandpass', 0, 2500); },
    bubble: () => { tone(300, 800, 0.15, 'sine', 0.15); tone(500, 1200, 0.15, 'sine', 0.1, 0.1); },
    splash: () => { noise(0.45, 1200, 0.7, 0.4, 'bandpass', 0, 300); tone(200, 90, 0.25, 'sine', 0.18); },
    shield: () => { tone(880, 440, 0.4, 'triangle', 0.15); tone(1320, 660, 0.4, 'sine', 0.1, 0.03); },
    impact: () => { noise(0.25, 800, 0.7, 0.45, 'lowpass', 0, 150); tone(120, 50, 0.25, 'square', 0.22); },
    ach: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, f, 0.35, 'sine', 0.18, i * 0.09)); },
  };
  function play(n) { if (!ac || muted) return; const f = SFX[n]; if (f && gate(n, n === 'hit' ? 60 : 40)) f(); }

  /* ---------- hooks del juego ---------- */
  X.sfx = play; X.musicMood = (m) => setMood(m); X.musicThemes = () => Object.keys(T);
  const BOSSFX = {
    dkw: 'charge', dk: 'dragonbreath', slw: 'charge', sl: 'quake', fiw: 'charge', fi: 'fireball',
    ykw: 'charge', yk: 'dragonbreath', acw: 'charge', ac: 'acid', hsw: 'charge', hs: 'quake', rcw: 'charge', rc: 'rubble',
    lgw: 'charge', lg: 'thunder', frw: 'charge', fr: 'fireball', fqw: 'charge', fq: 'quake', wbw: 'charge', wb: 'whoosh', spw: 'charge', sp: 'fireball', tpo: 'teleport', tpi: 'teleport', tn: 'whoosh', nvw: 'charge', nv: 'nova',
    twn: 'whoosh', olw: 'charge', ol: 'water', bmw: 'charge', bm: 'beam', bub: 'bubble', bubx: 'splash',
    mcast: 'charge', mgw: 'charge', mgf: 'inferno', mmw: 'charge', mmx: 'explosion', mlw: 'charge', mlw2: 'charge', ml: 'fireball', mlv: 'lava',
    wsp: 'charge', wsf: 'whoosh', wsl: 'beam', wsn: 'nova', wsi: 'explosion', wsa: 'whoosh', wsc: 'acid', wsh: 'shield',
    an_cast: 'charge', an_hw: 'charge', an_crack: 'quake', an_pt: 'teleport', an_bm: 'explosion', an_split: 'whoosh', an_merge: 'whoosh', an_rev: 'charge', an_mx: 'explosion', an_lw: 'charge', an_l: 'dragonbreath', an_bfw: 'charge', an_bf: 'fireball',
    rd_w: 'charge', rd_lw: 'charge', rd_pull: 'whoosh', rd_h: 'impact', rd_l: 'thunder', rd_pool: 'splash', rd_sh: 'shield',
  };
  const ELEM = { fire: 'fire', ice: 'ice', poison: 'poison', storm: 'storm', arcane: 'arcane', water: 'water', dark: 'dark', holy: 'holy', ranged: 'bow' };
  const HEAVY = /hacha|martillo|maza|mandoble|lanza|bast[oó]n de guerra|garrote|guada/i, QUICK = /daga|cuchillo|pu[nñ]al|estoque|garra|colmillo/i;
  X.on('fx', (f) => {
    if (!ac) return;
    const me = G.me; if (!me) return;
    const px = f.x !== undefined ? f.x : f.x1, py = f.y !== undefined ? f.y : f.y1;
    const dist = Math.hypot(px - me.x, py - me.y);
    if (dist > (BOSSFX[f.k] ? 22 : 14)) return;
    if (BOSSFX[f.k]) { play(BOSSFX[f.k]); return; }
    switch (f.k) {
      case 's': play(f.cr ? 'crit' : HEAVY.test(f.w || '') ? 'heavy' : QUICK.test(f.w || '') ? 'quick' : 'slash'); break;
      case 'p': play(ELEM[f.s] || 'magic'); break;
      case 'd': if (f.c === 'h') play('hit'); else if (f.c === 'p' && dist < 1.5) play('hurt'); else if (f.c === 'g') play('heal'); break;
      case 'x': play('die'); break;
      case 'l': play('level'); break;
      case 'sk': play('skill'); break;
    }
  });
  let lastGold = null, lastN = -1;
  X.on('inv', (m) => { if (lastGold !== null && m.gold > lastGold) play('coin'); else if (lastN >= 0 && m.inv.filter(Boolean).length > lastN) play('pick'); lastGold = m.gold; lastN = m.inv.filter(Boolean).length; });
  X.on('msg', (m) => { if (m.t === 'quest_done') play('quest'); else if (m.t === 'ach') play('ach'); else if (m.t === 'event') play('boss'); });
  X.on('snap', () => {
    const z = X.zoneAt && G.me ? X.zoneAt(G.me.x, G.me.y) : null; if (!z) return;
    let key = THEME[z.id] || (z.kind === 'dungeon' ? 'dungeon' : z.pvp ? 'pvp' : z.kind === 'town' ? 'town' : 'wild');
    if (/^raid_/.test(z.id)) key = z.id === 'raid_hall' ? 'raidhall' : 'raid';
    // pelea de jefe cerca: música de batalla
    let boss = false;
    for (const e of G.ents.values()) { if (e.kind !== 'mo' || !(e.h > 0)) continue; const d = G.mons[e.t]; if (d && d.boss && Math.max(Math.abs(e.x - G.me.x), Math.abs(e.y - G.me.y)) <= 15) { boss = true; break; } }
    setMood(boss && key !== 'raidhall' ? 'battle' : key);
  });

  /* ---------- música: un tema distinto por zona, más percusión en combates contra jefes ---------- */
  // scale: semitonos desde la tónica · lead: patrón de melodía (índices) · perc: ritmo · dens: probabilidad de nota · oct: octava de la melodía
  const T = {
    town:    { root: 196, sc: [0, 2, 4, 7, 9, 12], bpm: 76, wave: 'triangle', pad: [0, 4, 7], lead: [0, 2, 4, 3, 5, 3, 4, 2], dens: 0.85, oct: 2, perc: 'none' },
    pueblo:  { root: 175, sc: [0, 2, 4, 7, 9, 11], bpm: 66, wave: 'sine', pad: [0, 4, 9], lead: [0, 1, 3, 2, 4, 2, 1, 0], dens: 0.7, oct: 2, perc: 'none', swell: 1 },
    prado:   { root: 220, sc: [0, 2, 4, 7, 9, 12], bpm: 72, wave: 'triangle', pad: [0, 7, 12], lead: [0, 2, 1, 3, 2, 4, 3, 1], dens: 0.8, oct: 2, perc: 'none' },
    wild:    { root: 175, sc: [0, 3, 5, 7, 10, 12], bpm: 62, wave: 'sine', pad: [0, 7, 10], lead: [0, 2, 4, 3, 5, 3, 4, 2], dens: 0.75, oct: 2, perc: 'none' },
    bosque:  { root: 147, sc: [0, 2, 3, 7, 8, 12], bpm: 56, wave: 'sine', pad: [0, 3, 7], lead: [0, 3, 2, 4, 1, 3, 5, 2], dens: 0.6, oct: 2, perc: 'soft', drone: 1 },
    cumbres: { root: 330, sc: [0, 2, 4, 6, 7, 11], bpm: 50, wave: 'sine', pad: [0, 7, 11], lead: [0, 3, 5, 2, 4, 1, 5, 3], dens: 0.5, oct: 1, perc: 'none', long: 1 },
    dunas:   { root: 165, sc: [0, 1, 4, 5, 7, 8], bpm: 84, wave: 'triangle', pad: [0, 7, 12], lead: [0, 1, 2, 1, 3, 2, 4, 5], dens: 0.8, oct: 2, perc: 'tribal' },
    pantano: { root: 98, sc: [0, 1, 3, 6, 7, 10], bpm: 46, wave: 'sawtooth', pad: [0, 6, 7], lead: [0, 2, 1, 4, 3, 5, 2, 1], dens: 0.5, oct: 2, perc: 'none', drone: 1, dark: 1 },
    selva:   { root: 185, sc: [0, 2, 3, 7, 9, 12], bpm: 94, wave: 'triangle', pad: [0, 7, 10], lead: [0, 0, 2, 3, 2, 0, 4, 3], dens: 0.85, oct: 2, perc: 'tribal' },
    volcan:  { root: 82, sc: [0, 1, 5, 7, 8, 12], bpm: 58, wave: 'sawtooth', pad: [0, 7, 8], lead: [0, 1, 0, 3, 2, 4, 1, 0], dens: 0.55, oct: 2, perc: 'soft', drone: 1, dark: 1 },
    costa:   { root: 196, sc: [0, 2, 4, 7, 9, 12], bpm: 64, wave: 'sine', pad: [0, 4, 7], lead: [0, 2, 4, 2, 3, 1, 2, 0], dens: 0.65, oct: 2, perc: 'none', swell: 1 },
    catac:   { root: 110, sc: [0, 2, 3, 6, 7, 11], bpm: 44, wave: 'sine', pad: [0, 3, 6], lead: [0, 4, 2, 5, 1, 3, 0, 4], dens: 0.35, oct: 2, perc: 'none', long: 1, dark: 1 },
    minas:   { root: 131, sc: [0, 2, 3, 5, 7, 10], bpm: 88, wave: 'square', pad: [0, 7, 12], lead: [0, 2, 1, 3, 2, 4, 3, 2], dens: 0.7, oct: 2, perc: 'soft', quiet: 1 },
    dungeon: { root: 110, sc: [0, 1, 5, 7, 8, 12], bpm: 50, wave: 'sine', pad: [0, 5, 8], lead: [0, 2, 4, 3, 5, 3, 4, 2], dens: 0.6, oct: 2, perc: 'none', drone: 1, dark: 1 },
    pvp:     { root: 123, sc: [0, 3, 6, 7, 10, 12], bpm: 92, wave: 'sawtooth', pad: [0, 6, 7], lead: [0, 2, 4, 3, 5, 3, 4, 2], dens: 0.8, oct: 2, perc: 'soft', pulse: 1 },
    dragon:  { root: 87, sc: [0, 1, 4, 5, 7, 8], bpm: 54, wave: 'sawtooth', pad: [0, 5, 8], lead: [0, 1, 3, 2, 4, 1, 5, 2], dens: 0.5, oct: 2, perc: 'soft', drone: 1, dark: 1 },
    jade:    { root: 196, sc: [0, 2, 5, 7, 9, 12], bpm: 60, wave: 'triangle', pad: [0, 7, 12], lead: [0, 3, 2, 4, 1, 5, 3, 2], dens: 0.65, oct: 2, perc: 'soft', swell: 1 },
    nube:    { root: 262, sc: [0, 2, 4, 6, 7, 11], bpm: 54, wave: 'sine', pad: [0, 4, 7, 11], lead: [0, 2, 4, 5, 3, 2, 4, 1], dens: 0.6, oct: 1, perc: 'none', long: 1 },
    arana:   { root: 117, sc: [0, 1, 3, 6, 7, 9], bpm: 62, wave: 'sawtooth', pad: [0, 6, 1], lead: [0, 3, 1, 5, 2, 4, 0, 5], dens: 0.4, oct: 2, perc: 'soft', dark: 1 },
    mar:     { root: 156, sc: [0, 2, 3, 7, 8, 10], bpm: 48, wave: 'sine', pad: [0, 3, 7], lead: [0, 2, 1, 3, 2, 4, 1, 0], dens: 0.55, oct: 2, perc: 'none', swell: 1, drone: 1 },
    anubis:  { root: 62, sc: [0, 1, 4, 5, 7, 8, 11], bpm: 62, wave: 'triangle', pad: [0, 4, 7], lead: [0, 4, 3, 1, 0, 5, 4, 7], dens: 0.5, oct: 2, perc: 'tribal', drone: 1, dark: 1 },
    magma:   { root: 73, sc: [0, 1, 3, 6, 7, 8], bpm: 68, wave: 'sawtooth', pad: [0, 7, 8], lead: [0, 1, 0, 2, 3, 2, 4, 1], dens: 0.6, oct: 2, perc: 'tribal', drone: 1, dark: 1 },
    raidhall:{ root: 147, sc: [0, 2, 4, 7, 9, 12], bpm: 66, wave: 'triangle', pad: [0, 7, 12], lead: [0, 2, 4, 5, 4, 2, 3, 1], dens: 0.7, oct: 2, perc: 'soft' },
    raid:    { root: 110, sc: [0, 2, 3, 7, 8, 12], bpm: 100, wave: 'sawtooth', pad: [0, 3, 7], lead: [0, 2, 4, 3, 5, 3, 4, 1], dens: 0.85, oct: 2, perc: 'battle', pulse: 1, dark: 1 },
    battle:  { root: 98, sc: [0, 1, 3, 7, 8, 10], bpm: 116, wave: 'sawtooth', pad: [0, 3, 7], lead: [0, 2, 3, 2, 4, 3, 5, 1], dens: 0.9, oct: 2, perc: 'battle', pulse: 1, dark: 1 },
  };
  T.dungeon2 = T.dungeon;
  const THEME = {
    ciudad: 'town', puerto: 'costa', aldea: 'pueblo', prado: 'prado', colinas: 'prado', sabana: 'prado', playa: 'costa',
    bosque: 'bosque', cumbres: 'cumbres', dunas: 'dunas', pantano: 'pantano', selva: 'selva', volcan: 'volcan',
    catacumbas: 'catac', minas: 'minas', abismo: 'pvp', piramide: 'pvp', fortaleza: 'pvp',
    cueva: 'dragon', cueva_jade: 'jade', cueva_nube: 'nube', cueva_arana: 'arana', cueva_mar: 'mar', cueva_magma: 'magma', cueva_anubis: 'anubis',
    montana_alta: 'cumbres', nubes_reino: 'nube', desierto_piramides: 'dunas', paraiso: 'costa', tierras_nuevas: 'prado', ciudad_alba: 'town',
  };
  let mood = 'town', nextT = 0, stepN = 0, moodAt = 0;
  function setMood(m) {
    if (m === mood || !T[m]) return;
    mood = m; stepN = 0; nextT = 0;
    if (ac && musG) { const t = ac.currentTime; musG.gain.cancelScheduledValues(t); musG.gain.setValueAtTime(musG.gain.value, t); musG.gain.linearRampToValueAtTime(0.0, t + 0.5); musG.gain.linearRampToValueAtTime(0.22, t + 1.3); }
  }
  const hz = (root, semis) => root * Math.pow(2, semis / 12);
  function musicNote(f, dur, type, vol0, when, lp = 1600) {
    const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = lp;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol0, when + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(fl); fl.connect(g); g.connect(musG); o.start(when); o.stop(when + dur + 0.1);
  }
  function drum(kind, when, vol0 = 0.3) {
    if (kind === 'kick' || kind === 'tom') {
      const o = ac.createOscillator(), g = ac.createGain(), f0 = kind === 'kick' ? 120 : 190;
      o.frequency.setValueAtTime(f0, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.18);
      g.gain.setValueAtTime(vol0, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.25);
      o.connect(g); g.connect(musG); o.start(when); o.stop(when + 0.3);
    } else if (noiseBuf) {
      const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; fl.type = kind === 'hat' ? 'highpass' : 'bandpass'; fl.frequency.value = kind === 'hat' ? 7000 : 1800;
      g.gain.setValueAtTime(vol0 * (kind === 'hat' ? 0.35 : 0.8), when); g.gain.exponentialRampToValueAtTime(0.0001, when + (kind === 'hat' ? 0.05 : 0.14));
      s.connect(fl); fl.connect(g); g.connect(musG); s.start(when, Math.random()); s.stop(when + 0.2);
    }
  }
  function swell(when, dur) {
    if (!noiseBuf) return;
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; fl.type = 'lowpass'; fl.frequency.setValueAtTime(300, when); fl.frequency.linearRampToValueAtTime(900, when + dur * 0.5); fl.frequency.linearRampToValueAtTime(300, when + dur);
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(0.09, when + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, when + dur);
    s.connect(fl); fl.connect(g); g.connect(musG); s.start(when, Math.random()); s.stop(when + dur + 0.1);
  }
  const PERC = {
    soft:   (n, t, b) => { if (n % 4 === 0) drum('tom', t, 0.14); },
    tribal: (n, t, b) => { if (n % 8 === 0 || n % 8 === 3 || n % 8 === 6) drum('tom', t, 0.22); if (n % 2 === 1) drum('hat', t, 0.12); },
    battle: (n, t, b) => { if (n % 2 === 0) drum('kick', t, 0.34); if (n % 4 === 2) drum('snare', t, 0.26); drum('hat', t + b * 0.5, 0.1); if (n % 8 === 7) drum('tom', t + b * 0.5, 0.2); },
  };
  function schedule() {
    if (!ac) return;
    setTimeout(schedule, 250);
    if (muted || ac.state !== 'running') { nextT = 0; return; }
    const sc = T[mood] || T.town, beat = 60 / sc.bpm, vq = sc.quiet ? 0.6 : 1;
    if (!nextT || nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.6) {
      const n = stepN++;
      if (n % 8 === 0) for (const p of sc.pad) musicNote(hz(sc.root / 2, p), beat * 7.5, sc.dark ? 'triangle' : 'sine', 0.1 * vq, nextT, 900);          // acorde largo
      if (sc.drone && n % 8 === 0) musicNote(hz(sc.root / 4, 0), beat * 8, 'sine', 0.12, nextT, 400);                                                  // bordón grave
      if (sc.swell && n % 8 === 4) swell(nextT, beat * 6);                                                                                              // oleaje
      const pat = sc.lead[n % 8];
      if (Math.random() < sc.dens) musicNote(hz(sc.root * sc.oct, sc.sc[pat % sc.sc.length]), beat * (sc.long ? 3 : 1.6), sc.wave, 0.07 * vq, nextT, sc.dark ? 1100 : 1900);
      if (sc.pulse && n % 2 === 0) musicNote(hz(sc.root / 2, 0), beat * 0.4, 'square', 0.05, nextT);                                                    // pulso grave
      const pc = PERC[sc.perc]; if (pc) pc(n, nextT, beat);
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
