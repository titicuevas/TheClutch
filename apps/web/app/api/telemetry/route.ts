import { isTelemetryEvent, isViewportBucket } from "../../../lib/telemetrySchema";
import { database, ensureObservabilitySchema } from "../../../server/database";

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const body = await request.json().catch(() => null) as { event?: unknown; viewport?: unknown } | null;
  if (!body || !isTelemetryEvent(body.event) || !isViewportBucket(body.viewport)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  console.info(JSON.stringify({ type: "funnel", event: body.event, viewport: body.viewport, at: new Date().toISOString() }));
  const sql = database();
  if (sql) {
    try {
      await ensureObservabilitySchema(sql);
      await sql`insert into funnel_events (event, viewport) values (${body.event}, ${body.viewport})`;
    } catch {
      console.error(JSON.stringify({ type: "db_error", operation: "funnel_insert" }));
    }
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
