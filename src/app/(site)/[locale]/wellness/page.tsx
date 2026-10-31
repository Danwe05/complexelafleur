import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/Icon";
import { InquiryForm } from "@/components/InquiryForm";
import { Photo, type Tone } from "@/components/Photo";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/data";

const meta: Record<string, { icon: IconName; tone: Tone; src: string }> = {
  jacuzzi: { icon: "jacuzzi", tone: "violet", src: "/images/wellness/jacuzzi.jpg" },
  hammam: { icon: "steam", tone: "warm", src: "/images/wellness/hammam.jpg" },
  sauna: { icon: "flame", tone: "gold", src: "/images/wellness/sauna.jpg" },
  piscine: { icon: "waves", tone: "water", src: "/images/wellness/piscine.jpg" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? dictionaries[locale].wellness.title : undefined };
}

export default async function WellnessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionaries[locale];
  const t = d.wellness;
  const s = await getSettings();
  const phone = s.phone?.replace(/\s/g, "");

  return (
    <>
      <section className="spa-hero">
        <div className="spa-hero-bg" style={{ backgroundImage: "url(/images/wellness/hero.jpg)" }} />
        <div className="spa-hero-overlay" />
        <div className="container">
          <h1>{t.title}</h1>
          <p className="lead">{t.lead}</p>
          <p style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: 0 }}>
            <a href="#reserver" className="btn btn-gold">
              <Icon name="calendar" size={18} /> {t.cta}
            </a>
            {phone && (
              <a href={`tel:${phone}`} className="btn btn-ghost">
                <Icon name="phone" size={18} /> {s.phone}
              </a>
            )}
          </p>
        </div>
      </section>

      <div className="container">
        <nav className="spa-nav" aria-label={t.title}>
          {t.spaces.map((sp) => (
            <a key={sp.id} href={`#${sp.id}`}>
              <Icon name={meta[sp.id].icon} size={30} />
              <strong style={{ textTransform: "capitalize" }}>{sp.title.replace(/^(Le |La |The )/, "")}</strong>
              <span>{sp.feel}</span>
            </a>
          ))}
        </nav>

        {t.spaces.map((sp) => (
          <section key={sp.id} id={sp.id} className="space" aria-labelledby={`${sp.id}-title`}>
            <Photo src={meta[sp.id].src} alt={sp.title} tone={meta[sp.id].tone} icon={meta[sp.id].icon} />
            <div>
              <span className="feel">
                <Icon name="lotus" size={18} /> {sp.feel}
              </span>
              <h2 id={`${sp.id}-title`}>{sp.title}</h2>
              <p>{sp.text}</p>
              <ul className="ticks">
                {sp.points.map((p) => (
                  <li key={p}>
                    <Icon name="check" size={18} />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="info">
                <span><Icon name="clock" size={16} /> {t.infoHours}</span>
                <span><Icon name="calendar" size={16} /> {t.infoBook}</span>
              </p>
              <a href="#reserver" className="btn btn-green btn-sm">{t.cta}</a>
            </div>
          </section>
        ))}

        <p className="notice" style={{ marginBottom: 64 }}>{t.safety}</p>
      </div>

      <section id="reserver" className="section section-tint" style={{ scrollMarginTop: 76 }}>
        <div className="container" style={{ maxWidth: 780 }}>
          <h2>{t.formTitle}</h2>
          <p className="lead">{t.formText}</p>
          <InquiryForm locale={locale} t={d.inquiry} kind="spa" options={t.types} typeLabel={t.typeLabel} />
        </div>
      </section>
    </>
  );
}
