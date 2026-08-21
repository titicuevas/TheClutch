import type { Position } from "./state/types";

/** GAME_DESIGN §12: país en castellano, no el id. */
export const NATION_LABEL: Record<string, string> = {
  ES: "España",
  FR: "Francia",
  US: "USA",
  RS: "Serbia",
  AR: "Argentina",
  LT: "Lituania",
  GR: "Grecia",
  DE: "Alemania",
};

export const POSITION_LABEL: Record<Position, string> = {
  PG: "Base",
  SG: "Escolta",
  SF: "Alero",
  PF: "Ala-pívot",
  C: "Pívot",
};

/** GAME_DESIGN §12. Préstamos de basket se quedan. */
export const BADGE_LABEL: Record<string, string> = {
  clutch: "Clutch",
  sharpshooter: "Tirador",
  floor_general: "Director",
  lockdown: "Lockdown",
  microwave: "Microwave",
  rim_protector: "Protector",
  franchise_player: "Franquicia",
};

export function nationLabel(id: string): string {
  return NATION_LABEL[id] ?? id;
}

export function positionLabel(id: Position | string): string {
  return POSITION_LABEL[id as Position] ?? id;
}

export function badgeLabel(id: string): string {
  return BADGE_LABEL[id] ?? id;
}

/** COMPETITIONS §8. Torneo de selección, no el continental de club. */
export const TOURNAMENT_LABEL: Record<string, string> = {
  continental: "Continental",
  world: "Mundial",
  olympics: "Juegos",
};

export const NATIONAL_RESULT: Record<string, string> = {
  groups: "Fase de grupos",
  out: "Eliminado",
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
};
