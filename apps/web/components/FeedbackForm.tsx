"use client";

import { FormEvent, useEffect, useState } from "react";
import { track } from "../lib/telemetry";

export function FeedbackForm() {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => track("feedback_open"), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSending(true);
    setStatus("Enviando…");
    track("feedback_prepare");
    const form = new FormData(formElement);
    const report = {
      rating: Number(form.get("rating")),
      device: String(form.get("device")),
      moment: String(form.get("moment")),
      comment: String(form.get("comment")),
      website: String(form.get("website") ?? ""),
    };
    const text = [
      "FEEDBACK THECLUTCH",
      `Valoración: ${report.rating}/5`,
      `Dispositivo: ${report.device}`,
      `Momento: ${report.moment}`,
      `Comentario: ${report.comment}`,
    ].join("\n");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (response.ok) {
        formElement.reset();
        setStatus("Feedback recibido. Gracias por ayudarnos a mejorar TheClutch.");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "Feedback TheClutch", text });
        setStatus("El envío directo no estaba disponible; informe compartido. Gracias por probar la carrera.");
      } else {
        await navigator.clipboard.writeText(text);
        setStatus("El envío directo no estaba disponible; informe copiado. Envíalo por el canal de la prueba.");
      }
    } catch (error) {
      if ((error as DOMException).name === "AbortError") setStatus("Envío cancelado. Tu comentario sigue en el formulario.");
      else setStatus("No se pudo enviar ni compartir. Tu comentario sigue en el formulario para que puedas copiarlo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface mt-6 space-y-4 rounded-3xl border border-line p-5">
      <fieldset>
        <legend className="text-sm font-semibold">¿Te apetecía jugar otra carrera?</legend>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="btn-option flex min-h-11 cursor-pointer items-center justify-center rounded-xl has-[:checked]:border-gold has-[:checked]:bg-gold/15">
              <input className="sr-only" type="radio" name="rating" value={value} required />
              <span>{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">
        Dispositivo
        <select name="device" required className="mt-2 h-11 w-full rounded-xl border border-line bg-ink px-3 text-cream">
          <option value="móvil">Móvil</option><option value="tablet">Tablet</option><option value="ordenador">Ordenador</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        ¿Dónde estabas?
        <select name="moment" required className="mt-2 h-11 w-full rounded-xl border border-line bg-ink px-3 text-cream">
          <option>Inicio</option><option>Durante una decisión</option><option>Historial</option><option>Final de carrera</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        ¿Qué mejorarías?
        <textarea name="comment" required minLength={5} maxLength={1000} rows={5} className="mt-2 w-full rounded-xl border border-line bg-ink p-3 text-cream" placeholder="Algo que no entendí, me gustó o me frenó…" />
      </label>
      <label className="sr-only" aria-hidden="true">
        Sitio web
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <p className="text-xs leading-relaxed text-mute">Al pulsar enviar guardaremos estos cuatro campos para mejorar la alpha. Si el servicio no está disponible, podrás compartir o copiar el informe.</p>
      <button className="btn-primary h-14 w-full text-lg disabled:opacity-60" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar feedback"}</button>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-good">{status}</p>
    </form>
  );
}
