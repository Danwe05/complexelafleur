"use client";

import { useState } from "react";
import { addDaysIso, formatFcfa, nightsBetween, todayIso } from "@/lib/format";
import { waBookingMessage, waHref } from "@/lib/contact";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icon";

type Props = {
  locale: Locale;
  roomName: string;
  roomSlug: string;
  price: number;
  capacity: number;
  whatsapp: string | null;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8962a]";
const field = "mt-1 block min-h-11 w-full rounded-xl border border-[#d5ddd7] bg-white px-3 text-[15px] text-[#0f3b2d]";

/**
 * Encadré de réservation de la page chambre : dates + personnes,
 * total estimé, puis WhatsApp (message pré-rempli) ou réservation en ligne.
 */
export function RoomBookingBox({ locale, roomName, roomSlug, price, capacity, whatsapp }: Props) {
  // Textes chargés ici : un Server Component ne peut pas transmettre les fonctions du dictionnaire
  const t = dictionaries[locale].rooms;
  const ts = dictionaries[locale].search;
  const today = todayIso();
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDaysIso(today, 1));
  const [guests, setGuests] = useState(Math.min(2, capacity));
  const nights = Math.max(1, nightsBetween(checkIn, checkOut) || 1);

  const wa = whatsapp
    ? waHref(whatsapp, waBookingMessage(locale, { room: roomName, checkIn, checkOut, guests }))
    : "";
  const online = `/${locale}/book?${new URLSearchParams({ room: roomSlug, checkIn, checkOut, guests: String(guests) })}`;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_24px_48px_-28px_rgba(15,59,45,0.45)] ring-1 ring-[#0f3b2d]/[0.08]">
      <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#5d6b63]">{t.bookTitle}</p>
      <p className="mt-2 mb-0 text-[#0f3b2d]">
        <span className="text-3xl font-bold">{formatFcfa(price, locale)}</span>{" "}
        <span className="text-sm text-[#5d6b63]">{t.perNight}</span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="text-[12px] font-medium text-[#5d6b63]">
          {ts.checkIn}
          <input
            type="date"
            className={`${field} ${focus}`}
            min={today}
            value={checkIn}
            onChange={(e) => {
              const v = e.target.value;
              setCheckIn(v);
              if (v && checkOut <= v) setCheckOut(addDaysIso(v, 1));
            }}
          />
        </label>
        <label className="text-[12px] font-medium text-[#5d6b63]">
          {ts.checkOut}
          <input
            type="date"
            className={`${field} ${focus}`}
            min={addDaysIso(checkIn || today, 1)}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
        <label className="col-span-2 text-[12px] font-medium text-[#5d6b63]">
          {ts.guests}
          <select className={`${field} ${focus}`} value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {Array.from({ length: capacity }, (_, k) => k + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-4 mb-0 flex items-baseline justify-between border-t border-[#e6ebe7] pt-4 text-sm text-[#5d6b63]" aria-live="polite">
        <span>
          {t.estimate} · {t.nights(nights)}
        </span>
        <span className="text-lg font-bold text-[#0f3b2d]">{formatFcfa(price * nights, locale)}</span>
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0d7a4f] px-5 text-[15px] font-semibold text-white no-underline transition-colors hover:bg-[#095c3b] ${focus}`}
          >
            <Icon name="whatsapp" size={20} /> {t.waBook}
          </a>
        )}
        <a
          href={online}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#0f3b2d] px-5 text-sm font-semibold text-[#0f3b2d] no-underline transition-colors hover:bg-[#eef2ec] ${focus}`}
        >
          {t.bookOnline} <Icon name="arrow" size={15} />
        </a>
      </div>
      <p className="mt-3 mb-0 text-xs leading-relaxed text-[#5d6b63]">{t.bookNote}</p>
    </div>
  );
}
