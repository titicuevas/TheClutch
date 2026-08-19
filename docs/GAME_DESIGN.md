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
| Daily Career | Mismo jugador inicial para todos, seed `YYYY-MM-DD`. | Fase 4 |
| Challenge Career | Seed compartible (`BK-XXXX-XXXX`). | Fase 4 |
| Themed careers | Wonderkid, Underdog, etc. | Fuera de MVP |

Detalle en [CAREER_SYSTEM.md](CAREER_SYSTEM.md) y [DAILY_MODE.md](DAILY_MODE.md).

## 7. Lo que el usuario ve vs lo que el motor usa

Visible en MVP (PROVISIONAL):

- Identidad: nombre, país, edad, altura, posición, arquetipo.
- Overall, rol, equipo, contrato resumido.
- Forma, fatiga, moral (simplificados, no 12 barras).
- Stats de temporada y carrera (PTS/AST/REB y un segundo nivel desplegable).
- Eventos y decisiones.
- Premios, títulos, legacy al retirar.

Oculto o parcial (LOCKED como principio):

- Potencial exacto (se intuye por scouting / desarrollo).
- Fórmulas de simulación.
- Atributos secundarios y pesos por posición.
- Probabilidades internas de lesión, draft stock, ofertas.
- Ratings completos de todos los compañeros y rivales.

El usuario nunca debe necesitar una wiki de fórmulas para pasárselo bien. Los jugadores hardcore pueden aprender patrones.

## 8. Decisiones que importan

Toda decisión de diseño se evalúa con: **¿cambia una carrera de forma memorable en 10–20 minutos?**

Familias de decisiones (contenido en [EVENT_SYSTEM.md](EVENT_SYSTEM.md) y [CAREER_SYSTEM.md](CAREER_SYSTEM.md)):

- Ruta formativa (Europa vs NCAA / academia).
- Draft (presentarse vs esperar).
- Contrato (dinero vs minutos vs anillos vs prestigio vs **protección ante un trade**).
- Rol y minutos (hablar con el coach, pedir traspaso, aceptar banco).
- Destino (en la liga americana el club puede moverte; tú a veces solo asumes o peleas).
- Salud (volver pronto vs recuperar).
- Identidad (posición, agente, club de por vida, volver a Europa).
- Retiro (una temporada más).

Si una decisión no puede mover overall, rol, equipo, salud, reputación o legado de forma perceptible, no es una decisión de carrera: es ruido.

## 9. Ritmo de una carrera

Objetivo de pacing (PROVISIONAL):

- ~16–22 temporadas jugables por carrera típica (salida ~16–19 años, retiro ~34–40).
- **~2 de cada 3 temporadas:** un botón, un resumen, cero eventos esporádicos.
- **~1 de cada 3:** un giro (evento o lesión). Casi nunca dos giros el mismo año.
- Set pieces estructurales (draft, contrato gordo, Finals, retiro) sí pueden alargar ese año: son las temporadas que se recuerdan.
- Tope de decisiones esporádicas por carrera: **~8–12**. Más las 5–8 estructurales. Si hay fatiga de popups, hemos fallado.

Eso es lo que hace “una más”: el flujo es barato; el giro duele o premia.

## 10. Progresión: tres edades (LOCKED)

1. **Desarrollo** — el overall puede subir rápido; el rol es frágil; el potencial importa.
2. **Prime** — producción y badges; las decisiones son de anillos/dinero/legado.
3. **Declive** — regresión, lesiones, roles menores, tentación de una temporada más.

Un mismo overall no significa la misma carrera: un PG de 82 y un C de 82 producen stats distintas. Ver [PLAYER_MODEL.md](PLAYER_MODEL.md) y [SIMULATION.md](SIMULATION.md).

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

Mobile-first. Una acción primaria por pantalla. Tipografía y números grandes. El overall, el rol y la decisión actual mandan. Las 14 stats no se muestran a la vez.

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
- Las lesiones graves son raras pero memorables. No deben ser comunes al nivel de "ruina de cada run".
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

Cualquier cambio a pilares, loop, “temporada = flujo / eventos = giros”, o a "qué no es" es un cambio **LOCKED** y exige proceso de 4 pasos.
