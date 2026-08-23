import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "TheClutch, simulador de carrera de baloncesto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, color: "#f4ead6", backgroundColor: "#08090c", backgroundImage: "radial-gradient(circle at 80% 20%, #e23d2d 0%, rgba(226,61,45,0) 32%)", fontFamily: "sans-serif" }}>
      <div style={{ color: "#e8b84a", fontSize: 26, letterSpacing: 8 }}>CARRERA DE BASKET</div>
      <div style={{ fontSize: 104, fontWeight: 900, marginTop: 20 }}>THE CLUTCH</div>
      <div style={{ fontSize: 38, color: "#c9c0b1", marginTop: 24 }}>Tu carrera. Tus decisiones. Tu legado.</div>
    </div>,
    size,
  );
}
