import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TheClutch — Carrera de basket",
    short_name: "TheClutch",
    description: "Simula una carrera de baloncesto, toma decisiones y construye tu legado.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090c",
    theme_color: "#e23d2d",
    lang: "es",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
