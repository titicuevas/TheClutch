import { createRng } from "../rng/index";
import { simulateSeason } from "../simulation/season";
import { shouldForceRetire } from "./createCareer";
import type { CareerState, Command, DispatchResult } from "./types";

export function dispatch(state: CareerState, command: Command): DispatchResult {
  if (state.retired) {
    return { state, log: ["Career already retired"] };
  }

  switch (command.type) {
    case "RETIRE":
      return { state: { ...state, retired: true }, log: ["Retired"] };
    case "SIMULATE_NEXT": {
      if (shouldForceRetire(state)) {
        return { state: { ...state, retired: true }, log: ["Forced retirement"] };
      }
      const rng = createRng(`${state.meta.runSeed}:career`);
      const next = simulateSeason(state, rng);
      if (shouldForceRetire(next)) {
        return {
          state: { ...next, retired: true },
          log: [`Season ${state.world.year} complete`, "Forced retirement"],
        };
      }
      return { state: next, log: [`Season ${state.world.year} complete`] };
    }
  }
}
