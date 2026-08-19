# Daily Mode & Challenge Seeds

Estado: requisitos de producto **LOCKED**. Detalle de RNG y rankings **PROVISIONAL**.

## 1. Promesa (LOCKED)

Cada día, **todos** los usuarios reciben el **mismo jugador inicial** (mismas condiciones de salida).

Las **decisiones** (y la suerte de cada run) producen carreras distintas.

El primer intento oficial cuenta para ranking. Se puede repetir por diversión sin pisar el resultado oficial.

## 2. Seeds

Hay dos semillas distintas. No mezclarlas.

| Seed | Determina | Compartida |
| --- | --- | --- |
| `playerSeed` | país, edad, altura, posición, equipo inicial, arquetipo, atributos, potencial, personalidad, contexto | sí (Daily / Challenge) |
| `runSeed` | RNG de simulación (partidos, lesiones, ofertas concretas, orden de eventos candidatos) | no, salvo [D-06](DECISIONS.md) |

### 2.1 Daily playerSeed

```
playerSeed = hash("theclutch:daily:" + YYYY-MM-DD + ":" + contentVersion)
```

Fecha en **UTC**. El Daily cambia a las 00:00 UTC. Documentar en UI el reset.

`daily_definitions` materializa el snapshot para no depender de un cambio accidental de generador a mitad del día: si se despliega un bugfix de generación, el Daily ya publicado permanece. Los días nuevos usan el generador nuevo.

### 2.2 Challenge code

Formato objetivo (PROVISIONAL):

```
BK-7H42-K9P1
```

- Prefijo `BK` (basket). Ajustable con el brand.
- Caracteres unívocos (evitar 0/O, 1/I).
- El código **es** la playerSeed (o un encoding de 64 bit).
- Versionar: si el generador cambia, o bien el código incluye versión (`BK1-…`) o los códigos viejos se marcan incompatibles.

Un usuario comparte el código, no su `runSeed`. Frase de producto:

> Intenta hacer una carrera mejor que la mía con este jugador.

Eso implica **mismo jugador, distinta suerte**, salvo que cerremos D-06 en modo "RNG locked".

## 3. Qué queda fijado por playerSeed

**LOCKED:**

- nacionalidad, nombre, edad de inicio, altura;
- posición, arquetipo;
- atributos iniciales, potencial, growthCurve, durability, personalidad;
- contexto inicial (circuito, equipo de salida, flavor).

**No** fijado por playerSeed:

- resultados de partidos;
- qué evento concreto cae entre varios candidatos válidos (salvo que D-06 diga lo contrario);
- ofertas exactas de contrato;
- pick exacto de draft;
- lesiones.

Así, "las mismas condiciones iniciales" se cumple sin clonar la carrera entera.

## 4. Intentos oficiales

Daily:

- `is_official = true` solo el **primer** `career_runs` terminado (retired) de ese `user_id` + `daily_date`.
- Abandonar a mitad: **OPEN** si consume el intento [D-11](DECISIONS.md). Recomendación: el intento se consume al **primer `SIMULATE_NEXT`**, no al abrir la carta. Así no pisa un mis-tap, pero tampoco permite scouting infinito.
- Replays no oficiales: mismo `playerSeed`, `runSeed` nuevo, no escriben leaderboard.

Challenge:

- Ranking global por código: **fuera de MVP** o mínimo (best score por user+code). Producto inicial: honor entre amigos + score en la carta.
- El código no exige cuenta; el ranking sí.

## 5. Validación servidor

```
POST /runs/submit
  { mode, playerSeed, runSeed, commands[], clientEngineVersion }
```

Servidor:

1. Verifica seed (Daily date coincide con snapshot; Challenge parseable).
2. `createCareer` + reduce `commands`.
3. Comprueba que cada comando era legal en ese estado.
4. Calcula `legacy_score`.
5. Si official slot libre, inserta leaderboard.

Rechazar si `commands.length` es absurdo o `engine_version` no coincide con la permitida ese día.

## 6. Rankings

### 6.1 Diario

Orden: `legacy_score` DESC. Tie-break **PROVISIONAL**: menor número de temporadas, luego `finished_at` más temprano. Evitar empates eternos.

Mostrar: puesto, nombre, peak OVR, un título resumen, score. No hace falta la carta completa en la tabla.

### 6.2 Semanal

**OPEN** la métrica [D-15](DECISIONS.md). Candidatos:

- suma de dailies oficiales de la semana ISO;
- media;
- mejor daily de la semana.

Recomendación: **suma de dailies jugados**, 0 si no jugó. Premia constancia. Documentar que no jugar es 0, no "no cuenta".

## 7. Fairness y suerte

El Daily es un juego de decisiones **y** varianza. Eso es aceptable si:

- la varianza no aplasta las decisiones (una lesión severe no debería ser 40% de los runs);
- el ranking es casual, no prize pool;
- la carta de legacy explica momentos (el usuario entiende por qué su score).

Si en playtest el top 10 es indistinguible de "no me lesié", subir el peso de decisiones (contratos, draft) o bajar lesiones severe.

## 8. UI mínima

- Countdown al próximo Daily.
- Carta de "hoy toca: SF Sharpshooter, 18, 198 cm, …" sin revelar potencial.
- Banner de intento oficial vs fun run.
- Al terminar: score, percentil del día (si n ≥ umbral; si no, "ranking en construcción"), share, Challenge-equivalent del daily (`playerSeed` encodeado) para retar a un amigo con el jugador de hoy.

## 9. Privacidad

Leaderboard: display name, no email. Poder no aparecer (**OPEN**, nice-to-have post-MVP).
