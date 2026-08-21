export {
  AWARD_LABEL,
  TITLE_LABEL,
  DRAFT_BAND_LABEL as DRAFT_BAND,
  NATION_LABEL,
  POSITION_LABEL,
  BADGE_LABEL,
  TOURNAMENT_LABEL,
  NATIONAL_RESULT,
} from "@theclutch/engine";

export const KIND_LABEL: Record<string, string> = {
  training: "Entrenamiento",
  event: "Giro",
  draft: "Draft",
  contract: "Mercado",
  trade: "Destino",
  retire: "Retiro",
  path: "Ruta",
};

export const CLUB_STANDING: Record<string, string> = {
  loved: "El club te quiere",
  ok: "Vestuario",
  cold: "El club te mira",
};

export const TEMPERAMENT_LABEL: Record<string, string> = {
  loyal: "Leal",
  ego: "Ego",
  ambitious: "Ambicioso",
  pro: "Profesional",
  volatile: "Volátil",
  competitor: "Competidor",
};

export const HAND_LABEL: Record<string, string> = {
  left: "Zurdo",
  right: "Diestro",
};

export const ROLE_LABEL: Record<string, string> = {
  prospect: "Prospecto",
  bench: "Banco",
  rotation: "Rotación",
  sixth_man: "Sexto hombre",
  starter: "Titular",
  star: "Estrella",
  franchise: "Franquicia",
};

export const ARCHETYPE_LABEL: Record<string, string> = {
  sharpshooter: "Tirador",
  playmaker: "Creador",
  slasher: "Penetrador",
  two_way: "A ambos lados",
  defensive_specialist: "Defensivo",
  stretch_big: "Stretch",
  rim_protector: "Protector",
  inside_scorer: "Interior",
  all_around: "Completo",
};

export const SCOUT_LABEL = {
  fringe: "Techo bajo",
  role: "Jugador de rol",
  starter: "Techo de titular",
  star: "Techo de estrella",
} as const;

export const ATTR_LABEL: Record<string, string> = {
  finishing: "Finalización",
  midRange: "Media",
  threePoint: "Tres",
  freeThrow: "TL",
  passing: "Pase",
  ballHandling: "Bote",
  perimeterDefense: "Def. perímetro",
  interiorDefense: "Def. interior",
  rebounding: "Rebote",
  speed: "Velocidad",
  strength: "Fuerza",
  stamina: "Fondo",
  basketballIQ: "IQ",
  clutch: "Clutch",
};

export const LEGACY_BAND: Record<string, string> = {
  local_legend: "Leyenda local",
  national_star: "Estrella nacional",
  continental: "Continental",
  all_time: "Histórico",
};

export const PLAYOFF_LABEL: Record<string, string> = {
  missed: "Sin playoffs",
  out: "Playoffs",
  finals: "Finales",
  champ: "Campeón",
};

export const COMPETITION_LABEL: Record<string, string> = {
  national_league: "Liga nacional",
  american_league: "Liga americana",
  continental_competition: "Continental",
  college_circuit: "Circuito universitario",
  club_academy: "Academia",
};

export const INJURY_TYPE: Record<string, string> = {
  knee: "Rodilla",
  ankle: "Tobillo",
  finger: "Dedo",
  back: "Espalda",
  thigh: "Muslo",
};

export const INJURY_SEVERITY: Record<string, string> = {
  minor: "leve",
  moderate: "seria",
};

export function injuryLine(
  injury: { type: string; severity: string; gamesMissed?: number },
  opts?: { games?: boolean },
): string {
  const part = INJURY_TYPE[injury.type] ?? injury.type;
  const sev = INJURY_SEVERITY[injury.severity] ?? injury.severity;
  const base = `${part} ${sev}`;
  if (opts?.games && injury.gamesMissed != null) {
    return `${base} · ${injury.gamesMissed} PJ fuera`;
  }
  return base;
}
