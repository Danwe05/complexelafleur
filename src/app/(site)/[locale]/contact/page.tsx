import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/data";

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
  const wa = (s.whatsapp || "").replace(/[^\d]/g, "");

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
                {s.maps_url && (
                  <>
                    <br />
                    <a href={s.maps_url} target="_blank" rel="noopener noreferrer">{t.map}</a>
                  </>
                )}
              </li>
              {s.phone && (
                <li>
                  <strong>{t.phone}</strong>
                  {[s.phone, s.phone2].filter(Boolean).map((p, i) => (
                    <span key={p}>
                      {i > 0 && " / "}
                      <a href={`tel:${p!.replace(/\s/g, "")}`}>{p}</a>
                    </span>
                  ))}
                </li>
              )}
              {wa && (
                <li>
                  <strong>{t.whatsapp}</strong>
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">{s.whatsapp}</a>
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
