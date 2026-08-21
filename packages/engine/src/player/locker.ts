import { NAME_POOLS, NATIONALITIES } from "./names";
import type { Rng } from "../rng/index";
import type { Position, ShadowMate, Team } from "../state/types";

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const UNSIGNED_ID = "tm_unsigned";

export function mateLabel(mate: ShadowMate | undefined): string | undefined {
  if (!mate) return undefined;
  return `${mate.firstName} ${mate.lastName}`;
}

export function starMate(locker: ShadowMate[]): ShadowMate | undefined {
  return locker.filter((mate) => mate.overall >= 82).sort((a, b) => b.overall - a.overall)[0];
}

export function kidMate(locker: ShadowMate[]): ShadowMate | undefined {
  if (!locker.length) return undefined;
  return [...locker].sort((a, b) => a.overall - b.overall)[0];
}

/** COMPETITIONS §4. Vacío (sin club) → rating del equipo. */
export function estimatedStarterOverall(locker: ShadowMate[], teamRating: number): number {
  if (!locker.length) return teamRating;
  return Math.max(...locker.map((mate) => mate.overall));
}

export function generateCoachName(rng: Rng, country: string): string {
  const names = NAME_POOLS[country] ?? NAME_POOLS.US!;
  return `${rng.pick(names.first)} ${rng.pick(names.last)}`;
}

export function generateLocker(rng: Rng, team: Team, playerPosition: Position): ShadowMate[] {
  const count = rng.int(2, 4);
  const mates: ShadowMate[] = [];
  const used = new Set<string>();
  const others = POSITIONS.filter((position) => position !== playerPosition);

  for (let i = 0; i < count; i += 1) {
    const country = rng.chance(0.32) ? rng.pick(NATIONALITIES) : team.country;
    const names = NAME_POOLS[country] ?? NAME_POOLS.US!;
    let firstName = rng.pick(names.first);
    let lastName = rng.pick(names.last);
    let key = `${firstName} ${lastName}`;
    if (used.has(key)) {
      lastName = rng.pick(names.last);
      key = `${firstName} ${lastName}`;
    }
    used.add(key);
    const position = i === 0 && others.length ? rng.pick(others) : rng.pick(POSITIONS);
    const overall = Math.max(58, Math.min(92, team.rating + rng.int(-12, 3)));
    mates.push({ firstName, lastName, position, overall });
  }
  return mates;
}

type StaffWorld = {
  team: Team;
  locker: ShadowMate[];
  coachName: string;
};

/** Nuevo club → locker y míster nuevos. Mismo id con staff → se conserva. */
export function attachStaff<T extends StaffWorld>(
  world: T,
  team: Team,
  rng: Rng,
  playerPosition: Position,
): T {
  if (team.id === UNSIGNED_ID) {
    return { ...world, team, locker: [], coachName: "" };
  }
  if (team.id === world.team.id && world.locker.length > 0 && world.coachName) {
    return { ...world, team };
  }
  return {
    ...world,
    team,
    locker: generateLocker(rng.fork("locker"), team, playerPosition),
    coachName: generateCoachName(rng.fork("coach"), team.country),
  };
}
