# TheClutch

Simulador web de **carrera de baloncesto**: rápido de jugar, profundo por debajo, sencillo por fuera, altamente rejugable.

El usuario no controla los partidos. Toma decisiones. El motor simula la carrera (≈10–20 minutos) hasta el legado.

> Fácil de empezar, rápido de jugar, difícil de dejar.

## Estado

Fase 1 en curso: hay un **vertical slice del engine** (sin UI). Genera un jugador por seed, simula temporadas y imprime un legacy en consola.

La fuente de verdad está en [`/docs`](docs/README.md).

## Probar el motor

```bash
pnpm install
pnpm test
pnpm sim -- --seed demo-01
```

Misma `--seed` = mismo jugador. `--run` distinta = misma carta, otra suerte de temporada.

## Stack previsto

Next.js · React · TypeScript · Tailwind CSS · PostgreSQL · engine TS desacoplado · Vitest · Playwright

## Documentos

- [Game Design](docs/GAME_DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones pendientes](docs/DECISIONS.md)

## Agentes

Ver [AGENTS.md](AGENTS.md). Cualquier cambio de regla de juego pasa por docs primero.
