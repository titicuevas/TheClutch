import { GAMES_PER_SEASON } from "../constants";
import { developPlayer } from "../development/index";
import { rollInjury } from "../injuries/index";
import { calculateOverall } from "../player/overall";
import { roleFromOverall } from "../player/roles";
import type { Rng } from "../rng/index";
import type { CareerState, SeasonRecord } from "../state/types";
import { simulateBoxScore } from "./boxscore";

export function simulateSeason(state: CareerState, rng: Rng): CareerState {
  const yearRng = rng.fork(`year:${state.world.year}`);
  const player = state.player;
  const overall = calculateOverall(player.attributes, player.position, player.archetype);
  const role = roleFromOverall(overall, player.age);

  const injury = rollInjury(player, state.world.year, yearRng.fork("injury"));
  const games = GAMES_PER_SEASON - (injury?.gamesMissed ?? 0);
  const stats = simulateBoxScore(player, role, yearRng.fork("box"));
  stats.games = games;

  const awards: string[] = [];
  if (role === "star" || role === "franchise") {
    if (stats.pts >= 22 && yearRng.fork("awards").chance(0.18)) awards.push("MVP");
    else if (stats.pts >= 16) awards.push("All-Team");
  } else if (role === "starter" && stats.pts >= 14 && yearRng.fork("awards").chance(0.35)) {
    awards.push("All-Team");
  }
  if (player.experience === 0 && stats.pts >= 12 && yearRng.fork("roy").chance(0.2)) {
    awards.push("ROY");
  }

  const titles: string[] = [];
  const teamStrength =
    state.world.team.contention / 100 + overall / 250 + yearRng.fork("standings").next() * 0.25;
  if (teamStrength > 0.78 && (role === "starter" || role === "star" || role === "franchise")) {
    titles.push("League");
  }

  const record: SeasonRecord = {
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
    injury,
  };

  const developed = developPlayer(
    {
      ...player,
      role,
      injuryHistory: injury ? [...player.injuryHistory, injury] : player.injuryHistory,
      reputation: Math.max(20, Math.min(95, player.reputation + (awards.length ? 4 : 1))),
    },
    yearRng.fork("dev"),
  );

  return {
    ...state,
    player: developed,
    world: { ...state.world, year: state.world.year + 1 },
    history: [...state.history, record],
  };
}
