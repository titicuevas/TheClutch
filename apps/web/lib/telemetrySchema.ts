export const TELEMETRY_EVENTS = [
  "landing_view",
  "daily_start",
  "free_start",
  "challenge_start",
  "first_recap_lt5",
  "first_recap_5_10",
  "first_recap_10_20",
  "first_recap_20_plus",
  "career_finished",
  "replay_start",
  "feedback_open",
  "feedback_prepare",
] as const;

export const VIEWPORT_BUCKETS = ["mobile", "tablet", "desktop"] as const;

export type TelemetryEvent = (typeof TELEMETRY_EVENTS)[number];
export type ViewportBucket = (typeof VIEWPORT_BUCKETS)[number];

export function isTelemetryEvent(value: unknown): value is TelemetryEvent {
  return typeof value === "string" && (TELEMETRY_EVENTS as readonly string[]).includes(value);
}

export function isViewportBucket(value: unknown): value is ViewportBucket {
  return typeof value === "string" && (VIEWPORT_BUCKETS as readonly string[]).includes(value);
}
