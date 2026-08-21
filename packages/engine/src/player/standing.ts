import type { ClubStanding, Player } from "../state/types";

/** D-23. Misma cota que el chip de la carta. */
export const CLUB_LOVED_HEAT = 72;
export const CLUB_COLD_HEAT = 42;

export function clubHeat(player: Player): number {
  return (player.morale + player.coachRelation + player.teammateRelation) / 3;
}

export function clubStandingOf(player: Player): ClubStanding {
  const heat = clubHeat(player);
  if (heat >= CLUB_LOVED_HEAT) return "loved";
  if (heat < CLUB_COLD_HEAT) return "cold";
  return "ok";
}
