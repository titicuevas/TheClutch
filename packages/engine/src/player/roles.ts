import type { Archetype, Player, Position, Role } from "../state/types";

const ARCHETYPES_BY_POSITION: Record<Position, Archetype[]> = {
  PG: ["playmaker", "slasher", "sharpshooter", "two_way", "all_around"],
  SG: ["sharpshooter", "slasher", "two_way", "defensive_specialist", "all_around"],
  SF: ["all_around", "slasher", "two_way", "sharpshooter", "defensive_specialist"],
  PF: ["stretch_big", "inside_scorer", "two_way", "defensive_specialist", "all_around"],
  C: ["rim_protector", "inside_scorer", "stretch_big", "defensive_specialist", "two_way"],
};

export function archetypesFor(position: Position): Archetype[] {
  return ARCHETYPES_BY_POSITION[position];
}

const ROLE_MINUTES: Record<Role, [number, number]> = {
  prospect: [8, 12],
  bench: [10, 16],
  rotation: [16, 22],
  sixth_man: [20, 26],
  starter: [26, 32],
  star: [32, 36],
  franchise: [34, 38],
};

export function minutesBandForRole(role: Role): { min: number; max: number } {
  const [min, max] = ROLE_MINUTES[role];
  return { min, max };
}

export function minutesForRole(role: Role): number {
  const { min, max } = minutesBandForRole(role);
  return (min + max) / 2;
}

/** Uso de balón. SIMULATION.md §6: PTS/AST = minutos × overall × uso. */
export const ROLE_USAGE: Record<Role, number> = {
  prospect: 0.68,
  bench: 0.74,
  rotation: 0.82,
  sixth_man: 0.9,
  starter: 1,
  star: 1,
  franchise: 1.22,
};

export function usageForRole(role: Role): number {
  return ROLE_USAGE[role];
}

export function roleFromOverall(overall: number, age: number, bias = 0): Role {
  const shifted = overall + bias * 4;
  if (age <= 20 && shifted < 74) {
    if (shifted < 66) return "prospect";
    return "bench";
  }
  if (shifted >= 90) return "franchise";
  if (shifted >= 84) return "star";
  if (shifted >= 78) return "starter";
  if (shifted >= 74) return "sixth_man";
  if (shifted >= 70) return "rotation";
  if (shifted >= 64) return "bench";
  return "prospect";
}

/** El coach puede sentarte aunque el overall pida más minutos. */
export function roleForAppearance(player: Player, overall: number): Role {
  let bias = player.roleBias;
  if (player.coachRelation < 35) bias -= 2;
  else if (player.coachRelation < 50) bias -= 1;
  return roleFromOverall(overall, player.age, bias);
}
