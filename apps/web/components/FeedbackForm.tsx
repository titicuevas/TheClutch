"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { track } from "../lib/telemetry";

export function FeedbackForm() {
  const [status, setStatus] = useState("");
  useEffect(() => track("feedback_open"), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    track("feedback_prepare");
    const form = new FormData(event.currentTarget);
    const text = [
      "FEEDBACK THECLUTCH",
      `Valoración: ${form.get("rating")}/5`,
      `Dispositivo: ${form.get("device")}`,
      `Momento: ${form.get("moment")}`,
      `Comentario: ${form.get("comment")}`,
      `Navegador: ${navigator.userAgent}`,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Feedback TheClutch", text });
        setStatus("Informe compartido. Gracias por probar la carrera.");
      } else {
        await navigator.clipboard.writeText(text);
        setStatus("Informe copiado. Envíalo por el canal por el que recibiste la prueba.");
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setStatus("No se pudo compartir. Selecciona y copia el comentario manualmente.");
    }
  }

  return (
    <form onSubmit={submit} className="surface mt-6 space-y-4 rounded-3xl border border-line p-5">
      <fieldset><legend className="text-sm font-semibold">¿Te apetecía jugar otra carrera?</legend><div className="mt-2 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((value) => <label key={value} className="btn-option flex min-h-11 cursor-pointer items-center justify-center rounded-xl has-[:checked]:border-gold has-[:checked]:bg-gold/15"><input className="sr-only" type="radio" name="rating" value={value} required /><span>{value}</span></label>)}</div></fieldset>
      <label className="block text-sm font-semibold">Dispositivo<select name="device" required className="mt-2 h-11 w-full rounded-xl border border-line bg-ink px-3 text-cream"><option value="móvil">Móvil</option><option value="tablet">Tablet</option><option value="ordenador">Ordenador</option></select></label>
      <label className="block text-sm font-semibold">¿Dónde estabas?<select name="moment" required className="mt-2 h-11 w-full rounded-xl border border-line bg-ink px-3 text-cream"><option>Inicio</option><option>Durante una decisión</option><option>Historial</option><option>Final de carrera</option></select></label>
      <label className="block text-sm font-semibold">¿Qué mejorarías?<textarea name="comment" required minLength={5} maxLength={1000} rows={5} className="mt-2 w-full rounded-xl border border-line bg-ink p-3 text-cream" placeholder="Algo que no entendí, me gustó o me frenó…" /></label>
      <p className="text-xs leading-relaxed text-mute">No se envía nada a TheClutch automáticamente. Tu dispositivo abrirá el menú para compartir o copiará el informe.</p>
      <button className="btn-primary h-14 w-full text-lg" type="submit">Preparar feedback</button>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-good">{status}</p>
    </form>
  );
}
