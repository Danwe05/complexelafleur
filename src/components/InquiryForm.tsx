"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";

type Props = {
  locale: Locale;
  t: Dictionary["inquiry"];
  kind: "contact" | "quote" | "spa";
  /** Choix proposés dans la liste « type » (quote et spa). */
  options?: string[];
  typeLabel?: string;
};

export function InquiryForm({ locale, t, kind, options = [], typeLabel }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("sending");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          locale,
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          eventType: fd.get("eventType") || undefined,
          eventDate: fd.get("eventDate") || undefined,
          guests: fd.get("guests") ? Number(fd.get("guests")) : undefined,
          message: fd.get("message"),
          website: fd.get("website"), // piège à robots
        }),
      });
      if (!res.ok) throw new Error();
      form.reset();
      setState("ok");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-grid" noValidate={false}>
      <div className="field">
        <label htmlFor={`${kind}-name`}>{t.name}</label>
        <input id={`${kind}-name`} name="name" required minLength={2} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor={`${kind}-phone`}>{t.phone}</label>
        <input id={`${kind}-phone`} name="phone" type="tel" required autoComplete="tel" />
      </div>
      <div className="field full">
        <label htmlFor={`${kind}-email`}>{t.email}</label>
        <input id={`${kind}-email`} name="email" type="email" autoComplete="email" />
      </div>
      {kind !== "contact" && (
        <>
          <div className="field">
            <label htmlFor={`${kind}-eventType`}>{typeLabel ?? t.eventType}</label>
            <select id={`${kind}-eventType`} name="eventType">
              {options.map((ev) => (
                <option key={ev}>{ev}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${kind}-eventDate`}>{t.eventDate}</label>
            <input id={`${kind}-eventDate`} name="eventDate" type="date" />
          </div>
          <div className="field">
            <label htmlFor={`${kind}-eventGuests`}>{t.guests}</label>
            <input id={`${kind}-eventGuests`} name="guests" type="number" min={1} max={2000} inputMode="numeric" />
          </div>
        </>
      )}
      <div className="field full">
        <label htmlFor={`${kind}-message`}>{t.message}</label>
        <textarea id={`${kind}-message`} name="message" required maxLength={2000} />
      </div>
      {/* Champ piège : invisible pour les humains */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />
      <div className="full">
        <button type="submit" className="btn btn-primary" disabled={state === "sending"}>
          {state === "sending" ? t.sending : t.send}
        </button>
      </div>
      <div className="full" aria-live="polite">
        {state === "ok" && <p className="alert alert-ok">{t.success}</p>}
        {state === "error" && <p className="alert alert-error">{t.error}</p>}
      </div>
    </form>
  );
}
