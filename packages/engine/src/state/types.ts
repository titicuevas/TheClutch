export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type Archetype =
  | "sharpshooter"
  | "playmaker"
  | "slasher"
  | "two_way"
  | "defensive_specialist"
  | "stretch_big"
  | "rim_protector"
  | "inside_scorer"
  | "all_around";

export type Role =
  | "prospect"
  | "bench"
  | "rotation"
  | "sixth_man"
  | "starter"
  | "star"
  | "franchise";

export type GrowthCurve = "standard" | "explosive" | "slow" | "late";

export type AttributeKey =
  | "finishing"
  | "midRange"
  | "threePoint"
  | "freeThrow"
  | "passing"
  | "ballHandling"
  | "perimeterDefense"
  | "interiorDefense"
  | "rebounding"
  | "speed"
  | "strength"
  | "stamina"
  | "basketballIQ"
  | "clutch";

export type Attributes = Record<AttributeKey, number>;

export type Personality = {
  ambition: number;
  loyalty: number;
  ego: number;
  professionalism: number;
  volatility: number;
};

export type InjuryRecord = {
  seasonYear: number;
  type: string;
  severity: "minor" | "moderate";
  gamesMissed: number;
};

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  age: number;
  heightCm: number;
  position: Position;
  archetype: Archetype;
  attributes: Attributes;
  potential: number;
  peakOverall: number;
  experience: number;
  durability: number;
  morale: number;
  confidence: number;
  form: number;
  fatigue: number;
  reputation: number;
  coachRelation: number;
  teammateRelation: number;
  workEthic: number;
  growthCurve: GrowthCurve;
  personality: Personality;
  role: Role;
  injuryHistory: InjuryRecord[];
};

export type Team = {
  id: string;
  name: string;
  country: string;
  competitionId: string;
  rating: number;
  prestige: number;
  contention: number;
};

export type SeasonStats = {
  games: number;
  minutes: number;
  pts: number;
  ast: number;
  reb: number;
  stl: number;
  blk: number;
  tov: number;
  fgPct: number;
  tpPct: number;
  ftPct: number;
};

export type SeasonRecord = {
  year: number;
  age: number;
  teamId: string;
  teamName: string;
  competitionId: string;
  role: Role;
  overall: number;
  stats: SeasonStats;
  awards: string[];
  titles: string[];
  injury?: InjuryRecord;
};

export type CareerState = {
  schemaVersion: number;
  engineVersion: string;
  meta: {
    mode: "free";
    playerSeed: string;
    runSeed: string;
  };
  player: Player;
  world: {
    team: Team;
    year: number;
  };
  history: SeasonRecord[];
  retired: boolean;
};

export type Command =
  | { type: "SIMULATE_NEXT" }
  | { type: "RETIRE" };

export type DispatchResult = {
  state: CareerState;
  log: string[];
};

export type CareerViewModel = {
  name: string;
  nationality: string;
  age: number;
  heightCm: number;
  position: Position;
  archetype: Archetype;
  overall: number;
  role: Role;
  teamName: string;
  year: number;
  potentialBand: "fringe" | "role" | "starter" | "star";
  signature: Partial<Attributes>;
  lastSeason?: SeasonRecord;
  retired: boolean;
};

export type CreateCareerInput = {
  playerSeed: string;
  runSeed: string;
};

export type LegacyReport = {
  name: string;
  position: Position;
  nationality: string;
  seasons: number;
  games: number;
  peakOverall: number;
  ppg: number;
  apg: number;
  rpg: number;
  earningsNote: string;
  teams: string[];
  titles: string[];
  awards: string[];
  legacyScore: number;
  band: "Local Legend" | "National Star" | "Continental" | "All-Time";
};
