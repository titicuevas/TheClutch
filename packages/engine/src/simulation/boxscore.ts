import type { Archetype, Player, Position, Role, SeasonStats } from "../state/types";
import type { Rng } from "../rng/index";
import { minutesForRole } from "../player/roles";
import { calculateOverall } from "../player/overall";

type Rates = { pts: number; ast: number; reb: number; stl: number; blk: number; tov: number };

const BASE_PER36: Record<Position, Rates> = {
  PG: { pts: 16.5, ast: 7.2, reb: 3.6, stl: 1.4, blk: 0.25, tov: 2.8 },
  SG: { pts: 18.0, ast: 3.4, reb: 4.2, stl: 1.2, blk: 0.35, tov: 2.2 },
  SF: { pts: 16.8, ast: 3.1, reb: 6.0, stl: 1.1, blk: 0.55, tov: 2.0 },
  PF: { pts: 16.2, ast: 2.2, reb: 8.6, stl: 0.8, blk: 1.1, tov: 1.9 },
  C: { pts: 15.4, ast: 1.8, reb: 10.4, stl: 0.7, blk: 1.9, tov: 2.1 },
};

const ARCHETYPE_MULT: Record<Archetype, Partial<Rates>> = {
  sharpshooter: { pts: 1.12, ast: 0.9 },
  playmaker: { ast: 1.35, pts: 0.95, tov: 1.1 },
  slasher: { pts: 1.12, ast: 0.95 },
  two_way: { stl: 1.15, blk: 1.1, pts: 0.95 },
  defensive_specialist: { pts: 0.82, stl: 1.25, blk: 1.2, ast: 0.85 },
  stretch_big: { pts: 1.05, reb: 0.95, ast: 1.05 },
  rim_protector: { blk: 1.45, reb: 1.1, pts: 0.9, ast: 0.8 },
  inside_scorer: { pts: 1.14, reb: 1.05, ast: 0.85 },
  all_around: { pts: 1.02, ast: 1.05, reb: 1.02 },
};

function applyMult(base: Rates, mult: Partial<Rates> | undefined): Rates {
  return {
    pts: base.pts * (mult?.pts ?? 1),
    ast: base.ast * (mult?.ast ?? 1),
    reb: base.reb * (mult?.reb ?? 1),
    stl: base.stl * (mult?.stl ?? 1),
    blk: base.blk * (mult?.blk ?? 1),
    tov: base.tov * (mult?.tov ?? 1),
  };
}

function scale(value: number, minutes: number, ovr: number, noise: number): number {
  const ovrMult = 0.55 + (ovr / 100) * 0.9;
  return Math.max(0, value * (minutes / 36) * ovrMult * noise);
}

export function simulateBoxScore(
  player: Player,
  role: Role,
  rng: Rng,
): SeasonStats {
  const ovr = calculateOverall(player.attributes, player.position, player.archetype);
  const minutes = minutesForRole(role);
  const rates = applyMult(BASE_PER36[player.position], ARCHETYPE_MULT[player.archetype]);
  const form = 0.9 + player.form / 500;
  const n = () => 0.9 + rng.next() * 0.2;

  const fg = Math.min(
    0.62,
    0.38 + player.attributes.finishing / 400 + player.attributes.midRange / 500,
  );
  const tp = Math.min(0.45, 0.28 + player.attributes.threePoint / 350);
  const ft = Math.min(0.92, 0.62 + player.attributes.freeThrow / 280);

  return {
    games: 0,
    minutes: round1(minutes),
    pts: round1(scale(rates.pts, minutes, ovr, n()) * form),
    ast: round1(scale(rates.ast, minutes, ovr, n()) * (0.85 + player.attributes.passing / 400)),
    reb: round1(scale(rates.reb, minutes, ovr, n()) * (0.85 + player.attributes.rebounding / 400)),
    stl: round1(scale(rates.stl, minutes, ovr, n()) * (0.85 + player.attributes.perimeterDefense / 450)),
    blk: round1(scale(rates.blk, minutes, ovr, n()) * (0.85 + player.attributes.interiorDefense / 450)),
    tov: round1(scale(rates.tov, minutes, ovr, n())),
    fgPct: round3(fg * (0.96 + rng.next() * 0.08)),
    tpPct: round3(tp * (0.94 + rng.next() * 0.1)),
    ftPct: round3(ft * (0.97 + rng.next() * 0.05)),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
