import { database, ensureObservabilitySchema } from "../../../server/database";

const DEVICES = new Set(["móvil", "tablet", "ordenador"]);
const MOMENTS = new Set(["Inicio", "Durante una decisión", "Historial", "Final de carrera"]);

type FeedbackBody = {
  rating?: unknown;
  device?: unknown;
  moment?: unknown;
  comment?: unknown;
  website?: unknown;
};

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4_096) return Response.json({ ok: false }, { status: 413 });
  const body = await request.json().catch(() => null) as FeedbackBody | null;
  if (!body || body.website) return Response.json({ ok: false }, { status: 400 });
  const rating = Number(body.rating);
  const device = String(body.device ?? "");
  const moment = String(body.moment ?? "");
  const comment = String(body.comment ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !DEVICES.has(device) || !MOMENTS.has(moment) || comment.length < 5 || comment.length > 1_000) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const sql = database();
  if (!sql) return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  try {
    await ensureObservabilitySchema(sql);
    await sql`insert into feedback_entries (rating, device, moment, comment) values (${rating}, ${device}, ${moment}, ${comment})`;
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    console.error(JSON.stringify({ type: "db_error", operation: "feedback_insert" }));
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }
}
