# Decisions

Inventario de contradicciones, lagunas y decisiones. Nada de esto debe implementarse como si estuviera cerrado.

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

→ **LOCKED** en [SIMULATION.md](SIMULATION.md): la UI vive en la **temporada**. El partido es interno. Un evento puede cortar a mitad; el resto del año se reanuda.

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

→ Incluidos como traits en [PLAYER_MODEL.md](PLAYER_MODEL.md). No duplicar en UI.

### A-8. Competiciones reales nombradas vs "sin licencias"

El brief pide estar preparado para NBA/EuroLeague/NCAA/EuroBasket y a la vez equipos ficticios.

→ Tiers genéricos en código. Copy sin marcas. [COMPETITIONS.md](COMPETITIONS.md).

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

**OPEN**

Opciones: TheClutch, BUZZER, otro.

Hasta cerrar: repo `TheClutch`, UI puede usar un placeholder. No renombrar packages dos veces.

### D-02 Alcance del creador de jugador en Free

**PROVISIONAL: solo generación + reroll**

Opciones: reroll / nombre+país manual / sliders.

### D-03 Granularidad visible de la temporada

**PROVISIONAL → recomendación reforzada: 1 “Simular temporada” + cortes solo si hay giro**

La UI no muestra chunks. El engine puede chequear 1–2 veces por dentro (lesión/evento). Playoffs sí se ven por rondas, breves.

Cerrado en diseño: temporada = flujo; eventos = esporádicos con dientes. Ver [GAME_DESIGN.md](GAME_DESIGN.md) §5.1.

### D-04 Punto de arranque de la carrera

**OPEN** (recomendación: 17–19 años, primera decisión Europa-like vs college-like)

Afecta draft eligibility, altura del tutorial y duración.

### D-05 Reglas de Draft eligibility

**OPEN**

Edad mínima, años de college, one-and-done ficticio, si Europa puede declararse igual.

### D-06 runSeed compartido en Challenge

**PROVISIONAL: NO compartir** (mismo jugador, distinta suerte)

Opción B: "lock luck" para puzzles de skill pura. Se puede añadir después como flag `?luck=shared` sin romper el default.

### D-07 Mercado Europa vs trades americanos

**Cerrado en intención:** ver [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §4.3.

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

**PROVISIONAL: Next.js en Railway + Postgres + ORM ligero (Drizzle o Prisma)**

Elegir ORM en Fase 3, no ahora. El engine no depende de ello.

### D-15 Métrica del ranking semanal

**PROVISIONAL: suma de dailies oficiales de la semana ISO**

### D-16 Moneda / salarios

**PROVISIONAL: unidades abstractas mostradas como "$" genérico o "★"**

Evitar €/USD reales y CBA.

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

**LOCKED: sí, en `american_league`, con frenos.** Eres el jugador, no el GM; perder control a veces es el fantasy. Sin frenos (protección, rareza, pantalla propia) se rompe la agencia. Detalle: [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §4.3.

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

---

## D. Cómo añadir una decisión

1. Nueva fila `D-XX` aquí, estado OPEN o PROVISIONAL.
2. Referenciarla desde el doc de diseño afectado.
3. Al cerrar: mover el resultado a la sección C o al doc canónico con marca LOCKED.
