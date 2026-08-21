import type { AttributeKey, Player } from "../state/types";
import type { Rng } from "../rng/index";
import { mapAttributes } from "../player/attributes";
import { calculateOverall } from "../player/overall";

function growthFactor(player: Player): number {
  const { age, growthCurve, workEthic } = player;
  const ethic = 0.7 + workEthic / 250;
  let base = 0;
  if (age <= 21) base = 2.7;
  else if (age <= 24) base = 1.85;
  else if (age <= 27) base = 0.85;
  else if (age <= 31) base = 0.15;
  else base = -1.1;

  if (growthCurve === "explosive" && age <= 22) base += 0.8;
  if (growthCurve === "slow" && age <= 24) base -= 0.6;
  if (growthCurve === "late" && age >= 24 && age <= 28) base += 0.9;
  if (growthCurve === "late" && age < 22) base -= 0.5;

  return base * ethic;
}

const REGRESSION_KEYS: AttributeKey[] = ["speed", "stamina", "finishing", "perimeterDefense"];

export function developPlayer(player: Player, rng: Rng): Player {
  const factor = growthFactor(player);
  const overallNow = calculateOverall(player.attributes, player.position, player.archetype);
  const room = player.potential - overallNow;

  const nextAttrs = mapAttributes(player.attributes, (key, value) => {
    if (factor >= 0) {
      const bump = factor * (0.4 + rng.next() * 0.95);
      const hunger = room > 0 ? 1 + Math.min(0.45, room / 36) : 0.12;
      const towardCap = bump * hunger;
      return value + towardCap;
    }
    const extra = REGRESSION_KEYS.includes(key) ? factor * 1.4 : factor * 0.6;
    return value + extra * (0.6 + rng.next() * 0.8);
  });

  const overall = calculateOverall(nextAttrs, player.position, player.archetype);
  return {
    ...player,
    attributes: nextAttrs,
    peakOverall: Math.max(player.peakOverall, overall),
    experience: player.experience + 1,
    age: player.age + 1,
    fatigue: 15,
    form: Math.max(40, Math.min(80, player.form + rng.int(-8, 8))),
    morale: Math.max(30, Math.min(90, player.morale + rng.int(-6, 6))),
  };
}
