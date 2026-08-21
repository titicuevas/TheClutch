# Career System

Estado: flujo general **LOCKED**. Números y calendarios **PROVISIONAL**.

## 1. Máquina de estados

```
Init (seed → jugador + contexto)
  → CareerActive
       ⇄ SeasonLoop (offseason → season → awards → playoffs → aging)
       ⇄ Interrupts (event, contract, draft, injury, trade, retire prompt)
  → Retired
  → Legacy
```

`CareerActive` nunca salta aging: cada vuelta incrementa `age` en 1 y avanza `year`.

## 2. Inicio de carrera

Tres entradas, mismo engine:

| Modo | Player seed | Run seed |
| --- | --- | --- |
| Free | aleatoria o del creador ligero | aleatoria |
| Daily | `theclutch:daily:{YYYY-MM-DD}:{contentVersion}` | propia del intento |
| Challenge | código `BK1-D-YYMMDD` (Daily) o `BK1-X-…` (ficha Free) | propia del intento |

Tras generar:

1. Mostrar carta del jugador (lo visible) **y** la primera decisión de **ruta** (club en casa vs universidad en América). No hace falta un Simular extra: Empezar abre las dos. [D-04](../decisiones/DECISIONS.md). Posición en castellano (`Base`, no `PG`); el kit del creador puede seguir usando las siglas. Todavía no hay club: `Sin circuito`. La UI no finge contrato, sueldo ni rival hasta que hay circuito. **Otra carta** (solo Free) sigue disponible hasta la primera temporada (también con la ruta o el gym abiertos).
2. Offseason de año 1 (gym si toca) y SeasonLoop.

Copy sin marcas NCAA/NBA. Club → `club_academy` en el país del jugador, sueldo 6. Universidad → `college_circuit` en US, sueldo 2 y +4 de draft stock. Ventanas de draft: [§5.1](#51-elegibilidad-provisional-d-05). Si el draft te deja fuera (o se cierra la ventana), sales a `national_league`.

Creador de jugador profundo (sliders de 14 atributos): **fuera de MVP**. Free Career = generación + **identidad ligera** (nombre y apellido opcionales, posición, nacionalidad, mano dominante) y reroll (D-02). Un solo token no hereda el apellido de la seed: queda monónimo. El reroll solo antes de la primera temporada y **conserva** esa identidad (aunque ya esté la ruta en pantalla). La UI Free **no pide seed** y **no exige** rellenar el menú: un toque a Empezar genera la carta y abre la ruta. `?seed=` queda para tests. Daily/Challenge asignan el jugador: sin creador, sin **Otra carta**. Detalle: [DAILY_MODE.md](DAILY_MODE.md) §10.

## 3. Season loop (lo que el usuario vive)

1. **Offseason estructural** — solo si toca: contrato, training focus (1 elección), draft. No inventar un evento de offseason cada año.
2. **Simular temporada** — un botón. El engine avanza la regular season.
3. **¿Corte esporádico?** — a veces un evento o lesión a mitad. El usuario resuelve. La carta del giro enseña la **línea del tramo** (rol, PJ, PTS); el log espera. `SIMULATE_NEXT` reanuda **el resto del año** con el estado nuevo (rol, fatiga, flag de traspaso, etc.).
4. **Resumen de temporada + premios** — la pantalla más importante del año (10–20 s). Abre con la **nota**, el titular, y si tocan: lesión, snub de placa, selección, y la frase de un giro que cambió el resto del año. Luego los cortes **si los hubo** (ruta, gym, mercado: solo ahí, no duplicados encima). Un año quieto no reserva un bloque vacío. El palmarés, el récord del club y la línea van después. Chips de premios aquí, no una gala. Ver §6. La mayoría de años se llega sin haber parado.
5. **Playoffs** si el equipo entra. Marcador + rival de la ronda que cierra ([COMPETITIONS.md](../models/COMPETITIONS.md) §6). FMVP al cerrar en América.
6. **Selección** solo en años de torneo y si hay convocatoria. Knockout nombra un país rival (`formatNationalStintLine`); grupos, snub y declined no. No hay clasificatorias ([COMPETITIONS.md](../models/COMPETITIONS.md) §8).
7. **Aging** — desarrollo/regresión, fatiga a 0, forma se suaviza.
8. ¿Retiro forzado o prompt? Si no, siguiente año.

Comando típico de UI: **Simular temporada** = `SIMULATE_NEXT` hasta el próximo interrupt o fin de temporada. Un solo botón. Si el siguiente paso es un corte estructural (ruta, gym, draft, mercado) o el retiro (`¿Una más?` / `Cerrar carrera`), el botón usa ese título (`upcomingCue`); un giro esporádico no se adelanta. **Ver el año** en el recap **solo** cierra esa pantalla: ves el año en el log, aunque toque retirarse. Si el siguiente toque abre draft, gym, mercado o el retiro, el log **sigue debajo**. Un giro esporádico sí guarda el historial. El prompt de retiro es el siguiente toque (`¿Una más?` / `Cerrar carrera`); no se duplica con **Retirarse**. **Retirarse** no se enseña hasta que puedes usarlo (4 temporadas o retiro forzado) y el CTA no es ya ese prompt.

Un giro a mitad de año que no altera el tramo restante es un bug de diseño: el evento no tenía dientes.

## 4. Contratos y rol

### 4.1 Contrato

```ts
type Contract = {
  teamId: string
  salary: number          // unidades abstractas; ver economía
  years: number
  yearsLeft: number
  expectedRole: Role
  playerOption?: boolean
  teamOption?: boolean
  tradeProtection: "none" | "full"  // ver §4.3
  competitionId: string
}
```

El usuario elige entre **dinero, minutos, prestigio y títulos**. Ninguna oferta debe ganar en las cuatro dimensiones.

En el MVP el mercado estructural enseña **3 ofertas**: quedarme (minutos, sueldo medio, **`tradeProtection: full`**), el max (más dinero, equipo flojo, sin cláusula), anillos (menos rol y sueldo, contention alta, sin cláusula). Con badge `franchise_player`, quedarte paga más y alarga a 4 años; el max no sube. Números: [SIMULATION.md](SIMULATION.md) §12. El sueldo del hint es el que se firma. `hometown_discount` stay también es `full`.

### 4.2 Economía (PROVISIONAL)

No modelar salary cap NBA real. Usar **unidades** enteras (p.ej. 1–100). Lo importante es **comparar ofertas**, no simular la CBA. La UI las pinta como **millones de `$` genérico** (`22` → `$22M`) ([D-16](../decisiones/DECISIONS.md)): no euros en Europa y dólares en América, ni Forex.

Al cerrar el año, el `SeasonRecord` guarda el `salary` cobrado (el del contrato vigente). `careerEarnings` es esa suma menos `player.spent`. La UI lo pinta (carta: sueldo actual; legacy: ganado). **No entra en el Legacy Score**: si el dinero sumara puntos, “siempre el max deal” sería óptimo.

No hay tienda ni inventario. Gastar es un giro raro de lifestyle (`lifestyle_flex`: casa/coche vs seguir liviano), no un menú de cada verano. Staff / gestores **no** se compran ([D-25](../decisiones/DECISIONS.md)).

### 4.3 Traspasos y destino (LOCKED como intención)

El usuario es el **jugador**, no el GM. En la liga americana te pueden mover aunque no quieras. Eso es autenticidad de basket… y un giro de carrera. No es un simulador de office.

**Sí, pueden traspasarte sin tu consentimiento** — con frenos, no al azar cada febrero.

| Circuito | Consentimiento |
| --- | --- |
| `american_league` | El equipo **puede** moverte. Tú no firmas el trade. |
| Europa / continental / nacional | El club no te “cambia por un pick”. Salida = oferta que **tú** aceptas, buyout, o fin de contrato. |

#### Cuándo el club americano te mueve (condiciones, no ruleta)

El engine solo considera un trade involuntario si hay **motivo legible**:

- el equipo tankea / rebuild y tú vales (joven, contrato, o rol de pieza);
- contrato caro + equipo fuera de contención;
- `tradeRequest` pendiente (te mueven, **no** necesariamente al destino soñado);
- choque de estrellas / coachRelation muy baja;
- eres role player en un contender que “encaja otra pieza”.

Nunca: “RNG dijo trade” sin una de esas lecturas.

#### Quién está más protegido

| Situación | Riesgo de trade involuntario |
| --- | --- |
| `tradeProtection: full` (cláusula cara, o rol `franchise`) | Casi 0. Si ocurre, es un evento excepcional (p.ej. tank total). |
| Rol `star` | Muy bajo. Suele ser set piece, no letra pequeña. |
| Starter / sixth man | Bajo, solo con motivo. |
| Rotation / bench / prospect | Más alto: eres pieza. |

`full` es un **trade-off de contrato**: menos salario o menos años a cambio de control. El max deal largo sin protección te convierte en activo. El engine: `full` o rol `star`/`franchise` impiden `traded_involuntary` **salvo** `tradeRequest` (tú lo pediste). El tank total que perfora la cláusula queda fuera de este corte.

#### Cómo se vive (pacing)

Un trade involuntario es **giro**, no una línea del box score.

- Máximo **0–1 por carrera** en la mayoría de runs; **2** ya es historia de journeyman.
- Siempre pantalla propia: “{Old} te traspasa a {New}”. Rol nuevo, contention, ciudad.
- Agencia residual (2 opciones, PROVISIONAL): **Aceptar** vs **Pelear** (quema relación / reputación; suele fallar si no eres star). No un menú de 8 destinos.
- Si corta a mitad de año, **el resto de la temporada es con el equipo nuevo**.
- Pedir traspaso (`tradeRequest`) sigue siendo la vía *tuya*. Puede tardar y salir mal.

Prohibido en MVP: war room, picks, package de 3 equipos, lista de 15 destinos. Un origen, un destino generado, un motivo.

Europa no copia esto. Si un club europeo “te vende”, es un evento de oferta/salida, no un trade NBA.

`go_home` (volver a casa): offseason, **una vez**. Veterano titular+ en `american_league` que no es USA, con lealtad alta o moral baja. Irse = liga nacional, más rol, menos sueldo. Quedarte cierra el giro. Catálogo: [EVENT_SYSTEM.md](EVENT_SYSTEM.md) §8.

Chip de vestuario ([D-23](../decisiones/DECISIONS.md)): `loved` / `ok` / `cold` sale de morale + coach + compañeros. Irse en el mercado (o el descuento de casa) enfría el chip si el club te quería. `go_home` no. Tras un año en el club nuevo puede salir `leaving_home`. A mitad, `home_crowd` (una vez) si el chip está caliente o frío. Compañeros sombra: el engine nombra en giros (`teammate_star_clash`, `vet_minutes`, `locker_ice`, míster); no hay menú de plantilla ([COMPETITIONS.md](../models/COMPETITIONS.md) §4).

Detalle de mercado fino (préstamos, buyout): [D-07](../decisiones/DECISIONS.md). Números de probabilidad: Simulation/Balance.

## 5. Draft

El Draft es un **set piece** de la carrera, no un menú más.

### 5.1 Elegibilidad (PROVISIONAL, [D-05](../decisiones/DECISIONS.md))

Ambos circuitos pueden presentarse al draft americano. Las ventanas no son iguales:

| Ruta | Primera ventana | Última | Si esperas en el techo |
| --- | --- | --- | --- |
| Universidad (`college`) | 1 temporada jugada, edad 19 | 20 | se cierra |
| Club (`club`) | 2 temporadas jugadas, edad 20 | 21 | se cierra |

Universidad = one-and-done ficticio: puedes irte tras el primer año. Club: un año extra en casa contra mayores. Si la ventana pasa sin declararte, sales a `national_league`. No eternizar el limbo.

### 5.2 Proyección

Visible antes de decidir presentarse: `Top 3` · `Lotería` · `Primera ronda` · `Segunda ronda` · `Sin ser elegido`. Ids: `top_3` / `lottery` / `first_round` / `second_round` / `undrafted`. Copy único (`draftBandLabel` en el engine).

La proyección usa scouting **ruidoso** (el potencial real no se revela). Un wait year puede subir o bajar de banda.

### 5.3 Decisión

Presentarse es un comando. Riesgo:

- stock alto: casi siempre se oye el nombre;
- frontera first/second: drama;
- second / undrafted: se puede quedar fuera y volver a Europa / G-League ficticia / otra temporada amateur.

Undrafted no es game over. Es una trayectoria (Journeyman seed natural).

### 5.4 Resolución

Pick + equipo generado. El recap de **ese** año enseña el pick y el club, o “sin ser elegido”. Rangos, sueldo y fallo por banda: [SIMULATION.md](SIMULATION.md) §11. El equipo del draft define los primeros años americanos. No hace falta 30 franquicias reales: un pool ficticio con ratings basta.

## 6. Premios de temporada

Los premios existen porque son **identidad de basket** y alimentan el legacy. No existen para parar al usuario.

### 6.1 Cómo se muestran (LOCKED)

- Se calculan al cierre de la temporada (y Finals MVP al cerrar el playoff).
- Van como **chips** en el resumen: `All-Team 2ª` · `6MOY` · `All-Star`. Una mirada, no una ceremonia. Copy único (`AWARD_LABEL` en el engine): no ids crudos (`AS`, `POTY`).
- **Gala corta** solo si ganas un premio gordo: MVP de liga top, DPOY, FMVP, ROY. Un beat (copy + `moment` si aplica) y seguir.
- Si no ganas nada, **no** listamos a los ganadores fantasma. Silencio.
- Cerca de un gordo (2º–5º en MVP, snub de All-Team con stats de star): **una línea** en el recap. `awardSnubLine` pinta (`El MVP se fue a otro.` / `Los números estaban. Las placas no.` / `Jugador del año se fue a otro.`); la UI no reescribe. Puede alimentar un evento esporádico (`award_snub`) en offseason, no un popup extra el mismo cierre si ya hubo giro. El giro lee `awardSnub`, no inventa el pool.

All-Star: flag/premio en el recap, **sin** weekend jugable ([D-09](../decisiones/DECISIONS.md)).

### 6.2 Qué premios existen, por circuito

No todas las ligas copian el set americano. Un “MVP ×14” de liga menor no puede parecerse a un MVP de `american_league`.

| Circuito | Set (PROVISIONAL) | Peso en legacy |
| --- | --- | --- |
| formación (`club_academy` / `college_circuit`) | POTY (Jugador del año), All-Circuit | bajo (~90 / ~40); más draft stock que placa |
| national | MVP, All-Team 1/2/3 | medio (`legacyWeight` de la liga) |
| continental | `CMVP`, `CFMVP` (All-Team es el de la liga nacional) | alto; paralelo al club nacional, no un segundo equipo |
| american_league | MVP, DPOY, 6MOY, ROY, MIP, All-Team 1/2/3, All-Defense 1/2, All-Rookie 1/2, FMVP, All-Star flag | el techo |

ROY / All-Rookie = **primera temporada en `american_league`**, no el año 1 de academia. Un one-and-done puede ser ROY a los 19 con `experience > 0`. All-Rookie sale en 1ª/2ª; el ROY arrastra al equipo. Fórmulas: [SIMULATION.md](SIMULATION.md) §8.

En la carta de retiro se **agrupan**: `MVP x2` · `DPOY` · `All-Team 1ª x2` · `All-Star x8`. No 40 líneas. `formatAwardLine` pinta; la UI no traduce ids.

### 6.3 Quién gana (intención)

El usuario compite contra un **campo fantasma** (nombres + ratings de esa temporada). Ver [SIMULATION.md](SIMULATION.md) §8.

Un premio debe sentirse **merecido**: stats + rol + éxito de equipo + posición. Un sexto hombre no gana el MVP. Un tank con 32 PPG puede pelearlo y perder contra un star de contender: esa tensión es buena y alimenta snubs.

### 6.4 Nota del año (PROVISIONAL)

Al cerrar, el engine da una **nota 12–99** y una letra `S | A | B | C | D`. No es el Legacy Score (eso es al retirar). Sale de stats, playoffs, premios, lesión y selección. La UI la pinta; no la calcula. Fórmula: [SIMULATION.md](SIMULATION.md) §8.4.

Las decisiones de **ese** año (gym, giro, draft, contrato, destino) van como chips: título + opción elegida. Un año sin cortes lo dice en una línea. El prompt de retiro no entra en esa lista: llega después del recap.

Lesión: la UI pinta tipo + gravedad en castellano y PJ fuera (`Rodilla seria · 12 PJ fuera`). El engine sigue guardando ids (`knee` / `moderate`). Si esa temporada desbloqueó badges, van en el recap (`SeasonRecord.newBadges`); la UI solo pone labels. Selección: `formatNationalStintLine` (torneo + país + convocatoria/capitán + resultado; knockout `ante` el rival). La UI pinta; no arma la frase.

## 7. Entrenamiento

MVP: **una** elección de focus por offseason, no minijuego. Ritmo (PROVISIONAL, GAME_DESIGN §9): año 1 y años impares mientras edad ≤ 27. No cada verano: si no, la carrera se vuelve un cuestionario.

Ejemplos: Shooting, Defense, Playmaking, Body.

Efecto: nudge a 1–2 atributos + posible fatiga si Body. Work ethic multiplica. No sustituye a los minutos reales como motor de crecimiento. No hay asignación de puntos al crear.

## 8. Retiro

Puede ser:

- **Prompt** tras el recap (después de ver el año en el log), a partir de edad / overall / lesiones / rol (el usuario elige una temporada más o colgarlas). Umbrales PROVISIONALES: oferta desde 36, o 32+ con OVR bajo, o 33+ tras lesión moderate.
- **Forzado** si OVR cae bajo un suelo tardío, o edad máxima (**PROVISIONAL** 40). El umbral blando no retira solo: abre el prompt.

Una temporada más con overall 68 en un club menor es válido y puede sumar o restar legacy (longevidad vs water-down de averages: la fórmula no debe castigar brutalmente un goodbye year). El prompt no simula el año siguiente: vuelve al offseason. No se vuelve a abrir en el mismo año si eliges una más.

## 9. Legacy

Al retirar, el engine produce un `LegacyReport` serializable y **compartible** (imagen/texto).

### 9.1 Contenido de la carta

- Nombre, posición, nacionalidad
- Temporadas, peak OVR, earnings (unidades, no puntúa)
- PPG, APG, RPG, TAP de carrera
- Títulos por competición (conteos). Ids en inglés (`League`, `Continental`); copy `Liga x3` / `Continental x2` o `Sin títulos`. `formatTitleLine` pinta; la UI no traduce. No listar año a año.
- Premios clave (no la lista de 40 All-Star si satura; agrupar)
- Selección (oros, caps). El report expone `caps` / `golds` / `silvers` / `bronzes`. Copy: `Selección · N cap(s) · Oro ×n` o `Sin selección`. La UI pinta; no cuenta.
- 0–3 momentos (`undrafted_mvp`, `olympic_gold`, `world_gold`, `one_club`, `late_bloomer`). Se derivan al retirar; no se persisten. Tope 3.
- Legacy Score + **banda** (`Leyenda local` / `Estrella nacional` / `Continental` / `Histórico`). Percentil solo si hay población (Daily).

### 9.2 Legacy Score (intención LOCKED, pesos PROVISIONAL)

Componentes:

1. Pico (peak OVR, mejor temporada)
2. Volumen (partidos, temporadas como starter+)
3. Acumulados ponderados por `legacyWeight` de competición
4. Títulos (anillo de liga top > copa nacional)
5. Premios (MVP de liga top > DPOY/FMVP > All-Team; los de liga débil pesan poco)
6. Internacional (oro olímpico / mundial)
7. Narrativa (`moments`: undrafted → mvp, oro olímpico, oro mundial, un club, late bloomer). Cada uno +180. Fórmula: [SIMULATION.md](SIMULATION.md) §8.5.

No es un high score de PPG en liga débil. `legacyWeight` existe precisamente para eso. Primer corte: [SIMULATION.md](SIMULATION.md) §8.5.

Percentiles: solo tienen sentido con población (Daily/semanal). En Free, la carta enseña la **banda**, no un top 4% inventado. Cortes: [SIMULATION.md](SIMULATION.md) §8.5. Ids: `local_legend` / `national_star` / `continental` / `all_time`. Copy: Leyenda local, Estrella nacional, Continental, Histórico. All-Time no es el default.

### 9.3 Compartir

La carta debe caber en un screenshot de móvil. **Banda y score arriba**; datos grandes, poco chrome. Los clubs van como escudos, no como el log de etapas (eso vive en la carrera). **Copiar ficha** pega el texto de `formatLegacyCard` (el engine pinta; la UI no reescribe): `Base · España`, no `PG · ES`; `Pico OVR`, no `Peak OVR`; badges con copy (`Tirador`), no ids. El pie lleva `Daily YYYY-MM-DD · BK1-D-…` o `Challenge BK1-X-…`.

## 10. Historial

Cada temporada se appenda un `SeasonRecord`:

- año, edad, equipo, liga, rol, OVR, salary cobrado
- stats
- títulos y premios de ese año
- lesiones
- evento principal (id)

La UI agrupa **etapas de club** en un log **cronológico** (T1 arriba): club, rango, promedios PTS/AST/REB/TAP y palmarés van en la cabecera de la etapa; debajo, cada temporada (rol, OVR, línea y chips). Un año a mitad queda al final de la etapa en curso. Tras el recap, el último año queda marcado y a la vista; no se invierte el orden. No dos listas ni el más reciente primero. No un menú de franquicia.

Eso alimenta la pantalla de retiro y, más adelante, un "career log" opcional. No es UI del MVP más allá del resumen anual y el legacy.
