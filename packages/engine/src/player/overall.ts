import type { Archetype, AttributeKey, Attributes, Position } from "../state/types";
import { ATTRIBUTE_KEYS, clampAttr } from "./attributes";

/** Pesos PROVISIONALES. Un Rim Protector no sube de OVR a base de triple. */
const POSITION_WEIGHTS: Record<Position, Partial<Record<AttributeKey, number>>> = {
  PG: {
    passing: 1.4,
    ballHandling: 1.3,
    threePoint: 1.1,
    perimeterDefense: 1.1,
    speed: 1.1,
    basketballIQ: 1.2,
    finishing: 0.8,
    rebounding: 0.5,
    interiorDefense: 0.5,
    strength: 0.6,
  },
  SG: {
    threePoint: 1.3,
    midRange: 1.1,
    finishing: 1.0,
    perimeterDefense: 1.1,
    speed: 1.1,
    ballHandling: 1.0,
    passing: 0.8,
    rebounding: 0.6,
    interiorDefense: 0.5,
  },
  SF: {
    finishing: 1.1,
    threePoint: 1.0,
    perimeterDefense: 1.1,
    speed: 1.0,
    rebounding: 0.9,
    passing: 0.9,
    strength: 0.9,
  },
  PF: {
    finishing: 1.2,
    rebounding: 1.3,
    interiorDefense: 1.1,
    strength: 1.2,
    threePoint: 0.8,
    passing: 0.6,
    ballHandling: 0.5,
    speed: 0.8,
  },
  C: {
    finishing: 1.2,
    rebounding: 1.4,
    interiorDefense: 1.4,
    strength: 1.3,
    threePoint: 0.45,
    ballHandling: 0.4,
    passing: 0.55,
    speed: 0.7,
    perimeterDefense: 0.6,
  },
};

const ARCHETYPE_WEIGHTS: Record<Archetype, Partial<Record<AttributeKey, number>>> = {
  sharpshooter: { threePoint: 1.4, midRange: 1.2, freeThrow: 1.2 },
  playmaker: { passing: 1.4, ballHandling: 1.2, basketballIQ: 1.3 },
  slasher: { finishing: 1.4, speed: 1.3, ballHandling: 1.1 },
  two_way: { perimeterDefense: 1.2, interiorDefense: 1.1, stamina: 1.1 },
  defensive_specialist: {
    perimeterDefense: 1.3,
    interiorDefense: 1.3,
    threePoint: 0.7,
    finishing: 0.8,
  },
  stretch_big: { threePoint: 1.3, rebounding: 1.1, finishing: 0.9 },
  rim_protector: { interiorDefense: 1.5, rebounding: 1.2, threePoint: 0.5 },
  inside_scorer: { finishing: 1.4, strength: 1.3, midRange: 1.1 },
  all_around: { basketballIQ: 1.1, stamina: 1.1 },
};

export function calculateOverall(
  attributes: Attributes,
  position: Position,
  archetype: Archetype,
): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const key of ATTRIBUTE_KEYS) {
    const weight =
      (POSITION_WEIGHTS[position][key] ?? 1) * (ARCHETYPE_WEIGHTS[archetype][key] ?? 1);
    weighted += attributes[key] * weight;
    totalWeight += weight;
  }
  return clampAttr(weighted / totalWeight);
}
