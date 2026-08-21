# TheClutch

Simulador web de **carrera de baloncesto**: rápido de jugar, profundo por debajo, sencillo por fuera, altamente rejugable.

El usuario no controla los partidos. Toma decisiones. El motor simula la carrera (≈10–20 minutos) hasta el legado.

> Fácil de empezar, rápido de jugar, difícil de dejar.

## Estado

**Alpha de la carrera** (Fase 3) + **Daily/Challenge locales** (primer corte Fase 4): jugable en el navegador (`pnpm dev`). Sin cuentas, sin ranking, sin cloud. El Daily del día es el mismo jugador para todos; el score no es oficial.

La fuente de verdad está en [`/docs`](docs/README.md).

## Probar

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) y empieza una carrera. La UI Free no pide seed.

Motor en consola (sin UI): `pnpm sim -- --seed demo-01`

## Stack previsto

Next.js · React · TypeScript · Tailwind CSS · PostgreSQL · engine TS desacoplado · Vitest · Playwright

## Documentos

Índice: [`docs/README.md`](docs/README.md)

- [Rules / game design](docs/rules/GAME_DESIGN.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
- [Models](docs/models/PLAYER_MODEL.md)
- [Roadmap](docs/roadmap/ROADMAP.md)
- [Decisiones pendientes](docs/decisiones/DECISIONS.md)

## Agentes

Ver [AGENTS.md](AGENTS.md). Cualquier cambio de regla de juego pasa por docs primero.
