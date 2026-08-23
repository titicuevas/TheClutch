"use client";

import {
  formatAwardLine,
  formatLegacyCard,
  formatNationalLine,
  formatShareLine,
  formatTitleLine,
  formatWage,
  MOMENT_LABEL,
  type LegacyReport,
} from "@theclutch/engine";
import Link from "next/link";
import { useState } from "react";
import { FLAG, crestStyle } from "../lib/crest";
import { BADGE_LABEL, LEGACY_BAND, NATION_LABEL, POSITION_LABEL } from "../lib/labels";
import { TitleLine } from "./Marks";
import { TeamCrest } from "./TeamCrest";
import { track } from "../lib/telemetry";

export function LegacyCard({
  report,
  onReset,
  onFunRun,
}: {
  report: LegacyReport;
  onReset?: () => void;
  onFunRun?: () => void;
}) {
  const awards = formatAwardLine(report.awards);
  const titles = formatTitleLine(report.titles);
  const share = formatShareLine(report);
  const home = report.clubStints.at(-1);
  const kit = home ? crestStyle(home.teamId, home.teamName) : null;
  const [copied, setCopied] = useState(false);

  async function copyCard() {
    try {
      await navigator.clipboard.writeText(formatLegacyCard(report));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article
      data-testid="legacy-card"
      className="jersey-card flex min-h-[85dvh] flex-col justify-between overflow-hidden rounded-3xl border border-gold/35 p-5"
      style={
        kit
          ? { background: `linear-gradient(160deg, ${kit.primary} 0%, ${kit.secondary} 32%, #14161c 68%)` }
          : undefined
      }
    >
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Legacy</p>
        <h1 className="font-display mt-3 text-4xl leading-none">{report.name}</h1>
        <p className="mt-2 text-sm text-mute">
          {FLAG[report.nationality] ?? ""} {POSITION_LABEL[report.position] ?? report.position} ·{" "}
          {NATION_LABEL[report.nationality] ?? report.nationality}
        </p>
        <p data-testid="legacy-band" className="font-display mt-8 text-5xl leading-none text-gold">
          {LEGACY_BAND[report.band] ?? report.band}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-mute">Legacy score</p>
        <p className="font-display text-6xl leading-none">{report.legacyScore.toLocaleString("es-ES")}</p>
        {report.moments.length ? (
          <p data-testid="legacy-moments" className="mt-4 text-base text-gold/90">
            {report.moments.map((id) => MOMENT_LABEL[id]).join(" ")}
          </p>
        ) : null}
        <p className="mt-6 text-sm text-mute">
          {report.seasons} temporadas · Pico OVR {report.peakOverall} · Ganado {formatWage(report.earnings)}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
          {report.bestSeason ? (
            <div className="rounded-xl border border-white/10 bg-ink/45 p-3">
              <dt className="text-xs uppercase tracking-wider text-mute">Mejor año</dt>
              <dd className="mt-1 font-semibold">
                T{report.bestSeason.year} · {report.bestSeason.grade} ({report.bestSeason.score})
              </dd>
              <dd className="truncate text-xs text-mute">{report.bestSeason.teamName}</dd>
            </div>
          ) : null}
          {report.primaryClub ? (
            <div className="rounded-xl border border-white/10 bg-ink/45 p-3">
              <dt className="text-xs uppercase tracking-wider text-mute">Tu club</dt>
              <dd className="mt-1 truncate font-semibold">{report.primaryClub.name}</dd>
              <dd className="text-xs text-mute">{report.primaryClub.seasons} temporadas</dd>
            </div>
          ) : null}
        </dl>
        {report.clutchRecord.made + report.clutchRecord.missed > 0 ? (
          <p className="mt-4 text-sm text-gold">Momentos clutch · {report.clutchRecord.made} dentro · {report.clutchRecord.missed} fuera</p>
        ) : null}
        {report.definingChoice?.outcome ? (
          <blockquote className={`mt-4 border-l-2 pl-3 text-sm leading-relaxed ${choiceToneClass(report.definingChoice.outcomeTone)}`}>
            <span className="block text-xs uppercase tracking-wider text-mute">El corte que quedó</span>
            {report.definingChoice.outcome}
          </blockquote>
        ) : null}
        <p className="font-display mt-4 text-3xl">
          {report.ppg.toFixed(1)} / {report.apg.toFixed(1)} / {report.rpg.toFixed(1)} / {report.bpg.toFixed(1)}
        </p>
        <p className="text-xs uppercase tracking-widest text-mute">PPG · APG · RPG · TAP</p>
        {report.teams.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {report.teams.map((club) => (
              <span key={club.id} className="flex items-center gap-1.5 text-xs text-mute">
                <TeamCrest teamId={club.id} teamName={club.name} size={22} />
                {club.name}
              </span>
            ))}
          </div>
        ) : null}
        {report.clubStints.some((club) => club.titles.length > 0) ? (
          <section className="mt-6" aria-labelledby="palmares-club">
            <h2 id="palmares-club" className="text-xs uppercase tracking-[0.25em] text-mute">
              Dónde levantaste los títulos
            </h2>
            <ul className="mt-3 space-y-2">
              {report.clubStints.filter((club) => club.titles.length > 0).map((club) => (
                <li key={`${club.teamId}-${club.fromYear}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink/45 p-2.5">
                  <TeamCrest teamId={club.teamId} teamName={club.teamName} size={30} />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-semibold">{club.teamName}</span>
                    <span className="text-mute">T{club.fromYear}–T{club.toYear}</span>
                  </span>
                  <TitleLine titles={club.titles} text={formatTitleLine(club.titles)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="mt-5 text-sm leading-relaxed text-cream/90">
          {titles ? <TitleLine titles={report.titles} text={titles} /> : "Sin títulos"}
        </p>
        <p className="mt-1 text-sm text-gold">{awards || "Sin premios"}</p>
        <p data-testid="legacy-national" className="mt-1 text-sm text-cream/90">
          {formatNationalLine(report)}
        </p>
        {share ? (
          <p data-testid="legacy-share" className="mt-3 text-xs uppercase tracking-widest text-gold">
            {share}
          </p>
        ) : null}
        {report.badges.length ? (
          <p className="mt-3 text-sm text-cream/80">
            {report.badges.map((id) => BADGE_LABEL[id] ?? id).join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="mt-10">
        <Link href="/" onClick={() => track("replay_start")} className="btn-primary flex h-14 items-center justify-center text-lg">
          Otra carrera
        </Link>
        {onFunRun ? (
          <button type="button" onClick={() => { track("replay_start"); onFunRun(); }} className="mt-3 min-h-11 w-full py-2 text-sm text-gold">
            Otra suerte
          </button>
        ) : null}
        <button
          type="button"
          onClick={copyCard}
          className="mt-3 min-h-11 w-full py-2 text-sm text-gold"
        >
          {copied ? "Ficha copiada" : "Copiar ficha"}
        </button>
        {onReset ? (
          <button type="button" onClick={onReset} className="mt-1 w-full py-2 text-sm text-mute">
            Empezar de nuevo
          </button>
        ) : null}
      </div>
    </article>
  );
}

function choiceToneClass(tone: "good" | "bad" | "neutral" | undefined): string {
  if (tone === "good") return "border-good text-good";
  if (tone === "bad") return "border-clutch text-clutch";
  return "border-gold text-cream/80";
}
