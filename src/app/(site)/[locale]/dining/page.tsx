import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? dictionaries[locale].dining.title : undefined };
}

export default async function DiningPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale].dining;
  const s = await getSettings();

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
            <h2>{t.restaurant}</h2>
            <p>{t.restaurantText}</p>
          </div>
          <div>
            <h2>{t.bar}</h2>
            <p>{t.barText}</p>
          </div>
        </div>
      </section>
      <section className="section section-tint">
        <div className="container split">
          <div>
            <h2>{t.hours}</h2>
            <p className="muted">{t.hoursNote}</p>
          </div>
          <div>
            <p>{t.menuNote}</p>
            {s.phone && (
              <a className="btn btn-primary" href={`tel:${s.phone.replace(/\s/g, "")}`}>{t.call}</a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
