import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Photo } from "@/components/Photo";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? dictionaries[locale].about.title : undefined };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale].about;

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
            <h2>{t.storyTitle}</h2>
            <p>{t.story}</p>
            <p className="muted">{t.story2}</p>
          </div>
          <Photo src="/images/about.jpg" alt={t.storyTitle} tone="green" icon="lotus" className="about-photo" />
        </div>
      </section>
      <section className="section section-tint">
        <div className="container">
          <h2>{t.valuesTitle}</h2>
          <ul className="ticks">
            {t.values.map((v) => (
              <li key={v}>
                <Icon name="check" size={18} />
                {v}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
