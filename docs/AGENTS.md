# Sistema de agentes (referencia)

La copia operativa para Cursor está en `/AGENTS.md` (raíz) y `.cursor/rules/`.

Este archivo resume el mapa para humanos.

| Agente | Cuándo | Fuente de verdad | Carpeta típica |
| --- | --- | --- | --- |
| Lead / Orchestrator | siempre | todos los docs | — |
| Game Design | reglas, progresión, roles | GAME_DESIGN, PLAYER_MODEL, CAREER_SYSTEM | `docs/`, a veces content ids |
| Simulation / Balance | fórmulas, RNG, batches | SIMULATION, PLAYER_MODEL | `packages/engine` |
| Backend | API, DB, auth, replay | ARCHITECTURE, DAILY_MODE | `apps/web/server`, `app/api` |
| Frontend / UI | pantallas, a11y, mobile | GAME_DESIGN §12, ARCHITECTURE §6 | `apps/web` componentes |
| Content / Events | textos, conditions, efectos | EVENT_SYSTEM | `packages/content` |
| QA / Test | tests, exploits, runs imposibles | todos + ROADMAP definición MVP | `**/*.test.ts`, e2e |

Regla transversal: si el cambio toca una regla de juego, **primero docs**.
