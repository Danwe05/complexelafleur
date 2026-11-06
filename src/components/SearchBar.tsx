"use client";

import { useState } from "react";
import { addDaysIso, todayIso } from "@/lib/format";
import { waBookingMessage, waHref } from "@/lib/contact";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icon";

type Props = {
  locale: Locale;
  t: Dictionary["search"];
  title?: string;
  initial?: { checkIn?: string; checkOut?: string; guests?: number };
  flat?: boolean;
  /** Numéro WhatsApp réservations : affiche le bouton « Réserver sur WhatsApp ». */
  whatsapp?: string | null;
};

/** Formulaire GET vers /[locale]/book : fonctionne aussi sans JavaScript. */
export function SearchBar({ locale, t, title, initial, flat, whatsapp }: Props) {
  const today = todayIso();
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? today);
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? addDaysIso(today, 1));
  const [guests, setGuests] = useState(String(initial?.guests ?? 2));
  const minOut = addDaysIso(checkIn || today, 1);
  // Lien recalculé à chaque changement : dates et nombre de personnes partent dans le message.
  const wa = whatsapp ? waHref(whatsapp, waBookingMessage(locale, { checkIn, checkOut, guests })) : "";

  return (
    <form action={`/${locale}/book`} method="get" className={`search-card${flat ? " flat" : ""}${wa ? " has-wa" : ""}`} aria-label={title}>
      <div className="search-field">
        <Icon name="calendar" size={22} />
        <div className="inner">
          <label htmlFor="checkIn">{t.checkIn}</label>
          <input
            id="checkIn" name="checkIn" type="date" required min={today} value={checkIn}
            onChange={(e) => {
              const v = e.target.value;
              setCheckIn(v);
              if (v && checkOut <= v) setCheckOut(addDaysIso(v, 1));
            }}
          />
        </div>
      </div>
      <div className="search-field">
        <Icon name="calendar" size={22} />
        <div className="inner">
          <label htmlFor="checkOut">{t.checkOut}</label>
          <input id="checkOut" name="checkOut" type="date" required min={minOut} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
      </div>
      <div className="search-field">
        <Icon name="user" size={22} />
        <div className="inner">
          <label htmlFor="guests">{t.guests}</label>
          <select id="guests" name="guests" value={guests} onChange={(e) => setGuests(e.target.value)}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-wa">
          <Icon name="whatsapp" size={20} /> {t.whatsapp}
        </a>
      )}
      <button type="submit" className={wa ? "btn btn-outline-gold" : "btn btn-gold"}>
        <Icon name="search" size={20} /> {t.submit}
      </button>
    </form>
  );
}
