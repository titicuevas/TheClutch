import type { CareerState } from "../state/types";

/** D-05. Universidad: one-and-done a los 19. Club: un año más en casa. */
const WINDOW = {
  college: { minAge: 19, maxAge: 20, minSeasons: 1 },
  club: { minAge: 20, maxAge: 21, minSeasons: 2 },
} as const;

function ruleFor(state: CareerState) {
  return state.player.flags.path === "club" ? WINDOW.club : WINDOW.college;
}

export function canDeclareDraft(state: CareerState): boolean {
  const { player } = state;
  if (player.flags.drafted || player.flags.draftClosed) return false;
  const rule = ruleFor(state);
  if (state.history.length < rule.minSeasons) return false;
  return player.age >= rule.minAge && player.age <= rule.maxAge;
}

/** Esperar en el techo de la ventana cierra el draft. */
export function waitClosesDraft(state: CareerState): boolean {
  if (!canDeclareDraft(state)) return false;
  return state.player.age >= ruleFor(state).maxAge;
}

/** La ventana ya pasó: o te draftearon, o sales del limbo. */
export function pastDraftWindow(state: CareerState): boolean {
  const { player } = state;
  if (player.flags.drafted || player.flags.draftClosed) return false;
  return player.age > ruleFor(state).maxAge;
}
