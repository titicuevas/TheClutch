"use client";

import { formatNationalChip, formatPlayoffLine, formatTeamRecord, formatTitleLine, type CareerViewModel, type SeasonRecord } from "@theclutch/engine";
import { useEffect, useState } from "react";
import {
  AWARD_LABEL,
  BADGE_LABEL,
  COMPETITION_LABEL,
  DRAFT_BAND,
  PLAYOFF_LABEL,
  ROLE_LABEL,
  TITLE_LABEL,
  injuryLine,
} from "../lib/labels";
import { ChampMark, ClutchOutcomeMark, TitleLine, TitleMark } from "./Marks";
import { TeamCrest } from "./TeamCrest";

type Midseason = NonNullable<CareerViewModel["midseason"]>;

type ClubBlock = {
  teamId: string;
  teamName: string;
  seasons: SeasonRecord[];
  midseason?: Midseason;
  fromYear: number;
  toYear: number;
};

type Props = {
  history: SeasonRecord[];
  stints: CareerViewModel["clubStints"];
  midseason?: Midseason;
  year: number;
  focusYear?: number;
};

export function SeasonTimeline({ history, stints, midseason, year, focusYear }: Props) {
  const blocks = groupByClub(history, midseason, year);
  const latestYear = focusYear ?? history.at(-1)?.year;
  const [selectedYear, setSelectedYear] = useState(latestYear);
  const [expandedYear, setExpandedYear] = useState(latestYear);

  useEffect(() => {
    setSelectedYear(latestYear);
    setExpandedYear(latestYear);
  }, [latestYear]);

  if (!blocks.length) return null;

  return (
    <section data-testid="career-timeline">
      <div className="sticky top-2 z-10 mb-4 flex items-center gap-3 rounded-xl border border-line bg-ink/95 p-2.5 shadow-lg backdrop-blur">
        <label htmlFor="season-jump" className="text-xs font-semibold uppercase tracking-wider text-mute">Ir al año</label>
        <select
          id="season-jump"
          value={selectedYear}
          onChange={(event) => {
            const selected = Number(event.target.value);
            setSelectedYear(selected);
            setExpandedYear(selected);
            requestAnimationFrame(() => document.getElementById(`season-${selected}`)?.scrollIntoView({ block: "center" }));
          }}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 text-cream"
        >
          {[...history].reverse().map((season) => (
            <option key={season.year} value={season.year}>Temporada {season.year} · {season.teamName}</option>
          ))}
        </select>
      </div>
      <ol data-testid="season-log" className="flex flex-col gap-5">
        {blocks.map((block) => {
          const meta = stints.find((stint) => stint.teamId === block.teamId && stint.fromYear === block.seasons[0]?.year);
          const range =
            block.fromYear === block.toYear ? `T${block.fromYear}` : `T${block.fromYear}–T${block.toYear}`;
          return (
            <li key={`${block.teamId}-${block.fromYear}`} data-testid="stint-block">
              <div className="mb-2 flex items-center gap-2">
                <TeamCrest teamId={block.teamId} teamName={block.teamName} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{block.teamName}</p>
                  <p className="text-xs text-mute">
                    {range}
                    {block.midseason && !block.seasons.length ? " · en curso" : ""}
                    {meta
                      ? ` · ${meta.seasons} temp. · ${meta.pts.toFixed(1)}/${meta.ast.toFixed(1)}/${meta.reb.toFixed(1)}/${meta.blk.toFixed(1)}`
                      : ""}
                  </p>
                </div>
                {meta?.titles.length ? <TitleLine titles={meta.titles} text={formatTitleLine(meta.titles)} /> : null}
              </div>
              <ol className="relative ml-3 flex flex-col border-l border-line pl-4">
                {block.seasons.map((season, index) => (
                  <SeasonRow
                    key={season.year}
                    season={season}
                    focused={season.year === focusYear}
                    expanded={season.year === expandedYear}
                    onToggle={() => setExpandedYear((current) => current === season.year ? undefined : season.year)}
                    marker={
                      index === block.seasons.length - 1 && !block.midseason ? "bg-gold" : "bg-line"
                    }
                  />
                ))}
                {block.midseason ? (
                  <li className="relative">
                    <span className="absolute -left-[21px] top-2.5 h-2.5 w-2.5 rounded-full bg-gold" />
                    <MidseasonYear live={block.midseason} year={year} />
                  </li>
                ) : null}
              </ol>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function groupByClub(history: SeasonRecord[], midseason: Midseason | undefined, year: number): ClubBlock[] {
  const blocks: ClubBlock[] = [];
  for (const season of history) {
    const last = blocks.at(-1);
    if (last && last.teamId === season.teamId) {
      last.seasons.push(season);
      last.toYear = season.year;
    } else {
      blocks.push({
        teamId: season.teamId,
        teamName: season.teamName,
        seasons: [season],
        fromYear: season.year,
        toYear: season.year,
      });
    }
  }
  if (midseason) {
    const last = blocks.at(-1);
    if (last && last.teamId === midseason.teamId) {
      last.midseason = midseason;
      last.toYear = year;
    } else {
      blocks.push({
        teamId: midseason.teamId,
        teamName: midseason.teamName,
        seasons: [],
        midseason,
        fromYear: year,
        toYear: year,
      });
    }
  }
  return blocks;
}

function SeasonRow({
  season,
  focused,
  expanded,
  onToggle,
  marker,
}: {
  season: SeasonRecord;
  focused: boolean;
  expanded: boolean;
  onToggle: () => void;
  marker: string;
}) {
  return (
    <li
      id={`season-${season.year}`}
      data-testid={`season-row-${season.year}`}
      data-focus={focused ? "true" : undefined}
      aria-current={focused ? "true" : undefined}
      className="relative pb-3 last:pb-0"
    >
      <span className={`absolute -left-[21px] top-2.5 h-2.5 w-2.5 rounded-full ${focused ? "bg-gold" : marker}`} />
      <SeasonYear season={season} focused={focused} expanded={expanded} onToggle={onToggle} />
    </li>
  );
}

function SeasonYear({ season, focused, expanded, onToggle }: { season: SeasonRecord; focused?: boolean; expanded: boolean; onToggle: () => void }) {
  const clutchChoice = season.choices.find((choice) => choice.title === "La última bola" && choice.outcomeTone);
  return (
    <article className={`surface rounded-xl border px-3 py-2.5 ${focused ? "border-gold/55" : "border-line"}`}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-h-11 w-full items-center justify-between gap-2 text-left">
        <span className="text-xs uppercase tracking-[0.2em] text-gold">Temporada {season.year}</span>
        <span
          className={`font-display text-xl leading-none ${
            season.grade?.mark === "S" || season.grade?.mark === "A"
              ? "text-gold"
              : season.grade?.mark === "D"
                ? "text-clutch"
                : "text-cream"
          }`}
        >
          {season.grade?.mark ?? ""} <span aria-hidden className="ml-1 font-sans text-sm text-mute">{expanded ? "−" : "+"}</span>
        </span>
      </button>
      <p className="mt-0.5 text-xs text-mute">
        {season.age} años · {ROLE_LABEL[season.role]} · {season.overall} OVR ·{" "}
        {COMPETITION_LABEL[season.competitionId] ?? season.competitionId}
      </p>
      {expanded ? <div data-testid={`season-details-${season.year}`}><p className="mt-2 font-display text-xl tracking-wide">
        {season.stats.pts.toFixed(1)}
        <span className="text-[10px] font-sans text-mute"> PTS </span>
        {season.stats.ast.toFixed(1)}
        <span className="text-[10px] font-sans text-mute"> AST </span>
        {season.stats.reb.toFixed(1)}
        <span className="text-[10px] font-sans text-mute"> REB </span>
        {season.stats.blk.toFixed(1)}
        <span className="text-[10px] font-sans text-mute"> TAP</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {formatTeamRecord(season.teamRecord) ? (
          <span data-testid="team-record" className="rounded-full border border-line bg-ink px-2.5 py-1 text-mute">
            {formatTeamRecord(season.teamRecord)}
          </span>
        ) : null}
        <span className="rounded-full border border-line bg-ink px-2.5 py-1 text-mute">{season.stats.games} PJ</span>
        {season.playoff !== "missed" ? (
          <span
            className={`inline-flex max-w-[16rem] items-center gap-1 truncate rounded-full border px-2.5 py-1 ${
              season.playoff === "champ"
                ? "border-good/40 text-good"
                : season.playoff === "finals"
                  ? "border-gold/40 text-gold"
                  : "border-line text-mute"
            }`}
          >
            {formatPlayoffLine(season) ?? PLAYOFF_LABEL[season.playoff]}
            {season.playoff === "champ" ? <ChampMark /> : null}
          </span>
        ) : null}
        {season.injury ? (
          <span className="rounded-full border border-clutch/40 px-2.5 py-1 text-clutch">
            {injuryLine(season.injury)}
          </span>
        ) : null}
        {season.draft ? (
          <span
            className={`rounded-full border px-2.5 py-1 ${
              season.draft.undrafted ? "border-clutch/40 text-clutch" : "border-gold/40 text-gold"
            }`}
          >
            {season.draft.undrafted
              ? "Sin ser elegido"
              : `Pick ${season.draft.pick} · ${DRAFT_BAND[season.draft.band] ?? season.draft.band}`}
          </span>
        ) : null}
        {season.national ? (
          <span
            className={`rounded-full border px-2.5 py-1 ${
              season.national.status === "snub" || season.national.status === "declined"
                ? "border-clutch/40 text-clutch"
                : "border-gold/40 text-gold"
            }`}
          >
            {formatNationalChip(season.national)}
          </span>
        ) : null}
        {season.newBadges?.map((id) => (
          <span key={id} className="rounded-full border border-gold/40 px-2.5 py-1 text-gold">
            {BADGE_LABEL[id] ?? id}
          </span>
        ))}
        {season.awards.map((a) => (
          <span key={a} className="rounded-full border border-gold/40 px-2.5 py-1 text-gold">
            {AWARD_LABEL[a] ?? a}
          </span>
        ))}
        {season.titles.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full border border-good/40 px-2.5 py-1 text-good">
            <TitleMark id={t} />
            {TITLE_LABEL[t] ?? t}
          </span>
        ))}
        {season.continental && season.continental !== "champ" ? (
          <span className="rounded-full border border-gold/40 px-2.5 py-1 text-gold">
            Continental · {PLAYOFF_LABEL[season.continental]}
          </span>
        ) : null}
      </div>
      {clutchChoice?.outcomeTone ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-ink/70 px-3 py-2">
          <ClutchOutcomeMark tone={clutchChoice.outcomeTone} testId="clutch-outcome-history" />
          {clutchChoice.outcome ? <p className="mt-1 text-xs leading-relaxed text-mute">{clutchChoice.outcome}</p> : null}
        </div>
      ) : null}
      </div> : null}
    </article>
  );
}

function MidseasonYear({ live, year }: { live: Midseason; year: number }) {
  return (
    <article className="surface rounded-xl border border-gold/40 px-3 py-2.5">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Temporada {year} · primera mitad</p>
      <p className="mt-0.5 text-xs text-mute">
        {ROLE_LABEL[live.role]} · {live.games} PJ
      </p>
      <p className="mt-2 font-display text-xl tracking-wide">
        {live.pts.toFixed(1)}
        <span className="text-[10px] font-sans text-mute"> PTS </span>
        {live.ast.toFixed(1)}
        <span className="text-[10px] font-sans text-mute"> AST </span>
        {live.reb.toFixed(1)}
        <span className="text-[10px] font-sans text-mute"> REB</span>
      </p>
      <p className="mt-1 text-xs text-mute">
        {live.minutes.toFixed(1)} min
        {live.injury ? ` · ${injuryLine(live.injury, { games: true })}` : ""}
      </p>
    </article>
  );
}
