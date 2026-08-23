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
| `gradeSeason(record)` | Nota del año (12–99 + letra). No es Legacy Score |
| `calculateLegacy(state)` | Score final de carrera |

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

Número de partidos por competición: ver [COMPETITIONS.md](../models/COMPETITIONS.md). El engine usa el calendario de la liga actual, no un 82 fijo para Europa.

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
- compañeros (rating agregado, no 12 box scores). Primer corte: `world.locker` 2–4 sombras; `estimatedStarterOverall` = max OVR (vacío: rating del club). `unhappy_minutes` pide OVR > ese techo;
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

Enfoque (PROVISIONAL; primer corte de PPG en 0.12.37):

1. Estimar **rates por 36 minutos** según posición + arquetipo + atributos.
2. Escalar por minutos reales y uso.
3. Aplicar forma y confianza al volumen de PTS (`0.9 + form/500` × `0.94 + confidence/700`). Badges. Clutch de playoffs: [§7](#7-resultado-de-equipo).
4. Añadir ruido acotado (`fork("boxscore")`).
5. Clamp a rangos creíbles por posición (un C no promedia 11 AST; un PG no promedia 14 REB). Techos por partido, tras ruido. Un PG elite se corta en AST; un C gordo, en REB/TAP. Un 99 no se va a 40 PTS.

| Pos | PTS máx | AST máx | REB máx | BLK máx |
| --- | --- | --- | --- | --- |
| PG | 33 | 12 | 9 | 1.4 |
| SG | 35 | 8.5 | 10 | 1.8 |
| SF | 33 | 7.5 | 12 | 2.5 |
| PF | 31 | 6 | 15.5 | 3.8 |
| C | 29 | 8 | 18 | 4.8 |

PTS y AST escalan también por **uso de rol** (el cartel come más posesiones, no solo más minutos):

| Rol | Uso |
| --- | --- |
| prospect | 0.68 |
| bench | 0.74 |
| rotation | 0.82 |
| sixth_man | 0.90 |
| starter | 1.00 |
| star | 1.00 |
| franchise | 1.22 |

Overall en PTS: `clamp(-0.7 + ovr × 0.025, 0.55, 1.9)` — más pendiente que el volumen de AST/REB/BLK (`0.55 + ovr × 0.009`). Un 75 y un 92 no pueden marcar casi igual.

Intención p50 PPG (batch, todas las posiciones):

| Banda | p50 |
| --- | --- |
| OVR ~75 | 14–19 |
| OVR ~85 | 26–31 |
| OVR ~92 | 28–34 |

Intenciones de firma (no fórmulas finales):

| Pos | Alto | Bajo |
| --- | --- | --- |
| PG | AST, 3PA o finishing según arquetipo | REB, BLK |
| SG | PTS, 3PA | AST vs PG, BLK |
| SF | mixto | — |
| PF | REB, finishing o stretch 3s | AST |
| C | REB, BLK, finishing | 3PA salvo stretch_big |

La calidad de competición modifica porcentajes y volumen (liga menor → más stats vacías, menos legacy weight). Ver [COMPETITIONS.md](../models/COMPETITIONS.md) `legacyWeight`.

### 6.1 Badges (PROVISIONAL)

Lista e intenciones: [PLAYER_MODEL.md](../models/PLAYER_MODEL.md) §5. Números aquí. Tope 5.

Oficio (**2 temporadas** que cumplen, no un año suelto):

| Id | Umbral por temporada |
| --- | --- |
| `sharpshooter` | 3P% ≥ 0.36 y PTS ≥ 12 |
| `floor_general` | PG/SG, AST ≥ 6.5 y TOV ≤ 3.2 |
| `lockdown` | STL+BLK ≥ 2.4 |
| `rim_protector` | C/PF, BLK ≥ 1.7 |

Un tiro (`microwave`, `clutch`, `franchise_player`): un año de sexto con ≥15 PTS; anillo o FMVP; 4 temp. en el mismo club, star/franchise dos años seguidos y reputación ≥ 58.

`franchise_player` en boxscore: ×1.03 PTS / ×1.04 AST. En el mercado, stay pasa a × 0.40 y 4 años (el max sigue × 0.48). Giro de liderazgo: `locker_voice` ([EVENT_SYSTEM.md](EVENT_SYSTEM.md) §8).

`floor_general` en boxscore: ×1.14 AST / ×0.90 TOV. En el equipo: **+0.04** al strength de playoffs y continental (clasificar / deep run). No entra al roll de campeón; eso es `clutch`.

`lockdown` / `rim_protector` en boxscore: ×1.18 STL; ×1.22 BLK / ×1.05 REB. El rival peor es abstracto: **+0.03** cada uno al mismo strength. No hay FG% del oponente en el boxscore.

Efectos en el boxscore (`applyBadges`). La UI pinta labels; no calcula umbrales.

## 7. Resultado de equipo

MVP: el equipo tiene `teamRating` (oculto). El jugador aporta un delta según OVR, rol y producción.

```
teamSeasonStrength = teamRating + playerImpact - injuriesPenalty + rng
```

Playoffs: eliminación por ronda con probabilidad según diferencia de rating vs rival generado. El roll de **campeón** suma el atributo `clutch` (`max(0, (clutch − 50) / 450)`) y **+0.07** si hay badge `clutch`. Entrar o no sigue siendo contention + OVR + uso + `teamRatingBoost` (`floor_general` +0.04, `lockdown` / `rim_protector` +0.03 cada uno); el clutch cierra series, no clasifica.

Si entras, el engine guarda un `playoffRun`: club rival (`generateTeam`, no el sombra de carrera) y marcador al mejor de 1 (formación) o 7. Copy: `formatPlayoffLine` (`4-2 ante Harbor Wolves`). No hay segundo boxscore ni rating numérico del rival.

Récord del club (`teamRecord`): `wins-losses` sobre 30 PJ (formación) o 40 (resto). Sale de contention + desenlace de playoffs + RNG acotado. Un campeón no cierra por debajo de ~58%; sin playoffs no pasa de ~52%. No es una clasificación de liga.

Continental (**PROVISIONAL**): el mismo año, el mismo club. Si `national_league` y `prestige ≥ 62`, hay knockout extra (no un segundo boxscore). Banco/prospecto o lesión gorda (≥18 PJ) no entran. Título `Continental`. Premios `CMVP` / `CFMVP`. Fatiga +8 (out) / +12 (finales o campeón). América y formación no juegan esto. Si entra, `continentalRun` es al mejor de 5 (`formatContinentalLine`).

No simular la liga entera partido a partido. Generar:

- récord del equipo del usuario;
- campeón de liga (puede ser el usuario);
- rivales de ronda.

## 8. Premios

Campo de candidatos **fantasma** generado por seed de temporada + nivel de liga (nombres + OVR fantasma). El usuario compite contra ese campo. Presentación: [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §6.

### 8.1 Elegibilidad por premio (intención LOCKED, umbrales PROVISIONAL)

| Premio | Se considera si |
| --- | --- |
| MVP | rol starter+, minutos altos, producción de uso, equipo no irrelevante (un 15–67 puro tiene penalón, no veto absoluto). No en formación. |
| DPOY | interior/perímetro D altos, STL/BLK, arquetipo defensivo ayuda. Solo `american_league`. |
| 6MOY | rol `sixth_man` o bench con minutos de bombarda; no titulares. Solo `american_league`. |
| ROY | primera temporada en `american_league` (el historial de formación no cuenta como rookie de esa liga) |
| MIP | salto claro de OVR/producción vs temporada anterior (≥6 automático; ≥4 con roll). Solo `american_league`. |
| All-Team 1/2/3 | producción + juegos; cupo por “plaza” fantasma. Nacional y americana; no en formación. Star volume≥18: en América sale; en nacional roll 0.42. Starter ≥16 con roll 0.35. Volume: PG PTS+1.2·AST; C PTS+0.8·REB+3·BLK. Un C no necesita AST. Ids: `All-Team-1` / `All-Team-2` / `All-Team-3`. |
| All-Defense 1/2 | defensa, no PPG; DPOY o perfil lockdown lo arrastra a 1ª. Solo `american_league`. Ids: `All-Defense-1` / `All-Defense-2`. Un `All-Defense` viejo cuenta como 2ª. |
| All-Rookie 1/2 | misma ventana que ROY. El ROY arrastra al equipo (casi siempre 1ª). ≥14 PTS tira a 1ª. Ids: `All-Rookie-1` / `All-Rookie-2`. Un `All-Rookie` viejo cuenta como 2ª. |
| FMVP | campeón **y** producción alta en la serie. Solo `american_league`. |
| CMVP | continental: estrella, PTS altos, deep run. Id `CMVP`. Copy `MVP continental`. |
| CFMVP | campeón continental **y** producción alta. Id `CFMVP`. Copy `FMVP continental`. |
| All-Star | umbral más bajo que All-Team; solo flag. Solo `american_league`. |
| POTY | formación: titular+ y ≥16 PTS; roll. No es un MVP. |
| All-Circuit | formación: titular+ y ≥13 PTS si no sale POTY |

El set se filtra por circuito ([CAREER_SYSTEM.md](CAREER_SYSTEM.md) §6.2). Formación: 30 PJ (mitad 15). Resto del slice: 40 PJ (mitad 20).

La **posición** entra en el volume de All-Team (un C no necesita 8 AST). El overall solo no gana placas. MVP sigue mirando PTS.

### 8.2 Snub

Si el jugador estaba en el pool de un gordo y no salió: `SeasonRecord.awardSnub` + línea en el recap. No se listan ganadores fantasma. No es un evento automático el mismo día. `award_snub` es contenido esporádico de offseason y **lee el flag**, no “PTS altos y cero placas”.

Pool (mismos umbrales que §8.1, sin el roll):

- `MVP`: star/franchise, ≥22 PTS, no ganó MVP (puede llevar All-Team).
- `All-Team`: titular+, ≥16 PTS, sin All-Team ni gordo.
- `POTY`: formación, titular+, ≥16 PTS, no ganó Jugador del año.

All-Star: flag, no minijuego ([D-09](../decisiones/DECISIONS.md)).

## 8.3 Selección (PROVISIONAL)

Ventana cada 2 años según `year` de la run ([D-10](../decisiones/DECISIONS.md)): continental / world / olympics. Un chunk, no clasificatorias. Convocatoria por OVR + reputación + salud. Capitán raro. Resultado: grupos / out / bronce / plata / oro. Knockout (`out` / medalla) guarda `foe` (país del pool, distinto al del jugador). Grupos, snub y declined no. Copy: `formatNationalStintLine` / `formatNationalChip`. Titular de recap: `Oro ante Francia.` si hay rival. Congestión: fatiga extra al año siguiente. Giro offseason `national_duty` (una vez, Juegos o Mundial): si el OVR es de convocatoria, ir carga fatiga; quedarte pone `skipNational` y el recap es `declined`. El continental no pregunta. `national_snub` solo si el recap marcó snub.

### 8.4 Nota del año (PROVISIONAL)

`gradeSeason` al cierre. Base ~36 + PTS/AST/REB acotados + playoffs + premios + medalla − lesión. Clamp 12–99. Letras: ≥88 S, ≥76 A, ≥62 B, ≥48 C, resto D. **No** entra en Legacy Score. Presentación: [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §6.4.

### 8.5 Legacy Score (PROVISIONAL)

`calculateLegacy` al retirar. Pico × 42 + temporadas × 55 + PTS/AST/REB **por temporada** × `legacyWeight` (formación 0.35, nacional 0.75, americana 1.15) + premios de liga × el mismo peso (MVP 420, DPOY/FMVP 280, ROY/MIP 160, All-Team 1ª 110 / 2ª 80 / 3ª 50, POTY 90, All-Defense 1ª 90 / 2ª 70, All-Rookie 1ª 50 / 2ª 30, All-Circuit 40) + anillos 350 × peso + continental 220 (sin peso extra) + CMVP 180 / CFMVP 200 (sin peso extra) + oro 320 / plata 180 / bronce 90 + caps 40 + badges × 90 + PJ (tope 800) + momentos × 180 (máx. 3). **No** entra el dinero. La carta enseña PPG reales, no ponderados. Un `All-Team` viejo (saves) cuenta como 2ª. Un `All-Defense` o `All-Rookie` viejo también. El report expone `caps` / `golds` / `silvers` / `bronzes` (mismos conteos que el score). Copy de la carta: [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §9.1. Pesos: [COMPETITIONS.md](../models/COMPETITIONS.md) §3.

Momentos (derivados del historial, no un campo extra en cada temporada):

| Id | Si |
| --- | --- |
| `undrafted_mvp` | no draftado y hay MVP |
| `olympic_gold` | oro en `olympics` |
| `world_gold` | oro en `world` |
| `one_club` | un solo club pro y ≥8 temporadas ahí |
| `late_bloomer` | `growthCurve: late` y el pico de OVR llega a los 25+ (≥78) |

Bandas Free (cortes sobre batch **10k**, p50 ~18k; no es un percentil inventado):

| Banda | Score |
| --- | --- |
| `local_legend` | < 14 000 |
| `national_star` | ≥ 14 000 |
| `continental` | ≥ 18 000 |
| `all_time` | ≥ 24 000 |

All-Time no es el suelo. A 22 000 el 10k daba ~21% Histórico (el batch siempre elige la primera opción, así que las carreras llegan a edad 40). Corte subido a 24 000 para acercarse a ~10%. Presentación: [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §9.

## 9. Desarrollo y regresión

Entradas:

- edad, potencial (oculto), overall actual;
- minutos, rendimiento vs expectativa de rol;
- entrenamiento (`trainingFocus`) — año 1 y años impares hasta edad 27, si no hay otro set piece;
- work ethic, coach, lesiones;
- arquetipo (techos);
- RNG acotado.

Mano dominante (PROVISIONAL): se elige en el creador ligero o se tira (~12% zurdo). Zurdo aplica un sesgo chico en generación (`finishing`/`ballHandling` +, `freeThrow` −). No es un slider.

Curva (PROVISIONAL, años de edad):

| Edad | Fase | Comportamiento |
| --- | --- | --- |
| 16–21 | desarrollo | subidas grandes posibles; potencial tira |
| 22–27 | late devel / early prime | aún hay hueco al potencial |
| 27–31 | prime | cambios pequeños; badges |
| 32+ | declive | `calculateRegression`; speed/stamina primero |

Un jugador puede superar el potencial percibido (scouting) pero el `potential` real sigue siendo techo blando: se puede pasar por poco con work ethic + RNG, no +15 permanentes. Con hueco al techo, el desarrollo tira más (un pico ≥ 90 debe existir, no ser el p50).

Late bloomer: potencial alto + desarrollo lento (modificador de curva generado en creación). Sin modo temático; es un trait oculto `growthCurve: standard | explosive | slow | late`.

## 10. Lesiones

`calculateInjuryRisk` por chunk, no por temporada entera (para permitir el evento de "volver pronto"). **Un** corte de lesión por temporada: si la primera mitad ya lesionó, la segunda no tira otra.

Factores: durability, fatiga, minutos (rol star/franchise), historial moderate, edad, RNG.

Severidades en MVP: `minor | moderate`. `severe` está en el modelo y no se tira aún.

Frecuencia objetivo (PROVISIONAL, batch 80):

- la mayoría de carreras: alguna menor;
- **~10–30%** de carreras: al menos una moderate memorable (batch 80; de cada lesión, ~9% moderate, un poco más a los 33+).
- lesiones que destrozan el run deben ser posibles pero no el modo default.

La carga de fatiga por chunk es baja (minutos y PJ, no un +50 a mitad). Si no, el segundo tramo lesionaba siempre y `lockout_fatigue` se volvía anual.

## 11. Draft stock

Función de: edad, OVR, potencial oculto (scouting ruidoso), stats, nivel de competición, racha, premios, lesiones, reputación.

Bandas visibles:

`top_3 | lottery | first_round | second_round | undrafted`

El pick concreto se resuelve al presentarte (`Rng.fork`). La ruta universidad suma **+4** al stock de scouting (PROVISIONAL). Bandas y drama:

| Banda | Pick | Sueldo | Fallo |
| --- | --- | --- | --- |
| `top_3` | 1–3 | 22 | no |
| `lottery` | 4–14 | 18 | no |
| `first_round` | 15–30 | 14 | 8% undrafted |
| `second_round` | 31–58 | 10 | 35% undrafted |
| `undrafted` | — | — | siempre |

El resultado va al `SeasonRecord.draft` de esa temporada (recap: pick + club, o “sin ser elegido”). Esperar un año: el stock se vuelve a tirar. La ventana se cierra si esperas en el techo (universidad a los 20, club a los 21). [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §5.1.

## 12. Contratos (generación)

Al acabar el contrato, 3 ofertas (no 1–2 sueldos). Números PROVISIONALES sobre OVR:

| Oferta | Salario | Años | `roleBias` | Protección | Equipo |
| --- | --- | --- | --- | --- | --- |
| quedarme (`stay`) | × 0.34 | 3 | +1 | `full` | el actual |
| quedarme con `franchise_player` | × 0.40 | 4 | +1 | `full` | el actual |
| el max (`leave`) | × 0.48 | 4 | 0 | `none` | contention 28–44 |
| anillos (`ring`) | × 0.26 | 2 | −1 | `none` | contention 80–94 |

El resolve aplica el `salary` de la oferta, no otra fórmula. `hometown_discount` no pasa por esta tabla. No hay negociación multi-ronda. Detalle de UI: [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §4.

Al cerrar el año se copia el `salary` del contrato al `SeasonRecord`. Detalle y qué pinta la UI: [CAREER_SYSTEM.md](CAREER_SYSTEM.md) §4.2.

## 13. Batches de balance

Antes de dar por buena una fórmula, el Simulation Agent debe poder responder:

- PPG p50 por posición a OVR 75 / 85 / 92
- % de carreras con peak OVR ≥ 90
- % undrafted que llegan a All-Team (denominador = undrafted; se reporta también el recorte americano)
- distribución de Legacy Score
- tasa de lesión severe
- % de carreras completas con la decisión `playoff_push` (objetivo 4–10%; máximo una vez)

Esos tests viven en `packages/engine` como tests estadísticos con seed fija (tolerancia, no snapshot exacto de cada run). CI: `runBalanceBatch(80)`. Informe largo: `pnpm sim -- --batch --n 10000`.

Lesión **severe** no está en el MVP (`minor | moderate`). El batch reporta % de carreras con al menos una `moderate`.

Snapshot 10k (`prefix=k10`, engine 0.12.40, antes de subir Histórico a 24k):

| Métrica | Valor |
| --- | --- |
| peak p50 | 81 |
| peak ≥ 90 | 14.8% |
| legacy p50 | 17 769 |
| Histórico (≥22k) | 21.4% |
| Leyenda local | 28.4% |
| lesión moderate | 23.0% |
| undrafted All-Team | 26.3% del total de carreras (métrica vieja: /n, y All-Team nacional era automático) |
| temporadas p50 | 22 (el runner coge siempre la 1ª opción: «una más») |
| giros p50 | 11 |
| PPG ~75 / ~85 / ~92 | 15.5 / 28.9 / 31.0 |

PG p50 18.7/9.5/4.0 · C 16.6/1.9/13.1. Identidad de posición intacta.

## 14. Lo que no se simula en MVP

- Cada compañero con carrera persistente.
- Táctica de entrenador por posesión.
- Faltas, plus-minus avanzado, tracking real.
- Calendario de 82 box scores en UI.
- Economía de salary cap compleja.
