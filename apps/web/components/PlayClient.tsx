"use client";

import {
  NATIONALITIES,
  dailyPlayerSeed,
  isIsoDate,
  parseChallengeCode,
  type CareerMode,
  type Handed,
  type Position,
} from "@theclutch/engine";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { assignedStorageKey, clearRun, runStorageKey } from "../lib/persist";
import { playHref } from "../lib/playHref";
import { generateRunSeed, nextRerollSeed } from "../lib/seed";
import { CareerPlay } from "./CareerPlay";

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const HANDS: Handed[] = ["left", "right"];

function parsePosition(value: string | null): Position | undefined {
  if (!value) return undefined;
  return POSITIONS.includes(value as Position) ? (value as Position) : undefined;
}

function parseNation(value: string | null): string | undefined {
  if (!value) return undefined;
  return NATIONALITIES.includes(value) ? value : undefined;
}

function parseHanded(value: string | null): Handed | undefined {
  if (!value) return undefined;
  return HANDS.includes(value as Handed) ? (value as Handed) : undefined;
}

function parseMode(value: string | null): CareerMode {
  if (value === "daily" || value === "challenge") return value;
  return "free";
}

export function PlayClient() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = parseMode(params.get("mode"));
  const date = params.get("date")?.trim() ?? "";
  const code = params.get("code")?.trim() ?? "";
  const position = parsePosition(params.get("pos"));
  const nationality = parseNation(params.get("nat"));
  const handed = parseHanded(params.get("hand"));
  const givenName = params.get("name")?.trim() || undefined;
  const [seed, setSeed] = useState(() => params.get("seed")?.trim() || `free-${Date.now().toString(36)}`);
  const [runSeed, setRunSeed] = useState(() => params.get("run")?.trim() || generateRunSeed());
  const [epoch, setEpoch] = useState(0);

  const challenge = mode === "challenge" ? parseChallengeCode(code) : null;
  const dailyOk = mode === "daily" && isIsoDate(date);
  const assigned = dailyOk || Boolean(challenge);
  const playerSeed = dailyOk ? dailyPlayerSeed(date) : challenge?.playerSeed ?? seed;
  const dailyDate = dailyOk ? date : challenge?.dailyDate;
  const storageKey = assigned
    ? assignedStorageKey(mode === "challenge" ? "challenge" : "daily", dailyOk ? date : code.toUpperCase(), runSeed)
    : runStorageKey(seed, position, nationality, handed, givenName);

  function reroll() {
    const next = nextRerollSeed(seed);
    setSeed(next);
    router.replace(playHref({ seed: next, position, nationality, handed, givenName }));
  }

  function reset() {
    clearRun(storageKey);
    setEpoch((value) => value + 1);
  }

  function funRun() {
    const next = generateRunSeed();
    setRunSeed(next);
    setEpoch((value) => value + 1);
    if (dailyOk) {
      router.replace(playHref({ mode: "daily", date, run: next }));
    } else if (challenge) {
      router.replace(playHref({ mode: "challenge", code: code.toUpperCase(), run: next }));
    }
  }

  if (mode === "daily" && !dailyOk) {
    return <p className="text-mute">Daily no válido.</p>;
  }
  if (mode === "challenge" && !challenge) {
    return <p className="text-mute">Código no válido.</p>;
  }

  return (
    <CareerPlay
      key={`${storageKey}:${epoch}`}
      mode={assigned ? (mode === "challenge" ? "challenge" : "daily") : "free"}
      playerSeed={playerSeed}
      runSeed={assigned ? runSeed : seed}
      dailyDate={dailyDate}
      position={dailyOk ? undefined : challenge ? challenge.position : position}
      nationality={dailyOk ? undefined : challenge ? challenge.nationality : nationality}
      handed={dailyOk ? undefined : challenge ? challenge.handed : handed}
      givenName={dailyOk ? undefined : challenge ? challenge.givenName : givenName}
      storageKey={storageKey}
      onReroll={assigned ? undefined : reroll}
      onReset={reset}
      onFunRun={assigned ? funRun : undefined}
    />
  );
}
