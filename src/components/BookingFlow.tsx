"use client";

import { useMemo, useState } from "react";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { formatDate, formatFcfa } from "@/lib/format";
import { Photo } from "./Photo";
import type { Locale } from "@/lib/types";

export type BookableRoom = {
  id: string;
  slug: string;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  remaining: number;
  images: string[];
};

type Props = {
  locale: Locale;
  rooms: BookableRoom[];
  nights: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  depositPercent: number;
  policy: string;
  initialRoomSlug?: string;
};

export function BookingFlow({ locale, rooms, nights, checkIn, checkOut, guests, depositPercent, policy, initialRoomSlug }: Props) {
  const d = dictionaries[locale];
  const t = d.book;

  const bookable = (r: BookableRoom) => r.remaining > 0 && r.capacity >= guests;
  const preselected = rooms.find((r) => r.slug === initialRoomSlug && bookable(r))?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(preselected);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = rooms.find((r) => r.id === selectedId) ?? null;
  const money = useMemo(() => {
    if (!selected) return null;
    const total = selected.pricePerNight * nights;
    const deposit = Math.ceil((total * depositPercent) / 100);
    return { total, deposit, balance: total - deposit };
  }, [selected, nights, depositPercent]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selected.id,
          checkIn,
          checkOut,
          guests,
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email") || "",
          notes: fd.get("notes") || "",
          locale,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.redirectUrl) {
        setError(t.errors[json.error] ?? t.errors.server_error);
        setSubmitting(false);
        return;
      }
      window.location.href = json.redirectUrl;
    } catch {
      setError(t.errors.server_error);
      setSubmitting(false);
    }
  }

  return (
    <div className="book-layout">
      <div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">{t.title}</legend>
          {rooms.map((r, i) => {
            const ok = bookable(r);
            const isSel = r.id === selectedId;
            return (
              <label key={r.id} className="option" data-selected={isSel} data-disabled={!ok}>
                <input
                  type="radio" name="room" className="sr-only" checked={isSel} disabled={!ok}
                  onChange={() => setSelectedId(r.id)}
                />
                <Photo images={r.images} alt="" tone={i === 2 ? "gold" : "green"} icon="bed" />
                <div>
                  <h3>{r.name}</h3>
                  <p className="muted" style={{ margin: "0 0 4px", fontSize: "0.95rem" }}>{r.description}</p>
                  <span className={`stock${r.remaining > 0 && r.remaining <= 2 ? " low" : ""}`}>
                    {r.remaining <= 0
                      ? t.soldOut
                      : r.capacity < guests
                        ? `${r.capacity} ${d.rooms.capacity}`
                        : t.left(r.remaining)}
                  </span>
                </div>
                <div className="option-price">
                  <div className="price">{formatFcfa(r.pricePerNight * nights, locale)}</div>
                  <small className="muted">{formatFcfa(r.pricePerNight, locale)} {d.rooms.perNight}</small>
                  <div style={{ marginTop: 6, fontWeight: 600 }}>{isSel ? t.selected : ok ? t.select : ""}</div>
                </div>
              </label>
            );
          })}
        </fieldset>

        {selected && (
          <form onSubmit={onSubmit} style={{ marginTop: 32 }} id="booking-form">
            <h2>{t.yourDetails}</h2>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="name">{t.name}</label>
                <input id="name" name="name" required minLength={2} autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="phone">{t.phone}</label>
                <input id="phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="6 90 00 00 01" aria-describedby="phone-help" />
                <span id="phone-help" className="help">{t.phoneHelp}</span>
              </div>
              <div className="field">
                <label htmlFor="email">{t.email}</label>
                <input id="email" name="email" type="email" autoComplete="email" aria-describedby="email-help" />
                <span id="email-help" className="help">{t.emailHelp}</span>
              </div>
              <div className="field full">
                <label htmlFor="notes">{t.notes}</label>
                <textarea id="notes" name="notes" maxLength={1000} />
              </div>
            </div>
            <div aria-live="polite" style={{ marginTop: 16 }}>
              {error && <p className="alert alert-error">{error}</p>}
            </div>
            <p style={{ marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? t.submitting : depositPercent > 0 ? t.submitPay : t.submitSend}
              </button>
            </p>
            {depositPercent > 0 && <p className="muted">{t.payNote}</p>}
          </form>
        )}
      </div>

      <aside className="summary" aria-label={t.summary}>
        <h3>{t.summary}</h3>
        <dl>
          <div><dt>{d.search.checkIn}</dt><dd>{formatDate(checkIn, locale)}</dd></div>
          <div><dt>{d.search.checkOut}</dt><dd>{formatDate(checkOut, locale)}</dd></div>
          <div><dt>{d.search.guests}</dt><dd>{guests}</dd></div>
          <div><dt>{t.nights(nights)}</dt><dd>{selected ? selected.name : "—"}</dd></div>
        </dl>
        {money ? (
          <>
            <hr />
            <dl>
              <div className="strong"><dt>{t.total}</dt><dd>{formatFcfa(money.total, locale)}</dd></div>
              {depositPercent > 0 ? (
                <>
                  <div><dt>{t.deposit(depositPercent)}</dt><dd>{formatFcfa(money.deposit, locale)}</dd></div>
                  <div><dt>{t.balance}</dt><dd>{formatFcfa(money.balance, locale)}</dd></div>
                </>
              ) : (
                <p className="muted" style={{ margin: 0 }}>{t.noDeposit}</p>
              )}
            </dl>
          </>
        ) : null}
        {policy && (
          <>
            <hr />
            <p style={{ fontSize: "0.92rem", margin: 0 }}>
              <strong>{t.cancelPolicy}.</strong> {policy}
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
