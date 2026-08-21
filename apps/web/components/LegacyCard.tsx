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
        <Link href="/" className="btn-primary flex h-14 items-center justify-center text-lg">
          Otra carrera
        </Link>
        {onFunRun ? (
          <button type="button" onClick={onFunRun} className="mt-3 min-h-11 w-full py-2 text-sm text-gold">
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
