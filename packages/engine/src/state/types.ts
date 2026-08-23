export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type Handed = "left" | "right";

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

export type CareerPath = "club" | "college";

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
  handed: Handed;
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
  roleBias: number;
  injuryHistory: InjuryRecord[];
  spent: number;
  flags: {
    drafted: boolean;
    draftClosed: boolean;
    tradeRequest: boolean;
    skipNational?: boolean;
    firedOnce: string[];
    path?: CareerPath;
    retirePromptedYear?: number;
  };
  badges: BadgeId[];
};

export type BadgeId =
  | "clutch"
  | "sharpshooter"
  | "floor_general"
  | "lockdown"
  | "microwave"
  | "rim_protector"
  | "franchise_player";

export type Team = {
  id: string;
  name: string;
  country: string;
  competitionId: string;
  rating: number;
  prestige: number;
  contention: number;
};

/** COMPETITIONS §4. Sin carrera propia. */
export type ShadowMate = {
  firstName: string;
  lastName: string;
  position: Position;
  overall: number;
};

export type Rival = {
  firstName: string;
  lastName: string;
  nationality: string;
  position: Position;
  team: Team;
  overall: number;
  lastPts: number;
  lastBlk: number;
  lastAwards: string[];
};

export type ClubStanding = "loved" | "ok" | "cold";

/** Un adjetivo visible. Los 5 traits siguen ocultos. PLAYER_MODEL §6. */
export type Temperament = "loyal" | "ego" | "ambitious" | "pro" | "volatile" | "competitor";

export type ClubStint = {
  teamId: string;
  teamName: string;
  seasons: number;
  fromYear: number;
  toYear: number;
  pts: number;
  ast: number;
  reb: number;
  blk: number;
  titles: string[];
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
  playoff: "missed" | "out" | "finals" | "champ";
  /** Rival y marcador de la ronda que cierra. COMPETITIONS §6 / SIMULATION §7. */
  playoffRun?: PlayoffRun;
  /** Knockout continental. Mismo shape que playoffs. */
  continentalRun?: PlayoffRun;
  /** Récord del club esa temporada. SIMULATION §7. */
  teamRecord?: TeamRecord;
  /** Knockout continental el mismo año. Solo `national_league` con cartel. */
  continental?: "out" | "finals" | "champ";
  salary: number;
  injury?: InjuryRecord;
  national?: NationalStint;
  choices: SeasonChoice[];
  grade: SeasonGrade;
  newBadges: BadgeId[];
  draft?: DraftResult;
  /** Cerca de un gordo y no salió. CAREER_SYSTEM §6.1 / SIMULATION §8.2. */
  awardSnub?: AwardSnub;
};

export type PlayoffRun = {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
};

export type TeamRecord = {
  wins: number;
  losses: number;
};

export type AwardSnub = "MVP" | "All-Team" | "POTY";

export type DraftBand = "top_3" | "lottery" | "first_round" | "second_round" | "undrafted";

export type DraftResult = {
  band: DraftBand;
  undrafted: boolean;
  pick?: number;
  teamId?: string;
  teamName?: string;
};

export type NationalStint = {
  tournament: "continental" | "world" | "olympics";
  status: "snub" | "called" | "captain" | "declined";
  result?: "groups" | "out" | "bronze" | "silver" | "gold";
  /** País rival del knockout. Grupos, snub y declined no lo llevan. */
  foe?: string;
};

export type SeasonChunk = {
  games: number;
  role: Role;
  overall: number;
  teamId: string;
  teamName: string;
  competitionId: string;
  stats: SeasonStats;
  injury?: InjuryRecord;
};

export type SeasonInProgress = {
  first: SeasonChunk;
};

export type RecapBeat = "champ" | "mvp" | "gold" | "award" | "draft";

export type SeasonMark = "S" | "A" | "B" | "C" | "D";

export type SeasonGrade = {
  mark: SeasonMark;
  score: number;
};

export type SeasonChoice = {
  kind: DecisionKind;
  title: string;
  optionLabel: string;
  outcome?: string;
  outcomeTone?: "good" | "bad" | "neutral";
};

export type DecisionKind = "training" | "event" | "draft" | "contract" | "trade" | "retire" | "path";

export type DecisionOption = {
  id: string;
  label: string;
  hint?: string;
};

export type PendingDecision = {
  id: string;
  kind: DecisionKind;
  title: string;
  body: string;
  options: DecisionOption[];
  data?: {
    stayTeam?: Team;
    leaveTeam?: Team;
    ringTeam?: Team;
    stayOffer?: MarketOffer;
    maxOffer?: MarketOffer;
    ringOffer?: MarketOffer;
    draftBand?: DraftBand;
  };
};

export type MarketOffer = {
  salary: number;
  years: number;
  roleBias: number;
  protection: TradeProtection;
};

export type TradeProtection = "none" | "full";

export type CareerMode = "free" | "daily" | "challenge";

export type CareerState = {
  schemaVersion: number;
  engineVersion: string;
  meta: {
    mode: CareerMode;
    playerSeed: string;
    runSeed: string;
    contentVersion?: string;
    dailyDate?: string;
    challengeCode?: string;
    commands: Command[];
  };
  player: Player;
  world: {
    team: Team;
    year: number;
    contract: {
      yearsLeft: number;
      salary: number;
      tradeProtection?: TradeProtection;
    };
    rival: Rival;
    locker: ShadowMate[];
    coachName: string;
    yearLog: SeasonChoice[];
    draftResult?: DraftResult;
  };
  history: SeasonRecord[];
  seasonInProgress: SeasonInProgress | null;
  pendingDecision: PendingDecision | null;
  awaitingRecap: boolean;
  retired: boolean;
};

export type Command =
  | { type: "SIMULATE_NEXT" }
  | { type: "CHOOSE"; optionId: string }
  | { type: "RETIRE" };

export type DispatchResult = {
  state: CareerState;
  log: string[];
  applied: boolean;
};

export type ReplayResult =
  | { ok: true; state: CareerState; report: LegacyReport }
  | { ok: false; reason: "too_long" | "illegal" };

export type CareerViewModel = {
  name: string;
  nationality: string;
  handed: Handed;
  age: number;
  heightCm: number;
  position: Position;
  archetype: Archetype;
  overall: number;
  role: Role;
  minutesMin: number;
  minutesMax: number;
  teamName: string;
  teamId: string;
  competitionId: string;
  contractYearsLeft: number;
  contractSalary: number;
  tradeProtection: TradeProtection;
  careerEarnings: number;
  year: number;
  clubStanding: ClubStanding;
  rival: {
    name: string;
    teamId: string;
    teamName: string;
    pts: number;
    blk: number;
    awards: string[];
  };
  clubStints: ClubStint[];
  potentialBand: "fringe" | "role" | "starter" | "star";
  signature: Partial<Attributes>;
  lastSeason?: SeasonRecord;
  retired: boolean;
  morale: number;
  fatigue: number;
  form: number;
  temperament: Temperament;
  decision: PendingDecision | null;
  upcomingCue?: string;
  badges: BadgeId[];
  recap?: SeasonRecord;
  recapNote?: string;
  recapBeat?: RecapBeat;
  recapGrade?: SeasonGrade;
  recapHeadline?: string;
  midseason?: {
    games: number;
    role: Role;
    teamName: string;
    teamId: string;
    minutes: number;
    pts: number;
    ast: number;
    reb: number;
    injury?: InjuryRecord;
  };
};

export type CreateCareerInput = {
  playerSeed: string;
  runSeed: string;
  mode?: CareerMode;
  dailyDate?: string;
  /** Solo Free. Daily/Challenge ignoran identidad (D-02). */
  givenName?: string;
  position?: Position;
  nationality?: string;
  handed?: Handed;
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
  earnings: number;
  teams: { id: string; name: string }[];
  clubStints: ClubStint[];
  titles: string[];
  awards: string[];
  badges: string[];
  bpg: number;
  caps: number;
  golds: number;
  silvers: number;
  bronzes: number;
  moments: MomentId[];
  bestSeason?: { year: number; teamName: string; grade: SeasonMark; score: number };
  primaryClub?: { id: string; name: string; seasons: number };
  definingChoice?: SeasonChoice;
  clutchRecord: { made: number; missed: number };
  legacyScore: number;
  band: LegacyBand;
  mode: CareerMode;
  dailyDate?: string;
  challengeCode?: string;
};

export type MomentId = "undrafted_mvp" | "olympic_gold" | "world_gold" | "one_club" | "late_bloomer";

export type LegacyBand = "local_legend" | "national_star" | "continental" | "all_time";
