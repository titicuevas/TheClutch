import type { TelemetryEvent, ViewportBucket } from "./telemetrySchema";

function viewportBucket(width: number): ViewportBucket {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function track(event: TelemetryEvent) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  const body = JSON.stringify({
    event,
    viewport: viewportBucket(window.innerWidth),
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/telemetry", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
}
