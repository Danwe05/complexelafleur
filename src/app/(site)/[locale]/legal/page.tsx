import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? dictionaries[locale].legal.title : undefined };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale].legal;
  const s = await getSettings();
  const policy = locale === "fr" ? s.cancellation_policy_fr : s.cancellation_policy_en;

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>{t.title}</h1>
          <p className="lead">{t.lead}</p>
        </div>
      </div>
      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <h2>{t.publisher}</h2>
          <p>{t.publisherText}</p>
          <h2 id="confidentialite" style={{ scrollMarginTop: 90 }}>{t.privacy}</h2>
          <p>{t.privacyText}</p>
          {policy && (
            <>
              <h2>{t.cancel}</h2>
              <p>{policy}</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
