import { NATIONALITIES } from "../player/names";
import type { InjuryRecord, NationalStint, Player } from "../state/types";
import type { Rng } from "../rng/index";

const KNOCKOUT = new Set<NonNullable<NationalStint["result"]>>(["out", "bronze", "silver", "gold"]);

function pickFoe(home: string, rng: Rng): string {
  const pool = NATIONALITIES.filter((id) => id !== home);
  return pool.length ? rng.pick(pool) : "US";
}

/** D-10: ciclo anclado al year de la run, no al calendario real. */
export function tournamentForYear(year: number): NationalStint["tournament"] | null {
  if (year % 2 !== 0) return null;
  if (year % 4 === 0) return "olympics";
  return year % 8 === 2 ? "continental" : "world";
}

export function resolveNational(
  year: number,
  player: Player,
  overall: number,
  injury: InjuryRecord | undefined,
  rng: Rng,
): NationalStint | undefined {
  const tournament = tournamentForYear(year);
  if (!tournament) return undefined;

  if (player.flags.skipNational) {
    return { tournament, status: "declined" };
  }

  const tooInjured = Boolean(injury && injury.gamesMissed >= 12);
  const eligible = player.age >= 19 && overall >= 72 && player.reputation >= 42 && !tooInjured;
  const auto = overall >= 86 && player.reputation >= 58;
  const p = Math.min(0.92, 0.22 + (overall - 72) / 40 + player.reputation / 400);
  const called = eligible && (auto || rng.chance(p));

  if (!called) {
    return overall >= 76 ? { tournament, status: "snub" } : undefined;
  }

  const captain = overall >= 88 && player.reputation >= 72 && rng.chance(0.32);
  const strength = overall / 105 + player.reputation / 350 + (captain ? 0.06 : 0) + rng.next() * 0.18;
  let result: NonNullable<NationalStint["result"]> = "groups";
  if (strength >= 0.92 && rng.chance(0.28)) result = "gold";
  else if (strength >= 0.78 && rng.chance(0.4)) result = "silver";
  else if (strength >= 0.68 && rng.chance(0.45)) result = "bronze";
  else if (rng.chance(0.55)) result = "out";

  const foe = KNOCKOUT.has(result) ? pickFoe(player.nationality, rng) : undefined;
  return { tournament, status: captain ? "captain" : "called", result, ...(foe ? { foe } : {}) };
}
