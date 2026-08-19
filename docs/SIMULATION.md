# Simulation

Estado: **PROVISIONAL** en fórmulas. Los principios son **LOCKED**.

## 1. Principios (LOCKED)

1. El frontend no simula. Llama al engine.
2. Un PG y un C con el mismo overall **no** producen las mismas stats.
3. La unidad percibida es la **temporada**. El partido individual existe internamente; no se muestra posesión a posesión. El usuario pulsa **Simular temporada**; un evento esporádico puede cortar a mitad y el resto se simula con el estado nuevo.
4. El mundo es **player-centric**: no se simulan 400 carreras completas en el MVP.
5. Toda aleatoriedad pasa por `Rng` con seed y `fork`.
6. Las funciones públicas del engine deben poder testearse en aislamiento.

## 2. API conceptual

Nombres objetivo (pueden ser módulos internos; el API público sigue siendo `dispatch`):

| Función | Responsabilidad |
| --- | --- |
| `simulateGame(ctx)` | Box score del jugador + contribución abstracta al resultado |
| `simulateSeasonChunk(ctx)` | Bloque de partidos (mitad de temporada, playoffs round) |
| `simulateSeason(ctx)` | Regular season completa si no hay interrupt |
| `calculatePlayerDevelopment(ctx)` | Subida de atributos en desarrollo/prime |
| `calculateRegression(ctx)` | Bajada por edad/lesión |
| `calculateInjuryRisk(ctx)` | ¿Hay lesión en este chunk? |
| `generateContractOffers(ctx)` | Mercado al final de contrato / FA |
| `calculateDraftStock(ctx)` | Proyección y pick |
| `calculateAwards(ctx)` | Premios del jugador vs campo generado |
| `calculateLegacy(state)` | Score final |

No invocar estas funciones desde React.

## 3. Modelo de tiempo

```
Año de carrera
  ├── Offseason / decisiones estructurales (draft, contrato, entrenamiento)
  ├── Regular season   ← un solo “Simular” de cara al usuario
  │     └── progreso 0→1 interno
  │           └── posible CORTE esporádico (evento / lesión)
  │                 → decisión → se reanuda el resto del año
  ├── Awards
  ├── Playoffs (si aplica; por rondas)
  ├── Selección (si año de torneo y convocado)
  └── Aging + development/regression
```

La UI **no** para siempre en “media temporada”. Los cortes internos (chunks, progreso 0–1, N partidos agregados) existen para que un giro a mitad de año cambie minutos, fatiga y resultado del tramo que queda.

Número de partidos por competición: ver [COMPETITIONS.md](COMPETITIONS.md). El engine usa el calendario de la liga actual, no un 82 fijo para Europa.

**LOCKED como intención:** simular el año de un tirón, salvo interrupt esporádico o set piece estructural.

**PROVISIONAL:** internamente 1–2 puntos de chequeo (p.ej. 35% y 70% de la regular season) donde se tira lesión/evento. Playoffs por rondas. Si no sale nada, el usuario no ve esos chequeos.

## 4. Contexto de simulación

Cada sim lee, como mínimo:

- posición, arquetipos, atributos, badges;
- edad, overall;
- minutos esperados (rol + coach + fatiga + lesión);
- rol;
- nivel de equipo y de competición;
- moral, forma, fatiga;
- relación coach (ajuste menor de uso);
- compañeros (rating agregado, no 12 box scores);
- historial reciente (confianza).

## 5. Minutos y uso

```
expectedMinutes = f(role, teamDepth, coachRelation, morale, injury)
usage = f(role, archetype, ballHandling, passing, teamNeed)
```

Roles → minutos objetivo (PROVISIONAL, 40 min partidos):

| Rol | MIN/partido |
| --- | --- |
| prospect | 6–12 |
| bench | 8–16 |
| rotation | 16–22 |
| sixth_man | 20–26 |
| starter | 26–32 |
| star | 32–36 |
| franchise | 34–38 |

Fatiga alta recorta minutos. Lesión puede poner MIN=0 en un chunk.

## 6. Producción de stats

Las stats visibles:

`PTS, AST, REB, STL, BLK, TOV, FG%, 3P%, FT%, MIN`

Enfoque (PROVISIONAL, a calibrar con batches):

1. Estimar **rates por 36 minutos** según posición + arquetipo + atributos.
2. Escalar por minutos reales y uso.
3. Aplicar forma, confianza, clutch (playoffs), badges.
4. Añadir ruido acotado (`fork("boxscore")`).
5. Clamp a rangos creíbles por posición (un C no promedia 11 AST; un PG no promedia 14 REB salvo rareza extrema).

Intenciones de firma (no fórmulas finales):

| Pos | Alto | Bajo |
| --- | --- | --- |
| PG | AST, 3PA o finishing según arquetipo | REB, BLK |
| SG | PTS, 3PA | AST vs PG, BLK |
| SF | mixto | — |
| PF | REB, finishing o stretch 3s | AST |
| C | REB, BLK, finishing | 3PA salvo stretch_big |

La calidad de competición modifica porcentajes y volumen (liga menor → más stats vacías, menos legacy weight). Ver [COMPETITIONS.md](COMPETITIONS.md) `legacyWeight`.

## 7. Resultado de equipo

MVP: el equipo tiene `teamRating` (oculto). El jugador aporta un delta según OVR, rol y producción.

```
teamSeasonStrength = teamRating + playerImpact - injuriesPenalty + rng
```

Playoffs: eliminación por ronda con probabilidad según diferencia de rating vs rival generado.

No simular la liga entera partido a partido. Generar:

- récord del equipo del usuario;
- campeón de liga (puede ser el usuario);
- rivales de ronda.

## 8. Premios

Campo de candidatos **fantasma** generado por seed de temporada + nivel de liga (nombres + OVR fantasma). El usuario compite contra ese campo. Presentación: [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §6.

### 8.1 Elegibilidad por premio (intención LOCKED, umbrales PROVISIONAL)

| Premio | Se considera si |
| --- | --- |
| MVP | rol starter+, minutos altos, producción de uso, equipo no irrelevante (un 15–67 puro tiene penalón, no veto absoluto) |
| DPOY | interior/perímetro D altos, STL/BLK, arquetipo defensivo ayuda |
| 6MOY | rol `sixth_man` o bench con minutos de bombarda; no titulares |
| ROY | primera temporada pro en esa liga (o edad/experiencia de rookie) |
| MIP | salto claro de OVR/producción vs temporada anterior |
| All-Team 1/2/3 | producción + juegos; cupo por “plaza” fantasma |
| All-Defense | defensa, no PPG |
| All-Rookie | misma ventana que ROY |
| FMVP | campeón **y** producción alta en la serie |
| All-Star | umbral más bajo que All-Team; solo flag |

La **posición** entra en el score de premio (un C no necesita 8 AST para All-Team). El overall solo no gana placas.

### 8.2 Snub

Si el jugador estaba en el pool de un gordo y no salió: flag `awardSnub` + línea en el recap. No es un evento automático el mismo día. `award_snub` es contenido esporádico de offseason.

All-Star: flag, no minijuego ([D-09](DECISIONS.md)).

## 9. Desarrollo y regresión

Entradas:

- edad, potencial (oculto), overall actual;
- minutos, rendimiento vs expectativa de rol;
- entrenamiento (`trainingFocus`);
- work ethic, coach, lesiones;
- arquetipo (techos);
- RNG acotado.

Curva (PROVISIONAL, años de edad):

| Edad | Fase | Comportamiento |
| --- | --- | --- |
| 16–21 | desarrollo | subidas grandes posibles; potencial tira |
| 22–27 | late devel / early prime | aún hay hueco al potencial |
| 27–31 | prime | cambios pequeños; badges |
| 32+ | declive | `calculateRegression`; speed/stamina primero |

Un jugador puede superar el potencial percibido (scouting) pero el `potential` real sigue siendo techo blando: se puede pasar por poco con work ethic + RNG, no +15 permanentes.

Late bloomer: potencial alto + desarrollo lento (modificador de curva generado en creación). Sin modo temático; es un trait oculto `growthCurve: standard | explosive | slow | late`.

## 10. Lesiones

`calculateInjuryRisk` por chunk, no por temporada entera (para permitir el evento de "volver pronto").

Factores: durability, fatiga, minutos, historial grave, edad, RNG.

Severidades:

- minor: 1–4 partidos, sin lasting effect
- moderate: chunk afectado, fatiga/forma
- severe: resto de temporada o más, posible hit a speed/stamina/finishing, impacto draft/contrato

Frecuencia objetivo (PROVISIONAL, a validar con 10k runs):

- la mayoría de carreras: varias menores;
- ~15–25% de carreras: al menos una moderate/severe memorable;
- lesiones que destrozan el run deben ser posibles pero no el modo default.

## 11. Draft stock

Función de: edad, OVR, potencial oculto (scouting ruidoso), stats, nivel de competición, racha, premios, lesiones, reputación.

Bandas visibles:

`top_3 | lottery | first_round | second_round | undrafted`

El pick concreto se resuelve el día del draft con RNG fork. Presentarse con stock `second_round` tiene riesgo real de undrafted.

Detalle de flujo: [CAREER_SYSTEM.md](CAREER_SYSTEM.md).

## 12. Contratos (generación)

`generateContractOffers` produce 1–3 ofertas según OVR, edad, rol, reputación, salud y mercado (RNG).

Cada oferta: salario, años, equipo (nivel + competición), rol esperado, opción player/team.

El usuario elige. No hay negociación multi-ronda en el MVP.

## 13. Batches de balance

Antes de dar por buena una fórmula, el Simulation Agent debe poder responder:

- PPG p50 por posición a OVR 75 / 85 / 92
- % de carreras con peak OVR ≥ 90
- % undrafted que llegan a All-Team
- distribución de Legacy Score
- tasa de lesión severe

Esos tests viven en `packages/engine` como tests estadísticos con seed fija (tolerancia, no snapshot exacto de cada run).

## 14. Lo que no se simula en MVP

- Cada compañero con carrera persistente.
- Táctica de entrenador por posesión.
- Faltas, plus-minus avanzado, tracking real.
- Calendario de 82 box scores en UI.
- Economía de salary cap compleja.
