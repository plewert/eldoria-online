'use strict';
/** Icono (índice en public/spicons.png, 11 columnas de 64 px) de cada especial de arma y de escudo. Los no listados se eligen por tipo (FALLBACK). */
const IC = {
  pulso_magma: 37, erupcion: 55, coloso_lava: 0, engranaje: 45, sierra: 46, guillotina: 26,
  flecha_hidra: 32, lluvia_ponzona: 30, mordida_reina: 17, flecha_solar: 64, cielo_dorado: 72, rayo_amanecer: 31,
  embestida: 7, lanzazo_alba: 33, sol_lanzas: 71, flecha_vacio: 32, horizonte: 41, colapso: 40,
  zarpazo: 23, eclipse: 67, tormenta_zarpas: 15, filo: 73, ciclon: 11, torbellino: 52,
  marea: 63, maremoto: 3, leviatan: 48, temblor: 74, cataclismo: 61, montana: 60,
  singular: 41, agujero: 40, eclipse_total: 5, veneno_hidra: 17, tres_cabezas: 39, nido_hidra: 42,
  flecha_luz: 64, lluvia_celestial: 29, cielo_abierto: 63, flecha_viento: 73, tormenta_llama: 20, estampida: 15,
  flecha_umbria: 32, lluvia_sombras: 57, noche_eterna: 67, siega: 16, cosecha: 58, noche_brujas: 34,
  meteoro: 8, lluvia_fuego: 20, cometa: 8, portal: 18, cielo_portales: 22, juicio_portal: 62,
  nube: 30, epidemia: 35, plaga: 27, rafaga: 45, sobrecarga: 14, tormenta_acero: 46,
  juicio: 24, bendicion: 13, resurreccion: 65, orbe: 37, meteoros: 8, erupcion_solar: 72,
  miasma: 59, grietas: 74, maldicion: 4, eclipse_infra: 41, flecha_eclipse: 41, lluvia_brasas: 20,
  cielo_llamas: 31, rayo_arco: 71, lluvia_rayos: 14, cadena_rayos: 75, trueno: 64, tormenta_olimpo: 14,
  flecha_marea: 63, lluvia_marina: 29, ola_cetro: 3, tormenta_marina: 14, estocada_marina: 7, remolino_mano: 52, cadena_olas: 32, furia_mar: 3, ira_poseidon: 48,
  tajo_gorgona: 66, mirada_petrea: 17, flecha_vibora: 32, lluvia_serpientes: 39, susurro_gorgona: 4, nido_cabezas: 39, decapitacion: 16, mordida_espectral: 17, mirada_cuatro: 39,
  flecha_tiempo: 71, lluvia_eterna: 20, siega_infernal: 16, cosecha_dragon: 58, rayo_abisal: 64, lluvia_abismo: 14, fin_tiempo: 32, eclipse_dragon: 41, colapso_abisal: 40,
  ira_zeus: 71, sol: 72, amanecer: 31, eclipse_solar: 65,
  cb_triple: 32, cb_quemadura: 20, cb_aliento: 42, cb_marca: 4, cb_veloz: 73, cb_obsidiana: 41,
  cb_invocacion: 15, cb_triptico: 28, cb_jauria: 15, cb_onda: 3, cb_azote: 75, cb_garra: 23,
  th_triple: 32, th_lluvia: 20, th_recurvo: 71, th_tajo: 66, th_cuatro: 66, th_sombra: 10,
  ka_triple: 32, ka_nube: 30, ka_guardabosques: 19, ae_destello: 68, ae_estrellas: 18, ae_meteoros: 8,
  va_runa: 33, va_onda: 21, va_ancestral: 66, el_vacio: 41, el_pozo: 40, el_invocador: 12,
  sh_plumas: 13, sh_reserva: 2, sh_egida_olimpo: 24, sh_mirada_egida: 17, sh_viboras: 39, sh_ka_susurros: 19,
  sh_va_escamas: 24, sh_orbe_serpientes: 39,
};
const FALLBACK = { nova: 68, rain: 20, line: 71, volley: 32, bolt: 64, cloud: 30, heal: 13, fan: 7 };
function assign(lists) {
  for (const arr of Object.values(lists)) for (const s of arr) { const k = s.id.replace(/^sp_/, ''); s.ic = IC[k] != null ? IC[k] : (FALLBACK[s.kind] != null ? FALLBACK[s.kind] : 68); }
}
module.exports = { IC, FALLBACK, assign, COUNT: 77 };
