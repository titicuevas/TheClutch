import { Archivo_Black, Source_Sans_3 } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "../components/SiteFooter";
import { siteUrl } from "../lib/siteUrl";
import { PwaRegister } from "../components/PwaRegister";
import { ClientErrorMonitor } from "../components/ClientErrorMonitor";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "TheClutch — Simulador de carrera de baloncesto", template: "%s | TheClutch" },
  description: "Crea un jugador, decide su carrera y descubre su legado en un simulador de baloncesto gratuito y rápido.",
  openGraph: { title: "TheClutch", description: "Tu carrera. Tus decisiones. Tu legado.", type: "website", locale: "es_ES", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "TheClutch", description: "Tu carrera. Tus decisiones. Tu legado.", images: ["/opengraph-image"] },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "TheClutch", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${sans.variable} font-sans court-grid antialiased`}>
        <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-8 pt-6 sm:max-w-xl md:max-w-2xl md:px-8">
          {children}
          <SiteFooter />
          <PwaRegister />
          <ClientErrorMonitor />
        </div>
      </body>
    </html>
  );
}
