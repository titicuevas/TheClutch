import { isTelemetryEvent, isViewportBucket } from "../../../lib/telemetrySchema";

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const body = await request.json().catch(() => null) as { event?: unknown; viewport?: unknown } | null;
  if (!body || !isTelemetryEvent(body.event) || !isViewportBucket(body.viewport)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  console.info(JSON.stringify({ type: "funnel", event: body.event, viewport: body.viewport, at: new Date().toISOString() }));
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
