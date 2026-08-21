import { generateTeam } from "../player/generate";
import type { Rng } from "../rng/index";
import type { PlayoffRun, Team } from "../state/types";

/** Marcador al mejor de `need`. SIMULATION.md §7. */
export function seriesScore(won: boolean, need: number, clutch: number, rng: Rng): { wins: number; losses: number } {
  const maxLose = need - 1;
  const close = rng.chance(0.42 + clutch * 2);
  const other =
    maxLose === 0 ? 0 : close ? rng.int(Math.max(0, maxLose - 1), maxLose) : rng.int(0, maxLose);
  return won ? { wins: need, losses: other } : { wins: other, losses: need };
}

export function pickSeriesOpponent(home: Team, rng: Rng): { opponentId: string; opponentName: string } {
  let opponent = generateTeam(rng.fork("opp"), home.country, home.competitionId);
  if (opponent.id === home.id || opponent.name === home.name) {
    opponent = generateTeam(rng.fork("opp-b"), home.country, home.competitionId);
  }
  return { opponentId: opponent.id, opponentName: opponent.name };
}

export function buildSeriesRun(
  home: Team,
  won: boolean,
  need: number,
  clutch: number,
  rng: Rng,
): PlayoffRun {
  const opponent = pickSeriesOpponent(home, rng);
  const score = seriesScore(won, need, clutch, rng);
  return { ...opponent, ...score };
}

export function formatSeriesLine(run: PlayoffRun): string {
  return `${run.wins}-${run.losses} ante ${run.opponentName}`;
}
