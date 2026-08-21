import type { InjuryRecord, Player } from "../state/types";
import type { Rng } from "../rng/index";
import { GAMES_PER_SEASON } from "../constants";

export function rollInjury(
  player: Player,
  year: number,
  rng: Rng,
): InjuryRecord | undefined {
  const ageRisk = player.age >= 32 ? 0.028 : player.age >= 28 ? 0.014 : 0.005;
  const durabilityRisk = (100 - player.durability) / 1200;
  const fatigueRisk = player.fatigue / 2800;
  const historyRisk = player.injuryHistory.filter((i) => i.severity === "moderate").length * 0.01;
  const minutesRisk = player.role === "star" || player.role === "franchise" ? 0.006 : 0;
  const p = Math.min(0.1, 0.01 + ageRisk + durabilityRisk + fatigueRisk + historyRisk + minutesRisk);

  if (!rng.chance(p)) return undefined;

  const moderate = rng.chance(0.09 + (player.age >= 33 ? 0.04 : 0));
  const gamesMissed = moderate ? rng.int(10, 22) : rng.int(2, 7);
  return {
    seasonYear: year,
    type: moderate ? "knee" : rng.pick(["ankle", "finger", "back", "thigh"]),
    severity: moderate ? "moderate" : "minor",
    gamesMissed: Math.min(GAMES_PER_SEASON - 5, gamesMissed),
  };
}
