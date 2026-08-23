import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../components/MarketingHeader";

export const metadata: Metadata = {
  title: "Carreras de ejemplo",
  description: "Tres trayectorias posibles en TheClutch: estrella, especialista y regreso a casa.",
};
const cases = [
  ["Del banco al cartel", "Pedir minutos quema la relación con el míster, pero abre un traspaso y una carrera como titular."],
  ["La última bola", "Un perfil con clutch alto acepta la presión de un partido clave, pagando el riesgo en carga y fatiga."],
  ["Volver a casa", "Después de años en América, renunciar a sueldo puede devolver protagonismo y cerrar el legado en el club de origen."],
];
export default function CasesPage() {
  return (
    <main>
      <MarketingHeader
        current="Casos"
        eyebrow="Trayectorias simuladas"
        title="No hay dos carreras iguales"
        description="Son ejemplos del sistema, no testimonios de usuarios ni resultados garantizados."
      />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {cases.map(([title, body], index) => (
          <article key={title} className="surface rounded-2xl border border-line p-4">
            <span className="font-display text-3xl text-gold">0{index + 1}</span>
            <h2 className="mt-2 font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">{body}</p>
          </article>
        ))}
      </div>
      <Link href="/#daily" className="btn-primary mt-7 flex h-14 items-center justify-center">Escribe la tuya</Link>
    </main>
  );
}
