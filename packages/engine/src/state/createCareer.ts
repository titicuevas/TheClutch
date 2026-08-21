import {
  ENGINE_VERSION,
  FORCE_RETIRE_OVERALL,
  MAX_AGE,
  SCHEMA_VERSION,
  SOFT_RETIRE_AGE,
  SOFT_RETIRE_OVERALL,
} from "../constants";
import { CONTENT_VERSION, encodeChallengeCode } from "../daily";
import { generatePlayer, generateRival } from "../player/generate";
import { attachStaff } from "../player/locker";
import { calculateOverall } from "../player/overall";
import { createRng } from "../rng/index";
import { gradeSeason } from "../simulation/recap";
import { detectAwardSnub } from "../simulation/season";
import type { CareerMode, CareerState, CreateCareerInput, PendingDecision, Position, SeasonRecord, Team } from "./types";

export const UNSIGNED_TEAM_ID = "tm_unsigned";

const UNSIGNED: Team = {
  id: UNSIGNED_TEAM_ID,
  name: "Sin circuito",
  country: "US",
  competitionId: "club_academy",
  rating: 60,
  prestige: 50,
  contention: 50,
};

export function createCareer(input: CreateCareerInput): CareerState {
  const mode: CareerMode = input.mode ?? "free";
  const identity =
    mode === "daily"
      ? undefined
      : {
          position: input.position,
          nationality: input.nationality,
          handed: input.handed,
          givenName: input.givenName,
        };
  const playerRng = createRng(`player:${input.playerSeed}`);
  const player = generatePlayer(playerRng, identity);
  const unsigned = { ...UNSIGNED, country: player.nationality };
  const rival = generateRival(playerRng.fork("rival"), player, unsigned);
  const challengeCode = encodeChallengeCode(input.playerSeed, identity) ?? undefined;

  return {
    schemaVersion: SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    meta: {
      mode,
      playerSeed: input.playerSeed,
      runSeed: input.runSeed,
      contentVersion: CONTENT_VERSION,
      commands: [],
      ...(input.dailyDate ? { dailyDate: input.dailyDate } : {}),
      ...(challengeCode ? { challengeCode } : {}),
    },
    player,
    world: {
      team: unsigned,
      year: 1,
      contract: { yearsLeft: 3, salary: 0, tradeProtection: "none" },
      rival,
      locker: [],
      coachName: "",
      yearLog: [],
    },
    history: [],
    seasonInProgress: null,
    pendingDecision: null,
    awaitingRecap: false,
    retired: false,
  };
}

/** Completa campos nuevos en una run guardada (p.ej. rival, nota, yearLog, badges, cláusula). Determinista con la playerSeed. */
export function hydrateCareer(state: CareerState): CareerState {
  let next = state;
  let changed = false;

  if (!next.world.rival?.firstName || !next.world.rival.team?.id) {
    const rng = createRng(`player:${next.meta.playerSeed}`).fork("rival");
    next = {
      ...next,
      world: {
        ...next.world,
        rival: generateRival(rng, next.player, next.world.team),
      },
    };
    changed = true;
  }

  const locker = Array.isArray(next.world.locker) ? next.world.locker : [];
  const needsStaff =
    next.world.team.id !== UNSIGNED_TEAM_ID &&
    (locker.length === 0 || !next.world.coachName);
  if (needsStaff) {
    const rng = createRng(`player:${next.meta.playerSeed}`).fork(`staff:${next.world.team.id}`);
    next = {
      ...next,
      world: attachStaff(
        { ...next.world, locker, coachName: next.world.coachName ?? "" },
        next.world.team,
        rng,
        next.player.position,
      ),
    };
    changed = true;
  } else if (!Array.isArray(next.world.locker) || typeof next.world.coachName !== "string") {
    next = { ...next, world: { ...next.world, locker, coachName: next.world.coachName ?? "" } };
    changed = true;
  }

  if (!Array.isArray(next.world.yearLog)) {
    next = { ...next, world: { ...next.world, yearLog: [] } };
    changed = true;
  }

  if (next.world.contract.tradeProtection !== "full" && next.world.contract.tradeProtection !== "none") {
    next = {
      ...next,
      world: {
        ...next.world,
        contract: { ...next.world.contract, tradeProtection: "none" },
      },
    };
    changed = true;
  }

  const history = next.history.map((season) => fillSeasonRecord(season, next.player.position));
  if (history.some((season, index) => season !== next.history[index])) {
    next = { ...next, history };
    changed = true;
  }

  if (!Number.isFinite(next.player.spent)) {
    next = { ...next, player: { ...next.player, spent: 0 } };
    changed = true;
  }

  if (next.meta.mode !== "free" && next.meta.mode !== "daily" && next.meta.mode !== "challenge") {
    next = { ...next, meta: { ...next.meta, mode: "free" } };
    changed = true;
  }

  if (!Array.isArray(next.meta.commands)) {
    next = { ...next, meta: { ...next.meta, commands: [] } };
    changed = true;
  }

  if (!next.meta.contentVersion) {
    next = { ...next, meta: { ...next.meta, contentVersion: CONTENT_VERSION } };
    changed = true;
  }

  if (next.schemaVersion !== SCHEMA_VERSION || next.engineVersion !== ENGINE_VERSION) {
    next = { ...next, schemaVersion: SCHEMA_VERSION, engineVersion: ENGINE_VERSION };
    changed = true;
  }

  return changed ? next : state;
}

function fillSeasonRecord(season: SeasonRecord, position: Position): SeasonRecord {
  const choices = season.choices ?? [];
  const grade = season.grade ?? gradeSeason(season);
  const newBadges = season.newBadges ?? [];
  const awardSnub =
    season.awardSnub ?? detectAwardSnub(season.competitionId, season.role, season.stats, season.awards, position);
  if (
    season.choices === choices &&
    season.grade === grade &&
    season.newBadges === newBadges &&
    season.awardSnub === awardSnub
  ) {
    return season;
  }
  return { ...season, choices, grade, newBadges, awardSnub };
}

function overallOf(state: CareerState): number {
  return calculateOverall(
    state.player.attributes,
    state.player.position,
    state.player.archetype,
  );
}

/** Umbral duro: edad máxima o overall hundido. CAREER_SYSTEM §8. */
export function shouldForceRetire(state: CareerState): boolean {
  const ovr = overallOf(state);
  if (state.player.age >= MAX_AGE) return true;
  if (state.player.experience >= 8 && ovr < FORCE_RETIRE_OVERALL) return true;
  return false;
}

/** Prompt estructural: una temporada más o colgarlas. No fuerza. */
export function shouldOfferRetire(state: CareerState): boolean {
  if (shouldForceRetire(state)) return false;
  if (state.history.length < 4) return false;
  if (state.player.flags.retirePromptedYear === state.world.year) return false;
  const ovr = overallOf(state);
  const last = state.history.at(-1);
  if (state.player.age >= SOFT_RETIRE_AGE) return true;
  if (state.player.age >= 32 && ovr < SOFT_RETIRE_OVERALL) return true;
  if (state.player.age >= 33 && last?.injury?.severity === "moderate") return true;
  if (state.player.age >= 34 && (state.player.role === "bench" || state.player.role === "prospect")) {
    return true;
  }
  return false;
}

export function retireDecision(state: CareerState): PendingDecision {
  return {
    id: "retire",
    kind: "retire",
    title: "¿Una más?",
    body: `${state.player.firstName}, el cuerpo ya no es el de antes. Una temporada más en un club menor cuenta. Colgarlas también.`,
    options: [
      { id: "one_more", label: "Una temporada más", hint: "Aún puedes sumar" },
      { id: "hang", label: "Colgar las botas", hint: "Cerrar el legado" },
    ],
  };
}
