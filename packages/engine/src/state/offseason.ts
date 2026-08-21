import { createRng } from "../rng/index";
import type { Rng } from "../rng/index";
import { pickOffseasonDecision } from "../decisions/pick";
import { maybeGraduate } from "../decisions/resolve";
import { hydrateCareer, retireDecision, shouldForceRetire, shouldOfferRetire } from "./createCareer";
import type { CareerState, DecisionKind, PendingDecision } from "./types";

const STRUCTURAL: ReadonlySet<DecisionKind> = new Set(["path", "training", "draft", "contract"]);

export function planOffseason(state: CareerState): {
  rng: Rng;
  ready: CareerState;
  decision: PendingDecision | null;
} {
  const rng = createRng(`${state.meta.runSeed}:career:${state.world.year}`);
  const ready = maybeGraduate(state, rng.fork("graduate"));
  const decision = pickOffseasonDecision(ready, rng.fork("pick"));
  return { rng, ready, decision };
}

/** Título del corte estructural que abriría SIMULATE_NEXT. No adelanta giros esporádicos. */
export function structuralCue(state: CareerState): string | undefined {
  state = hydrateCareer(state);
  if (state.retired || state.pendingDecision || state.awaitingRecap || state.seasonInProgress) return undefined;
  if (shouldForceRetire(state)) return "Cerrar carrera";
  if (shouldOfferRetire(state)) return retireDecision(state).title;
  const { decision } = planOffseason(state);
  if (decision && STRUCTURAL.has(decision.kind)) return decision.title;
  return undefined;
}
