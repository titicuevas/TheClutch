import { calculateOverall } from "../player/overall";
import type { AttributeKey, CareerViewModel, CareerState } from "./types";

const SIGNATURE: Record<string, AttributeKey[]> = {
  sharpshooter: ["threePoint", "midRange", "freeThrow"],
  playmaker: ["passing", "ballHandling", "basketballIQ"],
  slasher: ["finishing", "speed", "ballHandling"],
  two_way: ["perimeterDefense", "interiorDefense", "stamina"],
  defensive_specialist: ["perimeterDefense", "interiorDefense", "rebounding"],
  stretch_big: ["threePoint", "rebounding", "finishing"],
  rim_protector: ["interiorDefense", "rebounding", "strength"],
  inside_scorer: ["finishing", "strength", "midRange"],
  all_around: ["basketballIQ", "finishing", "perimeterDefense"],
};

function potentialBand(potential: number): CareerViewModel["potentialBand"] {
  if (potential >= 88) return "star";
  if (potential >= 80) return "starter";
  if (potential >= 72) return "role";
  return "fringe";
}

export function getViewModel(state: CareerState): CareerViewModel {
  const { player } = state;
  const keys = SIGNATURE[player.archetype] ?? ["finishing", "passing", "rebounding"];
  const signature = Object.fromEntries(keys.map((k) => [k, player.attributes[k]]));

  return {
    name: `${player.firstName} ${player.lastName}`,
    nationality: player.nationality,
    age: player.age,
    heightCm: player.heightCm,
    position: player.position,
    archetype: player.archetype,
    overall: calculateOverall(player.attributes, player.position, player.archetype),
    role: player.role,
    teamName: state.world.team.name,
    year: state.world.year,
    potentialBand: potentialBand(player.potential),
    signature,
    lastSeason: state.history.at(-1),
    retired: state.retired,
  };
}
