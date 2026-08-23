"use client";

import { useEffect } from "react";
import { reportClientError } from "../lib/clientError";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError("render_error"), []);
  return (
    <html lang="es">
      <body className="bg-ink text-cream">
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 text-center">
          <p className="font-display text-sm uppercase tracking-widest text-gold">Tiempo muerto</p>
          <h1 className="mt-3 font-display text-3xl">Algo salió mal</h1>
          <p className="mt-3 text-mute">El error se ha registrado sin enviar datos de tu carrera. Puedes volver a intentarlo.</p>
          <button className="btn-primary mt-6 h-14" onClick={reset}>Reintentar</button>
          <a className="mt-4 min-h-11 content-center underline" href="/">Volver al inicio</a>
        </main>
      </body>
    </html>
  );
}
