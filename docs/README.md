# TheClutch — Documentación

Esta carpeta es la **fuente de verdad** del proyecto.

Ningún agente ni persona debe implementar reglas de juego, fórmulas o flujos que contradigan estos documentos. Si una regla importante debe cambiar:

1. Proponer el cambio.
2. Justificarlo.
3. Actualizar la documentación.
4. Implementar.

## Cómo leer

| Documento | Contenido |
| --- | --- |
| [GAME_DESIGN.md](GAME_DESIGN.md) | Visión, pilares, loop, lo que el juego ES y NO ES |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, paquetes, separación engine/app, modelo de persistencia |
| [PLAYER_MODEL.md](PLAYER_MODEL.md) | Jugador, atributos, arquetipos, badges, personalidad |
| [SIMULATION.md](SIMULATION.md) | Motor de simulación, ticks, stats, desarrollo, lesiones |
| [EVENT_SYSTEM.md](EVENT_SYSTEM.md) | Eventos estructurados, condiciones, decisiones |
| [CAREER_SYSTEM.md](CAREER_SYSTEM.md) | Estados de carrera, contratos, draft, retiro, legado |
| [COMPETITIONS.md](COMPETITIONS.md) | Mundo ficticio, ligas, copas, selección |
| [DAILY_MODE.md](DAILY_MODE.md) | Daily Career, Challenge seeds, rankings |
| [ROADMAP.md](ROADMAP.md) | Fases del MVP, fuera de alcance |
| [DECISIONS.md](DECISIONS.md) | Contradicciones, lagunas y decisiones pendientes |

## Estado de las reglas

Cada regla o propuesta lleva una de estas marcas:

- **LOCKED** — vigente. Cambiar exige el proceso de 4 pasos.
- **PROVISIONAL** — recomendación de arquitectura. Se puede ajustar antes de programar el MVP.
- **OPEN** — no hay decisión. No implementar como si estuviera resuelta.

Ver [DECISIONS.md](DECISIONS.md) para el inventario.

## Convención de nombres

- **TheClutch**: nombre del repositorio y del proyecto técnico. **LOCKED** para código y carpetas.
- **Nombre de producto (UI/marketing)**: **OPEN**. "BUZZER" es candidato. En código usar `TheClutch` / `theclutch`. No espalmar un brand name en identificadores hasta cerrar [D-01](DECISIONS.md).
