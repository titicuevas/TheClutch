# Decisions

Inventario de contradicciones, lagunas y decisiones. **No es dueño de reglas**: el detalle vive en `rules/` y `models/`. Aquí solo el estado OPEN / PROVISIONAL / LOCKED y un enlace.

Nada de esto debe implementarse como si estuviera cerrado.

Leyenda: **OPEN** = hay que decidir. **PROVISIONAL** = el Lead recomienda X hasta que se confirme.

Proceso: proponer → justificar → actualizar docs → implementar.

---

## A. Problemas y contradicciones de la especificación inicial

### A-1. Dos nombres de producto

El repo y el brief usan **TheClutch**. La visión habla de **BUZZER**.

No son el mismo nombre. Mezclarlos en UI y en código genera deuda.

→ [D-01](#d-01-nombre-de-producto)

### A-2. "Crear jugador" vs Daily "recibes un jugador"

El loop empieza en "Crear jugador", pero Daily y Challenge **asignan** el jugador. Un creador profundo choca con "mismo jugador para todos" y con 10–20 minutos.

→ Recomendación: Free = generación (reroll). Creador profundo post-MVP. Daily/Challenge = asignación.

### A-3. Carrera "completa" en 10–20 minutos vs simular partidos

`simulateGame()` + 18 temporadas × 60 partidos es incompatible con el pacing si cada partido es una pantalla.

→ **LOCKED** en [SIMULATION.md](../rules/SIMULATION.md): la UI vive en la **temporada**. El partido es interno. Un evento puede cortar a mitad; el resto del año se reanuda.

### A-4. Simulación rica (compañeros, coach, liga) vs motor rápido

Simular plantillas completas y todas las ligas impide batches de balance y el target de tiempo.

→ Mundo **player-centric**. Shadow teammates. Liga abstracta.

### A-5. Potencial oculto vs Draft stock informado

El draft necesita información. El potencial no debe verse como número.

→ Scouting con **bandas** y ruido, no el entero real.

### A-6. "Todos el mismo inicio" vs "ranking de skill"

Si `playerSeed` también fija toda la suerte, mismas decisiones = misma carrera y el ranking es un puzzle. Si no la fija, el ranking tiene varianza.

→ Dos seeds. Ver [D-06](#d-06-runseed-compartido-en-challenge).

### A-7. Personalidad vs work ethic

El brief lista ambos. Work ethic puede ser un trait derivado de `professionalism`.

→ Incluidos como traits en [PLAYER_MODEL.md](../models/PLAYER_MODEL.md). No duplicar en UI.

### A-8. Competiciones reales nombradas vs "sin licencias"

El brief pide estar preparado para NBA/EuroLeague/NCAA/EuroBasket y a la vez equipos ficticios.

→ Tiers genéricos en código. Copy sin marcas. [COMPETITIONS.md](../models/COMPETITIONS.md).

### A-9. `simulatePeriod()` no está definido

¿Cuarto, mes, chunk, era de edad?

→ En docs, **chunk** de temporada. Evitar el nombre `period` en código.

### A-10. Premios y All-Team requieren rivalidad

Sin otros jugadores reales no hay MVP "justo".

→ Candidatos fantasma generados. Suficiente para MVP.

### A-11. Auth vs "fácil de empezar"

Ranking oficial necesita identidad. El loop pide cero fricción.

→ Jugar Free como invitado. Cuenta para **submit** Daily. [D-12](#d-12-autenticación).

### A-12. Edad de inicio y ruta NCAA/Europa

"Primeros años" no concreta si el juego empieza a los 16 en academia, 18 en college, o ya profesional.

→ [D-04](#d-04-punto-de-arranque-de-la-carrera).

---

## B. Decisiones pendientes

### D-01 Nombre de producto

**LOCKED: TheClutch**

El nombre del repositorio y del producto público es **TheClutch**. La alpha ya tiene identidad visual, dominio, metadatos y códigos compartibles bajo este nombre; cambiarlo ahora fragmentaría reconocimiento y SEO sin mejorar el loop. `BUZZER` queda descartado. Los identificadores internos no necesitan repetir la marca.

### D-02 Alcance del creador de jugador en Free

**PROVISIONAL: generación + identidad ligera (nombre opcional, posición, nacionalidad, mano) + reroll. Sin sliders.**

Free: el usuario puede fijar un nombre, `PG | SG | SF | PF | C`, país y mano dominante antes de generar. Arquetipo, atributos y potencial salen de la seed. Si no hay nombre, sale del pool de la nacionalidad. El reroll **conserva** esa identidad. Daily/Challenge **ignoran** esas elecciones: el jugador viene asignado.

Un campo de nombre no es el creador profundo. Los 14 sliders siguen **fuera de MVP**. Ver [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md) §2.

### D-03 Granularidad visible de la temporada

**PROVISIONAL → recomendación reforzada: 1 “Simular temporada” + cortes solo si hay giro**

La UI no muestra chunks. El engine puede chequear 1–2 veces por dentro (lesión/evento). Playoffs sí se ven por rondas, breves.

Cerrado en diseño: temporada = flujo; eventos = esporádicos con dientes. Ver [GAME_DESIGN.md](../rules/GAME_DESIGN.md) §5.1.

### D-04 Punto de arranque de la carrera

**PROVISIONAL: 18 años. Primera decisión: club en casa vs universidad en América.**

No NCAA como marca. Universidad: más stock y puede irse a los 19. Club: sueldo y un año más antes del draft. Detalle: [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md) §2 y [D-05](#d-05-reglas-de-draft-eligibility).

### D-05 Reglas de Draft eligibility

**PROVISIONAL: ambos circuitos pueden declararse. Las ventanas no son iguales.**

| Ruta | Primera ventana | Última | Esperar cierra |
| --- | --- | --- | --- |
| Universidad | 1 temporada, edad 19 (one-and-done) | 20 | sí, a los 20 |
| Club | 2 temporadas, edad 20 | 21 | sí, a los 21 |

Europa no está vetada del draft americano. El coste es el año extra en casa. Sin marcas NCAA. Detalle: [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md) §5.1.

### D-06 runSeed compartido en Challenge

**PROVISIONAL: NO compartir** (mismo jugador, distinta suerte)

Opción B: "lock luck" para puzzles de skill pura. Se puede añadir después como flag `?luck=shared` sin romper el default.

### D-07 Mercado Europa vs trades americanos

**Cerrado en intención:** ver [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md) §4.3.

- América: trade involuntario posible, raro, siempre visible, con motivo.
- Europa: el jugador consiente la salida.
- MVP: un origen → un destino. Sin picks ni war room.

Sigue **PROVISIONAL** el calendario exacto (deadline a mitad vs solo offseason). Recomendación: **puede cortar a mitad de año** (más drama, el resto de la temporada cambia de camiseta).

### D-08 Posición secundaria y cambios de posición

**PROVISIONAL: una sola posición en MVP**

Evento "cambiar de posición" post-MVP.

### D-09 All-Star como set piece

**PROVISIONAL reforzado: premio/flag en el recap, no minijuego**

Un All-Star weekend completo rompe el pacing. El chip `AS` basta.

### D-10 Calendario internacional anclado a qué

**PROVISIONAL: año de la run módulo 4** (ciclo olímpico ficticio), no el calendario real.

Daily no depende de si en la vida real hay Mundial ese año.

### D-11 ¿Abandonar Daily consume el intento?

**PROVISIONAL: se consume al primer `SIMULATE_NEXT`**

### D-12 Autenticación

**OPEN**

Candidatos: Clerk, Auth.js + Google/Apple, magic link. Railway-friendly. Necesaria en Fase 4, no en Fase 1.

### D-13 Idioma del producto

**OPEN**

El equipo trabaja en español. ¿Game en ES, EN, ambos? El esquema de eventos debe prever `LocalizedText` ya.

Recomendación: UI ES primero si el playtest es local; keys en inglés en código (`unhappy_minutes`).

### D-14 Hosting y ORM

**PROVISIONAL: Next.js + Postgres en Railway. Cliente SQL ligero para pre-alpha; ORM al entrar CRUD relacional de runs/auth.**

Telemetría y feedback usan SQL mínimo encapsulado fuera del engine; introducir Drizzle/Prisma solo para dos inserts y agregados añade más superficie que valor. Al entrar `career_runs`, auth y ranking se reevalúa un ORM. El engine no depende de ello.

### D-15 Métrica del ranking semanal

**PROVISIONAL: suma de dailies oficiales de la semana ISO**

### D-16 Moneda / salarios

**PROVISIONAL: unidades abstractas pintadas como millones de `$` genérico** (`22` → `$22M`)

Evitar €/USD reales, Forex y CBA. El número sirve para comparar ofertas (`$22M` vs `$14M`), no para simular nóminas. El circuito no cambia de símbolo. Copy: `formatWage` en el engine.

### D-17 Umbral de percentil mínimo

**PROVISIONAL: no mostrar "Top 4%" si n < 50 runs oficiales ese día**

### D-18 Guardado cloud en Free Career

**PROVISIONAL: localStorage/IndexedDB en MVP app; cloud al tener auth**

Una carrera dura 15 min; perderla al cerrar el móvil duele. Checkpoint por temporada.

### D-19 Contenido de nombres

**OPEN**

¿Listas de nombres por nacionalidad en git? Sí para MVP. Calidad > cantidad (8–10 países).

### D-20 Motor de overall: ¿100 escala 2K o 40–99?

**PROVISIONAL: 40–99 enteros, overall derivado visible**

### D-21 Traspaso involuntario: ¿existe?

**LOCKED: sí, en `american_league`, con frenos.** Eres el jugador, no el GM; perder control a veces es el fantasy. Sin frenos (protección, rareza, pantalla propia) se rompe la agencia. Detalle: [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md) §4.3.

### D-22 Rival de carrera

**PROVISIONAL: un sombra, no una segunda simulación.**

Misma posición, otro club, línea anual. Eventos `rivalry` raros. Copero: se siente que hay alguien al otro lado, no un modo mánager.

### D-23 Fama / amor del club

**PROVISIONAL: chip derivado de morale + coach + vestuario.** No barra de progreso. Firmar fuera (mercado / descuento de casa) enfría el chip si el club te quería. `go_home` no: volver a casa se siente bien. Giro offseason `leaving_home` (una vez): 3+ años en un club (no formación) y uno en otro. Cerrar el capítulo (vestuario nuevo) vs no olvidar (lealtad, chip más frío). A mitad, si el chip está `loved` o `cold`, puede salir `home_crowd` (una vez): comerte la grada vs no inflarte, o ganar los pitos vs pedir el cambio.

### D-24 Salud mental

**PROVISIONAL: vive en `morale` (+ fatiga), no en una tercera barra.** Evento raro `lifestyle_pressure`: titular (o más) con la cabeza abajo. Bajar revoluciones recorta minutos del resto del año; seguir a tope deja el uso y el desgaste. Copy de carrera, no clínico.

### D-25 Tienda / gastar salario

**PROVISIONAL: no hay tienda. Gastar es un giro raro de lifestyle, no un menú.**

Una tienda de entrenador, psicólogo, casas o coches por temporada es modo mánager: para cada verano, rompe Copero, duplica el gym (`training` / `work_summer`) y obliga a una segunda CTA.

Si el dinero se nota: evento `lifestyle_flex` (una vez). Casa/coche vs quedarte liviano. Efecto `spent` + ego/moral/fatiga. Dura esa decisión, se agota. **Sin inventario. Sin wallet. Sin staff.** El max deal no es “para comprar el entrenador”. Mobile: la misma carta de decisión (44px, una CTA).

---

## C. Decisiones ya tomadas (arquitectura)

Estas son **LOCKED** salvo proceso de 4 pasos:

| ID | Decisión |
| --- | --- |
| L-01 | Engine TS puro, isomorfo, API `createCareer` / `dispatch` / `getViewModel` |
| L-02 | Docs > código |
| L-03 | Eventos estructurados, sin LLM en runtime |
| L-04 | Mundo ficticio, player-centric |
| L-05 | Temporada como unidad de UI |
| L-06 | Daily: mismo `playerSeed`; replay servidor del log |
| L-07 | Primer intento Daily oficial |
| L-08 | No modos temáticos en MVP |
| L-09 | Mobile-first web, no Unity |
| L-10 | Posiciones PG SG SF PF C; roles prospect→franchise |
| L-11 | Monorepo `packages/engine` + `packages/content` + `apps/web` |
| L-12 | Temporada = flujo; eventos = giros esporádicos |
| L-13 | Trade involuntario posible en american_league, raro y visible |
| L-14 | Premios en el recap; gala solo si gordo (MVP/DPOY/FMVP/ROY) |
| L-15 | KISS/DRY: un concepto, un dueño; nada por si acaso |
| L-16 | Docs en architecture / models / rules / roadmap / agents / decisiones |

---

## D. Cómo añadir una decisión

1. Nueva fila `D-XX` aquí, estado OPEN o PROVISIONAL.
2. Referenciarla desde el doc de diseño afectado.
3. Al cerrar: mover el resultado a la sección C o al doc canónico con marca LOCKED.
