import type { Archetype, BadgeId, Player, Position, Role, SeasonStats } from "../state/types";
import type { Rng } from "../rng/index";
import { minutesForRole, usageForRole } from "../player/roles";
import { calculateOverall } from "../player/overall";

type Rates = { pts: number; ast: number; reb: number; stl: number; blk: number; tov: number };

const BASE_PER36: Record<Position, Rates> = {
  PG: { pts: 14.0, ast: 7.2, reb: 3.6, stl: 1.4, blk: 0.25, tov: 2.8 },
  SG: { pts: 15.3, ast: 3.4, reb: 4.2, stl: 1.2, blk: 0.35, tov: 2.2 },
  SF: { pts: 14.3, ast: 3.1, reb: 6.0, stl: 1.1, blk: 0.55, tov: 2.0 },
  PF: { pts: 13.8, ast: 2.2, reb: 8.6, stl: 0.8, blk: 1.1, tov: 1.9 },
  C: { pts: 13.1, ast: 1.8, reb: 10.4, stl: 0.7, blk: 1.9, tov: 2.1 },
};

/** Techos por partido. SIMULATION.md §6. */
export const POSITION_STAT_CAP: Record<Position, Pick<Rates, "pts" | "ast" | "reb" | "blk">> = {
  PG: { pts: 33, ast: 12, reb: 9, blk: 1.4 },
  SG: { pts: 35, ast: 8.5, reb: 10, blk: 1.8 },
  SF: { pts: 33, ast: 7.5, reb: 12, blk: 2.5 },
  PF: { pts: 31, ast: 6, reb: 15.5, blk: 3.8 },
  C: { pts: 29, ast: 8, reb: 18, blk: 4.8 },
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

function volumeMult(ovr: number): number {
  return 0.55 + (ovr / 100) * 0.9;
}

/** PTS: 75 → ~1.18, 85 → ~1.43, 92 → ~1.60. Más pendiente que AST/REB. */
function scoringOvrMult(ovr: number): number {
  return Math.min(1.9, Math.max(0.55, -0.7 + (ovr / 100) * 2.5));
}

function scale(value: number, minutes: number, ovr: number, noise: number): number {
  return Math.max(0, value * (minutes / 36) * volumeMult(ovr) * noise);
}

function scaleUsage(
  value: number,
  minutes: number,
  role: Role,
  noise: number,
  ovrMult: number,
): number {
  return Math.max(0, value * (minutes / 36) * ovrMult * usageForRole(role) * noise);
}

export function simulateBoxScore(
  player: Player,
  role: Role,
  rng: Rng,
): SeasonStats {
  const ovr = calculateOverall(player.attributes, player.position, player.archetype);
  const minutes = minutesForRole(role);
  const rates = applyMult(BASE_PER36[player.position], ARCHETYPE_MULT[player.archetype]);
  const badged = applyBadges(rates, player, role);
  const form = 0.9 + player.form / 500;
  const confidence = 0.94 + player.confidence / 700;
  const mood = form * confidence;
  const n = () => 0.9 + rng.next() * 0.2;

  const cap = POSITION_STAT_CAP[player.position];
  const fg = Math.min(
    0.62,
    0.38 + player.attributes.finishing / 400 + player.attributes.midRange / 500,
  );
  const tp = Math.min(
    0.47,
    0.28 + player.attributes.threePoint / 350 + (player.badges.includes("sharpshooter") ? 0.025 : 0),
  );
  const ft = Math.min(0.92, 0.62 + player.attributes.freeThrow / 280);

  return {
    games: 0,
    minutes: round1(minutes),
    pts: round1(
      Math.min(cap.pts, scaleUsage(badged.pts, minutes, role, n(), scoringOvrMult(ovr)) * mood),
    ),
    ast: round1(
      Math.min(
        cap.ast,
        scaleUsage(badged.ast, minutes, role, n(), volumeMult(ovr)) *
          (0.85 + player.attributes.passing / 400),
      ),
    ),
    reb: round1(Math.min(cap.reb, scale(badged.reb, minutes, ovr, n()) * (0.85 + player.attributes.rebounding / 400))),
    stl: round1(scale(badged.stl, minutes, ovr, n()) * (0.85 + player.attributes.perimeterDefense / 450)),
    blk: round1(Math.min(cap.blk, scale(badged.blk, minutes, ovr, n()) * (0.85 + player.attributes.interiorDefense / 450))),
    tov: round1(scale(badged.tov, minutes, ovr, n())),
    fgPct: round3(fg * (0.96 + rng.next() * 0.08)),
    tpPct: round3(tp * (0.94 + rng.next() * 0.1)),
    ftPct: round3(ft * (0.97 + rng.next() * 0.05)),
  };
}

function applyBadges(rates: Rates, player: Player, role: Role): Rates {
  let next = { ...rates };
  const has = (id: BadgeId) => player.badges.includes(id);
  if (has("sharpshooter")) next = applyMult(next, { pts: 1.06 });
  if (has("floor_general")) next = applyMult(next, { ast: 1.14, tov: 0.9 });
  if (has("lockdown")) next = applyMult(next, { stl: 1.18 });
  if (has("rim_protector")) next = applyMult(next, { blk: 1.22, reb: 1.05 });
  if (has("microwave") && (role === "sixth_man" || role === "bench")) {
    next = applyMult(next, { pts: 1.12 });
  }
  if (has("clutch")) next = applyMult(next, { pts: 1.04 });
  if (has("franchise_player")) next = applyMult(next, { ast: 1.04, pts: 1.03 });
  return next;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
