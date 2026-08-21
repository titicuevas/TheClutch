# Player Model

Estado: **PROVISIONAL** en números. La separación visible/oculto y las posiciones son **LOCKED**.

## 1. Identidad

| Campo | Visible | Notas |
| --- | --- | --- |
| `id` | no | uuid interno de la run |
| `firstName`, `lastName` | sí | seed + nacionalidad, o nombre del creador ligero (D-02, solo Free) |
| `nationality` | sí | código interno; la UI pinta el país (`España`, no `ES`) |
| `age` | sí | entero, avanza 1 por temporada |
| `heightCm` | sí | generado por posición + ruido |
| `position` | sí | `PG \| SG \| SF \| PF \| C` |
| `handed` | sí | `left \| right`. Creador ligero (D-02). Zurdo: sesgo chico a finishing/handle |
| `secondaryPosition` | opcional | **OPEN** [D-08](../decisiones/DECISIONS.md) |
| `archetype` | sí | ver §4 |

## 2. Ratings de alto nivel

| Campo | Visible | Rango | Notas |
| --- | --- | --- | --- |
| `overall` | sí | 40–99 | derivado, nunca escrito a mano |
| `potential` | no / parcial | 50–99 | oculto; scouting da banda |
| `peakOverall` | historial | — | para legacy |
| `experience` | no | 0+ temporadas | |

`overall` se calcula con pesos por **posición y arquetipo**, no como media simple. Un Rim Protector no gana OVR tirando triples.

Fórmula exacta: **OPEN** para números, **LOCKED** como principio. La implementa Simulation/Balance y se documenta en [SIMULATION.md](../rules/SIMULATION.md) cuando se cierre.

## 3. Atributos

Escala interna: **40–99** (PROVISIONAL). Enteros.

### 3.1 Ofensivos

- `finishing`
- `midRange`
- `threePoint`
- `freeThrow`
- `passing`
- `ballHandling`

### 3.2 Defensivos / físicos / mentales

- `perimeterDefense`
- `interiorDefense`
- `rebounding`
- `speed`
- `strength`
- `stamina`
- `basketballIQ`
- `clutch`

No todos se muestran. UI de MVP: overall + 4–6 atributos signature del arquetipo, **labels en castellano** (`Finalización`, no `finishing`). El resto existe para la sim.

Añadir un atributo nuevo es cambio de modelo: docs → tipos → fórmulas → tests. No añadir atributos "por si acaso" en el MVP.

## 4. Arquetipos (LOCKED lista inicial)

| Id | Posiciones típicas | Firma |
| --- | --- | --- |
| `sharpshooter` | SG, SF, PG | tiro, spacing |
| `playmaker` | PG, SG | pase, IQ, handle |
| `slasher` | PG, SG, SF | finishing, speed |
| `two_way` | cualquiera | equilibrio, defensa decente |
| `defensive_specialist` | cualquiera | defensa, menor uso ofensivo |
| `stretch_big` | PF, C | triple + rebote |
| `rim_protector` | C, PF | interior D, tapones |
| `inside_scorer` | PF, C | finishing, fuerza |
| `all_around` | SF, PF, PG | sin agujero grave, sin pico extremo |

La UI pinta el arquetipo en castellano (`Tirador`, no `Sharpshooter`). Los ids no cambian.

Efectos (LOCKED como intenciones):

- atributos iniciales;
- techos de crecimiento por atributo;
- multiplicadores de stats (un playmaker produce más AST que un slasher con el mismo OVR);
- pool de badges disponibles;
- sabor de eventos (un defensive specialist no recibe el mismo evento de "hot hand" que un microwave scorer, o lo recibe con distinta prioridad).

## 5. Badges

No se compran. Se desbloquean por rendimiento y contexto. Influyen en la simulación.

Lista inicial corta (PROVISIONAL; expandible):

| Id | Idea de umbral | Efecto (intención) |
| --- | --- | --- |
| `clutch` | alto rendimiento en playoffs / últimos partidos | boost en series y momentos de alta presión |
| `sharpshooter` | volumen y % de triple sostenidos | más 3PA y mejor 3P% |
| `floor_general` | AST altos + bajo TOV + rol de creación | más AST, menos TOV, boost a rating de equipo |
| `lockdown` | STL/def rating, minutos defensivos | más STL, peor rival en perímetro (abstracto) |
| `microwave` | racha de scoring desde el banco | más PTS en rol Sixth Man |
| `rim_protector` | BLK + interior D | más BLK, menor FG% rival interior |
| `franchise_player` | rol Star/Franchise + tenure + reputación | mejor trato contractual, más uso, más eventos de liderazgo |

Los umbrales numéricos los cierra Simulation/Balance ([SIMULATION.md](../rules/SIMULATION.md) §6.1). Oficio = 2 temporadas que cumplen, no un año suelto. Content no inventa badges sin pasar por Game Design.

Caps: **PROVISIONAL** máximo 5 badges activos en MVP para no inflar al All-Around. Al desbloquearse, el recap de **esa** temporada los lista (`SeasonRecord.newBadges`). La UI pinta labels; no calcula umbrales.

## 6. Estado psicológico y físico

| Campo | Visible | Rango | Notas |
| --- | --- | --- | --- |
| `morale` | sí (simplificado) | 0–100 | minutos, resultados, eventos; también la vía de presión / salud mental de carrera (D-24). No una barra extra. |
| `confidence` | parcial | 0–100 | racha reciente |
| `form` | sí | 0–100 | corto plazo, afecta sim de temporada |
| `fatigue` | sí | 0–100 | minutos + congestión (playoffs, selección) |
| `durability` | no | 40–99 | rasgo; modifica riesgo de lesión |
| `reputation` | parcial | 0–100 | prensa, clubs, selección |
| `coachRelation` | no / eventos | 0–100 | |
| `teammateRelation` | no / eventos | 0–100 | agregado, no 12 barras |
| `workEthic` | no | 40–99 | crecimiento; parte de personalidad |

`personality` no es un string libre. Es un conjunto pequeño de traits (PROVISIONAL):

- `ambition` (anillos vs dinero vs stats)
- `loyalty`
- `ego`
- `professionalism` (correlaciona con work ethic)
- `volatility` (eventos, discusiones)

La UI puede mostrar un adjetivo ("Competidor", "Profesional") derivado. No mostrar los 5 números. El view model lo expone como `temperament`.

## 7. Rol y contrato

Roles (LOCKED):

`prospect | bench | rotation | sixth_man | starter | star | franchise`

El rol determina:

- minutos esperados;
- uso ofensivo;
- tipo de eventos;
- expectativas de contrato.

Contrato (ver [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md)): salario, años, rol esperado, opciones, nivel de equipo, competición.

`role` actual y `contract.expectedRole` pueden divergir → combustible de eventos.

## 8. Salud

```ts
type InjuryRecord = {
  id: string
  seasonYear: number
  type: InjuryType
  severity: "minor" | "moderate" | "severe"
  gamesMissed: number
  lastingEffect?: Partial<PlayerAttributes>  // raro, lesiones graves
}
```

`injuryHistory[]` alimenta riesgo futuro, draft stock y legacy (narrativa), no solo un contador.

## 9. Generación inicial

Toda generación de jugador pasa por seed. Mismos inputs → mismo jugador.

Inputs:

- `playerSeed` (daily date, challenge code, o aleatorio en Free)
- `contentVersion`
- opcional: constraints de modo (no usar en MVP temático)

Outputs derivados de la seed:

- país, nombre, edad de salida, altura, posición, arquetipo;
- atributos base + potencial;
- personalidad y durability;
- contexto: región formativa, equipo inicial, flavor.

Edad de inicio **PROVISIONAL**: 16–19. Ruta Europa/NCAA es decisión temprana, no necesariamente pre-generada. Ver [D-04](../decisiones/DECISIONS.md).

## 10. Overall vs producción

**LOCKED:** overall no es producción.

La simulación usa posición + arquetipo + rol + minutos + atributos para stats. Tests de balance deben fallar si un C y un PG de OVR 80 tienen PPG/AST/REB indistinguibles en 1k temporadas.

## 11. Campos de legado (acumuladores)

En el jugador / historial, no hace falta que sean visibles todos los años:

- temporadas, partidos;
- totals y averages;
- peak OVR;
- `spent` (unidades del giro `lifestyle_flex`; [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md) §4.2);
- earnings (suma de `salary` de cada `SeasonRecord` menos `spent`; no puntúa en Legacy Score);
- equipos, países de club;
- títulos, premios;
- caps internacionales;
- momentos (lista corta de flags: `undrafted_mvp`, `olympic_gold`, `world_gold`, `one_club`, `late_bloomer`). Se calculan al retirar.

Fórmula de Legacy Score: [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md).
