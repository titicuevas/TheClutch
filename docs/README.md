# TheClutch — Documentación

Esta carpeta es la **fuente de verdad**.

Si una regla importante cambia: proponer → justificar → **actualizar el doc dueño** → implementar. No copiar la regla en tres sitios.

## KISS y DRY (LOCKED)

- **KISS** — la solución más pequeña que cumpla el diseño. Nada de Fase 4 “por si acaso”.
- **DRY** — un concepto tiene **un dueño**. El resto enlaza; no reescribe.
- Código: el engine calcula; la UI y el SQL no duplican overall, stats, draft ni legacy.
- Docs: si estás pegando el mismo párrafo en otro markdown, bórralo y pon un link.

## Mapa

| Carpeta | Dueño de |
| --- | --- |
| [architecture/](architecture/ARCHITECTURE.md) | Stack, paquetes, engine vs app, persistencia |
| [models/](models/PLAYER_MODEL.md) | Jugador, mundo, competiciones |
| [rules/](rules/GAME_DESIGN.md) | Cómo se juega: loop, sim, eventos, carrera, Daily |
| [roadmap/](roadmap/ROADMAP.md) | Fases, fuera de alcance |
| [agents/](agents/AGENTS.md) | Mapa de especialistas |
| [decisiones/](decisiones/DECISIONS.md) | OPEN / PROVISIONAL, inventario |

### Archivos

| Doc | Carpeta |
| --- | --- |
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | architecture |
| [PLAYER_MODEL.md](models/PLAYER_MODEL.md) | models |
| [COMPETITIONS.md](models/COMPETITIONS.md) | models |
| [GAME_DESIGN.md](rules/GAME_DESIGN.md) | rules |
| [SIMULATION.md](rules/SIMULATION.md) | rules |
| [EVENT_SYSTEM.md](rules/EVENT_SYSTEM.md) | rules |
| [CAREER_SYSTEM.md](rules/CAREER_SYSTEM.md) | rules |
| [DAILY_MODE.md](rules/DAILY_MODE.md) | rules |
| [ROADMAP.md](roadmap/ROADMAP.md) | roadmap |
| [AGENTS.md](agents/AGENTS.md) | agents |
| [DECISIONS.md](decisiones/DECISIONS.md) | decisiones |

## Estado de las reglas

- **LOCKED** — vigente. Cambiar exige el proceso de 4 pasos.
- **PROVISIONAL** — se puede ajustar antes o durante el MVP.
- **OPEN** — no implementar como si estuviera cerrado. Ver [decisiones](decisiones/DECISIONS.md).

## Nombres

- **TheClutch**: repo y código. **LOCKED**.
- **Producto (UI)**: **TheClutch**. **LOCKED** en D-01. Los ids técnicos siguen sin prefijos de marca innecesarios.
