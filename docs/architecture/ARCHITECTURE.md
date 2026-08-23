# Architecture

Estado: **PROVISIONAL** para el MVP. Los principios de separación engine/UI son **LOCKED**.

## 1. Principios (LOCKED)

1. El **game engine es TypeScript puro**, sin React, sin Next, sin Prisma, sin `window`, sin `fs`.
2. Dado `(state, command, rng)`, el engine es **determinista**.
3. La UI no calcula overall, stats, lesiones ni legacy. Solo muestra view models.
4. El backend no reimplementa reglas de juego. Llama al mismo package `engine`.
5. `/docs` manda sobre el código. El código no inventa reglas. KISS/DRY: [docs/README.md](../README.md).
6. Mobile-first. Web app, no motor 3D.

## 2. Stack propuesto

| Capa | Tecnología | Notas |
| --- | --- | --- |
| App | Next.js (App Router) + React + TypeScript | SSR donde ayude al marketing/auth; la partida es cliente + validación servidor |
| Estilos | Tailwind CSS | Mobile-first |
| Engine | TypeScript (package propio) | Vitest |
| Contenido | JSON/YAML versionado en `packages/content` | Eventos, nombres, arquetipos |
| Persistencia | PostgreSQL | Usuarios, runs, rankings. Estado de carrera como JSON |
| Hosting | Railway (app + Postgres) | Revisable en [D-14](../decisiones/DECISIONS.md) |
| E2E | Playwright | Flujos críticos, no simulación de balance |
| Auth | **OPEN** ([D-12](../decisiones/DECISIONS.md)) | Necesaria para rankings oficiales |

No usar Jest si Vitest cubre engine y unit tests. Un solo runner de unit/integration.

## 3. Monorepo

Gestor de paquetes recomendado: **pnpm workspaces**.

```
TheClutch/
├── AGENTS.md
├── README.md
├── docs/                         # fuente de verdad
│   ├── architecture/
│   ├── models/
│   ├── rules/
│   ├── roadmap/
│   ├── agents/
│   └── decisiones/
├── .cursor/rules/                # reglas de agentes
├── .cursor/skills/               # skills de especialistas
├── packages/
│   ├── engine/                   # simulación pura
│   │   └── src/
│   │       ├── rng/
│   │       ├── state/            # CareerState, commands, reduce
│   │       ├── player/           # generación, overall, archetypes
│   │       ├── development/
│   │       ├── simulation/       # game, season, awards
│   │       ├── contracts/
│   │       ├── draft/
│   │       ├── events/           # evaluador, no textos
│   │       ├── injuries/
│   │       ├── legacy/
│   │       └── index.ts
│   ├── content/                  # datos: eventos, nombres, badges
│   └── shared/                   # tipos Zod/TS compartidos (opcional al inicio)
└── apps/
    └── web/                      # Next.js
        ├── app/                  # rutas UI + API
        ├── components/
        ├── server/               # db, auth, replay Daily
        └── lib/                  # adapters, no reglas de juego
```

El engine vive en `packages/engine`. No crear features de juego dentro de `apps/web`.

## 4. Separación del Game Engine

### 4.1 Contrato público

El engine expone un API pequeño:

```ts
createCareer(input: CreateCareerInput): CareerState
dispatch(state: CareerState, command: Command): DispatchResult
replay(input: CreateCareerInput, commands: Command[]): ReplayResult
getViewModel(state: CareerState): CareerViewModel
```

- `createCareer` usa una seed para generar jugador + contexto inicial.
- `dispatch` aplica **un** comando y devuelve estado nuevo + `applied`. Un comando ilegal no muta el juego (`applied: false`). Los aplicados van a `meta.commands`.
- `replay` reduce el log desde `createCareer`. Falla si un comando es ilegal o el log supera `MAX_COMMANDS`. El servidor Daily llamará esto; no se fía de un score del cliente.
- `getViewModel` proyecta estado interno a lo que la UI puede mostrar (respeta atributos ocultos).

Nadie fuera del engine importa módulos internos (`simulation/season.ts`, etc.). Solo el barrel `index.ts`.

### 4.2 RNG

```ts
type Rng = {
  next(): number        // [0, 1)
  fork(label: string): Rng
}
```

- PRNG con seed (p.ej. mulberry32 + hash de string).
- Cada subsistema hace `fork("injuries")`, `fork("games")`, para que añadir un evento no desplace toda la secuencia de lesiones.
- El estado guarda `rngState` para replay.

Ver [DAILY_MODE.md](../rules/DAILY_MODE.md) para seeds de jugador vs seeds de run.

### 4.3 Estado y comandos

`CareerState` es un documento versionado (`schemaVersion`). Se serializa entero a PostgreSQL.

Comandos (lista inicial, PROVISIONAL):

- `SIMULATE_NEXT` — avanza la temporada hasta un interrupt esporádico o el fin de fase
- `RESOLVE_EVENT` — `{ eventId, optionId }`
- `SET_TRAINING_FOCUS`
- `ACCEPT_CONTRACT` / `REJECT_CONTRACT`
- `DECLARE_DRAFT` / `WITHDRAW_DRAFT`
- `REQUEST_TRADE`
- `RESOLVE_TRADE` — aceptar o pelear un `system.traded`
- `RETIRE` / `PLAY_ANOTHER_YEAR`

La UI nunca muta `CareerState` a mano. `meta.commands` lo escribe `dispatch`.

### 4.4 Dónde corre

| Contexto | Engine | Motivo |
| --- | --- | --- |
| Partida en el navegador | Sí | Latencia cero, sensación de juego |
| API de submit Daily/Challenge | Sí (replay) | Anti-trampa: se reejecuta el log de comandos |
| Tests / balance batches | Sí | Simular 10k carreras en Node |

El servidor **no se fía** de un Legacy Score enviado por el cliente. Recibe `commands[]` y el `playerSeed`/`runSeed`, recrea y compara.

### 4.5 Contenido

`packages/content` exporta datos. El engine recibe los eventos como estructura ya parseada (inyección). Así se pueden testear eventos sin Next y se puede hot-reload de contenido más adelante.

## 5. Modelo de datos persistido

El engine vive en JSON. Postgres guarda metadatos y ranking.

MVP cliente (PROVISIONAL, [D-18](../decisiones/DECISIONS.md)): `apps/web` guarda el `CareerState` en `localStorage` (`theclutch:s{schema}:{seed}:…` en Free; `theclutch:s{schema}:daily|{challenge}:…` en Daily/Challenge). Un refresh reanuda la misma run. El intento Daily del día es una clave local; **no** es ranking. Cloud y replay quedan para auth.

### 5.1 Tablas iniciales (PROVISIONAL)

```
users
  id, display_name, created_at
  auth_subject            -- depende de D-12

career_runs
  id
  user_id                 -- nullable si invitados
  mode                    -- free | daily | challenge
  player_seed             -- seed de generación
  run_seed                -- seed de RNG de partida
  daily_date              -- si daily
  challenge_code          -- si challenge
  content_version
  engine_version
  schema_version
  commands                -- JSON: Command[]
  final_state             -- JSON opcional / o solo hash
  legacy_score
  is_official             -- primer intento daily, etc.
  status                  -- in_progress | retired | abandoned
  created_at, finished_at

daily_definitions
  date                    -- YYYY-MM-DD (UTC)
  player_seed
  snapshot                -- JSON del jugador inicial + world flavor
  content_version

leaderboard_entries
  id
  period                  -- daily:date | weekly:iso-week
  user_id
  run_id
  legacy_score
  unique (period, user_id) para oficial
```

No normalizar stats de cada partido en tablas relacionales en el MVP. Van dentro del estado JSON. Si más adelante hay perfil público rico, se materializan al retirar.

### 5.2 Documento CareerState (resumen)

Ver tipos canónicos en [PLAYER_MODEL.md](../models/PLAYER_MODEL.md) y [CAREER_SYSTEM.md](../rules/CAREER_SYSTEM.md).

Bloques:

- `meta` (seeds, versiones, mode)
- `player`
- `world` (equipo actual, liga, coach abstracto, compañeros-sombra)
- `calendar` (año, fase de temporada)
- `season` (stats live)
- `history` (temporadas, premios, equipos, lesiones, momentos)
- `pendingInterrupt` (evento, oferta, draft, retiro)
- `rng`

## 6. Frontend

- Next.js 16 sobre Node.js 22+; build de producción con Webpack mientras Turbopack no sea validable en todos los entornos del proyecto. La infraestructura Railway se declara en `.railway/railway.ts` con el SDK oficial versionado.
- Soporte web: Chrome/Edge 111+, Firefox 111+ y Safari/iOS 16.4+. Playwright cubre Chromium móvil, Firefox escritorio y WebKit móvil; `browserslist` conserva los mismos mínimos para CSS/transpilación. Navegadores legacy, incluido Internet Explorer, quedan fuera.
- App Router. Rutas mínimas de MVP: landing (Daily + Free), play (`mode=free|daily|challenge`), season-report, legacy.
- Componentes tontos respecto al juego: reciben view models.
- Un hook/store `useCareer()` habla con el engine en cliente y sincroniza al servidor en puntos de control (fin de temporada / fin de carrera). No cada comando, al menos al inicio.
- Accesibilidad: targets 44px, contraste, foco visible, no depender del color para rol/forma. Móvil y tablet: una columna; las decisiones son la misma carta, no un menú extra.
- La pre-alpha emite telemetría first-party de embudo (`landing_view`, inicio por modo, carrera terminada, replay y feedback). **Sin cookies, cuenta, IP persistida, user-agent, nombre de jugador, seeds, decisiones ni identificador persistente.** El endpoint valida una lista cerrada y persiste solo `{event, viewport, createdAt}` en PostgreSQL. Si la base no está disponible, degrada a log estructurado sin romper el juego.
- El feedback explícito guarda `rating`, banda de dispositivo, punto del flujo, comentario y fecha. No guarda identidad técnica. Validación cerrada, honeypot, límites de longitud y cuerpo; sin panel público de comentarios.
- `/estado` muestra únicamente métricas agregadas de 7 días (inicios, finales, repetición y feedback), nunca texto de feedback ni filas individuales.
- Los errores de cliente se reducen a una categoría cerrada, ruta pública normalizada y fecha. No se envían mensajes libres, stack, estado de carrera ni query string.
- PWA ligera: manifest, iconos propios y service worker network-first. Nunca cachear ni enviar `localStorage`; una actualización no debe borrar carreras.

## 7. Backend

Responsabilidades:

- Auth.
- CRUD de runs (guardar log).
- Materializar Daily a medianoche UTC (o on-demand con lock).
- Replay + insert oficial de ranking.
- Rate limit de submits.
- Persistencia mínima de telemetría y feedback de pre-alpha; no toca ni reimplementa el engine.

No:

- Recalcular desarrollo con SQL.
- Generar texto de eventos.

## 8. Testing

| Tipo | Dónde | Qué |
| --- | --- | --- |
| Unit | `packages/engine` | overall, RNG forks, development clamps, event matcher |
| Simulación | `packages/engine` | 1k–10k carreras: distribuciones de OVR, PPG por posición, lesion rates |
| Integration | `apps/web/server` | replay Daily, primer intento oficial |
| E2E | Playwright | crear run, simular hasta evento, terminar carrera (happy path) |

Un test de engine **no** debe montar React.

## 9. Versionado

Toda run guarda `engine_version` + `content_version`. Un cambio de fórmula no reescribe rankings pasados. Daily de un día usa las versiones vigentes ese día.

## 10. Seguridad (Daily)

Asumir cliente hostil.

- El score oficial sale del replay servidor.
- Rechazar logs imposibles (comando cuando no hay interrupt de ese tipo).
- Limitar longitud de `commands[]`.
- Idempotencia del primer intento.

No es anti-cheat de nivel competitivo AAA. Es suficiente para un ranking casual honesto.

## 11. Lo que no entra en arquitectura todavía

- Microservicios.
- Cola de jobs pesada (un cron/worker para daily basta).
- Simulación distribuida.
- CMS de eventos con UI admin (los eventos viven en git al inicio).
