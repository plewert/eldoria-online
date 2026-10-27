'use strict';
/**
 * Misiones de los PNJ. type: kill (matar n de un monstruo), killany (matar n monstruos cualquiera) o collect (entregar n objetos).
 * reward: { g: oro, xp: experiencia, items: [[id, cantidad]] }. repeat: horas hasta poder repetirla.
 */
const QUESTS = [
  // ---- Boris el Mercader ----
  { id: 'ratas',     npc: 'boris', lv: 1,  title: 'Plaga de ratas',        desc: 'Las ratas se comen mis sacos de grano. Mata 8 ratas en el Prado.', type: 'kill', mon: 'rata', n: 8, reward: { g: 60, xp: 80, items: [['pocion_vida', 3]] } },
  { id: 'conejos',   npc: 'boris', lv: 1,  title: 'Patas de la suerte',     desc: 'Los viajeros pagan bien por patas de conejo. Tráeme 5.', type: 'collect', item: 'pata_conejo', n: 5, reward: { g: 50, xp: 60, items: [['sombrero_aprendiz', 1]] } },
  { id: 'serpientes',npc: 'boris', lv: 3,  title: 'Veneno para el herbolario', desc: 'Mata 8 serpientes: su veneno me sirve para vender.', type: 'kill', mon: 'serpiente', n: 8, reward: { g: 140, xp: 260, items: [['cinto_cuero', 1]] }, after: 'ratas' },
  { id: 'seda',      npc: 'boris', lv: 5,  title: 'Seda para el sastre',    desc: 'Necesito 6 madejas de seda de araña.', type: 'collect', item: 'seda_arana', n: 6, reward: { g: 320, xp: 500, items: [['tunica_aprendiz', 1], ['guantes_tela', 1]] } },
  { id: 'diaria_boris', npc: 'boris', lv: 5, title: 'Encargo diario: limpieza', desc: 'Acaba con 15 monstruos de donde quieras. Vuelve mañana por otro encargo.', type: 'killany', n: 15, reward: { g: 400, xp: 700, items: [['pocion_vida_g', 2]] }, repeat: 20 },
  // ---- Orin el Sabio ----
  { id: 'huesos',    npc: 'orin',  lv: 6,  title: 'Huesos inquietos',       desc: 'Los esqueletos de las Catacumbas no descansan. Derrota a 12.', type: 'kill', mon: 'esqueleto', n: 12, reward: { g: 420, xp: 900, items: [['baculo_nudoso', 1]] } },
  { id: 'alas',      npc: 'orin',  lv: 6,  title: 'Alas nocturnas',         desc: 'Para mis pociones necesito 6 alas de murciélago.', type: 'collect', item: 'ala_murcielago', n: 6, reward: { g: 300, xp: 700, items: [['pocion_mana', 5], ['sombrero_bosque', 1]] } },
  { id: 'necro',     npc: 'orin',  lv: 10, title: 'Polvo de necrófago',     desc: 'Mata a 10 necrófagos y trae su polvo.', type: 'kill', mon: 'necrofago', n: 10, reward: { g: 900, xp: 2200, items: [['tunica_bruma', 1], ['libro_aprendiz', 1]] }, after: 'huesos' },
  { id: 'dragon',    npc: 'orin',  lv: 28, title: 'La escama del dragón',   desc: 'Entrégame 2 escamas de dragón: el mago que las posea será poderoso.', type: 'collect', item: 'escama_dragon', n: 2, reward: { g: 6000, xp: 9000, items: [['orbe_cristal', 1]] } },
  { id: 'reina',     npc: 'orin',  lv: 45, title: 'El corazón de la Reina', desc: 'Derrota a la Reina de Hielo en la Fortaleza helada.', type: 'kill', mon: 'reina_hielo', n: 1, reward: { g: 20000, xp: 40000, items: [['corona_gemas', 1], ['mascota_fantasma', 1]] } },
  // ---- Nilo el Pescador ----
  { id: 'pesca1', npc: 'nilo', lv: 1,  title: 'Primeras capturas',   desc: 'Cómprate una caña y pesca 10 sardinas en el río.', type: 'collect', item: 'sardina', n: 10, reward: { g: 150, xp: 120, items: [['cebo', 10]] } },
  { id: 'pesca2', npc: 'nilo', lv: 12, title: 'Salmones del norte',  desc: 'Tráeme 8 salmones de los ríos del norte o la selva.', type: 'collect', item: 'salmon', n: 8, reward: { g: 900, xp: 1500, items: [['cana_hierro', 1], ['cebo', 15]] } },
  { id: 'pesca3', npc: 'nilo', lv: 25, title: 'Atunes de la costa',  desc: 'Pesca 6 atunes en la costa y el mar abierto.', type: 'collect', item: 'atun', n: 6, reward: { g: 3000, xp: 5000, items: [['cebo_dorado', 10]] } },
  { id: 'pesca4', npc: 'nilo', lv: 40, title: 'El rey del mar',      desc: 'Tráeme 3 tiburones. Cuidado: muerden.', type: 'collect', item: 'tiburon', n: 3, reward: { g: 9000, xp: 14000, items: [['cana_acero', 1], ['perla_marina', 1]] } },
  // ---- Capitán Brisa ----
  { id: 'orcos',     npc: 'brisa', lv: 10, title: 'Amenaza orca',           desc: 'Los orcos acampan al norte. Elimina a 10.', type: 'kill', mon: 'orco', n: 10, reward: { g: 1200, xp: 2600, items: [['guantes_cuero', 1]] } },
  { id: 'pinzas',    npc: 'brisa', lv: 12, title: 'Pinzas para la sopa',    desc: 'La cocina del puerto necesita 8 pinzas de cangrejo.', type: 'collect', item: 'pinza_cangrejo', n: 8, reward: { g: 800, xp: 1800, items: [['mascota_cangrejo', 1]] } },
  { id: 'sirenas',   npc: 'brisa', lv: 14, title: 'Cantos peligrosos',      desc: 'Acaba con 8 sirenas que hunden mis barcos.', type: 'kill', mon: 'sirena', n: 8, reward: { g: 1600, xp: 3400, items: [['cinto_pociones', 1]] } },
  { id: 'forjador',  npc: 'brisa', lv: 25, title: 'El Maestro Forjador',    desc: 'Derrota al Maestro Forjador en las Minas Enanas.', type: 'kill', mon: 'maestro_forjador', n: 1, reward: { g: 7000, xp: 12000, items: [['faja_estelar', 1], ['montura_oso', 1]] } },
  // ---- Gerda la Banquera ----
  { id: 'bolsas',    npc: 'gerda', lv: 8,  title: 'Dinero robado',          desc: 'Los bandidos me robaron. Recupera 5 bolsas de bandido.', type: 'collect', item: 'bolsa_bandido', n: 5, reward: { g: 1500, xp: 1500, items: [['mascota_lobito', 1]] } },
  { id: 'trolls',    npc: 'gerda', lv: 15, title: 'Trolls en el camino',    desc: 'Mata a 8 trolls que asaltan mis transportes.', type: 'kill', mon: 'troll', n: 8, reward: { g: 2600, xp: 4800, items: [['faja_carmesi', 1]] } },
  // ---- Marta la Banquera ----
  { id: 'escorpiones', npc: 'marta', lv: 20, title: 'Aguijones del desierto', desc: 'Mata a 10 escorpiones de las Dunas.', type: 'kill', mon: 'escorpion', n: 10, reward: { g: 3000, xp: 6000, items: [['guantes_runas', 1]] } },
  { id: 'vendas',    npc: 'marta', lv: 22, title: 'Vendas antiguas',        desc: 'Trae 8 vendas de momia para mi colección.', type: 'collect', item: 'venda', n: 8, reward: { g: 3200, xp: 6500, items: [['libro_runa', 1]] } },
  { id: 'faraon',    npc: 'marta', lv: 40, title: 'La maldición del Faraón', desc: 'Derrota al Faraón en la Pirámide Olvidada.', type: 'kill', mon: 'faraon', n: 1, reward: { g: 15000, xp: 30000, items: [['capucha_llama', 1], ['montura_dragon', 1]] } },
];
module.exports = { QUESTS, byId: Object.fromEntries(QUESTS.map((q) => [q.id, q])) };
