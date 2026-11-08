'use strict';
/**
 * Especiales de las armas de jefe: cada arma de jefe (nivel 76 o más) lleva 2 habilidades propias, con las teclas 4 y 5.
 * A = más barata y frecuente; B = definitiva (más maná y enfriamiento largo).
 * kind: fan (abanico frente a ti), line (rayo en línea), nova (círculo en ti o en el objetivo, con empuje/aturdir/ralentizar/cegar),
 *       rain (impactos al azar alrededor del objetivo), volley (ráfaga de disparos al objetivo), cloud (zona que daña cada segundo),
 *       bolt (un impacto + curación al grupo), heal (curación al grupo + daño en círculo).
 * Contra jefes los controles (aturdir, ralentizar, cegar, atraer) duran la mitad o no funcionan (atraer).
 */
const mk = (id, name, icon, kind, o) => Object.assign({ id, name, icon, kind, cd: 30000, mana: 60, lv: 30, mult: 3, col: '255,200,90' }, o);
const SP = {
  // ---- armas de la Raid (nuevas) ----
  rd_rk_mace: [
    mk('sp_pulso_magma', 'Pulso de magma', '🔥', 'nova', { col: '255,130,40', r: 3, mult: 3, burn: { ticks: 5, mult: 0.35 }, stun: 1500, cd: 28000, mana: 60, desc: 'Onda de magma a tu alrededor (×3), quemadura y aturdimiento breve.' }),
    mk('sp_erupcion', 'Erupción', '🌋', 'rain', { col: '255,130,40', n: 7, r: 4, hr: 1.7, mult: 2, burn: { ticks: 4, mult: 0.3 }, cd: 80000, mana: 125, lv: 60, desc: '7 géiseres de lava brotan alrededor del objetivo (×2).' }),
  ],
  rd_ra_axe: [
    mk('sp_engranaje', 'Corte de engranaje', '⚙️', 'fan', { col: '255,200,120', mult: 3, cd: 25000, mana: 55, desc: 'Tres tajos de acero en abanico (×3).' }),
    mk('sp_sierra', 'Giro de sierra', '🌀', 'nova', { col: '255,200,120', r: 3, mult: 3.6, stun: 1500, cd: 75000, mana: 110, lv: 60, desc: 'Giras con el hacha (×3,6) y aturdes a los cercanos.' }),
  ],
  rd_rv_bow: [
    mk('sp_flecha_hidra', 'Flechas de la Hidra', '🐍', 'volley', { col: '110,255,120', hits: 5, span: 1500, mult: 1.5, cd: 28000, mana: 60, desc: 'Cinco flechas ponzoñosas al objetivo (×1,5 cada una).' }),
    mk('sp_lluvia_ponzona', 'Lluvia ponzoñosa', '☠️', 'rain', { col: '110,255,120', n: 8, r: 5, hr: 1.6, mult: 1.6, cd: 80000, mana: 130, lv: 60, desc: '8 flechas de veneno caen alrededor del objetivo.' }),
  ],
  rd_rx_bow: [
    mk('sp_flecha_solar', 'Flecha solar', '☀️', 'bolt', { col: '255,230,120', mult: 3.5, heal: 0.05, cd: 28000, mana: 60, desc: 'Flecha de luz (×3,5) que cura 5 % al grupo.' }),
    mk('sp_cielo_dorado', 'Cielo dorado', '🌟', 'rain', { col: '255,230,120', n: 8, r: 5, hr: 1.6, mult: 1.6, cd: 80000, mana: 130, lv: 60, desc: '8 flechas doradas caen del cielo (×1,6).' }),
  ],
  rd_rx_spear: [
    mk('sp_embestida', 'Embestida llameante', '🔥', 'line', { col: '255,170,70', len: 8, mult: 3.4, burn: { ticks: 4, mult: 0.3 }, cd: 25000, mana: 55, desc: 'Un lanzazo de fuego solar cruza 8 casillas (×3,4).' }),
    mk('sp_lanzazo_alba', 'Lanzazo del alba', '🌅', 'nova', { col: '255,230,150', r: 4, mult: 4, blind: 3000, cd: 80000, mana: 120, lv: 60, desc: 'Explosión de luz a tu alrededor (×4) que ciega.' }),
  ],
  rd_rm_bow: [
    mk('sp_flecha_vacio', 'Flecha del vacío', '🌑', 'volley', { col: '190,90,255', hits: 4, span: 1400, mult: 1.7, cd: 28000, mana: 60, desc: 'Cuatro flechas de vacío (×1,7 cada una).' }),
    mk('sp_horizonte', 'Horizonte de sucesos', '🕳️', 'nova', { col: '190,90,255', r: 6, mult: 4.5, pull: 4, atTarget: 1, cd: 90000, mana: 140, lv: 60, desc: 'Un agujero negro atrae a los enemigos y estalla (×4,5).' }),
  ],
  // ---- cuerpo a cuerpo ----
  fuego_garras: [
    mk('sp_zarpazo', 'Zarpazo infernal', '🔥', 'fan', { col: '190,80,255', mult: 3, burn: { ticks: 5, mult: 0.3 }, cd: 25000, mana: 55, desc: 'Tres cortes de fuego negro en abanico (×3) y quemadura 5 s.' }),
    mk('sp_eclipse', 'Eclipse de llamas', '🌑', 'nova', { col: '190,80,255', r: 3, mult: 3.5, burn: { ticks: 5, mult: 0.35 }, cd: 75000, mana: 110, lv: 60, desc: 'Explosión negra a tu alrededor (×3,5) con quemadura.' }),
  ],
  fuego_mandoble: [
    mk('sp_filo', 'Filo del viento', '🌪️', 'line', { col: '200,230,255', len: 8, mult: 3.2, cd: 25000, mana: 55, desc: 'Una onda de viento cruza 8 casillas en línea (×3,2).' }),
    mk('sp_ciclon', 'Ciclón de llamas', '🌀', 'nova', { col: '255,150,70', r: 3, mult: 2.6, slow: 3000, pull: 2, cd: 75000, mana: 110, lv: 60, desc: 'Atrae y ralentiza a los enemigos cercanos (×2,6).' }),
  ],
  mar_tridente: [
    mk('sp_marea', 'Marea', '🌊', 'nova', { col: '110,200,255', r: 3, mult: 2.5, slow: 4000, cd: 25000, mana: 55, desc: 'Una ola golpea a tu alrededor (×2,5) y ralentiza 4 s.' }),
    mk('sp_maremoto', 'Maremoto', '🌊', 'line', { col: '110,200,255', len: 10, mult: 3.6, slow: 4000, cd: 75000, mana: 110, lv: 60, desc: 'Un maremoto cruza 10 casillas (×3,6) y ralentiza.' }),
  ],
  rd_rk_hammer: [
    mk('sp_temblor', 'Temblor', '💢', 'nova', { col: '255,150,60', r: 3, mult: 2.8, stun: 2000, cd: 30000, mana: 60, desc: 'Golpe al suelo (×2,8) que aturde 2 s.' }),
    mk('sp_cataclismo', 'Cataclismo', '🌋', 'nova', { col: '255,150,60', r: 5, mult: 3.4, stun: 3000, cd: 80000, mana: 130, lv: 60, desc: 'Sacudida enorme (×3,4) que aturde 3 s.' }),
  ],
  rd_rm_staff: [
    mk('sp_singular', 'Singularidad', '⚫', 'nova', { col: '190,90,255', r: 3, mult: 4, pull: 3, atTarget: 1, cd: 35000, mana: 70, desc: 'Una singularidad atrae y daña a los enemigos (×4).' }),
    mk('sp_agujero', 'Agujeros negros', '🌌', 'rain', { col: '190,90,255', n: 8, r: 5, hr: 1.6, mult: 1.8, cd: 90000, mana: 140, lv: 60, desc: '8 agujeros negros caen alrededor del objetivo (×1,8).' }),
  ],

  // ---- a distancia ----
  jade_arco: [
    mk('sp_veneno_hidra', 'Aliento de la Hidra', '🐍', 'cloud', { col: '90,230,110', r: 3, secs: 6, mult: 0.9, slow: 2500, cd: 30000, mana: 60, desc: 'Nube venenosa que daña cada segundo y ralentiza.' }),
    mk('sp_tres_cabezas', 'Tres cabezas', '🐉', 'volley', { col: '90,230,110', hits: 6, span: 1500, mult: 1.6, cd: 80000, mana: 125, lv: 60, desc: 'Seis dardos venenosos al objetivo (×1,6 cada uno).' }),
  ],
  angel_arco: [
    mk('sp_flecha_luz', 'Flecha de luz', '✨', 'bolt', { col: '255,240,170', mult: 3.5, heal: 0.06, cd: 30000, mana: 60, desc: 'Flecha de luz (×3,5) que cura 6 % al grupo.' }),
    mk('sp_lluvia_celestial', 'Lluvia celestial', '🌟', 'rain', { col: '255,240,170', n: 8, r: 5, hr: 1.6, mult: 1.6, cd: 80000, mana: 130, lv: 60, desc: '8 flechas de luz caen alrededor del objetivo (×1,6).' }),
  ],
  fuego_arco: [
    mk('sp_flecha_viento', 'Flecha del viento', '🌪️', 'line', { col: '200,230,255', len: 9, mult: 3.2, cd: 30000, mana: 60, desc: 'Flecha huracanada que cruza 9 casillas (×3,2).' }),
    mk('sp_tormenta_llama', 'Tormenta de llamas', '🔥', 'rain', { col: '255,150,70', n: 7, r: 4, hr: 1.6, mult: 1.8, burn: { ticks: 4, mult: 0.3 }, cd: 80000, mana: 125, lv: 60, desc: '7 flechas ardientes caen alrededor del objetivo.' }),
  ],
  sombra_arco: [
    mk('sp_flecha_umbria', 'Flecha umbría', '🟣', 'line', { col: '170,100,255', len: 9, mult: 3.4, slow: 2000, cd: 30000, mana: 60, desc: 'Flecha de sombras que cruza 9 casillas (×3,4) y ralentiza.' }),
    mk('sp_lluvia_sombras', 'Lluvia de sombras', '💜', 'rain', { col: '170,100,255', n: 8, r: 5, hr: 1.6, mult: 1.7, cd: 80000, mana: 130, lv: 60, desc: '8 flechas de sombras caen alrededor del objetivo (×1,7).' }),
  ],
  hw_guadana: [
    mk('sp_siega', 'Siega nocturna', '🎃', 'fan', { col: '176,100,255', r: 4, mult: 3.4, cd: 30000, mana: 60, desc: 'Tajo de guadaña en abanico frente a ti (×3,4).' }),
    mk('sp_cosecha', 'Cosecha de almas', '👻', 'nova', { col: '176,100,255', r: 4, mult: 3.8, pull: 3, cd: 80000, mana: 130, lv: 60, desc: 'Atrae y daña a los enemigos cercanos (×3,8).' }),
  ],
  ig_arco: [
    mk('sp_meteoro', 'Flecha meteoro', '☄️', 'nova', { col: '255,120,40', r: 2, mult: 3.5, atTarget: 1, burn: { ticks: 4, mult: 0.3 }, cd: 30000, mana: 60, desc: 'Una flecha cae del cielo y explota (×3,5).' }),
    mk('sp_lluvia_fuego', 'Lluvia de fuego', '🔥', 'rain', { col: '255,120,40', n: 6, r: 4, hr: 1.6, mult: 1.8, cd: 80000, mana: 120, lv: 60, desc: '6 flechas de fuego caen alrededor del objetivo (×1,8 cada una).' }),
  ],
  an_arco: [
    mk('sp_portal', 'Portal verde', '🟢', 'volley', { col: '120,255,170', hits: 3, span: 1200, mult: 1.5, cd: 30000, mana: 60, desc: 'Tres flechas de fuego verde (×1,5 cada una).' }),
    mk('sp_cielo_portales', 'Cielo de portales', '🌌', 'rain', { col: '120,255,170', n: 8, r: 5, hr: 1.6, mult: 1.5, cd: 80000, mana: 130, lv: 60, desc: '8 flechas verdes caen de portales (×1,5 cada una).' }),
  ],
  rd_rv_staff: [
    mk('sp_nube', 'Nube tóxica', '☣️', 'cloud', { col: '90,220,110', r: 3, secs: 8, mult: 0.5, cd: 30000, mana: 60, desc: 'Deja una nube 8 s que daña cada segundo (×0,5).' }),
    mk('sp_epidemia', 'Epidemia', '☠️', 'cloud', { col: '90,220,110', r: 5, secs: 12, mult: 0.6, slow: 1500, cd: 80000, mana: 130, lv: 60, desc: 'Gran nube 12 s (×0,6 por segundo) que ralentiza.' }),
  ],
  rd_ra_staff: [
    mk('sp_rafaga', 'Ráfaga de máser', '⚙️', 'volley', { col: '255,200,90', hits: 8, span: 3000, mult: 0.8, cd: 30000, mana: 60, desc: '8 virotes en 3 s (×0,8 cada uno).' }),
    mk('sp_sobrecarga', 'Sobrecarga de máser', '⚡', 'volley', { col: '255,200,90', hits: 14, span: 4000, mult: 0.7, cd: 80000, mana: 130, lv: 60, desc: '14 virotes en 4 s (×0,7 cada uno).' }),
  ],
  // ---- magia ----
  angel_cetro: [
    mk('sp_juicio', 'Juicio alado', '👼', 'bolt', { col: '255,240,190', mult: 3.2, heal: 0.08, cd: 30000, mana: 65, desc: 'Un rayo de luz (×3,2) que cura un 8 % a tu grupo.' }),
    mk('sp_bendicion', 'Bendición', '✨', 'heal', { col: '255,240,190', r: 4, mult: 2, heal: 0.25, cd: 85000, mana: 140, lv: 60, desc: 'Luz que cura un 25 % a tu grupo y daña a los cercanos (×2).' }),
  ],
  ig_baston: [
    mk('sp_orbe', 'Orbe ardiente', '🔥', 'nova', { col: '255,120,40', r: 3, mult: 3.2, atTarget: 1, burn: { ticks: 4, mult: 0.3 }, cd: 30000, mana: 65, desc: 'El orbe explota sobre el objetivo (×3,2) y quema.' }),
    mk('sp_meteoros', 'Lluvia de meteoros', '☄️', 'rain', { col: '255,120,40', n: 5, r: 4, hr: 1.8, mult: 1.8, cd: 80000, mana: 130, lv: 60, desc: '5 meteoros caen alrededor del objetivo (×1,8 cada uno).' }),
  ],
  an_baston: [
    mk('sp_miasma', 'Miasma de tumbas', '💀', 'cloud', { col: '120,255,170', r: 3, secs: 6, mult: 0.6, cd: 30000, mana: 65, desc: 'Grietas y miasma 6 s: daño continuo (×0,6 por segundo).' }),
    mk('sp_grietas', 'Grietas del juicio', '⚖️', 'nova', { col: '120,255,170', r: 5, mult: 3.4, slow: 4000, atTarget: 1, cd: 80000, mana: 130, lv: 60, desc: 'El suelo se agrieta en 5 casillas (×3,4) y ralentiza.' }),
  ],
  hd_guadana: [
    mk('sp_siega', 'Siega de eclipse', '🌑', 'fan', { col: '255,120,30', mult: 3.4, burn: { ticks: 4, mult: 0.3 }, cd: 28000, mana: 60, desc: 'Tres tajos de fuego negro en abanico (×3,4) y quemadura.' }),
    mk('sp_cosecha', 'Cosecha de almas', '☠️', 'nova', { col: '255,120,30', r: 4, mult: 3.8, stun: 1500, cd: 80000, mana: 130, lv: 60, desc: 'Giras la guadaña (×3,8), aturdes y quemas a los cercanos.' }),
  ],
  hd_arco: [
    mk('sp_flecha_eclipse', 'Flecha de eclipse', '🌑', 'line', { col: '255,120,30', len: 10, mult: 3.4, burn: { ticks: 4, mult: 0.3 }, cd: 30000, mana: 60, desc: 'Flecha de fuego negro que cruza 10 casillas (×3,4).' }),
    mk('sp_lluvia_brasas', 'Lluvia de brasas', '🔥', 'rain', { col: '255,120,30', n: 8, r: 5, hr: 1.6, mult: 1.7, burn: { ticks: 3, mult: 0.3 }, cd: 80000, mana: 130, lv: 60, desc: '8 flechas incendiarias caen alrededor del objetivo (×1,7).' }),
  ],
  zs_arco: [
    mk('sp_rayo_arco', 'Flecha de rayo', '⚡', 'line', { col: '170,220,255', len: 10, mult: 3.4, slow: 2000, cd: 30000, mana: 60, desc: 'Flecha eléctrica que cruza 10 casillas (×3,4) y ralentiza.' }),
    mk('sp_lluvia_rayos', 'Lluvia de rayos', '🌩️', 'rain', { col: '170,220,255', n: 8, r: 5, hr: 1.6, mult: 1.7, cd: 80000, mana: 130, lv: 60, desc: '8 rayos caen alrededor del objetivo (×1,7).' }),
  ],
  zs_cetro: [
    mk('sp_trueno', 'Trueno divino', '⚡', 'nova', { col: '170,220,255', r: 3, mult: 3.4, stun: 1500, atTarget: 1, cd: 30000, mana: 65, desc: 'Un trueno cae sobre el objetivo (×3,4) y lo aturde.' }),
    mk('sp_tormenta_olimpo', 'Tormenta del Olimpo', '🌩️', 'rain', { col: '170,220,255', n: 9, r: 5, hr: 1.6, mult: 1.9, cd: 85000, mana: 140, lv: 60, desc: '9 rayos caen alrededor del objetivo (×1,9).' }),
  ],
  rd_rx_staff: [
    mk('sp_sol', 'Sol naciente', '🌅', 'nova', { col: '255,230,150', r: 3, mult: 3.8, blind: 3000, atTarget: 1, cd: 35000, mana: 70, desc: 'Explosión de luz (×3,8) que ciega 3 s.' }),
    mk('sp_amanecer', 'Amanecer', '☀️', 'heal', { col: '255,230,150', r: 6, mult: 3, heal: 0.15, cd: 90000, mana: 150, lv: 60, desc: 'Gran destello (×3) que cura un 15 % a tu grupo.' }),
  ],
};

// ---- 3.er especial de cada arma de jefe (tecla 6 o la siguiente libre): definitivo, enfriamiento muy largo ----
const mk3 = (id, name, icon, kind, o) => mk(id, name, icon, kind, Object.assign({ cd: 110000, mana: 170, lv: 75 }, o));
const THIRD = {
  rd_rk_mace:     mk3('sp_coloso_lava', 'Coloso de lava', '🌋', 'nova', { col: '255,130,40', r: 5, mult: 4.2, burn: { ticks: 5, mult: 0.35 }, stun: 2000, desc: 'Un coloso de lava brota a tu alrededor (×4,2), quema y aturde.' }),
  rd_ra_axe:      mk3('sp_guillotina', 'Guillotina de acero', '⚙️', 'line', { col: '255,200,120', len: 9, mult: 4.6, desc: 'Un tajo gigante de acero cruza 9 casillas (×4,6).' }),
  rd_rv_bow:      mk3('sp_mordida_reina', 'Mordida de la Reina', '🐍', 'volley', { col: '110,255,120', hits: 8, span: 2200, mult: 1.6, desc: 'Ocho colmillos ponzoñosos al objetivo (×1,6 cada uno).' }),
  rd_rx_bow:      mk3('sp_rayo_amanecer', 'Rayo del amanecer', '🌅', 'bolt', { col: '255,230,120', mult: 5.2, heal: 0.1, desc: 'Un rayo de luz (×5,2) que cura 10 % al grupo.' }),
  rd_rx_spear:    mk3('sp_sol_lanzas', 'Sol de lanzas', '☀️', 'rain', { col: '255,200,90', n: 9, r: 5, hr: 1.7, mult: 2.2, burn: { ticks: 4, mult: 0.3 }, desc: '9 lanzas solares caen alrededor del objetivo (×2,2) y queman.' }),
  rd_rm_bow:      mk3('sp_colapso', 'Colapso estelar', '💫', 'nova', { col: '190,90,255', r: 5, mult: 5, pull: 4, atTarget: 1, desc: 'Una estrella colapsa sobre el objetivo, atrae y estalla (×5).' }),
  fuego_garras:   mk3('sp_tormenta_zarpas', 'Tormenta de zarpas', '🐾', 'fan', { col: '190,80,255', mult: 4.4, burn: { ticks: 6, mult: 0.35 }, desc: 'Un abanico de zarpazos de fuego negro (×4,4) con quemadura.' }),
  fuego_mandoble: mk3('sp_torbellino', 'Torbellino ígneo', '🔥', 'nova', { col: '255,150,70', r: 4, mult: 4, slow: 4000, burn: { ticks: 5, mult: 0.3 }, desc: 'Un torbellino de fuego (×4) que quema y ralentiza.' }),
  mar_tridente:   mk3('sp_leviatan', 'Furia del Leviatán', '🐋', 'line', { col: '110,200,255', len: 12, mult: 4.4, slow: 4000, desc: 'Un chorro de mar cruza 12 casillas (×4,4) y ralentiza.' }),
  rd_rk_hammer:   mk3('sp_montana', 'Montaña caída', '⛰️', 'nova', { col: '255,150,60', r: 6, mult: 4, stun: 3500, desc: 'Una montaña cae en 6 casillas (×4) y aturde 3,5 s.' }),
  rd_rm_staff:    mk3('sp_eclipse_total', 'Eclipse total', '🌑', 'rain', { col: '190,90,255', n: 10, r: 6, hr: 1.7, mult: 2.2, desc: '10 impactos de vacío alrededor del objetivo (×2,2).' }),
  jade_arco:      mk3('sp_nido_hidra', 'Nido de la Hidra', '🐲', 'cloud', { col: '90,230,110', r: 5, secs: 10, mult: 0.9, slow: 2500, desc: 'Un nido de veneno 10 s (×0,9 por segundo) que ralentiza.' }),
  angel_arco:     mk3('sp_cielo_abierto', 'Cielo abierto', '☁️', 'rain', { col: '255,240,170', n: 10, r: 6, hr: 1.7, mult: 1.9, desc: '10 columnas de luz caen alrededor del objetivo (×1,9).' }),
  fuego_arco:     mk3('sp_estampida', 'Estampida de brasas', '🔥', 'volley', { col: '255,150,70', hits: 9, span: 2400, mult: 1.5, desc: 'Nueve flechas ardientes al objetivo (×1,5 cada una).' }),
  sombra_arco:    mk3('sp_noche_eterna', 'Noche eterna', '🌌', 'nova', { col: '170,100,255', r: 5, mult: 4, blind: 3500, atTarget: 1, desc: 'Oscuridad total sobre el objetivo (×4) que ciega.' }),
  hw_guadana:     mk3('sp_noche_brujas', 'Noche de brujas', '🎃', 'nova', { col: '176,100,255', r: 5, mult: 4.5, stun: 2000, desc: 'Un grito espectral a tu alrededor (×4,5) que aturde.' }),
  ig_arco:        mk3('sp_cometa', 'Cometa ígneo', '☄️', 'nova', { col: '255,120,40', r: 4, mult: 5, atTarget: 1, burn: { ticks: 5, mult: 0.35 }, desc: 'Un cometa cae sobre el objetivo (×5) y quema.' }),
  an_arco:        mk3('sp_juicio_portal', 'Juicio del portal', '🟢', 'line', { col: '120,255,170', len: 11, mult: 4.4, desc: 'Un haz verde cruza 11 casillas (×4,4).' }),
  rd_rv_staff:    mk3('sp_plaga', 'Plaga', '☣️', 'cloud', { col: '90,220,110', r: 6, secs: 12, mult: 0.8, slow: 2000, desc: 'Una plaga 12 s (×0,8 por segundo) que ralentiza.' }),
  rd_ra_staff:    mk3('sp_tormenta_acero', 'Tormenta de acero', '⚙️', 'volley', { col: '255,200,90', hits: 18, span: 5000, mult: 0.7, desc: '18 virotes en 5 s (×0,7 cada uno).' }),
  angel_cetro:    mk3('sp_resurreccion', 'Luz restauradora', '😇', 'heal', { col: '255,240,190', r: 5, mult: 2.5, heal: 0.35, desc: 'Luz que cura un 35 % a tu grupo y daña a los cercanos (×2,5).' }),
  ig_baston:      mk3('sp_erupcion_solar', 'Erupción solar', '☀️', 'rain', { col: '255,120,40', n: 8, r: 5, hr: 1.8, mult: 2.2, burn: { ticks: 4, mult: 0.3 }, desc: '8 erupciones solares alrededor del objetivo (×2,2).' }),
  an_baston:      mk3('sp_maldicion', 'Maldición del faraón', '⚰️', 'cloud', { col: '120,255,170', r: 4, secs: 10, mult: 0.8, slow: 2500, desc: 'Una maldición 10 s (×0,8 por segundo) que ralentiza.' }),
  hd_guadana:     mk3('sp_eclipse_infra', 'Eclipse del Inframundo', '🌑', 'nova', { col: '255,120,30', r: 5, mult: 4.6, stun: 2000, burn: { ticks: 5, mult: 0.35 }, desc: 'Un eclipse a tu alrededor (×4,6) que aturde y quema.' }),
  hd_arco:        mk3('sp_cielo_llamas', 'Cielo en llamas', '🔥', 'rain', { col: '255,120,30', n: 10, r: 6, hr: 1.7, mult: 1.9, burn: { ticks: 3, mult: 0.3 }, desc: '10 flechas incendiarias alrededor del objetivo (×1,9).' }),
  zs_arco:        mk3('sp_cadena_rayos', 'Cadena de rayos', '⚡', 'volley', { col: '170,220,255', hits: 10, span: 3000, mult: 1.5, desc: 'Diez rayos encadenados al objetivo (×1,5 cada uno).' }),
  zs_cetro:       mk3('sp_ira_zeus', 'Ira de Zeus', '🌩️', 'nova', { col: '170,220,255', r: 4, mult: 4.8, stun: 2000, atTarget: 1, desc: 'Zeus descarga su ira sobre el objetivo (×4,8) y lo aturde.' }),
  rd_rx_staff:    mk3('sp_eclipse_solar', 'Eclipse solar', '🌞', 'heal', { col: '255,230,150', r: 6, mult: 3.6, heal: 0.25, desc: 'Gran destello (×3,6) que cura un 25 % a tu grupo.' }),
};
for (const [w, sk] of Object.entries(THIRD)) SP[w].push(sk);

// ---- armas de Cerbero (3 especiales cada una: A barato, B definitivo, C el más fuerte) ----
Object.assign(SP, {
  cb_arco_fuego: [
    mk('sp_cb_triple', 'Disparo triple', '🏹', 'volley', { col: '255,130,40', hits: 3, span: 900, mult: 2.2, cd: 28000, mana: 55, desc: 'Tres flechas de fuego infernal al objetivo (×2,2 cada una).' }),
    mk('sp_cb_quemadura', 'Quemadura infernal', '🔥', 'rain', { col: '255,110,30', n: 7, r: 4, hr: 1.7, mult: 1.9, burn: { ticks: 5, mult: 0.35 }, cd: 80000, mana: 125, lv: 60, desc: '7 flechas ardientes caen alrededor del objetivo (×1,9) y queman.' }),
    mk3('sp_cb_aliento', 'Aliento de Cerbero', '🐕', 'line', { col: '255,120,30', len: 11, mult: 4.8, burn: { ticks: 5, mult: 0.35 }, desc: 'Una llamarada de tres cabezas cruza 11 casillas (×4,8) y quema.' }),
  ],
  cb_arco_rastreador: [
    mk('sp_cb_marca', 'Marca del rastreador', '🎯', 'bolt', { col: '255,170,70', mult: 3.4, cd: 28000, mana: 55, desc: 'Una flecha certera (×3,4) que marca al objetivo.' }),
    mk('sp_cb_veloz', 'Ráfaga veloz', '💨', 'volley', { col: '255,170,70', hits: 8, span: 1600, mult: 1.3, cd: 80000, mana: 125, lv: 60, desc: 'Ocho flechas muy rápidas al objetivo (×1,3 cada una).' }),
    mk3('sp_cb_obsidiana', 'Tiro de obsidiana', '🖤', 'line', { col: '170,100,255', len: 12, mult: 5, slow: 3000, desc: 'Una flecha de obsidiana cruza 12 casillas (×5) y ralentiza.' }),
  ],
  cb_baston_triptico: [
    mk('sp_cb_invocacion', 'Invocación de cabezas', '🐺', 'volley', { col: '255,130,40', hits: 3, span: 1200, mult: 2.3, cd: 30000, mana: 65, desc: 'Tres cabezas de fuego atacan al objetivo (×2,3 cada una).' }),
    mk('sp_cb_triptico', 'Llamas del tríptico', '🔥', 'nova', { col: '255,130,40', r: 4, mult: 3.4, burn: { ticks: 5, mult: 0.35 }, atTarget: 1, cd: 80000, mana: 130, lv: 60, desc: 'Un círculo de fuego sobre el objetivo (×3,4) que quema.' }),
    mk3('sp_cb_jauria', 'Jauría infernal', '🐕', 'rain', { col: '255,120,30', n: 10, r: 6, hr: 1.7, mult: 2.2, burn: { ticks: 4, mult: 0.3 }, desc: '10 perros de fuego saltan alrededor del objetivo (×2,2).' }),
  ],
  cb_baston_garra: [
    mk('sp_cb_onda', 'Onda ígnea', '🌊', 'line', { col: '255,120,30', len: 9, mult: 3.3, burn: { ticks: 4, mult: 0.3 }, cd: 30000, mana: 65, desc: 'Una onda de fuego cruza 9 casillas (×3,3) y quema.' }),
    mk('sp_cb_azote', 'Azote del Inframundo', '⛓️', 'nova', { col: '130,200,255', r: 4, mult: 3.6, stun: 1500, atTarget: 1, cd: 85000, mana: 130, lv: 60, desc: 'Cadenas de almas golpean al objetivo (×3,6) y lo aturden.' }),
    mk3('sp_cb_garra', 'Garra del abismo', '🐾', 'nova', { col: '255,110,30', r: 5, mult: 4.8, pull: 3, atTarget: 1, desc: 'Una garra enorme atrae a los enemigos y los desgarra (×4,8).' }),
  ],
});
// ---- armas de la ampliación Este II (3 especiales cada una: A barato, B definitivo, C el más fuerte) ----
Object.assign(SP, {
  th_arco: [
    mk('sp_th_triple', 'Disparo triple', '🏹', 'volley', { col: '210,190,140', hits: 3, span: 900, mult: 2.1, cd: 28000, mana: 55, desc: 'Tres flechas al objetivo (×2,1 cada una).' }),
    mk('sp_th_lluvia', 'Lluvia de flechas', '🌧️', 'rain', { col: '210,190,140', n: 7, r: 4, hr: 1.7, mult: 1.8, cd: 80000, mana: 125, lv: 60, desc: '7 flechas caen alrededor del objetivo (×1,8).' }),
    mk3('sp_th_recurvo', 'Tiro recurvo', '🎯', 'line', { col: '230,210,150', len: 11, mult: 4.6, desc: 'Una flecha atraviesa 11 casillas (×4,6).' }),
  ],
  th_daga: [
    mk('sp_th_tajo', 'Tajo veloz', '🗡️', 'nova', { col: '150,230,120', r: 2.5, mult: 3, cd: 25000, mana: 50, desc: 'Un tajo giratorio a tu alrededor (×3).' }),
    mk('sp_th_cuatro', 'Cuatro tajos', '⚔️', 'volley', { col: '150,230,120', hits: 4, span: 1000, mult: 1.9, cd: 75000, mana: 115, lv: 60, desc: 'Cuatro cortes rápidos al objetivo (×1,9 cada uno).' }),
    mk3('sp_th_sombra', 'Estocada de sombra', '🌑', 'line', { col: '170,130,255', len: 6, mult: 5.2, desc: 'Una estocada a través de 6 casillas (×5,2).' }),
  ],
  ka_arco: [
    mk('sp_ka_triple', 'Flechas verdantes', '🌿', 'volley', { col: '120,230,130', hits: 3, span: 900, mult: 2.2, cd: 28000, mana: 55, desc: 'Tres flechas de savia al objetivo (×2,2 cada una).' }),
    mk('sp_ka_nube', 'Nube de esporas', '☣️', 'cloud', { col: '110,220,120', r: 3, secs: 8, mult: 0.8, slow: 2500, cd: 80000, mana: 125, lv: 60, desc: 'Esporas 8 s (×0,8 por segundo) que ralentizan.' }),
    mk3('sp_ka_guardabosques', 'Flecha del guardabosques', '🏹', 'line', { col: '140,255,160', len: 12, mult: 5, slow: 3000, desc: 'Una flecha cruza 12 casillas (×5) y ralentiza.' }),
  ],
  ae_baston: [
    mk('sp_ae_destello', 'Destello estelar', '✨', 'bolt', { col: '170,220,255', mult: 3.4, cd: 28000, mana: 60, desc: 'Un rayo de luz estelar (×3,4).' }),
    mk('sp_ae_estrellas', 'Lluvia de estrellas', '🌠', 'nova', { col: '170,220,255', r: 4, mult: 3.4, stun: 1500, atTarget: 1, cd: 85000, mana: 130, lv: 60, desc: 'Estrellas caen sobre el objetivo (×3,4) y lo aturden.' }),
    mk3('sp_ae_meteoros', 'Meteoros estelares', '☄️', 'rain', { col: '200,230,255', n: 10, r: 6, hr: 1.7, mult: 2.2, desc: '10 meteoros caen alrededor del objetivo (×2,2).' }),
  ],
  va_espada: [
    mk('sp_va_runa', 'Tajo rúnico', '🔷', 'fan', { col: '120,200,255', r: 4, mult: 3.2, cd: 28000, mana: 60, desc: 'Tajo de runas en abanico frente a ti (×3,2).' }),
    mk('sp_va_onda', 'Onda ancestral', '🌀', 'line', { col: '120,200,255', len: 9, mult: 3.6, cd: 80000, mana: 125, lv: 60, desc: 'Una onda rúnica cruza 9 casillas (×3,6).' }),
    mk3('sp_va_ancestral', 'Furia ancestral', '⚔️', 'nova', { col: '150,220,255', r: 5, mult: 4.8, stun: 2000, atTarget: 1, desc: 'La hoja descarga energía ancestral sobre el objetivo (×4,8) y lo aturde.' }),
  ],
  el_baston: [
    mk('sp_el_vacio', 'Lanza del vacío', '🌌', 'bolt', { col: '170,110,255', mult: 3.5, cd: 28000, mana: 60, desc: 'Un rayo del vacío (×3,5).' }),
    mk('sp_el_pozo', 'Pozo de sombras', '🕳️', 'nova', { col: '150,80,230', r: 4, mult: 3.6, pull: 3, atTarget: 1, cd: 85000, mana: 130, lv: 60, desc: 'Atrae a los enemigos hacia el objetivo (×3,6).' }),
    mk3('sp_el_invocador', 'Llamada del invocador', '👁️', 'rain', { col: '170,110,255', n: 10, r: 6, hr: 1.7, mult: 2.3, desc: '10 grietas del vacío estallan alrededor del objetivo (×2,3).' }),
  ],
});
// ---- especiales de escudos y objetos de mano de jefe (tecla siguiente a las del arma) ----
const mkS = (id, name, icon, kind, o) => mk(id, name, icon, kind, Object.assign({ cd: 75000, mana: 100, lv: 50 }, o));
Object.assign(SP, {
  angel_carcaj: [mkS('sh_plumas', 'Plumas protectoras', '🪶', 'heal', { col: '255,240,170', r: 4, mult: 1.5, heal: 0.12, desc: 'Lluvia de plumas que cura un 12 % a tu grupo y daña a los cercanos (×1,5).' })],
  fuego_carcaj: [mkS('sh_reserva', 'Reserva ígnea', '🔥', 'nova', { col: '255,130,40', r: 3, mult: 3, burn: { ticks: 4, mult: 0.3 }, atTarget: 1, desc: 'Una flecha explosiva sobre el objetivo (×3) que quema.' })],
  zs_escudo:    [mkS('sh_egida_olimpo', 'Égida del Olimpo', '⚡', null, { col: '170,220,255', shield: true, secs: 10, shm: 6, cd: 90000, mana: 120, lv: 60, desc: 'Una égida de rayos absorbe el daño durante 10 s.' })],
  md_escudo:    [mkS('sh_mirada_egida', 'Mirada de la Égida', '🐍', 'nova', { col: '120,230,120', r: 4, mult: 2, stun: 2500, cd: 80000, mana: 110, lv: 60, desc: 'La égida petrifica un instante a los cercanos (×2) y los aturde.' })],
  md_carcaj:    [mkS('sh_viboras', 'Nido de víboras', '🐍', 'cloud', { col: '90,230,110', r: 3, secs: 8, mult: 0.7, slow: 2000, desc: 'Víboras en el suelo 8 s (×0,7 por segundo) que ralentizan.' })],
  ka_carcaj:    [mkS('sh_ka_susurros', 'Susurros del carcaj', '🌿', 'volley', { col: '120,230,140', hits: 4, span: 1300, mult: 1.8, desc: 'Cuatro flechas susurrantes al objetivo (×1,8 cada una).' })],
  va_escudo:    [mkS('sh_va_escamas', 'Escamas de dragón', '🐉', null, { col: '255,170,90', shield: true, secs: 10, shm: 6, cd: 90000, mana: 120, lv: 60, desc: 'Escamas que absorben el daño durante 10 s.' })],
  md_orbe:      [mkS('sh_orbe_serpientes', 'Orbe de serpientes', '🔮', 'volley', { col: '120,255,150', hits: 4, span: 1400, mult: 1.8, desc: 'Cuatro serpientes mágicas al objetivo (×1,8 cada una).' })],
});
// arma -> [A, B, C]; escudo -> [especial]; los datos que se envían al cliente
require('./spicons').assign(SP);                                       // icono nuevo de cada especial (public/spicons.png)
const WSPEC = {}; for (const [w, l] of Object.entries(SP)) WSPEC[w] = l.map((s) => Object.assign({}, s, { aoe: s.r && !s.atTarget ? s.r : s.r, kindStr: s.kind }));

function install(Game) {
  const P = Game.prototype;
  const world = require('./world');
  const { CFG } = require('./data');
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

  P.wspecial = function (p, sk, t, w, sl, now) {
    const base = this.baseDmg(p, w), dm = (m) => Math.max(1, Math.round(base * m)), col = sk.col, self = this;
    const foes = (cx, cy, r) => {                                                    // monstruos y jugadores enemigos dentro de un círculo
      const out = [];
      for (const m of self.monsters) if (!m.dead && Math.hypot(m.x - cx, m.y - cy) <= r + 0.4) out.push(m);
      for (const q of self.players.values()) if (q !== p && q.hp > 0 && Math.hypot(q.x - cx, q.y - cy) <= r + 0.4 && self.canPvp(p, q)) out.push(q);
      return out;
    };
    const cc = (m, ms, kind) => {
      if (m.kind !== 'mo' || m.dead) return; const k = m.def.boss ? 0.5 : 1, t2 = now + ms * k;
      if (kind === 'slow') m.slowUntil = Math.max(m.slowUntil || 0, t2);
      else { m.nextMove = Math.max(m.nextMove || 0, t2); m.nextAtk = Math.max(m.nextAtk || 0, t2); if (kind === 'blind') m.target = null; }
    };
    const burn = (m, b) => { if (b && m.kind === 'mo' && !m.dead) this.dots.push({ src: p.id, tid: m.id, left: b.ticks, next: this.now + 1000, dmg: dm(b.mult) }); };
    const hit = (m, mult) => this.skillHit(p, m, dm(mult), this.now);
    const pull = (cx, cy, r, steps) => {
      for (const m of foes(cx, cy, r)) {
        if (m.kind !== 'mo' || m.def.boss) continue;
        for (let s = 0; s < steps; s++) {
          const dx = Math.sign(cx - m.x), dy = Math.sign(cy - m.y); if (!dx && !dy) break;
          const tries = [[m.x + dx, m.y + dy], [m.x + dx, m.y], [m.x, m.y + dy]]; let moved = false;
          for (const [nx, ny] of tries) { if ((nx !== m.x || ny !== m.y) && self.monsterCanStep(m, nx, ny) && !(nx === cx && ny === cy && false)) { self.mgrid.delete(m.y * world.W + m.x); m.x = nx; m.y = ny; self.mgrid.set(ny * world.W + nx, m); moved = true; break; } }
          if (!moved) break;
        }
      }
    };
    const healGroup = (frac) => {
      const mates = new Set([p]); const party = this.partyOf ? this.partyOf(p) : null;
      if (party) for (const q of this.partyMembers(party)) if (q.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) <= 12) mates.add(q);
      for (const q of mates) { const h = Math.min(q.maxHp - q.hp, Math.round(q.maxHp * frac * (q.antiHeal > this.now ? 0.4 : 1))); if (h > 0) { q.hp += h; this.fx.push({ k: 'd', x: q.x, y: q.y, v: '+' + h, c: 'g' }); q.dirty.stats = true; } this.fx.push({ k: 'wsh', x: q.x, y: q.y, col }); }
    };
    const cx = sk.atTarget && t ? t.x : p.x, cy = sk.atTarget && t ? t.y : p.y;
    const tx = t ? t.x : p.x, ty = t ? t.y : p.y;
    let dx = tx - p.x, dy = ty - p.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    this.fx.push({ k: 'wsp', x: p.x, y: p.y, col, i: p.id });

    if (sk.kind === 'fan') {
      this.fx.push({ k: 'wsf', x1: p.x, y1: p.y, x: p.x + dx * 2, y: p.y + dy * 2, col });
      for (const m of foes(p.x, p.y, 2.2)) if ((m.x - p.x) * dx + (m.y - p.y) * dy > -0.2) { hit(m, sk.mult); burn(m, sk.burn); }
    } else if (sk.kind === 'line') {
      const x2 = p.x + dx * sk.len, y2 = p.y + dy * sk.len;
      this.fx.push({ k: 'wsl', x1: p.x, y1: p.y, x2, y2, col, T: 700 });
      for (const m of foes(p.x + dx * sk.len / 2, p.y + dy * sk.len / 2, sk.len / 2 + 1)) {
        const vx = x2 - p.x, vy = y2 - p.y, u = Math.max(0, Math.min(1, ((m.x - p.x) * vx + (m.y - p.y) * vy) / (vx * vx + vy * vy)));
        if (Math.hypot(m.x - (p.x + vx * u), m.y - (p.y + vy * u)) <= 1.2) { hit(m, sk.mult); if (sk.slow) cc(m, sk.slow, 'slow'); }
      }
    } else if (sk.kind === 'nova' || sk.kind === 'heal') {
      this.fx.push({ k: 'wsn', x: cx, y: cy, r: sk.r, col, pull: sk.pull ? 1 : 0, T: 800 });
      if (sk.pull) pull(cx, cy, sk.r + 2, sk.pull);
      this.later(sk.pull ? 450 : 150, () => {
        for (const m of foes(cx, cy, sk.r)) { hit(m, sk.mult); burn(m, sk.burn); if (sk.stun) cc(m, sk.stun, 'stun'); if (sk.slow) cc(m, sk.slow, 'slow'); if (sk.blind) cc(m, sk.blind, 'blind'); }
        if (sk.kind === 'heal') healGroup(sk.heal);
        this.fx.push({ k: 'wsi', x: cx, y: cy, r: sk.r, col });
      });
    } else if (sk.kind === 'bolt') {
      this.fx.push({ k: 'wsa', x1: p.x, y1: p.y, x2: tx, y2: ty, col, T: 250 });
      this.later(250, () => { if (t && !t.dead && (t.kind === 'mo' || t.hp > 0)) hit(t, sk.mult); this.fx.push({ k: 'wsi', x: tx, y: ty, r: 1.6, col }); if (sk.heal) healGroup(sk.heal); });
    } else if (sk.kind === 'volley') {
      const gap = sk.span / sk.hits;
      for (let i = 0; i < sk.hits; i++) this.later(i * gap, () => {
        if (p.hp <= 0 || !t || (t.kind === 'mo' && t.dead)) return;
        this.fx.push({ k: 'wsa', x1: p.x, y1: p.y, x2: t.x, y2: t.y, col, T: 220 });
        this.later(220, () => { if (t && !(t.kind === 'mo' && t.dead)) { hit(t, sk.mult); this.fx.push({ k: 'wsi', x: t.x, y: t.y, r: 1.2, col }); } });
      });
    } else if (sk.kind === 'rain') {
      for (let i = 0; i < sk.n; i++) {
        const a = Math.random() * 6.283, d = i === 0 ? 0 : Math.random() * sk.r, x = Math.round(tx + Math.cos(a) * d), y = Math.round(ty + Math.sin(a) * d);
        this.later(i * 260, () => this.fx.push({ k: 'wsw', x, y, r: sk.hr, T: 700, col }));
        this.later(i * 260 + 700, () => { this.fx.push({ k: 'wsi', x, y, r: sk.hr, col }); for (const m of foes(x, y, sk.hr)) hit(m, sk.mult); });
      }
    } else if (sk.kind === 'cloud') {
      this.fx.push({ k: 'wsc', x: tx, y: ty, r: sk.r, T: sk.secs * 1000, col });
      for (let i = 1; i <= sk.secs; i++) this.later(i * 1000, () => { for (const m of foes(tx, ty, sk.r)) { hit(m, sk.mult); if (sk.slow) cc(m, sk.slow, 'slow'); } });
    }
    if (t) p.dir = Math.abs(tx - p.x) >= Math.abs(ty - p.y) ? (tx > p.x ? 1 : 3) : (ty > p.y ? 2 : 0);
  };
}
module.exports = { WSPEC, SP, install };
