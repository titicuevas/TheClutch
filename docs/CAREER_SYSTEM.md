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
| Daily | `daily:{YYYY-MM-DD}` | ver [DAILY_MODE.md](DAILY_MODE.md) |
| Challenge | código `BK-…` | propia del intento |

Tras generar:

1. Mostrar carta del jugador (lo visible).
2. Primera decisión de **ruta** si aplica (Europa vs NCAA / academia). [D-04](DECISIONS.md).
3. Entrar en SeasonLoop.

Creador de jugador profundo (sliders de 14 atributos): **fuera de MVP**. Free Career = generación. Un "reroll" en Free es aceptable; en Daily no.

## 3. Season loop (lo que el usuario vive)

1. **Offseason estructural** — solo si toca: contrato, training focus (1 elección), draft. No inventar un evento de offseason cada año.
2. **Simular temporada** — un botón. El engine avanza la regular season.
3. **¿Corte esporádico?** — a veces un evento o lesión a mitad. El usuario resuelve. `SIMULATE_NEXT` reanuda **el resto del año** con el estado nuevo (rol, fatiga, flag de traspaso, etc.).
4. **Resumen de temporada + premios** — la pantalla más importante del año (10–20 s). Chips de premios aquí, no una gala. Ver §6. La mayoría de años se llega sin haber parado.
5. **Playoffs** si el equipo entra (rondas rápidas; Finals un poco más de ceremonia; FMVP al cerrar).
6. **Selección** solo en años de torneo y si hay convocatoria ([COMPETITIONS.md](COMPETITIONS.md)).
7. **Aging** — desarrollo/regresión, fatiga a 0, forma se suaviza.
8. ¿Retiro forzado o prompt? Si no, siguiente año.

Comando típico de UI: **Simular temporada** = `SIMULATE_NEXT` hasta el próximo interrupt o fin de temporada. Lo normal es no haber interrupt.

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

### 4.2 Economía (PROVISIONAL)

No modelar salary cap NBA real. Usar **unidades** enteras (p.ej. 1–100 de "wage units" o una escala 0.5–50.0 M abstracta). Lo importante es **comparar ofertas**, no simular la CBA.

Legacy usa `careerEarnings` sumando salarios (y bonus de efectos).

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

`full` es un **trade-off de contrato**: menos salario o menos años a cambio de control. El max deal largo sin protección te convierte en activo.

#### Cómo se vive (pacing)

Un trade involuntario es **giro**, no una línea del box score.

- Máximo **0–1 por carrera** en la mayoría de runs; **2** ya es historia de journeyman.
- Siempre pantalla propia: “{Old} te traspasa a {New}”. Rol nuevo, contention, ciudad.
- Agencia residual (2 opciones, PROVISIONAL): **Aceptar** vs **Pelear** (quema relación / reputación; suele fallar si no eres star). No un menú de 8 destinos.
- Si corta a mitad de año, **el resto de la temporada es con el equipo nuevo**.
- Pedir traspaso (`tradeRequest`) sigue siendo la vía *tuya*. Puede tardar y salir mal.

Prohibido en MVP: war room, picks, package de 3 equipos, lista de 15 destinos. Un origen, un destino generado, un motivo.

Europa no copia esto. Si un club europeo “te vende”, es un evento de oferta/salida, no un trade NBA.

Detalle de mercado fino (préstamos, buyout): [D-07](DECISIONS.md). Números de probabilidad: Simulation/Balance.

## 5. Draft

El Draft es un **set piece** de la carrera, no un menú más.

### 5.1 Elegibilidad (PROVISIONAL)

- Edad mínima 18 (o 19 si se cierra NCAA-like). **OPEN** [D-05](DECISIONS.md).
- Máximo de años en "eligibilidad" para no eternizar el limbo.

### 5.2 Proyección

Visible antes de decidir presentarse:

`Top 3 | Lottery | First Round | Second Round | Undrafted`

La proyección usa scouting **ruidoso** (el potencial real no se revela). Un wait year puede subir o bajar de banda.

### 5.3 Decisión

Presentarse es un comando. Riesgo:

- stock alto: casi siempre se oye el nombre;
- frontera first/second: drama;
- second / undrafted: se puede quedar fuera y volver a Europa / G-League ficticia / otra temporada amateur.

Undrafted no es game over. Es una trayectoria (Journeyman seed natural).

### 5.4 Resolución

Pick 1–N + equipo generado. El equipo del draft define los primeros años americanos. No hace falta 30 franquicias reales: un pool ficticio con ratings basta.

## 6. Premios de temporada

Los premios existen porque son **identidad de basket** y alimentan el legacy. No existen para parar al usuario.

### 6.1 Cómo se muestran (LOCKED)

- Se calculan al cierre de la temporada (y Finals MVP al cerrar el playoff).
- Van como **chips** en el resumen: `All-Team 2nd` · `6MOY`. Una mirada, no una ceremonia.
- **Gala corta** solo si ganas un premio gordo: MVP de liga top, DPOY, FMVP, ROY. Un beat (copy + `moment` si aplica) y seguir.
- Si no ganas nada, **no** listamos a los ganadores fantasma. Silencio.
- Cerca de un gordo (2º–5º en MVP, snub de All-Team con stats de star): **una línea** en el recap. Puede alimentar un evento esporádico (`award_snub`) en offseason, no un popup extra el mismo cierre si ya hubo giro.

All-Star: flag/premio en el recap, **sin** weekend jugable ([D-09](DECISIONS.md)).

### 6.2 Qué premios existen, por circuito

No todas las ligas copian el set americano. Un “MVP ×14” de liga menor no puede parecerse a un MVP de `american_league`.

| Circuito | Set (PROVISIONAL) | Peso en legacy |
| --- | --- | --- |
| college | Player of the Year, All-Circuit | bajo; más draft stock que placa |
| national | MVP, All-Team | medio (`legacyWeight` de la liga) |
| continental | MVP, Finals MVP, All-Team | alto |
| american_league | MVP, DPOY, 6MOY, ROY, MIP, All-Team 1/2/3, All-Defense, All-Rookie, FMVP, All-Star flag | el techo |

En la carta de retiro se **agrupan**: `AL MVP x2` · `DPOY x1` · `All-Team x6`. No 40 líneas.

### 6.3 Quién gana (intención)

El usuario compite contra un **campo fantasma** (nombres + ratings de esa temporada). Ver [SIMULATION.md](SIMULATION.md) §8.

Un premio debe sentirse **merecido**: stats + rol + éxito de equipo + posición. Un sexto hombre no gana el MVP. Un tank con 32 PPG puede pelearlo y perder contra un star de contender: esa tensión es buena y alimenta snubs.

## 7. Entrenamiento

MVP: **una** elección de focus por offseason, no minijuego.

Ejemplos: Shooting, Defense, Playmaking, Body, Recovery.

Efecto: nudge a 1–2 atributos + posible fatiga/lesión si Body excesivo con durability baja. Work ethic multiplica. No sustituye a los minutos reales como motor de crecimiento.

## 8. Retiro

Puede ser:

- **Prompt** a partir de edad / overall / lesiones / rol (el usuario elige una temporada más);
- **Forzado** si OVR o salud caen bajo un umbral, o edad máxima (**PROVISIONAL** 41).

Una temporada más con overall 68 en un club menor es válido y puede sumar o restar legacy (longevidad vs water-down de averages: la fórmula no debe castigar brutalmente un goodbye year).

## 9. Legacy

Al retirar, el engine produce un `LegacyReport` serializable y **compartible** (imagen/texto).

### 9.1 Contenido de la carta

- Nombre, posición, nacionalidad
- Temporadas, peak OVR
- PPG, APG, RPG de carrera (y quizás un cuarto stat de firma)
- Títulos por competición (conteos)
- Premios clave (no la lista de 40 All-Star si satura; agrupar)
- Selección (oros, caps)
- 0–3 momentos
- Legacy Score + percentil si hay población (Daily) o vs tabla de bands si Free

### 9.2 Legacy Score (intención LOCKED, pesos PROVISIONAL)

Componentes:

1. Pico (peak OVR, mejor temporada)
2. Volumen (partidos, temporadas como starter+)
3. Acumulados ponderados por `legacyWeight` de competición
4. Títulos (anillo de liga top > copa nacional)
5. Premios (MVP de liga top > DPOY/FMVP > All-Team; los de liga débil pesan poco)
6. Internacional (oro olímpico / mundial)
7. Narrativa (`moments`: undrafted → mvp, one club, late bloomer)

No es un high score de PPG en liga débil. `legacyWeight` existe precisamente para eso.

Percentiles: solo tienen sentido con población (Daily/semanal). En Free, mostrar bands: `Local Legend / National Star / Continental / All-Time` o similar, no un top 4% inventado.

### 9.3 Compartir

La carta debe caber en un screenshot de móvil. Datos grandes, poco chrome. El Challenge code / Daily date en el pie.

## 10. Historial

Cada temporada se appenda un `SeasonRecord`:

- año, edad, equipo, liga, rol, OVR
- stats
- títulos y premios de ese año
- lesiones
- evento principal (id)

Eso alimenta la pantalla de retiro y, más adelante, un "career log" opcional. No es UI del MVP más allá del resumen anual y el legacy.
