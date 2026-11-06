import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/data";
import { directionsHref, displayPhone, formatHour, telHref, waBookingMessage, waHref } from "@/lib/contact";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? dictionaries[locale].contact.title : undefined };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionaries[locale];
  const t = d.contact;
  const s = await getSettings();
  const wa = waHref(s.whatsapp || s.phone2, waBookingMessage(locale));
  const bookingPhones = [s.phone2, s.phone3].filter((p): p is string => !!p);

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>{t.title}</h1>
          <p className="lead">{t.lead}</p>
        </div>
      </div>
      <section className="section">
        <div className="container split">
          <div>
            <ul className="contact-list">
              <li>
                <strong>{t.address}</strong>
                {s.address}
                <br />
                <a href={directionsHref(s.maps_url)} target="_blank" rel="noopener noreferrer">{d.home.directions}</a>
              </li>
              <li>
                <strong>{d.home.hoursLabel}</strong>
                {d.home.hours(formatHour(s.open_time, locale), formatHour(s.close_time, locale))}
                <br />
                {d.home.reception247}
              </li>
              {s.phone && (
                <li>
                  <strong>{d.home.reception}</strong>
                  <a href={telHref(s.phone)}>{displayPhone(s.phone)}</a>
                </li>
              )}
              {bookingPhones.length > 0 && (
                <li>
                  <strong>{d.home.bookings}</strong>
                  {bookingPhones.map((p, i) => (
                    <span key={p}>
                      {i > 0 && " / "}
                      <a href={telHref(p)}>{displayPhone(p)}</a>
                    </span>
                  ))}
                </li>
              )}
              {wa && (
                <li>
                  <strong>{t.whatsapp}</strong>
                  <a href={wa} target="_blank" rel="noopener noreferrer">{d.nav.whatsapp} · {displayPhone(s.whatsapp || s.phone2)}</a>
                </li>
              )}
              {s.email && (
                <li>
                  <strong>{t.email}</strong>
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2>{t.formTitle}</h2>
            <InquiryForm locale={locale} t={d.inquiry} kind="contact" />
          </div>
        </div>
      </section>
    </>
  );
}
