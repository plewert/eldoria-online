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

## Coloso Ancestral (jefe de evento): animación y ataques
- Sprite animado (respira y brilla, 4 fotogramas).
- **Lluvia de fuego**: 3 oleadas de bolas con círculos de aviso; dejan charcos de fuego. **Terremoto**: onda de aviso, el suelo se agrieta y tiembla (daño en área de 7 casillas) con una réplica menor. IA en `titanAI` (`game/ext.js`).

## Balance de jefes
Coloso Ancestral: vida 30 000 → 90 000 y daño ×1,8. Jefes de cueva (Dragón de las Sombras, Hidra de Jade, Arcángel): daño ×1,5 extra (campo `dmgK` en `game/extra.js`, sobre el ×1,5 general de jefes).

## Escarabajo Gigante
Nueva imagen (escarabajo verde metálico con mandíbulas) animada (8 fotogramas: patas, mandíbulas y cuerpo) en `public/sprites.png` (`escarabajo_gigante`).

## Golpes cuerpo a cuerpo animados
Al atacar con un arma cuerpo a cuerpo, el personaje balancea el arma con una estela de corte (color del elemento del arma); lanza y daga hacen una estocada; martillos, mazas y armas pesadas añaden onda de choque y temblor; las hachas y mandobles, chispas. Ver `holdWeapon` y el caso `'s'` en `public/game.js`.

## Aracnídeo Fuego Negro (jefe de cueva, Tierras de Lava)
- **Guarida de telarañas** con forma de tela (anillos y radios) en las Tierras de Lava; entrada por el camino al sur del eje este (portal en 288,95). Suelo con telarañas y brasas animadas, paredes con vetas de lava.
- Ataques: **zarpazo cuerpo a cuerpo (daño ×2 sobre el base)**, **redes de telaraña de fuego** (círculo de aviso, daño, inmovilizan ~2 s y queman) e **invoca arañas de fuego** (hasta 8, desaparecen a los 45 s o al morir el jefe). Datos en `game/spider.js`, IA en `spiderAI` (`game/ext.js`).
- Botín raro: Rastreador Ciego, Silbato Silencioso, Brazal de Garra, Pantalón de Fuego Negro, Botas de Garra, Cierre de Garra, Reserva Ígnea (carcaj) (4–6 % base) y Llama del Viento (gran espada), Garras de Fuego Negro y Arco Largo Llama del Viento (0,5 %).

## Tabletas de teletransporte
Boris (y Zaroth en Alba Dorada) venden 17 tabletas (2 000 de oro cada una, de un solo uso): Ciudad, Bosque, Cumbres, Dunas, Aldea Pesquera, Selva, Sabana, Tierras de Lava, Pantano, Colinas, Puerto, Alba Dorada, Montañas del Trueno, Reino de las Nubes, Desierto de las Pirámides, Paraíso de Coral y Gremio de Mineros. Clic en la tableta para usarla; no funciona en combate. Ver `game/tablets.js`.

## Mapa del mundo
- Ábrelo con el botón 🗺️, la tecla **N** o haciendo clic en el minimapa.
- Acerca/aleja con la rueda del ratón o los botones **+ / −**, arrastra para moverte; "Centrar en mí" y "Ver todo".
- Muestra el nombre de cada zona (con etiqueta ⚔ PvP si aplica), ciudades y cuevas.

## Set del Maestro Pescador (botín raro de pesca)
- Sombrero, Chaleco, Pantalón y Botas del Maestro Pescador + Caña del Maestro Pescador (pesca 100): cada captura tiene un **0,5 %** de dar cada pieza.
- Con las 4 piezas de armadura puestas, cada captura tiene un 25 % de traer **5 presas** de golpe.
- Al pescar, el personaje sostiene en la mano la mejor caña que tenga (incluida la del Maestro Pescador) y el sedal sale de su punta.

## Mascotas de pesca y colección de pesca
- Pelícano Sombrerero (+20 % oro) y Pulpito Naranja (+25 % oro): **0,20 %** por captura cada uno.
- La ventana 📖 (tecla B) ahora tiene una sección **🎣 Pesca** arriba: peces, perla, cofre, mascotas, set del Maestro Pescador y caña.
- Cada objeto raro de pesca avisa con mensaje, texto flotante ★, aviso de "Nuevo en tu colección" y anuncio en el chat global.

## Leviatán Abisal (jefe de la Gruta inundada)
- Gruta del Leviatán Abisal: cueva de agua en la Selva Esmeralda (puerta al norte, entre la aldea y el camino de la selva). Suelo de agua poco profunda, lagos hondos y columnas de roca.
- Ataques especiales: **tornados marinos** que se multiplican y vagan por la cueva (15 s), **olas** que barren la cueva en franjas avisadas, **rayo de bolas de agua** por la boca (3 pulsos que re-apuntan) y **escudo burbuja** de 5 s en el que es inmune.
- Botín raro: Yelmo, Coraza, Manoplas, Grebas, Botas y Cinto del Abismo Marino, 3 anillos (perla, alga, coral), Amuleto del Corazón Marino y el Tridente del Leviatán (agua), además de la cría del Leviatán (mascota).
- Corregido: las casillas de muro de la guarida de la araña (WEBW) no bloqueaban en el servidor.

## Minería

Habilidad nueva (tecla **U**). Boris vende los picos (piedra, hierro, acero, cristal, obsidiana, abismo): mejor pico = más rápido, más gemas y a veces doble piedra. 8 rocas repartidas por zonas y nivel: Granito y Arenisca (1-30), Pizarra (30-60), Pedernal (60-90), Pómez (90-120), Mármol (120-170), Basalto (170-220), Obsidiana (220-320, cuevas). Cada roca puede dar gemas (rubí, zafiro, esmeralda, topacio, amatista, ópalo, diamante) para engarzar en armas y armaduras. Sección propia en el registro de colección y anuncio global de gemas raras.

## Efectos visuales (✨)

Botón junto al de sonido (PC y teléfono) que cambia entre **Completo** (luces cálidas, rayos de sol, polvo de luz y luciérnagas), **Básico** (sombras según la hora, viñeta y color) y **Apagado**. Se guarda en el navegador; en teléfono arranca en Básico. Código en `public/gfx.js`.

## Teléfono

- **Horizontal:** mapa a pantalla completa, joystick a la izquierda, acciones (estilos, pociones, hechizos) en cuadrícula a la derecha, chat compacto y mochila en dos columnas. Las ventanas se adaptan a pantallas bajas.
- **Vertical:** acciones abajo en dos filas, joystick encima y chat compacto.
- **⛶ Pantalla completa** (bloquea horizontal donde el navegador lo permita), zonas seguras para muescas y bordes redondeados.
- **Zoom:** pellizco con dos dedos o botones ＋/－ (se guarda); en teléfono arranca alejado para ver más mapa.
- La pantalla de acceso se desplaza si el teléfono está en horizontal.

## Raid: Santuario de las Cinco Sombras (1 a 10 jugadores)
- Entrada: portal del Santuario en la Ciudad de Aldea Real (cerca de la plaza). En la antecámara pulsa **Iniciar la Raid** (o `/raid`): entran juntos quienes estén allí (máx. 10). Durante el primer minuto de la cámara 1 se puede unir más gente.
- 5 cámaras seguidas: **Slyvra → Koros → Aranak → Xaelis → Malgathor**. La vida de cada jefe escala con el grupo (+75 % por jugador extra). Cada jefe tiene ataques con aviso en el suelo (círculos, líneas, charcos, golpes, invocaciones, escudo, singularidad) y se enfurece por debajo del 35 % de vida.
- Cada jugador tiene 3 vidas: si cae, vuelve por el portal a la cámara actual. Si todos mueren, la Raid se sella. `/raid salir` te saca.
- Jefes intermedios: oro y 22 % de una pieza de su set. **Cofre final** (cámara 5): cada participante lo abre una vez (clic, tecla E o botón) y recibe botín raro de los 5 sets (casco, peto, guantes, grebas, botas, cinto, anillo, amuleto, **capa**, arma), oro, pluma de fénix y, con suerte, la cría de un jefe. Más aporte de daño = más opciones de un segundo objeto. Animación de apertura con rayos y tarjetas (dorado = raro).
- Nueva ranura **Capa** en el equipo (las capas de la Raid tienen color propio; la de Xaelis lleva alas doradas).
- Todo el botín sale en la **Colección** de cada jefe. Archivos: `game/raid.js` (servidor), `public/raid.js` (cliente), sprites `raid_*` y `gear.png`.

## Seguir compañero y auto golpe
- Clic derecho sobre un jugador → **🚶 Seguir**: tu personaje lo sigue solo por el camino. Se cancela al moverte tú, pulsar Esc, hacer clic en el suelo o perderlo de vista 6 s. Funciona también en la Raid.
- Botón **🗡️ Auto** en la barra inferior (junto a Z/X/C): si está activo, cuando algo te ataca y no tienes objetivo, lo atacas automáticamente (a jugadores solo si hay PvP). Se recuerda entre sesiones.

## Vista 3D (opcional)
- Botón **🧊** (debajo del reloj, junto a ✨) o tecla **Y**: activa/desactiva la vista 3D. Se recuerda entre sesiones; por defecto está desactivada.
- El suelo se dibuja en perspectiva (más cerca = más grande) y jugadores, jefes, PNJ y objetos quedan de pie mirando a la cámara. Los avisos de ataque de la Raid se ven proyectados en el suelo. Clic, menú contextual, seguir y auto golpe funcionan igual.
- Es solo visual (`public/game.js`, función `frame3d`): el servidor y el juego no cambian. En teléfonos modestos puede ir más justo; basta con desactivarlo.

## Efectos 🎬 (nivel Cinematográfico)
- El botón ✨ ahora tiene 4 niveles: 🚫 apagados · 🔅 básicos · ✨ completos · 🎬 cinematográficos (bloom, gradación de color, luz de jefes sobre el suelo y, en vista 3D, reflejo de jefes y profundidad de campo). Es el más exigente: en teléfono arranca en 🔅 y conviene probarlo antes de dejarlo.
- En 3D los teléfonos usan menos resolución en el suelo para ir más fluidos.

## Animación de arcos y báculos
Al disparar, el arco tensa la cuerda con la flecha encajada (brillo elemental), la suelta con vibración y retroceso; los báculos se alzan, cargan un orbe con chispas que convergen y lanzan con destello y onda. El proyectil sale al terminar la carga (~190 ms arco, ~250 ms magia). Funciona en 2D y 3D.

## Extras gráficos (fx2.js)
Se controlan con el botón ✨ (básico / completo / cine). Básico: huellas en arena, nieve y barro, polvo al caminar, golpes con peso (zoom y destello en críticos, bordes rojos al recibir daño, números con rebote), desintegración de monstruos, tarjeta de entrada de jefe con barras de cine, fases de furia con aura, banner de subida de nivel e iris al cruzar portales. Completo: charcos con ondas y salpicaduras de lluvia, nieve acumulada, espuma y brillos en el agua, hojas con viento (arena en el desierto), ventanas encendidas de noche, auras del equipo (sets de raid, Ancient, +N altos), estela de capa y brillo animado en ítems raros. Cine: reflejos en el agua y relámpagos dibujados. El minimapa marca los portales (rojo PvP, dorado raid/mina, azul resto).

## Realismo de luz y terreno (fx3.js)
Nivel ✨ completo o cine: oclusión ambiental junto a muros, rocas y árboles; sombras de copas con luz filtrada; bordes blandos entre hierba, camino, arena, nieve y pantano; agua con profundidad y brillo del cielo (reflejo de luna en cine); sombras de nubes; bruma baja al amanecer, atardecer, tras la lluvia y en pantanos; luz dinámica de hechizos, proyectiles, lava y jefes enfurecidos; vaho en el frío; parpadeo de personajes. Pendiente (requiere WebGL): luz por píxel sobre los sprites y normal maps.

## Tutorial inicial (tutorial.js)
Los personajes nuevos (nivel menor a 5) reciben un tutorial de 4 pasos: moverse, hablar con Orin el Sabio, equipar un arma (el objeto recomendado brilla en la mochila) y matar un monstruo. Una flecha dorada rebota sobre el objetivo (o se pega al borde de la pantalla apuntando hacia él), y el panel muestra una brújula con la distancia, útil también en la vista 3D. Se guarda por personaje en el navegador; «Saltar» lo cierra y F1 lo repite.

## Aventureros simulados (bots)
Dieciséis personajes controlados por el servidor (`game/bots.js`) juegan como una persona normal y comparten el mundo con los jugadores reales.
- **Nombres normales:** tienen nombre propio como cualquier jugador y sus nombres quedan reservados al registrarse. El comando `/ayuda` avisa de que parte de los aventureros del mundo están controlados por el servidor.
- **Cuatro niveles:** *novatos* (5) cazan en el Prado; *aventureros* (4) en las Catacumbas y el Bosque Maldito; *veteranos* (2) en las Minas Enanas, la Selva Esmeralda y el Pantano; *élites* (5) en las Colinas, las Tierras de Lava y el Abismo Carmesí, con equipo de la Raid. Cambian de zona cada 10–20 minutos.
- **Zonas PvP:** entran en ellas como cualquiera. Los jugadores pueden atacarlos (si caen, sueltan objetos como un jugador) y **se defienden**, pero no empiezan peleas. En esas zonas solo recogen el botín de sus propias presas, nunca lo que otros jugadores sueltan al morir.
- **Juegan de verdad:** cazan, **recogen el botín** del suelo, y cuando la mochila se llena (o cada cierto tiempo) viajan a la ciudad: **venden** lo que sobra en la tienda de Boris, **compran** pociones y mejoras de equipo que puedan pagar, y **guardan en el banco** (con Gerda) las gemas, el equipo raro y el oro sobrante. Usan pociones y el conjuro de curar, y de vez en cuando charlan cerca de otros jugadores.
- **Comparten zonas y jefes:** cazan en las mismas zonas que los jugadores reales; aventureros y veteranos se juntan para el Rey Esqueleto y el Maestro Forjador (los jefes de cuevas con ataques especiales y los de zonas PvP quedan fuera). Si hay jugadores reales peleando, el botín se reparte como siempre.
- **Raid con jugadores:** las élites forman grupo y hacen la Raid esquivando los avisos de ataque. Si un jugador real espera en la antecámara, **van con él** y la inician juntos; si la iniciaron ellas, el jugador puede **unirse en cualquier momento**. Abren el cofre final como cualquiera.
- **Límites:** tienen tope de nivel y de habilidad, no atacan primero a nadie, no comercian de jugador a jugador ni forman grupo social, no salen en `/top` y no se guardan (al reiniciar el servidor empiezan de nuevo).
- `BOTS=0` los desactiva; `BOTS=8` cambia la cantidad (máx. 16). Prueba: `node test/bots.js`.

## Mascotas que recogen el botín
Con una mascota activa (usa el objeto de mascota de la mochila), el oro y los objetos que dejan tus presas llegan solos a tu mochila (`game/petloot.js`): radio de 8 casillas, un montón cada ~0,45 s, con el bonus de oro de la mascota. Solo recoge lo tuyo (o lo sin dueño de tus kills en zonas PvP), nunca el botín protegido de otros jugadores ni lo que se suelta al morir. Si la mochila está llena, el objeto se queda en el suelo. Prueba: `node test/pet.js`.

## Ignaros, Soberano del Magma (jefe de la Caldera)
Aspecto: figura encapuchada con capa de basalto y magma, bandas rúnicas doradas y un orbe flotante con rayos de arcoíris (sprite animado de 8 fotogramas más una pose de lanzamiento de 6). Todos los ataques salen del jefe: carga el orbe, lanza meteoritos hacia el cielo, 8 rayos radiales de fuego, el fuego del infierno se propaga en ola y la lava nace de él.
Cueva nueva en las Tierras de Lava (puerta al norte, justo al sur de la Guarida del Aracnídeo). Jefe de nivel 750 con armadura 50 %. Ataques:
- **Infierno**: la cueva se enciende; aparece al azar un **cuadro azul** (refugio) y solo quien está dentro se libra del daño.
- **Meteoritos**: círculos rojos de aviso, impacto directo y onda explosiva que se expande.
- **Líneas de fuego**: franjas horizontales y verticales que cruzan toda la cueva (con aviso).
- **Marea de lava**: la caldera se llena de lava y solo las **rocas azules** son seguras.
Los personajes arden al ser golpeados (llamas sobre el cuerpo) y se hunden en la lava. Botín raro: Yelmo, Coraza, Capa, Anillo, Arco Ígneo y Bastón del Orbe Ardiente, además del Corazón de Magma y la cría de mascota. Código: `game/magma.js` (servidor) y bloque «Ignaros» de `public/ui2.js` (animaciones).

## Anubis, Juez de las Sombras (Tumba de Anubis, Desierto de las Pirámides)
Cueva nueva al sur del desierto (entrada por la pirámide grande, 2.000 de oro). Sala oval de losas violetas con pilares, altar y **braseros de llama verde**. Jefe de nivel 800 (480.000 de vida, armadura 50 %). Ataques:
- **Miasma de las tumbas**: golpea el suelo con el báculo; grietas y nubes oscuras durante 9 s que dañan sin parar y **reducen la curación (pociones 40 %, regeneración 30 %) unos segundos**.
- **Portales verdes**: se abren portales por toda la cueva y lanzan flechas de fuego verde; al caer explotan (hay marca roja/verde en el suelo para esquivar).
- **Tres sombras**: se divide en una sombra cuerpo a cuerpo, una mágica y una a distancia; Anubis es inmune hasta derrotarlas (más vida con más jugadores).
- **Momia Eterna**: con menos del 30 % de vida revive una momia; al morir explota y lanza **fuego negro** (8 rayos y lluvia de bolas) por toda la cueva.
Botín raro: Máscara, Armadura, Guantelete, Pantalón, Botas, Cinturón, Sello, Corazón de la Balanza y Arco y Báculo del Chacal Alado, más la Balanza de Anubis. Misión diaria con Boris. Código: `game/anubis.js` (servidor) y `public/anubis.js` (animaciones).

## Banco ampliable y entrada a las cuevas
- En el banco, el botón **Comprar +5 espacios** cuesta **1.000.000** de oro (se paga con el oro en mano y, si falta, con el del banco). Se puede repetir hasta 480 espacios. Los espacios se guardan con el personaje (`bankSlots`). Ajustes en `CFG` (`BANK_PACK`, `BANK_PACK_COST`, `BANK_MAX`).
- Entrar a cada **cueva de jefe** (Dragón, Hidra, Nubes, Araña, Leviatán, Caldera de Magma) cuesta **2.000** de oro en mano cada vez (`CFG.CAVE_FEE`). Las salidas son gratis; la Raid y las zonas normales no cobran. Los aventureros automáticos no pagan.

## Sonido y música (`public/audio.js`)
Todo se sintetiza con WebAudio (sin archivos). **Música distinta por zona** (ciudad, puerto, prado, bosque, cumbres, dunas, pantano, selva, volcán, catacumbas, minas, cada cueva de jefe, PvP, antecámara y cámaras de la Raid), con bordón, oleaje y percusión según el lugar. Si hay un jefe vivo a menos de 15 casillas suena el tema de **batalla** (más rápido, con tambores) y vuelve al de la zona al alejarte. Efectos por arma (espada, daga, hacha/martillo, arco) y por elemento (fuego, hielo, veneno, rayo, arcano, agua, oscuro, sagrado); cada ataque de jefe tiene su aviso y su sonido (aliento, terremoto, meteoro, inferno, lava, rayo, nova…) y cada jefe ruge distinto al aparecer. Botón 🔊 o tecla M para silenciar.
- **Misiones de jefes** (cazador de jefes): un encargo por cada jefe (Rey Esqueleto, Señor Orco, Cangrejo Colosal, Hidra, Rey Escorpión, Demonio Supremo, Coloso y los 6 de cueva). Los del Coloso y las cuevas se repiten cada 24 h con oro, experiencia, pociones y plumas de fénix.

## Equipo de los jefes animado
Todas las piezas que sueltan los jefes (Dragón de las Sombras, Hidra de Jade, Arcángel, Aracnídeo Fuego Negro, Leviatán, Coloso, los 5 jefes de la Raid y los mantos, capuchas y bastones de los jefes menores) tienen una banda de luz que las recorre y partículas propias de su tema (sombra, jade, destellos sagrados, brasas, burbujas, forja, hielo). Se ve en el inventario, el botín del suelo y sobre el personaje. Los trofeos y plumas de fénix flotan y brillan. Código: `themeOf`/`themedDraw` en `public/game.js` (los del Magma tienen su propia animación).

## Gremio de Mineros
Cueva propia (zona segura) a la que se entra por un portal junto a la ciudad, en el lado oeste (casilla 74, 64); no cobra entrada. Solo tiene rocas de nivel **bajo y medio** (granito, arenisca, pizarra, pedernal y piedra pómez; sin mármol, basalto ni obsidiana), que reaparecen en 40 s. **Durgan el Capataz** vende todos los picos. Sobre los jugadores solo se muestra nombre y nivel (ya no la etiqueta de gremio).

## Flechas de misión
Al aceptar una misión aparece una flecha azul (hasta 3, las más cercanas) que señala a dónde ir: el monstruo de la misión, de dónde sale el objeto a recolectar, la **entrada de la cueva** del jefe (y, ya dentro, al jefe; si estás dentro de otra cueva, al portal de salida) o, con la misión lista, al PNJ al que entregarla. Si queda fuera de pantalla la flecha se pega al borde con el nombre y la distancia. Servidor: `questGuide` en `game/ext.js`; cliente: bloque `qguide` en `public/ui2.js`.

## Estadísticas de objetos en el móvil
En pantallas táctiles no hay cursor, así que el menú que se abre al tocar (o mantener pulsado) un objeto de la mochila o del equipo ahora muestra también sus estadísticas (ataque o defensa, bonus, ranuras, nivel requerido y valor). En la tienda, el banco y el comercio, mantener pulsado un objeto muestra esas estadísticas sin comprarlo ni moverlo.

## Mapa ampliado: Tierras Inexploradas (para zonas futuras)
El mundo exterior pasa de 320 a **480 casillas de ancho** (480 × 140, más las salas de la Raid al sur). Todo lo anterior queda igual; se añadieron 160 columnas al este, desde la x = 320, como zona **Tierras Inexploradas** (`tierras_nuevas`): terreno abierto de hierba, árboles, agua y rocas, segura (sin PvP) y sin monstruos, con un paso despejado de 7 casillas desde las Tierras de Lava (y = 67-73). Cuando se diseñen las zonas nuevas, basta con dividir ese rectángulo en `ZONES` (`game/world.js`), tallar sus cuevas y añadir sus monstruos y rocas en `SPAWN_PLAN`/`mining.js`. El minimapa y el mapa del mundo escalan solos al nuevo tamaño.

## Ciudad de Alba Dorada (Tierras Inexploradas)
Gran ciudad segura (41 × 27 casillas, la más grande del juego) en el centro de las Tierras Inexploradas, con puertas en los cuatro lados, una plaza central con flores y cuatro casas. Se llega por un camino desde las Tierras de Lava (puerta oeste). Dentro: **Ilda la Banquera** (guarda oro y objetos), **Marela la Pescadora** (pescado, cañas y cebos, igual que Nilo; con el dibujo de la niña de la estrella) y **Zaroth el Brujo** (todas las armas mágicas a la venta, más pociones de maná). La casa suroeste queda vacía para futuros PNJ. Código: `buildTown('ciudad_alba', …)` y `NPCS` en `game/world.js`; las tiendas `marela` y `zaroth` en `game/data.js`.

### Flechas de misión (mejoradas)
Al aceptar una misión sale un aviso con la zona a la que ir, la flecha azul indica el lugar (también en modo 3D) y el minimapa marca el destino con un círculo azul que late.

### Modo seguro 🛡️
Para teléfonos/PC donde el juego se pone en blanco o se pega: apaga el 3D, los efectos, la portada animada y la resolución alta. Se activa con el botón 🛡️ (en el juego), con la casilla de la pantalla de inicio o añadiendo `?seguro=1` a la dirección (`?seguro=0` lo quita). Si el juego baja de 14 fps durante unos 7 segundos, lo activa solo y avisa.

### Cuatro regiones alrededor de Alba Dorada
- **Montañas del Trueno** (noroeste): huestes de arcángeles (centinelas, cruzados, espadas celestiales, guardianes alados); jefe **Serafín de Fuego**.
- **Reino de las Nubes** (noreste): ángeles, ángeles guerreros, celestiales sabias, serafines y querubines; jefe **Serafín de la Tormenta**.
- **Desierto de las Pirámides** (suroeste): pirámides de arenisca, escorpiones dorados, momias, sacerdotes, cobras y la infantería del faraón (lanceros, escuderos, hacheros, arqueros y guardia real); jefe **Amenkhet**.
- **Paraíso de Coral** (sureste): playa con laguna (pesca), cangrejos, tortugas, sirenas, querubines y ángeles; jefe **Reina Sirena**.
Todas sin PvP, con calles desde la ciudad, misiones de Ilda y trofeos. Los monstruos nuevos reutilizan el dibujo de otro (`spr` en `game/regiones.js`).

## Equilibrio de armas y armaduras
Armas: ataque −5 % (nivel 1–40), −12 % (41–89), −20 % (90+, además +7 % de tiempo entre ataques). Bono de daño por nivel 1,0 % (antes 1,5 %). Armaduras: defensa −10 % (nivel 90+), ataque extra −40 %, vida extra −15 %; crítico total del equipo máx. 10 %. Se aplica en `game/data.js` (bloque «Equilibrio»). La vida de los jefes no cambia.
Jefes: vida −10 % y armadura ×0,9 (p. ej. 50 % → 45 %), en el bloque «Equilibrio de jefes» de `game/data.js`.
