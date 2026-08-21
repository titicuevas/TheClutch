import { calculateOverall } from "../player/overall";
import { minutesBandForRole } from "../player/roles";
import { clubStandingOf } from "../player/standing";
import { hydrateCareer } from "./createCareer";
import { structuralCue } from "./offseason";
import { collectClubStints } from "./stints";
import { recapHeadline } from "../simulation/recap";
import { netEarnings } from "../constants";
import type { AttributeKey, CareerViewModel, CareerState, Personality, RecapBeat, SeasonRecord, Temperament } from "./types";

const SIGNATURE: Record<string, AttributeKey[]> = {
  sharpshooter: ["threePoint", "midRange", "freeThrow"],
  playmaker: ["passing", "ballHandling", "basketballIQ"],
  slasher: ["finishing", "speed", "ballHandling"],
  two_way: ["perimeterDefense", "interiorDefense", "stamina"],
  defensive_specialist: ["perimeterDefense", "interiorDefense", "rebounding"],
  stretch_big: ["threePoint", "rebounding", "finishing"],
  rim_protector: ["interiorDefense", "rebounding", "strength"],
  inside_scorer: ["finishing", "strength", "midRange"],
  all_around: ["basketballIQ", "finishing", "perimeterDefense"],
};

function potentialBand(potential: number): CareerViewModel["potentialBand"] {
  if (potential >= 88) return "star";
  if (potential >= 80) return "starter";
  if (potential >= 72) return "role";
  return "fringe";
}

export function getViewModel(state: CareerState): CareerViewModel {
  state = hydrateCareer(state);
  const { player } = state;
  const keys = SIGNATURE[player.archetype] ?? ["finishing", "passing", "rebounding"];
  const signature = Object.fromEntries(keys.map((k) => [k, player.attributes[k]]));
  const minutes = minutesBandForRole(player.role);
  const recap = state.awaitingRecap ? state.history.at(-1) : undefined;

  return {
    name: [player.firstName, player.lastName].filter(Boolean).join(" "),
    nationality: player.nationality,
    handed: player.handed,
    age: player.age,
    heightCm: player.heightCm,
    position: player.position,
    archetype: player.archetype,
    overall: calculateOverall(player.attributes, player.position, player.archetype),
    role: player.role,
    minutesMin: minutes.min,
    minutesMax: minutes.max,
    teamName: state.world.team.name,
    teamId: state.world.team.id,
    competitionId: state.world.team.competitionId,
    contractYearsLeft: state.world.contract.yearsLeft,
    contractSalary: state.world.contract.salary,
    tradeProtection: state.world.contract.tradeProtection === "full" ? "full" : "none",
    careerEarnings: netEarnings(
      state.history.map((season) => season.salary ?? 0),
      player.spent,
    ),
    year: state.world.year,
    clubStanding: clubStandingOf(player),
    rival: {
      name: `${state.world.rival.firstName} ${state.world.rival.lastName}`,
      teamId: state.world.rival.team.id,
      teamName: state.world.rival.team.name,
      pts: state.world.rival.lastPts,
      blk: state.world.rival.lastBlk,
      awards: state.world.rival.lastAwards,
    },
    clubStints: collectClubStints(state.history),
    potentialBand: potentialBand(player.potential),
    signature,
    lastSeason: state.history.at(-1),
    retired: state.retired,
    morale: player.morale,
    fatigue: player.fatigue,
    form: player.form,
    temperament: temperamentOf(player.personality),
    decision: state.pendingDecision,
    upcomingCue: structuralCue(state),
    badges: player.badges,
    ...(recap
      ? {
          recap,
          recapNote: recapNote(recap),
          recapBeat: recapBeat(recap),
          recapGrade: recap.grade,
          recapHeadline: recapHeadline(recap, recap.grade),
        }
      : {}),
    ...(state.seasonInProgress
      ? {
          midseason: {
            games: state.seasonInProgress.first.games,
            role: state.seasonInProgress.first.role,
            teamName: state.seasonInProgress.first.teamName,
            teamId: state.seasonInProgress.first.teamId,
            minutes: state.seasonInProgress.first.stats.minutes,
            pts: state.seasonInProgress.first.stats.pts,
            ast: state.seasonInProgress.first.stats.ast,
            reb: state.seasonInProgress.first.stats.reb,
            injury: state.seasonInProgress.first.injury,
          },
        }
      : {}),
  };
}

function recapBeat(season: SeasonRecord): RecapBeat | undefined {
  if (season.playoff === "champ" || season.titles.includes("Continental")) return "champ";
  if (season.awards.includes("MVP") || season.awards.includes("CMVP")) return "mvp";
  if (season.national?.result === "gold") return "gold";
  if (season.draft && !season.draft.undrafted && (season.draft.band === "top_3" || season.draft.band === "lottery")) {
    return "draft";
  }
  if (season.awards.some((a) => a === "DPOY" || a === "FMVP" || a === "CFMVP" || a === "ROY" || a === "MIP" || a === "POTY")) {
    return "award";
  }
  return undefined;
}

function recapNote(season: NonNullable<CareerViewModel["recap"]>): string | undefined {
  const choice = season.choices.at(-1);
  if (choice && (choice.kind === "event" || choice.kind === "trade")) {
    return `Elegiste: ${choice.optionLabel}. El resto del año salió de ahí.`;
  }
  return undefined;
}

function temperamentOf(personality: Personality): Temperament {
  const traits: Array<[Temperament, number]> = [
    ["loyal", personality.loyalty],
    ["ego", personality.ego],
    ["ambitious", personality.ambition],
    ["pro", personality.professionalism],
    ["volatile", personality.volatility],
  ];
  traits.sort((a, b) => b[1] - a[1]);
  const top = traits[0]!;
  if (top[1] >= 72) return top[0];
  return "competitor";
}
