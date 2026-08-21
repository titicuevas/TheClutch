import type { Rng } from "../rng/index";
import type { PlayoffRun, Role, Team } from "../state/types";
import { buildSeriesRun } from "./series";

export type ContinentalResult = "out" | "finals" | "champ";

export type ContinentalOutcome = {
  result?: ContinentalResult;
  titles: string[];
  awards: string[];
  run?: PlayoffRun;
};

/** Club de liga nacional con cartel. COMPETITIONS.md §5: paralelo, no segundo club. */
export function clubPlaysContinental(team: Pick<Team, "competitionId" | "prestige">): boolean {
  return team.competitionId === "national_league" && team.prestige >= 62;
}

export function resolveContinental(
  team: Team,
  role: Role,
  overall: number,
  pts: number,
  tooInjured: boolean,
  clutch: number,
  rng: Rng,
  teamBoost = 0,
): ContinentalOutcome {
  if (!clubPlaysContinental(team)) return { titles: [], awards: [] };
  if (tooInjured) return { titles: [], awards: [] };
  if (role === "prospect" || role === "bench") return { titles: [], awards: [] };

  const strength =
    team.prestige / 110 + team.contention / 140 + overall / 300 + pts / 450 + teamBoost + rng.next() * 0.14;
  if (strength < 0.48 || !rng.chance(Math.min(0.9, 0.4 + strength))) {
    return {
      result: "out",
      titles: [],
      awards: [],
      run: buildSeriesRun(team, false, 3, clutch, rng.fork("series")),
    };
  }

  const awards: string[] = [];
  const starterPlus = role === "starter" || role === "star" || role === "franchise";
  if (rng.chance(0.16 + strength * 0.32 + clutch)) {
    if (pts >= 16 && starterPlus && rng.fork("cfmvp").chance(0.55)) awards.push("CFMVP");
    if ((role === "star" || role === "franchise") && pts >= 17 && rng.fork("cmvp").chance(0.4)) {
      awards.push("CMVP");
    }
    return {
      result: "champ",
      titles: ["Continental"],
      awards,
      run: buildSeriesRun(team, true, 3, clutch, rng.fork("series")),
    };
  }

  if (rng.chance(0.3 + overall / 380)) {
    if ((role === "star" || role === "franchise") && pts >= 18 && rng.fork("cmvp").chance(0.18)) {
      awards.push("CMVP");
    }
    return {
      result: "finals",
      titles: [],
      awards,
      run: buildSeriesRun(team, false, 3, clutch, rng.fork("series")),
    };
  }

  return {
    result: "out",
    titles: [],
    awards: [],
    run: buildSeriesRun(team, false, 3, clutch, rng.fork("series")),
  };
}

export function continentalFatigue(result: ContinentalResult | undefined): number {
  if (!result) return 0;
  return result === "out" ? 8 : 12;
}
