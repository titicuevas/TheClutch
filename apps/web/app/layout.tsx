import { Archivo_Black, Source_Sans_3 } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

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
  title: "TheClutch",
  description: "Simulador de carrera de baloncesto. Fácil de empezar, rápido de jugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${sans.variable} font-sans court-grid antialiased`}>
        <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-8 pt-6 md:max-w-lg md:px-6">{children}</div>
      </body>
    </html>
  );
}
