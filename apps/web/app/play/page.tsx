import { Suspense } from "react";
import { PlayClient } from "../../components/PlayClient";

export default function PlayPage() {
  return (
    <Suspense fallback={<p className="text-mute">Cargando carrera…</p>}>
      <PlayClient />
    </Suspense>
  );
}
