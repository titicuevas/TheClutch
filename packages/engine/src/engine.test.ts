import { describe, expect, it } from "vitest";
import { calculateLegacy, calculateOverall, canDeclareDraft, createCareer, dispatch, draftBandLabel, formatAwardLine, formatLegacyCard, formatNationalLine, formatNationalStintLine, formatNationalChip, formatPlayoffLine, formatContinentalLine, formatTeamRecord, formatTitleLine, formatWage, getViewModel, gradeSeason, hydrateCareer, recapHeadline, awardSnubLine, replay, shouldForceRetire, shouldOfferRetire, bandFromScore, awardLabel, titleLabel, netEarnings, LIFESTYLE_SPEND, isFormation } from "./index";
import { pickDecision, pickMidseasonEvent } from "./decisions/pick";
import { unlockBadges } from "./player/badges";
import { POSITION_STAT_CAP, simulateBoxScore } from "./simulation/boxscore";
import { SPORADIC_MUST_CAP, LEGACY_ALL_TIME } from "./constants";
import { collectAwards, detectAwardSnub, isAllDefenseAward, isAllRookieAward, isAllTeamAward, playoffClutchBoost, teamRatingBoost } from "./simulation/season";
import { resolveNational, tournamentForYear } from "./simulation/national";
import { createRng } from "./rng/index";
import type { Attributes, CareerState, Command, DraftBand, Player, SeasonRecord, Team } from "./state/types";
import { clubPlaysContinental, resolveContinental } from "./simulation/continental";

function playCareer(playerSeed: string, runSeed = playerSeed): { state: CareerState; commands: Command[] } {
  let state = createCareer({ playerSeed, runSeed });
  const commands: Command[] = [];
  let guard = 0;
  while (!state.retired && guard < 200) {
    const command: Command = state.pendingDecision
      ? { type: "CHOOSE", optionId: state.pendingDecision.options[0]!.id }
      : { type: "SIMULATE_NEXT" };
    commands.push(command);
    state = dispatch(state, command).state;
    guard += 1;
  }
  return { state, commands };
}

function runCareer(playerSeed: string, runSeed = playerSeed): CareerState {
  return playCareer(playerSeed, runSeed).state;
}

function rngThatPicks(
  id: string,
  pick: (rng: ReturnType<typeof createRng>) => { id: string } | null,
): ReturnType<typeof createRng> {
  for (let i = 0; i < 40; i += 1) {
    const seed = `force-${id}:${i}`;
    if (pick(createRng(seed))?.id === id) return createRng(seed);
  }
  throw new Error(`no seed fired ${id}`);
}

describe("createCareer", () => {
  it("misma playerSeed produce el mismo jugador", () => {
    const a = createCareer({ playerSeed: "alpha", runSeed: "r1" });
    const b = createCareer({ playerSeed: "alpha", runSeed: "r2" });
    expect(a.player.firstName).toBe(b.player.firstName);
    expect(a.player.lastName).toBe(b.player.lastName);
    expect(a.player.position).toBe(b.player.position);
    expect(a.player.archetype).toBe(b.player.archetype);
    expect(a.player.attributes).toEqual(b.player.attributes);
    expect(a.player.potential).toBe(b.player.potential);
  });

  it("en Free se puede fijar la posición sin cambiar el nombre de la seed", () => {
    const pg = createCareer({ playerSeed: "lock-pos", runSeed: "r", position: "PG" });
    const c = createCareer({ playerSeed: "lock-pos", runSeed: "r", position: "C" });
    expect(pg.player.firstName).toBe(c.player.firstName);
    expect(pg.player.lastName).toBe(c.player.lastName);
    expect(pg.player.position).toBe("PG");
    expect(c.player.position).toBe("C");
    expect(pg.player.heightCm).toBeLessThan(c.player.heightCm);
  });

  it("en Free se puede fijar país y mano sin sliders", () => {
    const es = createCareer({ playerSeed: "lock-id", runSeed: "r", nationality: "ES", handed: "left" });
    const us = createCareer({ playerSeed: "lock-id", runSeed: "r", nationality: "US", handed: "right" });
    expect(es.player.nationality).toBe("ES");
    expect(us.player.nationality).toBe("US");
    expect(es.player.handed).toBe("left");
    expect(us.player.handed).toBe("right");
    expect(es.player.firstName).not.toBe(us.player.firstName);
    const left = createCareer({ playerSeed: "hand-id", runSeed: "r", nationality: "ES", handed: "left" });
    const right = createCareer({ playerSeed: "hand-id", runSeed: "r", nationality: "ES", handed: "right" });
    expect(left.player.firstName).toBe(right.player.firstName);
    expect(left.player.attributes.finishing).toBe(right.player.attributes.finishing + 2);
  });

  it("getViewModel no expone el potencial exacto", () => {
    const state = createCareer({ playerSeed: "hidden", runSeed: "hidden" });
    const vm = getViewModel(state);
    expect(vm.potentialBand).toMatch(/fringe|role|starter|star/);
    expect(vm).not.toHaveProperty("potential");
  });

  it("el view model expone minutos y sueldo; earnings arrancan en 0", () => {
    const state = createCareer({ playerSeed: "pay-me", runSeed: "pay-me" });
    const vm = getViewModel(state);
    expect(vm.minutesMin).toBeGreaterThan(0);
    expect(vm.minutesMax).toBeGreaterThan(vm.minutesMin);
    expect(vm.contractSalary).toBe(0);
    expect(state.player.spent).toBe(0);
    expect(formatWage(vm.contractSalary)).toBe("$0");
    expect(formatWage(22)).toBe("$22M");
    expect(draftBandLabel("lottery")).toBe("Lotería");
    expect(draftBandLabel("undrafted")).toBe("Sin ser elegido");
    expect(formatWage(6)).toBe("$6M");
    expect(vm.careerEarnings).toBe(0);
    expect(vm.form).toBeGreaterThan(0);
    expect(vm.temperament).toMatch(/loyal|ego|ambitious|pro|volatile|competitor/);
  });

  it("un rival sombra comparte posición y no el mismo club", () => {
    const state = createCareer({ playerSeed: "rival-me", runSeed: "rival-me" });
    expect(state.world.rival.position).toBe(state.player.position);
    expect(state.world.rival.team.name).not.toBe(state.world.team.name);
    expect(getViewModel(state).rival.name.length).toBeGreaterThan(3);
  });

  it("getViewModel hidrata un save viejo sin rival", () => {
    const state = createCareer({ playerSeed: "old-save", runSeed: "old-save" });
    const legacy = {
      ...state,
      world: { team: state.world.team, year: 1, contract: state.world.contract },
    } as CareerState;
    const vm = getViewModel(legacy);
    expect(vm.rival.name.length).toBeGreaterThan(3);
    expect(vm.rival.teamName.length).toBeGreaterThan(1);
  });

  it("al elegir ruta el club tiene 2–4 compañeros sombra y un míster", () => {
    let state = createCareer({ playerSeed: "locker-path", runSeed: "locker-path" });
    expect(state.world.locker).toEqual([]);
    expect(state.world.coachName).toBe("");
    state = dispatch(state, { type: "SIMULATE_NEXT" }).state;
    if (state.pendingDecision?.id === "training") {
      state = dispatch(state, { type: "CHOOSE", optionId: "shooting" }).state;
    }
    expect(state.pendingDecision?.id).toBe("path");
    state = dispatch(state, { type: "CHOOSE", optionId: "club" }).state;
    expect(state.world.locker.length).toBeGreaterThanOrEqual(2);
    expect(state.world.locker.length).toBeLessThanOrEqual(4);
    expect(state.world.coachName.split(" ").length).toBeGreaterThanOrEqual(2);
    expect(state.world.locker.every((mate) => mate.firstName && mate.overall >= 58)).toBe(true);
  });

  it("quedarte en el club conserva el vestuario; irte lo cambia", () => {
    let state = createCareer({ playerSeed: "locker-move", runSeed: "locker-move" });
    state = dispatch(state, { type: "SIMULATE_NEXT" }).state;
    if (state.pendingDecision?.id === "training") {
      state = dispatch(state, { type: "CHOOSE", optionId: "shooting" }).state;
    }
    state = dispatch(state, { type: "CHOOSE", optionId: "club" }).state;
    const locker = state.world.locker.map((mate) => `${mate.firstName} ${mate.lastName}`);
    const coach = state.world.coachName;
    const stay = dispatch(
      {
        ...state,
        pendingDecision: {
          id: "contract",
          kind: "contract",
          title: "Mercado",
          body: "",
          options: [{ id: "stay", label: "Quedarme" }],
          data: { stayTeam: state.world.team, stayOffer: { salary: 12, years: 3, roleBias: 0, protection: "none" } },
        },
      },
      { type: "CHOOSE", optionId: "stay" },
    ).state;
    expect(stay.world.locker.map((mate) => `${mate.firstName} ${mate.lastName}`)).toEqual(locker);
    expect(stay.world.coachName).toBe(coach);

    const left = dispatch(
      {
        ...state,
        pendingDecision: {
          id: "contract",
          kind: "contract",
          title: "Mercado",
          body: "",
          options: [{ id: "leave", label: "Irse" }],
          data: {
            leaveTeam: {
              ...state.world.team,
              id: "tm_elsewhere",
              name: "Metro Fire",
            },
            maxOffer: { salary: 18, years: 4, roleBias: 0, protection: "none" },
          },
        },
      },
      { type: "CHOOSE", optionId: "leave" },
    ).state;
    expect(left.world.team.name).toBe("Metro Fire");
    expect(left.world.locker.map((mate) => `${mate.firstName} ${mate.lastName}`)).not.toEqual(locker);
    expect(left.world.locker.length).toBeGreaterThanOrEqual(2);
  });

  it("Dos carteles nombra a la otra estrella; el míster entra en el roce", () => {
    const ready = starClashState();
    let clash: ReturnType<typeof pickMidseasonEvent> = null;
    for (let i = 0; i < 40; i += 1) {
      clash = pickMidseasonEvent(ready, createRng(`star-clash:${i}`));
      if (clash?.id === "teammate_star_clash") break;
    }
    expect(clash?.id).toBe("teammate_star_clash");
    expect(clash?.body).toContain("Mateo Ruiz");

    const mister = { ...coachClashState(), world: { ...coachClashState().world, coachName: "Hugo Serrano" } };
    const decision = pickMidseasonEvent(mister, createRng("force-clash"));
    expect(decision?.id).toBe("coach_clash");
    expect(decision?.body.startsWith("Hugo Serrano")).toBe(true);
  });

  it("en Free se puede fijar el nombre sin tocar atributos de la seed", () => {
    const rolled = createCareer({ playerSeed: "name-me", runSeed: "r" });
    const named = createCareer({ playerSeed: "name-me", runSeed: "r", givenName: "Lola Ruiz" });
    expect(named.player.firstName).toBe("Lola");
    expect(named.player.lastName).toBe("Ruiz");
    expect(named.player.attributes).toEqual(rolled.player.attributes);
    expect(named.player.position).toBe(rolled.player.position);
    expect(getViewModel(named).name).toBe("Lola Ruiz");

    const mono = createCareer({ playerSeed: "name-me", runSeed: "r", givenName: "Lola" });
    expect(mono.player.firstName).toBe("Lola");
    expect(mono.player.lastName).toBe("");
    expect(getViewModel(mono).name).toBe("Lola");
  });
});

describe("nota del año", () => {
  it("un anillo + MVP no es la misma nota que un año lesionado", () => {
    const base = dummySeason(createCareer({ playerSeed: "grade-me", runSeed: "grade-me" }));
    const plaque = gradeSeason({
      ...base,
      stats: { ...base.stats, pts: 24, ast: 6, reb: 5 },
      playoff: "champ",
      awards: ["MVP"],
      role: "star",
    });
    const wrecked = gradeSeason({
      ...base,
      stats: { ...base.stats, pts: 8 },
      playoff: "missed",
      injury: { seasonYear: 3, type: "knee", severity: "moderate", gamesMissed: 22 },
      role: "rotation",
    });
    expect(plaque.score).toBeGreaterThan(wrecked.score);
    expect(plaque.mark).toMatch(/^[SA]$/);
    expect(wrecked.mark).toMatch(/^[CD]$/);
  });

  it("la frase del recap solo sale si un giro cambió el resto del año", () => {
    const base = createCareer({ playerSeed: "note-me", runSeed: "note-me" });
    const gym = getViewModel({
      ...base,
      awaitingRecap: true,
      history: [
        {
          ...dummySeason(base),
          choices: [{ kind: "training", title: "Verano de trabajo", optionLabel: "Tiro" }],
        },
      ],
    });
    expect(gym.recapNote).toBeUndefined();

    const cut = getViewModel({
      ...base,
      awaitingRecap: true,
      history: [
        {
          ...dummySeason(base),
          choices: [{ kind: "event", title: "Minutos", optionLabel: "Hablar con el entrenador" }],
        },
      ],
    });
    expect(cut.recapNote).toBe("Elegiste: Hablar con el entrenador. El resto del año salió de ahí.");
  });
});

describe("dispatch", () => {
  it("es determinista con la misma runSeed", () => {
    const a = runCareer("same-player", "same-run");
    const b = runCareer("same-player", "same-run");
    expect(a.history.map((s) => s.stats.pts)).toEqual(b.history.map((s) => s.stats.pts));
    expect(a.history.map((s) => s.overall)).toEqual(b.history.map((s) => s.overall));
    expect(a.player.age).toBe(b.player.age);
  });

  it("termina la carrera en un rango creíble de temporadas", () => {
    const state = runCareer("length-check", "length-check");
    expect(state.retired).toBe(true);
    expect(state.history.length).toBeGreaterThanOrEqual(10);
    expect(state.history.length).toBeLessThanOrEqual(24);
  });

  it("legacy suma los salarios de cada temporada menos lo gastado", () => {
    const state = runCareer("earn-me", "earn-me");
    const report = calculateLegacy(state);
    const paid = state.history.reduce((sum, season) => sum + season.salary, 0);
    expect(paid).toBeGreaterThan(0);
    expect(report.earnings).toBe(netEarnings(state.history.map((season) => season.salary), state.player.spent));
    expect(report.earnings).toBe(Math.max(0, paid - state.player.spent));
  });

  it("las bandas de legacy discriminan: no todo es Histórico", () => {
    expect(bandFromScore(13_999)).toBe("local_legend");
    expect(bandFromScore(14_000)).toBe("national_star");
    expect(bandFromScore(18_000)).toBe("continental");
    expect(bandFromScore(LEGACY_ALL_TIME - 1)).toBe("continental");
    expect(bandFromScore(LEGACY_ALL_TIME)).toBe("all_time");

    const base = createCareer({ playerSeed: "legacy-band", runSeed: "legacy-band" });
    const weak = calculateLegacy({ ...base, retired: true, history: [dummySeason(base)] });
    const goatSeason = {
      ...dummySeason(base),
      competitionId: "american_league",
      overall: 94,
      role: "franchise" as const,
      stats: { ...dummySeason(base).stats, pts: 27, ast: 7, reb: 6, blk: 1.2 },
      awards: ["MVP", "FMVP"],
      titles: ["League"],
      playoff: "champ" as const,
    };
    const goat = calculateLegacy({
      ...base,
      player: { ...base.player, peakOverall: 94, badges: ["clutch", "sharpshooter"] },
      retired: true,
      history: Array.from({ length: 16 }, (_, i) => ({ ...goatSeason, year: i + 1 })),
    });
    expect(weak.band).toBe("local_legend");
    expect(goat.band).toBe("all_time");
    expect(goat.bpg).toBeGreaterThan(0);
  });

  it("el mismo boxscore en academia no pesa como en América", () => {
    const career = createCareer({ playerSeed: "weight-me", runSeed: "weight-me" });
    const row = {
      ...dummySeason(career),
      stats: { ...dummySeason(career).stats, pts: 28, ast: 8, reb: 5 },
    };
    const farm = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...row, competitionId: "club_academy" }],
    });
    const national = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...row, competitionId: "national_league" }],
    });
    const america = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...row, competitionId: "american_league" }],
    });
    expect(america.ppg).toBe(farm.ppg);
    expect(america.legacyScore).toBeGreaterThan(national.legacyScore);
    expect(national.legacyScore).toBeGreaterThan(farm.legacyScore);
  });
});

describe("momentos", () => {
  it("undrafted + MVP es un momento; draftado no", () => {
    const base = createCareer({ playerSeed: "moment-me", runSeed: "moment-me" });
    const season = { ...dummySeason(base), awards: ["MVP"], competitionId: "american_league" };
    const undrafted = calculateLegacy({
      ...base,
      retired: true,
      player: { ...base.player, flags: { ...base.player.flags, drafted: false }, growthCurve: "standard" },
      history: [season],
    });
    const drafted = calculateLegacy({
      ...base,
      retired: true,
      player: { ...base.player, flags: { ...base.player.flags, drafted: true }, growthCurve: "standard" },
      history: [season],
    });
    expect(undrafted.moments).toContain("undrafted_mvp");
    expect(drafted.moments).not.toContain("undrafted_mvp");
    expect(undrafted.legacyScore - drafted.legacyScore).toBe(180);
  });

  it("un club pro 8 años cuenta; dos clubes no", () => {
    const base = createCareer({ playerSeed: "club-me", runSeed: "club-me" });
    const year = (i: number, teamId: string) => ({
      ...dummySeason(base),
      year: i + 1,
      age: 22 + i,
      teamId,
      teamName: teamId,
      competitionId: "american_league",
    });
    const loyal = calculateLegacy({
      ...base,
      retired: true,
      player: { ...base.player, flags: { ...base.player.flags, drafted: true }, growthCurve: "standard" },
      history: Array.from({ length: 8 }, (_, i) => year(i, "tm_home")),
    });
    const journeyman = calculateLegacy({
      ...base,
      retired: true,
      player: { ...base.player, flags: { ...base.player.flags, drafted: true }, growthCurve: "standard" },
      history: Array.from({ length: 8 }, (_, i) => year(i, i < 4 ? "tm_a" : "tm_b")),
    });
    expect(loyal.moments).toContain("one_club");
    expect(journeyman.moments).not.toContain("one_club");
  });

  it("late bloomer exige curva late y pico a los 25+", () => {
    const base = createCareer({ playerSeed: "late-me", runSeed: "late-me" });
    const late = calculateLegacy({
      ...base,
      retired: true,
      player: { ...base.player, flags: { ...base.player.flags, drafted: true }, growthCurve: "late" },
      history: [
        { ...dummySeason(base), year: 1, age: 20, overall: 68, competitionId: "american_league", teamId: "tm_a" },
        { ...dummySeason(base), year: 8, age: 27, overall: 84, competitionId: "american_league", teamId: "tm_b" },
      ],
    });
    const early = calculateLegacy({
      ...base,
      retired: true,
      player: { ...base.player, flags: { ...base.player.flags, drafted: true }, growthCurve: "late" },
      history: [{ ...dummySeason(base), year: 1, age: 21, overall: 86, competitionId: "american_league" }],
    });
    expect(late.moments).toContain("late_bloomer");
    expect(early.moments).not.toContain("late_bloomer");
  });

  it("oro olímpico entra y el tope es 3", () => {
    const base = createCareer({ playerSeed: "gold-me", runSeed: "gold-me" });
    const history = Array.from({ length: 8 }, (_, i) => ({
      ...dummySeason(base),
      year: i + 1,
      age: 25 + i,
      overall: 82,
      teamId: "tm_home",
      teamName: "Home",
      competitionId: "american_league",
      awards: i === 0 ? ["MVP"] : [],
      national:
        i === 2
          ? { tournament: "olympics" as const, status: "called" as const, result: "gold" as const }
          : undefined,
    }));
    const report = calculateLegacy({
      ...base,
      retired: true,
      player: {
        ...base.player,
        flags: { ...base.player.flags, drafted: false },
        growthCurve: "late",
      },
      history,
    });
    expect(report.moments).toEqual(["undrafted_mvp", "olympic_gold", "one_club"]);
    expect(report.caps).toBe(1);
    expect(report.golds).toBe(1);
    expect(formatNationalLine(report)).toBe("Selección · 1 cap · Oro");
    expect(formatLegacyCard(report)).toContain("Sin draft. MVP.");
    expect(formatLegacyCard(report)).toContain("Selección · 1 cap · Oro");
  });

  it("el oro mundial es un momento; el continental no", () => {
    const base = createCareer({ playerSeed: "world-gold", runSeed: "world-gold" });
    const gold = (tournament: "world" | "continental") =>
      calculateLegacy({
        ...base,
        retired: true,
        player: { ...base.player, flags: { ...base.player.flags, drafted: true }, growthCurve: "standard" },
        history: [
          {
            ...dummySeason(base),
            competitionId: "american_league",
            national: { tournament, status: "called", result: "gold" },
          },
        ],
      });
    const world = gold("world");
    expect(world.moments).toContain("world_gold");
    expect(world.moments).not.toContain("olympic_gold");
    expect(formatLegacyCard(world)).toContain("Oro mundial.");
    expect(gold("continental").moments).not.toContain("world_gold");
  });

  it("sin convocatoria la carta dice Sin selección", () => {
    const base = createCareer({ playerSeed: "no-caps", runSeed: "no-caps" });
    const report = calculateLegacy({
      ...base,
      retired: true,
      history: [{ ...dummySeason(base), competitionId: "american_league" }],
    });
    expect(report.caps).toBe(0);
    expect(report.golds).toBe(0);
    expect(formatNationalLine(report)).toBe("Sin selección");
  });

  it("agrupa varias medallas y caps", () => {
    const base = createCareer({ playerSeed: "caps-me", runSeed: "caps-me" });
    const history = [
      {
        ...dummySeason(base),
        year: 1,
        national: { tournament: "continental" as const, status: "called" as const, result: "bronze" as const },
      },
      {
        ...dummySeason(base),
        year: 3,
        national: { tournament: "world" as const, status: "captain" as const, result: "gold" as const },
      },
      {
        ...dummySeason(base),
        year: 5,
        national: { tournament: "olympics" as const, status: "called" as const, result: "gold" as const },
      },
      {
        ...dummySeason(base),
        year: 7,
        national: { tournament: "continental" as const, status: "snub" as const },
      },
    ];
    const report = calculateLegacy({ ...base, retired: true, history });
    expect(report.caps).toBe(3);
    expect(report.golds).toBe(2);
    expect(report.bronzes).toBe(1);
    expect(formatNationalLine(report)).toBe("Selección · 3 caps · Oro ×2 · Bronce");
  });
});

describe("chips de premios", () => {
  it("All-Star y Jugador del año, no ids crudos; agrupa en la carta", () => {
    expect(awardLabel("AS")).toBe("All-Star");
    expect(awardLabel("POTY")).toBe("Jugador del año");
    expect(awardLabel("All-Team")).toBe("All-Team 2ª");
    expect(awardLabel("All-Rookie-1")).toBe("All-Rookie 1ª");
    expect(awardLabel("All-Rookie")).toBe("All-Rookie 2ª");
    expect(formatAwardLine(["AS", "AS", "POTY", "6MOY", "All-Team-1"])).toBe(
      "All-Star x2 · Jugador del año · 6MOY · All-Team 1ª",
    );

    const base = createCareer({ playerSeed: "award-copy", runSeed: "award-copy" });
    const report = calculateLegacy({
      ...base,
      retired: true,
      history: [
        { ...dummySeason(base), awards: ["AS", "AS", "POTY"] },
      ],
    });
    const card = formatLegacyCard(report);
    expect(card).toContain("All-Star x2");
    expect(card).toContain("Jugador del año");
    expect(card).not.toContain("POTY");
  });
});

describe("ficha copiada", () => {
  it("pinta Base, España y Tirador; no PG · ES ni ids de badge", () => {
    const base = createCareer({
      playerSeed: "share-copy",
      runSeed: "share-copy",
      position: "PG",
      nationality: "ES",
    });
    const report = calculateLegacy({
      ...base,
      retired: true,
      player: { ...base.player, badges: ["sharpshooter", "floor_general"] },
      history: [dummySeason(base)],
    });
    const card = formatLegacyCard(report);
    expect(card.split("\n")[1]).toBe("Base · España");
    expect(card).toContain("Pico OVR:");
    expect(card).not.toContain("Peak OVR");
    expect(card).not.toContain("PG · ES");
    expect(card).toContain("Tirador · Director");
    expect(card).not.toContain("sharpshooter");
    expect(card).not.toContain("floor_general");
  });
});

describe("chips de títulos", () => {
  it("agrupa ligas y no enseña el id League", () => {
    expect(titleLabel("League")).toBe("Liga");
    expect(formatTitleLine(["League", "League", "League"])).toBe("Liga x3");

    const base = createCareer({ playerSeed: "title-copy", runSeed: "title-copy" });
    const report = calculateLegacy({
      ...base,
      retired: true,
      history: [
        { ...dummySeason(base), year: 3, titles: ["League"] },
        { ...dummySeason(base), year: 7, titles: ["League"] },
      ],
    });
    expect(report.titles).toEqual(["League", "League"]);
    const card = formatLegacyCard(report);
    expect(card).toContain("Liga x2");
    expect(card).not.toContain("League");
  });

  it("agrupa el título continental", () => {
    expect(titleLabel("Continental")).toBe("Continental");
    expect(formatTitleLine(["Continental", "Continental"])).toBe("Continental x2");
    expect(awardLabel("CMVP")).toBe("MVP continental");
    expect(formatAwardLine(["CMVP", "CFMVP"])).toBe("MVP continental · FMVP continental");
  });
});

describe("pacing y replay", () => {
  it("la mayoría de temporadas no tienen giro esporádico", () => {
    let seasons = 0;
    let sporadic = 0;
    const pops: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const state = runCareer(`pace:${i}`);
      seasons += state.history.length;
      sporadic += state.history.filter((season) =>
        season.choices.some((choice) => choice.kind === "event" || choice.kind === "trade"),
      ).length;
      pops.push(state.player.flags.firedOnce.length);
    }
    expect(seasons).toBeGreaterThan(100);
    expect(sporadic / seasons).toBeLessThan(0.45);
    const sorted = [...pops].sort((a, b) => a - b);
    expect(sorted[Math.floor((sorted.length - 1) * 0.5)]!).toBeLessThanOrEqual(12);
  });

  it("con el tope de sabor, el banco sigue cortando", () => {
    const packed = Array.from({ length: SPORADIC_MUST_CAP }, (_, i) => `spent:${i}`);
    const base = benchStarState();
    const bench: CareerState = {
      ...base,
      player: { ...base.player, flags: { ...base.player.flags, firedOnce: packed } },
    };
    expect(pickMidseasonEvent(bench, createRng("force-event"))?.id).toBe("unhappy_minutes");
  });

  it("reproducir el log de comandos da la misma carrera", () => {
    const { state, commands } = playCareer("replay-log");
    expect(state.meta.commands).toEqual(commands);
    const again = replay({ playerSeed: "replay-log", runSeed: "replay-log" }, commands);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.state.history.map((season) => season.stats.pts)).toEqual(state.history.map((season) => season.stats.pts));
    expect(again.state.player.age).toBe(state.player.age);
    expect(again.state.retired).toBe(true);
  });
});

describe("producción por posición", () => {
  it("un PG reparte más y un C rebotea más, a igual overall aproximado", () => {
    const pg = findPlayer("PG");
    const c = findPlayer("C");
    const rng = createRng("box-compare");
    const pgBox = simulateBoxScore(pg, "starter", rng.fork("pg"));
    const cBox = simulateBoxScore(c, "starter", rng.fork("c"));

    expect(pgBox.ast).toBeGreaterThan(cBox.ast);
    expect(cBox.reb).toBeGreaterThan(pgBox.reb);
    expect(cBox.blk).toBeGreaterThan(pgBox.blk);
  });

  it("un PG extremo no se va a 20 AST ni a 14 REB; un C no reparte 11", () => {
    const pg = maxedPlayer(findPlayer("PG"), "playmaker");
    const c = maxedPlayer(findPlayer("C"), "rim_protector");
    const pgBox = simulateBoxScore(pg, "franchise", createRng("cap-pg"));
    const cBox = simulateBoxScore(c, "franchise", createRng("cap-c"));
    expect(pgBox.ast).toBe(POSITION_STAT_CAP.PG.ast);
    expect(pgBox.pts).toBeLessThanOrEqual(POSITION_STAT_CAP.PG.pts);
    expect(pgBox.reb).toBeLessThanOrEqual(POSITION_STAT_CAP.PG.reb);
    expect(pgBox.blk).toBeLessThanOrEqual(POSITION_STAT_CAP.PG.blk);
    expect(cBox.ast).toBeLessThanOrEqual(POSITION_STAT_CAP.C.ast);
    expect(cBox.pts).toBeLessThanOrEqual(POSITION_STAT_CAP.C.pts);
    expect(cBox.reb).toBe(POSITION_STAT_CAP.C.reb);
    expect(cBox.blk).toBe(POSITION_STAT_CAP.C.blk);
    expect(pgBox.ast).toBeGreaterThan(cBox.ast);
    expect(cBox.reb).toBeGreaterThan(pgBox.reb);
  });

  it("un 92 franchise marca claramente más que un 75 titular", () => {
    const base = findPlayer("PG");
    const low = flattenAttrs(base, 72);
    const high = flattenAttrs(base, 94);
    const starter = simulateBoxScore(low, "starter", createRng("ovr-pts"));
    const franchise = simulateBoxScore(high, "franchise", createRng("ovr-pts"));
    expect(franchise.pts).toBeGreaterThan(starter.pts + 6);
  });

  it("forma y confianza altas suben PTS; bajas las bajan", () => {
    const player = findPlayer("PG");
    const rng = () => createRng("mood-box");
    const cold = simulateBoxScore({ ...player, form: 25, confidence: 25 }, "starter", rng());
    const hot = simulateBoxScore({ ...player, form: 90, confidence: 90 }, "starter", rng());
    expect(hot.pts).toBeGreaterThan(cold.pts);
  });
});

describe("decisiones", () => {
  it("el primer SIMULATE_NEXT ofrece la ruta; el gym viene después", () => {
    const state = createCareer({ playerSeed: "train-me", runSeed: "train-me" });
    const path = dispatch(state, { type: "SIMULATE_NEXT" }).state;
    expect(path.pendingDecision?.id).toBe("path");
    expect(path.history).toHaveLength(0);
    const gym = dispatch(path, { type: "CHOOSE", optionId: "club" }).state;
    expect(gym.pendingDecision?.id).toBe("training");
    expect(gym.player.flags.path).toBe("club");
    expect(gym.world.team.competitionId).toBe("club_academy");
    expect(gym.world.team.country).toBe(gym.player.nationality);
    expect(gym.world.contract.salary).toBe(6);
    expect(gym.history).toHaveLength(0);
  });

  it("upcomingCue nombra el corte estructural y calla el giro", () => {
    const fresh = createCareer({ playerSeed: "train-me", runSeed: "train-me" });
    expect(getViewModel(fresh).upcomingCue).toBe("¿Dónde empiezas?");
    const opened = dispatch(fresh, { type: "SIMULATE_NEXT" }).state;
    expect(opened.pendingDecision?.title).toBe("¿Dónde empiezas?");
    expect(getViewModel(opened).upcomingCue).toBeUndefined();

    let state = fresh;
    let sawStructural = false;
    let guard = 0;
    while (!state.retired && guard < 80) {
      if (!state.pendingDecision && !state.awaitingRecap && !state.seasonInProgress) {
        const cue = getViewModel(state).upcomingCue;
        const next = dispatch(state, { type: "SIMULATE_NEXT" }).state;
        const kind = next.pendingDecision?.kind;
        if (kind === "path" || kind === "training" || kind === "draft" || kind === "contract" || kind === "retire") {
          expect(cue).toBe(next.pendingDecision?.title);
          if (kind !== "retire") sawStructural = true;
        } else if (next.retired) {
          expect(cue).toBe("Cerrar carrera");
        } else {
          expect(cue).toBeUndefined();
        }
        state = next;
        guard += 1;
        continue;
      }
      const command: Command = state.pendingDecision
        ? { type: "CHOOSE", optionId: state.pendingDecision.options[0]!.id }
        : { type: "SIMULATE_NEXT" };
      state = dispatch(state, command).state;
      guard += 1;
    }
    expect(sawStructural).toBe(true);
  });

  it("universidad arranca en América con stipend", () => {
    const state = createCareer({ playerSeed: "train-me", runSeed: "train-me" });
    const path = dispatch(state, { type: "SIMULATE_NEXT" }).state;
    const next = dispatch(path, { type: "CHOOSE", optionId: "college" }).state;
    expect(next.player.flags.path).toBe("college");
    expect(next.world.team.competitionId).toBe("college_circuit");
    expect(next.world.team.country).toBe("US");
    expect(next.world.contract.salary).toBe(2);
    expect(next.pendingDecision?.id).toBe("training");
  });

  it("el gym sale en desarrollo en año impar, no cada offseason", () => {
    const base = createCareer({ playerSeed: "vet-gym", runSeed: "vet-gym" });
    const quiet = {
      ...base,
      world: {
        ...base.world,
        team: { ...base.world.team, contention: 80 },
        contract: { yearsLeft: 2, salary: 40 },
      },
      player: {
        ...base.player,
        age: 26,
        experience: 7,
        workEthic: 50,
        personality: { ...base.player.personality, professionalism: 70, loyalty: 50 },
        flags: { ...base.player.flags, drafted: true, draftClosed: true },
      },
      history: [dummySeason(base)],
    };
    const evenYear: CareerState = { ...quiet, world: { ...quiet.world, year: 8 } };
    const oddYear: CareerState = { ...quiet, world: { ...quiet.world, year: 9 } };
    expect(pickDecision(evenYear, createRng("quiet-even"))?.id).not.toBe("training");
    expect(pickDecision(oddYear, createRng("quiet-odd"))?.id).toBe("training");
  });

  it("unhappy_minutes dispara en el caso canónico", () => {
    const decision = pickMidseasonEvent(benchStarState(), createRng("force-event"));
    expect(decision?.id).toBe("unhappy_minutes");
    expect(decision?.options.map((o) => o.id)).toEqual(["talk", "work", "trade"]);
  });

  it("unhappy_minutes corta a mitad y el resto del año usa el estado nuevo", () => {
    let opened = dispatch(benchStarState(), { type: "SIMULATE_NEXT" }).state;
    if (opened.pendingDecision?.id === "training") {
      opened = dispatch(opened, { type: "CHOOSE", optionId: "shooting" }).state;
    }
    if (opened.pendingDecision?.id === "path") {
      opened = dispatch(opened, { type: "CHOOSE", optionId: "club" }).state;
      if (opened.pendingDecision?.id === "training") {
        opened = dispatch(opened, { type: "CHOOSE", optionId: "shooting" }).state;
      }
    }
    expect(opened.pendingDecision?.id).toBe("unhappy_minutes");
    expect(opened.seasonInProgress).not.toBeNull();
    expect(opened.history).toHaveLength(0);
    expect(opened.seasonInProgress!.first.stats.minutes).toBeLessThan(18);
    const origin = opened.seasonInProgress!.first.teamId;

    const closed = dispatch(opened, { type: "CHOOSE", optionId: "trade" }).state;
    expect(closed.pendingDecision).toBeNull();
    expect(closed.seasonInProgress).toBeNull();
    expect(closed.history).toHaveLength(1);
    expect(closed.history[0]!.stats.games).toBeGreaterThan(opened.seasonInProgress!.first.games);
    expect(closed.history[0]!.teamId).not.toBe(origin);
    expect(closed.awaitingRecap).toBe(true);
  });

  it("tras cerrar el año el recap pausa hasta SIMULATE_NEXT", () => {
    let state = createCareer({ playerSeed: "recap-me", runSeed: "recap-me" });
    let guard = 0;
    while (state.history.length === 0 && guard < 20) {
      if (state.pendingDecision) {
        state = dispatch(state, {
          type: "CHOOSE",
          optionId: state.pendingDecision.options[0]!.id,
        }).state;
      } else {
        state = dispatch(state, { type: "SIMULATE_NEXT" }).state;
      }
      guard += 1;
    }
    expect(state.awaitingRecap).toBe(true);
    expect(getViewModel(state).recap?.year).toBe(state.history[0]!.year);
    expect(state.history[0]!.salary).toBe(6);
    expect(getViewModel(state).careerEarnings).toBe(6);
    expect(getViewModel(state).rival.pts).toBeGreaterThan(0);
    expect(getViewModel(state).clubStints).toHaveLength(1);
    expect(state.history[0]!.choices.length).toBeGreaterThan(0);
    expect(state.history[0]!.choices.map((c) => c.kind)).toContain("path");
    expect(state.history[0]!.choices.map((c) => c.kind)).toContain("training");
    expect(state.history[0]!.stats.games).toBeLessThanOrEqual(30);
    expect(state.history[0]!.competitionId).toBe("club_academy");
    expect(state.history[0]!.grade.score).toBeGreaterThanOrEqual(12);
    expect(state.history[0]!.grade.mark).toMatch(/^[SABCD]$/);
    expect(getViewModel(state).recapHeadline).toBeTruthy();
    expect(getViewModel(state).recapGrade?.score).toBe(state.history[0]!.grade.score);
    const next = dispatch(state, { type: "SIMULATE_NEXT" }).state;
    expect(next.awaitingRecap).toBe(false);
    expect(next.history).toHaveLength(1);
  });

  it("traded_involuntary dispara en american_league si hay motivo", () => {
    const base = createCareer({ playerSeed: "trade-me", runSeed: "trade-me" });
    const state: CareerState = {
      ...base,
      world: {
        ...base.world,
        year: 4,
        team: { ...base.world.team, competitionId: "american_league", contention: 32 },
        contract: { yearsLeft: 2, salary: 12 },
      },
      player: {
        ...base.player,
        age: 23,
        role: "rotation",
        morale: 70,
        flags: { ...base.player.flags, drafted: true, draftClosed: true },
      },
      history: [dummySeason(base)],
    };
    const decision = pickMidseasonEvent(state, createRng("force-trade"));
    expect(decision?.id).toBe("traded_involuntary");
    expect(decision?.kind).toBe("trade");
    expect(decision?.options.map((o) => o.id)).toEqual(["accept", "fight"]);
  });

  it("la cláusula full bloquea el trade involuntario salvo que lo hayas pedido", () => {
    const base = createCareer({ playerSeed: "ntc-me", runSeed: "ntc-me" });
    const shielded: CareerState = {
      ...base,
      world: {
        ...base.world,
        year: 4,
        team: { ...base.world.team, competitionId: "american_league", contention: 32 },
        contract: { yearsLeft: 2, salary: 12, tradeProtection: "full" },
      },
      player: {
        ...base.player,
        age: 23,
        role: "rotation",
        morale: 70,
        flags: { ...base.player.flags, drafted: true, draftClosed: true, tradeRequest: false },
      },
      history: [dummySeason(base)],
    };
    expect(pickMidseasonEvent(shielded, createRng("force-trade"))?.id).not.toBe("traded_involuntary");

    const asked: CareerState = {
      ...shielded,
      player: {
        ...shielded.player,
        flags: { ...shielded.player.flags, tradeRequest: true },
      },
    };
    expect(pickMidseasonEvent(asked, createRng("force-trade"))?.id).toBe("traded_involuntary");
  });
});

describe("draft", () => {
  it("top_3 sale con pick 1–3, sueldo 22 y equipo americano", () => {
    const next = dispatch(draftPending("top_3"), { type: "CHOOSE", optionId: "declare" }).state;
    const result = next.history.at(-1)!.draft;
    expect(next.player.flags.drafted).toBe(true);
    expect(next.world.team.competitionId).toBe("american_league");
    expect(next.world.contract.salary).toBe(22);
    expect(result?.undrafted).toBe(false);
    expect(result?.pick).toBeGreaterThanOrEqual(1);
    expect(result?.pick).toBeLessThanOrEqual(3);
    expect(getViewModel(next).recap?.draft?.pick).toBe(result!.pick);
    expect(getViewModel(next).recapNote).toBeUndefined();
  });

  it("lottery sale con pick 4–14 y sueldo 18", () => {
    const next = dispatch(draftPending("lottery"), { type: "CHOOSE", optionId: "declare" }).state;
    const result = next.history.at(-1)!.draft;
    expect(next.world.contract.salary).toBe(18);
    expect(result?.undrafted).toBe(false);
    expect(result?.pick).toBeGreaterThanOrEqual(4);
    expect(result?.pick).toBeLessThanOrEqual(14);
  });

  it("el headline de lottery es el nombre; el anillo manda si hay ambos", () => {
    const base = dummySeason(createCareer({ playerSeed: "grade-me", runSeed: "grade-me" }));
    const grade = { mark: "B" as const, score: 60 };
    expect(
      recapHeadline(
        {
          ...base,
          playoff: "missed",
          awards: [],
          draft: { band: "lottery", undrafted: false, pick: 7, teamName: "Metro" },
        },
        grade,
      ),
    ).toBe("Oyeron tu nombre.");
    expect(
      recapHeadline(
        { ...base, playoff: "missed", awards: [], draft: { band: "undrafted", undrafted: true } },
        grade,
      ),
    ).toBe("El draft pasó de largo.");
    expect(
      recapHeadline(
        {
          ...base,
          playoff: "champ",
          awards: [],
          draft: { band: "top_3", undrafted: false, pick: 1, teamName: "Metro" },
        },
        { mark: "S", score: 90 },
      ),
    ).toBe("Anillo. El resto es ruido.");
  });

  it("proyección undrafted no te elige y el recap lo dice", () => {
    const next = dispatch(draftPending("undrafted"), { type: "CHOOSE", optionId: "declare" }).state;
    expect(next.player.flags.drafted).toBe(false);
    expect(next.player.flags.draftClosed).toBe(true);
    expect(next.history.at(-1)!.draft?.undrafted).toBe(true);
    expect(next.world.team.competitionId).not.toBe("american_league");
    expect(getViewModel(next).recap?.draft?.undrafted).toBe(true);
    expect(getViewModel(next).recapNote).toBeUndefined();
  });

  it("second_round puede caer al vacío o salir en picks 31–58", () => {
    let missed = false;
    let landed: number | undefined;
    for (let i = 0; i < 30; i += 1) {
      const next = dispatch(draftPending("second_round", `sr:${i}`), {
        type: "CHOOSE",
        optionId: "declare",
      }).state;
      const result = next.history.at(-1)!.draft;
      if (result?.undrafted) missed = true;
      else if (result?.pick != null) landed = result.pick;
      if (missed && landed != null) break;
    }
    expect(missed).toBe(true);
    expect(landed).toBeGreaterThanOrEqual(31);
    expect(landed).toBeLessThanOrEqual(58);
  });

  it("esperar no te draftea y a los 19 no cierra la ventana", () => {
    const next = dispatch(draftPending("lottery"), { type: "CHOOSE", optionId: "wait" }).state;
    expect(next.player.flags.drafted).toBe(false);
    expect(next.player.flags.draftClosed).toBe(false);
    expect(next.history.at(-1)!.draft).toBeUndefined();
  });

  it("universidad puede declararse a los 19; el club no", () => {
    expect(canDeclareDraft(formationAt("college", 1, 19))).toBe(true);
    expect(canDeclareDraft(formationAt("club", 1, 19))).toBe(false);
    expect(pickDecision(formationAt("club", 1, 19), createRng("no-draft"))?.kind).not.toBe("draft");
  });

  it("el club entra a los 20 tras dos temporadas", () => {
    expect(canDeclareDraft(formationAt("club", 2, 20))).toBe(true);
    const decision = pickDecision(formationAt("club", 2, 20), createRng("club-draft"));
    expect(decision?.kind).toBe("draft");
    expect(decision?.options.find((o) => o.id === "wait")?.hint).not.toBe("Se cierra la ventana");
  });

  it("esperar en el techo cierra: universidad 20, club 21", () => {
    const uni = dispatch(draftAt("college", 20, 2), { type: "CHOOSE", optionId: "wait" }).state;
    expect(uni.player.flags.draftClosed).toBe(true);
    const clubKeep = dispatch(draftAt("club", 20, 2), { type: "CHOOSE", optionId: "wait" }).state;
    expect(clubKeep.player.flags.draftClosed).toBe(false);
    const clubClose = dispatch(draftAt("club", 21, 2), { type: "CHOOSE", optionId: "wait" }).state;
    expect(clubClose.player.flags.draftClosed).toBe(true);
  });

  it("si la universidad pasa de 20 sin declararse, sales a liga nacional", () => {
    const next = dispatch(formationAt("college", 2, 21), { type: "SIMULATE_NEXT" }).state;
    expect(next.player.flags.draftClosed).toBe(true);
    expect(next.world.team.competitionId).toBe("national_league");
  });

  it("sin ser elegido en formación sales a liga nacional", () => {
    const pending = draftPending("undrafted");
    const formed: CareerState = {
      ...pending,
      world: {
        ...pending.world,
        team: { ...pending.world.team, competitionId: "college_circuit", country: "US" },
      },
      player: {
        ...pending.player,
        flags: { ...pending.player.flags, path: "college" },
      },
    };
    const next = dispatch(formed, { type: "CHOOSE", optionId: "declare" }).state;
    expect(next.history.at(-1)!.draft?.undrafted).toBe(true);
    expect(next.world.team.competitionId).toBe("national_league");
    expect(next.world.contract.salary).toBe(8);
  });
});

describe("playoffs y badges", () => {
  it("cada temporada tiene desenlace de playoffs", () => {
    const state = runCareer("playoff-check", "playoff-check");
    expect(state.history.length).toBeGreaterThan(0);
    for (const season of state.history) {
      expect(["missed", "out", "finals", "champ"]).toContain(season.playoff);
      if (season.playoff === "missed") {
        expect(season.playoffRun).toBeUndefined();
        expect(formatPlayoffLine(season)).toBeUndefined();
      } else {
        expect(season.playoffRun?.opponentName).toBeTruthy();
        expect(season.playoffRun?.opponentId).not.toBe(season.teamId);
        expect(season.playoffRun?.opponentName).not.toBe(season.teamName);
        const need = isFormation(season.competitionId) ? 1 : 4;
        if (season.playoff === "champ") {
          expect(season.playoffRun?.wins).toBe(need);
          expect(season.playoffRun!.losses).toBeLessThan(need);
        } else {
          expect(season.playoffRun?.losses).toBe(need);
          expect(season.playoffRun!.wins).toBeLessThan(need);
        }
        expect(formatPlayoffLine(season)).toBe(
          `${season.playoffRun!.wins}-${season.playoffRun!.losses} ante ${season.playoffRun!.opponentName}`,
        );
      }
    }
    expect(state.history.some((season) => season.playoff !== "missed")).toBe(true);
  });

  it("cada temporada tiene récord de club coherente con playoffs", () => {
    const state = runCareer("playoff-check", "playoff-check");
    for (const season of state.history) {
      expect(season.teamRecord).toBeDefined();
      const games = isFormation(season.competitionId) ? 30 : 40;
      expect(season.teamRecord!.wins + season.teamRecord!.losses).toBe(games);
      expect(formatTeamRecord(season.teamRecord)).toBe(`${season.teamRecord!.wins}-${season.teamRecord!.losses}`);
      if (season.playoff === "missed") {
        expect(season.teamRecord!.wins / games).toBeLessThanOrEqual(0.52);
      }
      if (season.playoff === "champ") {
        expect(season.teamRecord!.wins / games).toBeGreaterThanOrEqual(0.58);
      }
    }
  });

  it("la misma seed pinta el mismo rival de ronda", () => {
    const a = runCareer("playoff-check", "playoff-check");
    const b = runCareer("playoff-check", "playoff-check");
    const played = a.history.find((season) => season.playoff !== "missed");
    expect(played?.playoffRun).toEqual(b.history.find((season) => season.year === played?.year)?.playoffRun);
  });

  it("unlockBadges pide dos temporadas de tiro para sharpshooter; el anillo da clutch al año", () => {
    const base = createCareer({ playerSeed: "shooter", runSeed: "shooter" });
    const hot = dummySeason(base);
    hot.stats.tpPct = 0.39;
    hot.stats.pts = 14;
    expect(unlockBadges(base.player, [hot])).not.toContain("sharpshooter");
    const again = { ...hot, year: hot.year + 1 };
    expect(unlockBadges(base.player, [hot, again])).toContain("sharpshooter");

    const ring = dummySeason(base);
    ring.playoff = "champ";
    expect(unlockBadges(base.player, [ring])).toContain("clutch");
  });

  it("el atributo clutch y el badge empujan el roll de campeón", () => {
    const player = findPlayer("PG");
    const ice = { ...player, attributes: { ...player.attributes, clutch: 42 }, badges: [] };
    const hot = { ...player, attributes: { ...player.attributes, clutch: 92 }, badges: [] };
    const badged = { ...hot, badges: ["clutch"] as Player["badges"] };
    expect(playoffClutchBoost(ice)).toBe(0);
    expect(playoffClutchBoost(hot)).toBeGreaterThan(playoffClutchBoost(ice));
    expect(playoffClutchBoost(badged)).toBeGreaterThan(playoffClutchBoost(hot));
  });

  it("floor_general empuja al equipo y no al roll de campeón", () => {
    const player = findPlayer("PG");
    const plain = { ...player, badges: [] as Player["badges"] };
    const floor = { ...player, badges: ["floor_general"] as Player["badges"] };
    expect(teamRatingBoost(plain)).toBe(0);
    expect(teamRatingBoost(floor)).toBe(0.04);
    expect(playoffClutchBoost(floor)).toBe(playoffClutchBoost(plain));
  });

  it("lockdown y rim_protector también empujan al equipo; se apilan con director", () => {
    const player = findPlayer("C");
    const lock = { ...player, badges: ["lockdown"] as Player["badges"] };
    const rim = { ...player, badges: ["rim_protector"] as Player["badges"] };
    const both = { ...player, badges: ["floor_general", "lockdown"] as Player["badges"] };
    expect(teamRatingBoost(lock)).toBe(0.03);
    expect(teamRatingBoost(rim)).toBe(0.03);
    expect(teamRatingBoost(both)).toBe(0.07);
    expect(playoffClutchBoost(lock)).toBe(playoffClutchBoost({ ...player, badges: [] }));
  });

  it("hydrate rellena cláusula none en un save viejo", () => {
    const state = createCareer({ playerSeed: "old-clause", runSeed: "old-clause" });
    const { tradeProtection: _drop, ...bareContract } = state.world.contract;
    const hydrated = hydrateCareer({
      ...state,
      world: { ...state.world, contract: bareContract },
    });
    expect(hydrated.world.contract.tradeProtection).toBe("none");
    expect(getViewModel(hydrated).tradeProtection).toBe("none");
  });

  it("hydrate rellena spent en un save viejo", () => {
    const state = createCareer({ playerSeed: "old-spent", runSeed: "old-spent" });
    const { spent: _drop, ...barePlayer } = state.player;
    const hydrated = hydrateCareer({
      ...state,
      player: barePlayer as typeof state.player,
    });
    expect(hydrated.player.spent).toBe(0);
    expect(getViewModel(hydrated).careerEarnings).toBe(0);
  });

  it("hydrate rellena newBadges en un save viejo", () => {
    const state = createCareer({ playerSeed: "old-badges", runSeed: "old-badges" });
    const { newBadges: _dropped, ...bare } = dummySeason(state);
    const hydrated = hydrateCareer({
      ...state,
      history: [bare as SeasonRecord],
    });
    expect(hydrated.history[0]!.newBadges).toEqual([]);
  });

  it("el cierre guarda en el recap los badges nuevos de ese año", () => {
    const state = runCareer("shooter", "shooter");
    expect(state.history.every((season) => Array.isArray(season.newBadges))).toBe(true);
    const listed = state.history.flatMap((season) => season.newBadges);
    expect([...listed].sort()).toEqual([...state.player.badges].sort());
  });

  it("el badge sharpshooter sube puntos en el boxscore", () => {
    const player = findPlayer("PG");
    const plain = simulateBoxScore({ ...player, badges: [] }, "starter", createRng("badge-box"));
    const tagged = simulateBoxScore(
      { ...player, badges: ["sharpshooter"] },
      "starter",
      createRng("badge-box"),
    );
    expect(tagged.pts).toBeGreaterThan(plain.pts);
  });
});

describe("continental", () => {
  it("solo la liga nacional con cartel entra; América no", () => {
    expect(clubPlaysContinental({ competitionId: "national_league", prestige: 70 })).toBe(true);
    expect(clubPlaysContinental({ competitionId: "national_league", prestige: 50 })).toBe(false);
    expect(clubPlaysContinental({ competitionId: "american_league", prestige: 90 })).toBe(false);
    expect(clubPlaysContinental({ competitionId: "club_academy", prestige: 80 })).toBe(false);
  });

  it("un club gordo puede alzar el título; lesionado o banco no juegan", () => {
    const club: Team = {
      id: "tm_conti",
      name: "Atlas Fire",
      country: "ES",
      competitionId: "national_league",
      rating: 82,
      prestige: 84,
      contention: 78,
    };
    let champ: ReturnType<typeof resolveContinental> | undefined;
    for (let i = 0; i < 80; i += 1) {
      const roll = resolveContinental(club, "star", 88, 22, false, 0.08, createRng(`conti:${i}`));
      if (roll.result === "champ") {
        champ = roll;
        break;
      }
    }
    expect(champ?.titles).toEqual(["Continental"]);
    expect(champ?.run?.wins).toBe(3);
    expect(champ!.run!.losses).toBeLessThan(3);
    expect(formatContinentalLine({ continental: "champ", continentalRun: champ!.run })).toContain("ante");
    expect(resolveContinental(club, "star", 88, 22, true, 0.08, createRng("hurt")).result).toBeUndefined();
    expect(resolveContinental(club, "bench", 88, 22, false, 0.08, createRng("bench")).result).toBeUndefined();
  });

  it("el recap nombra el continental y legacy lo puntúa menos que un anillo de liga", () => {
    const base = dummySeason(createCareer({ playerSeed: "cup", runSeed: "cup" }));
    expect(
      recapHeadline({ ...base, playoff: "missed", titles: ["Continental"] }, { mark: "A", score: 80 }),
    ).toBe("Continental. El club llegó lejos.");
    const career = createCareer({ playerSeed: "cup", runSeed: "cup" });
    const row = { ...base, competitionId: "national_league" };
    const withCup = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...row, titles: ["Continental"] }],
    });
    const withRing = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...row, titles: ["League"] }],
    });
    expect(withRing.legacyScore - withCup.legacyScore).toBe(Math.round(350 * 0.75) - 220);
  });
});

describe("selección", () => {
  it("el calendario internacional sigue el year de la run (D-10)", () => {
    expect(tournamentForYear(1)).toBeNull();
    expect(tournamentForYear(2)).toBe("continental");
    expect(tournamentForYear(4)).toBe("olympics");
    expect(tournamentForYear(6)).toBe("world");
  });

  it("el knockout nombra un rival de otro país; grupos, snub y declined no", () => {
    expect(
      formatNationalStintLine(
        { tournament: "olympics", status: "captain", result: "gold", foe: "FR" },
        "ES",
      ),
    ).toBe("Juegos España · capitán · Oro ante Francia");
    expect(formatNationalChip({ tournament: "world", status: "called", result: "out", foe: "RS" })).toBe(
      "Mundial · Eliminado ante Serbia",
    );
    expect(formatNationalStintLine({ tournament: "world", status: "snub" }, "ES")).toBe(
      "Mundial España · sin convocatoria",
    );
    expect(
      formatNationalStintLine({ tournament: "continental", status: "called", result: "groups" }, "ES"),
    ).toBe("Continental España · convocado · Fase de grupos");

    const star = { ...findPlayer("PG"), age: 22, reputation: 88 };
    let gold: ReturnType<typeof resolveNational>;
    for (let i = 0; i < 400; i += 1) {
      const stint = resolveNational(4, star, 94, undefined, createRng(`nt-gold:${i}`));
      if (stint?.result === "gold") {
        gold = stint;
        break;
      }
    }
    expect(gold?.foe).toBeTruthy();
    expect(gold!.foe).not.toBe(star.nationality);
    expect(formatNationalStintLine(gold!, star.nationality)).toMatch(/Oro ante /);

    const fringe = { ...star, reputation: 48 };
    let groups: ReturnType<typeof resolveNational>;
    for (let i = 0; i < 400; i += 1) {
      const stint = resolveNational(2, fringe, 76, undefined, createRng(`nt-grp:${i}`));
      if (stint?.result === "groups") {
        groups = stint;
        break;
      }
    }
    expect(groups?.result).toBe("groups");
    expect(groups?.foe).toBeUndefined();

    expect(resolveNational(4, { ...star, flags: { ...star.flags, skipNational: true } }, 90, undefined, createRng("nt-decl"))?.foe).toBeUndefined();
  });

  it("el titular de oro nombra al rival", () => {
    const base = dummySeason(createCareer({ playerSeed: "nt-head", runSeed: "nt-head" }));
    expect(
      recapHeadline(
        { ...base, playoff: "missed", national: { tournament: "olympics", status: "called", result: "gold", foe: "FR" } },
        { mark: "A", score: 80 },
      ),
    ).toBe("Oro ante Francia.");
    expect(
      recapHeadline(
        { ...base, playoff: "missed", national: { tournament: "olympics", status: "called", result: "gold" } },
        { mark: "A", score: 80 },
      ),
    ).toBe("Oro con la selección.");
  });

  it("un OVR alto en año de torneo entra en la convocatoria", () => {
    const player = { ...findPlayer("PG"), age: 22, reputation: 70 };
    const stint = resolveNational(2, player, 90, undefined, createRng("nt-call"));
    expect(stint?.status).toMatch(/called|captain/);
    expect(stint?.tournament).toBe("continental");
  });

  it("national_snub dispara si el recap fue snub", () => {
    const base = createCareer({ playerSeed: "nt-snub", runSeed: "nt-snub" });
    const season = dummySeason(base);
    season.national = { tournament: "world", status: "snub" };
    const state: CareerState = {
      ...base,
      world: { ...base.world, year: 7, contract: { yearsLeft: 2, salary: 12 } },
      player: {
        ...base.player,
        age: 24,
        flags: { ...base.player.flags, drafted: true, draftClosed: true },
      },
      history: [season],
    };
    const decision = pickDecision(state, createRng("force-snub"));
    expect(decision?.id).toBe("national_snub");
  });

  it("en Juegos o Mundial un cartel elige ir o saltarse el verano; el continental no pregunta", () => {
    const ready = nationalDutyState();
    const decision = pickDecision(ready, createRng("force-duty"));
    expect(decision?.id).toBe("national_duty");
    expect(decision?.title).toBe("La selección");
    expect(decision?.body).toContain("los Juegos");
    expect(decision?.options.map((option) => option.id)).toEqual(["go", "skip"]);

    const went = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "go" }).state;
    expect(went.player.flags.firedOnce).toContain("national_duty");
    expect(went.player.flags.skipNational).toBeFalsy();
    const skipped = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "skip" }).state;
    expect(skipped.player.flags.firedOnce).toContain("national_duty");
    expect(
      skipped.player.flags.skipNational || skipped.history.some((season) => season.national?.status === "declined"),
    ).toBe(true);
    expect(
      resolveNational(
        4,
        { ...ready.player, flags: { ...ready.player.flags, skipNational: true } },
        88,
        undefined,
        createRng("nt-skip"),
      )?.status,
    ).toBe("declined");

    const world = nationalDutyState({ year: 6 });
    const worldAsk = pickDecision(world, createRng("force-duty"));
    expect(worldAsk?.id).toBe("national_duty");
    expect(worldAsk?.body).toContain("el Mundial");
    expect(
      pickDecision(
        { ...world, player: { ...world.player, flags: { ...world.player.flags, firedOnce: ["national_duty"] } } },
        createRng("force-duty"),
      )?.id,
    ).not.toBe("national_duty");
    expect(pickDecision(nationalDutyState({ year: 2 }), createRng("force-duty"))?.id).not.toBe("national_duty");
    expect(pickDecision(nationalDutyState({ weak: true }), createRng("force-duty"))?.id).not.toBe("national_duty");
  });
});

describe("retiro", () => {
  it("el prompt sale tras el recap, no fuerza a los 36", () => {
    const base = createCareer({ playerSeed: "retire-me", runSeed: "retire-me" });
    const history = [dummySeason(base), dummySeason(base), dummySeason(base), dummySeason(base)];
    history.forEach((s, i) => {
      s.year = i + 1;
    });
    const state: CareerState = {
      ...base,
      awaitingRecap: true,
      history,
      player: { ...base.player, age: 36, experience: 12, role: "starter" },
      world: { ...base.world, year: 13, contract: { yearsLeft: 1, salary: 10 } },
    };
    expect(shouldForceRetire(state)).toBe(false);
    expect(shouldOfferRetire(state)).toBe(true);
    const dismissed = dispatch(state, { type: "SIMULATE_NEXT" }).state;
    expect(dismissed.awaitingRecap).toBe(false);
    expect(dismissed.retired).toBe(false);
    expect(dismissed.pendingDecision).toBeNull();
    expect(getViewModel(dismissed).upcomingCue).toBe("¿Una más?");
    const next = dispatch(dismissed, { type: "SIMULATE_NEXT" }).state;
    expect(next.pendingDecision?.id).toBe("retire");
    const hung = dispatch(next, { type: "CHOOSE", optionId: "hang" }).state;
    expect(hung.retired).toBe(true);
    expect(hung.history).toHaveLength(4);
  });

  it("una temporada más no simula el año; el siguiente SIMULATE_NEXT sigue el offseason", () => {
    const base = createCareer({ playerSeed: "one-more", runSeed: "one-more" });
    const history = [dummySeason(base), dummySeason(base), dummySeason(base), dummySeason(base)];
    const offered: CareerState = {
      ...base,
      history,
      player: { ...base.player, age: 36, experience: 12 },
      pendingDecision: {
        id: "retire",
        kind: "retire",
        title: "¿Una más?",
        body: "x",
        options: [
          { id: "one_more", label: "Una temporada más" },
          { id: "hang", label: "Colgar las botas" },
        ],
      },
    };
    const kept = dispatch(offered, { type: "CHOOSE", optionId: "one_more" }).state;
    expect(kept.retired).toBe(false);
    expect(kept.pendingDecision).toBeNull();
    expect(kept.history).toHaveLength(4);
  });
});

describe("catálogo restante", () => {
  it("hometown_discount sustituye al mercado si hay lealtad y el contrato acaba", () => {
    const base = createCareer({ playerSeed: "loyal", runSeed: "loyal" });
    const state: CareerState = {
      ...base,
      world: {
        ...base.world,
        year: 5,
        contract: { yearsLeft: 0, salary: 10 },
        team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league" },
      },
      player: {
        ...base.player,
        age: 24,
        experience: 4,
        personality: { ...base.player.personality, loyalty: 80 },
        flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
      },
      history: [dummySeason(base)],
    };
    const decision = pickDecision(state, createRng("force-home"));
    expect(decision?.id).toBe("hometown_discount");
    expect(decision?.kind).toBe("contract");
  });

  it("volver a casa saca de América una vez; USA no lo ve", () => {
    const ready = goHomeState("ES");
    const decision = pickDecision(ready, createRng("force-europa"));
    expect(decision?.id).toBe("go_home");
    expect(decision?.options.map((option) => option.id)).toEqual(["go", "stay"]);

    const opened: CareerState = { ...ready, pendingDecision: decision };
    const left = dispatch(opened, { type: "CHOOSE", optionId: "go" }).state;
    expect(left.world.team.competitionId).toBe("national_league");
    expect(left.world.contract.yearsLeft).toBe(2);
    expect(left.player.flags.firedOnce).toContain("go_home");
    expect(left.world.contract.salary).toBeLessThan(ready.world.contract.salary);

    const stayed = dispatch(opened, { type: "CHOOSE", optionId: "stay" }).state;
    expect(stayed.world.team.competitionId).toBe("american_league");
    expect(stayed.player.flags.firedOnce).toContain("go_home");
    expect(
      pickDecision(
        { ...stayed, pendingDecision: null, awaitingRecap: false, seasonInProgress: null },
        createRng("force-europa"),
      )?.id,
    ).not.toBe("go_home");

    expect(pickDecision(goHomeState("US"), createRng("force-europa"))?.id).not.toBe("go_home");
    expect(pickDecision({ ...ready, player: { ...ready.player, age: 24 } }, createRng("force-europa"))?.id).not.toBe(
      "go_home",
    );
  });

  it("casa y coche gasta una vez; USA con sueldo alto lo ve y no roba volver a casa", () => {
    const ready = lifestyleFlexState();
    const decision = pickDecision(ready, createRng("force-flex"));
    expect(decision?.id).toBe("lifestyle_flex");
    expect(decision?.options.map((option) => option.id)).toEqual(["flex", "save"]);
    expect(decision?.options[0]?.hint).toContain(formatWage(LIFESTYLE_SPEND));

    const opened: CareerState = { ...ready, pendingDecision: decision };
    const flexed = dispatch(opened, { type: "CHOOSE", optionId: "flex" }).state;
    expect(flexed.player.spent).toBe(LIFESTYLE_SPEND);
    expect(flexed.player.flags.firedOnce).toContain("lifestyle_flex");
    expect(flexed.player.personality.ego).toBeGreaterThan(ready.player.personality.ego);
    const gross = flexed.history.reduce((sum, season) => sum + season.salary, 0);
    expect(getViewModel(flexed).careerEarnings).toBe(netEarnings(
      flexed.history.map((season) => season.salary),
      flexed.player.spent,
    ));
    expect(getViewModel(flexed).careerEarnings).toBe(gross - LIFESTYLE_SPEND);
    expect(calculateLegacy({ ...flexed, retired: true }).earnings).toBe(gross - LIFESTYLE_SPEND);

    const saved = dispatch(opened, { type: "CHOOSE", optionId: "save" }).state;
    expect(saved.player.spent).toBe(0);
    expect(saved.player.personality.professionalism).toBeGreaterThan(ready.player.personality.professionalism);
    expect(saved.player.flags.firedOnce).toContain("lifestyle_flex");
    expect(
      pickDecision(
        { ...saved, pendingDecision: null, awaitingRecap: false, seasonInProgress: null },
        createRng("force-flex"),
      )?.id,
    ).not.toBe("lifestyle_flex");

    expect(pickDecision({ ...ready, world: { ...ready.world, contract: { ...ready.world.contract, salary: 10 } } }, createRng("force-flex"))?.id).not.toBe(
      "lifestyle_flex",
    );
    expect(pickDecision({ ...ready, player: { ...ready.player, age: 24 } }, createRng("force-flex"))?.id).not.toBe(
      "lifestyle_flex",
    );
    expect(pickDecision(goHomeState("ES"), createRng("force-europa"))?.id).toBe("go_home");
    expect(pickDecision(goHomeState("US"), createRng("force-europa"))?.id).toBe("lifestyle_flex");
  });

  it("perder las finales pide repetir o el cambio; el anillo no pregunta", () => {
    const ready = finalsHangoverState();
    const decision = pickDecision(ready, createRng("force-finals"));
    expect(decision?.id).toBe("finals_hangover");
    expect(decision?.title).toBe("Tan cerca");
    expect(decision?.options.map((option) => option.id)).toEqual(["run", "leave"]);

    const ran = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "run" }).state;
    expect(ran.player.flags.firedOnce).toContain("finals_hangover");
    expect(ran.player.morale).toBeGreaterThan(ready.player.morale);
    expect(ran.player.flags.tradeRequest).toBe(false);
    const left = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "leave" }).state;
    expect(left.player.flags.tradeRequest).toBe(true);
    expect(left.player.coachRelation).toBeLessThan(ready.player.coachRelation);
    expect(pickDecision(finalsHangoverState({ playoff: "champ" }), createRng("force-finals"))?.id).not.toBe(
      "finals_hangover",
    );
    expect(pickDecision(finalsHangoverState({ role: "rotation" }), createRng("force-finals"))?.id).not.toBe(
      "finals_hangover",
    );
    expect(pickMidseasonEvent(finalsHangoverState(), createRng("force-finals"))?.id).not.toBe("finals_hangover");
  });

  it("leaving_home dispara tras 3 años y uno en otro club; cut vs linger; una vez", () => {
    const ready = leavingHomeState();
    const decision = pickDecision(ready, createRng("force-leave"));
    expect(decision?.id).toBe("leaving_home");
    expect(decision?.title).toBe("El club de siempre");
    expect(decision?.body).toContain("Harbor Wolves");
    expect(decision?.body).toContain("Metro Hawks");
    expect(decision?.options.map((option) => option.id)).toEqual(["cut", "linger"]);

    const opened: CareerState = { ...ready, pendingDecision: decision };
    const cut = dispatch(opened, { type: "CHOOSE", optionId: "cut" }).state;
    expect(cut.player.flags.firedOnce).toContain("leaving_home");
    expect(cut.player.personality.professionalism).toBeGreaterThan(ready.player.personality.professionalism);
    expect(cut.player.coachRelation).toBeGreaterThan(ready.player.coachRelation);

    const lingered = dispatch(opened, { type: "CHOOSE", optionId: "linger" }).state;
    expect(lingered.player.flags.firedOnce).toContain("leaving_home");
    expect(lingered.player.personality.loyalty).toBeGreaterThan(ready.player.personality.loyalty);
    expect(lingered.player.morale).toBeLessThan(ready.player.morale);
    expect(getViewModel(lingered).clubStanding).not.toBe("loved");

    expect(
      pickDecision(
        { ...cut, pendingDecision: null, awaitingRecap: false, seasonInProgress: null },
        createRng("force-leave"),
      )?.id,
    ).not.toBe("leaving_home");

    expect(pickDecision(leavingHomeState({ tenure: 2 }), createRng("force-leave"))?.id).not.toBe("leaving_home");
    expect(pickDecision(leavingHomeState({ formation: true }), createRng("force-leave"))?.id).not.toBe(
      "leaving_home",
    );
    expect(pickDecision(leavingHomeState({ salary: 22 }), createRng("force-leave"))?.id).toBe("leaving_home");
    expect(pickDecision(goHomeState("ES"), createRng("force-europa"))?.id).toBe("go_home");
  });

  it("el mercado enseña tres ofertas y ninguna gana en dinero, minutos y títulos", () => {
    const decision = pickDecision(marketState(), createRng("force-market"));
    expect(decision?.id).toBe("contract");
    expect(decision?.options.map((option) => option.id)).toEqual(["stay", "leave", "ring"]);
    const data = decision!.data!;
    expect(data.maxOffer!.salary).toBeGreaterThan(data.stayOffer!.salary);
    expect(data.stayOffer!.salary).toBeGreaterThan(data.ringOffer!.salary);
    expect(data.ringTeam!.contention).toBeGreaterThan(data.leaveTeam!.contention);
    expect(data.stayOffer!.roleBias).toBeGreaterThan(data.ringOffer!.roleBias);
    expect(data.stayOffer!.protection).toBe("full");
    expect(data.maxOffer!.protection).toBe("none");
    expect(data.ringOffer!.protection).toBe("none");
  });

  it("franchise_player mejora el stay y no toca el max", () => {
    const state = marketState();
    const plain = pickDecision(state, createRng("force-market"))!.data!;
    const face = {
      ...state,
      player: { ...state.player, badges: ["franchise_player"] as Player["badges"] },
    };
    const deal = pickDecision(face, createRng("force-market"))!.data!;
    expect(deal.stayOffer!.salary).toBeGreaterThan(plain.stayOffer!.salary);
    expect(deal.stayOffer!.years).toBe(4);
    expect(plain.stayOffer!.years).toBe(3);
    expect(deal.maxOffer!.salary).toBe(plain.maxOffer!.salary);
    expect(deal.maxOffer!.salary).toBeGreaterThan(deal.stayOffer!.salary);
    expect(deal.stayOffer!.protection).toBe("full");
  });

  it("franchise_player pide tenure, dos años de estrella y reputación", () => {
    const base = createCareer({ playerSeed: "face-club", runSeed: "face-club" });
    const star = (year: number, role: SeasonRecord["role"]): SeasonRecord => ({
      ...dummySeason(base),
      year,
      role,
    });
    const tenure = [star(1, "rotation"), star(2, "rotation"), star(3, "star"), star(4, "star")];
    expect(unlockBadges({ ...base.player, reputation: 40 }, tenure)).not.toContain("franchise_player");
    expect(unlockBadges({ ...base.player, reputation: 58 }, tenure.slice(1))).not.toContain(
      "franchise_player",
    );
    expect(unlockBadges({ ...base.player, reputation: 58 }, tenure)).toContain("franchise_player");
  });

  it("el sueldo que se pinta es el que se firma", () => {
    const state = marketState();
    const decision = pickDecision(state, createRng("force-market"));
    const opened = { ...state, pendingDecision: decision };
    const maxed = dispatch(opened, { type: "CHOOSE", optionId: "leave" }).state;
    expect(maxed.world.contract.salary).toBe(decision!.data!.maxOffer!.salary);
    expect(maxed.world.team.id).toBe(decision!.data!.leaveTeam!.id);
    expect(maxed.world.contract.yearsLeft).toBe(3);

    const ring = dispatch(opened, { type: "CHOOSE", optionId: "ring" }).state;
    expect(ring.world.contract.salary).toBe(decision!.data!.ringOffer!.salary);
    expect(ring.world.team.id).toBe(decision!.data!.ringTeam!.id);
    expect(ring.world.contract.yearsLeft).toBe(1);

    const stayed = dispatch(opened, { type: "CHOOSE", optionId: "stay" }).state;
    expect(stayed.world.contract.tradeProtection).toBe("full");
    expect(maxed.world.contract.tradeProtection).toBe("none");
    expect(ring.world.contract.tradeProtection).toBe("none");
  });

  it("irse del mercado enfría el chip si el club te quería; quedarte no; volver a casa tampoco", () => {
    const state = lovedMarketState();
    expect(getViewModel(state).clubStanding).toBe("loved");
    const decision = pickDecision(state, createRng("force-market"));
    expect(decision?.id).toBe("contract");
    const opened: CareerState = { ...state, pendingDecision: decision };

    const left = dispatch(opened, { type: "CHOOSE", optionId: "leave" }).state;
    expect(left.world.team.id).not.toBe(state.world.team.id);
    expect(getViewModel(left).clubStanding).not.toBe("loved");
    expect(left.player.coachRelation).toBeLessThan(state.player.coachRelation);
    expect(left.player.morale).toBeLessThan(state.player.morale);

    const stayed = dispatch(opened, { type: "CHOOSE", optionId: "stay" }).state;
    expect(stayed.world.team.id).toBe(state.world.team.id);
    expect(getViewModel(stayed).clubStanding).toBe("loved");

    const home = goHomeState("ES");
    const lovedHome: CareerState = {
      ...home,
      player: { ...home.player, morale: 80, coachRelation: 80, teammateRelation: 80 },
    };
    expect(getViewModel(lovedHome).clubStanding).toBe("loved");
    const go = pickDecision(lovedHome, createRng("force-europa"));
    expect(go?.id).toBe("go_home");
    const went = dispatch({ ...lovedHome, pendingDecision: go }, { type: "CHOOSE", optionId: "go" }).state;
    expect(went.world.team.competitionId).toBe("national_league");
    expect(getViewModel(went).clubStanding).toBe("loved");
    expect(went.player.morale).toBeGreaterThanOrEqual(lovedHome.player.morale);
  });

  it("lockout_fatigue dispara a mitad con fatiga alta", () => {
    const base = createCareer({ playerSeed: "tired", runSeed: "tired" });
    const opened = benchStarState();
    const state: CareerState = {
      ...opened,
      player: { ...opened.player, fatigue: 80, morale: 70, role: "starter", coachRelation: 60 },
      seasonInProgress: {
        first: {
          games: 20,
          role: "starter",
          overall: 78,
          teamId: base.world.team.id,
          teamName: base.world.team.name,
          competitionId: base.world.team.competitionId,
          stats: dummySeason(base).stats,
        },
      },
    };
    const decision = pickMidseasonEvent(state, createRng("force-lockout"));
    expect(decision?.id).toBe("lockout_fatigue");
  });

  it("agent_conflict dispara con profesionalidad baja", () => {
    const base = createCareer({ playerSeed: "agent", runSeed: "agent" });
    const state: CareerState = {
      ...base,
      world: { ...base.world, year: 5, contract: { yearsLeft: 2, salary: 8 } },
      player: {
        ...base.player,
        age: 24,
        experience: 3,
        personality: { ...base.player.personality, professionalism: 40 },
        flags: { ...base.player.flags, drafted: true, draftClosed: true },
      },
      history: [dummySeason(base)],
    };
    const decision = pickDecision(state, createRng("force-agent"));
    expect(decision?.id).toBe("agent_conflict");
  });

  it("early_return no dice rodilla si la lesión no es de rodilla", () => {
    const decision = pickMidseasonEvent(earlyReturnState("ankle"), createRng("force-return"));
    expect(decision?.id).toBe("early_return");
    expect(decision?.title).toBe("El cuerpo");
    expect(pickMidseasonEvent(earlyReturnState("knee"), createRng("force-return"))?.title).toBe(
      "La rodilla",
    );
    const patient = earlyReturnState("knee");
    patient.player = {
      ...patient.player,
      personality: { ...patient.player.personality, ego: 40, ambition: 40 },
    };
    expect(pickMidseasonEvent(patient, createRng("force-return"))?.id).not.toBe("early_return");
  });

  it("lifestyle_pressure dispara en un titular con la cabeza abajo", () => {
    const decision = pickMidseasonEvent(pressureStarState(), createRng("force-life"));
    expect(decision?.id).toBe("lifestyle_pressure");
    expect(decision?.options.map((o) => o.id)).toEqual(["step_back", "push_through"]);
  });

  it("bajar revoluciones recorta el resto del año", () => {
    const opened = {
      ...pressureStarState(),
      pendingDecision: pickMidseasonEvent(pressureStarState(), createRng("force-life")),
    };
    expect(opened.pendingDecision?.id).toBe("lifestyle_pressure");
    const rest = dispatch(opened, { type: "CHOOSE", optionId: "step_back" }).state;
    const grind = dispatch(opened, { type: "CHOOSE", optionId: "push_through" }).state;
    expect(rest.player.roleBias).toBeLessThan(grind.player.roleBias);
    expect(rest.history[0]!.stats.minutes).toBeLessThan(grind.history[0]!.stats.minutes);
    expect(rest.history[0]!.choices.some((c) => c.kind === "event" && c.optionLabel === "Bajar revoluciones")).toBe(
      true,
    );
  });

  it("rival_heat dispara si el sombra te come a mitad", () => {
    const decision = pickMidseasonEvent(chasedByRivalState(), createRng("force-rival"));
    expect(decision?.id).toBe("rival_heat");
    expect(decision?.body).toContain("18.0 PTS");
    const hunted = dispatch(
      { ...chasedByRivalState(), pendingDecision: decision },
      { type: "CHOOSE", optionId: "hunt" },
    ).state;
    expect(hunted.player.roleBias).toBeGreaterThan(chasedByRivalState().player.roleBias);
  });

  it("la grada dispara si el club te quiere; pitos si te mira; vestuario normal no", () => {
    const loved = homeCrowdState("loved");
    const decision = pickMidseasonEvent(loved, createRng("force-crowd"));
    expect(decision?.id).toBe("home_crowd");
    expect(decision?.title).toBe("La grada");
    expect(decision?.options.map((option) => option.id)).toEqual(["soak", "humble"]);

    const soaked = dispatch({ ...loved, pendingDecision: decision }, { type: "CHOOSE", optionId: "soak" }).state;
    expect(soaked.player.flags.firedOnce).toContain("home_crowd");
    expect(soaked.player.roleBias).toBeGreaterThan(loved.player.roleBias);
    expect(soaked.player.personality.ego).toBeGreaterThan(loved.player.personality.ego);
    const humble = dispatch({ ...loved, pendingDecision: decision }, { type: "CHOOSE", optionId: "humble" }).state;
    expect(humble.player.personality.loyalty).toBeGreaterThan(loved.player.personality.loyalty);
    expect(soaked.history[0]!.stats.minutes).toBeGreaterThan(humble.history[0]!.stats.minutes);

    const cold = homeCrowdState("cold");
    const boos = pickMidseasonEvent(cold, createRng("force-crowd"));
    expect(boos?.id).toBe("home_crowd");
    expect(boos?.title).toBe("Pitos");
    expect(boos?.options.map((option) => option.id)).toEqual(["win", "out"]);
    const out = dispatch({ ...cold, pendingDecision: boos }, { type: "CHOOSE", optionId: "out" }).state;
    expect(out.player.flags.tradeRequest).toBe(true);
    expect(out.player.flags.firedOnce).toContain("home_crowd");
    const won = dispatch({ ...cold, pendingDecision: boos }, { type: "CHOOSE", optionId: "win" }).state;
    expect(won.player.roleBias).toBeGreaterThan(cold.player.roleBias);
    expect(won.player.flags.tradeRequest).toBe(false);
    expect(pickMidseasonEvent(pressureStarState(), createRng("force-life"))?.id).toBe("lifestyle_pressure");
    expect(pickMidseasonEvent(homeCrowdState("ok"), createRng("force-crowd"))?.id).not.toBe("home_crowd");
  });

  it("la prensa americana dispara con PTS altos; liga menor no; alimentar sube el uso", () => {
    const ready = mediaHeatState();
    const decision = pickMidseasonEvent(ready, createRng("force-press"));
    expect(decision?.id).toBe("media_heat");
    expect(decision?.title).toBe("La máquina");
    expect(decision?.body).toContain("20.0 PTS");
    expect(decision?.options.map((option) => option.id)).toEqual(["feed", "mute"]);

    const fed = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "feed" }).state;
    expect(fed.player.flags.firedOnce).toContain("media_heat");
    expect(fed.player.personality.ego).toBeGreaterThan(ready.player.personality.ego);
    expect(fed.player.roleBias).toBeGreaterThan(ready.player.roleBias);
    const muted = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "mute" }).state;
    expect(muted.player.personality.professionalism).toBeGreaterThan(ready.player.personality.professionalism);
    expect(fed.history[0]!.stats.minutes).toBeGreaterThan(muted.history[0]!.stats.minutes);
    expect(
      pickMidseasonEvent(
        { ...fed, pendingDecision: null, awaitingRecap: false, seasonInProgress: ready.seasonInProgress },
        createRng("force-press"),
      )?.id,
    ).not.toBe("media_heat");

    expect(pickMidseasonEvent(mediaHeatState({ competitionId: "national_league" }), createRng("force-press"))?.id).not.toBe(
      "media_heat",
    );
    expect(pickMidseasonEvent(mediaHeatState({ pts: 12 }), createRng("force-press"))?.id).not.toBe("media_heat");
  });

  it("el míster frío dispara en titular; bajar la cabeza recorta el tramo; pitos no lo roban", () => {
    const ready = coachClashState();
    const decision = pickMidseasonEvent(ready, createRng("force-clash"));
    expect(decision?.id).toBe("coach_clash");
    expect(decision?.title).toBe("El míster");
    expect(decision?.options.map((option) => option.id)).toEqual(["patch", "clash"]);

    const patched = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "patch" }).state;
    expect(patched.player.flags.firedOnce).toContain("coach_clash");
    expect(patched.player.coachRelation).toBeGreaterThan(ready.player.coachRelation);
    const clashed = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "clash" }).state;
    expect(clashed.player.coachRelation).toBeLessThan(ready.player.coachRelation);
    expect(clashed.player.roleBias).toBeGreaterThan(patched.player.roleBias);
    expect(clashed.history[0]!.stats.minutes).toBeGreaterThan(patched.history[0]!.stats.minutes);
    expect(pickMidseasonEvent(homeCrowdState("cold"), createRng("force-crowd"))?.id).toBe("home_crowd");
    expect(pickMidseasonEvent(coachClashState({ coachRelation: 60 }), createRng("force-clash"))?.id).not.toBe(
      "coach_clash",
    );
    expect(pickMidseasonEvent(benchStarState(), createRng("force-event"))?.id).toBe("unhappy_minutes");
  });

  it("el vestuario frío dispara si el míster no es el problema; pedir el balón sube el uso", () => {
    const ready = lockerIceState();
    const decision = pickMidseasonEvent(ready, createRng("force-locker"));
    expect(decision?.id).toBe("locker_ice");
    expect(decision?.title).toBe("El vestuario");
    expect(decision?.options.map((option) => option.id)).toEqual(["glue", "take"]);

    const glued = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "glue" }).state;
    expect(glued.player.flags.firedOnce).toContain("locker_ice");
    expect(glued.player.teammateRelation).toBeGreaterThan(ready.player.teammateRelation);
    const took = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "take" }).state;
    expect(took.player.teammateRelation).toBeLessThan(ready.player.teammateRelation);
    expect(took.player.roleBias).toBeGreaterThan(glued.player.roleBias);
    expect(took.history[0]!.stats.minutes).toBeGreaterThan(glued.history[0]!.stats.minutes);
    expect(pickMidseasonEvent(coachClashState(), createRng("force-clash"))?.id).toBe("coach_clash");
    expect(pickMidseasonEvent(homeCrowdState("cold"), createRng("force-crowd"))?.id).toBe("home_crowd");
    expect(pickMidseasonEvent(lockerIceState({ teammateRelation: 60 }), createRng("force-locker"))?.id).not.toBe(
      "locker_ice",
    );
  });

  it("la cara de la franquicia lleva el vestuario o sigue de estrella; la grada no lo roba", () => {
    const ready = lockerVoiceState();
    const decision = pickMidseasonEvent(ready, createRng("force-voice"));
    expect(decision?.id).toBe("locker_voice");
    expect(decision?.title).toBe("La voz");
    expect(decision?.options.map((option) => option.id)).toEqual(["carry", "score"]);

    const carried = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "carry" }).state;
    expect(carried.player.flags.firedOnce).toContain("locker_voice");
    expect(carried.player.teammateRelation).toBeGreaterThan(ready.player.teammateRelation);
    const scored = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "score" }).state;
    expect(scored.player.teammateRelation).toBeLessThan(ready.player.teammateRelation);
    expect(carried.player.roleBias).toBeGreaterThan(scored.player.roleBias);
    expect(carried.history.at(-1)!.stats.minutes).toBeGreaterThan(scored.history.at(-1)!.stats.minutes);

    const loved = homeCrowdState("loved");
    expect(pickMidseasonEvent(loved, createRng("force-crowd"))?.id).toBe("home_crowd");
    expect(
      pickMidseasonEvent(
        { ...loved, player: { ...loved.player, badges: ["franchise_player"] } },
        createRng("force-crowd"),
      )?.id,
    ).toBe("locker_voice");
    expect(pickMidseasonEvent(lockerVoiceState({ badges: [] }), createRng("force-voice"))?.id).not.toBe(
      "locker_voice",
    );
    expect(pickMidseasonEvent(benchStarState(), createRng("force-event"))?.id).toBe("unhappy_minutes");
  });

  it("un veterano de rotación cede o se agarra a los minutos; el banco gordo no lo ve", () => {
    const ready = vetMinutesState();
    const decision = pickMidseasonEvent(ready, createRng("force-vet"));
    expect(decision?.id).toBe("vet_minutes");
    expect(decision?.title).toBe("Los minutos");
    expect(decision?.options.map((option) => option.id)).toEqual(["cede", "hold"]);

    const ceded = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "cede" }).state;
    expect(ceded.player.flags.firedOnce).toContain("vet_minutes");
    expect(ceded.player.teammateRelation).toBeGreaterThan(ready.player.teammateRelation);
    const held = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "hold" }).state;
    expect(held.player.roleBias).toBeGreaterThan(ceded.player.roleBias);
    expect(held.history.at(-1)!.stats.minutes).toBeGreaterThan(ceded.history.at(-1)!.stats.minutes);
    expect(pickMidseasonEvent(vetMinutesState({ age: 24 }), createRng("force-vet"))?.id).not.toBe("vet_minutes");
    expect(pickMidseasonEvent(benchStarState(), createRng("force-event"))?.id).toBe("unhappy_minutes");
  });

  it("un titular en declive acepta menos uso o pelea el rol; el sexto no lo ve", () => {
    const ready = roleSlideState();
    const decision = pickMidseasonEvent(ready, createRng("force-slide"));
    expect(decision?.id).toBe("role_slide");
    expect(decision?.title).toBe("El rol");
    expect(decision?.options.map((option) => option.id)).toEqual(["accept", "fight"]);

    const accepted = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "accept" }).state;
    expect(accepted.player.flags.firedOnce).toContain("role_slide");
    expect(accepted.player.coachRelation).toBeGreaterThan(ready.player.coachRelation);
    const fought = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "fight" }).state;
    expect(fought.player.roleBias).toBeGreaterThan(accepted.player.roleBias);
    expect(fought.history.at(-1)!.stats.minutes).toBeGreaterThan(accepted.history.at(-1)!.stats.minutes);
    expect(pickMidseasonEvent(roleSlideState({ age: 28 }), createRng("force-slide"))?.id).not.toBe("role_slide");
    expect(pickMidseasonEvent(vetMinutesState(), createRng("force-vet"))?.id).toBe("vet_minutes");
  });

  it("una minor a mitad pide jugarla o sentarte; el resto del año cambia", () => {
    const ready = playThroughState("ankle");
    const decision = pickMidseasonEvent(ready, rngThatPicks("play_through", (rng) => pickMidseasonEvent(ready, rng)));
    expect(decision?.id).toBe("play_through");
    expect(decision?.title).toBe("El tobillo");
    expect(decision?.options.map((option) => option.id)).toEqual(["push", "sit"]);

    const pushed = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "push" }).state;
    expect(pushed.player.flags.firedOnce).toContain("play_through");
    expect(pushed.player.durability).toBeLessThan(ready.player.durability);
    const sat = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "sit" }).state;
    expect(sat.player.roleBias).toBeLessThan(pushed.player.roleBias);
    expect(pushed.history.at(-1)!.stats.minutes).toBeGreaterThan(sat.history.at(-1)!.stats.minutes);
    expect(pickMidseasonEvent(earlyReturnState("knee"), createRng("force-return"))?.id).toBe("early_return");
    expect(pickMidseasonEvent(playThroughState("back"), rngThatPicks("play_through", (rng) => pickMidseasonEvent(playThroughState("back"), rng)))?.title).toBe("El golpe");
  });

  it("la cara de la franquicia guarda piernas o caza cada noche; el recorte de fatiga no lo roba", () => {
    const ready = loadManageState();
    const decision = pickMidseasonEvent(ready, rngThatPicks("load_manage", (rng) => pickMidseasonEvent(ready, rng)));
    expect(decision?.id).toBe("load_manage");
    expect(decision?.title).toBe("Mayo");
    expect(decision?.options.map((option) => option.id)).toEqual(["save", "hunt"]);

    const saved = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "save" }).state;
    expect(saved.player.flags.firedOnce).toContain("load_manage");
    expect(saved.player.roleBias).toBeLessThan(ready.player.roleBias);
    const hunted = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "hunt" }).state;
    expect(hunted.player.roleBias).toBeGreaterThan(saved.player.roleBias);
    expect(hunted.history.at(-1)!.stats.minutes).toBeGreaterThan(saved.history.at(-1)!.stats.minutes);
    expect(pickMidseasonEvent(loadManageState({ contention: 50 }), createRng("force-mayo"))?.id).not.toBe(
      "load_manage",
    );
  });

  it("el brazalete se ofrece al amado; llevarla sube reputación y uso", () => {
    const ready = captainState();
    const decision = pickDecision(ready, rngThatPicks("captain_c", (rng) => pickDecision(ready, rng)));
    expect(decision?.id).toBe("captain_c");
    expect(decision?.title).toBe("El brazalete");
    expect(decision?.options.map((option) => option.id)).toEqual(["wear", "pass"]);

    const wore = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "wear" }).state;
    expect(wore.player.flags.firedOnce).toContain("captain_c");
    expect(wore.player.reputation).toBeGreaterThan(ready.player.reputation);
    expect(wore.player.roleBias).toBeGreaterThan(ready.player.roleBias);
    const passed = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "pass" }).state;
    expect(passed.player.personality.professionalism).toBeGreaterThan(ready.player.personality.professionalism);
    expect(wore.player.reputation).toBeGreaterThan(passed.player.reputation);
    expect(
      pickDecision(
        { ...wore, pendingDecision: null, awaitingRecap: false, seasonInProgress: null },
        createRng("force-captain"),
      )?.id,
    ).not.toBe("captain_c");
    expect(pickDecision(lifestyleFlexState(), createRng("force-flex"))?.id).toBe("lifestyle_flex");
    expect(pickDecision(captainState({ loved: false }), createRng("force-captain"))?.id).not.toBe("captain_c");
  });

  it("un sexto joven pide el cinco o sigue de bomba; el veterano no lo ve", () => {
    const ready = sixthHeatState();
    const decision = pickMidseasonEvent(ready, rngThatPicks("sixth_heat", (rng) => pickMidseasonEvent(ready, rng)));
    expect(decision?.id).toBe("sixth_heat");
    expect(decision?.title).toBe("El sexto");
    expect(decision?.options.map((option) => option.id)).toEqual(["start", "bomb"]);

    const started = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "start" }).state;
    expect(started.player.flags.firedOnce).toContain("sixth_heat");
    expect(started.player.roleBias).toBeGreaterThan(ready.player.roleBias);
    const bombed = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "bomb" }).state;
    expect(bombed.player.teammateRelation).toBeGreaterThan(ready.player.teammateRelation);
    expect(started.history.at(-1)!.stats.minutes).toBeGreaterThan(bombed.history.at(-1)!.stats.minutes);
    expect(pickMidseasonEvent(vetMinutesState(), createRng("force-vet"))?.id).toBe("vet_minutes");
    expect(pickMidseasonEvent(sixthHeatState({ age: 29 }), createRng("force-sixth"))?.id).not.toBe("sixth_heat");
  });

  it("el último año de contrato se juega o se fuerza la salida; el mercado no lo sustituye", () => {
    const ready = dealYearState();
    const decision = pickMidseasonEvent(ready, rngThatPicks("deal_year", (rng) => pickMidseasonEvent(ready, rng)));
    expect(decision?.id).toBe("deal_year");
    expect(decision?.title).toBe("El contrato");
    expect(decision?.options.map((option) => option.id)).toEqual(["grind", "out"]);

    const ground = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "grind" }).state;
    expect(ground.player.flags.firedOnce).toContain("deal_year");
    expect(ground.player.roleBias).toBeGreaterThan(ready.player.roleBias);
    const left = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "out" }).state;
    expect(left.player.flags.tradeRequest).toBe(true);
    expect(ground.history.at(-1)!.stats.minutes).toBeGreaterThan(left.history.at(-1)!.stats.minutes);
    expect(pickMidseasonEvent(dealYearState({ yearsLeft: 3 }), createRng("force-deal"))?.id).not.toBe("deal_year");
    expect(pickMidseasonEvent(loadManageState(), rngThatPicks("load_manage", (rng) => pickMidseasonEvent(loadManageState(), rng)))?.id).toBe(
      "load_manage",
    );
  });

  it("un titular en contender carga o guarda piernas; la franquicia sigue viendo Mayo", () => {
    const ready = playoffPushState();
    const decision = pickMidseasonEvent(ready, rngThatPicks("playoff_push", (rng) => pickMidseasonEvent(ready, rng)));
    expect(decision?.id).toBe("playoff_push");
    expect(decision?.title).toBe("La pelea");
    expect(decision?.options.map((option) => option.id)).toEqual(["hunt", "save"]);

    const hunted = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "hunt" }).state;
    expect(hunted.player.flags.firedOnce).toContain("playoff_push");
    const saved = dispatch({ ...ready, pendingDecision: decision }, { type: "CHOOSE", optionId: "save" }).state;
    expect(saved.player.roleBias).toBeLessThan(hunted.player.roleBias);
    expect(hunted.history.at(-1)!.stats.minutes).toBeGreaterThan(saved.history.at(-1)!.stats.minutes);
    expect(pickMidseasonEvent(loadManageState(), rngThatPicks("load_manage", (rng) => pickMidseasonEvent(loadManageState(), rng)))?.id).toBe(
      "load_manage",
    );
    expect(pickMidseasonEvent(playoffPushState({ contention: 50 }), createRng("force-push"))?.id).not.toBe(
      "playoff_push",
    );
  });
});

describe("premios", () => {
  it("MIP sale con salto claro vs el año anterior", () => {
    const player = findPlayer("PG");
    const prev = dummySeason(createCareer({ playerSeed: "mip", runSeed: "mip" }));
    prev.overall = 68;
    prev.stats.pts = 10;
    const awards = collectAwards(
      { ...player, experience: 2 },
      "starter",
      76,
      { ...prev.stats, pts: 16, minutes: 30, stl: 0.5, blk: 0.2 },
      prev,
      createRng("force-mip"),
    );
    expect(awards).toContain("MIP");
  });

  it("All-Defense sigue a DPOY o a un perfil defensivo", () => {
    const player = findPlayer("C");
    const attrs = { ...player.attributes, perimeterDefense: 80, interiorDefense: 82 };
    const awards = collectAwards(
      { ...player, attributes: attrs, experience: 4 },
      "star",
      84,
      {
        games: 40,
        minutes: 32,
        pts: 14,
        ast: 2,
        reb: 10,
        stl: 1.2,
        blk: 2.0,
        tov: 1.8,
        fgPct: 0.52,
        tpPct: 0.28,
        ftPct: 0.7,
      },
      undefined,
      createRng("force-def"),
    );
    expect(awards.includes("DPOY") || awards.some(isAllDefenseAward)).toBe(true);
    expect(awards).not.toContain("All-Defense");
  });

  it("formación no copia el set americano: POTY o All-Circuit, nunca MVP/ROY", () => {
    const player = findPlayer("PG");
    const stats = hotStats(24, 30);
    const college = collectAwards(player, "star", 84, stats, undefined, createRng("force-mvp"), {
      competitionId: "college_circuit",
    });
    const academy = collectAwards(player, "star", 84, stats, undefined, createRng("force-mvp"), {
      competitionId: "club_academy",
    });
    for (const awards of [college, academy]) {
      expect(awards).not.toContain("MVP");
      expect(awards).not.toContain("ROY");
      expect(awards).not.toContain("AS");
      expect(awards).not.toContain("DPOY");
      expect(awards.some((a) => a === "POTY" || a === "All-Circuit")).toBe(true);
    }
  });

  it("ROY es la primera temporada en american_league, no el año 1 de universidad", () => {
    const player = { ...findPlayer("PG"), experience: 2 };
    const collegeYear = { ...dummySeason(createCareer({ playerSeed: "mip", runSeed: "mip" })), competitionId: "college_circuit" };
    const stats = hotStats(14, 40);
    const first = Array.from({ length: 60 }, (_, i) =>
      collectAwards(player, "starter", 74, stats, collegeYear, createRng(`roy-hit-${i}`), {
        competitionId: "american_league",
        history: [collegeYear],
      }),
    );
    expect(first.some((a) => a.includes("ROY"))).toBe(true);
    expect(first.filter((a) => a.includes("ROY")).every((a) => a.some(isAllRookieAward))).toBe(true);

    const stillCollege = collectAwards(player, "starter", 74, stats, collegeYear, createRng("roy-hit-0"), {
      competitionId: "college_circuit",
      history: [],
    });
    expect(stillCollege).not.toContain("ROY");
    expect(stillCollege.some(isAllRookieAward)).toBe(false);

    const secondAmerican = collectAwards(player, "starter", 74, stats, collegeYear, createRng("roy-hit-0"), {
      competitionId: "american_league",
      history: [collegeYear, { ...collegeYear, competitionId: "american_league" }],
    });
    expect(secondAmerican).not.toContain("ROY");
    expect(secondAmerican.some(isAllRookieAward)).toBe(false);
  });

  it("liga nacional solo emite MVP o All-Team, y el All-Team no es automático", () => {
    const player = findPlayer("PG");
    const awards = collectAwards(player, "star", 84, hotStats(24, 40), undefined, createRng("nat-mvp"), {
      competitionId: "national_league",
    });
    expect(awards).not.toContain("ROY");
    expect(awards).not.toContain("DPOY");
    expect(awards.every((a) => a === "MVP" || isAllTeamAward(a))).toBe(true);

    let plaques = 0;
    let empty = 0;
    for (let i = 0; i < 40; i += 1) {
      const roll = collectAwards(player, "star", 84, hotStats(20, 40), undefined, createRng(`nat-cupo-${i}`), {
        competitionId: "national_league",
      });
      expect(roll.every((a) => a === "MVP" || isAllTeamAward(a))).toBe(true);
      if (roll.some(isAllTeamAward)) plaques += 1;
      if (roll.length === 0) empty += 1;
    }
    expect(plaques).toBeGreaterThan(4);
    expect(empty).toBeGreaterThan(4);
  });

  it("POTY puntúa el recap y no pesa como MVP en legacy", () => {
    const base = dummySeason(createCareer({ playerSeed: "grade-me", runSeed: "grade-me" }));
    expect(recapHeadline({ ...base, playoff: "missed", awards: ["POTY"] }, { mark: "B", score: 60 })).toBe(
      "Jugador del año.",
    );
    const poty = gradeSeason({ ...base, awards: ["POTY"], role: "star" });
    const circuit = gradeSeason({ ...base, awards: ["All-Circuit"], role: "star" });
    expect(poty.score).toBeGreaterThan(circuit.score);

    const career = createCareer({ playerSeed: "legacy-band", runSeed: "legacy-band" });
    const player = { ...career.player, flags: { ...career.player.flags, drafted: true }, growthCurve: "standard" as const };
    const potyCard = calculateLegacy({ ...career, player, retired: true, history: [{ ...base, awards: ["POTY"] }] });
    const mvpCard = calculateLegacy({ ...career, player, retired: true, history: [{ ...base, awards: ["MVP"] }] });
    expect(mvpCard.legacyScore - potyCard.legacyScore).toBe(Math.round(420 * 0.35) - Math.round(90 * 0.35));
  });

  it("un All-Team de star con 22+ PTS es snub de MVP, no silencio", () => {
    expect(detectAwardSnub("american_league", "star", hotStats(24, 40), ["All-Team-1"], "PG")).toBe("MVP");
    expect(detectAwardSnub("american_league", "star", hotStats(24, 40), ["MVP", "All-Team-1"], "PG")).toBeUndefined();
    expect(detectAwardSnub("american_league", "starter", hotStats(18, 40), [], "PG")).toBe("All-Team");
    expect(detectAwardSnub("american_league", "starter", hotStats(18, 40), ["All-Team-3"], "PG")).toBeUndefined();
    expect(detectAwardSnub("college_circuit", "star", hotStats(18, 30), ["All-Circuit"], "PG")).toBe("POTY");
    expect(detectAwardSnub("college_circuit", "star", hotStats(18, 30), ["POTY"], "PG")).toBeUndefined();
    expect(detectAwardSnub("american_league", "rotation", hotStats(18, 40), [], "PG")).toBeUndefined();
  });

  it("All-Team sale en 1ª/2ª/3ª según producción, no como chip plano", () => {
    const player = findPlayer("PG");
    const bands = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      const awards = collectAwards(player, "star", 84, hotStats(24, 40), undefined, createRng(`allteam-${i}`), {
        competitionId: "american_league",
      });
      if (awards.includes("MVP")) continue;
      const team = awards.find(isAllTeamAward);
      expect(team).toMatch(/^All-Team-[12]$/);
      expect(awards).not.toContain("All-Team");
      if (team) bands.add(team);
    }
    expect(bands.has("All-Team-1")).toBe(true);
    expect(bands.has("All-Team-2")).toBe(true);

    const starterBands = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const awards = collectAwards(player, "starter", 74, hotStats(15, 40), undefined, createRng(`allteam-st-${i}`), {
        competitionId: "american_league",
      });
      const team = awards.find(isAllTeamAward);
      if (team) starterBands.add(team);
    }
    expect(starterBands.has("All-Team-3")).toBe(true);
    expect(starterBands.has("All-Team-1")).toBe(false);

    const season = dummySeason(createCareer({ playerSeed: "grade-me", runSeed: "grade-me" }));
    const first = gradeSeason({ ...season, awards: ["All-Team-1"], role: "star" });
    const third = gradeSeason({ ...season, awards: ["All-Team-3"], role: "star" });
    expect(first.score).toBeGreaterThan(third.score);

    const career = createCareer({ playerSeed: "legacy-band", runSeed: "legacy-band" });
    const one = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...season, competitionId: "american_league", awards: ["All-Team-1"] }],
    });
    const three = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...season, competitionId: "american_league", awards: ["All-Team-3"] }],
    });
    expect(one.legacyScore - three.legacyScore).toBe(Math.round(110 * 1.15) - Math.round(50 * 1.15));
  });

  it("un C entra a All-Team por rebote y tap; un PG no, con los mismos PTS", () => {
    const c = findPlayer("C");
    const pg = findPlayer("PG");
    const big = {
      games: 40,
      minutes: 32,
      pts: 12,
      ast: 2,
      reb: 11,
      stl: 0.8,
      blk: 2.4,
      tov: 2,
      fgPct: 0.54,
      tpPct: 0.22,
      ftPct: 0.68,
    };
    const guard = { ...big, reb: 3, blk: 0.2 };
    const cAwards = collectAwards({ ...c, experience: 4 }, "star", 84, big, undefined, createRng("allteam-c"), {
      competitionId: "american_league",
    });
    const pgAwards = collectAwards({ ...pg, experience: 4 }, "star", 84, guard, undefined, createRng("allteam-pg"), {
      competitionId: "american_league",
    });
    expect(cAwards.some(isAllTeamAward)).toBe(true);
    expect(pgAwards.some(isAllTeamAward)).toBe(false);
    expect(detectAwardSnub("american_league", "star", big, [], "C")).toBe("All-Team");
    expect(detectAwardSnub("american_league", "star", guard, [], "PG")).toBeUndefined();
  });

  it("All-Defense sale en 1ª/2ª; DPOY o lockdown tira a 1ª", () => {
    const player = findPlayer("C");
    const attrs = { ...player.attributes, perimeterDefense: 80, interiorDefense: 82 };
    const box = {
      games: 40,
      minutes: 32,
      pts: 12,
      ast: 2,
      reb: 10,
      stl: 1.4,
      blk: 1.6,
      tov: 1.8,
      fgPct: 0.52,
      tpPct: 0.28,
      ftPct: 0.7,
    };
    const bands = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const awards = collectAwards(
        { ...player, attributes: attrs, experience: 4 },
        "star",
        84,
        box,
        undefined,
        createRng(`alldef-${i}`),
        { competitionId: "american_league" },
      );
      expect(awards).not.toContain("All-Defense");
      const plate = awards.find(isAllDefenseAward);
      if (plate) bands.add(plate);
    }
    expect(bands.has("All-Defense-1")).toBe(true);
    expect(bands.has("All-Defense-2")).toBe(true);

    const season = dummySeason(createCareer({ playerSeed: "grade-me", runSeed: "grade-me" }));
    const first = gradeSeason({ ...season, awards: ["All-Defense-1"], role: "star" });
    const second = gradeSeason({ ...season, awards: ["All-Defense-2"], role: "star" });
    expect(first.score).toBeGreaterThan(second.score);

    const career = createCareer({ playerSeed: "legacy-band", runSeed: "legacy-band" });
    const one = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...season, competitionId: "american_league", awards: ["All-Defense-1"] }],
    });
    const two = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...season, competitionId: "american_league", awards: ["All-Defense-2"] }],
    });
    expect(one.legacyScore - two.legacyScore).toBe(Math.round(90 * 1.15) - Math.round(70 * 1.15));
    expect(awardLabel("All-Defense-1")).toBe("All-Defense 1ª");
    expect(awardLabel("All-Defense")).toBe("All-Defense 2ª");
  });

  it("All-Rookie sale en 1ª/2ª; el ROY arrastra al equipo", () => {
    const player = findPlayer("PG");
    const quiet = hotStats(9, 40);
    const bands = new Set<string>();
    for (let i = 0; i < 80; i += 1) {
      const awards = collectAwards(player, "starter", 72, quiet, undefined, createRng(`allrook-${i}`), {
        competitionId: "american_league",
      });
      expect(awards).not.toContain("All-Rookie");
      expect(awards).not.toContain("ROY");
      const plate = awards.find(isAllRookieAward);
      if (plate) bands.add(plate);
    }
    expect(bands.has("All-Rookie-1")).toBe(true);
    expect(bands.has("All-Rookie-2")).toBe(true);

    const royYears = Array.from({ length: 60 }, (_, i) =>
      collectAwards(player, "starter", 74, hotStats(16, 40), undefined, createRng(`roy-rook-${i}`), {
        competitionId: "american_league",
      }),
    ).filter((a) => a.includes("ROY"));
    expect(royYears.length).toBeGreaterThan(0);
    expect(royYears.every((a) => a.includes("All-Rookie-1") || a.includes("All-Rookie-2"))).toBe(true);
    expect(royYears.some((a) => a.includes("All-Rookie-1"))).toBe(true);
    expect(royYears.every((a) => !a.includes("All-Rookie"))).toBe(true);

    const season = dummySeason(createCareer({ playerSeed: "grade-me", runSeed: "grade-me" }));
    const first = gradeSeason({ ...season, awards: ["All-Rookie-1"], role: "starter" });
    const second = gradeSeason({ ...season, awards: ["All-Rookie-2"], role: "starter" });
    expect(first.score).toBeGreaterThan(second.score);

    const career = createCareer({ playerSeed: "legacy-band", runSeed: "legacy-band" });
    const one = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...season, competitionId: "american_league", awards: ["All-Rookie-1"] }],
    });
    const two = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...season, competitionId: "american_league", awards: ["All-Rookie-2"] }],
    });
    const old = calculateLegacy({
      ...career,
      retired: true,
      history: [{ ...season, competitionId: "american_league", awards: ["All-Rookie"] }],
    });
    expect(one.legacyScore - two.legacyScore).toBe(Math.round(50 * 1.15) - Math.round(30 * 1.15));
    expect(two.legacyScore).toBe(old.legacyScore);
    expect(awardLabel("All-Rookie-1")).toBe("All-Rookie 1ª");
    expect(awardLabel("All-Rookie")).toBe("All-Rookie 2ª");
  });

  it("el recap enseña el snub; el giro offseason lee el flag, no los PTS sueltos", () => {
    const base = createCareer({ playerSeed: "snub-me", runSeed: "snub-me" });
    const plated = {
      ...dummySeason(base),
      competitionId: "american_league",
      role: "star" as const,
      stats: hotStats(24, 40),
      awards: ["All-Team-1"],
    };
    const hydrated = hydrateCareer({ ...base, history: [plated] });
    expect(hydrated.history[0]!.awardSnub).toBe("MVP");
    expect(awardSnubLine("MVP")).toBe("El MVP se fue a otro.");
    expect(awardSnubLine("All-Team")).toBe("Los números estaban. Las placas no.");
    expect(awardSnubLine("POTY")).toBe("Jugador del año se fue a otro.");

    const recap = getViewModel({
      ...quietPro(base, { ...plated, awardSnub: "MVP" }),
      awaitingRecap: true,
    });
    expect(recap.recap?.awardSnub).toBe("MVP");
    expect(awardSnubLine(recap.recap?.awardSnub)).toBe("El MVP se fue a otro.");

    const hits = Array.from({ length: 24 }, (_, i) => pickDecision(quietPro(base, { ...plated, awardSnub: "MVP" }), createRng(`snub-hit-${i}`))?.id);
    expect(hits).toContain("award_snub");

    const empty = {
      ...plated,
      role: "starter" as const,
      stats: hotStats(18, 40),
      awards: [] as string[],
      awardSnub: undefined,
    };
    const cold = pickDecision(quietPro(base, empty), createRng("snub-hit-0"));
    expect(cold?.id).not.toBe("award_snub");
  });
});

function formationAt(path: "club" | "college", seasons: number, age: number): CareerState {
  const base = createCareer({ playerSeed: "elig-me", runSeed: `elig-${path}` });
  return {
    ...base,
    world: {
      ...base.world,
      year: seasons + 1,
      team: {
        ...base.world.team,
        name: "Harbor Wolves",
        country: path === "college" ? "US" : base.player.nationality,
        competitionId: path === "college" ? "college_circuit" : "club_academy",
      },
      contract: { yearsLeft: 2, salary: path === "college" ? 2 : 6, tradeProtection: "none" },
    },
    player: {
      ...base.player,
      age,
      flags: { ...base.player.flags, drafted: false, draftClosed: false, path },
    },
    history: Array.from({ length: seasons }, () => dummySeason(base)),
  };
}

function draftAt(path: "club" | "college", age: number, seasons: number): CareerState {
  const base = formationAt(path, seasons, age);
  return {
    ...base,
    pendingDecision: {
      id: "draft",
      kind: "draft",
      title: "Draft americano",
      body: "Proyección",
      options: [
        { id: "declare", label: "Presentarme" },
        { id: "wait", label: "Esperar un año" },
      ],
      data: { draftBand: "lottery" },
    },
  };
}

function draftPending(band: DraftBand, runSeed = "draft-run"): CareerState {
  const base = createCareer({ playerSeed: "draft-me", runSeed });
  return {
    ...base,
    world: {
      ...base.world,
      year: 2,
      contract: { yearsLeft: 2, salary: 10, tradeProtection: "none" },
    },
    player: {
      ...base.player,
      age: 19,
      flags: { ...base.player.flags, drafted: false, draftClosed: false },
    },
    history: [dummySeason(base)],
    pendingDecision: {
      id: "draft",
      kind: "draft",
      title: "Draft americano",
      body: "Proyección",
      options: [
        { id: "declare", label: "Presentarme" },
        { id: "wait", label: "Esperar un año" },
      ],
      data: { draftBand: band },
    },
  };
}

function nationalDutyState(opts?: { year?: number; weak?: boolean }): CareerState {
  const base = createCareer({ playerSeed: "nt-duty", runSeed: "nt-duty" });
  const player = opts?.weak ? flattenAttrs(base.player, 70) : flattenAttrs(base.player, 88);
  return {
    ...base,
    world: {
      ...base.world,
      year: opts?.year ?? 4,
      contract: { yearsLeft: 2, salary: 14, tradeProtection: "none" },
      team: {
        ...base.world.team,
        name: "Harbor Wolves",
        competitionId: "national_league",
        contention: 60,
      },
    },
    player: {
      ...player,
      age: 24,
      experience: 4,
      role: "starter",
      reputation: opts?.weak ? 40 : 70,
      fatigue: 36,
      workEthic: 40,
      personality: { ...player.personality, loyalty: 40, professionalism: 72 },
      flags: { ...player.flags, drafted: true, draftClosed: true, path: "club", skipNational: false },
    },
    history: [dummySeason(base)],
  };
}

function finalsHangoverState(opts?: { playoff?: SeasonRecord["playoff"]; role?: Player["role"] }): CareerState {
  const base = createCareer({ playerSeed: "finals-hang", runSeed: "finals-hang" });
  const closed = {
    ...dummySeason(base),
    playoff: opts?.playoff ?? "finals",
    role: "starter" as const,
    teamName: "Harbor Wolves",
    competitionId: "national_league" as const,
  };
  return {
    ...base,
    world: {
      ...base.world,
      year: 6,
      contract: { yearsLeft: 2, salary: 14, tradeProtection: "none" },
      team: {
        ...base.world.team,
        name: "Harbor Wolves",
        competitionId: "national_league",
        contention: 80,
      },
    },
    player: {
      ...base.player,
      age: 25,
      experience: 5,
      role: opts?.role ?? "starter",
      morale: 58,
      coachRelation: 62,
      teammateRelation: 60,
      workEthic: 40,
      personality: { ...base.player.personality, loyalty: 40, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club", tradeRequest: false },
    },
    history: [closed],
  };
}

function goHomeState(nationality: "ES" | "US"): CareerState {
  const base = createCareer({ playerSeed: "go-home", runSeed: "go-home", nationality });
  return {
    ...base,
    world: {
      ...base.world,
      year: 10,
      contract: { yearsLeft: 2, salary: 22, tradeProtection: "none" },
      team: {
        ...base.world.team,
        name: "Metro Hawks",
        competitionId: "american_league",
        country: "US",
        contention: 80,
      },
    },
    player: {
      ...base.player,
      age: 28,
      experience: 8,
      role: "star",
      workEthic: 40,
      morale: 62,
      personality: { ...base.player.personality, loyalty: 80, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    history: [dummySeason(base)],
  };
}

function lifestyleFlexState(): CareerState {
  const base = goHomeState("US");
  return {
    ...base,
    player: {
      ...base.player,
      age: 26,
      personality: { ...base.player.personality, loyalty: 40 },
    },
  };
}

function leavingHomeState(opts?: { tenure?: number; formation?: boolean; salary?: number }): CareerState {
  const base = createCareer({ playerSeed: "leave-home", runSeed: "leave-home" });
  const tenure = opts?.tenure ?? 3;
  const oldComp = opts?.formation ? "club_academy" : "national_league";
  const homeSeasons = Array.from({ length: tenure }, (_, i) => ({
    ...dummySeason(base),
    year: i + 1,
    teamId: "home-club",
    teamName: "Harbor Wolves",
    competitionId: oldComp,
  }));
  const awaySeason = {
    ...dummySeason(base),
    year: tenure + 1,
    teamId: "new-club",
    teamName: "Metro Hawks",
    competitionId: "national_league" as const,
  };
  return {
    ...base,
    world: {
      ...base.world,
      year: tenure + 2,
      contract: { yearsLeft: 2, salary: opts?.salary ?? 12, tradeProtection: "none" },
      team: {
        ...base.world.team,
        id: "new-club",
        name: "Metro Hawks",
        competitionId: "national_league",
        contention: 80,
      },
    },
    player: {
      ...base.player,
      age: 26,
      experience: tenure + 1,
      role: "starter",
      workEthic: 40,
      morale: 62,
      personality: { ...base.player.personality, loyalty: 50, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    history: [...homeSeasons, awaySeason],
  };
}

function lovedMarketState(): CareerState {
  const base = marketState();
  return {
    ...base,
    player: {
      ...base.player,
      morale: 80,
      coachRelation: 80,
      teammateRelation: 80,
    },
  };
}

function marketState(): CareerState {
  const base = createCareer({ playerSeed: "fa-market", runSeed: "fa-market" });
  return {
    ...base,
    world: {
      ...base.world,
      year: 5,
      contract: { yearsLeft: 0, salary: 10 },
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league" },
    },
    player: {
      ...base.player,
      age: 24,
      experience: 4,
      roleBias: 0,
      personality: { ...base.player.personality, loyalty: 40 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    history: [dummySeason(base)],
  };
}

function starClashState(): CareerState {
  const base = createCareer({ playerSeed: "star-clash", runSeed: "star-clash" });
  return {
    ...base,
    world: {
      ...base.world,
      year: 5,
      team: {
        ...base.world.team,
        name: "Harbor Wolves",
        competitionId: "national_league",
        contention: 80,
        rating: 84,
      },
      locker: [{ firstName: "Mateo", lastName: "Ruiz", position: "SG", overall: 88 }],
      coachName: "Hugo Serrano",
      contract: { yearsLeft: 2, salary: 20, tradeProtection: "none" },
    },
    player: {
      ...base.player,
      age: 24,
      experience: 4,
      role: "star",
      morale: 70,
      fatigue: 40,
      personality: { ...base.player.personality, ego: 74 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true },
    },
  };
}

function benchStarState(): CareerState {
  const base = createCareer({ playerSeed: "bench-star", runSeed: "bench-star" });
  const attrs = { ...base.player.attributes };
  (Object.keys(attrs) as (keyof Attributes)[]).forEach((key) => {
    attrs[key] = 82;
  });
  return {
    ...base,
    world: { ...base.world, year: 4, contract: { yearsLeft: 2, salary: 12 } },
    player: {
      ...base.player,
      age: 22,
      attributes: attrs,
      role: "bench",
      morale: 40,
      coachRelation: 28,
      roleBias: -2,
      flags: { ...base.player.flags, drafted: true, draftClosed: true },
    },
  };
}

function earlyReturnState(type: string): CareerState {
  const base = createCareer({ playerSeed: "early-return", runSeed: "early-return" });
  return {
    ...base,
    world: { ...base.world, year: 3, contract: { yearsLeft: 2, salary: 16 } },
    player: {
      ...base.player,
      age: 22,
      role: "starter",
      morale: 70,
      fatigue: 40,
      personality: { ...base.player.personality, ego: 74, ambition: 70 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true },
    },
    seasonInProgress: {
      first: {
        games: 18,
        role: "starter",
        overall: 74,
        teamId: base.world.team.id,
        teamName: base.world.team.name,
        competitionId: base.world.team.competitionId,
        stats: dummySeason(base).stats,
        injury: { seasonYear: 3, type, severity: "moderate", gamesMissed: 12 },
      },
    },
  };
}

function playThroughState(type: string): CareerState {
  const base = createCareer({ playerSeed: "play-through", runSeed: "play-through" });
  return {
    ...base,
    world: {
      ...base.world,
      year: 4,
      contract: { yearsLeft: 2, salary: 14 },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      age: 23,
      role: "starter",
      morale: 70,
      fatigue: 40,
      personality: { ...base.player.personality, ego: 64, ambition: 40 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true },
    },
    seasonInProgress: {
      first: {
        games: 18,
        role: "starter",
        overall: 74,
        teamId: base.world.team.id,
        teamName: base.world.team.name,
        competitionId: base.world.team.competitionId,
        stats: dummySeason(base).stats,
        injury: { seasonYear: 4, type, severity: "minor", gamesMissed: 4 },
      },
    },
  };
}

function loadManageState(opts?: { contention?: number }): CareerState {
  const base = createCareer({ playerSeed: "load-manage", runSeed: "load-manage" });
  const attributes = { ...base.player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = 80;
  });
  return {
    ...base,
    world: {
      ...base.world,
      year: 6,
      team: {
        ...base.world.team,
        name: "Harbor Wolves",
        competitionId: "national_league",
        contention: opts?.contention ?? 80,
      },
      contract: { yearsLeft: 2, salary: 16, tradeProtection: "full" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      attributes,
      age: 25,
      experience: 5,
      role: "franchise",
      morale: 62,
      coachRelation: 60,
      teammateRelation: 60,
      fatigue: 40,
      roleBias: 0,
      workEthic: 40,
      personality: { ...base.player.personality, ego: 40, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "franchise",
        overall: 80,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 32, pts: 14 },
      },
    },
  };
}

function sixthHeatState(opts?: { age?: number }): CareerState {
  const base = createCareer({ playerSeed: "sixth-heat", runSeed: "sixth-heat" });
  const attributes = { ...base.player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = 76;
  });
  return {
    ...base,
    world: {
      ...base.world,
      year: 4,
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league", contention: 50 },
      contract: { yearsLeft: 2, salary: 8, tradeProtection: "none" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      attributes,
      age: opts?.age ?? 23,
      experience: 3,
      role: "sixth_man",
      morale: 62,
      coachRelation: 60,
      teammateRelation: 60,
      fatigue: 40,
      roleBias: 0,
      personality: { ...base.player.personality, ego: 40 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "sixth_man",
        overall: 76,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 22, pts: 15 },
      },
    },
  };
}

function dealYearState(opts?: { yearsLeft?: number }): CareerState {
  const base = createCareer({ playerSeed: "deal-year", runSeed: "deal-year" });
  return {
    ...base,
    world: {
      ...base.world,
      year: 6,
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league", contention: 50 },
      contract: { yearsLeft: opts?.yearsLeft ?? 1, salary: 14, tradeProtection: "none" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      age: 25,
      experience: 5,
      role: "starter",
      morale: 62,
      coachRelation: 60,
      teammateRelation: 60,
      fatigue: 40,
      roleBias: 0,
      personality: { ...base.player.personality, ego: 70, ambition: 66 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "starter",
        overall: 80,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 28, pts: 14 },
      },
    },
  };
}

function playoffPushState(opts?: { contention?: number }): CareerState {
  const base = createCareer({ playerSeed: "playoff-push", runSeed: "playoff-push" });
  return {
    ...base,
    world: {
      ...base.world,
      year: 6,
      team: {
        ...base.world.team,
        name: "Harbor Wolves",
        competitionId: "national_league",
        contention: opts?.contention ?? 80,
      },
      contract: { yearsLeft: 2, salary: 16, tradeProtection: "full" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      age: 26,
      experience: 6,
      role: "starter",
      morale: 62,
      coachRelation: 60,
      teammateRelation: 60,
      fatigue: 45,
      roleBias: 0,
      personality: { ...base.player.personality, ego: 40 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "starter",
        overall: 80,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 30, pts: 16 },
      },
    },
  };
}

function captainState(opts?: { loved?: boolean }): CareerState {
  const base = createCareer({ playerSeed: "captain-c", runSeed: "captain-c" });
  const loved = opts?.loved ?? true;
  return {
    ...base,
    world: {
      ...base.world,
      year: 8,
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league", contention: 60 },
      contract: { yearsLeft: 2, salary: 12, tradeProtection: "none" },
    },
    player: {
      ...base.player,
      age: 28,
      experience: 8,
      role: "franchise",
      morale: loved ? 80 : 55,
      coachRelation: loved ? 80 : 55,
      teammateRelation: loved ? 80 : 55,
      fatigue: 40,
      roleBias: 0,
      workEthic: 40,
      reputation: 60,
      personality: { ...base.player.personality, ego: 40, professionalism: 70, loyalty: 50 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    history: [dummySeason(base)],
  };
}

function pressureStarState(): CareerState {
  const base = createCareer({ playerSeed: "pressure-star", runSeed: "pressure-star" });
  return {
    ...base,
    world: { ...base.world, year: 5, contract: { yearsLeft: 2, salary: 18 } },
    player: {
      ...base.player,
      age: 24,
      experience: 4,
      role: "starter",
      morale: 38,
      fatigue: 62,
      coachRelation: 55,
      roleBias: 0,
      flags: { ...base.player.flags, drafted: true, draftClosed: true },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "starter",
        overall: 78,
        teamId: base.world.team.id,
        teamName: base.world.team.name,
        competitionId: base.world.team.competitionId,
        stats: { ...dummySeason(base).stats, minutes: 28, pts: 14 },
      },
    },
  };
}

function coachClashState(opts?: { coachRelation?: number }): CareerState {
  const base = createCareer({ playerSeed: "coach-clash", runSeed: "coach-clash" });
  const attributes = { ...base.player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = 82;
  });
  return {
    ...base,
    world: {
      ...base.world,
      year: 5,
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league", contention: 60 },
      contract: { yearsLeft: 2, salary: 16, tradeProtection: "full" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      attributes,
      age: 24,
      experience: 4,
      role: "starter",
      morale: 62,
      coachRelation: opts?.coachRelation ?? 34,
      teammateRelation: 62,
      fatigue: 40,
      roleBias: 0,
      workEthic: 40,
      personality: { ...base.player.personality, ego: 40, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "starter",
        overall: 76,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 28, pts: 14 },
      },
    },
  };
}

function lockerVoiceState(opts?: { badges?: Player["badges"] }): CareerState {
  const base = lockerIceState({ teammateRelation: 60 });
  return {
    ...base,
    player: {
      ...base.player,
      role: "star",
      badges: opts?.badges ?? ["franchise_player"],
    },
  };
}

function lockerIceState(opts?: { teammateRelation?: number }): CareerState {
  const base = createCareer({ playerSeed: "locker-ice", runSeed: "locker-ice" });
  const attributes = { ...base.player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = 82;
  });
  return {
    ...base,
    world: {
      ...base.world,
      year: 5,
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league", contention: 50 },
      contract: { yearsLeft: 2, salary: 16, tradeProtection: "full" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      attributes,
      age: 24,
      experience: 4,
      role: "starter",
      morale: 62,
      coachRelation: 62,
      teammateRelation: opts?.teammateRelation ?? 34,
      fatigue: 40,
      roleBias: 0,
      workEthic: 40,
      personality: { ...base.player.personality, ego: 40, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "starter",
        overall: 76,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 28, pts: 14 },
      },
    },
  };
}

function vetMinutesState(opts?: { age?: number }): CareerState {
  const base = createCareer({ playerSeed: "vet-minutes", runSeed: "vet-minutes" });
  const attributes = { ...base.player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = 74;
  });
  return {
    ...base,
    world: {
      ...base.world,
      year: 12,
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league", contention: 50 },
      contract: { yearsLeft: 2, salary: 14, tradeProtection: "full" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      attributes,
      age: opts?.age ?? 29,
      experience: 8,
      role: "sixth_man",
      morale: 62,
      coachRelation: 60,
      teammateRelation: 60,
      fatigue: 40,
      roleBias: 0,
      workEthic: 40,
      personality: { ...base.player.personality, ego: 40, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    history: [
      {
        ...dummySeason(base),
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        role: "sixth_man",
      },
    ],
    seasonInProgress: {
      first: {
        games: 20,
        role: "sixth_man",
        overall: 74,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 22, pts: 12 },
      },
    },
  };
}

function roleSlideState(opts?: { age?: number }): CareerState {
  const base = createCareer({ playerSeed: "role-slide", runSeed: "role-slide" });
  const attributes = { ...base.player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = 80;
  });
  return {
    ...base,
    world: {
      ...base.world,
      year: 15,
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league", contention: 50 },
      contract: { yearsLeft: 2, salary: 16, tradeProtection: "full" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      attributes,
      age: opts?.age ?? 32,
      experience: 12,
      role: "starter",
      morale: 62,
      coachRelation: 60,
      teammateRelation: 60,
      fatigue: 40,
      roleBias: 0,
      workEthic: 40,
      personality: { ...base.player.personality, ego: 40, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "starter",
        overall: 80,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 28, pts: 12 },
      },
    },
  };
}

function homeCrowdState(standing: "loved" | "cold" | "ok"): CareerState {
  const base = createCareer({ playerSeed: "home-crowd", runSeed: "home-crowd" });
  const heat =
    standing === "loved" ? { morale: 80, coachRelation: 80, teammateRelation: 80 } : standing === "cold"
      ? { morale: 32, coachRelation: 32, teammateRelation: 32 }
      : { morale: 60, coachRelation: 60, teammateRelation: 60 };
  return {
    ...base,
    world: {
      ...base.world,
      year: 5,
      team: { ...base.world.team, name: "Harbor Wolves", competitionId: "national_league", contention: 50 },
      contract: { yearsLeft: 2, salary: 16, tradeProtection: "full" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      age: 24,
      experience: 4,
      role: "starter",
      fatigue: 40,
      roleBias: 0,
      personality: { ...base.player.personality, ego: 40 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
      ...heat,
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "starter",
        overall: 76,
        teamId: base.world.team.id,
        teamName: "Harbor Wolves",
        competitionId: "national_league",
        stats: { ...dummySeason(base).stats, minutes: 28, pts: 14 },
      },
    },
  };
}

function mediaHeatState(opts?: { competitionId?: "american_league" | "national_league"; pts?: number }): CareerState {
  const base = createCareer({ playerSeed: "media-heat", runSeed: "media-heat" });
  const attributes = { ...base.player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = 82;
  });
  const competitionId = opts?.competitionId ?? "american_league";
  const pts = opts?.pts ?? 20;
  return {
    ...base,
    world: {
      ...base.world,
      year: 5,
      team: { ...base.world.team, name: "Metro Hawks", competitionId, contention: 50 },
      contract: { yearsLeft: 2, salary: 22, tradeProtection: "full" },
      rival: { ...base.world.rival, lastPts: 8 },
    },
    player: {
      ...base.player,
      attributes,
      age: 24,
      experience: 4,
      role: "star",
      morale: 60,
      coachRelation: 60,
      teammateRelation: 60,
      fatigue: 40,
      roleBias: 0,
      workEthic: 40,
      personality: { ...base.player.personality, ego: 40, professionalism: 72 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true, path: "club" },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "star",
        overall: 82,
        teamId: base.world.team.id,
        teamName: "Metro Hawks",
        competitionId,
        stats: { ...dummySeason(base).stats, minutes: 32, pts },
      },
    },
  };
}

function chasedByRivalState(): CareerState {
  const base = createCareer({ playerSeed: "rival-heat", runSeed: "rival-heat" });
  return {
    ...base,
    world: {
      ...base.world,
      year: 4,
      contract: { yearsLeft: 2, salary: 16 },
      rival: { ...base.world.rival, lastPts: 18, lastBlk: 0.8, lastAwards: ["All-Team"] },
    },
    player: {
      ...base.player,
      age: 23,
      experience: 3,
      role: "starter",
      morale: 60,
      fatigue: 40,
      flags: { ...base.player.flags, drafted: true, draftClosed: true },
    },
    seasonInProgress: {
      first: {
        games: 20,
        role: "starter",
        overall: 76,
        teamId: base.world.team.id,
        teamName: base.world.team.name,
        competitionId: base.world.team.competitionId,
        stats: { ...dummySeason(base).stats, minutes: 27, pts: 11 },
      },
    },
  };
}

function quietPro(base: CareerState, season: SeasonRecord): CareerState {
  return {
    ...base,
    world: {
      ...base.world,
      year: 8,
      team: { ...base.world.team, competitionId: "american_league", contention: 80 },
      contract: { yearsLeft: 2, salary: 40, tradeProtection: "none" },
    },
    player: {
      ...base.player,
      age: 28,
      experience: 6,
      workEthic: 40,
      morale: 60,
      personality: { ...base.player.personality, professionalism: 72, loyalty: 40 },
      flags: { ...base.player.flags, drafted: true, draftClosed: true },
    },
    history: [season],
  };
}

function hotStats(pts: number, games: number) {
  return {
    games,
    minutes: 32,
    pts,
    ast: 4,
    reb: 6,
    stl: 1.1,
    blk: 0.6,
    tov: 2,
    fgPct: 0.49,
    tpPct: 0.36,
    ftPct: 0.8,
  };
}

function dummySeason(state: CareerState): SeasonRecord {
  return {
    year: 3,
    age: 21,
    teamId: state.world.team.id,
    teamName: state.world.team.name,
    competitionId: state.world.team.competitionId,
    role: "rotation",
    overall: 70,
    stats: {
      games: 40,
      minutes: 18,
      pts: 8,
      ast: 3,
      reb: 3,
      stl: 0.8,
      blk: 0.2,
      tov: 1.6,
      fgPct: 0.44,
      tpPct: 0.33,
      ftPct: 0.78,
    },
    awards: [],
    titles: [],
    playoff: "missed",
    salary: state.world.contract.salary,
    choices: [],
    grade: { mark: "C", score: 50 },
    newBadges: [],
  };
}

function findPlayer(position: "PG" | "C"): Player {
  for (let i = 0; i < 400; i++) {
    const state = createCareer({ playerSeed: `hunt:${position}:${i}`, runSeed: "x" });
    if (state.player.position === position) {
      const ovr = calculateOverall(
        state.player.attributes,
        state.player.position,
        state.player.archetype,
      );
      if (ovr >= 62 && ovr <= 86) return state.player;
    }
  }
  throw new Error(`No ${position} found for test`);
}

function flattenAttrs(player: Player, value: number): Player {
  const attributes = { ...player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = value;
  });
  return { ...player, attributes };
}

function maxedPlayer(player: Player, archetype: Player["archetype"]): Player {
  const attributes = { ...player.attributes };
  (Object.keys(attributes) as (keyof Attributes)[]).forEach((key) => {
    attributes[key] = 99;
  });
  return {
    ...player,
    archetype,
    attributes,
    form: 99,
    confidence: 99,
    badges: ["floor_general", "franchise_player", "rim_protector"],
  };
}
