import { DailyPanel } from "../components/DailyPanel";
import { StartForm } from "../components/StartForm";
import { TeamCrest } from "../components/TeamCrest";
import Link from "next/link";

export const metadata = { title: "Juega gratis", description: "Empieza una carrera de baloncesto en segundos, toma decisiones y construye tu legado." };

const PREVIEW = [
  { id: "tm_harbor", name: "Harbor Wolves" },
  { id: "tm_iron", name: "Iron Wings" },
  { id: "tm_crown", name: "Crown Storm" },
  { id: "tm_atlas", name: "Atlas Fire" },
];

export default function HomePage() {
  return (
    <main className="flex min-h-[90dvh] flex-col justify-between gap-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 jersey-card px-5 pb-6 pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full border-[10px] border-clutch/25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 top-6 h-24 w-24 rounded-full border-[3px] border-gold/35"
        />
        <p className="relative text-xs uppercase tracking-[0.35em] text-gold">Carrera de basket</p>
        <h1 className="font-display relative mt-3 text-5xl leading-[0.9] text-cream drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          THE
          <br />
          CLUTCH
        </h1>
        <p className="relative mt-4 max-w-[20rem] text-sm leading-relaxed text-mute">
          Tú eres el jugador. Un botón simula el año. Los giros te paran.
        </p>
        <Link href="#daily" className="btn-primary relative mt-5 flex h-14 w-full items-center justify-center text-lg sm:w-64">Jugar ahora</Link>
        <div className="relative mt-5 flex items-center gap-2">
          {PREVIEW.map((club) => (
            <TeamCrest key={club.id} teamId={club.id} teamName={club.name} size={44} />
          ))}
        </div>
      </header>

      <DailyPanel />

      <section id="como-jugar" className="surface rounded-3xl border border-line p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Cómo se juega</p>
        <h2 className="font-display mt-2 text-3xl">Una carrera en tres gestos</h2>
        <ol className="mt-4 grid gap-3 text-sm text-mute sm:grid-cols-3">
          <li><strong className="block text-cream">1. Crea</strong>Una carta única.</li>
          <li><strong className="block text-cream">2. Decide</strong>Draft, equipo y momentos clutch.</li>
          <li><strong className="block text-cream">3. Deja legado</strong>Títulos, premios y clubes.</li>
        </ol>
      </section>

      <StartForm />

      <p className="text-center text-xs text-mute/80">Alpha · mundo ficticio · Daily local · sin cuentas ni ranking</p>
    </main>
  );
}
