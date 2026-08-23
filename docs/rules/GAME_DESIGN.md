# Game Design

Estado: **PROVISIONAL** salvo donde se indica LOCKED.

## 1. Qué es el juego

TheClutch es un **simulador de carrera de baloncesto** web, mobile-first.

El usuario no controla los partidos. Toma decisiones. El motor simula la vida deportiva de un jugador desde sus primeros años hasta la retirada.

Promesa de experiencia:

> Fácil de empezar, rápido de jugar, difícil de dejar.

Objetivo de sesión: una carrera completa en **10–20 minutos**, con ganas de pulsar "una más".

## 2. Pilares (LOCKED)

1. **Rapidez** — una carrera cabe en un descanso. El tiempo del usuario se gasta en decisiones, no en menús ni en simular posesión a posesión.
2. **Profundidad oculta** — el motor es rico; la UI muestra poco y claro.
3. **Rejugabilidad** — Daily, Challenge seeds y varianza controlada hacen que cada run cuente.
4. **Identidad de basket** — no es un reskin de un manager de fútbol. Posiciones, arquetipos, clutch, draft y legado deben sentirse a baloncesto.
5. **Agencia** — las decisiones cambian trayectorias. El RNG no debe anular la sensación de autoría.
6. **KISS / DRY** — la pieza más pequeña que cumpla el diseño. Un concepto, un dueño (doc o módulo). Nada “por si acaso”.

## 3. Qué no es (LOCKED)

- No es NBA 2K ni un juego de arcade de partidos.
- No es un tycoon de franquicia / modo mánager de equipo.
- No es una base de datos de ligas reales con licencias.
- No usa un LLM durante la partida para resolver eventos.
- No es Unity ni 3D.

## 4. Fantasía del jugador

"Soy un jugador de basket. Quiero llegar lo más lejos posible con *esta* carta de salida. Mis decisiones —ruta, draft, contrato, salud, ego— escriben el legado."

La emoción objetivo no es "he ganado este partido", sino:

- "¿Me presento al draft este año?"
- "Cojo el dinero o me voy al contender?"
- "Esta lesión me ha cambiado la carrera."
- "9.284 de Legacy. Top 4%."

## 5. Loop principal (LOCKED a nivel de diseño)

```
Crear o recibir jugador
  → Simular temporada
       ↳ (a veces) evento esporádico → la temporada / la carrera cambian
  → ver stats y resumen
  → offseason: entrenamiento, contrato, draft si toca
  → desarrollo o declive
  → envejecer
  → retirada
  → Legacy Score
  → nueva carrera
```

La unidad de tiempo que el usuario percibe es la **temporada**, no el partido. Ver [SIMULATION.md](SIMULATION.md).

### 5.1 Temporada = flujo. Eventos = giros. (LOCKED)

El verbo principal es **Simular temporada**. En la mayoría de los años no pasa nada especial: stats, un resumen, siguiente.

Los eventos **no** son un cuestionario cada temporada. Son **esporádicos**. Cuando aparecen, tienen que poder **desviar el camino**: minutos, rol, equipo, salud, draft, contrato, selección, retiro.

Dos tipos de parada, no mezclarlos:

| Tipo | ¿Cuándo? | Ejemplos |
| --- | --- | --- |
| **Estructural** | Siempre que el calendario lo exige | Draft, ofertas de contrato, focus de entrenamiento, prompt de retiro |
| **Esporádico** | Solo si el estado lo justifica y el RNG acotado dispara | Banco con OVR de starter, lesión, snub de selección, llamada de un contender |

Un evento que solo mueve moral ±3 y no cambia el resto de la temporada es ruido, no contenido.

Si un evento esporádico corta a mitad de año, el usuario decide (o asume el golpe) y **el resto de la temporada se simula con el estado nuevo**. Pedir el traspaso en febrero no puede resolverse en junio como si no hubiera pasado.

## 6. Modos de carrera

| Modo | Descripción | MVP |
| --- | --- | --- |
| Free Career | Jugador generado (o creado de forma ligera). Sin ranking. | Fase 1–2 |
| Daily Career | Mismo jugador inicial para todos, seed `YYYY-MM-DD` UTC. | Primer corte local (sin ranking) |
| Challenge Career | Seed compartible (`BK1-D-…` Daily o `BK1-X-…` ficha). | Primer corte local (honor) |
| Themed careers | Wonderkid, Underdog, etc. | Fuera de MVP |

Detalle en [CAREER_SYSTEM.md](CAREER_SYSTEM.md) y [DAILY_MODE.md](DAILY_MODE.md).

## 7. Lo que el usuario ve vs lo que el motor usa

Visible en MVP (PROVISIONAL):

- Identidad: nombre y apellido opcionales en Free (un solo nombre no rellena el apellido de la seed), país (**España**, no `ES`), edad, altura, posición en castellano (`Base`, no `PG`), mano, arquetipo en castellano, un adjetivo de carácter (no los 5 traits). Scout en bandas (`Techo de estrella`), no el potencial.
- Overall, rol, equipo, contrato resumido (sueldo en `$NM`, años, cláusula **no trade** si `full`), chip de vestuario (no una barra de fama).
- Rival sombra (nombre, club, línea del año). Raro: un giro a mitad si te está comiendo (`rival_heat`). No su carrera completa.
- Forma, fatiga, moral (simplificados, no 12 barras).
- Stats de temporada, **nota del año** (letra + puntuación, no Legacy Score), **etapas de club compactas** (cronológicas, T1 arriba) y un log anual que se lee de un vistazo. Copa junto a Liga / Continental; la UI no calcula el palmarés.
- Eventos y decisiones; en el recap, las que marcaste ese año. Lesión en castellano (tipo + gravedad + PJ). Badges nuevos de esa temporada.
- Premios, títulos, **selección (caps, oros)** y legacy al retirar: **banda** (Leyenda local → Histórico) + score + **0–3 momentos**. No un percentil inventado en Free ni en el Daily local.

Oculto o parcial (LOCKED como principio):

- Potencial exacto (se intuye por scouting / desarrollo).
- Fórmulas de simulación.
- Atributos secundarios y pesos por posición.
- Probabilidades internas de lesión, draft stock, ofertas.
- Ratings completos de todos los compañeros y rivales.

El usuario nunca debe necesitar una wiki de fórmulas para pasárselo bien. Los jugadores hardcore pueden aprender patrones. **No** se muestra el % interno de un evento: el giro aparece o no; la opción puede tener un `roll` oculto. Una ruleta anual de “elige evento” rompe Copero.

## 8. Decisiones que importan

Toda decisión de diseño se evalúa con: **¿cambia una carrera de forma memorable en 10–20 minutos?**

Familias de decisiones (contenido en [EVENT_SYSTEM.md](EVENT_SYSTEM.md) y [CAREER_SYSTEM.md](CAREER_SYSTEM.md)):

- Ruta formativa (club en casa vs universidad en América).
- Draft (presentarse vs esperar). El recap enseña el pick o el vacío.
- Contrato (dinero vs minutos vs anillos vs prestigio vs **protección ante un trade**). En el MVP: 3 ofertas; quedarte trae `full`, el max y los anillos no.
- Rol y minutos (hablar con el coach, pedir traspaso, aceptar banco).
- Destino (en la liga americana el club puede moverte; tú a veces solo asumes o peleas).
- Salud (volver pronto vs recuperar).
- Identidad (posición, agente, club de por vida, **volver a casa**: liga de origen si eres veterano en América).
- Retiro (una temporada más).

Si una decisión no puede mover overall, rol, equipo, salud, reputación o legado de forma perceptible, no es una decisión de carrera: es ruido.

## 9. Ritmo de una carrera

Objetivo de pacing (PROVISIONAL):

- ~16–22 temporadas jugables por carrera típica (salida ~16–19 años, retiro ~34–40).
- **~2 de cada 3 temporadas:** un botón, un resumen, cero eventos esporádicos.
- **~1 de cada 3:** un giro (evento o lesión). Casi nunca dos giros el mismo año.
- Set pieces estructurales (draft, contrato gordo, Finals, retiro) sí pueden alargar ese año: son las temporadas que se recuerdan.
- Tope de decisiones esporádicas por carrera: **~8–12**. Más las 5–8 estructurales. Si hay fatiga de popups, hemos fallado. El engine corta los musts de sabor a 8 (`SPORADIC_MUST_CAP`); banco, lesión, trade y recaps gordos siguen cortando.

Eso es lo que hace “una más”: el flujo es barato; el giro duele o premia.

## 10. Progresión: tres edades (LOCKED)

1. **Desarrollo** — el overall puede subir rápido; el rol es frágil; el potencial importa.
2. **Prime** — producción y badges; las decisiones son de anillos/dinero/legado.
3. **Declive** — regresión, lesiones, roles menores, tentación de una temporada más.

Un mismo overall no significa la misma carrera: un PG de 82 y un C de 82 producen stats distintas. Ver [PLAYER_MODEL.md](../models/PLAYER_MODEL.md) y [SIMULATION.md](SIMULATION.md).

## 11. Variación de trayectoria (LOCKED como intenciones)

El motor debe poder generar, sin modos temáticos todavía:

- explosión joven;
- desarrollo lento;
- late bloomer;
- estancamiento;
- lesión que tuerce la curva;
- superar el potencial percibido.

Eso sale de potencial oculto, work ethic, minutos, salud y RNG acotado — no de flags narrativos sueltos.

## 12. Economía de atención (UI)

La CTA superior dice explícitamente que abre el reto diario. El primer pantallazo aclara: temporada como unidad, decisiones solo cuando cambian el camino, guardado local y sesión de 10–20 min.

Mobile-first. Una acción primaria por pantalla. En la landing el Daily es la CTA de arriba (código `BK1-D-YYMMDD` copiable); Free sigue debajo. Al retirar, la ficha trae `BK1-X-…` para retar con esa carta. Daily/Challenge no tienen **Otra carta**. Tipografía y números grandes. El overall, el rol y la decisión actual mandan. **Simular temporada** avanza hasta el giro o el recap; no un segundo botón de autoplay. Si el siguiente paso es draft / gym / mercado, el botón nombra ese corte; un giro raro no se spoilea. Si hay giro esporádico, esa carta es la pantalla (el historial espera). El de mitad enseña la línea del tramo (PJ, rol, PTS), no el log. Un corte estructural (draft, gym, mercado, retiro) deja el log debajo: **Ver el año** sirvió para verlo. Tras el recap, **Ver el año** no simula ni abre el retiro: la ficha queda en una banda (posición en castellano, rol, minutos, sueldo, OVR) y el log enseña el año que acabas de jugar. Si toca colgarlas, el siguiente CTA es `¿Una más?` o `Cerrar carrera` (sin un segundo **Retirarse**). **Retirarse** no aparece apagado: solo cuando ya puedes colgarlas y el CTA no es ya el retiro. Las 14 stats no se muestran a la vez. Tablet: la misma columna, un poco más ancha. Targets ≥44px y foco visible. El giro de lifestyle usa esta carta; no hay tienda ([CAREER_SYSTEM.md](CAREER_SYSTEM.md) §4.2).

Identidad visual (**PROVISIONAL**): cada club ficticio tiene un **escudo procedural** derivado de su `id` (silueta + paleta + marca + iniciales). Nunca APIs ni packs de clubs/ligas reales. Prohibido logos, nombres o plantillas de NBA, EuroLeague u otros ([COMPETITIONS.md](../models/COMPETITIONS.md)). El jersey y el escudo son presentación; la UI no calcula overall ni stats.

Beats de trofeo (**PROVISIONAL**): el recap puede marcar MVP / anillo / oro / título continental y el draft gordo (lottery / top 3) con un CSS corto (~0.7 s). `prefers-reduced-motion` lo apaga. La carta de legacy sigue **estática** (screenshot): la banda manda, el score debajo; los clubs son escudos, no un segundo historial. No es un replay ni una gala extra. El recap abre con la nota del año y, si hubo corte, con lo que elegiste. Lesión, snub de placa y selección van con esa apertura, no debajo de las stats. Gym, ruta y mercado no se repiten encima de Tus cortes: solo si un giro cambió el resto del año hay frase. Un año sin giros también se lee de un vistazo (`Sin playoffs` no ocupa chip; `Tus cortes` no ocupa bloque). Lesión: copy en castellano, no ids crudos (`moderate knee`). Premios: `All-Star` no `AS`; `Jugador del año` no `POTY`; All-Team, All-Defense y All-Rookie en equipos ([CAREER_SYSTEM.md](CAREER_SYSTEM.md) §6). Títulos: `Liga` no `League`; `Continental` no un id crudo. Draft: `Lotería` no `Lottery`. Scout, arquetipo y attrs: copy en castellano; ids en inglés. País: `España`, no `ES`. Posición en la ficha: `Base`, no `PG`. Playoffs: `Finales`. Cortes del recap: `Entrenamiento`, no `Gym`. Badges: `Tirador` / `Director` / `Protector`; préstamos de basket (`Clutch`, `Lockdown`, `Microwave`) se quedan. `formatLegacyCard` usa ese copy (CAREER_SYSTEM §9.3). Si ese año desbloqueaste un badge, el recap lo enseña. Sin ser elegido es una línea de recap, no game over. Snub de placa (cerca del MVP / All-Team / POTY): una línea, no gala. Arranque: un toque enseña la carta y la ruta; **Otra carta** sigue hasta el primer año. La identidad ligera es opcional, no un formulario.

## 13. Contenido vs sistemas

Los **sistemas** (sim, desarrollo, contratos, draft, legacy) son código.

Los **eventos** son datos estructurados. Se pueden llegar a cientos o miles sin tocar el engine. El engine evalúa condiciones y aplica efectos. Nunca genera el texto ni el outcome con un modelo generativo en runtime.

## 14. Balance conceptual

El Game Design Agent no equilibra fórmulas numéricas finales (eso es Simulation/Balance). Sí define:

- qué debe sentirse poderoso;
- qué es un trade-off real;
- qué nunca puede ser óptimo siempre (ej. "siempre coger el máximo dinero").

Reglas de balance de diseño (PROVISIONAL):

- No existe una ruta dominante conocida (Europa vs NCAA, draft year 1 vs wait).
- El rol de Star no garantiza anillos; el de Bench en un contender no garantiza legado vacío.
- Las lesiones graves son raras pero memorables. No deben ser comunes al nivel de "ruina de cada run". Una moderate no abre siempre el popup de volver pronto: solo si ego o ambition van altos.
- El Legacy Score premia pico + longevidad + impacto colectivo + narrativa (premios, selección), no solo PPG.

## 15. Qué es mejor para este proyecto (LOCKED como brújula)

TheClutch gana si se siente **corto, adictivo y con historia**, no si se siente completo.

Orden de valor real:

1. **Una carrera de 12 minutos que apetece repetir.** Engine + resumen de temporada + 1 contrato + 1 draft + legacy. Sin esto, Daily y 200 eventos no sirven.
2. **Giros con dientes.** Pocos eventos, cada uno capaz de torcer el resto del año o de la carrera.
3. **Identidad de basket en la sim.** Un PG y un C no se juegan igual; el clutch y el rol se notan en las stats.
4. **Daily / Challenge** cuando (1)–(3) ya enganchan. Son el gancho social, no el juego.
5. **Volumen de contenido** al final. 25 eventos buenos > 400 textos de prensa.

Lo que más puede matar el proyecto:

- parar al usuario **cada temporada** “para que haya contenido”;
- mostrar partidos o menús de franquicia;
- construir ranking y auth antes de que la carrera sea divertida;
- copiar el loop de un manager de fútbol en vez de una vida de jugador.

Copero/Potrero enseñan el ritmo (fácil, rápido, otra). TheClutch no los copia: el fantasy es **ser el jugador**, y el giro es basket (minutos, draft, anillos, rodilla).

## 16. Cambios a este documento

Cualquier cambio a pilares (incluído KISS/DRY), loop, “temporada = flujo / eventos = giros”, o a "qué no es" es un cambio **LOCKED** y exige proceso de 4 pasos.
