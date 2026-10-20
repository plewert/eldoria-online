# Eldoria Online

MMORPG de aventura para navegador, estilo Tibia/RuneScape. Sin dependencias: solo Node 18+.

    npm start            # http://localhost:3000
    PORT=8080 npm start  # otro puerto
    npm test             # pruebas de lógica

Para jugar con otras personas: abre el puerto en tu red, o sube el juego a un servidor con Node y comparte la dirección.
Las cuentas se guardan en `data/players.json` (contraseñas con scrypt).

## Cómo se juega
- **Un personaje, tres estilos**: el arma equipada define si eres guerrero (Z), tirador (X) o mago (C).
  Cada estilo tiene su propia habilidad, que sube al usarlo.
- **Mover**: WASD o flechas, o clic en el suelo. **Atacar**: clic en un monstruo (o en un jugador en zona PvP).
- **Pociones** H (vida) y J (maná), **curación** V, **recoger** E, **chat** Enter (`/g` global, `/pos`, `/top`, `/ayuda`).
- **Tienda**: clic en Boris el Mercader (ciudad). Compra trofeos y vende equipo y pociones.

## Mundo
| Zona | Tipo | Notas |
|---|---|---|
| Ciudad de Aldea Real | segura | tienda, sabio, reaparición |
| Prado de los Novatos | segura | conejos, ratas, serpientes, arañas |
| Catacumbas Silenciosas | segura (mazmorra) | jefe: Rey Esqueleto |
| Bosque Maldito | **PvP** | lobos, osos, orcos; jefe: Señor Orco |
| Abismo Carmesí | **PvP** (mazmorra) | trolls, demonios, dragones; jefe: Demonio Supremo |

En zonas seguras solo te atacan los monstruos y el botín es de quien más daño hizo (30 s).
En zonas PvP puedes pelear con otros jugadores y quedarte con lo que suelten al caer.
Reglas anti-abuso: protección de novato (PvP desde nivel 5), no puedes huir a zona segura ni usar portales
durante 20 s tras un combate PvP, y si te desconectas en combate tu personaje se queda 20 s en el mundo.

## Ajustes
Todo el balance (objetos, monstruos, XP, pérdidas al morir) está en `game/data.js`.
