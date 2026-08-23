"use client";

import {
  calculateLegacy,
  createCareer,
  dispatch,
  formatWage,
  getViewModel,
  hydrateCareer,
  shouldForceRetire,
  UNSIGNED_TEAM_ID,
  type CareerMode,
  type CareerState,
  type CareerViewModel,
  type Handed,
  type PendingDecision,
  type Position,
} from "@theclutch/engine";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FLAG, crestStyle, jerseyNumber, teamForOption } from "../lib/crest";
import {
  ARCHETYPE_LABEL,
  ATTR_LABEL,
  BADGE_LABEL,
  COMPETITION_LABEL,
  CLUB_STANDING,
  HAND_LABEL,
  KIND_LABEL,
  NATION_LABEL,
  POSITION_LABEL,
  ROLE_LABEL,
  SCOUT_LABEL,
  TEMPERAMENT_LABEL,
  injuryLine,
} from "../lib/labels";
import { loadOfficialDaily, loadRun, markOfficialDaily, saveRun } from "../lib/persist";
import { LegacyCard } from "./LegacyCard";
import { SeasonRecap } from "./SeasonRecap";
import { SeasonTimeline } from "./SeasonTimeline";
import { TeamCrest } from "./TeamCrest";
import { track } from "../lib/telemetry";

type Props = {
  mode?: CareerMode;
  playerSeed: string;
  runSeed: string;
  dailyDate?: string;
  position?: Position;
  nationality?: string;
  handed?: Handed;
  givenName?: string;
  storageKey: string;
  onReroll?: () => void;
  onReset?: () => void;
  onFunRun?: () => void;
};

export function CareerPlay({
  mode = "free",
  playerSeed,
  runSeed,
  dailyDate,
  position,
  nationality,
  handed,
  givenName,
  storageKey,
  onReroll,
  onReset,
  onFunRun,
}: Props) {
  const [state, setState] = useState<CareerState | null>(null);

  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    setState(
      openOpening(
        loadRun(storageKey) ??
          createCareer({
            playerSeed,
            runSeed,
            mode,
            dailyDate,
            position,
            nationality,
            handed,
            givenName,
          }),
      ),
    );
    if (mode === "daily" && dailyDate) {
      const rec = loadOfficialDaily(dailyDate);
      const mine = !rec || rec.runSeed === runSeed;
      if (mine) markOfficialDaily(dailyDate, runSeed);
      setBanner(mine ? "Intento del día · sin ranking" : "Por diversión · sin ranking");
    } else if (mode === "challenge") {
      setBanner("Por diversión · sin ranking");
    } else {
      setBanner(null);
    }
  }, [storageKey, playerSeed, runSeed, mode, dailyDate, position, nationality, handed, givenName]);

  useEffect(() => {
    if (state) saveRun(storageKey, state);
  }, [state, storageKey]);

  const vm = useMemo(() => (state ? getViewModel(state) : null), [state]);
  const legacy = state?.retired ? calculateLegacy(state) : null;
  const finishedTracked = useRef(false);
  useEffect(() => {
    if (legacy && !finishedTracked.current) {
      finishedTracked.current = true;
      track("career_finished");
    }
  }, [legacy]);
  const canForce = state ? shouldForceRetire(state) || state.history.length >= 8 : false;
  const canReroll =
    Boolean(onReroll) &&
    Boolean(state) &&
    state!.history.length === 0 &&
    !state!.seasonInProgress &&
    !state!.retired &&
    !state!.awaitingRecap;

  if (!state || !vm) {
    return <p className="text-mute">Cargando carrera…</p>;
  }

  const unsigned = vm.teamId === UNSIGNED_TEAM_ID;
  const played = state.history.length > 0;
  const kit = unsigned
    ? { primary: "#1a1c24", secondary: "#0c0d12", accent: "#e8b84a" }
    : crestStyle(vm.teamId, vm.teamName);
  const number = jerseyNumber(vm.name);
  const deciding = Boolean(vm.decision);
  const giro = Boolean(
    vm.decision && (vm.decision.kind === "event" || vm.decision.kind === "trade"),
  );
  const showLog = played && !giro;
  const focusYear = state.history.at(-1)?.year;

  function simNext() {
    setState((current) => (current ? dispatch(current, { type: "SIMULATE_NEXT" }).state : current));
  }

  function choose(optionId: string) {
    setState((current) => (current ? dispatch(current, { type: "CHOOSE", optionId }).state : current));
  }

  function simulateYear() {
    setState((current) => {
      if (!current) return current;
      let next = current;
      let guard = 0;
      while (!next.retired && !next.pendingDecision && !next.awaitingRecap && guard < 30) {
        next = dispatch(next, { type: "SIMULATE_NEXT" }).state;
        guard += 1;
      }
      return next;
    });
  }

  function retire() {
    setState((current) => (current ? dispatch(current, { type: "RETIRE" }).state : current));
  }

  if (vm.recap) {
    return (
      <SeasonRecap
        name={vm.name}
        nationality={vm.nationality}
        season={vm.recap}
        note={vm.recapNote}
        beat={vm.recapBeat}
        grade={vm.recapGrade}
        headline={vm.recapHeadline}
        rival={vm.rival}
        onContinue={simNext}
      />
    );
  }

  if (legacy) {
    return <LegacyCard report={legacy} onReset={onReset} onFunRun={onFunRun} />;
  }

  return (
    <div data-testid="career-card" className="flex flex-col gap-5">
      {played ? (
        <IdentityStrip vm={vm} kit={kit} unsigned={unsigned} />
      ) : (
      <header
        className="jersey-card overflow-hidden rounded-3xl border border-white/10"
        style={{ background: `linear-gradient(145deg, ${kit.primary} 0%, ${kit.secondary} 38%, #0c0d12 72%)` }}
      >
        <div className="flex items-stretch gap-3 p-4">
          <div
            className="flex w-[4.75rem] flex-col items-center justify-between rounded-2xl border border-white/15 py-2 shadow-inner"
            style={{ background: `linear-gradient(180deg, ${kit.accent}33, ${kit.primary})` }}
          >
            <span className="px-0.5 text-center text-[9px] font-bold leading-tight tracking-wide text-white/80">
              {POSITION_LABEL[vm.position] ?? vm.position}
            </span>
            <span className="font-display text-3xl leading-none text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]">{number}</span>
            {unsigned ? (
              <span className="h-9 w-9 rounded-full border border-dashed border-white/25" aria-hidden />
            ) : (
              <TeamCrest teamId={vm.teamId} teamName={vm.teamName} size={36} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.25em] text-gold">
              {POSITION_LABEL[vm.position] ?? vm.position} · {ARCHETYPE_LABEL[vm.archetype] ?? vm.archetype}
            </p>
            <h1 data-testid="player-name" className="font-display mt-1 text-3xl leading-none drop-shadow-[0_6px_16px_rgba(0,0,0,0.4)]">{vm.name}</h1>
            <p className="mt-2 text-sm text-mute">
              {FLAG[vm.nationality] ?? ""} {NATION_LABEL[vm.nationality] ?? vm.nationality} ·{" "}
              {HAND_LABEL[vm.handed] ?? vm.handed} · {vm.heightCm} cm · {vm.age} años
            </p>
            <div className="mt-3 flex items-center gap-2">
              {unsigned ? null : <TeamCrest teamId={vm.teamId} teamName={vm.teamName} size={28} />}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{unsigned ? "Sin circuito" : vm.teamName}</p>
                <p className="text-[11px] text-mute">
                  {unsigned
                    ? "Todavía no hay club"
                    : `${ROLE_LABEL[vm.role]} · ${COMPETITION_LABEL[vm.competitionId] ?? vm.competitionId} · contrato ${vm.contractYearsLeft}a · sueldo ${formatWage(vm.contractSalary)}${vm.tradeProtection === "full" ? " · no trade" : ""}`}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl text-gold drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]">{vm.overall}</p>
            <p className="text-xs uppercase tracking-widest text-mute">OVR</p>
          </div>
        </div>
        {!deciding || !played ? (
          <>
            <div className="flex flex-wrap gap-2 border-t border-white/10 bg-ink/50 px-4 py-3 text-xs">
              <Chip>
                {ROLE_LABEL[vm.role]} · {vm.minutesMin}–{vm.minutesMax} min
              </Chip>
              {!unsigned ? <Chip>{CLUB_STANDING[vm.clubStanding] ?? vm.clubStanding}</Chip> : null}
              {vm.tradeProtection === "full" ? <Chip>No trade</Chip> : null}
              {vm.careerEarnings > 0 ? <Chip>Ganado {formatWage(vm.careerEarnings)}</Chip> : null}
              <Chip>{TEMPERAMENT_LABEL[vm.temperament] ?? vm.temperament}</Chip>
              <Chip>{SCOUT_LABEL[vm.potentialBand]}</Chip>
              <Chip>Ánimo {vm.morale}</Chip>
              <Chip>Forma {vm.form}</Chip>
              <Chip>Carga {vm.fatigue}</Chip>
              {vm.badges.map((id) => (
                <Chip key={id}>{BADGE_LABEL[id] ?? id}</Chip>
              ))}
            </div>
            <dl className="grid grid-cols-3 gap-2 bg-ink/50 px-4 pb-4">
              {Object.entries(vm.signature).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-ink/60 py-2 text-center">
                  <dt className="text-[10px] uppercase tracking-wide text-mute">
                    {ATTR_LABEL[key] ?? key}
                  </dt>
                  <dd className="font-display text-lg">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="border-t border-white/10 bg-ink/50 px-4 py-3 text-xs text-mute">
            {ROLE_LABEL[vm.role]} · {vm.minutesMin}–{vm.minutesMax} min
          </p>
        )}
      </header>
      )}

      {banner ? (
        <p data-testid="run-banner" className="text-center text-xs text-mute">
          {banner}
        </p>
      ) : null}

      {vm.decision ? (
        <>
          <DecisionCard decision={vm.decision} live={vm.midseason} onChoose={choose} />
          {canReroll ? (
            <button
              type="button"
              onClick={onReroll}
              className="h-11 min-h-11 rounded-xl border border-gold/50 bg-gold/10 text-sm text-gold"
            >
              Otra carta
            </button>
          ) : null}
        </>
      ) : null}

      {!unsigned && !played && !vm.decision ? (
        <p className="flex items-center gap-2 text-sm text-mute">
          <TeamCrest teamId={vm.rival.teamId} teamName={vm.rival.teamName} size={22} />
          <span className="min-w-0 truncate">
            Rival {vm.rival.name} · {vm.rival.teamName}
            {vm.rival.pts > 0 ? ` · ${vm.rival.pts.toFixed(1)} PTS` : ""}
          </span>
        </p>
      ) : null}

      {showLog ? (
        <section className={vm.decision ? "" : "pb-28"}>
          <SeasonTimeline
            history={state.history}
            stints={vm.clubStints}
            midseason={vm.midseason}
            year={vm.year}
            focusYear={focusYear}
          />
        </section>
      ) : null}

      {!vm.decision ? (
        <div className="sticky bottom-3 flex flex-col gap-2 bg-gradient-to-t from-ink via-ink/95 to-transparent pt-6 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]">
          <button type="button" data-testid="season-cta" onClick={simulateYear} className="btn-primary h-14 text-lg">
            {vm.upcomingCue ?? "Simular temporada"}
          </button>
          {canReroll ? (
            <button
              type="button"
              onClick={onReroll}
              className="h-11 min-h-11 rounded-xl border border-gold/50 bg-gold/10 text-sm text-gold"
            >
              Otra carta
            </button>
          ) : (canForce || state.history.length >= 4) &&
            vm.upcomingCue !== "¿Una más?" &&
            vm.upcomingCue !== "Cerrar carrera" ? (
              <button type="button" onClick={retire} className="btn-option h-11 rounded-xl text-sm text-cream">
                Retirarse
              </button>
            ) : null}
          <CareerNav onReset={onReset} />
        </div>
      ) : (
        <CareerNav onReset={onReset} />
      )}
    </div>
  );
}

function openOpening(state: CareerState): CareerState {
  const ready = hydrateCareer(state);
  if (
    ready.history.length === 0 &&
    !ready.pendingDecision &&
    !ready.seasonInProgress &&
    !ready.awaitingRecap &&
    !ready.retired
  ) {
    return dispatch(ready, { type: "SIMULATE_NEXT" }).state;
  }
  return ready;
}

function CareerNav({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex items-center justify-center gap-3 py-1 text-xs text-mute">
      <Link href="/" className="inline-flex min-h-11 items-center px-2">
        Salir
      </Link>
      {onReset ? (
        <button type="button" onClick={onReset} className="min-h-11 px-2 text-gold">
          Reiniciar
        </button>
      ) : null}
    </div>
  );
}

function DecisionCard({
  decision,
  live,
  onChoose,
}: {
  decision: PendingDecision;
  live?: CareerViewModel["midseason"];
  onChoose: (id: string) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [decision.id]);
  const four = decision.options.length === 4;
  const two = decision.options.length === 2;
  const draftBeat =
    decision.kind === "draft" &&
    (decision.data?.draftBand === "top_3" || decision.data?.draftBand === "lottery");

  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      data-testid="decision-card"
      aria-labelledby="decision-title"
      aria-describedby="decision-body"
      className={`surface rounded-2xl border p-4 ${draftBeat ? "recap-beat border-gold" : "border-gold/45"}`}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{KIND_LABEL[decision.kind] ?? "Giro"}</p>
      <h2 id="decision-title" className="mt-2 text-xl font-semibold">
        {decision.title}
      </h2>
      <p id="decision-body" className="mt-2 text-sm leading-relaxed text-mute">
        {decision.body}
      </p>
      {live ? (
        <p data-testid="decision-midseason" className="mt-3">
          <span className="font-display text-xl tracking-wide">
            {live.pts.toFixed(1)}
            <span className="text-[10px] font-sans text-mute"> PTS </span>
            {live.ast.toFixed(1)}
            <span className="text-[10px] font-sans text-mute"> AST </span>
            {live.reb.toFixed(1)}
            <span className="text-[10px] font-sans text-mute"> REB</span>
          </span>
          <span className="mt-1 block text-xs text-mute">
            Primera mitad · {ROLE_LABEL[live.role]} · {live.games} PJ · {live.minutes.toFixed(1)} min
            {live.injury ? ` · ${injuryLine(live.injury, { games: true })}` : ""}
          </span>
        </p>
      ) : null}
      <p className="mt-2 text-xs text-gold/80">
        {decision.kind === "event" || decision.kind === "trade"
          ? "El resto del año se juega con esto."
          : decision.kind === "training"
            ? "Se ve en el recap."
            : decision.kind === "draft"
              ? "Cambia de circuito. Se ve en el recap."
            : decision.kind === "path"
              ? "Marca el circuito. Se ve en el recap."
              : decision.kind === "contract"
                ? "Sueldo, minutos o anillos. Se ve en el recap."
                : "Elige y sigue."}
      </p>
      <div
        role="group"
        aria-label="Opciones"
        className={`mt-4 gap-2 ${
          four ? "grid grid-cols-2" : two ? "flex flex-col md:grid md:grid-cols-2" : "flex flex-col"
        }`}
      >
        {decision.options.map((option) => {
          const club = teamForOption(option.id, decision.data);
          const hintId = option.hint ? `decision-hint-${option.id}` : undefined;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChoose(option.id)}
              aria-describedby={hintId}
              className="btn-option flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 text-left"
            >
              {club ? <TeamCrest teamId={club.id} teamName={club.name} size={40} /> : null}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{option.label}</span>
                {option.hint ? (
                  <span id={hintId} className="mt-0.5 block text-xs text-mute">
                    {option.hint}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function stripLine(vm: CareerViewModel, unsigned: boolean): string {
  const parts = [POSITION_LABEL[vm.position] ?? vm.position, ROLE_LABEL[vm.role]];
  parts.push(`${vm.minutesMin}–${vm.minutesMax} min`);
  if (unsigned) {
    parts.push("Sin circuito");
  } else {
    parts.push(formatWage(vm.contractSalary));
    parts.push(`${vm.contractYearsLeft}a`);
    if (vm.tradeProtection === "full") parts.push("no trade");
  }
  parts.push(`${vm.age} años`);
  if (vm.clubStanding === "cold" || vm.clubStanding === "loved") {
    parts.push(CLUB_STANDING[vm.clubStanding]);
  }
  return parts.join(" · ");
}

function IdentityStrip({
  vm,
  kit,
  unsigned,
}: {
  vm: CareerViewModel;
  kit: { primary: string; secondary: string };
  unsigned: boolean;
}) {
  return (
    <header
      data-testid="identity-strip"
      className="jersey-card flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 px-3 py-2.5"
      style={{ background: `linear-gradient(90deg, ${kit.primary} 0%, ${kit.secondary} 50%, #0c0d12 100%)` }}
    >
      {unsigned ? (
        <span className="h-9 w-9 shrink-0 rounded-full border border-dashed border-white/25" aria-hidden />
      ) : (
        <TeamCrest teamId={vm.teamId} teamName={vm.teamName} size={36} />
      )}
      <div className="min-w-0 flex-1">
        <h1 data-testid="player-name" className="font-display truncate text-xl leading-none">
          {vm.name}
        </h1>
        <p className="mt-1 truncate text-xs text-mute">{stripLine(vm, unsigned)}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-3xl leading-none text-gold">{vm.overall}</p>
        <p className="text-[10px] uppercase tracking-widest text-mute">OVR</p>
      </div>
    </header>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-ink/80 px-2.5 py-1 text-cream/90">
      {children}
    </span>
  );
}
