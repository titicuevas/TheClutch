export type TelemetryEvent =
  | "landing_view"
  | "daily_start"
  | "free_start"
  | "challenge_start"
  | "career_finished"
  | "replay_start"
  | "feedback_open"
  | "feedback_prepare";

export function track(event: TelemetryEvent) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  const body = JSON.stringify({
    event,
    viewport: window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/telemetry", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
}
