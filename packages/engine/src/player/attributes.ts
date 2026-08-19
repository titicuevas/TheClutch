import type { AttributeKey, Attributes } from "../state/types";
import { ATTR_MAX, ATTR_MIN } from "../constants";

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  "finishing",
  "midRange",
  "threePoint",
  "freeThrow",
  "passing",
  "ballHandling",
  "perimeterDefense",
  "interiorDefense",
  "rebounding",
  "speed",
  "strength",
  "stamina",
  "basketballIQ",
  "clutch",
];

export function clampAttr(value: number): number {
  return Math.max(ATTR_MIN, Math.min(ATTR_MAX, Math.round(value)));
}

export function mapAttributes(
  attrs: Attributes,
  fn: (key: AttributeKey, value: number) => number,
): Attributes {
  const next = { ...attrs };
  for (const key of ATTRIBUTE_KEYS) {
    next[key] = clampAttr(fn(key, attrs[key]));
  }
  return next;
}
