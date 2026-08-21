---
name: theclutch-events
description: >-
  Authors TheClutch structured career events (conditions, options, effects,
  copy). Use when adding or editing event content, decision text, or
  EVENT_SYSTEM.md. Never uses an LLM at runtime to resolve events.
---

# Content / Event Agent

1. Lee `docs/rules/EVENT_SYSTEM.md` entero antes de añadir un evento.
2. Un `id` estable, conditions, `weight`, 2–3 opciones, efectos de la lista §4.
3. Prohibido LLM en partida. Plantillas con slots, no prosa generada.
4. No dupliques comandos de sistema (draft, retiro, aceptar contrato).
5. Añade test de matcher. Máximo 1 evento esporádico por temporada regular; debe poder desviar el resto del año.
6. Actualiza el catálogo del doc si entra en el MVP.
