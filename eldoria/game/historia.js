'use strict';
/* MODO HISTORIA de las cuevas de jefe.
   · Al entrar a una cueva por primera vez se muestra la escena de entrada.
   · Dentro hay 3 tablillas (capítulos): se leen acercándose. Se guardan en el Diario (tecla Y).
   · Al derrotar al jefe (participando) se desbloquea el final y el logro de esa cueva.
   · Al completar TODAS las historias: logro «Cronista de Eldoria» (título).

   PARA AÑADIR UN JEFE NUEVO: basta con añadir un objeto a STORIES (abajo) con la misma `cave` que en INST_CAVES
   (game/world.js). Las tablillas se colocan solas entre la entrada y la guarida. Un test falla si una cueva no tiene historia. */
const world = require('./world');
const W = world.W;
const kxy = (x, y) => y * W + x;
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// Saga: «Los Ocho Sellos» (y el noveno guardián). La Orden de los Guardianes encerró al Sin Nombre tras ocho sellos; cada guardián se corrompió.
const STORIES = [
  { boss: 'dragon_sombra', cave: 'cueva', icon: '🐉', name: 'El Dragón de las Sombras', gold: 20000,
    intro: ['Hace mil años, ocho guardianes juraron proteger los Sellos que encierran al Sin Nombre.', 'Aquí, bajo la montaña, el primer Sello aún late… y algo enorme respira en la oscuridad.'],
    chapters: [
      { title: 'El juramento', text: 'La Orden de los Guardianes eligió al dragón Vharrek por ser el más sabio de su especie. «Mientras el Sello respire, yo no dormiré», juró ante los ocho.' },
      { title: 'La primera grieta', text: 'Con los siglos, la luz del Sello se volvió sombra. Vharrek dejó de custodiarlo y empezó a alimentarse de él. Sus escamas se volvieron negras como el carbón.' },
      { title: 'Aviso a los viajeros', text: 'Quien lea esto: el dragón no es un monstruo, es un guardián roto. Si cae, el primer Sello quedará libre de su hambre. Quedan siete más.' } ],
    ending: ['Vharrek cae con un último suspiro: «…gracias… guardad los demás…».', 'El primer Sello vuelve a brillar con calma. Pero lejos, bajo un bosque de jade, otro Sello tiembla.'] },
  { boss: 'hidra_jade', cave: 'cueva_jade', icon: '🐲', name: 'La Hidra de Jade', gold: 25000,
    intro: ['El segundo Sello descansa en una cueva envuelta en jade y veneno.', 'Cada cabeza de su guardiana recuerda un juramento distinto… y las olvida todas.'],
    chapters: [
      { title: 'Siete cabezas', text: 'La Hidra fue la guardiana más leal: cada cabeza vigilaba una hora del día para que el Sello jamás quedara solo.' },
      { title: 'El veneno de la espera', text: 'Nadie vino a relevarla. Las cabezas empezaron a discutir y el veneno que protegía el Sello comenzó a corromperlo todo.' },
      { title: 'Grabado en jade', text: '«Si la Hidra sigue creciendo, el Sello se ahogará en su propio veneno. Cortad la cabeza que miente. Todas mienten.»' } ],
    ending: ['Las cabezas callan por fin, una a una.', 'El jade vuelve a ser claro. En el cielo, una luz celestial parpadea como pidiendo ayuda.'] },
  { boss: 'arcangel', cave: 'cueva_nube', icon: '👼', name: 'El Arcángel del Santuario', gold: 30000,
    intro: ['Sobre las nubes se alza el Santuario del tercer Sello.', 'Su guardián era el más puro de todos… y por eso fue el más fácil de engañar.'],
    chapters: [
      { title: 'La voz amable', text: 'Una voz le susurró al Arcángel que la Orden lo había abandonado. «Nadie volverá. Libera el Sello y todos serán perdonados.»' },
      { title: 'Plumas negras', text: 'Cada mentira que creyó le oscureció una pluma. Cuando la última se tiñó, el Santuario dejó de rezar y empezó a juzgar.' },
      { title: 'El último ruego', text: 'Una pluma blanca quedó sobre el altar con una nota: «Si me vencéis, recordadme como era. La voz sigue hablando desde abajo».' } ],
    ending: ['El Arcángel sonríe antes de deshacerse en luz: «Era él… el Sin Nombre me hablaba».', 'Entre las telarañas del bosque oscuro, un Sello se cubre de seda negra.'] },
  { boss: 'aracnido_fuego', cave: 'cueva_arana', icon: '🕷️', name: 'El Aracnídeo Fuego Negro', gold: 35000,
    intro: ['Una cueva tejida de seda y brasas guarda el cuarto Sello.', 'Lo que la habita ya no recuerda ser un guardián: solo teje.'],
    chapters: [
      { title: 'La tejedora', text: 'Ilvarra, la Tejedora, cosía los hilos del Sello con fuego para que nadie pudiera deshacerlos.' },
      { title: 'Hilos de ceniza', text: 'El fuego dejó de obedecerla. Sus hilos se volvieron negros y ardían sin consumirse: un fuego que nace del Sello mismo.' },
      { title: 'Una advertencia', text: '«No toquéis la seda: recuerda a quien la toca. Y lo que recuerda… lo repite.»' } ],
    ending: ['El fuego negro se apaga y la seda se deshace como ceniza.', 'Desde el mar llega un rumor de olas imposible: el Sello del abismo se agita.'] },
  { boss: 'leviatan', cave: 'cueva_mar', icon: '🌊', name: 'El Leviatán Abisal', gold: 40000,
    intro: ['Bajo las olas, una cueva guarda el quinto Sello.', 'Dicen que el mar entero obedece a su guardián… y que ahora lo teme.'],
    chapters: [
      { title: 'La marea obediente', text: 'El Leviatán prometió que ninguna marea cruzaría el Sello. Durante siglos las olas se doblaron ante él.' },
      { title: 'La marea contraria', text: 'Un día el mar no obedeció. Algo desde el fondo lo llamaba con una voz más antigua que el Leviatán.' },
      { title: 'Coral negro', text: 'Donde el Sello se rompe, el coral muere y crece negro. «Si el coral llega a la superficie, el Sin Nombre respirará.»' } ],
    ending: ['El Leviatán se hunde en silencio y la marea vuelve a obedecer.', 'Muy al sur, bajo la tierra, un corazón de lava se acelera.'] },
  { boss: 'ignaros', cave: 'cueva_magma', icon: '🌋', name: 'Ignaros, Soberano del Magma', gold: 45000,
    intro: ['En el corazón del volcán arde el sexto Sello.', 'Ignaros fue el guardián más orgulloso. Su orgullo fue la grieta por donde entró el Sin Nombre.'],
    chapters: [
      { title: 'El orgullo del fuego', text: 'Ignaros decía que el Sello era suyo y no de la Orden. Se coronó soberano y expulsó a los demás guardianes.' },
      { title: 'La corona de lava', text: 'El Sin Nombre le ofreció poder a cambio de un solo favor: «Abre una rendija». Ignaros creyó que podía controlarla.' },
      { title: 'Rendija', text: 'Marcas de garras en la roca: «La rendija ya no se cierra. Algo ha pasado por aquí, y camina hacia el desierto».' } ],
    ending: ['La corona de lava se enfría y se parte.', 'Allí, entre las arenas, un juez eterno despierta al sentir que el Sello se debilita.'] },
  { boss: 'anubis', cave: 'cueva_anubis', icon: '🐺', name: 'Anubis, Juez de las Sombras', gold: 50000,
    intro: ['Las arenas esconden el séptimo Sello, vigilado por un juez que pesa el alma de quien se acerca.', 'Nadie ha superado su balanza sin ser culpable de algo.'],
    chapters: [
      { title: 'La balanza', text: 'Anubis juzgaba a los muertos del desierto. La Orden le confió el Sello porque nada engaña a una balanza.' },
      { title: 'El peso de una pluma', text: 'El Sin Nombre no lo engañó: le mostró que todos los muertos eran culpables. Anubis empezó a condenar a todos.' },
      { title: 'Las vendas eternas', text: '«Un juez que condena a todos ya no juzga: obedece. Pesad su corazón y veréis a quién obedece.»' } ],
    ending: ['La balanza se equilibra por primera vez en siglos.', 'Solo queda el último Sello, en lo más alto, donde nace el trueno.'] },
  { boss: 'zeus', cave: 'cueva_olimpo', icon: '⚡', name: 'Zeus, Señor del Olimpo', gold: 60000,
    intro: ['En lo alto, sobre el viento y el trueno, está el último Sello: el octavo.', 'El Señor del Olimpo fue el primero en jurar y el último en caer.'],
    chapters: [
      { title: 'El primer juramento', text: 'Zeus fundó la Orden. Forjó los ocho Sellos con su último trueno y repartió su custodia entre los guardianes que consideraba hermanos.' },
      { title: 'Siete hermanos caídos', text: 'Uno a uno, sus hermanos se corrompieron. Zeus lo sintió en cada rayo, y se quedó solo con el Sello más grande.' },
      { title: 'Cada rayo, un nombre', text: '«Cada rayo que cae es un guardián que recuerdo. Si venís a liberarme, hacedlo antes de que olvide por qué luché.»' } ],
    ending: ['Zeus cae sobre su trono y los ocho Sellos brillan a la vez.', '«El Sin Nombre sigue ahí… pero ya no está solo ni libre. Gracias, héroes. El mundo recordará.»'] },
  { boss: 'hades', cave: 'cueva_hades', icon: '🔥', name: 'Hades, Rey del Inframundo', gold: 70000,
    intro: ['Más allá del Portal Maldito, bajo un cielo de ceniza, se extiende El Inframundo.', 'En su trono reina Hades, el noveno guardián: el que cierra el cerrojo desde dentro.'],
    chapters: [
      { title: 'El noveno guardián', text: 'Cuando la Orden forjó los ocho Sellos, Hades se ofreció a guardar el último cerrojo: el que solo se cierra desde dentro. Nadie entendió que aceptaba un exilio.' },
      { title: 'La corona de brasas', text: 'El fuego del Sin Nombre ardió siglos contra la puerta. Hades lo contuvo con su propio cuerpo: su armadura se agrietó y la luz de su pecho se volvió un eclipse.' },
      { title: 'El juicio de los vivos', text: '«Quien llegue hasta aquí viene a liberar o a liberarse. Mi guadaña devuelve todo golpe: solo vence quien sabe cuándo dejar de pegar… y cuándo apartarse.»' } ],
    ending: ['Hades cae de rodillas y la guadaña se apaga: «Por fin… alguien que sabe esperar.»', 'La puerta interior se cierra con un eco. El Sin Nombre sigue dormido… por ahora.'] },
];

const BY_BOSS = Object.fromEntries(STORIES.map((s) => [s.boss, s]));
const BY_CAVE = Object.fromEntries(STORIES.map((s) => [s.cave, s]));

// posición de las tablillas: tres puntos entre la entrada y la guarida, en suelo transitable
function stonesOf(s) {
  if (s.stones) return s.stones;
  const C = world.CAVES_BY_ZONE[s.cave]; const out = [];
  if (!C) return (s.stones = out);
  const [ix, iy] = C.inside, [lx, ly] = C.lair, [x0, y0, x1, y1] = C.rect, used = new Set();
  const fr = [0.28, 0.52, 0.76].slice(0, s.chapters.length);
  for (const t of fr) {
    const cx = Math.round(ix + (lx - ix) * t), cy = Math.round(iy + (ly - iy) * t); let best = null;
    for (let r = 0; r <= 5 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy;
      if (x < x0 || x > x1 || y < y0 || y > y1 || !world.isWalkable(x, y) || used.has(kxy(x, y))) continue;
      if (world.PORTALS.some((q) => q.x === x && q.y === y)) continue;
      if (cheb(x, y, lx, ly) <= 3) continue;
      best = [x, y]; break;
    }
    if (best) { used.add(kxy(best[0], best[1])); out.push(best); }
  }
  return (s.stones = out);
}

const ACH_ID = (boss) => 'hist_' + boss;
// logros: uno por historia terminada + el título global (se añaden a la lista de logros del juego)
function addAchs(ACHS) {
  for (const s of STORIES) ACHS.push([ACH_ID(s.boss), `Historia: ${s.name}`, `Lee los 3 capítulos de la cueva y presencia el final de ${s.name}.`, 'story:' + s.boss, 1, s.gold, '']);
  ACHS.push(['hist_todas', 'Cronista de Eldoria', 'Completa la historia de todas las cuevas de jefe.', 'story_all', 1, 250000, 'Cronista de Eldoria']);
}

const defStory = () => ({});
function sanitize(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [b, v] of Object.entries(raw)) {
    const s = BY_BOSS[b]; if (!s || !v || typeof v !== 'object') continue;
    out[b] = { i: v.i ? 1 : 0, c: (Array.isArray(v.c) ? v.c : []).filter((n, k, a) => Number.isInteger(n) && n >= 0 && n < s.chapters.length && a.indexOf(n) === k), e: v.e ? 1 : 0 };
  }
  return out;
}
const done = (p, boss) => { const st = p.ext.story && p.ext.story[boss], s = BY_BOSS[boss]; return !!(st && s && st.e && st.c.length >= s.chapters.length); };
function value(p, type) {
  if (type === 'story_all') return STORIES.every((s) => done(p, s.boss)) ? 1 : 0;
  if (type.startsWith('story:')) return done(p, type.slice(6)) ? 1 : 0;
  return 0;
}

function install(Game) {
  const P = Game.prototype;
  const st = (p, boss) => { if (!p.ext.story) p.ext.story = {}; return p.ext.story[boss] || (p.ext.story[boss] = { i: 0, c: [], e: 0 }); };
  const caveOf = (zid) => { if (BY_CAVE[zid]) return BY_CAVE[zid]; const m = /^inst_(.+)_\d+$/.exec(zid); return m ? BY_CAVE[m[1]] : null; };

  // definición para el cliente: títulos, tablillas y lo ya leído (el texto de lo no leído NO se envía)
  P.sendStory = function (p) {
    const v = STORIES.map((s) => {
      const e = (p.ext.story && p.ext.story[s.boss]) || { i: 0, c: [], e: 0 };
      return { boss: s.boss, cave: s.cave, icon: s.icon, name: s.name, n: s.chapters.length, stones: stonesOf(s), c: e.c.slice().sort((a, b) => a - b), ch: e.c.map((k) => [k, s.chapters[k].title, s.chapters[k].text]), intro: e.i ? s.intro : null, end: e.e ? s.ending : null, done: done(p, s.boss) };
    });
    this.send(p, { t: 'story', k: 'all', v });
  };
  P.storyDone = function (p, s) {
    if (this.checkAch) this.checkAch(p);
    if (done(p, s.boss)) this.msgC(p, `📖 Historia completada: ${s.name}`, '#ffd96a');
  };

  const T0 = P.tickExt;
  P.tickExt = function (now) {
    T0.call(this, now);
    this.storyN = (this.storyN || 0) + 1; if (this.storyN % 2) return;        // cada ~100 ms
    for (const p of this.players.values()) {
      if (p.dead || !p.ext) continue;
      const zid = world.zoneAt(p.x, p.y).id, s = caveOf(zid); if (!s) continue;
      const e = st(p, s.boss);
      if (!e.i) { e.i = 1; p.storyUntil = this.now + 90000; p.storyCap = this.now + 300000; this.send(p, { t: 'story', k: 'intro', boss: s.boss, icon: s.icon, name: s.name, lines: s.intro }); this.sendStory(p); continue; }
      if (zid !== s.cave) continue;            // las tablillas solo existen en la cueva original
      const sts = stonesOf(s);
      for (let k = 0; k < sts.length; k++) {
        if (e.c.includes(k) || cheb(p.x, p.y, sts[k][0], sts[k][1]) > 1) continue;
        e.c.push(k); p.storyUntil = this.now + 60000; p.storyCap = this.now + 300000; this.send(p, { t: 'story', k: 'ch', boss: s.boss, icon: s.icon, name: s.name, i: k, n: s.chapters.length, title: s.chapters[k].title, text: s.chapters[k].text });
        this.sendStory(p); this.storyDone(p, s); break;
      }
    }
  };

  // al derrotar al jefe: los participantes desbloquean el final
  const K0 = P.killMonster;
  P.killMonster = function (m, now) {
    const s = BY_BOSS[m.type], parts = [];
    if (s) { let total = 0; for (const [pid, e] of m.dmgBy) { const pl = this.ents.get(pid); if (pl && pl.kind === 'pl' && now - e.t <= 180000) { parts.push([pl, e.dmg]); total += e.dmg; } } for (let i = parts.length - 1; i >= 0; i--) if (parts[i][1] < total * 0.01) parts.splice(i, 1); }
    const r = K0.call(this, m, now);
    for (const [pl] of parts) {
      if (!pl.ext) continue; const e = st(pl, s.boss);
      if (!e.e) { e.e = 1; pl.storyUntil = this.now + 60000; pl.storyCap = this.now + 300000; this.send(pl, { t: 'story', k: 'end', boss: s.boss, icon: s.icon, name: s.name, lines: s.ending }); this.sendStory(pl); this.storyDone(pl, s); }
    }
    return r;
  };

  // mientras lees una escena o tablilla nadie te puede dañar (hasta pulsar «Continuar», máx. 30 s)
  const HS0 = P.hurtPlayer;
  P.hurtPlayer = function (p, raw, src, now, srcName) {
    if (p.storyUntil && p.storyUntil > (now || this.now)) return 0;
    return HS0.call(this, p, raw, src, now, srcName);
  };
  // mientras la escena sigue abierta el cliente avisa cada ~2 s: la protección se mantiene (tope 5 min); al cerrarla quedan 6 s de margen
  P.storyHold = function (p) { if (p.storyUntil && p.storyUntil > this.now && p.storyCap > this.now) p.storyUntil = Math.max(p.storyUntil, Math.min(p.storyCap, this.now + 8000)); };
  P.storyAck = function (p) { if (p.storyUntil && p.storyUntil > this.now) p.storyUntil = this.now + 6000; };

  const L0 = P.onLogin;
  P.onLogin = function (p) { L0.call(this, p); this.sendStory(p); };
}

module.exports = { STORIES, BY_BOSS, BY_CAVE, stonesOf, addAchs, sanitize, value, done, install, ACH_ID };
