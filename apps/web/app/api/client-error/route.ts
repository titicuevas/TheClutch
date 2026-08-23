import { database, ensureObservabilitySchema } from "../../../server/database";

const CATEGORIES = new Set(["render_error", "runtime_error", "promise_rejection"]);
const ROUTES = new Set(["home", "play", "feedback", "other"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { category?: unknown; route?: unknown } | null;
  if (!body || !CATEGORIES.has(String(body.category)) || !ROUTES.has(String(body.route))) {
    return Response.json({ ok: false }, { status: 400 });
  }
  console.error(JSON.stringify({ type: "client_error", category: body.category, route: body.route, at: new Date().toISOString() }));
  const sql = database();
  if (sql) {
    try {
      await ensureObservabilitySchema(sql);
      await sql`insert into client_errors (category, route) values (${String(body.category)}, ${String(body.route)})`;
    } catch {
      console.error(JSON.stringify({ type: "db_error", operation: "client_error_insert" }));
    }
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
