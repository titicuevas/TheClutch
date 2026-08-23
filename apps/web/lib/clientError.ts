export type ClientErrorCategory = "render_error" | "runtime_error" | "promise_rejection";

function routeBucket(pathname: string): "home" | "play" | "feedback" | "other" {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/jugar")) return "play";
  if (pathname.startsWith("/feedback")) return "feedback";
  return "other";
}

export function reportClientError(category: ClientErrorCategory): void {
  const payload = JSON.stringify({ category, route: routeBucket(window.location.pathname) });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/client-error", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/client-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}
