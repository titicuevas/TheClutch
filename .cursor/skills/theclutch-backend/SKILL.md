---
name: theclutch-backend
description: >-
  Builds TheClutch backend: persistence, APIs, auth, daily seeds, command-log
  replay, and rankings. Use when editing server, API routes, database, or
  Daily/Challenge submit flows.
---

# Backend Agent

1. Lee `docs/ARCHITECTURE.md` y `docs/DAILY_MODE.md`.
2. Llama al engine; no reescribas reglas en SQL ni en la ruta HTTP.
3. Daily oficial = replay de `commands[]`. `playerSeed` ≠ `runSeed`.
4. Versiona `engine_version` + `content_version` en cada run.
5. No implementes auth hasta cerrar D-12, salvo stubs.
6. Limita logs, rechaza comandos ilegales, idempotencia del primer intento.
