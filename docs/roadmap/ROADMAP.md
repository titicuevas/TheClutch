# Roadmap

Estado: plan de entrega **PROVISIONAL**. Fuera de alcance del MVP: **LOCKED** hasta que se reabra.

## 0. Cómo se prioriza

Orden de valor:

1. Una carrera jugable de 10–20 min que se quiera repetir.
2. Profundidad del motor por debajo.
3. Daily + ranking (el gancho social).
4. Volumen de contenido (eventos).
5. Más competiciones y modos.

No construir ranking antes de que la carrera sea divertida. No construir 200 eventos antes de que `unhappy_minutes` corte una temporada a mitad y el resto del año cambie. El draft estructural sí cuenta; un popup cada año no.

## Fase 0 — Fundación (esta entrega)

- `/docs` como fuente de verdad.
- AGENTS.md + reglas/skills de Cursor.
- Decisiones abiertas listadas, no fingidas como cerradas.
- **Sin** features de juego.

## Fase 1 — Vertical slice del engine (sin UI rica)

**Estado: slice jugable en CLI.** `pnpm sim -- --seed demo-01`

Objetivo: en Node, generar un jugador, simular N temporadas, retirar, imprimir legacy.

Incluye:

- tipos de `CareerState` + RNG;
- generación por seed (test: misma seed → mismo jugador);
- `simulateSeason` grosero pero con stats distintas por posición;
- desarrollo / regresión / edad;
- lesión básica;
- `calculateLegacy` placeholder;
- tests unitarios + CLI.

No incluye: eventos ricos, draft ceremonia, Daily, Next.js pulido.

## Fase 2 — Carrera con decisiones

**Estado: slice con offseason estructural + corte a mitad de año.** El resto de la temporada se simula con el estado nuevo (`SIMULATE_NEXT` / `CHOOSE`).

- Comandos `SIMULATE_NEXT` (temporada de un tirón) y reanudación tras interrupt.
- Contratos 2–3 ofertas, training focus (estructurales).
- Evaluador de eventos **esporádicos** + entrenamiento, draft y contratos simples en el MVP visual.
- Al menos un evento de mitad de año que altera minutos/rol del tramo restante (`unhappy_minutes`).
- Roles y cambio de equipo simplificado.
- Draft: proyección + resolución + undrafted path.
- Tests: conditions de eventos, replay de un log corto, “la mayoría de temporadas no disparan evento”.

## Fase 3 — App jugable mobile-first

**Estado: alpha de la carrera.** `pnpm dev` → localhost:3000. Persistencia cloud → Fase 4. Daily / cuentas → Fase 4.

Incluye:

- carta de jugador (sin potencial exacto; scout/arquetipo/attrs/país en castellano), creador ligero opcional (un toque empieza; nombre / posición / país / mano si quieres) y reroll que conserva esa identidad;
- rol + banda de minutos y sueldo actual en la carta (`$22M`); earnings acumulados en legacy (no puntúan);
- forma, ánimo, carga y un adjetivo de carácter (no 5 traits);
- beat corto de recap para MVP / anillo / oro y draft gordo (`prefers-reduced-motion` lo apaga); nota del año (letra + puntuación), chips de las decisiones de esa temporada, lesión en castellano y badges nuevos de ese año;
- ruta de arranque: club en casa vs universidad en América; ventanas de draft distintas (uni 19–20, club 20–21);
- premios por circuito: formación POTY / All-Circuit (30 PJ); nacional MVP / All-Team 1/2/3; ROY = primer año en `american_league`;
- All-Team en tres equipos (1ª/2ª/3ª); All-Defense y All-Rookie en dos (1ª/2ª); 1ª pesa más en legacy; All-Team pondera posición (C por REB/TAP, PG por AST); ROY arrastra All-Rookie;
- snub de placas en el recap (`awardSnub`); el giro offseason lee el flag;
- lesiones moderate en ~10–30% de carreras; `early_return` solo con ego o ambition altos;
- draft set piece: pick + club en el recap, o “sin ser elegido”; sueldo según banda; second_round puede caer al vacío;
- carta de legacy con banda que discrimina (`Leyenda local` → `Histórico`; All-Time no es el suelo) + TAP + 0–3 momentos + línea de selección (caps, medallas);
- chips de premios con copy del engine (`All-Star`, `Jugador del año`, All-Team 1ª/2ª/3ª); la carta agrupa (`All-Star x8`);
- títulos agrupados (`Liga x3`), no el id `League` ni el año a año;
- persistencia local de la run (refresh no la borra; sin cloud);
- landing de Free sin campo seed ni botón demo; `?seed=` queda para tests;
- Playwright happy path (crear, recap, legacy);
- batch de balance (`pnpm sim -- --batch --n 10000`) + test estadístico de 80 runs;
- simular temporada (hasta el giro o el recap) / retirarse;
- log de temporadas legible (temporada N, club, rol, OVR, línea, chips; etapas de club compactas), rival sombra y chip de vestuario;
- prompt de retiro tras el recap (una más o colgarlas);
- mercado estructural a **3 ofertas** (minutos + cláusula / max / anillos); el sueldo pintado es el que se firma; `full` bloquea el trade involuntario salvo `tradeRequest`;
- catálogo de giros del MVP: fatiga, descuento de casa, presión de draft, agente, verano de gym, presión de carrera (`lifestyle_pressure`), afición (`home_crowd`), calor del rival sombra (`rival_heat`), prensa americana (`media_heat`), roce con el míster (`coach_clash`), vestuario frío (`locker_ice`), voz de franquicia (`locker_voice`), minutos de veterano (`vet_minutes`), declive de rol (`role_slide`), perder las finales (`finals_hangover`), convocatoria (`national_duty`), volver a casa (`go_home`), dejar el club de siempre (`leaving_home`), lifestyle (`lifestyle_flex`);
- invariantes de ritmo: la mayoría de temporadas no disparan giro esporádico; tras 8 giros de sabor el resto deja de ser must; el log de comandos se puede replayear.

**Bloque cerrado (alpha de lectura):** lo que se ve está en castellano (carta, placas, sueldo, draft) y las decisiones de identidad del MVP (ruta, mercado, volver a casa) están en el loop. Siguiente: ranking/auth de Fase 4 (D-12) o profundidad Fase 5. No más chrome de carta. Daily/Challenge locales: [DAILY_MODE.md](../rules/DAILY_MODE.md) §10.

Aún no: guardado cloud.

## Fase 4 — Daily, Challenge, cuentas, ranking

**Estado: Daily/Challenge jugables en cliente + `replay` + ficha Free compartible (`BK1-X-…`).** Mismo jugador del día o de una carta, log de comandos, intento local. **Sin** auth, **sin** leaderboard, **sin** percentil (D-12 OPEN). El score de la carta no es oficial hasta submit servidor.

Siguiente:

- Auth (cuando D-12 esté cerrado).
- Snapshot daily, `POST /runs/submit` que llama a `replay`.
- Leaderboard diario.
- Ranking semanal si D-15 está cerrado.

## Fase 5 — Profundidad y balance

- Batches 10k, calibrar PPG/OVR/lesiones/legacy (primer 10k en 0.12.41: Histórico a 24k; All-Team nacional con cupo 0.12.42; PPG 0.12.37; lesiones/peak 0.12.1).
- Más eventos (objetivo 80–150 de calidad). Cortes Fase 5: `play_through`, `load_manage`, `captain_c`, `sixth_heat`, `deal_year`, `playoff_push` ([EVENT_SYSTEM.md](../rules/EVENT_SYSTEM.md) §8). No musts de sabor extra.
- Selección nacional (primer corte: knockout + rival de país; `formatNationalStintLine`).
- Continental competition (primer corte: knockout paralelo en `national_league` con cartel; título `Continental` + `CMVP`/`CFMVP` + `continentalRun`). Playoffs de liga: `playoffRun` + `formatPlayoffLine`. Récord del club: `teamRecord` (`formatTeamRecord`).
- Compañeros sombra (primer corte: `world.locker` 2–4 + `coachName`; los giros de vestuario/míster nombran).
- Badges con umbrales reales (oficio pide 2 temporadas; `franchise_player` pide reputación ≥ 58 y el stay paga ×0.40 / 4 años; [SIMULATION.md](../rules/SIMULATION.md) §6.1 y §12).
- `legacyWeight` (primer corte: formación 0.35 / nacional 0.75 / americana 1.15 en stats, placas y anillo de liga).
- Percentiles y copy de share.

## Fase 6 — Post-MVP (no comprometer fechas)

- Modos temáticos (Wonderkid, Underdog, Late Bloomer, Injury Prone, EuroLegend, American Dream, Journeyman, One Club Man).
- Copas, más ligas, G-League-like.
- Creador de jugador.
- Perfil público de carrera.
- CMS de eventos.
- i18n completo.
- Admin de contenido.

## Qué NO implementar todavía (LOCKED)

Sistemas y features que el código no debe empezar "por si acaso":

- Modos temáticos de § Fase 6.
- Cientos de ligas o datos realistas con nombre real.
- LLM en runtime.
- Control de partido / 2K-like.
- Unity / canvas 3D / física.
- Salary cap, trades con picks, agencia libre semana a semana.
- Tienda de staff / consumibles / catálogo de casas (ver [D-25](../decisiones/DECISIONS.md): giro `lifestyle_flex`, no menú).
- Simulación completa de todos los jugadores de la liga.
- NCAA real, NIL, esquema de conferencias.
- Clasificatorias largas de selección.
- Chat social, guilds, apuestas, P2P.
- Monetización / battle pass.
- Creador profundo de jugador (14 sliders).
- App nativa aparte (una PWA bien hecha basta).
- CMS admin de eventos.
- Segunda posición / position changes complejos (hasta D-08).
- Copa nacional (hasta que el pacing de temporada esté corto).

Si un agente "aprovecha" para añadir esto, el Lead debe revertir.

## Definición de "MVP jugable"

Se puede decir que hay MVP cuando:

1. Una persona en el móvil termina una carrera en ≤ 20 minutos sin tutorial de 5 páginas.
2. Quiere pulsar "otra".
3. Un PG y un C no se sienten iguales.
4. Hay al menos un draft y un contrato que duelen.
5. El legacy se entiende en un screenshot.
6. Daily oficial existe **o** está explícitamente en la siguiente sprint (Fase 4), no a medias con scores falseables.

## Criterio para abrir modos temáticos

Solo cuando Free/Daily estén estables: los modos son **filtros de generación** (`growthCurve`, `durability`, circuito inicial), no engines nuevos. Si se implementan antes, se bifurca el diseño.
