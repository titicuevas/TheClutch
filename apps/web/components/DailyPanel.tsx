"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FLAG } from "../lib/crest";
import { ARCHETYPE_LABEL, NATION_LABEL, POSITION_LABEL, SCOUT_LABEL } from "../lib/labels";
import { assignedStorageKey, loadOfficialDaily, loadRun } from "../lib/persist";
import { playHref } from "../lib/playHref";
import { generateRunSeed } from "../lib/seed";
import { track } from "../lib/telemetry";

function formatReset(ms: number): string {
  if (ms <= 0) return "Reset ahora";
  const total = Math.ceil(ms / 60_000);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours <= 0) return `Reset en ${minutes} min`;
  return `Reset en ${hours} h ${minutes} min`;
}

type DailyPreview = {
  iso: string;
  name: string;
  nationality: string;
  position: keyof typeof POSITION_LABEL;
  heightCm: number;
  archetype: string;
  potentialBand: keyof typeof SCOUT_LABEL;
  code: string;
};

function nextUtcMidnight(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

export function DailyPanel({ daily }: { daily: DailyPreview }) {
  const router = useRouter();
  const [resetLabel, setResetLabel] = useState("");
  const [officialUsed, setOfficialUsed] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const currentIso = now.toISOString().slice(0, 10);
      if (currentIso !== daily.iso) {
        window.location.reload();
        return;
      }
      setResetLabel(formatReset(nextUtcMidnight(now) - now.getTime()));
    }
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [daily.iso]);

  useEffect(() => {
    const official = loadOfficialDaily(daily.iso);
    if (!official) {
      setOfficialUsed(false);
      return;
    }
    const saved = loadRun(assignedStorageKey("daily", daily.iso, official.runSeed));
    setOfficialUsed(Boolean(saved?.retired) || !saved);
  }, [daily.iso]);

  function playDaily() {
    track("daily_start");
    const official = loadOfficialDaily(daily.iso);
    const saved = official ? loadRun(assignedStorageKey("daily", daily.iso, official.runSeed)) : null;
    const run = saved && !saved.retired ? official!.runSeed : generateRunSeed();
    router.push(playHref({ mode: "daily", date: daily.iso, run }));
  }

  async function playCode(event: FormEvent) {
    event.preventDefault();
    const { encodeChallengeCode, parseChallengeCode } = await import("@theclutch/engine");
    const parsed = parseChallengeCode(code);
    if (!parsed) {
      setCodeError("Código no válido");
      return;
    }
    setCodeError("");
    track("challenge_start");
    router.push(
      playHref({
        mode: "challenge",
        code: encodeChallengeCode(parsed.playerSeed, parsed) ?? code.trim().toUpperCase(),
        run: generateRunSeed(),
      }),
    );
  }

  return (
    <section id="daily" className="surface scroll-mt-4 flex flex-col gap-3 rounded-3xl border border-gold/30 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Daily</p>
      <>
          <p className="text-xs text-mute" data-testid="daily-date">
            {daily.iso} UTC
          </p>
          <h2 data-testid="daily-name" className="font-display text-3xl leading-none text-cream">
            {daily.name}
          </h2>
          <p className="text-sm leading-relaxed text-mute">
            {FLAG[daily.nationality] ?? ""} {POSITION_LABEL[daily.position] ?? daily.position} ·{" "}
            {NATION_LABEL[daily.nationality] ?? daily.nationality} · {daily.heightCm} cm ·{" "}
            {ARCHETYPE_LABEL[daily.archetype] ?? daily.archetype} · {SCOUT_LABEL[daily.potentialBand]}
          </p>
          <p className="text-xs text-cream/80">Misma carta para todos hoy · una carrera completa · sin ranking todavía</p>
          {daily.code ? (
            <p className="flex flex-wrap items-center gap-2 font-mono text-sm text-gold">
              <span data-testid="daily-code">{daily.code}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(daily.code);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="min-h-11 text-xs uppercase tracking-widest text-gold"
              >
                {copied ? "Código copiado" : "Copiar código"}
              </button>
            </p>
          ) : null}
          <button type="button" onClick={playDaily} className="btn-primary h-14 text-lg" data-testid="daily-play">
            {officialUsed ? "Otra suerte" : "Jugar el Daily"}
          </button>
          <p className="text-center text-xs text-mute">
            {resetLabel}
            {officialUsed ? " · intento del día usado · sin ranking" : " · intento del día · sin ranking"}
          </p>
        </>

      <form onSubmit={playCode} className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
        <label htmlFor="challenge-code" className="text-xs uppercase tracking-widest text-mute">
          Challenge
        </label>
        <input
          id="challenge-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="BK1-D-260821 o código de ficha"
          autoComplete="off"
          spellCheck={false}
          className="h-11 rounded-xl border border-line bg-ink px-4 font-mono text-sm text-cream outline-none ring-gold/40 placeholder:text-mute/50 focus:ring-2"
        />
        {codeError ? <p className="text-xs text-gold">{codeError}</p> : null}
        <button type="submit" className="btn-option h-11 rounded-xl text-sm text-cream">
          Jugar código
        </button>
      </form>
    </section>
  );
}
