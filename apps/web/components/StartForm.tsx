"use client";

import { NATIONALITIES, type Handed, type Position } from "@theclutch/engine";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FLAG } from "../lib/crest";
import { HAND_LABEL, NATION_LABEL, POSITION_LABEL } from "../lib/labels";
import { playHref } from "../lib/playHref";
import { track } from "../lib/telemetry";

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const HANDS: Handed[] = ["right", "left"];

export function StartForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [nationality, setNationality] = useState("");
  const [handed, setHanded] = useState<Handed | "">("");

  function play(event: FormEvent) {
    event.preventDefault();
    track("free_start");
    const givenName = [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(" ");
    router.push(
      playHref({
        seed: `free-${Date.now().toString(36)}`,
        position,
        nationality,
        handed,
        givenName,
      }),
    );
  }

  return (
    <form id="free-career" onSubmit={play} className="surface below-fold scroll-mt-4 flex flex-col gap-2.5 rounded-3xl border border-line p-4">
      <div><p className="text-xs uppercase tracking-[0.3em] text-gold">Carrera libre</p><h2 className="font-display mt-1 text-2xl">Tu carta, tu historia</h2></div>
      <p className="text-sm leading-relaxed text-mute">Nada es obligatorio. Si no eliges, sale una carta.</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-widest text-mute" htmlFor="player-first-name">
            Nombre <span className="font-normal normal-case tracking-normal">· opcional</span>
          </label>
          <input
            id="player-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Lola"
            autoComplete="given-name"
            maxLength={24}
            className="h-11 rounded-xl border border-line bg-ink px-4 text-cream outline-none ring-gold/40 placeholder:text-mute/50 focus:ring-2"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-widest text-mute" htmlFor="player-last-name">
            Apellido <span className="font-normal normal-case tracking-normal">· opcional</span>
          </label>
          <input
            id="player-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Ruiz"
            autoComplete="family-name"
            maxLength={24}
            className="h-11 rounded-xl border border-line bg-ink px-4 text-cream outline-none ring-gold/40 placeholder:text-mute/50 focus:ring-2"
          />
        </div>
      </div>
      <p className="text-xs uppercase tracking-widest text-mute">
        Posición <span className="font-normal normal-case tracking-normal">· opcional</span>
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {POSITIONS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPosition(id === position ? "" : id)}
            className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center ${
              position === id
                ? "border-gold bg-gold/20 text-gold shadow-[0_0_0_1px_rgba(232,184,74,0.35)]"
                : "btn-option text-cream"
            }`}
          >
            <span className="text-sm font-semibold">{id}</span>
            <span className="text-[9px] leading-tight text-mute">{POSITION_LABEL[id]}</span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs uppercase tracking-widest text-mute">
        País <span className="font-normal normal-case tracking-normal">· opcional</span>
      </p>
      <div className="grid grid-cols-8 gap-1">
        {NATIONALITIES.map((id) => (
          <button
            key={id}
            type="button"
            title={NATION_LABEL[id] ?? id}
            aria-label={NATION_LABEL[id] ?? id}
            onClick={() => setNationality(id === nationality ? "" : id)}
            className={`flex h-11 items-center justify-center rounded-xl border text-lg ${
              nationality === id
                ? "border-gold bg-gold/20 shadow-[0_0_0_1px_rgba(232,184,74,0.35)]"
                : "btn-option"
            }`}
          >
            {FLAG[id] ?? id}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs uppercase tracking-widest text-mute">
        Mano <span className="font-normal normal-case tracking-normal">· opcional</span>
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {HANDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setHanded(id === handed ? "" : id)}
            className={`h-11 rounded-xl border text-sm ${
              handed === id
                ? "border-gold bg-gold/20 text-gold shadow-[0_0_0_1px_rgba(232,184,74,0.35)]"
                : "btn-option text-cream"
            }`}
          >
            {HAND_LABEL[id]}
          </button>
        ))}
      </div>
      <button
        type="submit"
        className="btn-primary mt-1 h-14 text-lg"
      >
        Empezar carrera
      </button>
    </form>
  );
}
