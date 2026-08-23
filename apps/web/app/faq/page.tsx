import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../components/MarketingHeader";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas sobre carreras, Daily, guardado, equipos y privacidad en TheClutch.",
};
const faqs = [
  ["¿Es gratis?", "Sí. Esta alpha no incluye compras ni suscripciones."],
  ["¿Controlo los partidos?", "No. Tú tomas decisiones de carrera; el motor simula las temporadas y los partidos clave."],
  ["¿Cómo se guarda mi carrera?", "En este dispositivo, dentro del almacenamiento local del navegador. No hay cuenta ni guardado cloud."],
  ["¿Qué es el Daily?", "Una carta igual para todo el mundo cada día. Por ahora es local y no tiene ranking oficial."],
  ["¿Los equipos son reales?", "No. El mundo, los clubes y los escudos son ficticios."],
  ["¿La suerte decide todo?", "No. El RNG aporta incertidumbre, pero atributos, rol, estado y tus decisiones modifican el camino."],
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text },
    })),
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader current="FAQs" eyebrow="Ayuda" title="Preguntas frecuentes" />
      <div className="mt-6 space-y-3">
        {faqs.map(([question, answer]) => (
          <details key={question} className="surface rounded-2xl border border-line p-4">
            <summary className="cursor-pointer font-semibold">{question}</summary>
            <p className="mt-3 text-sm leading-relaxed text-mute">{answer}</p>
          </details>
        ))}
      </div>
      <Link href="/#daily" className="btn-primary mt-7 flex h-14 items-center justify-center">Jugar ahora</Link>
    </main>
  );
}
