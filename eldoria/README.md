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

## Sprites
Los monstruos y PNJ con sprite de píxel-art salen de `public/sprites.png` + `sprites.json` (atlas hecho con tus láminas). Los que no tienen sprite siguen con emoji y extremidades animadas. Para cambiar uno, edita el atlas o quita su clave de `sprites.json`.

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

## Equipo de mago (láminas de pixel-art)
- 13 túnicas, 15 sombreros/coronas/capuchas, 19 báculos, 10 cintos, 6 guantes y 8 libros/orbes (mano libre). Cada pieza es más fuerte que la anterior (ver `game/mage.js`).
- Nuevas casillas: **cinto** y **guantes**. Túnicas, sombreros, báculos, cinto, guantes y libros se ven puestos en el personaje.
- Orin el Sabio vende las piezas de nivel bajo; las demás caen de monstruos según su nivel.
- Los dibujos están en `public/gear.png` y `public/gear.json`.

## Sistemas nuevos

- **Misiones** con PNJ (marcas ❗ sobre ellos, tecla `Q`), **logros y títulos** (`L`), **ranking** (`R`).
- **Habilidades activas** por estilo con las teclas `1`, `2`, `3` (se desbloquean a nivel 1, 8 y 15 del estilo).
- **Grupos y gremios** (`G`; clic derecho sobre un jugador → invitar). Chat: `/p` grupo, `/gc` gremio.
- **Mercado entre jugadores** (`P`, solo en ciudades, comisión 5 %), **oficios** (`F`): recolecta 🌿💠⛏️🔷 con clic y fabrica pociones, elixires y gemas.
- **Mascotas y monturas** (tienda de Brisa y botín): clic en el objeto para invocarlas.
- **Jefe de evento**: el Coloso Ancestral aparece cada cierto tiempo; variables `EVENT_MIN` (minutos entre eventos) y `EVENT_FIRST_MIN` (primer evento tras arrancar).
- **Día/noche y clima**, **música y sonidos** (botón 🔊), **controles táctiles** para móvil.
- **Seguridad**: límite de intentos fallidos por IP y **código de recuperación** (se muestra al crear la cuenta; `/codigo tuClave` genera uno nuevo; en el login, «¿Olvidaste tu clave?»).

### Que el servidor no se duerma (Render gratis)
Render duerme el servicio tras 15 min sin visitas. Crea un monitor gratuito en UptimeRobot o cron-job.org que haga una petición cada 5 min a `https://TU-APP.onrender.com/health`.

### Set del Titán de Magma (botín raro del Coloso Ancestral)
18 piezas (6 cascos, coraza, 2 guanteletes, cinto, 4 grebas, botas, **Hoja de Magma**, **Martillo del Coloso** y **Escudo del Dragón de Magma**), niveles 46-58, con vida extra y algo de ataque. Hay dos casillas nuevas de equipo: **grebas** y **botas**. Cada pieza cae con un 3-5 % por victoria.

### Niveles de los monstruos
Cada monstruo muestra un pequeño `lvl N` sobre su nombre (gris = trivial, verde, amarillo = parejo, naranja/rojo = peligroso, morado = imposible). Sale de la experiencia que da; el Coloso es nivel 150 y el Dragón nivel 500.

### Dragón de las Sombras (jefe de evento, nivel 500)
Alterna con el Coloso Ancestral en el evento de jefe (Dunas Ardientes, 15 minutos, 200.000 de vida más un 35 % por jugador extra conectado). Tres ataques:
1. **Cuerpo a cuerpo** (170-300).
2. **Aliento de fuego negro** a distancia: avisa 1 s con una franja morada; se esquiva moviéndose. Deja una quemadura de 3 s.
3. **Pisotón que rompe el suelo**: círculo rojo de aviso, onda de choque (520-760) y después grietas de lava sobre los jugadores.

Botín raro: **Set de las Sombras** (capucha, coraza, guanteletes, botas, carcaj y Arco de las Sombras), más Escamas de las Sombras, pociones y plumas de fénix. Un día/hora fijos no hacen falta: `EVENT_MIN` marca cada cuánto sale un jefe.

## Cueva del Dragón de las Sombras
Una caverna enorme y oscura (zona `cueva`, sin PvP) al sur del camino del desierto. Se entra por el portal del camino (122,79) y se sale por el portal de la entrada. Dentro solo vive el Dragón de las Sombras (nivel 500, reaparece al minuto y tiene 80% de defensa, 300.000 de vida (reduce todo el daño que recibe)); ya no es jefe de evento. La oscuridad solo se aclara alrededor del jugador, otros jugadores y portales.

Las mazmorras y la cueva son recintos cerrados: ni tú puedes atacar a los monstruos de dentro desde fuera, ni ellos (aliento, pisotón, ataques) te alcanzan desde la entrada. Hay que entrar.

Botín del dragón compartido: cada jugador que le haga al menos 1 % del daño recibe su propio botín (protegido para él). Quien más daño hace tiene +60 % de probabilidad en todo y más oro; los demás tiran con una probabilidad proporcional a su daño (mínimo 30 %), así que todos pueden sacar raros.
