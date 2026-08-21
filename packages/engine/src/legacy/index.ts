import { encodeChallengeCode } from "../daily";
import { badgeLabel, nationLabel, positionLabel } from "../copy";
import { formatWage, LEGACY_ALL_TIME, LEGACY_CONTINENTAL, LEGACY_NATIONAL, isFormation, netEarnings, legacyWeight } from "../constants";
import { calculateOverall } from "../player/overall";
import { collectClubStints } from "../state/stints";
import type { CareerState, LegacyBand, LegacyReport, MomentId } from "../state/types";

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function bandFromScore(score: number): LegacyBand {
  if (score >= LEGACY_ALL_TIME) return "all_time";
  if (score >= LEGACY_CONTINENTAL) return "continental";
  if (score >= LEGACY_NATIONAL) return "national_star";
  return "local_legend";
}

const BAND_COPY: Record<LegacyBand, string> = {
  local_legend: "Leyenda local",
  national_star: "Estrella nacional",
  continental: "Continental",
  all_time: "Histórico",
};

export const MOMENT_LABEL: Record<MomentId, string> = {
  undrafted_mvp: "Sin draft. MVP.",
  olympic_gold: "Oro olímpico.",
  world_gold: "Oro mundial.",
  one_club: "Un solo club.",
  late_bloomer: "Maduró tarde.",
};

/** Copy de chips. CAREER_SYSTEM §6.1. Ids siguen en inglés. */
export const AWARD_LABEL: Record<string, string> = {
  MVP: "MVP",
  DPOY: "DPOY",
  FMVP: "FMVP",
  ROY: "ROY",
  MIP: "MIP",
  "6MOY": "6MOY",
  AS: "All-Star",
  "All-Rookie": "All-Rookie 2ª",
  "All-Rookie-1": "All-Rookie 1ª",
  "All-Rookie-2": "All-Rookie 2ª",
  "All-Defense": "All-Defense 2ª",
  "All-Defense-1": "All-Defense 1ª",
  "All-Defense-2": "All-Defense 2ª",
  POTY: "Jugador del año",
  "All-Circuit": "All-Circuit",
  CMVP: "MVP continental",
  CFMVP: "FMVP continental",
  "All-Team": "All-Team 2ª",
  "All-Team-1": "All-Team 1ª",
  "All-Team-2": "All-Team 2ª",
  "All-Team-3": "All-Team 3ª",
};

export function awardLabel(id: string): string {
  return AWARD_LABEL[id] ?? id;
}

export function formatAwardLine(awards: string[]): string {
  return tallyLine(awards, awardLabel);
}

export const TITLE_LABEL: Record<string, string> = {
  League: "Liga",
  Continental: "Continental",
};

export function titleLabel(id: string): string {
  return TITLE_LABEL[id] ?? id;
}

export function formatTitleLine(titles: string[]): string {
  return tallyLine(titles, titleLabel);
}

function tallyLine(items: string[], label: (id: string) => string): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, n]) => {
      const text = label(id);
      return n > 1 ? `${text} x${n}` : text;
    })
    .join(" · ");
}

const MOMENT_SCORE = 180;

export function calculateLegacy(state: CareerState): LegacyReport {
  const { player, history } = state;
  const games = history.reduce((sum, s) => sum + s.stats.games, 0);
  const titles = history.flatMap((s) => s.titles);
  const awards = history.flatMap((s) => s.awards);
  const clubs = new Map<string, string>();
  for (const season of history) clubs.set(season.teamId, season.teamName);
  const teams = [...clubs.entries()].map(([id, name]) => ({ id, name }));
  const peak = Math.max(
    player.peakOverall,
    ...history.map((s) => s.overall),
    calculateOverall(player.attributes, player.position, player.archetype),
  );

  const ppg = avg(history.map((s) => s.stats.pts));
  const apg = avg(history.map((s) => s.stats.ast));
  const rpg = avg(history.map((s) => s.stats.reb));
  const bpg = avg(history.map((s) => s.stats.blk));

  const golds = history.filter((s) => s.national?.result === "gold").length;
  const silvers = history.filter((s) => s.national?.result === "silver").length;
  const bronzes = history.filter((s) => s.national?.result === "bronze").length;
  const caps = history.filter((s) => s.national?.status === "called" || s.national?.status === "captain").length;

  let score = 0;
  score += peak * 42;
  score += history.length * 55;

  let statAcc = 0;
  for (const season of history) {
    const weight = legacyWeight(season.competitionId);
    statAcc += (season.stats.pts * 70 + season.stats.ast * 40 + season.stats.reb * 30) * weight;
    score += weightedSeasonAwards(season.awards, weight);
    if (season.titles.includes("League")) score += Math.round(350 * weight);
    if (season.titles.includes("Continental")) score += 220;
  }
  if (history.length) score += Math.round(statAcc / history.length);

  score += golds * 320;
  score += silvers * 180;
  score += bronzes * 90;
  score += caps * 40;
  score += player.badges.length * 90;
  score += Math.min(games, 800);
  const moments = collectMoments(state);
  score += moments.length * MOMENT_SCORE;

  return {
    name: [player.firstName, player.lastName].filter(Boolean).join(" "),
    position: player.position,
    nationality: player.nationality,
    seasons: history.length,
    games,
    peakOverall: peak,
    ppg,
    apg,
    rpg,
    bpg,
    earnings: netEarnings(
      history.map((season) => season.salary),
      player.spent,
    ),
    teams,
    clubStints: collectClubStints(history),
    titles,
    awards,
    badges: player.badges,
    caps,
    golds,
    silvers,
    bronzes,
    moments,
    legacyScore: Math.round(score),
    band: bandFromScore(score),
    mode: state.meta.mode,
    dailyDate: state.meta.dailyDate,
    challengeCode: state.meta.challengeCode ?? encodeChallengeCode(state.meta.playerSeed) ?? undefined,
  };
}

export function formatNationalLine(
  report: Pick<LegacyReport, "caps" | "golds" | "silvers" | "bronzes">,
): string {
  if (report.caps === 0 && report.golds + report.silvers + report.bronzes === 0) {
    return "Sin selección";
  }
  const parts: string[] = [];
  if (report.caps > 0) parts.push(report.caps === 1 ? "1 cap" : `${report.caps} caps`);
  if (report.golds > 0) parts.push(medalCopy("Oro", report.golds));
  if (report.silvers > 0) parts.push(medalCopy("Plata", report.silvers));
  if (report.bronzes > 0) parts.push(medalCopy("Bronce", report.bronzes));
  return `Selección · ${parts.join(" · ")}`;
}

export function formatLegacyCard(report: LegacyReport): string {
  const awards = formatAwardLine(report.awards);
  const lines = [
    report.name.toUpperCase(),
    `${positionLabel(report.position)} · ${nationLabel(report.nationality)}`,
    "",
    `${report.seasons} temporadas`,
    `Pico OVR: ${report.peakOverall}`,
    "",
    `${report.ppg.toFixed(1)} PPG`,
    `${report.apg.toFixed(1)} APG`,
    `${report.rpg.toFixed(1)} RPG`,
    `${report.bpg.toFixed(1)} TAP`,
    `Ganado: ${formatWage(report.earnings)}`,
    "",
    report.titles.length ? formatTitleLine(report.titles) : "Sin títulos",
    report.teams.map((club) => club.name).join(" · ") || "Sin clubes",
    awards || "Sin premios",
    formatNationalLine(report),
    ...(report.badges.length ? [report.badges.map((id) => badgeLabel(id)).join(" · ")] : []),
    ...(report.moments.length ? [report.moments.map((id) => MOMENT_LABEL[id]).join(" · ")] : []),
    "",
    BAND_COPY[report.band],
    report.legacyScore.toLocaleString("es-ES"),
  ];
  const share = formatShareLine(report);
  if (share) lines.push("", share);
  return lines.join("\n");
}

export function formatShareLine(report: Pick<LegacyReport, "mode" | "dailyDate" | "challengeCode">): string | undefined {
  if (!report.challengeCode) return undefined;
  if (report.mode === "daily" && report.dailyDate) {
    return `Daily ${report.dailyDate} · ${report.challengeCode}`;
  }
  return `Challenge ${report.challengeCode}`;
}

export function collectMoments(state: CareerState): MomentId[] {
  const { player, history } = state;
  const awards = history.flatMap((season) => season.awards);
  const found: MomentId[] = [];

  if (!player.flags.drafted && awards.includes("MVP")) found.push("undrafted_mvp");
  if (history.some((season) => season.national?.tournament === "olympics" && season.national.result === "gold")) {
    found.push("olympic_gold");
  }
  if (history.some((season) => season.national?.tournament === "world" && season.national.result === "gold")) {
    found.push("world_gold");
  }

  const pro = history.filter((season) => !isFormation(season.competitionId));
  const clubs = new Set(pro.map((season) => season.teamId));
  if (clubs.size === 1 && pro.length >= 8) found.push("one_club");

  if (player.growthCurve === "late") {
    let peakAge = 0;
    let peakOvr = 0;
    for (const season of history) {
      if (season.overall >= peakOvr) {
        peakOvr = season.overall;
        peakAge = season.age;
      }
    }
    if (peakAge >= 25 && peakOvr >= 78) found.push("late_bloomer");
  }

  return found.slice(0, 3);
}

function medalCopy(name: string, count: number): string {
  return count > 1 ? `${name} ×${count}` : name;
}

function weightedSeasonAwards(awards: string[], weight: number): number {
  let league = 0;
  let cup = 0;
  for (const award of awards) {
    if (award === "CMVP") cup += 180;
    else if (award === "CFMVP") cup += 200;
    else league += leagueAwardPoints(award);
  }
  return Math.round(league * weight) + cup;
}

function leagueAwardPoints(award: string): number {
  if (award === "MVP") return 420;
  if (award === "DPOY" || award === "FMVP") return 280;
  if (award === "MIP" || award === "ROY") return 160;
  if (award === "POTY") return 90;
  if (award === "All-Circuit") return 40;
  return allTeamLegacy(award) + allDefLegacy(award) + allRookieLegacy(award);
}

function allTeamLegacy(award: string): number {
  if (award === "All-Team-1") return 110;
  if (award === "All-Team-2" || award === "All-Team") return 80;
  if (award === "All-Team-3") return 50;
  return 0;
}

function allDefLegacy(award: string): number {
  if (award === "All-Defense-1") return 90;
  if (award === "All-Defense-2" || award === "All-Defense") return 70;
  return 0;
}

function allRookieLegacy(award: string): number {
  if (award === "All-Rookie-1") return 50;
  if (award === "All-Rookie-2" || award === "All-Rookie") return 30;
  return 0;
}
