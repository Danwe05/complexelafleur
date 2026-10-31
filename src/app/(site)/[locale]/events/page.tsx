import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? dictionaries[locale].events.title : undefined };
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionaries[locale];
  const t = d.events;

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
            <h2>{t.typesTitle}</h2>
            <ul className="tags">
              {t.types.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p>{t.text}</p>
          </div>
          <div>
            <h2>{t.quoteTitle}</h2>
            <p className="muted">{t.quoteText}</p>
            <InquiryForm locale={locale} t={d.inquiry} kind="quote" options={t.types} typeLabel={d.inquiry.eventType} />
          </div>
        </div>
      </section>
    </>
  );
}
