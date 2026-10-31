import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../globals.css";
import { Icon } from "@/components/Icon";
import { SiteHeader } from "@/components/SiteHeader";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = dictionaries[locale];
  return {
    title: { default: t.meta.title, template: "%s — Complexe Lafleur Obala" },
    description: t.meta.description,
    alternates: { languages: { fr: "/fr", en: "/en" } },
    icons: { icon: "/images/logo-emblem.png" },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  const s = await getSettings();
  const phones = [s.phone, s.phone2].filter((p): p is string => !!p);
  const wa = (s.whatsapp || "").replace(/[^\d]/g, "");
  const socials = [
    { name: "Facebook", icon: "facebook" as const, href: s.facebook_url },
    { name: "Instagram", icon: "instagram" as const, href: s.instagram_url },
    { name: "WhatsApp", icon: "whatsapp" as const, href: wa ? `https://wa.me/${wa}` : "" },
    { name: "YouTube", icon: "youtube" as const, href: s.youtube_url },
  ].filter((x) => x.href);

  const quick = [
    ["", t.nav.home],
    ["rooms", t.nav.rooms],
    ["dining", t.nav.dining],
    ["wellness", t.nav.wellness],
    ["events", t.nav.events],
    ["about", t.nav.about],
    ["contact", t.nav.contact],
    ["book", t.footer.reservation],
  ];

  return (
    <html lang={locale}>
      <body>
        <a href="#contenu" className="sr-only">Contenu principal</a>
        <SiteHeader locale={locale} t={t.nav} name={s.hotel_name} phones={phones} />
        <main id="contenu">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <div className="footer-grid">
              <div className="footer-brand">
                <Link href={`/${locale}`} aria-label={s.hotel_name} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/logo-emblem.png" alt="" style={{ height: 56, width: "auto" }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/logo-wordmark.png" alt="" style={{ height: 24, width: "auto" }} />
                </Link>
              </div>
              <div>
                <h3>{t.footer.find}</h3>
                <ul className="footer-contact">
                  {s.address && <li><Icon name="pin" size={16} /> {s.address}</li>}
                  {phones.length > 0 && (
                    <li>
                      <Icon name="phone" size={16} />
                      <span>
                        {phones.map((p, i) => (
                          <span key={p}>
                            {i > 0 && " / "}
                            <a href={`tel:${p.replace(/\s/g, "")}`}>{p}</a>
                          </span>
                        ))}
                      </span>
                    </li>
                  )}
                  {s.email && <li><Icon name="mail" size={16} /> <a href={`mailto:${s.email}`}>{s.email}</a></li>}
                </ul>
              </div>
              <div>
                <h3>{t.footer.quick}</h3>
                <ul className="footer-links">
                  {quick.map(([path, label]) => (
                    <li key={path || "home"}>
                      <Link href={`/${locale}${path ? `/${path}` : ""}`}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              {socials.length > 0 && (
                <div>
                  <h3>{t.footer.follow}</h3>
                  <div className="socials">
                    {socials.map((x) => (
                      <a key={x.name} href={x.href!} target="_blank" rel="noopener noreferrer" aria-label={x.name}>
                        <Icon name={x.icon} size={18} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} {s.hotel_name}. {t.footer.rights}</span>
              <nav aria-label="Informations légales">
                <Link href={`/${locale}/legal`}>{t.footer.legal}</Link>
                <Link href={`/${locale}/legal#confidentialite`}>{t.footer.privacy}</Link>
                <Link href="/admin">{t.footer.admin}</Link>
              </nav>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
