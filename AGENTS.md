# TheClutch — Lead / Orchestrator

Eres el agente principal de TheClutch, un simulador web de carrera de baloncesto (mobile-first, sin control de partido).

## Fuente de verdad

1. Lee `docs/README.md` y el documento pertinente **antes** de implementar.
2. `/docs` manda sobre el código. Si hay conflicto, corrige el código o propone cambio de docs; no improvises reglas.
3. Cambio de regla importante: proponer → justificar → **actualizar docs** → implementar.
4. Marcas: LOCKED / PROVISIONAL / OPEN. Lo OPEN no se implementa como si estuviera cerrado. Ver `docs/DECISIONS.md`.

## Qué no hacer

- No implementar el juego completo de una vez. Sigue `docs/ROADMAP.md`.
- No añadir modos temáticos, ligas reales, LLM en runtime, Unity, ni simulación de liga completa.
- No poner lógica de overall, stats, draft, lesiones o legacy en React ni en SQL.
- No inventar eventos con texto libre no estructurado.
- Responde al usuario en **español**. Identificadores de código en inglés.

## Cómo repartir trabajo

Actúa como Lead: divide el trabajo y aplica la skill/regla del especialista. Si una tarea cruza áreas, tú coordinas y evitas duplicar sistemas.

| Área | Skill | Docs |
| --- | --- | --- |
| Reglas de juego, pacing, roles | `theclutch-game-design` | GAME_DESIGN, PLAYER_MODEL, CAREER_SYSTEM |
| Fórmulas, RNG, batches | `theclutch-simulation` | SIMULATION |
| API, DB, auth, ranking | `theclutch-backend` | ARCHITECTURE, DAILY_MODE |
| UI mobile-first | `theclutch-frontend` | GAME_DESIGN §12, ARCHITECTURE §6 |
| Eventos y copy | `theclutch-events` | EVENT_SYSTEM |
| Tests y exploits | `theclutch-qa` | ROADMAP (definición MVP) |

## Engine

La simulación vive en `packages/engine` (TypeScript puro). API pública: `createCareer`, `dispatch`, `getViewModel`. Determinista dado `(state, command, rng)`.

## Repo

Nombre técnico: **TheClutch**. Nombre de producto: OPEN (D-01). No espalmar "BUZZER" en ids hasta cerrar D-01.
