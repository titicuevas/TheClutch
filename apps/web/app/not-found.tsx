import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[72dvh] flex-col items-center justify-center text-center">
      <p className="font-display text-8xl text-gold">404</p>
      <h1 className="font-display mt-3 text-3xl">Fuera de la cancha</h1>
      <p className="mt-3 max-w-sm text-sm text-mute">
        Esta ruta no aparece en el calendario. Vuelve al vestuario y empieza una carrera.
      </p>
      <Link href="/" className="btn-primary mt-7 flex h-14 w-full max-w-xs items-center justify-center">
        Volver al inicio
      </Link>
    </main>
  );
}
