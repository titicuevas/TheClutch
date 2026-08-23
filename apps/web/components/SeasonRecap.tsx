import { awardSnubLine, formatContinentalLine, formatNationalStintLine, formatPlayoffLine, formatTeamRecord, formatWage, type RecapBeat, type SeasonGrade, type SeasonRecord } from "@theclutch/engine";
import {
  AWARD_LABEL,
  BADGE_LABEL,
  COMPETITION_LABEL,
  DRAFT_BAND,
  KIND_LABEL,
  PLAYOFF_LABEL,
  ROLE_LABEL,
  TITLE_LABEL,
  injuryLine,
} from "../lib/labels";
import { AwardMark, ChampMark, ClutchOutcomeMark, TitleMark } from "./Marks";
import { TeamCrest } from "./TeamCrest";

const HEADLINE = new Set(["MVP", "DPOY", "FMVP", "ROY", "MIP", "CMVP", "CFMVP"]);

type RivalLine = {
  name: string;
  teamId: string;
  teamName: string;
  pts: number;
  blk: number;
  awards: string[];
};

type Props = {
  name: string;
  nationality: string;
  season: SeasonRecord;
  note?: string;
  beat?: RecapBeat;
  grade?: SeasonGrade;
  headline?: string;
  rival?: RivalLine;
  onContinue: () => void;
};

export function SeasonRecap({
  name,
  nationality,
  season,
  note,
  beat,
  grade,
  headline,
  rival,
  onContinue,
}: Props) {
  const plates = season.awards.filter((a) => HEADLINE.has(a));
  const rest = season.awards.filter((a) => !HEADLINE.has(a));
  const mark = grade?.mark ?? season.grade?.mark;
  const score = grade?.score ?? season.grade?.score;
  const snub = awardSnubLine(season.awardSnub);

  return (
    <article
      data-testid="season-recap"
      data-recap-beat={beat ?? ""}
      className={`surface flex min-h-[85dvh] flex-col rounded-3xl border p-5 ${
        beat ? "recap-beat border-gold/55" : "border-line"
      }`}
    >
      <div className="flex-1 pb-28">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">
          Temporada {season.year} · {name}
        </p>
        {mark && score != null ? (
          <div data-testid="season-grade" className="mt-4 flex items-end gap-3">
            <span
              className={`font-display text-6xl leading-none ${
                mark === "S" || mark === "A" ? "text-gold" : mark === "D" ? "text-clutch" : "text-cream"
              }`}
            >
              {mark}
            </span>
            <div>
              <p className="font-display text-3xl leading-none">{score}</p>
              <p className="text-xs uppercase tracking-widest text-mute">Nota del año</p>
            </div>
          </div>
        ) : null}
        {headline ? <p className="mt-3 text-lg font-semibold">{headline}</p> : null}
        {note ? (
          <p data-testid="season-note" className="mt-3 text-sm leading-relaxed text-mute">
            {note}
          </p>
        ) : null}
        {snub ? (
          <p data-testid="season-snub" className="mt-3 text-sm text-clutch">
            {snub}
          </p>
        ) : null}
        {season.injury ? (
          <p data-testid="season-injury" className="mt-3 text-sm text-clutch">
            {injuryLine(season.injury, { games: true })}
          </p>
        ) : null}
        {season.national ? (
          <NationalLine nationality={nationality} national={season.national} beat={beat} />
        ) : null}
        {season.draft ? (
          <p
            data-testid="season-draft"
            className={`mt-3 text-sm ${season.draft.undrafted ? "text-clutch" : "text-gold"} ${
              beat === "draft" ? "recap-beat-mark" : ""
            }`}
          >
            {season.draft.undrafted
              ? "Sin ser elegido"
              : `Pick ${season.draft.pick} · ${DRAFT_BAND[season.draft.band] ?? season.draft.band} · ${season.draft.teamName}`}
          </p>
        ) : null}
        {season.choices.length ? (
          <section className="mt-5" data-testid="season-choices">
            <p className="text-xs uppercase tracking-widest text-mute">Tus cortes</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {season.choices.map((choice, index) => (
                <li
                  key={`${choice.kind}:${choice.optionLabel}:${index}`}
                  className={`rounded-xl border bg-ink px-3 py-2 text-sm ${
                    choice.title === "La última bola" && choice.outcomeTone === "good"
                      ? "border-good/50"
                      : choice.title === "La última bola" && choice.outcomeTone === "bad"
                        ? "border-clutch/60"
                        : "border-white/10"
                  }`}
                >
                  {choice.title === "La última bola" && choice.outcomeTone ? (
                    <div className="mb-1">
                      <ClutchOutcomeMark tone={choice.outcomeTone} />
                    </div>
                  ) : null}
                  <span className="text-gold">{KIND_LABEL[choice.kind] ?? choice.kind}</span>
                  <span className="text-mute"> · {choice.title} → </span>
                  <span className="font-semibold">{choice.optionLabel}</span>
                  {choice.outcome ? (
                    <span
                      className={`mt-2 block border-t border-white/10 pt-2 ${
                        choice.outcomeTone === "good" ? "text-good" : choice.outcomeTone === "bad" ? "text-clutch" : "text-cream/80"
                      }`}
                      aria-live="polite"
                    >
                      {choice.outcome}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="mt-6 flex items-center gap-3">
          <TeamCrest teamId={season.teamId} teamName={season.teamName} size={56} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{season.teamName}</p>
            <p className="text-sm text-mute">
              {COMPETITION_LABEL[season.competitionId] ?? season.competitionId} ·{" "}
              {ROLE_LABEL[season.role]} · OVR {season.overall}
            </p>
          </div>
        </div>
        <p className="font-display mt-6 text-4xl tracking-wide">
          {season.stats.pts.toFixed(1)}
          <span className="text-base font-sans text-mute"> PTS </span>
          {season.stats.ast.toFixed(1)}
          <span className="text-base font-sans text-mute"> AST </span>
          {season.stats.reb.toFixed(1)}
          <span className="text-base font-sans text-mute"> REB </span>
          {season.stats.blk.toFixed(1)}
          <span className="text-base font-sans text-mute"> TAP</span>
        </p>
        <p className="mt-2 text-sm text-mute">
          {formatTeamRecord(season.teamRecord) ? (
            <>
              <span data-testid="team-record">{formatTeamRecord(season.teamRecord)}</span>
              {" · "}
            </>
          ) : null}
          {season.stats.games} PJ · {season.stats.minutes.toFixed(1)} min · sueldo {formatWage(season.salary)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {season.playoff !== "missed" ? (
            <span
              className={`inline-flex items-center gap-1 ${beat === "champ" ? "recap-beat-mark" : ""} ${
                season.playoff === "champ"
                  ? "text-good"
                  : season.playoff === "finals"
                    ? "text-gold"
                    : "text-mute"
              }`}
            >
              {PLAYOFF_LABEL[season.playoff]}
              {season.playoff === "champ" ? <ChampMark /> : null}
            </span>
          ) : null}
          {season.titles.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1 rounded-full border border-good/40 px-2 py-0.5 text-good ${
                beat === "champ" ? "recap-beat-mark" : ""
              }`}
            >
              <TitleMark id={t} />
              {TITLE_LABEL[t] ?? t}
            </span>
          ))}
          {season.continental && season.continental !== "champ" ? (
            <span className="rounded-full border border-gold/40 px-2 py-0.5 text-gold">
              Continental · {PLAYOFF_LABEL[season.continental]}
            </span>
          ) : null}
        </div>
        {season.playoffRun && formatPlayoffLine(season) ? (
          <p
            data-testid="playoff-run"
            className={`mt-3 flex items-center gap-2 text-sm ${
              season.playoff === "champ" ? "text-good" : season.playoff === "finals" ? "text-gold" : "text-mute"
            }`}
          >
            <TeamCrest teamId={season.playoffRun.opponentId} teamName={season.playoffRun.opponentName} size={22} />
            <span className="min-w-0 truncate">{formatPlayoffLine(season)}</span>
          </p>
        ) : null}
        {season.continentalRun && formatContinentalLine(season) ? (
          <p
            data-testid="continental-run"
            className={`mt-2 flex items-center gap-2 text-sm ${
              season.continental === "champ" ? "text-good" : "text-gold"
            }`}
          >
            <TeamCrest
              teamId={season.continentalRun.opponentId}
              teamName={season.continentalRun.opponentName}
              size={22}
            />
            <span className="min-w-0 truncate">{formatContinentalLine(season)}</span>
          </p>
        ) : null}
        {plates.length ? (
          <p
            className={`font-display mt-6 flex items-center gap-2 text-3xl text-gold ${
              beat === "mvp" || beat === "award" ? "recap-beat-mark" : ""
            }`}
          >
            {beat === "champ" ? <ChampMark /> : <AwardMark />}
            {plates.map((a) => AWARD_LABEL[a] ?? a).join(" · ")}
          </p>
        ) : null}
        {rest.length ? (
          <p className="mt-2 text-sm text-gold">{rest.map((a) => AWARD_LABEL[a] ?? a).join(" · ")}</p>
        ) : null}
        {season.newBadges?.length ? (
          <div data-testid="season-badges" className="mt-3 flex flex-wrap gap-1.5">
            {season.newBadges.map((id) => (
              <span key={id} className="rounded-full border border-gold/40 px-2 py-0.5 text-sm text-gold">
                {BADGE_LABEL[id] ?? id}
              </span>
            ))}
          </div>
        ) : null}
        {rival && rival.pts > 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-mute">
            <TeamCrest teamId={rival.teamId} teamName={rival.teamName} size={22} />
            <span className="min-w-0 truncate">
              Rival {rival.name} · {rival.teamName} · {rival.pts.toFixed(1)} PTS
              {rival.awards.length ? ` · ${rival.awards.map((a) => AWARD_LABEL[a] ?? a).join(" · ")}` : ""}
            </span>
          </p>
        ) : null}
      </div>
      <div className="sticky bottom-3 bg-gradient-to-t from-panel via-panel/95 to-transparent pt-6 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onContinue} className="btn-primary h-14 w-full text-lg">
          Ver el año
        </button>
      </div>
    </article>
  );
}

function NationalLine({
  nationality,
  national,
  beat,
}: {
  nationality: string;
  national: NonNullable<SeasonRecord["national"]>;
  beat?: RecapBeat;
}) {
  const miss = national.status === "snub" || national.status === "declined";
  const medal = national.result === "gold" || national.result === "silver" || national.result === "bronze";
  return (
    <p data-testid="season-national" className="mt-3 text-sm">
      <span
        className={
          miss
            ? "text-clutch"
            : medal
              ? `text-gold ${beat === "gold" ? "recap-beat-mark" : ""}`
              : "text-mute"
        }
      >
        {formatNationalStintLine(national, nationality)}
      </span>
    </p>
  );
}
