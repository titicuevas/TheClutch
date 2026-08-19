import type { CareerState, LegacyReport } from "../state/types";
import { calculateOverall } from "../player/overall";

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function calculateLegacy(state: CareerState): LegacyReport {
  const { player, history } = state;
  const games = history.reduce((sum, s) => sum + s.stats.games, 0);
  const titles = history.flatMap((s) => s.titles.map((t) => `${t} ${s.year}`));
  const awards = history.flatMap((s) => s.awards);
  const teams = [...new Set(history.map((s) => s.teamName))];
  const peak = Math.max(
    player.peakOverall,
    ...history.map((s) => s.overall),
    calculateOverall(player.attributes, player.position, player.archetype),
  );

  const ppg = avg(history.map((s) => s.stats.pts));
  const apg = avg(history.map((s) => s.stats.ast));
  const rpg = avg(history.map((s) => s.stats.reb));

  const mvpCount = awards.filter((a) => a === "MVP").length;
  const allTeams = awards.filter((a) => a === "All-Team").length;
  const rings = history.filter((s) => s.titles.includes("League")).length;

  let score = 0;
  score += peak * 42;
  score += history.length * 55;
  score += Math.round(ppg * 70 + apg * 40 + rpg * 30);
  score += mvpCount * 420;
  score += allTeams * 80;
  score += rings * 350;
  score += Math.min(games, 800);

  let band: LegacyReport["band"] = "Local Legend";
  if (score >= 9000) band = "All-Time";
  else if (score >= 7200) band = "Continental";
  else if (score >= 5600) band = "National Star";

  return {
    name: `${player.firstName} ${player.lastName}`,
    position: player.position,
    nationality: player.nationality,
    seasons: history.length,
    games,
    peakOverall: peak,
    ppg,
    apg,
    rpg,
    earningsNote: "n/a (Fase 1)",
    teams,
    titles,
    awards,
    legacyScore: Math.round(score),
    band,
  };
}

export function formatLegacyCard(report: LegacyReport): string {
  const awards = tally(report.awards);
  const lines = [
    report.name.toUpperCase(),
    `${report.position} · ${report.nationality}`,
    "",
    `${report.seasons} seasons`,
    `Peak OVR: ${report.peakOverall}`,
    "",
    `${report.ppg.toFixed(1)} PPG`,
    `${report.apg.toFixed(1)} APG`,
    `${report.rpg.toFixed(1)} RPG`,
    "",
    report.titles.length ? report.titles.join(" · ") : "No titles",
    awards || "No awards",
    "",
    "LEGACY SCORE",
    report.legacyScore.toLocaleString("en-US"),
    report.band,
  ];
  return lines.join("\n");
}

function tally(items: string[]): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].map(([k, n]) => (n > 1 ? `${k} x${n}` : k)).join(" · ");
}
