import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Photo } from "@/components/Photo";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getRooms, getSettings } from "@/lib/data";
import { waBookingMessage, waHref } from "@/lib/contact";
import { formatFcfa } from "@/lib/format";
import { amenityIcon, amenityLabel, guestRange, roomPhotos } from "@/lib/rooms-ui";

/* Même palette et même famille de cartes que la page d'accueil */
const wrap = "mx-auto w-full max-w-[1280px] px-5 lg:px-8";
const serif = "font-[family-name:var(--display)]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8962a]";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? dictionaries[locale].rooms.title : undefined };
}

export default async function RoomsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  const [rooms, s] = await Promise.all([getRooms(), getSettings()]);
  const waNumber = s.whatsapp || s.phone2;

  return (
    <>
      {/* En-tête de page */}
      <section className="bg-[#0f3b2d] text-white">
        <div className={`${wrap} py-14 lg:py-20`}>
          <h1 className={`m-0 ${serif} text-4xl font-bold leading-tight text-white lg:text-5xl`}>{t.rooms.title}</h1>
          <p className="mt-3 mb-0 max-w-xl text-[15px] leading-relaxed text-white/80">{t.rooms.lead}</p>
        </div>
      </section>

      {/* Liste des chambres : grille de cartes verticales */}
      <div className={`${wrap} grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 lg:py-16`}>
        {rooms.map((room, i) => {
          const name = locale === "fr" ? room.name_fr : room.name_en;
          const description = locale === "fr" ? room.description_fr : room.description_en;
          const [min, max] = guestRange(room.capacity);

          return (
            <article
              key={room.id}
              id={room.slug}
              aria-labelledby={`${room.slug}-title`}
              className="group flex scroll-mt-28 flex-col rounded-3xl bg-white p-3 ring-1 ring-[#0f3b2d]/[0.06] transition-shadow hover:shadow-[0_20px_40px_-20px_rgba(15,59,45,0.35)]"
            >
              {/* Photo encadrée, prix en badge */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Photo images={roomPhotos(room)} alt={name} tone={i === 2 ? "gold" : "green"} icon="bed" className="h-full w-full rounded-none!" />
                <p className="absolute left-3 top-3 z-10 m-0 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-bold leading-none text-[#0f3b2d] shadow-sm backdrop-blur">
                  {formatFcfa(room.price_per_night, locale)}{" "}
                  <span className="font-normal text-[#5d6b63]">{t.rooms.perNight}</span>
                </p>
              </div>

              <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 id={`${room.slug}-title`} className={`m-0 ${serif} text-2xl font-bold leading-tight text-[#0f3b2d]`}>
                    <Link href={`/${locale}/rooms/${room.slug}`} className={`text-inherit no-underline hover:underline ${focus}`}>
                      {name}
                    </Link>
                  </h2>
                  <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#8a620b]">
                    <Icon name="user" size={14} /> {min}-{max}
                    <span className="sr-only">{t.rooms.persons(min, max)}</span>
                  </span>
                </div>
                {description && (
                  <p className="mt-2 mb-0 text-sm leading-relaxed text-[#5d6b63]">{description}</p>
                )}

                {room.amenities.length > 0 && (
                  <ul className="mt-4 mb-0 flex list-none flex-wrap gap-2 p-0">
                    {room.amenities.map((a) => (
                      <li
                        key={a}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4f6f2] px-2.5 py-1.5 text-xs text-[#1d2b25]"
                      >
                        <Icon name={amenityIcon(a)} size={13} className="text-[#a8780f]" />
                        {amenityLabel(a, locale)}
                      </li>
                    ))}
                  </ul>
                )}

                <div aria-hidden="true" className="min-h-6 flex-1" />

                <Link
                  href={`/${locale}/rooms/${room.slug}`}
                  className={`mb-3 inline-flex min-h-9 items-center gap-1.5 self-start text-[13px] font-semibold text-[#8a620b] no-underline hover:underline ${focus}`}
                >
                  {t.rooms.details} <Icon name="arrow" size={14} />
                </Link>
                {/* Réserver : WhatsApp en premier (chambre pré-remplie), réservation en ligne en second */}
                <div className="flex flex-col gap-2">
                  {waNumber && (
                    <a
                      href={waHref(waNumber, waBookingMessage(locale, { room: name }))}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t.rooms.waBook} : ${name}`}
                      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0d7a4f] bg-white px-5 py-3 text-sm font-semibold text-[#0d7a4f] no-underline transition-colors hover:bg-[#0d7a4f] hover:text-white ${focus}`}
                    >
                      <Icon name="whatsapp" size={18} /> {t.rooms.waBook}
                    </a>
                  )}
                  <Link
                    href={`/${locale}/book?room=${room.slug}`}
                    aria-label={`${t.rooms.bookOnline} : ${name}`}
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0f3b2d] px-5 py-2.5 text-sm font-semibold text-[#0f3b2d] no-underline transition-colors hover:bg-[#eef2ec] ${focus}`}
                  >
                    {t.rooms.bookOnline} <Icon name="arrow" size={15} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}