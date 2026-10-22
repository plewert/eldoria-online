# Eldoria Online

MMORPG de aventura para navegador, estilo Tibia/RuneScape. Sin dependencias: solo Node 18+.

    npm start            # http://localhost:3000
    PORT=8080 npm start  # otro puerto
    npm test             # pruebas de lógica

Para jugar con otras personas: abre el puerto en tu red, o sube el juego a un servidor con Node y comparte la dirección.
Las cuentas se guardan en `data/players.json` (contraseñas con scrypt).

## Cómo se juega
- **Un personaje, tres estilos**: el arma equipada define si eres guerrero (Z), tirador (X) o mago (C).
- **Mover**: WASD o flechas, o clic en el suelo (velocidad constante). **Atacar**: clic en un monstruo (o jugador en zona PvP).
- **Clic derecho**: sobre un monstruo → ficha con vida, daño y **tabla de drops con %**; sobre un jugador → Comerciar; sobre un objeto de la mochila → equipar, engarzar gema, guardar en banco, ofrecer, soltar.
- **Pociones** H/J, **curación** V, **recoger** E, **chat** Enter (`/g` global, `/pos`, `/top`, `/ayuda`).

## Objetos y rareza (el nombre lleva color)
| Color | Qué es |
|---|---|
| Gris | Normal, sin bonus |
| Verde | Excelente **+1 a +6** (+10 % de poder por nivel) |
| Azul | **Ancient**: drop rarísimo (más probable en jefes), ×1,5 de poder |

Cada arma/armadura puede traer hasta 3 **ranuras** para gemas (solo se engarzan en zona segura, fuera de combate; sacarlas cuesta oro).
Gemas: rubí (+ataque), zafiro (+maná), esmeralda (+vida), topacio (+defensa), amatista (crítico), ópalo (robo de vida) y diamante (**brillo**: aura del personaje; también brillan las piezas Ancient y los sets completos mejorados).

## Equipo visible
Casco, armadura, escudo y arma se ven puestos en tu personaje (y en los demás jugadores); también el amuleto (colgante) y los anillos (destello en la mano).
Casillas: arma, casco, armadura, escudo, **amuleto** y **2 anillos**. Anillos y amuletos dan bonus (ataque, defensa, vida, maná, crítico, robo de vida), escalan con +N/Ancient y pueden llevar gemas.
Se compran en las tiendas (los básicos) o caen de monstruos y jefes (los poderosos).

## Banco y comercio
- **Banco** (Gerda en la ciudad, Marta en el puerto): guarda objetos y oro; lo guardado no se pierde al morir en PvP.
- **Comercio** entre jugadores (clic derecho → Comerciar, a ≤4 casillas): ofertas con objetos y oro, los dos confirman, intercambio atómico; cualquier cambio anula las confirmaciones.

## Mundo (180×140)
| Zona | Tipo |
|---|---|
| Ciudad de Aldea Real, Puerto Marea | seguras (tiendas y bancos) |
| Prado de los Novatos, Colinas Doradas, Playa de Cristal | campos seguros |
| Catacumbas Silenciosas, Minas Enanas | mazmorras seguras |
| Bosque Maldito, Cumbres Heladas, Dunas Ardientes, Pantano Venenoso | **PvP** |
| Abismo Carmesí, Pirámide Olvidada, Fortaleza de Hielo | mazmorras **PvP** con jefe |

En zonas seguras solo te atacan los monstruos. En PvP puedes pelear y quedarte con lo que suelten al caer.
Anti-abuso: protección de novato (PvP desde nivel 5), sin huir a zona segura 20 s tras combate PvP, y si te desconectas en combate tu personaje queda 20 s en el mundo.

## Ajustes
Todo el balance (objetos, monstruos, XP, pérdidas al morir) está en `game/data.js`.

## Despliegue (GitHub + Render)
1. Crea un repositorio vacío en GitHub y sube el código:
   `git remote add origin https://github.com/TU_USUARIO/eldoria-online.git && git push -u origin main`
2. En [render.com](https://render.com): **New → Blueprint**, elige el repositorio y confirma. Render lee `render.yaml`,
   arranca `node server.js` y asigna el puerto solo (el juego usa la variable `PORT`). Los WebSockets funcionan sin configurar nada.
3. Abre la URL `https://eldoria-online.onrender.com` (o la que te asigne Render) y comparte el enlace.

**Guardado de personajes:** en el plan gratuito el disco de Render se borra en cada reinicio o despliegue, y los personajes se pierden.
Para conservarlos, usa un plan de pago, añade un disco (por ejemplo montado en `/var/data`) y define la variable `DATA_FILE=/var/data/players.json`.
El plan gratuito además duerme el servicio tras ~15 min sin visitas; el primer jugador espera unos segundos a que despierte.

## Que las cuentas NO se borren (base de datos gratis)
Render gratis borra los archivos al reiniciar. Eldoria guarda cuentas y estadísticas en **Upstash Redis** (gratis, sin tarjeta):
1. Crea cuenta en https://upstash.com → *Create Database* (Redis, región cercana, plan Free).
2. En la base, pestaña **REST API**: copia `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
3. En Render → tu servicio → **Environment** → añade esas dos variables con esos nombres → Save (redespliega).
En el registro de Render verás `Base remota conectada: N cuentas cargadas.` Se guarda cada 30 s, al desconectarte y al apagarse el servidor.
