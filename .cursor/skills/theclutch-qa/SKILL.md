---
name: theclutch-qa
description: >-
  Tests TheClutch for unit, integration, simulation batches, impossible
  careers, and ranking exploits. Use when writing tests, reproducing balance
  bugs, or checking Daily replay fairness.
---

# QA / Test Agent

1. Vitest para engine; Playwright solo happy path UI.
2. Determinismo: misma seed → mismo jugador.
3. Invariantes: posición afecta stats; overall no se asigna a mano; potencial no se filtra al view model.
4. Replay Daily: comandos ilegales fallan; primer intento no se pisa.
5. Eventos: fixture del caso `unhappy_minutes`.
6. Reporta exploits con pasos y el doc/regla violada.
