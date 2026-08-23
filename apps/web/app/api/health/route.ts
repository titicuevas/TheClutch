export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, service: "theclutch-web" }, { headers: { "Cache-Control": "no-store" } });
}
