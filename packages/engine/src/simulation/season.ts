import { GAMES_PER_SEASON, MID_SEASON_GAMES, isFormation } from "../constants";
import { pickMidseasonEvent } from "../decisions/pick";
import { developPlayer } from "../development/index";
import { rollInjury } from "../injuries/index";
import { unlockBadges } from "../player/badges";
import { advanceRival } from "../player/generate";
import { calculateOverall } from "../player/overall";
import { roleForAppearance } from "../player/roles";
import type { Rng } from "../rng/index";
import type {
  CareerState,
  InjuryRecord,
  Player,
  PlayoffRun,
  Position,
  Role,
  SeasonChunk,
  SeasonRecord,
  SeasonStats,
  AwardSnub,
  TeamRecord,
} from "../state/types";
import { continentalFatigue, resolveContinental } from "./continental";
import { resolveNational } from "./national";
import { gradeSeason } from "./recap";
import { simulateBoxScore } from "./boxscore";
import { buildSeriesRun } from "./series";

function seasonLength(competitionId: string): { total: number; mid: number } {
  if (isFormation(competitionId)) return { total: 30, mid: 15 };
  return { total: GAMES_PER_SEASON, mid: MID_SEASON_GAMES };
}

export function simulateSeasonChunk(
  state: CareerState,
  gamesTarget: number,
  rng: Rng,
  opts?: { skipInjury?: boolean },
): SeasonChunk {
  const player = state.player;
  const overall = calculateOverall(player.attributes, player.position, player.archetype);
  const role = roleForAppearance(player, overall);
  const injury = opts?.skipInjury ? undefined : rollInjury(player, state.world.year, rng.fork("injury"));
  const { total } = seasonLength(state.world.team.competitionId);
  const missed = injury
    ? Math.min(gamesTarget - 1, Math.round(injury.gamesMissed * (gamesTarget / total)))
    : 0;
  const games = Math.max(1, gamesTarget - missed);
  const stats = simulateBoxScore(player, role, rng.fork("box"));
  stats.games = games;

  return {
    games,
    role,
    overall,
    teamId: state.world.team.id,
    teamName: state.world.team.name,
    competitionId: state.world.team.competitionId,
    stats,
    injury: injury ? { ...injury, gamesMissed: missed } : undefined,
  };
}

/** Primera mitad; si hay giro, pausa. Si no, cierra el año. */
export function startSeason(state: CareerState, rng: Rng): CareerState {
  if (state.seasonInProgress) return finishSeason(state, rng);

  const first = simulateSeasonChunk(state, seasonLength(state.world.team.competitionId).mid, rng.fork("first"));
  const player = applyChunkToPlayer(state.player, first);
  const paused: CareerState = {
    ...state,
    player,
    seasonInProgress: { first },
  };
  const event = pickMidseasonEvent(paused, rng.fork("mid"));
  if (event) {
    return { ...paused, pendingDecision: event };
  }
  return finishSeason(paused, rng);
}

export function finishSeason(state: CareerState, rng: Rng): CareerState {
  const { total, mid } = seasonLength(state.world.team.competitionId);
  const first = state.seasonInProgress?.first ?? simulateSeasonChunk(state, mid, rng.fork("first"));
  const remaining = Math.max(0, total - first.games);
  const second =
    remaining > 0
      ? simulateSeasonChunk(state, remaining, rng.fork("second"), { skipInjury: Boolean(first.injury) })
      : undefined;
  const merged = mergeChunks(first, second);
  const player = applyChunkToPlayer(state.player, second ?? first);
  return closeSeason({ ...state, player }, merged, rng);
}

function applyChunkToPlayer(player: CareerState["player"], chunk: SeasonChunk): CareerState["player"] {
  const load = Math.round(chunk.stats.minutes * 0.22 + chunk.games * 0.4);
  const injuryHit = chunk.injury ? (chunk.injury.severity === "moderate" ? 16 : 7) : 0;
  return {
    ...player,
    role: chunk.role,
    fatigue: Math.min(95, player.fatigue + load + injuryHit),
    injuryHistory: appendInjury(player.injuryHistory, chunk.injury),
  };
}

function appendInjury(history: InjuryRecord[], injury?: InjuryRecord): InjuryRecord[] {
  if (!injury) return history;
  if (history.some((item) => item.seasonYear === injury.seasonYear && item.type === injury.type)) {
    return history;
  }
  return [...history, injury];
}

function mergeChunks(first: SeasonChunk, second?: SeasonChunk): SeasonChunk {
  if (!second || second.games <= 0) return first;
  const games = first.games + second.games;
  const w = (a: number, b: number) => (a * first.games + b * second.games) / games;
  const stats: SeasonStats = {
    games,
    minutes: round1(w(first.stats.minutes, second.stats.minutes)),
    pts: round1(w(first.stats.pts, second.stats.pts)),
    ast: round1(w(first.stats.ast, second.stats.ast)),
    reb: round1(w(first.stats.reb, second.stats.reb)),
    stl: round1(w(first.stats.stl, second.stats.stl)),
    blk: round1(w(first.stats.blk, second.stats.blk)),
    tov: round1(w(first.stats.tov, second.stats.tov)),
    fgPct: round3(w(first.stats.fgPct, second.stats.fgPct)),
    tpPct: round3(w(first.stats.tpPct, second.stats.tpPct)),
    ftPct: round3(w(first.stats.ftPct, second.stats.ftPct)),
  };
  return {
    games,
    role: second.role,
    overall: second.overall,
    teamId: second.teamId,
    teamName: second.teamName,
    competitionId: second.competitionId,
    stats,
    injury: mergeInjury(first.injury, second.injury),
  };
}

function mergeInjury(a?: InjuryRecord, b?: InjuryRecord): InjuryRecord | undefined {
  if (!a) return b;
  if (!b) return a;
  const moderate = a.severity === "moderate" || b.severity === "moderate";
  return {
    seasonYear: a.seasonYear,
    type: a.severity === "moderate" ? a.type : b.type,
    severity: moderate ? "moderate" : "minor",
    gamesMissed: a.gamesMissed + b.gamesMissed,
  };
}

/** Premios de temporada regular. Umbrales PROVISIONALES (SIMULATION.md §8.1, CAREER_SYSTEM §6.2). */
export function collectAwards(
  player: Player,
  role: Role,
  overall: number,
  stats: SeasonStats,
  prev: SeasonRecord | undefined,
  rng: Rng,
  ctx: { competitionId: string; history?: SeasonRecord[] } = { competitionId: "american_league" },
): string[] {
  const awards: string[] = [];
  const { competitionId, history = [] } = ctx;

  if (isFormation(competitionId)) {
    if (
      (role === "star" || role === "franchise" || role === "starter") &&
      stats.pts >= 16 &&
      rng.fork("poty").chance(0.22)
    ) {
      awards.push("POTY");
    } else if ((role === "starter" || role === "star" || role === "franchise") && stats.pts >= 13) {
      awards.push("All-Circuit");
    }
    return awards;
  }

  if (role === "star" || role === "franchise") {
    if (stats.pts >= 22 && rng.fork("mvp").chance(0.18)) awards.push("MVP");
    else if (allTeamVolume(player.position, stats) >= 18) {
      const p = competitionId === "american_league" ? 1 : 0.42;
      if (p === 1 || rng.fork("allteam").chance(p)) {
        awards.push(pickAllTeam(player.position, role, stats, rng));
      }
    }
  } else if (role === "starter" && allTeamVolume(player.position, stats) >= 16 && rng.fork("allteam").chance(0.35)) {
    awards.push(pickAllTeam(player.position, role, stats, rng));
  }

  if (competitionId !== "american_league") return awards;

  const firstAmerican = !history.some((season) => season.competitionId === "american_league");
  if (firstAmerican && stats.pts >= 12 && rng.fork("roy").chance(0.2)) {
    awards.push("ROY");
  }
  if (
    firstAmerican &&
    stats.games >= 20 &&
    stats.pts >= 8 &&
    (awards.includes("ROY") || rng.fork("allrook").chance(0.42))
  ) {
    awards.push(pickAllRookie(stats, awards.includes("ROY"), rng));
  }
  if (
    (role === "sixth_man" || role === "bench") &&
    stats.pts >= 14 &&
    stats.minutes >= 18 &&
    rng.fork("6moy").chance(0.32)
  ) {
    awards.push("6MOY");
  }
  if (
    (role === "starter" || role === "star" || role === "franchise" || role === "sixth_man") &&
    stats.pts >= 12 &&
    rng.fork("as").chance(role === "star" || role === "franchise" ? 0.62 : 0.34)
  ) {
    awards.push("AS");
  }
  const dScore = player.attributes.perimeterDefense + player.attributes.interiorDefense;
  if (
    (role === "starter" || role === "star" || role === "franchise") &&
    stats.stl + stats.blk >= 2.2 &&
    rng.fork("dpoy").chance(0.12)
  ) {
    awards.push("DPOY");
  }
  if (
    (role === "starter" || role === "star" || role === "franchise" || role === "sixth_man") &&
    (stats.stl + stats.blk >= 1.8 || dScore >= 150)
  ) {
    const lockdown = stats.stl + stats.blk >= 2.4 && dScore >= 150;
    if (awards.includes("DPOY") || lockdown || rng.fork("alldef").chance(0.22)) {
      awards.push(pickAllDefense(stats, dScore, awards.includes("DPOY"), rng));
    }
  }
  if (prev && player.experience >= 1) {
    const ovrJump = overall - prev.overall;
    const ptsJump = stats.pts - prev.stats.pts;
    const clear = ovrJump >= 6 || ptsJump >= 6;
    const notable = ovrJump >= 4 || ptsJump >= 4;
    if (clear || (notable && rng.fork("mip").chance(0.28))) awards.push("MIP");
  }
  return awards;
}

export function isAllTeamAward(award: string): boolean {
  return award === "All-Team" || award === "All-Team-1" || award === "All-Team-2" || award === "All-Team-3";
}

export function isAllDefenseAward(award: string): boolean {
  return award === "All-Defense" || award === "All-Defense-1" || award === "All-Defense-2";
}

export function isAllRookieAward(award: string): boolean {
  return award === "All-Rookie" || award === "All-Rookie-1" || award === "All-Rookie-2";
}

function pickAllTeam(
  position: Position,
  role: Role,
  stats: SeasonStats,
  rng: Rng,
): "All-Team-1" | "All-Team-2" | "All-Team-3" {
  const roll = rng.fork("allteam-band").next();
  const star = role === "star" || role === "franchise";
  const volume = allTeamVolume(position, stats);
  if (star && volume >= 28) {
    return roll < 0.7 ? "All-Team-1" : "All-Team-2";
  }
  if (star) {
    if (roll < 0.22) return "All-Team-1";
    if (roll < 0.72) return "All-Team-2";
    return "All-Team-3";
  }
  return roll < 0.18 ? "All-Team-2" : "All-Team-3";
}

/** Un C no necesita AST; un PG no necesita TAP. SIMULATION.md §8.1. */
export function allTeamVolume(position: Position, stats: SeasonStats): number {
  if (position === "PG") return stats.pts + stats.ast * 1.2;
  if (position === "SG") return stats.pts + stats.ast * 0.35;
  if (position === "SF") return stats.pts + stats.reb * 0.35 + stats.ast * 0.25;
  if (position === "PF") return stats.pts + stats.reb * 0.7 + stats.blk * 2;
  return stats.pts + stats.reb * 0.8 + stats.blk * 3;
}

function pickAllDefense(
  stats: SeasonStats,
  dScore: number,
  hasDpoy: boolean,
  rng: Rng,
): "All-Defense-1" | "All-Defense-2" {
  const roll = rng.fork("alldef-band").next();
  const lockdown = stats.stl + stats.blk >= 2.4 && dScore >= 150;
  if (hasDpoy || lockdown) return roll < 0.72 ? "All-Defense-1" : "All-Defense-2";
  return roll < 0.28 ? "All-Defense-1" : "All-Defense-2";
}

function pickAllRookie(
  stats: SeasonStats,
  hasRoy: boolean,
  rng: Rng,
): "All-Rookie-1" | "All-Rookie-2" {
  const roll = rng.fork("allrook-band").next();
  if (hasRoy || stats.pts >= 14) return roll < 0.72 ? "All-Rookie-1" : "All-Rookie-2";
  return roll < 0.28 ? "All-Rookie-1" : "All-Rookie-2";
}

const GORDO = new Set(["MVP", "DPOY", "FMVP", "ROY", "POTY"]);

/** Pool del gordo vs lo que salió. No lista ganadores fantasma. SIMULATION.md §8.2. */
export function detectAwardSnub(
  competitionId: string,
  role: Role,
  stats: SeasonStats,
  awards: string[],
  position: Position,
): AwardSnub | undefined {
  const starterPlus = role === "starter" || role === "star" || role === "franchise";
  if (!starterPlus) return undefined;

  if (isFormation(competitionId)) {
    if (stats.pts >= 16 && !awards.includes("POTY")) return "POTY";
    return undefined;
  }

  if (awards.includes("MVP")) return undefined;
  if ((role === "star" || role === "franchise") && stats.pts >= 22) return "MVP";
  if (
    allTeamVolume(position, stats) >= 18 &&
    !awards.some(isAllTeamAward) &&
    !awards.some((a) => GORDO.has(a))
  ) {
    return "All-Team";
  }
  return undefined;
}

function closeSeason(state: CareerState, season: SeasonChunk, rng: Rng): CareerState {
  const yearRng = rng.fork(`year:${state.world.year}`);
  const player = state.player;
  const { role, overall, stats } = season;
  const awards = collectAwards(player, role, overall, stats, state.history.at(-1), yearRng.fork("awards"), {
    competitionId: state.world.team.competitionId,
    history: state.history,
  });

  const tooInjured = Boolean(season.injury && season.injury.gamesMissed >= 18);
  const { playoff, titles: leagueTitles, playoffRun } = resolvePlayoffs(
    state,
    overall,
    role,
    stats.pts,
    tooInjured,
    yearRng.fork("playoffs"),
  );
  if (playoff === "champ" && stats.pts >= 17 && state.world.team.competitionId === "american_league" && yearRng.fork("fmvp").chance(0.42)) {
    awards.push("FMVP");
  }

  const continental = resolveContinental(
    state.world.team,
    role,
    overall,
    stats.pts,
    tooInjured,
    playoffClutchBoost(player),
    yearRng.fork("continental"),
    teamRatingBoost(player),
  );
  awards.push(...continental.awards);
  const titles = [...leagueTitles, ...continental.titles];

  const national = resolveNational(state.world.year, player, overall, season.injury, yearRng.fork("national"));
  const choices = state.world.yearLog ?? [];
  const awardSnub = detectAwardSnub(state.world.team.competitionId, role, stats, awards, player.position);
  const row: Omit<SeasonRecord, "grade" | "newBadges"> = {
    year: state.world.year,
    age: player.age,
    teamId: state.world.team.id,
    teamName: state.world.team.name,
    competitionId: state.world.team.competitionId,
    role,
    overall,
    stats,
    awards,
    titles,
    playoff,
    ...(playoffRun ? { playoffRun } : {}),
    ...(continental.result ? { continental: continental.result } : {}),
    ...(continental.run ? { continentalRun: continental.run } : {}),
    teamRecord: resolveTeamRecord(
      playoff,
      state.world.team.contention,
      seasonLength(state.world.team.competitionId).total,
      yearRng.fork("record"),
    ),
    salary: state.world.contract.salary,
    injury: season.injury,
    national,
    choices,
    draft: state.world.draftResult,
    awardSnub,
  };
  const grade = gradeSeason(row);
  const called = national?.status === "called" || national?.status === "captain";
  const medalBoost =
    national?.result === "gold" ? 8 : national?.result === "silver" ? 5 : national?.result === "bronze" ? 3 : 0;
  const extraLoad = (called ? 14 : 0) + continentalFatigue(continental.result);
  const withRole = {
    ...player,
    role,
    flags: { ...player.flags, skipNational: false },
    fatigue: extraLoad ? Math.min(95, player.fatigue + extraLoad) : player.fatigue,
    reputation: Math.max(
      20,
      Math.min(
        95,
        player.reputation +
          (awards.length ? 4 : 1) +
          (playoff === "champ" ? 5 : 0) +
          (continental.result === "champ" ? 3 : 0) +
          medalBoost +
          (called ? 2 : 0),
      ),
    ),
  };
  const badges = unlockBadges(withRole, [...state.history, { ...row, grade, newBadges: [] }]);
  const newBadges = badges.filter((id) => !player.badges.includes(id));
  const record: SeasonRecord = { ...row, grade, newBadges };
  const developed = developPlayer({ ...withRole, badges }, yearRng.fork("dev"));
  const worn = called
    ? { ...developed, fatigue: Math.min(40, developed.fatigue + 10) }
    : developed;

  return {
    ...state,
    player: worn,
    world: {
      ...state.world,
      year: state.world.year + 1,
      contract: {
        ...state.world.contract,
        yearsLeft: Math.max(0, state.world.contract.yearsLeft - 1),
      },
      rival: advanceRival(state.world.rival, yearRng.fork("rival"), state.world.team.id),
      yearLog: [],
      draftResult: undefined,
    },
    history: [...state.history, record],
    seasonInProgress: null,
    pendingDecision: null,
    awaitingRecap: true,
  };
}

function resolvePlayoffs(
  state: CareerState,
  overall: number,
  role: SeasonRecord["role"],
  pts: number,
  tooInjured: boolean,
  rng: Rng,
): { playoff: SeasonRecord["playoff"]; titles: string[]; playoffRun?: PlayoffRun } {
  if (tooInjured) return { playoff: "missed", titles: [] };
  const usage =
    role === "franchise" || role === "star" ? 0.08 : role === "starter" || role === "sixth_man" ? 0.04 : 0;
  const clutch = playoffClutchBoost(state.player);
  const strength =
    state.world.team.contention / 100 +
    overall / 280 +
    usage +
    pts / 400 +
    teamRatingBoost(state.player) +
    rng.next() * 0.12;
  if (strength < 0.5) return { playoff: "missed", titles: [] };
  if (!rng.chance(Math.min(0.92, 0.35 + strength))) return { playoff: "missed", titles: [] };
  const playoff: SeasonRecord["playoff"] = rng.chance(0.18 + strength * 0.35 + clutch)
    ? "champ"
    : rng.chance(0.32 + overall / 400)
      ? "finals"
      : "out";
  const titles = playoff === "champ" ? ["League"] : [];
  return {
    playoff,
    titles,
    playoffRun: buildSeriesRun(
      state.world.team,
      playoff === "champ",
      isFormation(state.world.team.competitionId) ? 1 : 4,
      clutch,
      rng.fork("series"),
    ),
  };
}

/** Atributo clutch + badge. SIMULATION.md §7. No clasifica; cierra series. */
export function playoffClutchBoost(player: Player): number {
  const fromAttr = Math.max(0, (player.attributes.clutch - 50) / 450);
  const fromBadge = player.badges.includes("clutch") ? 0.07 : 0;
  return fromAttr + fromBadge;
}

/** Badges de creación/defensa empujan al equipo. SIMULATION.md §6.1. Entra al strength, no al roll de campeón. */
export function teamRatingBoost(player: Player): number {
  let boost = 0;
  if (player.badges.includes("floor_general")) boost += 0.04;
  if (player.badges.includes("lockdown")) boost += 0.03;
  if (player.badges.includes("rim_protector")) boost += 0.03;
  return boost;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clampRate(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** SIMULATION.md §7. No es una clasificación real. */
function resolveTeamRecord(
  playoff: SeasonRecord["playoff"],
  contention: number,
  games: number,
  rng: Rng,
): TeamRecord {
  let rate = 0.28 + contention / 220;
  if (playoff === "champ") rate += 0.16;
  else if (playoff === "finals") rate += 0.09;
  else if (playoff === "out") rate += 0.03;
  else rate -= 0.1;
  rate = clampRate(rate + rng.next() * 0.06 - 0.03, 0.15, 0.82);
  let wins = Math.max(2, Math.min(games - 2, Math.round(games * rate)));
  if (playoff === "missed") wins = Math.min(wins, Math.floor(games * 0.52));
  if (playoff === "champ") wins = Math.max(wins, Math.ceil(games * 0.58));
  return { wins, losses: games - wins };
}
