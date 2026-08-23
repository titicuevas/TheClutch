import Link from "next/link";

export function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Migas de pan" className="mb-5 text-sm text-mute">
      <ol className="flex items-center gap-2"><li><Link href="/" className="hover:text-gold">Inicio</Link></li><li aria-hidden>/</li><li aria-current="page" className="text-cream">{current}</li></ol>
    </nav>
  );
}
