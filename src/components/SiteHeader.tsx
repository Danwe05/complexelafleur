"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Icon } from "./Icon";
import { displayPhone, telHref } from "@/lib/contact";

const links = [
  ["", "home"],
  ["rooms", "rooms"],
  ["dining", "dining"],
  ["wellness", "wellness"],
  ["events", "events"],
  ["about", "about"],
  ["contact", "contact"],
] as const;

export type HeaderContact = { label: string; phone: string };
type Props = { locale: Locale; t: Dictionary["nav"]; name: string; contacts: HeaderContact[] };

export function SiteHeader({ locale, t, name, contacts }: Props) {
  const pathname = usePathname() || `/${locale}`;
  const [open, setOpen] = useState(false);
  const rest = pathname.replace(/^\/(fr|en)/, "");
  const other: Locale = locale === "fr" ? "en" : "fr";
  const book = `/${locale}/book`;

  return (
    <header className="site-header">
      {/* maxWidth en ligne : la classe Tailwind « container » limitait l'en-tête à 1280px et coupait le bouton Réserver */}
      <div className="container header-row" style={{ maxWidth: 1640 }}>
        <Link href={`/${locale}`} className="brand" aria-label={name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="emblem" src="/images/logo-emblem.png" alt="" width={49} height={54} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wordmark" src="/images/logo-wordmark.png" alt="" width={189} height={27} />
        </Link>

        <button className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((v) => !v)}>
          {t.menu}
        </button>

        <nav id="main-nav" className="nav" data-open={open} aria-label="Navigation principale" onClick={() => setOpen(false)}>
          {links.map(([path, key]) => {
            const href = `/${locale}${path ? `/${path}` : ""}`;
            return (
              <Link key={key} href={href} aria-current={pathname === href ? "page" : undefined}>
                {t[key]}
              </Link>
            );
          })}
          <span className="lang" role="group" aria-label={t.language}>
            <Link href={`/${locale}${rest}`} aria-current="true" hrefLang={locale}>{locale.toUpperCase()}</Link>
            <Link href={`/${other}${rest}`} hrefLang={other} lang={other}>{other.toUpperCase()}</Link>
          </span>
          <div className="nav-extra">
            {contacts.map((c) => (
              <a key={c.phone} href={telHref(c.phone)} className="btn btn-ghost btn-ghost-dark">
                <Icon name="phone" size={18} /> {c.label} · {displayPhone(c.phone)}
              </a>
            ))}
            <Link href={book} className="btn btn-gold">
              <Icon name="calendar" size={18} /> {t.book}
            </Link>
          </div>
        </nav>

        {contacts.length > 0 && (
          <div className="header-contact">
            <span className="dot"><Icon name="phone" size={16} /></span>
            <span>
              {contacts.map((c) => (
                <a key={c.phone} href={telHref(c.phone)} style={{ display: "block", color: "inherit", textDecoration: "none" }}>
                  <span style={{ fontWeight: 500, color: "var(--muted)" }}>{c.label} </span>
                  {displayPhone(c.phone)}
                </a>
              ))}
            </span>
          </div>
        )}
        <Link href={book} className="btn btn-gold header-cta">
          <Icon name="calendar" size={18} /> {t.book}
        </Link>
      </div>
    </header>
  );
}
