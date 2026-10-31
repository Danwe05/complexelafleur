"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Icon } from "./Icon";

const links = [
  ["", "home"],
  ["rooms", "rooms"],
  ["dining", "dining"],
  ["wellness", "wellness"],
  ["events", "events"],
  ["about", "about"],
  ["contact", "contact"],
] as const;

type Props = { locale: Locale; t: Dictionary["nav"]; name: string; phones: string[] };

export function SiteHeader({ locale, t, name, phones }: Props) {
  const pathname = usePathname() || `/${locale}`;
  const [open, setOpen] = useState(false);
  const rest = pathname.replace(/^\/(fr|en)/, "");
  const other: Locale = locale === "fr" ? "en" : "fr";
  const book = `/${locale}/book`;

  return (
    <header className="site-header">
      <div className="container header-row">
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
            {phones[0] && (
              <a href={`tel:${phones[0].replace(/\s/g, "")}`} className="btn btn-ghost btn-ghost-dark">
                <Icon name="phone" size={18} /> {phones.join(" / ")}
              </a>
            )}
            <Link href={book} className="btn btn-gold">
              <Icon name="calendar" size={18} /> {t.book}
            </Link>
          </div>
        </nav>

        {phones[0] && (
          <a className="header-contact" href={`tel:${phones[0].replace(/\s/g, "")}`} aria-label={`${t.call} ${phones.join(", ")}`}>
            <span className="dot"><Icon name="phone" size={16} /></span>
            <span>
              {phones.map((p) => (
                <span key={p} style={{ display: "block" }}>{p}</span>
              ))}
            </span>
          </a>
        )}
        <Link href={book} className="btn btn-gold header-cta">
          <Icon name="calendar" size={18} /> {t.book}
        </Link>
      </div>
    </header>
  );
}
