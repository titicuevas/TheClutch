import { describe, expect, it } from "vitest";
import {
  MAX_COMMANDS,
  calculateLegacy,
  createCareer,
  dailyPlayerSeed,
  dispatch,
  replay,
} from "./index";
import type { Command } from "./state/types";

function play(playerSeed: string, runSeed = playerSeed, extra?: Parameters<typeof createCareer>[0]) {
  let state = createCareer({ playerSeed, runSeed, ...extra });
  let guard = 0;
  while (!state.retired && guard < 200) {
    const command: Command = state.pendingDecision
      ? { type: "CHOOSE", optionId: state.pendingDecision.options[0]!.id }
      : { type: "SIMULATE_NEXT" };
    state = dispatch(state, command).state;
    guard += 1;
  }
  return state;
}

describe("replay", () => {
  it("reproducir meta.commands da el mismo legacy", () => {
    const state = play("replay-api");
    expect(state.meta.commands.length).toBeGreaterThan(4);
    const result = replay(
      { playerSeed: "replay-api", runSeed: "replay-api" },
      state.meta.commands,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.retired).toBe(true);
    expect(result.report.legacyScore).toBe(calculateLegacy(state).legacyScore);
    expect(result.state.history.map((season) => season.stats.pts)).toEqual(
      state.history.map((season) => season.stats.pts),
    );
    expect(result.state.meta.commands).toEqual(state.meta.commands);
  });

  it("un Daily con el mismo log da el mismo score", () => {
    const date = "2026-08-21";
    const input = {
      playerSeed: dailyPlayerSeed(date),
      runSeed: "daily-replay",
      mode: "daily" as const,
      dailyDate: date,
    };
    const state = play(input.playerSeed, input.runSeed, input);
    const result = replay(input, state.meta.commands);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.legacyScore).toBe(calculateLegacy(state).legacyScore);
    expect(result.state.player.firstName).toBe(state.player.firstName);
  });

  it("un comando ilegal no cuenta", () => {
    const input = { playerSeed: "illegal-log", runSeed: "illegal-log" };
    expect(replay(input, [{ type: "CHOOSE", optionId: "nope" }]).ok).toBe(false);
    const opened = dispatch(createCareer(input), { type: "SIMULATE_NEXT" }).state;
    expect(replay(input, [{ type: "CHOOSE", optionId: "nope" }, ...opened.meta.commands]).ok).toBe(false);
    expect(dispatch(opened, { type: "CHOOSE", optionId: "nope" }).applied).toBe(false);
    expect(dispatch(opened, { type: "SIMULATE_NEXT" }).applied).toBe(false);
  });

  it("un log demasiado largo se rechaza antes de jugar", () => {
    const filler: Command[] = Array.from({ length: MAX_COMMANDS + 1 }, () => ({ type: "SIMULATE_NEXT" as const }));
    const result = replay({ playerSeed: "long-log", runSeed: "long-log" }, filler);
    expect(result).toEqual({ ok: false, reason: "too_long" });
  });
});
