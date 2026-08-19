# Event System

Estado: principios **LOCKED**. Catálogo de eventos del MVP: **PROVISIONAL**.

## 1. Principios (LOCKED)

1. Los eventos son **contenido estructurado**, no prosa generada en runtime.
2. **Prohibido** usar un LLM durante la partida para elegir texto, opciones u outcomes.
3. Un evento solo se ofrece si sus **condiciones** se cumplen.
4. Las consecuencias solo mutan el estado a través del engine (efectos tipados).
5. Game Design define qué puede cambiar un evento. Content no inventa efectos nuevos (`grant_superstar_now`) sin documentarlos.
6. El sistema debe escalar a cientos o miles de eventos reutilizables.
7. Los eventos son **esporádicos**. La temporada por defecto no tiene ninguno.
8. Un evento de mitad de año se resuelve y **el resto de la temporada usa el estado nuevo**. Si no puede cambiar el camino, no es un evento: es un toast.

## 2. Anatomía de un evento

```ts
type EventDefinition = {
  id: string                    // estable, nunca reciclar con otro significado
  version: 1
  tags: EventTag[]
  weight: number                // prioridad relativa si hay varios candidatos
  cooldownSeasons?: number
  oncePerCareer?: boolean
  conditions: Condition[]       // AND implícito; OR se expresa con grupos
  text: LocalizedText           // plantillas con slots {coachName}, {team}
  options: EventOption[]        // 2–3 en MVP
}

type EventOption = {
  id: string
  text: LocalizedText
  effects: Effect[]
  followUpEventId?: string      // raro; preferir estado que re-dispare
}
```

Idioma: **OPEN** [D-13](DECISIONS.md). Las plantillas serán `es` y/o `en` desde el día uno a nivel de esquema, aunque solo se rellene uno.

## 3. Condiciones

Las condiciones leen el estado, no el RNG (el RNG solo elige *qué* evento entre candidatos).

Ejemplos de predicados (LOCKED como familia; la lista crece en código documentada aquí):

- `roleEq`, `roleAtMost`, `roleAtLeast`
- `overallGte`, `overallLte`
- `ageBetween`
- `moraleLte`, `moraleGte`
- `minutesShareLte` (banco vs starter del equipo: `player.overall > estimatedStarterOverall`)
- `phaseEq` (`regular_season`, `offseason`, `draft`, `playoffs`, `injury`)
- `contractYearEq` (año 1, último año, FA)
- `injurySeverityEq`
- `badgeMissing` / `hasBadge`
- `nationalityIn`
- `competitionTierEq`
- `coachRelationLte`
- `growthCurveEq`
- `draftEligible`
- `seasonAwardsIncludes`

Ejemplo del brief:

```
role === bench
AND overall > team.estimatedStarterOverall
AND morale < 50
→ event.unhappy_minutes
```

Opciones:

- A Hablar con el entrenador → `coachRelation`, posible subida de rol o bronca (RNG en efectos `roll`)
- B Seguir trabajando → `workEthic` visible via desarrollo, `morale` + pequeño
- C Pedir traspaso → flag `tradeRequest`, reputación, relación

Los `roll` dentro de efectos usan `rng.fork("event:" + id)`, no un modelo generativo.

## 4. Efectos permitidos

Lista cerrada en MVP (añadir un efecto = cambio LOCKED de este doc):

- `modifyStat` (morale, confidence, form, fatigue, relations, reputation)
- `modifyAttribute` (raro, pequeño, documentado; no +10 threePoint)
- `setFlag` / `clearFlag` (`wantsTrade`, `earlyReturn`, `loyalToClub`)
- `setTrainingFocus`
- `nudgeRole` (como mucho un escalón, sujeto a reglas de equipo)
- `injure` / `progressInjury` / `heal`
- `addMoment` (para legacy card)
- `modifyEarnings` (bonus, multa) — usar con cautela
- `weightNextOffers` (preferencia de mercado)
- `draftDeclare` (atajo; preferible comando explícito)
- `retirePrompt`
- `noop`

Prohibido en contenido:

- fijar overall absoluto;
- conceder títulos;
- desbloquear badges directo salvo efecto `tryUnlockBadge` que delega en las reglas de badges;
- matar la run sin lesión/retiro explícito.

## 5. Selección en runtime

El engine simula la temporada. En **pocos** puntos internos de chequeo (no pantallas), pregunta: ¿hay giro?

1. Filtrar definiciones por condiciones **y** fase (`regular_season`, `offseason`, `playoffs`, `injury`).
2. Excluir cooldowns y `oncePerCareer` ya disparados.
3. Pesar por `weight` × modificadores de personalidad (ego alto → más prensa).
4. Tirada contra un `noEventWeight` **alto**. Lo normal es **ningún** evento.
5. Si sale, encolar `pendingInterrupt`, pausar la sim, mostrar al usuario.
6. Al `RESOLVE_EVENT`, reanudar el progreso restante del año.

**LOCKED:** máximo **1 evento de decisión esporádico** por temporada regular. Una lesión puede ocupar ese slot (o ser el único corte). Offseason estructural (contrato/draft) no cuenta como ese slot.

**PROVISIONAL:** `noEventWeight` calibrado para ~1 giro cada 3 temporadas a nivel de carrera, más frecuente cuando el estado es dramático (banco con OVR alto, último año de contrato, draft frontera, fatiga extrema). Estado tranquilo → casi nunca evento. Ver [GAME_DESIGN.md](GAME_DESIGN.md) §9.

Toasts de flavor (`"{team} gana de 20"`) no son eventos y no paran el flujo. Si se usan, van en el resumen.

## 6. Familias de contenido

Tags para filtrar y para que Content no mezcle temas:

`coach`, `teammates`, `injury`, `contract`, `media`, `fans`, `agent`, `training`, `national_team`, `draft`, `rivalry`, `minutes`, `trade`, `lifestyle`, `career_choice`

El MVP no necesita las 14 familias pobladas. Ver catálogo mínimo en §8.

## 7. Decisiones estructurales vs eventos esporádicos

No son lo mismo. Content no debe disfrazar un set piece como evento aleatorio, ni al revés.

| | Estructural | Esporádico |
| --- | --- | --- |
| Frecuencia | Siempre que toca | Rara, condicionada |
| Quién lo define | Career system | `packages/content` |
| Ejemplos | Draft, ofertas, retiro, training focus | Minutos, lesión temprana, snub, clash con estrella |
| Ids | `system.draft_declare`, etc. | `unhappy_minutes`, etc. |

Tercer tipo: **destino**. No lo pediste, pero te pasa. El trade involuntario en `american_league` es `system.traded`: raro como un giro, siempre visible, no un menú anual. Los premios **no** son decisión: van al resumen de temporada ([CAREER_SYSTEM.md](CAREER_SYSTEM.md) §6).

Un evento esporádico **debe** poder cambiar al menos una de: rol/minutos del tramo restante, equipo (flag de traspaso), salud, elegibilidad/stock de draft, tipo de ofertas siguientes, convocatoria, o un `moment` de legacy. Si no, recórtalo.

## 8. Catálogo mínimo del MVP (PROVISIONAL)

Objetivo: **20–40 eventos** de alta calidad, no 400 mediocres.

| Id | Condición resumida | Por qué existe |
| --- | --- | --- |
| `unhappy_minutes` | banco + OVR > starter + morale baja | el ejemplo canónico |
| `coach_trust` | buena racha + coachRelation alta | refuerzo positivo |
| `media_overrate` | stats altas en liga menor | ego / reputación |
| `lockout_fatigue` | fatigue alta mid-season | gestión de salud |
| `early_return` | lesión moderate, ego o ambition altos | riesgo vs recompensa |
| `hometown_discount` | oferta menor, loyalty alta | One Club seed sin ser modo |
| `contender_call` | oferta de equipo top, rol peor | anillos vs uso |
| `draft_pressure` | eligible + stock frontera | tensionar D-05 |
| `agent_conflict` | professionalism baja o salario percibido bajo | |
| `teammate_star_clash` | otro star en equipo, ego alto | |
| `national_snub` | OVR alto no convocado | |
| `work_summer` | offseason, workEthic | |
| `traded_involuntary` | american_league + motivo (tank, contrato, request) | sistema/giro; no spam. Ver CAREER_SYSTEM §4.3 |
| `award_snub` | pool de MVP/All-Team y no salió | offseason; ego / work ethic / tradeRequest |

Cada evento nuevo: archivo en `packages/content/events/`, tests de condición, y una línea en este catálogo o un índice generado. No copypastear 50 variantes que son el mismo evento con otro adjetivo.

## 9. Variantes

Las variantes son **slots y conditions**, no forks de LLM.

```
text: "{coachName} te recorta minutos tras dos partidos flojos."
```

`coachName` sale del world state. Una definición, muchos flavors.

Si se necesitan 3 tonos (positivo/neutral/bronca), son `id` distintos o `variant` con conditions de `coachRelation`. Siguen siendo datos.

## 10. Tests de contenido

El QA/Content debe cubrir:

- evento con conditions imposibles (nunca dispara) → test que en 1k runs count=0 o test unitario de matcher;
- `unhappy_minutes` dispara en el estado del ejemplo;
- ningún efecto fuera de la lista §4;
- ids únicos;
- toda opción tiene ≥1 efecto o `noop` explícito.

## 11. Herramientas futuras (no MVP)

- CMS admin;
- generación asistida por LLM **offline** para *borradores*, siempre revisados y guardados como JSON (el runtime sigue sin LLM);
- grafos largos de follow-up.

Documentar cualquier pipeline offline aquí antes de usarlo.
