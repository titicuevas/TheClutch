import { MAX_COMMANDS } from "./constants";
import { calculateLegacy } from "./legacy/index";
import { createCareer } from "./state/createCareer";
import { dispatch } from "./state/dispatch";
import type { Command, CreateCareerInput, ReplayResult } from "./state/types";

export function replay(input: CreateCareerInput, commands: Command[]): ReplayResult {
  if (!Array.isArray(commands) || commands.length > MAX_COMMANDS) {
    return { ok: false, reason: "too_long" };
  }

  let state = createCareer(input);
  for (const command of commands) {
    if (!isCommand(command)) return { ok: false, reason: "illegal" };
    const next = dispatch(state, command);
    if (!next.applied) return { ok: false, reason: "illegal" };
    state = next.state;
  }

  return { ok: true, state, report: calculateLegacy(state) };
}

function isCommand(value: Command): boolean {
  if (value.type === "SIMULATE_NEXT" || value.type === "RETIRE") return true;
  return value.type === "CHOOSE" && typeof value.optionId === "string" && value.optionId.length > 0;
}
