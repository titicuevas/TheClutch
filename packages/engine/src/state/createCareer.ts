import {
  ENGINE_VERSION,
  FORCE_RETIRE_OVERALL,
  MAX_AGE,
  SCHEMA_VERSION,
  SOFT_RETIRE_AGE,
  SOFT_RETIRE_OVERALL,
} from "../constants";
import { generatePlayer, generateTeam } from "../player/generate";
import { calculateOverall } from "../player/overall";
import { createRng } from "../rng/index";
import type { CareerState, CreateCareerInput } from "./types";

export function createCareer(input: CreateCareerInput): CareerState {
  const playerRng = createRng(`player:${input.playerSeed}`);
  const player = generatePlayer(playerRng);
  const team = generateTeam(playerRng.fork("team"), player.nationality);

  return {
    schemaVersion: SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    meta: {
      mode: "free",
      playerSeed: input.playerSeed,
      runSeed: input.runSeed,
    },
    player,
    world: {
      team,
      year: 1,
    },
    history: [],
    retired: false,
  };
}

export function shouldForceRetire(state: CareerState): boolean {
  const ovr = calculateOverall(
    state.player.attributes,
    state.player.position,
    state.player.archetype,
  );
  if (state.player.age >= MAX_AGE) return true;
  if (state.player.experience >= 8 && ovr < FORCE_RETIRE_OVERALL) return true;
  if (state.player.age >= SOFT_RETIRE_AGE && ovr < SOFT_RETIRE_OVERALL) return true;
  return false;
}
