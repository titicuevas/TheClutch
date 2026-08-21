import type { CareerMode, Handed, Position } from "@theclutch/engine";

export function playHref(opts: {
  mode?: CareerMode;
  seed?: string;
  date?: string;
  code?: string;
  run?: string;
  position?: Position | "";
  nationality?: string;
  handed?: Handed | "";
  givenName?: string;
}): string {
  const mode = opts.mode ?? "free";
  const params = new URLSearchParams();
  if (mode === "daily") {
    params.set("mode", "daily");
    if (opts.date) params.set("date", opts.date);
    if (opts.run) params.set("run", opts.run);
  } else if (mode === "challenge") {
    params.set("mode", "challenge");
    if (opts.code) params.set("code", opts.code);
    if (opts.run) params.set("run", opts.run);
  } else {
    params.set("seed", opts.seed ?? "");
    if (opts.position) params.set("pos", opts.position);
    if (opts.nationality) params.set("nat", opts.nationality);
    if (opts.handed) params.set("hand", opts.handed);
    if (opts.givenName?.trim()) params.set("name", opts.givenName.trim());
  }
  return `/play?${params.toString()}`;
}
