import type { Metadata } from "next";
import { FeedbackForm } from "../../components/FeedbackForm";
import { MarketingHeader } from "../../components/MarketingHeader";

export const metadata: Metadata = {
  title: "Enviar feedback",
  description: "Comparte cómo fue tu carrera de prueba en TheClutch sin enviar datos automáticamente.",
};

export default function FeedbackPage() {
  return (
    <main>
      <MarketingHeader
        current="Feedback"
        eyebrow="Pre-alpha"
        title="Ayúdanos a afinar la carrera"
        description="Tarda menos de un minuto. No escribas información personal."
      />
      <FeedbackForm />
    </main>
  );
}
