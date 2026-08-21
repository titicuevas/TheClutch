import { calculateLegacy } from "../legacy/index";
import { createCareer } from "../state/createCareer";
import { dispatch } from "../state/dispatch";
import { isAllTeamAward } from "../simulation/season";
import type { CareerState, Position } from "../state/types";

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

export function simulateCareer(playerSeed: string, runSeed = playerSeed): CareerState {
  let state = createCareer({ playerSeed, runSeed });
  let guard = 0;
  while (!state.retired && guard < 200) {
    if (state.pendingDecision) {
      const optionId = state.pendingDecision.options[0]!.id;
      state = dispatch(state, { type: "CHOOSE", optionId }).state;
    } else {
      state = dispatch(state, { type: "SIMULATE_NEXT" }).state;
    }
    guard += 1;
  }
  return state;
}

export type PositionLine = {
  n: number;
  pts: number;
  ast: number;
  reb: number;
};

export type BalanceReport = {
  n: number;
  prefix: string;
  retired: number;
  p50Peak: number;
  pctPeak90: number;
  p50Legacy: number;
  p90Legacy: number;
  pctAllTime: number;
  pctLocalLegend: number;
  pctModerateInjury: number;
  pctUndraftedAllTeam: number;
  pctUndraftedAmericanAllTeam: number;
  p50Seasons: number;
  p50FiredOnce: number;
  byPosition: Record<Position, PositionLine>;
  ptsByOvrBand: Record<"75" | "85" | "92", PositionLine>;
};

export function runBalanceBatch(n: number, prefix = "batch"): BalanceReport {
  const peaks: number[] = [];
  const legacies: number[] = [];
  const seasonCounts: number[] = [];
  const firedCounts: number[] = [];
  let peak90 = 0;
  let moderate = 0;
  let undraftedN = 0;
  let undraftedAllTeam = 0;
  let undraftedAmericanAllTeam = 0;
  let retired = 0;
  let allTime = 0;
  let localLegend = 0;
  const posStats: Record<Position, { pts: number[]; ast: number[]; reb: number[] }> = {
    PG: { pts: [], ast: [], reb: [] },
    SG: { pts: [], ast: [], reb: [] },
    SF: { pts: [], ast: [], reb: [] },
    PF: { pts: [], ast: [], reb: [] },
    C: { pts: [], ast: [], reb: [] },
  };
  const bandStats: Record<"75" | "85" | "92", { pts: number[]; ast: number[]; reb: number[] }> = {
    "75": { pts: [], ast: [], reb: [] },
    "85": { pts: [], ast: [], reb: [] },
    "92": { pts: [], ast: [], reb: [] },
  };

  for (let i = 0; i < n; i++) {
    const seed = `${prefix}:${i}`;
    const state = simulateCareer(seed, seed);
    if (state.retired) retired += 1;
    seasonCounts.push(state.history.length);
    firedCounts.push(state.player.flags.firedOnce.length);
    const peak = Math.max(state.player.peakOverall, ...state.history.map((s) => s.overall));
    peaks.push(peak);
    if (peak >= 90) peak90 += 1;
    const report = calculateLegacy(state);
    legacies.push(report.legacyScore);
    if (report.band === "all_time") allTime += 1;
    if (report.band === "local_legend") localLegend += 1;
    if (state.history.some((s) => s.injury?.severity === "moderate")) moderate += 1;
    const undrafted = !state.player.flags.drafted;
    if (undrafted) {
      undraftedN += 1;
      if (state.history.some((s) => s.awards.some(isAllTeamAward))) undraftedAllTeam += 1;
      if (
        state.history.some(
          (s) => s.competitionId === "american_league" && s.awards.some(isAllTeamAward),
        )
      ) {
        undraftedAmericanAllTeam += 1;
      }
    }
    const pos = state.player.position;
    for (const season of state.history) {
      posStats[pos].pts.push(season.stats.pts);
      posStats[pos].ast.push(season.stats.ast);
      posStats[pos].reb.push(season.stats.reb);
      const band = ovrBand(season.overall);
      if (band) {
        bandStats[band].pts.push(season.stats.pts);
        bandStats[band].ast.push(season.stats.ast);
        bandStats[band].reb.push(season.stats.reb);
      }
    }
  }

  return {
    n,
    prefix,
    retired,
    p50Peak: p50(peaks),
    pctPeak90: peak90 / n,
    p50Legacy: p50(legacies),
    p90Legacy: p90(legacies),
    pctAllTime: allTime / n,
    pctLocalLegend: localLegend / n,
    pctModerateInjury: moderate / n,
    pctUndraftedAllTeam: undraftedN === 0 ? 0 : undraftedAllTeam / undraftedN,
    pctUndraftedAmericanAllTeam: undraftedN === 0 ? 0 : undraftedAmericanAllTeam / undraftedN,
    p50Seasons: p50(seasonCounts),
    p50FiredOnce: p50(firedCounts),
    byPosition: Object.fromEntries(POSITIONS.map((pos) => [pos, line(posStats[pos])])) as Record<
      Position,
      PositionLine
    >,
    ptsByOvrBand: {
      "75": line(bandStats["75"]),
      "85": line(bandStats["85"]),
      "92": line(bandStats["92"]),
    },
  };
}

export function formatBalanceReport(report: BalanceReport): string {
  const posLines = POSITIONS.map((pos) => {
    const row = report.byPosition[pos];
    return `  ${pos.padEnd(3)} n=${row.n}  p50 ${row.pts.toFixed(1)}/${row.ast.toFixed(1)}/${row.reb.toFixed(1)}`;
  });
  const bandLines = (["75", "85", "92"] as const).map((band) => {
    const row = report.ptsByOvrBand[band];
    return `  OVR~${band} n=${row.n}  p50 ${row.pts.toFixed(1)} pts`;
  });
  return [
    `THECLUTCH · balance batch n=${report.n} prefix=${report.prefix}`,
    `retired ${report.retired}/${report.n}`,
    `peak p50 ${report.p50Peak} · peak≥90 ${(report.pctPeak90 * 100).toFixed(1)}%`,
    `legacy p50 ${Math.round(report.p50Legacy)} · p90 ${Math.round(report.p90Legacy)} · Histórico ${(report.pctAllTime * 100).toFixed(1)}% · Leyenda local ${(report.pctLocalLegend * 100).toFixed(1)}%`,
    `temporadas p50 ${report.p50Seasons} · giros p50 ${report.p50FiredOnce}`,
    `lesión moderate ${(report.pctModerateInjury * 100).toFixed(1)}% · undrafted All-Team ${(report.pctUndraftedAllTeam * 100).toFixed(1)}% · undrafted All-Team US ${(report.pctUndraftedAmericanAllTeam * 100).toFixed(1)}%`,
    "por posición (p50 PTS/AST/REB):",
    ...posLines,
    "PPG por banda de OVR:",
    ...bandLines,
  ].join("\n");
}

function ovrBand(overall: number): "75" | "85" | "92" | null {
  if (overall >= 72 && overall <= 78) return "75";
  if (overall >= 82 && overall <= 88) return "85";
  if (overall >= 89) return "92";
  return null;
}

function line(values: { pts: number[]; ast: number[]; reb: number[] }): PositionLine {
  return {
    n: values.pts.length,
    pts: p50(values.pts),
    ast: p50(values.ast),
    reb: p50(values.reb),
  };
}

function p50(values: number[]): number {
  return percentile(values, 0.5);
}

function p90(values: number[]): number {
  return percentile(values, 0.9);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor((sorted.length - 1) * p);
  return Math.round(sorted[mid]! * 10) / 10;
}
