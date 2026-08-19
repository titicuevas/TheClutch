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

- Comandos `SIMULATE_NEXT` (temporada de un tirón) y reanudación tras interrupt.
- Contratos 2–3 ofertas, training focus (estructurales).
- Evaluador de eventos **esporádicos** + catálogo mínimo de alta calidad (empieza ~12, techo MVP 20–40). `noEventWeight` alto.
- Al menos un evento de mitad de año que altera minutos/rol del tramo restante (`unhappy_minutes`).
- Roles y cambio de equipo simplificado.
- Draft: proyección + resolución + undrafted path.
- Tests: conditions de eventos, replay de un log corto, “la mayoría de temporadas no disparan evento”.

## Fase 3 — App jugable mobile-first

- Next.js: flujo carta → simular → evento → resumen de temporada → legacy.
- View models (ocultar potencial).
- Guardado local de run en curso (Free).
- Carta de legacy compartible (HTML/CSS screenshot-friendly).
- Playwright: happy path.

## Fase 4 — Daily, Challenge, cuentas, ranking

- Auth (cuando D-12 esté cerrado).
- Snapshot daily, submit + replay servidor.
- Leaderboard diario.
- Challenge codes.
- Ranking semanal si D-15 está cerrado.

## Fase 5 — Profundidad y balance

- Batches 10k, calibrar PPG/OVR/lesiones/legacy.
- Más eventos (objetivo 80–150 de calidad).
- Selección nacional.
- Continental competition.
- Badges con umbrales reales.
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
