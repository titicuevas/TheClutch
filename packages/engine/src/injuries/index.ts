import type { InjuryRecord, Player } from "../state/types";
import type { Rng } from "../rng/index";
import { GAMES_PER_SEASON } from "../constants";

export function rollInjury(
  player: Player,
  year: number,
  rng: Rng,
): InjuryRecord | undefined {
  const ageRisk = player.age >= 32 ? 0.06 : player.age >= 28 ? 0.03 : 0.015;
  const durabilityRisk = (100 - player.durability) / 400;
  const fatigueRisk = player.fatigue / 800;
  const historyRisk = player.injuryHistory.filter((i) => i.severity === "moderate").length * 0.02;
  const p = Math.min(0.28, 0.08 + ageRisk + durabilityRisk + fatigueRisk + historyRisk);

  if (!rng.chance(p)) return undefined;

  const moderate = rng.chance(0.28 + (player.age >= 33 ? 0.1 : 0));
  const gamesMissed = moderate ? rng.int(10, 22) : rng.int(2, 7);
  return {
    seasonYear: year,
    type: moderate ? "knee" : rng.pick(["ankle", "finger", "back", "thigh"]),
    severity: moderate ? "moderate" : "minor",
    gamesMissed: Math.min(GAMES_PER_SEASON - 5, gamesMissed),
  };
}
