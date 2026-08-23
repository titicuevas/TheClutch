import { calculateOverall } from "../player/overall";
import { generateTeam } from "../player/generate";
import { draftBandLabel, formatWage, isFormation, LIFESTYLE_SPEND, SPORADIC_MUST_CAP } from "../constants";
import { canDeclareDraft, waitClosesDraft } from "./eligibility";
import { clubStandingOf } from "../player/standing";
import { estimatedStarterOverall, kidMate, mateLabel, starMate } from "../player/locker";
import { tournamentForYear } from "../simulation/national";
import type { Rng } from "../rng/index";
import type { CareerState, PendingDecision, Player } from "../state/types";

function fired(state: CareerState, id: string): boolean {
  return state.player.flags.firedOnce.includes(id);
}

function last(state: CareerState) {
  return state.history.at(-1);
}

/** CAREER_SYSTEM §4.3: cláusula o rol gordo blindan, salvo que tú hayas pedido el movimiento. */
function canMoveInvoluntarily(state: CareerState): boolean {
  const { player, world } = state;
  const asked = player.flags.tradeRequest;
  if (asked) return true;
  if (world.contract.tradeProtection === "full") return false;
  if (player.role === "star" || player.role === "franchise") return false;
  return world.team.contention <= 42 || player.coachRelation <= 28;
}

const MIDSEASON_IDS = new Set([
  "unhappy_minutes",
  "early_return",
  "traded_involuntary",
  "teammate_star_clash",
  "coach_trust",
  "coach_clash",
  "media_overrate",
  "lockout_fatigue",
  "home_crowd",
  "lifestyle_pressure",
  "rival_heat",
  "media_heat",
  "locker_ice",
  "locker_voice",
  "vet_minutes",
  "role_slide",
  "play_through",
  "load_manage",
  "sixth_heat",
  "deal_year",
  "playoff_push",
]);

const OFFSEASON_IDS = new Set([
  "award_snub",
  "contender_call",
  "national_snub",
  "national_duty",
  "finals_hangover",
  "agent_conflict",
  "work_summer",
  "go_home",
  "leaving_home",
  "lifestyle_flex",
  "captain_c",
]);

/** Salud, destino y recap que ya viste. GAME_DESIGN §9. */
const ALWAYS_MUST = new Set([
  "unhappy_minutes",
  "early_return",
  "traded_involuntary",
  "national_snub",
  "finals_hangover",
  "national_duty",
  "go_home",
]);

/** Una vez, pero no un cuestionario eterno. Tras SPORADIC_MUST_CAP pasan a la tirada. */
const FLAVOR_MUST = new Set([
  "home_crowd",
  "coach_clash",
  "locker_ice",
  "locker_voice",
  "vet_minutes",
  "role_slide",
  "lifestyle_pressure",
  "rival_heat",
  "media_heat",
  "leaving_home",
  "lifestyle_flex",
]);

function isMust(id: string, player: Player): boolean {
  if (ALWAYS_MUST.has(id)) return true;
  if (id === "lockout_fatigue" && player.fatigue >= 78) return true;
  if (id === "agent_conflict" && player.personality.professionalism <= 45) return true;
  if (FLAVOR_MUST.has(id) && player.flags.firedOnce.length < SPORADIC_MUST_CAP) return true;
  return false;
}

/** D-23: 3+ años en un club (no formación) y uno en el nuevo. */
function leftHomeClub(state: CareerState): { homeName: string } | null {
  const { history, world } = state;
  if (isFormation(world.team.competitionId)) return null;
  const awaySeasons = history.filter((season) => season.teamId === world.team.id).length;
  if (awaySeasons !== 1) return null;
  const prev = [...history].reverse().find((season) => season.teamId !== world.team.id);
  if (!prev || isFormation(prev.competitionId)) return null;
  const tenure = history.filter((season) => season.teamId === prev.teamId).length;
  if (tenure < 3) return null;
  return { homeName: prev.teamName };
}

function midSnapshot(state: CareerState) {
  const first = state.seasonInProgress?.first;
  if (!first) return undefined;
  return {
    injury: first.injury,
    stats: first.stats,
    awards: [] as string[],
  };
}

export function pickDecision(state: CareerState, rng: Rng): PendingDecision | null {
  return pickOffseasonDecision(state, rng);
}

export function pickOffseasonDecision(state: CareerState, rng: Rng): PendingDecision | null {
  const ovr = calculateOverall(
    state.player.attributes,
    state.player.position,
    state.player.archetype,
  );
  const { player, world } = state;

  if (!player.flags.path && state.history.length === 0) {
    return pathDecision(state, rng);
  }

  if (world.contract.yearsLeft <= 0 && !isFormation(world.team.competitionId)) {
    if (player.personality.loyalty >= 68 && !fired(state, "hometown_discount")) {
      return hometownDecision(state, rng, ovr);
    }
    return contractDecision(state, rng, ovr);
  }

  if (canDeclareDraft(state)) {
    const draft = draftDecision(state, rng, ovr);
    const band = draft.data?.draftBand;
    if (band === "lottery" || band === "first_round" || band === "second_round") {
      const last = waitClosesDraft(state);
      return {
        ...draft,
        id: "draft_pressure",
        title: "Presión de draft",
        body: last
          ? `El scouting te pone en ${draftBandLabel(band)}. Último año de ventana. Presentarte ahora o se cierra.`
          : `El scouting te pone en ${draftBandLabel(band)}. Presentarte ahora es un filo. Esperar puede subir… o caer al vacío.`,
      };
    }
    return draft;
  }

  const event = pickEvent(state, rng, ovr, "offseason");
  if (event) return event;

  if (player.age <= 27 && (world.year === 1 || world.year % 2 === 1)) {
    return trainingDecision(player.firstName);
  }

  return null;
}

export function pickMidseasonEvent(state: CareerState, rng: Rng): PendingDecision | null {
  const ovr = calculateOverall(
    state.player.attributes,
    state.player.position,
    state.player.archetype,
  );
  return pickEvent(state, rng, ovr, "midseason");
}

function hometownDecision(state: CareerState, rng: Rng, ovr: number): PendingDecision {
  const stay = state.world.team;
  const leave = generateTeam(
    rng.fork("fa-team"),
    state.player.nationality,
    stay.competitionId === "american_league" ? "american_league" : "national_league",
  );
  const stayPay = Math.max(6, Math.round(ovr * 0.26));
  const leavePay = Math.max(8, Math.round(ovr * 0.44));
  return {
    id: "hometown_discount",
    kind: "contract",
    title: "Descuento de casa",
    body: `${stay.name} pide lealtad a cambio de menos dinero. El mercado paga más lejos.`,
    options: [
      {
        id: "stay",
        label: `Quedarme en ${stay.name}`,
        hint: `${formatWage(stayPay)} · club de siempre · no trade`,
      },
      {
        id: "leave",
        label: `Firmar por ${leave.name}`,
        hint: `${formatWage(leavePay)} · más mercado`,
      },
    ],
    data: { stayTeam: stay, leaveTeam: leave },
  };
}

function trainingDecision(name: string): PendingDecision {
  return {
    id: "training",
    kind: "training",
    title: "Verano de trabajo",
    body: `${name}, eliges en qué enfocar el offseason. Marca el año.`,
    options: [
      { id: "shooting", label: "Tiro", hint: "Triple y media" },
      { id: "playmaking", label: "Creación", hint: "Pase y bote" },
      { id: "defense", label: "Defensa", hint: "Perímetro e interior" },
      { id: "body", label: "Cuerpo", hint: "Fuerza y fondo" },
    ],
  };
}

function pathDecision(state: CareerState, rng: Rng): PendingDecision {
  const club = generateTeam(rng.fork("path-club"), state.player.nationality, "club_academy");
  const college = generateTeam(rng.fork("path-college"), "US", "college_circuit");
  return {
    id: "path",
    kind: "path",
    title: "¿Dónde empiezas?",
    body: "Club en casa o universidad en América. El draft mira ambos. La universidad está más cerca del scouting; el club paga y juegas contra mayores.",
    options: [
      {
        id: "club",
        label: `Club: ${club.name}`,
        hint: `${formatWage(6)} · casa`,
      },
      {
        id: "college",
        label: `Universidad: ${college.name}`,
        hint: `${formatWage(2)} · más stock`,
      },
    ],
    data: { stayTeam: club, leaveTeam: college },
  };
}

function draftDecision(state: CareerState, rng: Rng, ovr: number): PendingDecision {
  const pot = state.player.potential;
  const stock =
    ovr * 0.55 +
    pot * 0.45 +
    rng.fork("scout").int(-6, 6) +
    (state.player.flags.path === "college" ? 4 : 0);
  let draftBand: NonNullable<PendingDecision["data"]>["draftBand"] = "undrafted";
  if (stock >= 88) draftBand = "top_3";
  else if (stock >= 82) draftBand = "lottery";
  else if (stock >= 76) draftBand = "first_round";
  else if (stock >= 70) draftBand = "second_round";
  const last = waitClosesDraft(state);

  return {
    id: "draft",
    kind: "draft",
    title: "Draft americano",
    body: last
      ? `Proyección: ${draftBandLabel(draftBand)}. Último año de ventana. Presentarte ahora o se cierra.`
      : `Proyección: ${draftBandLabel(draftBand)}. Presentarte ahora es un riesgo. Esperar puede subir… o bajar.`,
    options: [
      { id: "declare", label: "Presentarme", hint: `Proyección ${draftBandLabel(draftBand)}` },
      {
        id: "wait",
        label: "Esperar un año",
        hint: last ? "Se cierra la ventana" : "El stock puede subir… o caer",
      },
    ],
    data: { draftBand },
  };
}

function contractDecision(state: CareerState, rng: Rng, ovr: number): PendingDecision {
  const stay = state.world.team;
  const maxTeam = {
    ...generateTeam(
      rng.fork("max-team"),
      state.player.nationality,
      stay.competitionId === "american_league" ? "american_league" : "national_league",
    ),
    contention: rng.fork("max-cont").int(28, 44),
    prestige: rng.fork("max-pres").int(42, 60),
  };
  const ringTeam = {
    ...generateTeam(
      rng.fork("ring-team"),
      state.player.nationality,
      stay.competitionId === "american_league" ? "american_league" : "national_league",
    ),
    contention: rng.fork("ring-cont").int(80, 94),
    prestige: rng.fork("ring-pres").int(78, 92),
  };
  const face = state.player.badges.includes("franchise_player");
  const stayOffer = {
    salary: Math.max(8, Math.round(ovr * (face ? 0.4 : 0.34))),
    years: face ? 4 : 3,
    roleBias: 1,
    protection: "full" as const,
  };
  const maxOffer = {
    salary: Math.max(10, Math.round(ovr * 0.48)),
    years: 4,
    roleBias: 0,
    protection: "none" as const,
  };
  const ringOffer = {
    salary: Math.max(6, Math.round(ovr * 0.26)),
    years: 2,
    roleBias: -1,
    protection: "none" as const,
  };

  return {
    id: "contract",
    kind: "contract",
    title: "Mercado",
    body: "Dinero, minutos o títulos. Quedarte trae cláusula; el max te convierte en activo.",
    options: [
      {
        id: "stay",
        label: `Quedarme en ${stay.name}`,
        hint: `${formatWage(stayOffer.salary)} · ${stayOffer.years}a · minutos · no trade`,
      },
      {
        id: "leave",
        label: `El max en ${maxTeam.name}`,
        hint: `${formatWage(maxOffer.salary)} · ${maxOffer.years}a · sin cláusula`,
      },
      {
        id: "ring",
        label: `Anillos con ${ringTeam.name}`,
        hint: `${formatWage(ringOffer.salary)} · ${ringOffer.years}a · menos rol`,
      },
    ],
    data: {
      stayTeam: stay,
      leaveTeam: maxTeam,
      ringTeam,
      stayOffer,
      maxOffer,
      ringOffer,
    },
  };
}

function pickEvent(
  state: CareerState,
  rng: Rng,
  ovr: number,
  phase: "offseason" | "midseason",
): PendingDecision | null {
  const season = phase === "midseason" ? midSnapshot(state) : last(state);
  const { player, world } = state;
  const candidates: { id: string; weight: number; make: () => PendingDecision }[] = [];
  const allow = (id: string) =>
    phase === "midseason" ? MIDSEASON_IDS.has(id) : OFFSEASON_IDS.has(id);

  if (
    allow("unhappy_minutes") &&
    !fired(state, "unhappy_minutes") &&
    (player.role === "bench" || player.role === "prospect") &&
    ovr >= 70 &&
    ovr > estimatedStarterOverall(world.locker, world.team.rating) &&
    player.morale < 62
  ) {
    const minutes = state.seasonInProgress?.first.stats.minutes;
    candidates.push({
      id: "unhappy_minutes",
      weight: 8,
      make: () => ({
        id: "unhappy_minutes",
        kind: "event",
        title: "Minutos",
        body: minutes
          ? `Llevas ${minutes.toFixed(1)} min y vales más que el rol. El resto del año puede cambiar. ${player.firstName}, ¿qué haces?`
          : `Juegas poco y vales más que el rol que te dan. El vestuario lo ve. ${player.firstName}, ¿qué haces?`,
        options: [
          { id: "talk", label: "Hablar con el entrenador", hint: "Puede subir el rol… o empeorar" },
          { id: "work", label: "Seguir trabajando", hint: "Ética y paciencia" },
          { id: "trade", label: "Pedir el traspaso", hint: "Cambio de equipo, quemas puentes" },
        ],
      }),
    });
  }

  if (
    allow("early_return") &&
    !fired(state, "early_return") &&
    season?.injury?.severity === "moderate" &&
    (player.personality.ego >= 68 || player.personality.ambition >= 68)
  ) {
    candidates.push({
      id: "early_return",
      weight: 7,
      make: () => ({
        id: "early_return",
        kind: "event",
        title: season.injury?.type === "knee" ? "La rodilla" : "El cuerpo",
        body: "El cuerpo pide calma. El ego y el contrato piden volver ya.",
        options: [
          { id: "rush", label: "Volver ya", hint: "Más minutos, más riesgo" },
          { id: "wait", label: "Recuperar bien", hint: "Menos este año, más carrera" },
        ],
      }),
    });
  }

  if (
    allow("play_through") &&
    !fired(state, "play_through") &&
    season?.injury?.severity === "minor" &&
    (player.personality.ego >= 62 || player.personality.ambition >= 62)
  ) {
    candidates.push({
      id: "play_through",
      weight: 4,
      make: () => ({
        id: "play_through",
        kind: "event",
        title: season.injury?.type === "ankle" ? "El tobillo" : "El golpe",
        body: "Es menor. El staff puede sentarte el tramo o puedes tragártelo. El resto del año cambia.",
        options: [
          { id: "push", label: "Jugarla", hint: "Más minutos, más riesgo" },
          { id: "sit", label: "Sentarme", hint: "Menos este tramo, más carrera" },
        ],
      }),
    });
  }

  if (
    allow("contender_call") &&
    !fired(state, "contender_call") &&
    ovr >= 76 &&
    world.team.contention < 55 &&
    player.age >= 24
  ) {
    const contender = generateTeam(
      rng.fork("contender"),
      player.nationality,
      world.team.competitionId,
    );
    contender.contention = rng.int(78, 92);
    candidates.push({
      id: "contender_call",
      weight: 5,
      make: () => ({
        id: "contender_call",
        kind: "event",
        title: "Llamada de un contender",
        body: `${contender.name} quiere un anillo. A ti te ofrecen menos uso y menos dinero.`,
        options: [
          { id: "go", label: `Ir a ${contender.name}`, hint: "Títulos > ego" },
          { id: "stay", label: "Seguir aquí", hint: "Ser el chico del cartel" },
        ],
        data: { leaveTeam: contender },
      }),
    });
  }

  const closed = last(state);
  if (allow("award_snub") && !fired(state, "award_snub") && closed?.awardSnub) {
    const body =
      closed.awardSnub === "MVP"
        ? "Los números están. El MVP no. La prensa dice que el equipo no gana."
        : closed.awardSnub === "POTY"
          ? "Jugador del año se fue a otro. En el circuito duele igual."
          : "Los números están. El All-Team no. La prensa dice que el equipo no gana.";
    candidates.push({
      id: "award_snub",
      weight: 4,
      make: () => ({
        id: "award_snub",
        kind: "event",
        title: "Snub",
        body,
        options: [
          { id: "chip", label: "Usarlo de leña", hint: "Confianza arriba" },
          { id: "media", label: "Hablar a la prensa", hint: "Ego y ruido" },
        ],
      }),
    });
  }

  if (
    allow("finals_hangover") &&
    !fired(state, "finals_hangover") &&
    last(state)?.playoff === "finals" &&
    !isFormation(world.team.competitionId) &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise")
  ) {
    candidates.push({
      id: "finals_hangover",
      weight: 6,
      make: () => ({
        id: "finals_hangover",
        kind: "event",
        title: "Tan cerca",
        body: `${world.team.name} se quedó en las finales. El vestuario quiere repetir. Tú puedes cerrar filas o pedir el cambio.`,
        options: [
          { id: "run", label: "Repetir", hint: "Moral y vestuario" },
          { id: "leave", label: "Pedir el cambio", hint: "Traspaso, ego" },
        ],
      }),
    });
  }

  if (
    allow("coach_trust") &&
    !fired(state, "coach_trust") &&
    season &&
    !season.injury &&
    player.coachRelation >= 72 &&
    player.morale >= 58 &&
    season.stats.pts >= 11
  ) {
    candidates.push({
      id: "coach_trust",
      weight: 3,
      make: () => ({
        id: "coach_trust",
        kind: "event",
        title: "El míster se fía",
        body: `${world.coachName || "El entrenador"} te da las llaves. Puedes pedir más uso… o no quemar el crédito.`,
        options: [
          { id: "lean", label: "Pedir las llaves", hint: "Más rol, más exigencia" },
          { id: "humble", label: "No forzar", hint: "Relación y vestuario" },
        ],
      }),
    });
  }

  if (
    allow("media_overrate") &&
    !fired(state, "media_overrate") &&
    season &&
    world.team.competitionId !== "american_league" &&
    season.stats.pts >= 17 &&
    ovr < 80
  ) {
    candidates.push({
      id: "media_overrate",
      weight: 4,
      make: () => ({
        id: "media_overrate",
        kind: "event",
        title: "Te inflan",
        body: "En esta liga pareces un MVP. El scouting americano todavía no se lo cree.",
        options: [
          { id: "buy", label: "Comprarlo", hint: "Ego y confianza" },
          { id: "ground", label: "Seguir con hambre", hint: "Ética, menos ruido" },
        ],
      }),
    });
  }

  if (
    allow("teammate_star_clash") &&
    !fired(state, "teammate_star_clash") &&
    player.personality.ego >= 68 &&
    (player.role === "starter" || player.role === "star") &&
    world.team.contention >= 68 &&
    player.experience >= 2
  ) {
    const otherStar = starMate(world.locker);
    if (otherStar) {
    const other = mateLabel(otherStar)!;
    candidates.push({
      id: "teammate_star_clash",
      weight: 4,
      make: () => ({
        id: "teammate_star_clash",
        kind: "event",
        title: "Dos carteles",
        body: `${other} también quiere el balón. El vestuario no da para dos egos.`,
        options: [
          { id: "share", label: "Compartir", hint: "Química, menos uso" },
          { id: "demand", label: "Exigir el uso", hint: "Minutos y roce" },
        ],
      }),
    });
    }
  }

  if (allow("national_snub") && !fired(state, "national_snub") && last(state)?.national?.status === "snub") {
    const cup = last(state)?.national?.tournament ?? "continental";
    const label = cup === "olympics" ? "los Juegos" : cup === "world" ? "el Mundial" : "el continental";
    candidates.push({
      id: "national_snub",
      weight: 5,
      make: () => ({
        id: "national_snub",
        kind: "event",
        title: "Sin convocatoria",
        body: `La selección no te llama a ${label}. En el club eres importante. En el país, todavía no.`,
        options: [
          { id: "chip", label: "Usarlo de leña", hint: "Forma y orgullo" },
          { id: "noise", label: "Quejarte en público", hint: "Ruido, reputación" },
        ],
      }),
    });
  }

  const window = tournamentForYear(world.year);
  if (
    allow("national_duty") &&
    !fired(state, "national_duty") &&
    (window === "olympics" || window === "world") &&
    !isFormation(world.team.competitionId) &&
    player.age >= 19 &&
    ovr >= 80 &&
    player.reputation >= 50
  ) {
    const cup = window === "olympics" ? "los Juegos" : "el Mundial";
    candidates.push({
      id: "national_duty",
      weight: 6,
      make: () => ({
        id: "national_duty",
        kind: "event",
        title: "La selección",
        body: `La federación te quiere en ${cup}. El club prefiere que el verano sea suyo.`,
        options: [
          { id: "go", label: "Ir", hint: "Fatiga y reputación" },
          { id: "skip", label: "Quedarte", hint: "Descanso; la ventana se pierde" },
        ],
      }),
    });
  }

  if (
    allow("traded_involuntary") &&
    !fired(state, "traded_involuntary") &&
    world.team.competitionId === "american_league" &&
    state.history.length >= 1 &&
    canMoveInvoluntarily(state)
  ) {
    const dest = generateTeam(rng.fork("trade-dest"), player.nationality, "american_league");
    candidates.push({
      id: "traded_involuntary",
      weight: player.flags.tradeRequest ? 9 : 4,
      make: () => ({
        id: "traded_involuntary",
        kind: "trade",
        title: "Traspaso",
        body: `${world.team.name} te mueve a ${dest.name}. No te lo pidieron.`,
        options: [
          { id: "accept", label: `Aceptar ${dest.name}`, hint: "Nuevo vestuario" },
          { id: "fight", label: "Pelear el movimiento", hint: "Suele fallar; quema puentes" },
        ],
        data: { stayTeam: world.team, leaveTeam: dest },
      }),
    });
  }

  if (
    allow("locker_voice") &&
    !fired(state, "locker_voice") &&
    player.badges.includes("franchise_player") &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    player.fatigue < 58
  ) {
    candidates.push({
      id: "locker_voice",
      weight: 6,
      make: () => ({
        id: "locker_voice",
        kind: "event",
        title: "La voz",
        body: `${world.team.name} te mira como la cara. El staff quiere que lleves el vestuario el resto del año, no solo el marcador.`,
        options: [
          { id: "carry", label: "Llevar el vestuario", hint: "Más uso y carga; el locker se junta" },
          { id: "score", label: "Seguir de estrella", hint: "Menos peso; el vestuario se enfría" },
        ],
      }),
    });
  }

  if (allow("lockout_fatigue") && !fired(state, "lockout_fatigue") && player.fatigue >= 58) {
    candidates.push({
      id: "lockout_fatigue",
      weight: 6,
      make: () => ({
        id: "lockout_fatigue",
        kind: "event",
        title: "El cuerpo pide recorte",
        body: `Carga ${player.fatigue}. El staff quiere recortar minutos. Tú puedes insistir en el uso.`,
        options: [
          { id: "rest", label: "Aceptar el recorte", hint: "Menos este tramo, más carrera" },
          { id: "grind", label: "Seguir a tope", hint: "Uso ahora, más riesgo" },
        ],
      }),
    });
  }

  if (
    allow("load_manage") &&
    !fired(state, "load_manage") &&
    player.role === "franchise" &&
    world.team.contention >= 78 &&
    player.experience >= 2 &&
    player.fatigue < 58 &&
    player.coachRelation > 38 &&
    player.teammateRelation > 38 &&
    !isFormation(world.team.competitionId)
  ) {
    candidates.push({
      id: "load_manage",
      weight: 5,
      make: () => ({
        id: "load_manage",
        kind: "event",
        title: "Mayo",
        body: `${world.team.name} pelea el anillo. El staff quiere guardarte piernas. Tú puedes cazar números cada noche. El resto del año cambia.`,
        options: [
          { id: "save", label: "Guardar piernas", hint: "Menos este tramo; fresco en mayo" },
          { id: "hunt", label: "Cada noche", hint: "Más uso ahora; más carga" },
        ],
      }),
    });
  }

  if (
    allow("sixth_heat") &&
    !fired(state, "sixth_heat") &&
    player.role === "sixth_man" &&
    player.age <= 25 &&
    player.experience >= 1 &&
    player.fatigue < 58 &&
    !season?.injury &&
    (season?.stats.pts ?? 0) >= 15
  ) {
    candidates.push({
      id: "sixth_heat",
      weight: 4,
      make: () => ({
        id: "sixth_heat",
        kind: "event",
        title: "El sexto",
        body: "Estás destrozando de bomba. Pedir el cinco o seguir saliendo a matar. El resto del año cambia.",
        options: [
          { id: "start", label: "Pedir el cinco", hint: "Más minutos; roce con el míster" },
          { id: "bomb", label: "Seguir de bomba", hint: "Vestuario; el rol se queda" },
        ],
      }),
    });
  }

  if (
    allow("deal_year") &&
    !fired(state, "deal_year") &&
    (player.role === "starter" || player.role === "star") &&
    world.contract.yearsLeft === 1 &&
    player.experience >= 2 &&
    (player.personality.ambition >= 62 || player.personality.ego >= 62) &&
    player.fatigue < 78 &&
    !season?.injury &&
    !isFormation(world.team.competitionId)
  ) {
    candidates.push({
      id: "deal_year",
      weight: 4,
      make: () => ({
        id: "deal_year",
        kind: "event",
        title: "El contrato",
        body: "Último año de contrato. Jugarlo para firmar o forzar la salida ya. El resto del año cambia.",
        options: [
          { id: "grind", label: "Jugarme el contrato", hint: "Más uso ahora; el mercado espera" },
          { id: "out", label: "Forzar la salida", hint: "Pides el cambio; quemas" },
        ],
      }),
    });
  }

  if (
    allow("playoff_push") &&
    !fired(state, "playoff_push") &&
    (player.role === "starter" || player.role === "star") &&
    world.team.contention >= 68 &&
    player.fatigue >= 42 &&
    player.fatigue < 68 &&
    player.experience >= 2 &&
    !season?.injury &&
    !isFormation(world.team.competitionId)
  ) {
    candidates.push({
      id: "playoff_push",
      weight: 9,
      make: () => ({
        id: "playoff_push",
        kind: "event",
        title: "La última bola",
        body: `${world.team.name} se juega el cruce en un partido clave. Puedes pedir la posesión decisiva o confiar en el sistema. Tu clutch, forma y rol pesan; la suerte también.`,
        options: [
          { id: "hunt", label: "Dame la última", hint: "Más protagonismo y presión; más fatiga" },
          { id: "save", label: "Jugar para el equipo", hint: "Menos foco; más piernas para el cruce" },
        ],
      }),
    });
  }

  const crowd = clubStandingOf(player);
  if (
    allow("home_crowd") &&
    !fired(state, "home_crowd") &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    player.experience >= 2 &&
    (crowd === "loved" || crowd === "cold")
  ) {
    const loved = crowd === "loved";
    candidates.push({
      id: "home_crowd",
      weight: 5,
      make: () => ({
        id: "home_crowd",
        kind: "event",
        title: loved ? "La grada" : "Pitos",
        body: loved
          ? `${world.team.name} te canta. El chip está caliente. Puedes comértelo o no inflarte.`
          : `${world.team.name} pita. El club te mira. Ganarlos en la pista o pedir el cambio.`,
        options: loved
          ? [
              { id: "soak", label: "Comerme el estadio", hint: "Más uso, más ego" },
              { id: "humble", label: "No inflarme", hint: "Lealtad y vestuario" },
            ]
          : [
              { id: "win", label: "Ganarlos en la pista", hint: "Más uso, más carga" },
              { id: "out", label: "Pedir el cambio", hint: "Quemas; puede acabar en traspaso" },
            ],
      }),
    });
  }

  if (
    allow("coach_clash") &&
    !fired(state, "coach_clash") &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    player.experience >= 2 &&
    player.coachRelation <= 38 &&
    player.morale >= 50 &&
    player.fatigue < 58 &&
    clubStandingOf(player) !== "cold"
  ) {
    candidates.push({
      id: "coach_clash",
      weight: 5,
      make: () => ({
        id: "coach_clash",
        kind: "event",
        title: "El míster",
        body: `${world.coachName || "El entrenador"} no te pone. En el vestuario se nota. Parchear o plantar cara. El resto del año puede cambiar.`,
        options: [
          { id: "patch", label: "Bajar la cabeza", hint: "Relación; menos uso este tramo" },
          { id: "clash", label: "Plantar cara", hint: "Más minutos ahora; quema al míster" },
        ],
      }),
    });
  }

  if (
    allow("locker_ice") &&
    !fired(state, "locker_ice") &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    player.experience >= 2 &&
    player.teammateRelation <= 38 &&
    player.coachRelation > 38 &&
    player.morale >= 50 &&
    player.fatigue < 58 &&
    player.personality.ego < 68 &&
    clubStandingOf(player) !== "cold"
  ) {
    const iced = mateLabel(kidMate(world.locker) ?? world.locker[0]);
    candidates.push({
      id: "locker_ice",
      weight: 5,
      make: () => ({
        id: "locker_ice",
        kind: "event",
        title: "El vestuario",
        body: iced
          ? `${iced} te deja solo. El míster no es el problema. Pegarte al grupo o pedir el balón. El resto del año puede cambiar.`
          : "El locker te deja solo. El míster no es el problema. Pegarte al grupo o pedir el balón. El resto del año puede cambiar.",
        options: [
          { id: "glue", label: "Pegarme al grupo", hint: "Química; menos uso este tramo" },
          { id: "take", label: "Pedir el balón", hint: "Más minutos; el vestuario se resiente" },
        ],
      }),
    });
  }

  if (
    allow("vet_minutes") &&
    !fired(state, "vet_minutes") &&
    (player.role === "sixth_man" || player.role === "rotation") &&
    player.age >= 28 &&
    player.experience >= 6 &&
    player.fatigue < 58
  ) {
    const prev = last(state);
    if (
      prev &&
      prev.teamId === world.team.id &&
      (prev.role === "sixth_man" || prev.role === "rotation")
    ) {
    const kid = mateLabel(kidMate(world.locker));
    candidates.push({
      id: "vet_minutes",
      weight: 5,
      make: () => ({
        id: "vet_minutes",
        kind: "event",
        title: "Los minutos",
        body: kid
          ? `${kid} pide tu uso. Ceder el tramo o agarrarte a los minutos. El resto del año puede cambiar.`
          : "Hay un chico más joven pidiendo tu uso. Ceder el tramo o agarrarte a los minutos. El resto del año puede cambiar.",
        options: [
          { id: "cede", label: "Ceder el uso", hint: "Vestuario; menos este tramo" },
          { id: "hold", label: "Agarrarme a los minutos", hint: "Más uso; el locker se resiente" },
        ],
      }),
    });
    }
  }

  if (
    allow("role_slide") &&
    !fired(state, "role_slide") &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    player.age >= 32 &&
    player.experience >= 8 &&
    player.morale >= 50 &&
    player.fatigue < 58 &&
    player.coachRelation > 38 &&
    player.teammateRelation > 38 &&
    clubStandingOf(player) !== "cold"
  ) {
    candidates.push({
      id: "role_slide",
      weight: 5,
      make: () => ({
        id: "role_slide",
        kind: "event",
        title: "El rol",
        body: "El staff quiere sentarte más. El cuerpo ya no es el de los 26. Aceptar menos uso o pelear el rol. El resto del año puede cambiar.",
        options: [
          { id: "accept", label: "Aceptar menos uso", hint: "Vestuario; menos este tramo" },
          { id: "fight", label: "Pelear el rol", hint: "Más minutos ahora; roce con el míster" },
        ],
      }),
    });
  }

  if (
    allow("lifestyle_pressure") &&
    !fired(state, "lifestyle_pressure") &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    player.age >= 21 &&
    player.age <= 33 &&
    player.experience >= 2 &&
    player.morale <= 42 &&
    player.fatigue < 78
  ) {
    candidates.push({
      id: "lifestyle_pressure",
      weight: 5,
      make: () => ({
        id: "lifestyle_pressure",
        kind: "event",
        title: "La cabeza",
        body: `${player.firstName}, los minutos pesan y el vestuario se queda lejos. No es la rodilla. Es el ruido. El resto del año puede cambiar.`,
        options: [
          { id: "step_back", label: "Bajar revoluciones", hint: "Menos minutos, más aire" },
          { id: "push_through", label: "Seguir a tope", hint: "El uso se queda; el desgaste también" },
        ],
      }),
    });
  }

  if (
    allow("rival_heat") &&
    !fired(state, "rival_heat") &&
    world.year >= 2 &&
    world.rival.lastPts >= 12 &&
    player.role !== "prospect" &&
    player.role !== "bench"
  ) {
    const midPts = state.seasonInProgress?.first.stats.pts ?? 0;
    if (midPts + 3 < world.rival.lastPts) {
      const rivalName = `${world.rival.firstName} ${world.rival.lastName}`;
      candidates.push({
        id: "rival_heat",
        weight: 4,
        make: () => ({
          id: "rival_heat",
          kind: "event",
          title: "La sombra",
          body: `${rivalName} en ${world.rival.team.name} va a ${world.rival.lastPts.toFixed(1)} PTS. Misma posición. La gente compara. ${player.firstName}, ¿qué haces?`,
          options: [
            { id: "hunt", label: "Cazarle", hint: "Más uso, más fatiga" },
            { id: "ignore", label: "Jugar lo tuyo", hint: "Menos ruido; el vestuario agradece" },
          ],
        }),
      });
    }
  }

  if (
    allow("media_heat") &&
    !fired(state, "media_heat") &&
    world.team.competitionId === "american_league" &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    player.experience >= 2 &&
    ovr >= 76 &&
    (state.seasonInProgress?.first.stats.pts ?? 0) >= 18
  ) {
    const pts = state.seasonInProgress?.first.stats.pts ?? 0;
    candidates.push({
      id: "media_heat",
      weight: 4,
      make: () => ({
        id: "media_heat",
        kind: "event",
        title: "La máquina",
        body: `Vas a ${pts.toFixed(1)} PTS. En América te ponen en cada debate. Alimentar el circo o cortar el micro.`,
        options: [
          { id: "feed", label: "Alimentar el circo", hint: "Ego, más uso, más ruido" },
          { id: "mute", label: "Cortar el micro", hint: "Profesionalidad, vestuario" },
        ],
      }),
    });
  }

  if (
    allow("agent_conflict") &&
    !fired(state, "agent_conflict") &&
    player.experience >= 2 &&
    (player.personality.professionalism <= 48 || world.contract.salary < ovr * 0.28)
  ) {
    candidates.push({
      id: "agent_conflict",
      weight: 4,
      make: () => ({
        id: "agent_conflict",
        kind: "event",
        title: "El agente aprieta",
        body: "Tu gente dice que el club te paga de menos. Exigir mueve el vestuario.",
        options: [
          { id: "demand", label: "Exigir más", hint: "Puede acabar en traspaso" },
          { id: "keep", label: "Cerrar filas", hint: "Profesionalidad, menos ruido" },
        ],
      }),
    });
  }

  if (
    allow("work_summer") &&
    !fired(state, "work_summer") &&
    player.age >= 24 &&
    player.workEthic >= 62
  ) {
    candidates.push({
      id: "work_summer",
      weight: 3,
      make: () => ({
        id: "work_summer",
        kind: "event",
        title: "Verano largo",
        body: `${player.firstName}, el gym está abierto. El cuerpo también puede pedir calma.`,
        options: [
          { id: "grind", label: "Machacar", hint: "Cuerpo y tiro; más fatiga" },
          { id: "rest", label: "Soltar", hint: "Recuperar, menos pico" },
        ],
      }),
    });
  }

  if (
    allow("go_home") &&
    !fired(state, "go_home") &&
    world.team.competitionId === "american_league" &&
    player.nationality !== "US" &&
    player.age >= 27 &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    (player.personality.loyalty >= 62 || player.morale < 50)
  ) {
    const home = generateTeam(rng.fork("go-home"), player.nationality, "national_league");
    home.contention = rng.fork("go-home-cont").int(48, 78);
    candidates.push({
      id: "go_home",
      weight: 5,
      make: () => ({
        id: "go_home",
        kind: "event",
        title: "Volver a casa",
        body: `${home.name} te quiere de vuelta. Menos dólares, más cartel en la liga de origen. América no se acaba si te quedas.`,
        options: [
          { id: "go", label: `Volver a ${home.name}`, hint: "Más rol, menos sueldo, liga nacional" },
          { id: "stay", label: "Seguir en América", hint: "El techo sigue aquí" },
        ],
        data: { leaveTeam: home },
      }),
    });
  }

  const leftHome = leftHomeClub(state);
  if (allow("leaving_home") && !fired(state, "leaving_home") && leftHome) {
    candidates.push({
      id: "leaving_home",
      weight: 5,
      make: () => ({
        id: "leaving_home",
        kind: "event",
        title: "El club de siempre",
        body: `${leftHome.homeName} sigue escribiendo. Llevas un año en ${world.team.name}. Cerrar el capítulo o no olvidar.`,
        options: [
          { id: "cut", label: "Cerrar el capítulo", hint: "Profesionalidad, vestuario nuevo" },
          { id: "linger", label: "No olvidar", hint: "Lealtad; el chip se enfría" },
        ],
      }),
    });
  }

  if (
    allow("lifestyle_flex") &&
    !fired(state, "lifestyle_flex") &&
    (player.role === "starter" || player.role === "star" || player.role === "franchise") &&
    player.age >= 26 &&
    world.contract.salary >= 18
  ) {
    candidates.push({
      id: "lifestyle_flex",
      weight: 4,
      make: () => ({
        id: "lifestyle_flex",
        kind: "event",
        title: "Casa y coche",
        body: `${player.firstName}, el agente tiene un chalet y un coche a tu nombre. Se nota en el vestuario. También puedes seguir liviano y no tocar lo ganado.`,
        options: [
          { id: "flex", label: "Firmar el chalet", hint: `${formatWage(LIFESTYLE_SPEND)} · ego y ruido` },
          { id: "save", label: "Seguir liviano", hint: "Profesionalidad, sin gastar" },
        ],
      }),
    });
  }

  if (
    allow("captain_c") &&
    !fired(state, "captain_c") &&
    player.role === "franchise" &&
    player.experience >= 8 &&
    clubStandingOf(player) === "loved" &&
    !isFormation(world.team.competitionId)
  ) {
    candidates.push({
      id: "captain_c",
      weight: 5,
      make: () => ({
        id: "captain_c",
        kind: "event",
        title: "El brazalete",
        body: `${world.team.name} te pasa la C. Más peso, más reputación, más carga el año que viene. O sigues de uno más.`,
        options: [
          { id: "wear", label: "Llevarla", hint: "Reputación y uso; más fatiga" },
          { id: "pass", label: "Seguir de uno más", hint: "El vestuario agradece; menos cartel" },
        ],
      }),
    });
  }

  if (candidates.length === 0) return null;
  const must = candidates.find((c) => isMust(c.id, player));
  if (must) return must.make();
  if (!rng.chance(0.5)) return null;

  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let roll = rng.next() * total;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll <= 0) return candidate.make();
  }
  return candidates[0]!.make();
}
