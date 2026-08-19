import type { Archetype, Position, Role } from "../state/types";

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

export function minutesForRole(role: Role): number {
  const [min, max] = ROLE_MINUTES[role];
  return (min + max) / 2;
}

export function roleFromOverall(overall: number, age: number): Role {
  if (age <= 20 && overall < 74) {
    if (overall < 66) return "prospect";
    return "bench";
  }
  if (overall >= 90) return "franchise";
  if (overall >= 84) return "star";
  if (overall >= 78) return "starter";
  if (overall >= 74) return "sixth_man";
  if (overall >= 70) return "rotation";
  if (overall >= 64) return "bench";
  return "prospect";
}
