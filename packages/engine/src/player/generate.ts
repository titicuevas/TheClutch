import { STARTING_AGE } from "../constants";
import type { Rng } from "../rng/index";
import type {
  Archetype,
  AttributeKey,
  Attributes,
  GrowthCurve,
  Handed,
  Player,
  Position,
  Rival,
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

export function generatePlayer(
  rng: Rng,
  opts?: { position?: Position; nationality?: string; handed?: Handed; givenName?: string },
): Player {
  const rolledNationality = rng.pick(NATIONALITIES);
  const nationality =
    opts?.nationality && NAME_POOLS[opts.nationality] ? opts.nationality : rolledNationality;
  const names = NAME_POOLS[nationality]!;
  const rolledPosition = rng.pick(POSITIONS);
  const position = opts?.position ?? rolledPosition;
  const archetype = rng.pick(archetypesFor(position));
  const [hMin, hMax] = HEIGHT[position];
  const potential = rng.int(68, 94);
  const attributes = buildAttributes(rng, position, archetype, potential);
  const handed: Handed = opts?.handed ?? (rng.fork("hand").chance(0.12) ? "left" : "right");
  if (handed === "left") {
    attributes.finishing = clampAttr(attributes.finishing + 2);
    attributes.ballHandling = clampAttr(attributes.ballHandling + 2);
    attributes.freeThrow = clampAttr(attributes.freeThrow - 1);
  }
  const overall = calculateOverall(attributes, position, archetype);
  const growthCurve = rng.pick(GROWTH);
  const id = `pl_${rng.int(1000, 999999)}`;
  const named = applyGivenName(rng.pick(names.first), rng.pick(names.last), opts?.givenName);

  return {
    id,
    firstName: named.firstName,
    lastName: named.lastName,
    nationality,
    handed,
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
    roleBias: 0,
    injuryHistory: [],
    spent: 0,
    flags: {
      drafted: false,
      draftClosed: false,
      tradeRequest: false,
      firedOnce: [],
    },
    badges: [],
  };
}

const TEAM_PREFIX = ["Harbor", "Iron", "Summit", "River", "Crown", "North", "Atlas", "Pioneer", "Sunset", "Metro"];
const TEAM_SUFFIX = ["Wolves", "Wings", "Storm", "Giants", "Pulse", "Forge", "Fleet", "Fire"];

export function generateTeam(
  rng: Rng,
  country: string,
  competitionId = "national_league",
): Team {
  const name = `${rng.pick(TEAM_PREFIX)} ${rng.pick(TEAM_SUFFIX)}`;
  const american = competitionId === "american_league";
  const formation = competitionId === "club_academy" || competitionId === "college_circuit";
  return {
    id: `tm_${rng.int(1000, 999999)}`,
    name,
    country,
    competitionId,
    rating: rng.int(american ? 72 : formation ? 52 : 62, american ? 92 : formation ? 72 : 86),
    prestige: rng.int(formation ? 35 : 50, formation ? 70 : 90),
    contention: rng.int(35, 88),
  };
}

export function generateRival(rng: Rng, player: Player, home: Team): Rival {
  const nationality = rng.pick(NATIONALITIES)!;
  const names = NAME_POOLS[nationality]!;
  let team = generateTeam(rng.fork("club"), nationality, home.competitionId);
  if (team.name === home.name) {
    team = generateTeam(rng.fork("club-b"), nationality, home.competitionId);
  }
  const ovr = calculateOverall(player.attributes, player.position, player.archetype);
  return {
    firstName: rng.pick(names.first)!,
    lastName: rng.pick(names.last)!,
    nationality,
    position: player.position,
    team,
    overall: Math.max(62, Math.min(94, ovr + rng.int(-3, 5))),
    lastPts: 0,
    lastBlk: 0,
    lastAwards: [],
  };
}

export function advanceRival(rival: Rival, rng: Rng, playerTeamId: string): Rival {
  let team = rival.team;
  if (rng.chance(0.14) || team.id === playerTeamId) {
    team = generateTeam(rng.fork("move"), rival.nationality, team.competitionId);
  }
  const overall = Math.max(58, Math.min(96, rival.overall + rng.int(-2, 3)));
  const lastPts = Math.round((overall * 0.24 + rng.int(-4, 5)) * 10) / 10;
  const lastBlk =
    rival.position === "C" || rival.position === "PF"
      ? Math.round((overall * 0.018 + rng.next()) * 10) / 10
      : Math.round(rng.next() * 8) / 10;
  let lastAwards: string[] = [];
  if (overall >= 90 && rng.chance(0.08)) lastAwards = ["MVP"];
  else if (overall >= 86 && rng.chance(0.18)) lastAwards = ["All-Team"];
  return { ...rival, team, overall, lastPts, lastBlk, lastAwards };
}

function applyGivenName(
  rolledFirst: string,
  rolledLast: string,
  raw?: string,
): { firstName: string; lastName: string } {
  const cleaned = sanitizePersonName(raw);
  if (!cleaned) return { firstName: rolledFirst, lastName: rolledLast };
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function sanitizePersonName(raw?: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}'’\- ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}
