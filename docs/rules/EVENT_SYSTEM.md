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

Idioma: **OPEN** [D-13](../decisiones/DECISIONS.md). Las plantillas serán `es` y/o `en` desde el día uno a nivel de esquema, aunque solo se rellene uno.

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
- `modifyEarnings` (bonus, multa) / `spent` de lifestyle — usar con cautela; no un wallet
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

**PROVISIONAL:** `noEventWeight` calibrado para ~1 giro cada 3 temporadas a nivel de carrera, más frecuente cuando el estado es dramático (banco con OVR alto, último año de contrato, draft frontera, fatiga extrema). Estado tranquilo → casi nunca evento. Tras `SPORADIC_MUST_CAP` (8) giros resueltos, los musts de sabor (afición, lifestyle, declive, prensa, voz de franquicia…) dejan de ser obligatorios; salud, trade involuntario, snub de recap, finales y `go_home` sí. Ver [GAME_DESIGN.md](GAME_DESIGN.md) §9.

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
| `coach_clash` | titular+, míster frío (≤38), moral no hundida; una vez | espejo de `coach_trust`. Parchear recorta el tramo; plantar cara sube minutos y quema. Si el club entero está `cold`, gana `home_crowd`. Banco sigue siendo `unhappy_minutes` |
| `media_overrate` | stats altas en liga menor | ego / reputación |
| `media_heat` | titular+ en `american_league`, OVR ≥ 76, ≥18 PTS a mitad; una vez | la prensa del techo. Alimentar el circo (uso, ego) vs cortar el micro. No es `media_overrate` |
| `lockout_fatigue` | fatigue alta mid-season | gestión de salud; recorta minutos del resto del año |
| `early_return` | lesión moderate, ego o ambition altos | riesgo vs recompensa. Título: `La rodilla` si type=knee; si no `El cuerpo` |
| `hometown_discount` | contrato acaba + loyalty alta | variante estructural de mercado; One Club seed sin ser modo |
| `contender_call` | oferta de equipo top, rol peor | anillos vs uso |
| `draft_pressure` | eligible + stock frontera | misma decisión de draft, copy y filo distintos |
| `agent_conflict` | professionalism baja o salario percibido bajo | puede marcar tradeRequest |
| `teammate_star_clash` | otro star en el locker (OVR ≥ 82), ego alto | dos carteles; nombra al shadow. Compartir vs exigir el uso |
| `locker_ice` | titular+, vestuario frío (≤38), míster no; ego bajo; una vez | el locker te deja solo. Pegarte recorta el tramo; pedir el balón sube minutos. No pisa `coach_clash` ni `home_crowd` |
| `locker_voice` | `franchise_player` + titular+, fatiga < 58; una vez | la cara lleva el vestuario o sigue de estrella. Más uso y carga vs locker frío. Gana a `home_crowd` y `locker_ice`. No es `teammate_star_clash` |
| `vet_minutes` | sexto o rotación, edad ≥ 28, 6+ años, mismo club el año anterior; una vez | hay un chico pidiendo tu uso. Ceder vs agarrarte. Banco gordo sigue siendo `unhappy_minutes`. No dispara el año que cambias de club |
| `role_slide` | titular+, edad ≥ 32, 8+ años; una vez | declive: el staff quiere sentarte. Aceptar vs pelear el rol. No es el prompt de retiro. Sexto/rotación sigue siendo `vet_minutes` |
| `finals_hangover` | titular+, el recap fue `finals`; una vez | perder el anillo. Repetir vs pedir el cambio. No es `contender_call` (eso es otra camiseta). El anillo no pregunta |
| `national_snub` | Recap con `national.status = snub` | offseason; solo si hubo ventana y no convocaron |
| `national_duty` | offseason de Juegos o Mundial, OVR ≥ 80; una vez | ir a la selección vs saltarte el verano. No es el snub. El continental no pregunta. Si te quedas, el recap es `declined` |
| `work_summer` | offseason, workEthic, edad ≥ 24 | gym vs descanso; no sustituye el training joven |
| `traded_involuntary` | american_league + motivo (tank, coach, request). `full` o star/franchise lo bloquean salvo `tradeRequest` | sistema/giro; no spam. Ver CAREER_SYSTEM §4.3 |
| `award_snub` | recap con `awardSnub` (pool de MVP/All-Team/POTY y no salió) | offseason esporádico; ego / confianza / prensa |
| `lifestyle_pressure` | titular+ con morale baja, no lockout | D-24: presión/aislamiento. Recorta minutos si bajas revoluciones. Copy de carrera, no clínico |
| `home_crowd` | titular+, 2+ años, chip `loved` o `cold`; una vez | D-23: la grada canta o pita. Más uso vs vestuario; o ganar la pista vs pedir el cambio. Si el club está `ok`, no sale. Gana a `lifestyle_pressure` cuando el vestuario entero está frío |
| `rival_heat` | a mitad, el rival sombra te está comiendo en PTS | el sombra muerde; cazarle sube uso y fatiga |
| `go_home` | veterano titular+ en `american_league`, no USA, lealtad alta o moral baja | volver a la liga de origen. Una vez. Más rol, menos sueldo |
| `leaving_home` | 3+ temporadas en un club (no formación) y 1 en otro; una vez | el club viejo sigue escribiendo. Cerrar capítulo vs no olvidar. Enfría el chip si te quedas anclado (D-23) |
| `lifestyle_flex` | titular+ , edad ≥ 26, sueldo ≥ 18; una vez | casa/coche vs seguir liviano. Gasta unidades; no es tienda |
| `play_through` | lesión `minor` a mitad y ego o ambition ≥ 62 | el golpe. Jugarla vs sentarte el tramo. No es must: `moderate` + ego ≥ 68 sigue siendo `early_return` |
| `load_manage` | rol `franchise`, contention ≥ 78, fatiga < 58; una vez | Mayo vs cada noche. El recorte de cuerpo sigue siendo `lockout_fatigue`. Titular o estrella no lo ve |
| `captain_c` | rol `franchise`, 8+ años, chip `loved`; una vez | el brazalete. Llevarla vs uno más. No es `locker_voice` (eso es a mitad). Estrella sin la C de club no lo ve |
| `sixth_heat` | `sixth_man`, edad ≤ 25, ≥15 PTS a mitad; una vez | pedir el cinco vs seguir de bomba. Banco gordo sigue `unhappy_minutes`; veterano ≥ 28 sigue `vet_minutes`. No es must |
| `deal_year` | titular o estrella, último año, ego o ambition ≥ 62, no formación; una vez | jugarlo vs forzar la salida a mitad. El mercado estructural no lo sustituye. No es `agent_conflict` |
| `playoff_push` | titular o estrella con 2+ años, contention ≥ 68, fatiga 42–67; una vez | **decisión clutch** ante un partido clave: pedir la última bola o jugar para el equipo. El desenlace posterior usa atributo/badge `clutch`, forma, rol y RNG acotado; nunca se muestra un porcentaje ni se controla la posesión. El recap destaca `DENTRO` / `FUERA` sobre el outcome, sin pantalla extra. Franquicia sigue viendo `load_manage`; fatiga extrema sigue `lockout_fatigue`. No es must. Objetivo de balance: aparece en ~4–10% de carreras completas, no cada año |

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
