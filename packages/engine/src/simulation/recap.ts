import { NATIONAL_RESULT, TOURNAMENT_LABEL, nationLabel } from "../copy";
import type { AwardSnub, NationalStint, Role, SeasonGrade, SeasonMark, SeasonRecord, SeasonStats } from "../state/types";
import { formatSeriesLine } from "./series";

type GradeInput = {
  stats: SeasonStats;
  playoff: SeasonRecord["playoff"];
  awards: string[];
  titles?: string[];
  injury?: SeasonRecord["injury"];
  national?: NationalStint;
  role: Role;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Nota del año. No es Legacy Score. SIMULATION.md §8.4. */
export function gradeSeason(season: GradeInput): SeasonGrade {
  let score = 36;
  score += Math.round(Math.min(season.stats.pts, 28) * 1.1);
  score += Math.round(Math.min(season.stats.ast, 12) * 0.6);
  score += Math.round(Math.min(season.stats.reb, 14) * 0.5);

  if (season.playoff === "champ") score += 22;
  else if (season.playoff === "finals") score += 12;
  else if (season.playoff === "out") score += 5;

  if (season.titles?.includes("Continental")) {
    score += season.playoff === "champ" ? 8 : 14;
  }

  for (const award of season.awards) {
    if (award === "MVP") score += 18;
    else if (award === "CMVP") score += 12;
    else if (award === "FMVP" || award === "DPOY" || award === "CFMVP") score += 12;
    else if (award === "ROY" || award === "MIP" || award === "POTY") score += 8;
    else if (award === "All-Team-1" || award === "All-Defense-1" || award === "All-Rookie-1") score += 6;
    else score += 4;
  }

  if (season.national?.result === "gold") score += 12;
  else if (season.national?.result === "silver") score += 7;
  else if (season.national?.result === "bronze") score += 4;
  else if (season.national?.status === "snub") score -= 3;

  if (season.injury?.severity === "moderate") score -= 14;
  else if (season.injury) score -= 6;

  if (season.role === "franchise" || season.role === "star") score += 3;

  score = clamp(score, 12, 99);
  return { mark: markFor(score), score };
}

export function recapHeadline(season: SeasonRecord, grade: SeasonGrade): string {
  if (season.playoff === "champ") return "Anillo. El resto es ruido.";
  if (season.titles.includes("Continental")) return "Continental. El club llegó lejos.";
  if (season.awards.includes("MVP") || season.awards.includes("CMVP")) return "MVP. Año tuyo.";
  if (season.national?.result === "gold") {
    return season.national.foe ? `Oro ante ${nationLabel(season.national.foe)}.` : "Oro con la selección.";
  }
  if (season.awards.includes("POTY")) return "Jugador del año.";
  if (season.draft && !season.draft.undrafted && (season.draft.band === "top_3" || season.draft.band === "lottery")) {
    return "Oyeron tu nombre.";
  }
  if (season.draft?.undrafted) return "El draft pasó de largo.";
  if (season.injury?.severity === "moderate") return "El cuerpo mandó.";
  if (grade.mark === "S") return "Temporada de placa.";
  if (grade.mark === "A") return "Año gordo.";
  if (grade.mark === "B") return "Año sólido.";
  if (grade.mark === "C") return "Año de trabajo.";
  return "Año para olvidar.";
}

/** CAREER_SYSTEM §6.1. Una línea; no gala. */
export function awardSnubLine(snub: AwardSnub | undefined): string | undefined {
  if (snub === "MVP") return "El MVP se fue a otro.";
  if (snub === "POTY") return "Jugador del año se fue a otro.";
  if (snub === "All-Team") return "Los números estaban. Las placas no.";
  return undefined;
}

/** COMPETITIONS §6. Marcador + club; no segundo boxscore. */
export function formatPlayoffLine(season: Pick<SeasonRecord, "playoff" | "playoffRun">): string | undefined {
  const run = season.playoffRun;
  if (!run || season.playoff === "missed") return undefined;
  return formatSeriesLine(run);
}

export function formatContinentalLine(
  season: Pick<SeasonRecord, "continental" | "continentalRun">,
): string | undefined {
  const run = season.continentalRun;
  if (!run || !season.continental) return undefined;
  return `Continental · ${formatSeriesLine(run)}`;
}

export function formatTeamRecord(record: SeasonRecord["teamRecord"]): string | undefined {
  if (!record) return undefined;
  return `${record.wins}-${record.losses}`;
}

/** COMPETITIONS §8. Recap: torneo + país + convocatoria + resultado. */
export function formatNationalStintLine(stint: NationalStint, nationality: string): string {
  const cup = TOURNAMENT_LABEL[stint.tournament] ?? stint.tournament;
  const head = `${cup} ${nationLabel(nationality)}`;
  if (stint.status === "snub") return `${head} · sin convocatoria`;
  if (stint.status === "declined") return `${head} · no viajó`;
  const duty = stint.status === "captain" ? "capitán" : "convocado";
  if (!stint.result) return `${head} · ${duty}`;
  return `${head} · ${duty} · ${nationalResultLine(stint)}`;
}

/** Chip del log: más corto; el capitán queda en el recap. */
export function formatNationalChip(stint: NationalStint): string {
  const cup = TOURNAMENT_LABEL[stint.tournament] ?? stint.tournament;
  if (stint.status === "snub") return `${cup} · sin convocatoria`;
  if (stint.status === "declined") return `${cup} · no viajó`;
  if (!stint.result) return `${cup} · convocado`;
  return `${cup} · ${nationalResultLine(stint)}`;
}

function nationalResultLine(stint: NationalStint): string {
  const result = NATIONAL_RESULT[stint.result ?? ""] ?? stint.result ?? "";
  const foe = stint.foe && stint.result && stint.result !== "groups" ? ` ante ${nationLabel(stint.foe)}` : "";
  return `${result}${foe}`;
}

function markFor(score: number): SeasonMark {
  if (score >= 88) return "S";
  if (score >= 76) return "A";
  if (score >= 62) return "B";
  if (score >= 48) return "C";
  return "D";
}
