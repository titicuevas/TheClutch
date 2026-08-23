import type { Metadata } from "next";
import { MarketingHeader } from "../../components/MarketingHeader";
import { getObservabilityMetrics } from "../../server/metrics";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Estado de la alpha",
  description: "Métricas técnicas agregadas de los últimos siete días de TheClutch.",
  robots: { index: false, follow: false },
};

function percentage(value: number, total: number): string {
  return total ? `${Math.round((value / total) * 100)} %` : "—";
}

export default async function StatusPage() {
  const metrics = await getObservabilityMetrics();
  const starts = metrics.dailyStarts + metrics.freeStarts + metrics.challengeStarts;
  const cards = [
    ["Visitas", metrics.landingViews],
    ["Carreras iniciadas", starts],
    ["Primer recap", metrics.firstRecaps],
    ["Carreras terminadas", metrics.careersFinished],
    ["Feedback recibido", metrics.feedbackReceived],
    ["Errores de cliente", metrics.clientErrors],
  ] as const;
  return (
    <main>
      <MarketingHeader current="Estado" eyebrow="Alpha" title="Estado de la prueba" />
      <section className="surface mt-6 rounded-3xl border border-line p-5" aria-labelledby="metrics-title">
        <h2 id="metrics-title" className="font-display text-xl">Últimos 7 días</h2>
        {!metrics.available ? (
          <p className="mt-3 text-mute">Métricas no disponibles temporalmente. El juego sigue funcionando con normalidad.</p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {cards.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-ink/50 p-3">
                  <dt className="text-xs text-mute">{label}</dt>
                  <dd className="mt-1 font-display text-2xl text-gold">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 space-y-2 text-sm text-mute">
              <p>Inicio desde visita: <strong className="text-cream">{percentage(starts, metrics.landingViews)}</strong></p>
              <p>Primer recap desde inicio: <strong className="text-cream">{percentage(metrics.firstRecaps, starts)}</strong></p>
              <p>Finalización desde inicio: <strong className="text-cream">{percentage(metrics.careersFinished, starts)}</strong></p>
              <p>Repetición desde final: <strong className="text-cream">{percentage(metrics.replayStarts, metrics.careersFinished)}</strong></p>
            </div>
            {metrics.firstRecaps ? (
              <p className="mt-4 text-xs leading-relaxed text-mute">
                Tiempo hasta el primer recap · &lt;5 min {percentage(metrics.firstRecapLt5, metrics.firstRecaps)} · 5–10 min {percentage(metrics.firstRecap5To10, metrics.firstRecaps)} · 10–20 min {percentage(metrics.firstRecap10To20, metrics.firstRecaps)} · 20+ min {percentage(metrics.firstRecap20Plus, metrics.firstRecaps)}
              </p>
            ) : null}
          </>
        )}
        <p className="mt-5 text-xs leading-relaxed text-mute">Solo se muestran totales agregados. No se publican comentarios, carreras ni datos individuales.</p>
      </section>
    </main>
  );
}
