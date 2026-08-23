import Link from "next/link";

const links = [
  ["Cómo se juega", "/#como-jugar"],
  ["Casos", "/casos"],
  ["FAQs", "/faq"],
  ["Feedback", "/feedback"],
  ["Agradecimientos", "/agradecimientos"],
  ["Privacidad", "/privacidad"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-line py-6 text-xs text-mute">
      <nav aria-label="Enlaces del sitio" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {links.map(([label, href]) => <Link key={href} href={href} className="min-h-11 content-center hover:text-gold">{label}</Link>)}
      </nav>
      <p className="mt-3 text-center">Alpha independiente · equipos ficticios · sin compras</p>
    </footer>
  );
}
