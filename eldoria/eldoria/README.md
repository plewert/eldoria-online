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

Botín compartido de todos los jefes: cada jugador que le haga al menos 1 % del daño recibe su propio botín (protegido para él). Quien más daño hace tiene +60 % de probabilidad en todo y más oro; los demás tiran con una probabilidad proporcional a su daño (mínimo 30 %), así que todos pueden sacar raros.

## Botín por clic derecho y tumba
- Clic derecho sobre un objeto del suelo: menú «Recoger X» para cada objeto de la casilla. Caminas hasta allí y recoges solo ese (el resto queda). Pisar una casilla sin elegir sigue recogiendo todo.
- Si mueres en una zona peligrosa (PvP o mazmorra/cueva) queda una cruz enterrada donde caíste, visible en el mundo y en el minimapa (solo para ti). Desaparece al acercarte o tras 2 horas, y se guarda aunque te desconectes.

## Cueva del Hidra de Jade
Segunda cueva oscura (zona `cueva_jade`, sin PvP) en el prado del noroeste: puerta en (52,59). Dentro solo vive la **Hidra de Jade** (nivel 550, 320.000 de vida, 80 % de defensa, reaparece al minuto, botín compartido). Tres ataques con aviso en el suelo: **lluvia ácida** (tres oleadas de gotas que dejan charcos), **fuego amarillo** por las tres bocas (línea larga + quemadura) y **golpe al suelo** con onda y **caída de piedras**. Botín raro: set de arquero de jade (Yelmo, Coraza, Guanteletes, Botas) y el Arco de la Hidra, además de la Escama de Jade.

## Habilidades (cuerpo a cuerpo, distancia, magia)
Máximo nivel 320 en cada una. El nivel general (vida, maná, daño) también se congela en 320: la experiencia deja de subir y vida máx. = 6480. Cada nivel cuesta más experiencia que el anterior (curva ~ 20·(n-1)²·(1+(n-1)/150): nivel 100 ≈ 325 mil, nivel 320 ≈ 6 millones). El bonus de daño es +5 % por nivel hasta el 100 y +1 % por nivel después. Al llegar al 320 la experiencia se detiene.

Las armas raras (Arco de las Sombras y Arco de la Hidra) caen con un 1 % base (antes 4 %); quien más daño hace tiene +60 %.
Las armas del Coloso (Hoja de Magma 0,8 %, Martillo 0,6 %) también son más raras.

Todos los jefes hacen 1,5 veces más daño (ataques normales y especiales); constante `BOSS_DMG` en `game/ext.js`.

Más espacio: mochila de 24 a 48 casillas y banco de 48 a 120 (`INV_SIZE` / `BANK_SIZE` en `game/data.js`).

## Colección de jefes (tecla B, botón 📖)
Registra cada objeto que te suelta un jefe (equipo, armas, mascotas, trofeos y otros objetos raros), con el número de veces. Lo que aún no te salió aparece en negro con «???»; al pasar el ratón se ve su probabilidad. Se guarda con tu cuenta. Solo cuenta desde ahora: lo que ya habías conseguido antes no se registra.

Hechizo de curar (V): cura 1000 de vida fijos y se recarga en 4 s (`HEAL_AMOUNT` / `HEAL_CD_MS` en `game/data.js`); cuesta 25 de maná.

## Mapa ampliado y comida
- El mundo pasa de 180×140 a **250×140**. El mapa original no cambia; al este (siguiendo el camino del desierto) hay tres lugares nuevos: **Aldea Pesquera de Coral** (ciudad segura con Nilo el Pescador, tienda, y Tomás el Banquero), **Selva Esmeralda** al norte (PvP, monstruos fuertes) y **Sabana Dorada** al sur (zona segura con monstruos medios).
- **Comida** (botón 🍣 de la barra o tecla **K**): Sardina 80, Salmón 100 y Tiburón 150 de vida. Se usa la más pequeña que cubra lo que te falta (si ninguna basta, la mayor). Enfriamiento propio de 1,5 s, aparte de las pociones. Se vende en Boris, Capitán Brisa y Nilo (`SHOPS` en `game/data.js`).

## Tierras de Lava y Fuego, gemas y mascotas de jefe
- Nueva zona **PvP** al este de la Sabana (x 250–319): **Tierras de Lava y Fuego**. La lava es intransitable (se ve animada), el suelo es ceniza y hay formaciones de obsidiana. Monstruos de fuego: golems de lava, demonios y dragones. Se llega por el camino largo del este.
- **Gemas**: ahora caen con un 0,15 % por muerte (monstruos y jefes; antes los jefes siempre soltaban una). `GEM_CHANCE` en `game/data.js`.
- **Equipo raro** de monstruos y jefes: cae a la mitad de seguido (`GEAR_DROP_MULT` = 0,5).
- **Mascotas de jefe**: cada jefe puede soltar una "Cría de ..." (0,4–1 % base) que te sigue y da +20–35 % de oro. Aparecen también en la colección de jefes (B).

## Pantalones de los dragones
- **Pantalón de Asesino de Sombras** (nv 64, def 28, +200 vida, +2% crítico): lo suelta el Dragón de las Sombras.
- **Pantalón de Escamas de Dragón** (nv 73, def 30, +220 vida, +5 ataque): lo suelta la Hidra de Jade.
- Ranura de piernas, 5% base como el resto del set (con GEAR_DROP_MULT 0.5 queda en ~2.5%). Aparecen en la colección de jefes.

**Carcaj de Escamas de Jade** (escudo/carcaj, nv 72, def 26, +150 vida, +6 ataque, +2% crítico): drop de la Hidra de Jade (5% base).

**Aviso de colección:** la primera vez que te cae un objeto de jefe aparece un cartel dorado en pantalla (“¡Nuevo en tu colección!”) con su icono y nombre; si caen varios, se muestran en cola.

## Ambiente animado
- **Agua** (ríos y lagos): olas que fluyen en sentidos opuestos, destellos y espuma que ondula en las orillas.
- **Árboles, palmeras, pinos y árboles muertos** se mecen con el viento (ráfagas que recorren el mapa) y los árboles sueltan hojas que caen flotando.

## Árboles y pasto nuevos
- `public/trees.png` + `trees.json`: 9 árboles (3 grandes, roble, redondo, bosquecillo, manzano, naranjo, florido) y un árbol seco, más 4 teselas de pasto, tomados de la imagen de arte. Los árboles se eligen por posición del mapa y se dibujan sobre el terreno, así sobresalen por encima del tile.
- Los árboles se mecen con el viento (ráfagas) y sueltan hojas; el pasto tiene briznas que se mueven. Palmeras y pinos siguen con su dibujo anterior (también animados).

## Joyas del Dragón de las Sombras
Drops del Dragón de las Sombras (4–5% base, ×0.5 por la reducción de equipo): **Anillo Umbrío** (nv 60, +12 def, +120 vida), **Anillo de la Noche Estrellada** (nv 62, +10 ataque, +3% crítico), **Anillo del Vacío Violeta** (nv 64, +8 ataque, +100 vida, +2% crítico) y **Amuleto del Abismo Violeta** (nv 66, +300 vida, +150 maná, +3% crítico). Aparecen en la colección de jefes.

**Cinturón de las Sombras** (cinturón, nv 63, def 14, +160 vida, +60 maná, +1% crítico): drop del Dragón de las Sombras (5% base). Se dibuja en la cintura del personaje.

## Joyas de la Hidra de Jade
Drops de la Hidra de Jade (4–5% base, ×0.5 por la reducción de equipo): **Anillo del Rubí Dracónico** (nv 72, +10 ataque, +120 vida, +2% crít.), **Anillo de Hoja de Jade** (nv 70, +10 def, +160 vida), **Cinturón de Escamas de Jade** (nv 71, def 16, +180 vida, +5 ataque) y **Amuleto del Dragón de Jade** (nv 74, +350 vida, +100 maná, +8 ataque, +3% crít.). Salen en la colección de jefes.

## Pesca 🎣
- **Cómo se juega:** compra una caña a Nilo el Pescador (aldea de pescadores), haz clic en el agua (o clic derecho → *Pescar aquí*) a 5 casillas o menos y no te muevas. Tras unos segundos pica un pez: aparece una barra con una zona verde y un marcador que va y viene; pulsa **ESPACIO** (o clic en la barra) con el marcador dentro del verde. Tirar antes de tiempo asusta al pez; tardar o fallar lo deja escapar. Todo lo decide el servidor (el marcador depende del tiempo del servidor).
- **Habilidad de pesca:** nivel 1–320 propio (`game/fishing.js`, la experiencia cuesta 1/20 de la de combate). Más nivel = menos espera, zona verde más ancha y peces mejores. Ventana de pesca con la tecla **O** (nivel, registro de capturas, peces por zona y cañas).
- **Peces:** Sardina (nv 1, cura 80), Salmón (nv 30, 100), **Atún** (nv 60, 120), Tiburón (nv 100, 150). Zonas: ríos y lagos (sardina y salmón; salmón abunda en bosque, cumbres y selva), costa/playa (atún y tiburón), mar del volcán (peligroso). Los peces se venden por más con el nivel de pesca (+1 % por nivel).
- **Cañas** (tienda de Nilo, dibujos en amarillo y azul): Trucha (nv 1, amarilla), Carpa (15, azul), Fly Fishing (25, amarilla), Hielo (40, azul), Surf Casting (60, azul), Mar Profundo (120, amarilla premium): menos espera, zona verde mayor y, desde Surf Casting, 12 % de capturar 2 peces. Se usa la mejor que tu nivel permita. Sardina, salmón, atún y tiburón tienen icono propio y el pez salta del agua al capturarlo.
- **Cebos:** Cebo de Gusanos y Cebo Dorado (se gasta uno por lanzamiento): picada más rápida, más peces raros y más probabilidad de tesoro.
- **Tesoros raros:** Perla Marina y Cofre Hundido (muy poca probabilidad; se venden caro).
- **Tiburón:** si se escapa, se lleva un cebo o te muerde (8 % de tu vida, nunca te mata).
- **Misiones de Nilo:** Primeras capturas, Salmones del norte (caña de hierro), Atunes de la costa, El rey del mar (caña de acero).

- **Nivel de pesca a la vista:** aparece como cuarta habilidad (🎣 Pesca) bajo Magia en el panel del personaje, con su barra de experiencia; al hacer clic se abre la ventana de pesca.
- Boris el Mercader también vende las cañas (todas) y los cebos, además de Nilo.

## Arcángel del Santuario (jefe, Santuario de las Nubes)
- Cueva con forma de nube en la Sabana (cerca de la aldea de pesca de Nilo), suelo blanco animado. Entrada por el camino al norte de la cueva.
- Jefe compartido, reaparece cada 60 s. Tres ataques: **ráfagas de rayos** (círculos de aviso y caída: se esquivan caminando), **tornado** que persigue ~5 s y **nova azul** sobre los jugadores cercanos.
- Botín raro: Yelmo, Coraza, Guanteletes, Pantalón Divino de Luz, Botas Aladas, Carcaj, Anillo, Cinturón de Plumaje Divino, Amuleto de la Gracia Celestial (4–6 % base) , Báculo Alado (~1 %) y Arco Arcangélico (0,5 %). Datos en `game/angel.js`, IA en `angelAI` (`game/ext.js`).

## Mochila ordenable
Arrastra un objeto de la mochila a otra casilla (vacía u ocupada) para moverlo o intercambiarlos. Mensaje `swap` en `game/game.js`.
