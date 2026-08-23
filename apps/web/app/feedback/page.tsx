import type { Metadata } from "next";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { FeedbackForm } from "../../components/FeedbackForm";

export const metadata: Metadata = { title: "Enviar feedback", description: "Comparte cómo fue tu carrera de prueba en TheClutch sin enviar datos automáticamente." };
export default function FeedbackPage() { return <main><Breadcrumbs current="Feedback" /><p className="text-xs uppercase tracking-[0.3em] text-gold">Pre-alpha</p><h1 className="font-display mt-2 text-4xl">Ayúdanos a afinar la carrera</h1><p className="mt-4 text-sm leading-relaxed text-mute">Tarda menos de un minuto. No escribas información personal.</p><FeedbackForm /></main>; }
