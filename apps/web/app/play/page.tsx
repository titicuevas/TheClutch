import { Suspense } from "react";
import { PlayClient } from "../../components/PlayClient";

export const metadata = { title: "Jugar carrera", description: "Toma decisiones temporada a temporada y lleva a tu jugador hasta la retirada." };

export default function PlayPage() {
  return (
    <Suspense fallback={<p className="text-mute">Cargando carrera…</p>}>
      <PlayClient />
    </Suspense>
  );
}
