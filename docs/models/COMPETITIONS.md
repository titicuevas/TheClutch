# Competitions

Estado: mundo ficticio **LOCKED** para MVP. Calendarios y nombres **PROVISIONAL**.

## 1. Principio de licencias (LOCKED)

No usar nombres, logos ni plantillas de ligas, clubs o jugadores reales.

Países (España, Francia, USA…) sí. "NBA", "EuroLeague", "NCAA" como marcas: **no** en producto.

Nombres internos de código pueden ser genéricos: `american_league`, `euro_cup`, `college_circuit`.

Copy de UI: inventar marcas propias (ej. "Americas Cup", "Continental 16") cuando se cierre naming. Hasta entonces, en docs usar **nombres genéricos**.

## 2. El mundo es un grafo pequeño

El MVP no implementa cientos de ligas. Implementa **tiers** y unos pocos circuitos.

```
Formación
  ├── club_academy (Europa / resto) 
  └── college_circuit (América)
         ↓
Ligas profesionales
  ├── national_league (tier C / B / A)
  ├── continental_competition (Europa-like)
  └── american_league (+ playoffs + draft)
         ↓
Selección
  └── window cada 2 años: continental | world | olympics
```

Un jugador está en **un club** y opcionalmente en **una competición continental** el mismo año. La selección es extra en años de torneo.

## 3. Tiers y legacyWeight (PROVISIONAL)

| Tier | Ejemplos de contexto | legacyWeight | Stats |
| --- | --- | --- | --- |
| 0 | academia / college | 0.35 | infladas o irregulares; draft stock importa más que títulos |
| 1 | liga nacional menor | 0.5 | fácil puntuar |
| 2 | liga nacional top | 0.75 | |
| 3 | continental | 1.0 | |
| 4 | american_league | 1.15 | el techo de prestigio del MVP |

Pesos a calibrar. Dirección: no debe ser óptimo eternizarse en tier 1 inflando 28 PPG. Un MVP de tier 1 no pesa como un MVP de tier 4. Sets de premios: [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md) §6.2.

Slice actual (`legacyWeight` en el engine): formación 0.35, `national_league` 0.75, `american_league` 1.15. No hay split de nacional menor (0.5). El título `Continental` y `CMVP`/`CFMVP` ya tienen puntos propios y no se vuelven a ponderar. Fórmula: [SIMULATION.md](../rules/SIMULATION.md) §8.5.

## 4. Equipos

Entidad ligera:

```ts
type Team = {
  id: string
  name: string              // ficticio, generado o lista fija
  country: string
  competitionId: string
  rating: number            // 50–95
  prestige: number
  contention: number        // anillos vs rebuild
}
```

MVP: **lista fija pequeña** (20–40 clubs ficticios) + generación por seed de "resto del cuadro" sin nombres inolvidables.

Compañeros: 2–4 **shadow players** (`world.locker`: nombre, posición, OVR) para eventos y para `estimatedStarterOverall` (max OVR del locker; vacío = rating del club). No tienen carrera propia. Sin menú de plantilla. El míster es `world.coachName`. Se regeneran al cambiar de club; el stay los conserva. Copy: `teammate_star_clash` / `vet_minutes` / `locker_ice` / `coach_clash` nombran.

Rival de carrera (PROVISIONAL, [D-22](../decisiones/DECISIONS.md)): **un** sombra generado con la seed, misma posición, otro club. Cada año cierra una línea (PTS, TAP, a veces placa). No se simula su vida entera. Eventos contra él (`rivalry`) son giros raros, no un segundo modo.

Coach: `{ name, style, personality }` abstracto.

## 5. Calendario por circuito (PROVISIONAL)

| Circuito | Regular | Playoffs | Notas |
| --- | --- | --- | --- |
| college / club_academy | ~30 | torneo corto | alimenta draft. Slice: 30 PJ, corte a 15. |
| national | ~30–40 | sí | slice: 40 PJ |
| continental | ~20 + knockout | sí | paralelo a national: el engine simula un knockout extra, no una segunda carrera. Entra el club de `national_league` con cartel (`prestige ≥ 62`). Fórmulas: [SIMULATION.md](../rules/SIMULATION.md) §7 |
| american | ~60–82 agregado | sí, por rondas | slice: 40 PJ agregados; UI no muestra 82 scores |

Selección: 5–8 "partidos" de torneo en un único chunk especial.

Congestión (national + continental + selección) sube fatiga y lesiones. Es un trade-off de legado internacional vs salud.

## 6. Playoffs

Eliminación por ronda. El usuario ve:

- el club rival de la ronda que cierra (nombre + escudo);
- el marcador de esa serie (`formatPlayoffLine`);
- el chip Campeón / Finales / Playoffs.

Slice actual: un rival generado, no todas las rondas. Sin boxscore de serie ni rating numérico. Formación es al mejor de 1; el resto, al mejor de 7. El recap pinta también el récord del club (`22-18`). Continental: al mejor de 5 + `formatContinentalLine`. Fórmulas: [SIMULATION.md](../rules/SIMULATION.md) §7.

Finals: más ceremonia (beat de recap), posible badge `clutch`.

## 7. Draft de la liga americana

Solo existe un draft "grande" en el mundo MVP (el de `american_league`).

Otras ligas: fichaje / invitación / ofertas, no ceremonia de 2 rondas.

Relación con formación: college_circuit y clubes europeos alimentan stock. Ver [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md).

## 8. Selección nacional

No hay clasificatorias largas en el MVP.

Cada 2 años, si `reputation`, OVR, y nacionalidad tienen pool:

- convocado / no convocado / capitán (raro) / declinado (giro `national_duty`, una vez, Juegos o Mundial; el continental no pregunta);
- torneo: continental, world o olympics según el año del calendario ficticio;
- resultado: fase de grupos abstracta + knockout;
- knockout: un país rival (`foe`); grupos no. Copy `formatNationalStintLine` (`Oro ante Francia`). No es un segundo boxscore;
- oro/plata/bronce como momentos de legacy.

El calendario internacional se ancla al `year` de la run, no al año civil real, para que Daily de 2026 no dependa de si hay Juegos ese verano real — **PROVISIONAL** [D-10](../decisiones/DECISIONS.md).

## 9. Preparado para el futuro, no implementado

El modelo de datos debe permitir, sin construirlos ahora:

- más ligas nacionales;
- copas domésticas;
- segunda competición continental;
- copa americana;
- EuroBasket / Mundial / JJOO como ids distintos (ya previstos como torneos de selección);
- G-League-like / segunda división americana.

No poblar 50 JSON de ligas vacías. Un `CompetitionDefinition` bien tipado basta.

## 10. Copas

Copa nacional: **fuera del pacing del MVP** salvo que sobre tiempo. El campo `cup` puede existir como `null`. Mejor 0 copas que 1 copa que alarga cada temporada 30 segundos.
