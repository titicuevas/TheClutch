import { mapAttributes } from "../player/attributes";
import { calculateOverall } from "../player/overall";
import { generateRival, generateTeam } from "../player/generate";
import { attachStaff } from "../player/locker";
import { isFormation, LIFESTYLE_SPEND } from "../constants";
import { clubStandingOf } from "../player/standing";
import { pastDraftWindow, waitClosesDraft } from "./eligibility";
import type { Rng } from "../rng/index";
import type { AttributeKey, CareerState, Player, Team, TradeProtection } from "../state/types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function markFired(player: Player, id: string): Player {
  if (player.flags.firedOnce.includes(id)) return player;
  return { ...player, flags: { ...player.flags, firedOnce: [...player.flags.firedOnce, id] } };
}

function bump(
  player: Player,
  keys: AttributeKey[],
  amount: number,
): Player {
  return {
    ...player,
    attributes: mapAttributes(player.attributes, (key, value) =>
      keys.includes(key) ? value + amount : value,
    ),
  };
}

export function resolveDecision(
  state: CareerState,
  optionId: string,
  rng: Rng,
): CareerState {
  const decision = state.pendingDecision;
  if (!decision) return state;

  const apply = resolvers[`${decision.id}:${optionId}`] ?? resolvers[`${decision.kind}:${optionId}`];
  if (!apply) return { ...state, pendingDecision: null };

  return { ...apply(state, rng), pendingDecision: null };
}

type Apply = (state: CareerState, rng: Rng) => CareerState;

const resolvers: Record<string, Apply> = {
  "training:shooting": (s) => train(s, ["threePoint", "midRange", "freeThrow"], 3),
  "training:playmaking": (s) => train(s, ["passing", "ballHandling", "basketballIQ"], 3),
  "training:defense": (s) => train(s, ["perimeterDefense", "interiorDefense", "stamina"], 3),
  "training:body": (s) => train(s, ["strength", "stamina", "finishing"], 3),

  "draft:declare": declareDraft,
  "draft:wait": waitDraft,

  "path:club": (s, rng) => takePath(s, rng, "club"),
  "path:college": (s, rng) => takePath(s, rng, "college"),

  "contract:stay": (s, rng) =>
    resign(
      s,
      s.pendingDecision?.data?.stayTeam ?? s.world.team,
      s.pendingDecision?.data?.stayOffer?.years ?? 3,
      s.pendingDecision?.data?.stayOffer?.roleBias ?? 1,
      s.pendingDecision?.data?.stayOffer?.salary,
      s.pendingDecision?.data?.stayOffer?.protection ?? "full",
      rng,
    ),
  "contract:leave": (s, rng) =>
    resign(
      s,
      s.pendingDecision?.data?.leaveTeam ?? generateTeam(rng, s.player.nationality),
      s.pendingDecision?.data?.maxOffer?.years ?? 4,
      s.pendingDecision?.data?.maxOffer?.roleBias ?? 0,
      s.pendingDecision?.data?.maxOffer?.salary,
      s.pendingDecision?.data?.maxOffer?.protection ?? "none",
      rng,
    ),
  "contract:ring": (s, rng) =>
    resign(
      s,
      s.pendingDecision?.data?.ringTeam ?? generateTeam(rng.fork("ring"), s.player.nationality),
      s.pendingDecision?.data?.ringOffer?.years ?? 2,
      s.pendingDecision?.data?.ringOffer?.roleBias ?? -1,
      s.pendingDecision?.data?.ringOffer?.salary,
      s.pendingDecision?.data?.ringOffer?.protection ?? "none",
      rng,
    ),

  "unhappy_minutes:talk": (s, rng) => {
    const ok = rng.chance(0.55 + s.player.coachRelation / 400);
    const player = markFired(
      {
        ...s.player,
        coachRelation: clamp(s.player.coachRelation + (ok ? 8 : -10), 10, 95),
        morale: clamp(s.player.morale + (ok ? 10 : -8), 10, 95),
        roleBias: clamp(s.player.roleBias + (ok ? 1 : -1), -2, 2),
      },
      "unhappy_minutes",
    );
    return { ...s, player };
  },
  "unhappy_minutes:work": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        workEthic: clamp(s.player.workEthic + 6, 40, 99),
        morale: clamp(s.player.morale + 4, 10, 95),
      },
      "unhappy_minutes",
    ),
  }),
  "unhappy_minutes:trade": (s, rng) => {
    const team = generateTeam(rng.fork("trade"), s.player.nationality, s.world.team.competitionId);
    return {
      ...s,
      world: attachStaff(s.world, team, rng, s.player.position),
      player: markFired(
        {
          ...s.player,
          flags: { ...s.player.flags, tradeRequest: false },
          morale: clamp(s.player.morale + 6, 10, 95),
          coachRelation: 48,
          reputation: clamp(s.player.reputation - 4, 10, 95),
          roleBias: 0,
        },
        "unhappy_minutes",
      ),
    };
  },

  "early_return:rush": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        durability: clamp(s.player.durability - 6, 40, 99),
        form: clamp(s.player.form + 8, 20, 95),
        fatigue: clamp(s.player.fatigue + 15, 0, 95),
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
      },
      "early_return",
    ),
  }),
  "early_return:wait": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        durability: clamp(s.player.durability + 3, 40, 99),
        form: clamp(s.player.form - 4, 20, 95),
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        morale: clamp(s.player.morale - 3, 10, 95),
      },
      "early_return",
    ),
  }),

  "contender_call:go": (s, rng) => {
    const team = s.pendingDecision?.data?.leaveTeam;
    if (!team) return s;
    return {
      ...s,
      world: {
        ...attachStaff(s.world, team, rng, s.player.position),
        contract: { yearsLeft: 2, salary: 12, tradeProtection: "none" },
      },
      player: markFired(
        {
          ...s.player,
          roleBias: clamp(s.player.roleBias - 1, -2, 2),
          morale: clamp(s.player.morale + 5, 10, 95),
        },
        "contender_call",
      ),
    };
  },
  "contender_call:stay": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        morale: clamp(s.player.morale + 3, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 4, 20, 95),
        },
      },
      "contender_call",
    ),
  }),

  "award_snub:chip": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        confidence: clamp(s.player.confidence + 10, 20, 95),
        morale: clamp(s.player.morale + 4, 10, 95),
      },
      "award_snub",
    ),
  }),
  "award_snub:media": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        reputation: clamp(s.player.reputation + 6, 10, 95),
        coachRelation: clamp(s.player.coachRelation - 6, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 6, 20, 95),
        },
      },
      "award_snub",
    ),
  }),

  "finals_hangover:run": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        morale: clamp(s.player.morale + 8, 10, 95),
        coachRelation: clamp(s.player.coachRelation + 6, 10, 95),
        teammateRelation: clamp(s.player.teammateRelation + 6, 10, 95),
        fatigue: clamp(s.player.fatigue - 6, 0, 95),
        personality: {
          ...s.player.personality,
          loyalty: clamp(s.player.personality.loyalty + 4, 20, 95),
        },
      },
      "finals_hangover",
    ),
  }),
  "finals_hangover:leave": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        coachRelation: clamp(s.player.coachRelation - 8, 10, 95),
        teammateRelation: clamp(s.player.teammateRelation - 6, 10, 95),
        flags: { ...s.player.flags, tradeRequest: true },
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 6, 20, 95),
          ambition: clamp(s.player.personality.ambition + 4, 20, 95),
        },
      },
      "finals_hangover",
    ),
  }),

  "coach_trust:lean": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        coachRelation: clamp(s.player.coachRelation + 4, 10, 95),
        confidence: clamp(s.player.confidence + 6, 20, 95),
      },
      "coach_trust",
    ),
  }),
  "coach_trust:humble": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        coachRelation: clamp(s.player.coachRelation + 8, 10, 95),
        teammateRelation: clamp(s.player.teammateRelation + 6, 10, 95),
        morale: clamp(s.player.morale + 3, 10, 95),
      },
      "coach_trust",
    ),
  }),

  "coach_clash:patch": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        coachRelation: clamp(s.player.coachRelation + 10, 10, 95),
        workEthic: clamp(s.player.workEthic + 4, 40, 99),
      },
      "coach_clash",
    ),
  }),
  "coach_clash:clash": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        coachRelation: clamp(s.player.coachRelation - 10, 10, 95),
        morale: clamp(s.player.morale - 4, 10, 95),
        fatigue: clamp(s.player.fatigue + 6, 0, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 5, 20, 95),
        },
      },
      "coach_clash",
    ),
  }),

  "locker_ice:glue": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        teammateRelation: clamp(s.player.teammateRelation + 10, 10, 95),
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 4, 20, 95),
        },
      },
      "locker_ice",
    ),
  }),
  "locker_ice:take": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        teammateRelation: clamp(s.player.teammateRelation - 10, 10, 95),
        morale: clamp(s.player.morale - 3, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 5, 20, 95),
        },
      },
      "locker_ice",
    ),
  }),

  "locker_voice:carry": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        fatigue: clamp(s.player.fatigue + 8, 0, 95),
        teammateRelation: clamp(s.player.teammateRelation + 10, 10, 95),
        reputation: clamp(s.player.reputation + 4, 10, 95),
        morale: clamp(s.player.morale + 3, 10, 95),
      },
      "locker_voice",
    ),
  }),
  "locker_voice:score": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        teammateRelation: clamp(s.player.teammateRelation - 8, 10, 95),
        reputation: clamp(s.player.reputation - 3, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 4, 20, 95),
        },
      },
      "locker_voice",
    ),
  }),

  "vet_minutes:cede": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        teammateRelation: clamp(s.player.teammateRelation + 8, 10, 95),
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 5, 20, 95),
        },
      },
      "vet_minutes",
    ),
  }),
  "vet_minutes:hold": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        teammateRelation: clamp(s.player.teammateRelation - 6, 10, 95),
        fatigue: clamp(s.player.fatigue + 6, 0, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 5, 20, 95),
        },
      },
      "vet_minutes",
    ),
  }),

  "role_slide:accept": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        teammateRelation: clamp(s.player.teammateRelation + 6, 10, 95),
        coachRelation: clamp(s.player.coachRelation + 4, 10, 95),
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 5, 20, 95),
        },
      },
      "role_slide",
    ),
  }),
  "role_slide:fight": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        coachRelation: clamp(s.player.coachRelation - 8, 10, 95),
        fatigue: clamp(s.player.fatigue + 8, 0, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 6, 20, 95),
        },
      },
      "role_slide",
    ),
  }),

  "media_overrate:buy": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        confidence: clamp(s.player.confidence + 8, 20, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 7, 20, 95),
        },
      },
      "media_overrate",
    ),
  }),
  "media_overrate:ground": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        workEthic: clamp(s.player.workEthic + 5, 40, 99),
        confidence: clamp(s.player.confidence - 2, 20, 95),
      },
      "media_overrate",
    ),
  }),

  "media_heat:feed": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        fatigue: clamp(s.player.fatigue + 8, 0, 95),
        reputation: clamp(s.player.reputation + 5, 10, 95),
        morale: clamp(s.player.morale + 4, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 7, 20, 95),
        },
      },
      "media_heat",
    ),
  }),
  "media_heat:mute": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        teammateRelation: clamp(s.player.teammateRelation + 5, 10, 95),
        coachRelation: clamp(s.player.coachRelation + 3, 10, 95),
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 6, 20, 95),
          ego: clamp(s.player.personality.ego - 4, 20, 95),
        },
      },
      "media_heat",
    ),
  }),

  "teammate_star_clash:share": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        teammateRelation: clamp(s.player.teammateRelation + 10, 10, 95),
        morale: clamp(s.player.morale + 2, 10, 95),
      },
      "teammate_star_clash",
    ),
  }),
  "teammate_star_clash:demand": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        teammateRelation: clamp(s.player.teammateRelation - 12, 10, 95),
        coachRelation: clamp(s.player.coachRelation - 6, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 4, 20, 95),
        },
      },
      "teammate_star_clash",
    ),
  }),

  "national_snub:chip": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        form: clamp(s.player.form + 8, 20, 95),
        confidence: clamp(s.player.confidence + 6, 20, 95),
      },
      "national_snub",
    ),
  }),
  "national_snub:noise": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        reputation: clamp(s.player.reputation + 4, 10, 95),
        morale: clamp(s.player.morale - 4, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 5, 20, 95),
        },
      },
      "national_snub",
    ),
  }),

  "national_duty:go": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        fatigue: clamp(s.player.fatigue + 8, 0, 95),
        reputation: clamp(s.player.reputation + 6, 10, 95),
        morale: clamp(s.player.morale + 4, 10, 95),
      },
      "national_duty",
    ),
  }),
  "national_duty:skip": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        fatigue: clamp(s.player.fatigue - 10, 0, 95),
        reputation: clamp(s.player.reputation - 8, 10, 95),
        flags: { ...s.player.flags, skipNational: true },
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 4, 20, 95),
        },
      },
      "national_duty",
    ),
  }),

  "traded_involuntary:accept": (s, rng) => applyInvoluntaryTrade(s, rng, "accept"),
  "traded_involuntary:fight": (s, rng) => applyInvoluntaryTrade(s, rng, "fight"),

  "hometown_discount:stay": (s, rng) => hometownStay(s, rng),
  "hometown_discount:leave": (s, rng) => hometownLeave(s, rng),

  "lockout_fatigue:rest": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        fatigue: clamp(s.player.fatigue - 22, 0, 95),
        durability: clamp(s.player.durability + 3, 40, 99),
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        morale: clamp(s.player.morale - 3, 10, 95),
      },
      "lockout_fatigue",
    ),
  }),
  "lockout_fatigue:grind": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        fatigue: clamp(s.player.fatigue + 12, 0, 95),
        durability: clamp(s.player.durability - 5, 40, 99),
        form: clamp(s.player.form + 6, 20, 95),
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
      },
      "lockout_fatigue",
    ),
  }),

  "lifestyle_pressure:step_back": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        fatigue: clamp(s.player.fatigue - 16, 0, 95),
        morale: clamp(s.player.morale + 10, 10, 95),
        form: clamp(s.player.form + 4, 20, 95),
      },
      "lifestyle_pressure",
    ),
  }),
  "lifestyle_pressure:push_through": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        fatigue: clamp(s.player.fatigue + 14, 0, 95),
        morale: clamp(s.player.morale - 6, 10, 95),
        form: clamp(s.player.form - 5, 20, 95),
        durability: clamp(s.player.durability - 3, 40, 99),
      },
      "lifestyle_pressure",
    ),
  }),

  "rival_heat:hunt": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        fatigue: clamp(s.player.fatigue + 10, 0, 95),
        form: clamp(s.player.form + 6, 20, 95),
        confidence: clamp(s.player.confidence + 5, 20, 95),
      },
      "rival_heat",
    ),
  }),
  "rival_heat:ignore": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        morale: clamp(s.player.morale + 4, 10, 95),
        teammateRelation: clamp(s.player.teammateRelation + 6, 10, 95),
        confidence: clamp(s.player.confidence - 3, 20, 95),
      },
      "rival_heat",
    ),
  }),

  "home_crowd:soak": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        fatigue: clamp(s.player.fatigue + 8, 0, 95),
        morale: clamp(s.player.morale + 4, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 6, 20, 95),
        },
      },
      "home_crowd",
    ),
  }),
  "home_crowd:humble": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        morale: clamp(s.player.morale + 3, 10, 95),
        coachRelation: clamp(s.player.coachRelation + 4, 10, 95),
        teammateRelation: clamp(s.player.teammateRelation + 6, 10, 95),
        personality: {
          ...s.player.personality,
          loyalty: clamp(s.player.personality.loyalty + 6, 20, 95),
        },
      },
      "home_crowd",
    ),
  }),
  "home_crowd:win": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        fatigue: clamp(s.player.fatigue + 10, 0, 95),
        workEthic: clamp(s.player.workEthic + 6, 40, 99),
        morale: clamp(s.player.morale + 6, 10, 95),
      },
      "home_crowd",
    ),
  }),
  "home_crowd:out": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        morale: clamp(s.player.morale - 4, 10, 95),
        coachRelation: clamp(s.player.coachRelation - 8, 10, 95),
        reputation: clamp(s.player.reputation - 4, 10, 95),
        flags: { ...s.player.flags, tradeRequest: true },
      },
      "home_crowd",
    ),
  }),

  "agent_conflict:demand": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        flags: { ...s.player.flags, tradeRequest: true },
        morale: clamp(s.player.morale + 5, 10, 95),
        coachRelation: clamp(s.player.coachRelation - 8, 10, 95),
        reputation: clamp(s.player.reputation + 3, 10, 95),
      },
      "agent_conflict",
    ),
  }),
  "agent_conflict:keep": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 6, 20, 95),
        },
        morale: clamp(s.player.morale - 3, 10, 95),
        coachRelation: clamp(s.player.coachRelation + 4, 10, 95),
      },
      "agent_conflict",
    ),
  }),

  "work_summer:grind": (s) => ({
    ...s,
    player: markFired(
      bump(
        {
          ...s.player,
          fatigue: clamp(s.player.fatigue + 10, 0, 95),
          workEthic: clamp(s.player.workEthic + 3, 40, 99),
        },
        ["strength", "stamina", "threePoint"],
        2,
      ),
      "work_summer",
    ),
  }),
  "work_summer:rest": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        fatigue: clamp(s.player.fatigue - 12, 0, 95),
        form: clamp(s.player.form + 4, 20, 95),
        durability: clamp(s.player.durability + 2, 40, 99),
      },
      "work_summer",
    ),
  }),

  "go_home:go": (s, rng) => {
    const ovr = calculateOverall(s.player.attributes, s.player.position, s.player.archetype);
    const team =
      s.pendingDecision?.data?.leaveTeam ??
      generateTeam(rng.fork("go-home"), s.player.nationality, "national_league");
    return {
      ...s,
      world: {
        ...attachStaff(s.world, team, rng, s.player.position),
        rival: generateRival(rng.fork("go-home-rival"), s.player, team),
        contract: {
          yearsLeft: 3,
          salary: Math.max(8, Math.round(ovr * 0.22)),
          tradeProtection: "none",
        },
      },
      player: markFired(
        {
          ...s.player,
          roleBias: clamp(s.player.roleBias + 1, -2, 2),
          morale: clamp(s.player.morale + 8, 10, 95),
          personality: {
            ...s.player.personality,
            loyalty: clamp(s.player.personality.loyalty + 8, 20, 95),
            ego: clamp(s.player.personality.ego - 4, 20, 95),
          },
        },
        "go_home",
      ),
    };
  },
  "go_home:stay": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        morale: clamp(s.player.morale + 2, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 5, 20, 95),
          loyalty: clamp(s.player.personality.loyalty - 6, 20, 95),
        },
      },
      "go_home",
    ),
  }),

  "leaving_home:cut": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        morale: clamp(s.player.morale + 4, 10, 95),
        coachRelation: clamp(s.player.coachRelation + 8, 10, 95),
        teammateRelation: clamp(s.player.teammateRelation + 8, 10, 95),
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 6, 20, 95),
          loyalty: clamp(s.player.personality.loyalty - 4, 20, 95),
        },
      },
      "leaving_home",
    ),
  }),
  "leaving_home:linger": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        morale: clamp(s.player.morale - 8, 10, 95),
        coachRelation: clamp(s.player.coachRelation - 10, 10, 95),
        teammateRelation: clamp(s.player.teammateRelation - 8, 10, 95),
        personality: {
          ...s.player.personality,
          loyalty: clamp(s.player.personality.loyalty + 8, 20, 95),
        },
      },
      "leaving_home",
    ),
  }),

  "lifestyle_flex:flex": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        spent: s.player.spent + LIFESTYLE_SPEND,
        fatigue: clamp(s.player.fatigue + 10, 0, 95),
        morale: clamp(s.player.morale + 8, 10, 95),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 7, 20, 95),
        },
      },
      "lifestyle_flex",
    ),
  }),
  "lifestyle_flex:save": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 6, 20, 95),
        },
      },
      "lifestyle_flex",
    ),
  }),

  "play_through:push": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        durability: clamp(s.player.durability - 5, 40, 99),
        fatigue: clamp(s.player.fatigue + 14, 0, 95),
        form: clamp(s.player.form + 6, 20, 95),
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
      },
      "play_through",
    ),
  }),
  "play_through:sit": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        durability: clamp(s.player.durability + 3, 40, 99),
        fatigue: clamp(s.player.fatigue - 10, 0, 95),
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
      },
      "play_through",
    ),
  }),

  "load_manage:save": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        fatigue: clamp(s.player.fatigue - 12, 0, 95),
        durability: clamp(s.player.durability + 3, 40, 99),
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
      },
      "load_manage",
    ),
  }),
  "load_manage:hunt": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        fatigue: clamp(s.player.fatigue + 14, 0, 95),
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        personality: {
          ...s.player.personality,
          ego: clamp(s.player.personality.ego + 5, 20, 95),
        },
      },
      "load_manage",
    ),
  }),

  "sixth_heat:start": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        coachRelation: clamp(s.player.coachRelation - 8, 10, 95),
        fatigue: clamp(s.player.fatigue + 8, 0, 95),
      },
      "sixth_heat",
    ),
  }),
  "sixth_heat:bomb": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        teammateRelation: clamp(s.player.teammateRelation + 8, 10, 95),
        morale: clamp(s.player.morale + 4, 10, 95),
      },
      "sixth_heat",
    ),
  }),

  "deal_year:grind": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        fatigue: clamp(s.player.fatigue + 10, 0, 95),
        morale: clamp(s.player.morale + 4, 10, 95),
      },
      "deal_year",
    ),
  }),
  "deal_year:out": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        flags: { ...s.player.flags, tradeRequest: true },
        morale: clamp(s.player.morale - 4, 10, 95),
        reputation: clamp(s.player.reputation + 2, 10, 95),
      },
      "deal_year",
    ),
  }),

  "playoff_push:hunt": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
        fatigue: clamp(s.player.fatigue + 12, 0, 95),
      },
      "playoff_push",
    ),
  }),
  "playoff_push:save": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        roleBias: clamp(s.player.roleBias - 1, -2, 2),
        fatigue: clamp(s.player.fatigue - 8, 0, 95),
        durability: clamp(s.player.durability + 2, 40, 99),
      },
      "playoff_push",
    ),
  }),

  "captain_c:wear": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        reputation: clamp(s.player.reputation + 10, 10, 95),
        teammateRelation: clamp(s.player.teammateRelation + 8, 10, 95),
        fatigue: clamp(s.player.fatigue + 8, 0, 95),
        roleBias: clamp(s.player.roleBias + 1, -2, 2),
      },
      "captain_c",
    ),
  }),
  "captain_c:pass": (s) => ({
    ...s,
    player: markFired(
      {
        ...s.player,
        teammateRelation: clamp(s.player.teammateRelation + 4, 10, 95),
        reputation: clamp(s.player.reputation - 4, 10, 95),
        personality: {
          ...s.player.personality,
          professionalism: clamp(s.player.personality.professionalism + 5, 20, 95),
        },
      },
      "captain_c",
    ),
  }),

  "retire:one_more": (s) => ({
    ...s,
    player: {
      ...s.player,
      morale: clamp(s.player.morale + 4, 10, 95),
      confidence: clamp(s.player.confidence + 3, 20, 95),
      flags: { ...s.player.flags, retirePromptedYear: s.world.year },
    },
  }),
  "retire:hang": (s) => ({
    ...s,
    retired: true,
  }),
};

function train(state: CareerState, keys: AttributeKey[], amount: number): CareerState {
  return {
    ...state,
    player: bump(state.player, keys, amount),
  };
}

function takePath(state: CareerState, rng: Rng, option: "club" | "college"): CareerState {
  const college = option === "college";
  const picked = college
    ? (state.pendingDecision?.data?.leaveTeam ??
      generateTeam(rng.fork("path-team"), "US", "college_circuit"))
    : (state.pendingDecision?.data?.stayTeam ??
      generateTeam(rng.fork("path-team"), state.player.nationality, "club_academy"));
  return {
    ...state,
    world: {
      ...attachStaff(state.world, picked, rng, state.player.position),
      rival: generateRival(rng.fork("path-rival"), state.player, picked),
      contract: {
        yearsLeft: 3,
        salary: college ? 2 : 6,
        tradeProtection: "none",
      },
    },
    player: {
      ...state.player,
      flags: { ...state.player.flags, path: college ? "college" : "club" },
    },
  };
}

export function maybeGraduate(state: CareerState, rng: Rng): CareerState {
  if (state.player.flags.drafted) return state;
  if (!isFormation(state.world.team.competitionId)) return state;
  if (!state.player.flags.draftClosed && !pastDraftWindow(state)) return state;
  const team = generateTeam(rng.fork("graduate"), state.player.nationality, "national_league");
  return {
    ...state,
    world: {
      ...attachStaff(state.world, team, rng, state.player.position),
      rival: generateRival(rng.fork("graduate-rival"), state.player, team),
      contract: { yearsLeft: 2, salary: 8, tradeProtection: "none" },
    },
    player: {
      ...state.player,
      flags: { ...state.player.flags, draftClosed: true },
    },
  };
}

function waitDraft(state: CareerState): CareerState {
  const close = waitClosesDraft(state);
  return {
    ...state,
    player: {
      ...state.player,
      flags: { ...state.player.flags, draftClosed: close },
      morale: clamp(state.player.morale + (close ? -2 : 3), 10, 95),
    },
  };
}

function declareDraft(state: CareerState, rng: Rng): CareerState {
  const band = state.pendingDecision?.data?.draftBand ?? "undrafted";
  const miss =
    band === "undrafted" ||
    (band === "second_round" && rng.fork("draft-miss").chance(0.35)) ||
    (band === "first_round" && rng.fork("draft-miss").chance(0.08));

  if (miss) {
    const draftResult = { band, undrafted: true as const };
    return maybeGraduate(
      {
        ...state,
        world: { ...state.world, draftResult },
        player: {
          ...state.player,
          flags: { ...state.player.flags, drafted: false, draftClosed: true },
          morale: clamp(state.player.morale - 12, 10, 95),
          reputation: clamp(state.player.reputation - 5, 10, 95),
        },
      },
      rng,
    );
  }

  const team = generateTeam(rng.fork("draft-team"), "US", "american_league");
  const pick = rollDraftPick(band, rng.fork("draft-pick"));
  const salary = band === "top_3" ? 22 : band === "lottery" ? 18 : band === "first_round" ? 14 : 10;
  const bias = band === "top_3" || band === "lottery" ? 1 : 0;
  return {
    ...state,
    world: {
      ...attachStaff(state.world, team, rng, state.player.position),
      contract: { yearsLeft: 3, salary, tradeProtection: "none" },
      draftResult: { band, undrafted: false, pick, teamId: team.id, teamName: team.name },
    },
    player: {
      ...state.player,
      flags: { ...state.player.flags, drafted: true, draftClosed: true },
      roleBias: clamp(state.player.roleBias + bias, -2, 2),
      morale: clamp(state.player.morale + 10, 10, 95),
      reputation: clamp(state.player.reputation + 8, 10, 95),
    },
  };
}

function rollDraftPick(band: string, rng: Rng): number {
  if (band === "top_3") return rng.int(1, 3);
  if (band === "lottery") return rng.int(4, 14);
  if (band === "first_round") return rng.int(15, 30);
  return rng.int(31, 58);
}

function applyInvoluntaryTrade(
  state: CareerState,
  rng: Rng,
  choice: "accept" | "fight",
): CareerState {
  const dest =
    state.pendingDecision?.data?.leaveTeam ??
    generateTeam(rng.fork("trade-fallback"), state.player.nationality, "american_league");

  const kept =
    choice === "fight" &&
    (state.player.role === "starter" || state.player.role === "star") &&
    rng.chance(0.22);

  if (kept) {
    return {
      ...state,
      player: markFired(
        {
          ...state.player,
          morale: clamp(state.player.morale - 8, 10, 95),
          coachRelation: clamp(state.player.coachRelation - 16, 10, 95),
          reputation: clamp(state.player.reputation - 5, 10, 95),
        },
        "traded_involuntary",
      ),
    };
  }

  const hit = choice === "fight" ? 6 : 2;
  return {
    ...state,
    world: {
      ...attachStaff(state.world, dest, rng, state.player.position),
      contract: { ...state.world.contract, tradeProtection: "none" },
    },
    player: markFired(
      {
        ...state.player,
        morale: clamp(state.player.morale - hit, 10, 95),
        coachRelation: 50,
        teammateRelation: 50,
        reputation: clamp(state.player.reputation - (choice === "fight" ? 4 : 0), 10, 95),
        flags: { ...state.player.flags, tradeRequest: false },
      },
      "traded_involuntary",
    ),
  };
}

function hometownStay(state: CareerState, rng: Rng): CareerState {
  const ovr = calculateOverall(
    state.player.attributes,
    state.player.position,
    state.player.archetype,
  );
  const team = state.pendingDecision?.data?.stayTeam ?? state.world.team;
  return {
    ...state,
    world: {
      ...attachStaff(state.world, team, rng, state.player.position),
      contract: {
        yearsLeft: 4,
        salary: Math.max(6, Math.round(ovr * 0.26)),
        tradeProtection: "full",
      },
    },
    player: markFired(
      {
        ...state.player,
        roleBias: clamp(state.player.roleBias + 1, -2, 2),
        morale: clamp(state.player.morale + 6, 10, 95),
        personality: {
          ...state.player.personality,
          loyalty: clamp(state.player.personality.loyalty + 8, 20, 95),
        },
      },
      "hometown_discount",
    ),
  };
}

function hometownLeave(state: CareerState, rng: Rng): CareerState {
  const team =
    state.pendingDecision?.data?.leaveTeam ?? generateTeam(rng, state.player.nationality);
  const next = resign(state, team, 3, 0, undefined, "none", rng);
  return {
    ...next,
    player: markFired(
      {
        ...next.player,
        personality: {
          ...next.player.personality,
          loyalty: clamp(next.player.personality.loyalty - 8, 20, 95),
        },
      },
      "hometown_discount",
    ),
  };
}

/** Misma cota que el chip de la carta. D-23. */
function isLovedClub(player: Player): boolean {
  return clubStandingOf(player) === "loved";
}

function resign(
  state: CareerState,
  team: Team,
  years: number,
  biasDelta: number,
  salary: number | undefined,
  protection: TradeProtection,
  rng: Rng,
): CareerState {
  const ovr = calculateOverall(state.player.attributes, state.player.position, state.player.archetype);
  const pay = salary ?? Math.max(8, Math.round(ovr * 0.4));
  const leftLoved = team.id !== state.world.team.id && isLovedClub(state.player);
  return {
    ...state,
    world: {
      ...attachStaff(state.world, team, rng, state.player.position),
      contract: { yearsLeft: years, salary: pay, tradeProtection: protection },
    },
    player: {
      ...state.player,
      roleBias: clamp(state.player.roleBias + biasDelta, -2, 2),
      morale: clamp(state.player.morale + (leftLoved ? -10 : 4), 10, 95),
      coachRelation: leftLoved ? clamp(state.player.coachRelation - 18, 10, 95) : state.player.coachRelation,
      teammateRelation: leftLoved
        ? clamp(state.player.teammateRelation - 16, 10, 95)
        : state.player.teammateRelation,
    },
  };
}
