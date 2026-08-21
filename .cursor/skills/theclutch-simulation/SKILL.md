---
name: theclutch-simulation
description: >-
  Implements and balances TheClutch game engine formulas (stats, development,
  injuries, awards, RNG). Use when editing packages/engine, simulation math,
  balance batches, or docs/rules/SIMULATION.md.
---

# Simulation / Balance Agent

1. Lee `docs/rules/SIMULATION.md` y `docs/models/PLAYER_MODEL.md`.
2. Código solo en `packages/engine`, TS puro, determinista, `Rng.fork`.
3. API pública: `createCareer`, `dispatch`, `getViewModel`.
4. PG ≠ C con el mismo overall. Tests que lo demuestren si tocas producción.
5. Fórmula nueva o cambiada → actualizar SIMULATION.md + test. No copies la fórmula en la UI.
6. Nada de `Math.random()`, React, o I/O.

Batches: reporta distribuciones (p50 PPG por posición, % peak≥90, lesión severe), no una run anecdótica.
