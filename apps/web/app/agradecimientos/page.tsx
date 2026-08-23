import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../components/MarketingHeader";

export const metadata: Metadata = {
  title: "Agradecimientos",
  description: "Créditos y agradecimientos del simulador independiente TheClutch.",
};

export default function ThanksPage() {
  return (
    <main>
      <MarketingHeader current="Agradecimientos" eyebrow="Gracias" title="Esto se construye en equipo" />
      <div className="surface mt-6 rounded-3xl border border-line p-5 text-sm leading-relaxed text-mute">
        <p>Gracias a quienes prueban carreras, detectan decisiones sin filo y ayudan a que el juego se lea mejor en móvil.</p>
        <p className="mt-4">TheClutch es un proyecto independiente con mundo, nombres y equipos ficticios. No está afiliado a ligas o clubes reales.</p>
        <p className="mt-4"><strong className="text-cream">Compromiso de respuesta:</strong> durante la alpha revisamos el feedback recibido, pero todavía no ofrecemos un canal de soporte ni un plazo garantizado. Publicaremos aquí un contacto y un SLA real cuando existan.</p>
      </div>
      <Link href="/#daily" className="btn-primary mt-7 flex h-14 items-center justify-center">Jugar el Daily</Link>
    </main>
  );
}
