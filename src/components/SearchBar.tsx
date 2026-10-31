"use client";

import { useState } from "react";
import { addDaysIso, todayIso } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icon";

type Props = {
  locale: Locale;
  t: Dictionary["search"];
  title?: string;
  initial?: { checkIn?: string; checkOut?: string; guests?: number };
  flat?: boolean;
};

/** Formulaire GET vers /[locale]/book : fonctionne aussi sans JavaScript. */
export function SearchBar({ locale, t, title, initial, flat }: Props) {
  const today = todayIso();
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? today);
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? addDaysIso(today, 1));
  const minOut = addDaysIso(checkIn || today, 1);

  return (
    <form action={`/${locale}/book`} method="get" className={`search-card${flat ? " flat" : ""}`} aria-label={title}>
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
          <select id="guests" name="guests" defaultValue={String(initial?.guests ?? 2)}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className="btn btn-gold">
        <Icon name="search" size={20} /> {t.submit}
      </button>
    </form>
  );
}
