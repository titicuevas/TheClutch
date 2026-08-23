import { describe, expect, it } from "vitest";
import { runBalanceBatch } from "./batch";

describe("balance batch", () => {
  it(
    "80 carreras: PG crea más, C rebotea más, hay picos y no se cuelgan",
    () => {
    const report = runBalanceBatch(80, "bal");
    expect(report.retired).toBe(80);
    expect(report.byPosition.PG.ast).toBeGreaterThan(report.byPosition.C.ast);
    expect(report.byPosition.C.reb).toBeGreaterThan(report.byPosition.PG.reb);
    expect(report.p50Peak).toBeGreaterThanOrEqual(70);
    expect(report.p50Peak).toBeLessThan(90);
    expect(report.pctPeak90).toBeGreaterThan(0.01);
    expect(report.pctPeak90).toBeLessThan(0.25);
    expect(report.pctModerateInjury).toBeGreaterThan(0.08);
    expect(report.pctModerateInjury).toBeLessThan(0.32);
    expect(report.pctClutchDecision).toBeGreaterThan(0);
    expect(report.pctClutchDecision).toBeLessThan(0.25);
    expect(report.p50Legacy).toBeGreaterThan(8000);
    expect(report.pctAllTime).toBeGreaterThan(0.02);
    expect(report.pctAllTime).toBeLessThan(0.28);
    expect(report.pctLocalLegend).toBeGreaterThan(0.02);
    expect(report.p50FiredOnce).toBeLessThanOrEqual(13);
    expect(report.p50Seasons).toBeGreaterThanOrEqual(16);
    expect(report.ptsByOvrBand["75"].pts).toBeGreaterThanOrEqual(12);
    expect(report.ptsByOvrBand["75"].pts).toBeLessThan(20);
    expect(report.ptsByOvrBand["85"].pts).toBeGreaterThan(report.ptsByOvrBand["75"].pts + 3);
    expect(report.ptsByOvrBand["85"].pts).toBeLessThan(31);
    expect(report.ptsByOvrBand["92"].pts).toBeGreaterThan(report.ptsByOvrBand["85"].pts + 1);
    expect(report.ptsByOvrBand["92"].pts).toBeLessThan(36);
    expect(report.pctUndraftedAmericanAllTeam).toBeLessThan(0.35);
    },
    15_000,
  );
});
