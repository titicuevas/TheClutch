"use client";

import {
  createCareer,
  dailyIsoDate,
  dailyPlayerSeed,
  encodeChallengeCode,
  getViewModel,
  nextDailyResetUtc,
  parseChallengeCode,
} from "@theclutch/engine";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FLAG } from "../lib/crest";
import { ARCHETYPE_LABEL, NATION_LABEL, POSITION_LABEL, SCOUT_LABEL } from "../lib/labels";
import { assignedStorageKey, loadOfficialDaily, loadRun } from "../lib/persist";
import { playHref } from "../lib/playHref";
import { generateRunSeed } from "../lib/seed";

function formatReset(ms: number): string {
  if (ms <= 0) return "Reset ahora";
  const total = Math.ceil(ms / 60_000);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours <= 0) return `Reset en ${minutes} min`;
  return `Reset en ${hours} h ${minutes} min`;
}

export function DailyPanel() {
  const router = useRouter();
  const [iso, setIso] = useState<string | null>(null);
  const [resetLabel, setResetLabel] = useState("");
  const [officialUsed, setOfficialUsed] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function tick() {
      const now = new Date();
      setIso(dailyIsoDate(now));
      setResetLabel(formatReset(nextDailyResetUtc(now).getTime() - now.getTime()));
    }
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!iso) return;
    const official = loadOfficialDaily(iso);
    if (!official) {
      setOfficialUsed(false);
      return;
    }
    const saved = loadRun(assignedStorageKey("daily", iso, official.runSeed));
    setOfficialUsed(Boolean(saved?.retired) || !saved);
  }, [iso]);

  const preview = useMemo(() => {
    if (!iso) return null;
    const playerSeed = dailyPlayerSeed(iso);
    return {
      vm: getViewModel(
        createCareer({
          playerSeed,
          runSeed: "preview",
          mode: "daily",
          dailyDate: iso,
        }),
      ),
      code: encodeChallengeCode(playerSeed),
    };
  }, [iso]);

  function playDaily() {
    if (!iso) return;
    const official = loadOfficialDaily(iso);
    const saved = official ? loadRun(assignedStorageKey("daily", iso, official.runSeed)) : null;
    const run = saved && !saved.retired ? official!.runSeed : generateRunSeed();
    router.push(playHref({ mode: "daily", date: iso, run }));
  }

  function playCode(event: FormEvent) {
    event.preventDefault();
    const parsed = parseChallengeCode(code);
    if (!parsed) {
      setCodeError("Código no válido");
      return;
    }
    setCodeError("");
    router.push(
      playHref({
        mode: "challenge",
        code: encodeChallengeCode(parsed.playerSeed, parsed) ?? code.trim().toUpperCase(),
        run: generateRunSeed(),
      }),
    );
  }

  return (
    <section className="surface flex flex-col gap-3 rounded-3xl border border-gold/30 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Daily</p>
      {preview && iso ? (
        <>
          <p className="text-xs text-mute" data-testid="daily-date">
            {iso} UTC
          </p>
          <h2 data-testid="daily-name" className="font-display text-3xl leading-none text-cream">
            {preview.vm.name}
          </h2>
          <p className="text-sm text-mute">
            {FLAG[preview.vm.nationality] ?? ""} {POSITION_LABEL[preview.vm.position] ?? preview.vm.position} ·{" "}
            {NATION_LABEL[preview.vm.nationality] ?? preview.vm.nationality} · {preview.vm.heightCm} cm ·{" "}
            {ARCHETYPE_LABEL[preview.vm.archetype] ?? preview.vm.archetype} · {SCOUT_LABEL[preview.vm.potentialBand]}
          </p>
          {preview.code ? (
            <p className="flex flex-wrap items-center gap-2 font-mono text-sm text-gold">
              <span data-testid="daily-code">{preview.code}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(preview.code!);
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
      ) : (
        <p className="text-sm text-mute">Cargando Daily…</p>
      )}

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
