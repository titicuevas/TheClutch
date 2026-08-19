import { describe, expect, it } from "vitest";
import { calculateOverall, createCareer, dispatch, getViewModel } from "./index";
import { simulateBoxScore } from "./simulation/boxscore";
import { createRng } from "./rng/index";
import type { CareerState, Player } from "./state/types";

function runCareer(playerSeed: string, runSeed = playerSeed): CareerState {
  let state = createCareer({ playerSeed, runSeed });
  while (!state.retired) {
    state = dispatch(state, { type: "SIMULATE_NEXT" }).state;
  }
  return state;
}

describe("createCareer", () => {
  it("misma playerSeed produce el mismo jugador", () => {
    const a = createCareer({ playerSeed: "alpha", runSeed: "r1" });
    const b = createCareer({ playerSeed: "alpha", runSeed: "r2" });
    expect(a.player.firstName).toBe(b.player.firstName);
    expect(a.player.lastName).toBe(b.player.lastName);
    expect(a.player.position).toBe(b.player.position);
    expect(a.player.archetype).toBe(b.player.archetype);
    expect(a.player.attributes).toEqual(b.player.attributes);
    expect(a.player.potential).toBe(b.player.potential);
  });

  it("getViewModel no expone el potencial exacto", () => {
    const state = createCareer({ playerSeed: "hidden", runSeed: "hidden" });
    const vm = getViewModel(state);
    expect(vm.potentialBand).toMatch(/fringe|role|starter|star/);
    expect(vm).not.toHaveProperty("potential");
  });
});

describe("dispatch", () => {
  it("es determinista con la misma runSeed", () => {
    const a = runCareer("same-player", "same-run");
    const b = runCareer("same-player", "same-run");
    expect(a.history.map((s) => s.stats.pts)).toEqual(b.history.map((s) => s.stats.pts));
    expect(a.history.map((s) => s.overall)).toEqual(b.history.map((s) => s.overall));
    expect(a.player.age).toBe(b.player.age);
  });

  it("termina la carrera en un rango creíble de temporadas", () => {
    const state = runCareer("length-check", "length-check");
    expect(state.retired).toBe(true);
    expect(state.history.length).toBeGreaterThanOrEqual(10);
    expect(state.history.length).toBeLessThanOrEqual(24);
  });
});

describe("producción por posición", () => {
  it("un PG reparte más y un C rebotea más, a igual overall aproximado", () => {
    const pg = findPlayer("PG");
    const c = findPlayer("C");
    const rng = createRng("box-compare");
    const pgBox = simulateBoxScore(pg, "starter", rng.fork("pg"));
    const cBox = simulateBoxScore(c, "starter", rng.fork("c"));

    expect(pgBox.ast).toBeGreaterThan(cBox.ast);
    expect(cBox.reb).toBeGreaterThan(pgBox.reb);
    expect(cBox.blk).toBeGreaterThan(pgBox.blk);
  });
});

function findPlayer(position: "PG" | "C"): Player {
  for (let i = 0; i < 400; i++) {
    const state = createCareer({ playerSeed: `hunt:${position}:${i}`, runSeed: "x" });
    if (state.player.position === position) {
      const ovr = calculateOverall(
        state.player.attributes,
        state.player.position,
        state.player.archetype,
      );
      if (ovr >= 62 && ovr <= 86) return state.player;
    }
  }
  throw new Error(`No ${position} found for test`);
}
