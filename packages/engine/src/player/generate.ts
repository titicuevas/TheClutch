import { STARTING_AGE } from "../constants";
import type { Rng } from "../rng/index";
import type {
  Archetype,
  AttributeKey,
  Attributes,
  GrowthCurve,
  Player,
  Position,
  Team,
} from "../state/types";
import { ATTRIBUTE_KEYS, clampAttr } from "./attributes";
import { NAME_POOLS, NATIONALITIES } from "./names";
import { calculateOverall } from "./overall";
import { archetypesFor, roleFromOverall } from "./roles";

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const GROWTH: GrowthCurve[] = ["standard", "explosive", "slow", "late"];

const HEIGHT: Record<Position, [number, number]> = {
  PG: [183, 193],
  SG: [190, 199],
  SF: [198, 206],
  PF: [203, 211],
  C: [208, 220],
};

const ARCHETYPE_BIAS: Record<Archetype, Partial<Record<AttributeKey, number>>> = {
  sharpshooter: { threePoint: 12, midRange: 8, freeThrow: 8, finishing: -4 },
  playmaker: { passing: 12, ballHandling: 10, basketballIQ: 8, finishing: -2 },
  slasher: { finishing: 12, speed: 10, ballHandling: 6, threePoint: -4 },
  two_way: { perimeterDefense: 8, interiorDefense: 6, stamina: 6 },
  defensive_specialist: {
    perimeterDefense: 12,
    interiorDefense: 10,
    threePoint: -8,
    finishing: -4,
  },
  stretch_big: { threePoint: 10, rebounding: 6, finishing: 2, ballHandling: -6 },
  rim_protector: { interiorDefense: 14, rebounding: 8, threePoint: -12, ballHandling: -8 },
  inside_scorer: { finishing: 12, strength: 10, midRange: 6, threePoint: -8 },
  all_around: { basketballIQ: 4, stamina: 4 },
};

function spread(rng: Rng, center: number, width: number): number {
  return clampAttr(center + rng.int(-width, width));
}

function buildAttributes(
  rng: Rng,
  position: Position,
  archetype: Archetype,
  potential: number,
): Attributes {
  const floor = 58 + Math.floor((potential - 70) * 0.4);
  const attrs = {} as Attributes;
  for (const key of ATTRIBUTE_KEYS) {
    attrs[key] = spread(rng, floor, 8);
  }

  const positional: Partial<Record<Position, Partial<Record<AttributeKey, number>>>> = {
    PG: { passing: 8, ballHandling: 8, speed: 6, rebounding: -10, interiorDefense: -8 },
    SG: { threePoint: 6, speed: 4, rebounding: -6 },
    SF: { finishing: 3, perimeterDefense: 3 },
    PF: { rebounding: 8, strength: 6, ballHandling: -8, passing: -4 },
    C: { rebounding: 12, interiorDefense: 10, strength: 10, threePoint: -14, ballHandling: -12 },
  };

  for (const key of ATTRIBUTE_KEYS) {
    const delta =
      (positional[position]?.[key] ?? 0) + (ARCHETYPE_BIAS[archetype][key] ?? 0);
    attrs[key] = clampAttr(attrs[key] + delta);
  }

  return attrs;
}

export function generatePlayer(rng: Rng): Player {
  const nationality = rng.pick(NATIONALITIES);
  const names = NAME_POOLS[nationality]!;
  const position = rng.pick(POSITIONS);
  const archetype = rng.pick(archetypesFor(position));
  const [hMin, hMax] = HEIGHT[position];
  const potential = rng.int(68, 94);
  const attributes = buildAttributes(rng, position, archetype, potential);
  const overall = calculateOverall(attributes, position, archetype);
  const growthCurve = rng.pick(GROWTH);

  return {
    id: `pl_${rng.int(1000, 999999)}`,
    firstName: rng.pick(names.first),
    lastName: rng.pick(names.last),
    nationality,
    age: STARTING_AGE,
    heightCm: rng.int(hMin, hMax),
    position,
    archetype,
    attributes,
    potential,
    peakOverall: overall,
    experience: 0,
    durability: rng.int(58, 92),
    morale: rng.int(55, 80),
    confidence: rng.int(50, 75),
    form: rng.int(50, 75),
    fatigue: rng.int(10, 30),
    reputation: rng.int(30, 55),
    coachRelation: rng.int(45, 70),
    teammateRelation: rng.int(45, 70),
    workEthic: rng.int(50, 90),
    growthCurve,
    personality: {
      ambition: rng.int(40, 90),
      loyalty: rng.int(40, 90),
      ego: rng.int(30, 85),
      professionalism: rng.int(40, 90),
      volatility: rng.int(25, 80),
    },
    role: roleFromOverall(overall, STARTING_AGE),
    injuryHistory: [],
  };
}

const TEAM_PREFIX = ["Harbor", "Iron", "Summit", "River", "Crown", "North", "Atlas", "Pioneer"];
const TEAM_SUFFIX = ["United", "Club", "City", "Fleet", "Forge", "Wolves", "Kings", "Pulse"];

export function generateTeam(rng: Rng, country: string): Team {
  const name = `${rng.pick(TEAM_PREFIX)} ${rng.pick(TEAM_SUFFIX)}`;
  return {
    id: `tm_${rng.int(1000, 999999)}`,
    name,
    country,
    competitionId: "national_league",
    rating: rng.int(62, 86),
    prestige: rng.int(50, 85),
    contention: rng.int(40, 80),
  };
}
