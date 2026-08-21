import { createRng } from "../rng/index";
import { finishSeason, startSeason } from "../simulation/season";
import { pickOffseasonDecision } from "../decisions/pick";
import { maybeGraduate, resolveDecision } from "../decisions/resolve";
import { hydrateCareer, retireDecision, shouldForceRetire, shouldOfferRetire } from "./createCareer";
import { planOffseason } from "./offseason";
import type { CareerState, Command, DispatchResult } from "./types";

type ApplyResult = { state: CareerState; log: string[] };

export function dispatch(state: CareerState, command: Command): DispatchResult {
  const ready = hydrateCareer(state);
  const result = apply(ready, command);
  if (result.state === ready) return { ...result, applied: false };
  return { state: appendCommand(result.state, command), log: result.log, applied: true };
}

function appendCommand(state: CareerState, command: Command): CareerState {
  return {
    ...state,
    meta: { ...state.meta, commands: [...(state.meta.commands ?? []), command] },
  };
}

function apply(state: CareerState, command: Command): ApplyResult {
  if (state.retired && !(command.type === "SIMULATE_NEXT" && state.awaitingRecap)) {
    return { state, log: ["Career already retired"] };
  }

  switch (command.type) {
    case "RETIRE":
      return {
        state: {
          ...state,
          retired: true,
          pendingDecision: null,
          seasonInProgress: null,
          awaitingRecap: false,
        },
        log: ["Retired"],
      };

    case "CHOOSE": {
      if (!state.pendingDecision) {
        return { state, log: ["No decision pending"] };
      }
      if (!state.pendingDecision.options.some((item) => item.id === command.optionId)) {
        return { state, log: ["Unknown option"] };
      }
      const kind = state.pendingDecision.kind;
      const rng = createRng(`${state.meta.runSeed}:choose:${state.world.year}:${command.optionId}`);
      const logged = kind === "retire" ? state : logChoice(state, command.optionId);
      const resolved = resolveDecision(logged, command.optionId, rng);
      if (resolved.retired) {
        return { state: resolved, log: ["Retired"] };
      }
      if (kind === "retire") {
        return { state: resolved, log: ["Chose"] };
      }
      if (kind === "path") {
        const next = maybeGraduate(resolved, rng.fork("graduate"));
        const follow = pickOffseasonDecision(next, rng.fork("pick"));
        if (follow) {
          return { state: { ...next, pendingDecision: follow }, log: ["Chose", `Decision: ${follow.id}`] };
        }
        return wrapPlayed(startSeason(next, rng.fork("after-choice")), ["Chose"]);
      }
      if (shouldForceRetire(resolved) && !resolved.seasonInProgress) {
        return { state: { ...resolved, retired: true }, log: ["Chose", "Forced retirement"] };
      }
      const played = resolved.seasonInProgress
        ? finishSeason(resolved, rng.fork("resume"))
        : startSeason(resolved, rng.fork("after-choice"));
      return wrapPlayed(played, ["Chose"]);
    }

    case "SIMULATE_NEXT": {
      if (state.awaitingRecap) {
        return { state: { ...state, awaitingRecap: false }, log: ["Recap dismissed"] };
      }
      if (state.pendingDecision) {
        return { state, log: ["Decision pending"] };
      }
      if (shouldForceRetire(state)) {
        return { state: { ...state, retired: true }, log: ["Forced retirement"] };
      }
      if (state.seasonInProgress) {
        const played = finishSeason(
          state,
          createRng(`${state.meta.runSeed}:career:${state.world.year}:resume`),
        );
        return wrapPlayed(played, []);
      }
      if (shouldOfferRetire(state)) {
        return {
          state: {
            ...state,
            player: {
              ...state.player,
              flags: { ...state.player.flags, retirePromptedYear: state.world.year },
            },
            pendingDecision: retireDecision(state),
          },
          log: ["Decision: retire"],
        };
      }
      const { rng, ready, decision } = planOffseason(state);
      if (decision) {
        return { state: { ...ready, pendingDecision: decision }, log: [`Decision: ${decision.id}`] };
      }
      const next = startSeason(ready, rng.fork("season"));
      return wrapPlayed(next, []);
    }
  }
}

function wrapPlayed(state: CareerState, prefix: string[]): ApplyResult {
  if (state.pendingDecision) {
    return { state, log: [...prefix, `Decision: ${state.pendingDecision.id}`] };
  }
  return { state, log: [...prefix, `Season ${state.world.year - 1} complete`] };
}

function logChoice(state: CareerState, optionId: string): CareerState {
  const pending = state.pendingDecision;
  if (!pending) return state;
  const option = pending.options.find((item) => item.id === optionId);
  return {
    ...state,
    world: {
      ...state.world,
      yearLog: [
        ...(state.world.yearLog ?? []),
        {
          kind: pending.kind,
          title: pending.title,
          optionLabel: option?.label ?? optionId,
        },
      ],
    },
  };
}
