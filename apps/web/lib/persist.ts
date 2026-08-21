import { SCHEMA_VERSION, type CareerState } from "@theclutch/engine";

export function runStorageKey(
  seed: string,
  position?: string,
  nationality?: string,
  handed?: string,
  givenName?: string,
): string {
  return `theclutch:s${SCHEMA_VERSION}:${seed}:${position ?? ""}:${nationality ?? ""}:${handed ?? ""}:${givenName ?? ""}`;
}

export function assignedStorageKey(mode: "daily" | "challenge", id: string, runSeed: string): string {
  return `theclutch:s${SCHEMA_VERSION}:${mode}:${id}:${runSeed}`;
}

export function officialDailyKey(date: string): string {
  return `theclutch:daily:official:${date}`;
}

export function loadOfficialDaily(date: string): { runSeed: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(officialDailyKey(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { runSeed?: string };
    if (!parsed.runSeed) return null;
    return { runSeed: parsed.runSeed };
  } catch {
    return null;
  }
}

export function markOfficialDaily(date: string, runSeed: string): void {
  if (typeof window === "undefined") return;
  const current = loadOfficialDaily(date);
  if (current && current.runSeed !== runSeed) return;
  window.localStorage.setItem(officialDailyKey(date), JSON.stringify({ runSeed }));
}

export function loadRun(key: string): CareerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareerState;
    if (typeof parsed.retired !== "boolean" || !parsed.player || !parsed.world?.team) return null;
    if (typeof parsed.schemaVersion !== "number") return null;
    if (parsed.schemaVersion < SCHEMA_VERSION - 2 || parsed.schemaVersion > SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRun(key: string, state: CareerState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(state));
}

export function clearRun(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}
