export const ENGINE_VERSION = "0.13.8";
export const SCHEMA_VERSION = 22;
/** Tope del log de comandos. DAILY_MODE §5: un log más largo es ilegal. */
export const MAX_COMMANDS = 400;

/** Edad de salida provisional (D-04). */
export const STARTING_AGE = 18;

export const ATTR_MIN = 40;
export const ATTR_MAX = 99;
export const GAMES_PER_SEASON = 40;
/** Un chequeo a mitad (SIMULATION.md §3: 1–2 puntos). */
export const MID_SEASON_GAMES = 20;
export const MAX_AGE = 40;
export const FORCE_RETIRE_OVERALL = 58;
export const SOFT_RETIRE_AGE = 36;
export const SOFT_RETIRE_OVERALL = 70;

/** Cortes de banda Free. Calibrados con batch 10k (p50 ~18k; Histórico era 21% a 22k). SIMULATION.md §8.5. */
export const LEGACY_ALL_TIME = 24000;
export const LEGACY_CONTINENTAL = 18000;
export const LEGACY_NATIONAL = 14000;

/** D-16: unidades abstractas. La UI las pinta como millones de `$` genérico. */
export function formatWage(units: number): string {
  if (units === 0) return "$0";
  return `$${units}M`;
}

/** Giro `lifestyle_flex`. D-25: no es tienda. */
export const LIFESTYLE_SPEND = 16;

/** GAME_DESIGN §9: musts de sabor (afición, lifestyle, declive…) dejan de ser obligatorios. Salud y destino no. */
export const SPORADIC_MUST_CAP = 8;

export function netEarnings(salaries: number[], spent: number): number {
  const gross = salaries.reduce((sum, n) => sum + n, 0);
  return Math.max(0, gross - spent);
}

/** Copy de proyección de draft. Ids: `top_3` / `lottery` / … CAREER_SYSTEM §5.2. */
export const DRAFT_BAND_LABEL: Record<string, string> = {
  top_3: "Top 3",
  lottery: "Lotería",
  first_round: "Primera ronda",
  second_round: "Segunda ronda",
  undrafted: "Sin ser elegido",
};

export function draftBandLabel(band: string | undefined): string {
  if (!band) return DRAFT_BAND_LABEL.undrafted!;
  return DRAFT_BAND_LABEL[band] ?? band;
}

export function isFormation(competitionId: string): boolean {
  return competitionId === "club_academy" || competitionId === "college_circuit";
}

/** COMPETITIONS.md §3. Nacional menor (0.5) no está partido en este corte. */
export const LEGACY_WEIGHT: Record<string, number> = {
  club_academy: 0.35,
  college_circuit: 0.35,
  national_league: 0.75,
  continental_competition: 1,
  american_league: 1.15,
};

export function legacyWeight(competitionId: string): number {
  return LEGACY_WEIGHT[competitionId] ?? 0.35;
}
