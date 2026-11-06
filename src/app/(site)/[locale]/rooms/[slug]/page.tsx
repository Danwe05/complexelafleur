import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Photo } from "@/components/Photo";
import { RoomBookingBox } from "@/components/RoomBookingBox";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getRoomBySlug, getRooms, getSettings } from "@/lib/data";
import { formatHour } from "@/lib/contact";
import { formatFcfa } from "@/lib/format";
import { AMENITY_GROUPS, findAmenity } from "@/lib/amenities";
import { amenityIcon, amenityLabel, roomPhotos } from "@/lib/rooms-ui";

const wrap = "mx-auto w-full max-w-[1280px] px-5 lg:px-8";
const serif = "font-[family-name:var(--display)]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8962a]";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const room = await getRoomBySlug(slug);
  if (!room) return {};
  const name = (locale === "fr" ? room.name_fr : room.name_en) || room.name_fr;
  const description = (locale === "fr" ? room.description_fr : room.description_en) || undefined;
  const photo = roomPhotos(room)[0];
  return {
    title: name,
    description,
    alternates: { languages: { fr: `/fr/rooms/${slug}`, en: `/en/rooms/${slug}` } },
    openGraph: { title: name, description, images: photo?.startsWith("http") ? [photo] : undefined },
  };
}

export default async function RoomDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [room, rooms, s] = await Promise.all([getRoomBySlug(slug), getRooms(), getSettings()]);
  if (!room) notFound();

  const t = dictionaries[locale];
  const r = t.rooms;
  const name = (locale === "fr" ? room.name_fr : room.name_en) || room.name_fr;
  const description = (locale === "fr" ? room.description_fr : room.description_en) || room.description_fr;
  const policy = locale === "fr" ? s.cancellation_policy_fr : s.cancellation_policy_en || s.cancellation_policy_fr;

  // Équipements regroupés comme dans l'admin ; ceux hors catalogue dans « Autres »
  const groups = AMENITY_GROUPS.map((g) => ({
    title: locale === "fr" ? g.fr : g.en,
    items: g.items.filter((a) => room.amenities.some((v) => findAmenity(v) === a)).map((a) => a.fr),
  })).filter((g) => g.items.length > 0);
  const others = room.amenities.filter((v) => !findAmenity(v));
  if (others.length) groups.push({ title: r.otherAmenities, items: others });

  const otherRooms = rooms.filter((x) => x.id !== room.id).slice(0, 3);

  return (
    <>
      {/* Fil d'Ariane */}
      <nav aria-label="Breadcrumb" className={`${wrap} pt-6`}>
        <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[13px] text-[#5d6b63]">
          <li>
            <Link href={`/${locale}`} className={`text-[#5d6b63] no-underline hover:underline ${focus}`}>{t.nav.home}</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/rooms`} className={`text-[#5d6b63] no-underline hover:underline ${focus}`}>{t.rooms.title}</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#0f3b2d]">{name}</li>
        </ol>
      </nav>

      <div className={`${wrap} grid gap-8 pt-6 pb-16 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-12 lg:gap-y-8 lg:pb-20`}>
        {/* Haut de la colonne principale : photo + titre */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl">
            <Photo images={roomPhotos(room)} alt={name} tone="green" icon="bed" className="h-full w-full rounded-none!" />
          </div>

          <header className="mt-7">
            <h1 className={`m-0 ${serif} text-4xl font-bold leading-tight text-[#0f3b2d] lg:text-5xl`}>{name}</h1>
            <p className="mt-3 mb-0 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-[#5d6b63]">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="user" size={17} className="text-[#a8780f]" /> {r.upTo(room.capacity)}
              </span>
              <span>
                <strong className="text-[#0f3b2d]">{formatFcfa(room.price_per_night, locale)}</strong> {r.perNight}
              </span>
            </p>
          </header>
        </div>

        {/* Réservation : juste sous le titre sur mobile, colonne de droite (fixe au défilement) sur ordinateur */}
        <aside aria-label={r.bookTitle} className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <RoomBookingBox
            locale={locale}
            roomName={name}
            roomSlug={room.slug}
            price={room.price_per_night}
            capacity={Math.max(1, room.capacity)}
            whatsapp={s.whatsapp || s.phone2}
          />
        </aside>

        {/* Suite de la colonne principale : description, équipements, infos */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          {description && (
            <section aria-labelledby="about-room" className="lg:mt-2">
              <h2 id="about-room" className={`m-0 ${serif} text-2xl font-bold text-[#0f3b2d]`}>{r.aboutRoom}</h2>
              <p className="mt-3 mb-0 max-w-2xl text-[15px] leading-relaxed text-[#3d4a43]">{description}</p>
            </section>
          )}

          {groups.length > 0 && (
            <section aria-labelledby="amenities" className="mt-10">
              <h2 id="amenities" className={`m-0 ${serif} text-2xl font-bold text-[#0f3b2d]`}>{r.amenitiesTitle}</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {groups.map((g) => (
                  <div key={g.title}>
                    <h3 className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d6b63]">{g.title}</h3>
                    <ul className="mt-2.5 mb-0 grid list-none gap-2 p-0">
                      {g.items.map((a) => (
                        <li key={a} className="flex items-center gap-2.5 text-[15px] text-[#1d2b25]">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f3ead3] text-[#a8780f]">
                            <Icon name={amenityIcon(a)} size={16} />
                          </span>
                          {amenityLabel(a, locale)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="good-to-know" className="mt-10 rounded-2xl bg-[#f4f6f2] p-6">
            <h2 id="good-to-know" className={`m-0 ${serif} text-2xl font-bold text-[#0f3b2d]`}>{r.goodToKnow}</h2>
            <ul className="mt-4 mb-0 grid list-none gap-3 p-0 text-[15px] text-[#1d2b25] sm:grid-cols-2">
              <li className="flex items-center gap-2.5">
                <Icon name="clock" size={18} className="text-[#a8780f]" /> {r.checkIn(formatHour(s.checkin_time, locale))}
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="clock" size={18} className="text-[#a8780f]" /> {r.checkOut(formatHour(s.checkout_time, locale))}
              </li>
              {s.breakfast_start && s.breakfast_end && (
                <li className="flex items-center gap-2.5">
                  <Icon name="coffee" size={18} className="text-[#a8780f]" />{" "}
                  {r.breakfast(formatHour(s.breakfast_start, locale), formatHour(s.breakfast_end, locale))}
                </li>
              )}
              <li className="flex items-center gap-2.5">
                <Icon name="headset" size={18} className="text-[#a8780f]" /> {r.reception}
              </li>
            </ul>
            {policy && (
              <>
                <h3 className="mt-6 mb-0 text-[13px] font-semibold text-[#0f3b2d]">{r.cancellation}</h3>
                <p className="mt-1.5 mb-0 text-sm leading-relaxed whitespace-pre-line text-[#5d6b63]">{policy}</p>
              </>
            )}
          </section>
        </div>

      </div>

      {otherRooms.length > 0 && (
        <section aria-labelledby="other-rooms" className="bg-[#f4f6f2] py-14">
          <div className={wrap}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="other-rooms" className={`m-0 ${serif} text-3xl font-bold text-[#0f3b2d]`}>{r.otherRooms}</h2>
              <Link href={`/${locale}/rooms`} className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8a620b] no-underline hover:underline ${focus}`}>
                {r.allRooms} <Icon name="arrow" size={14} />
              </Link>
            </div>
            <ul className="mt-6 mb-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {otherRooms.map((o, i) => {
                const oname = (locale === "fr" ? o.name_fr : o.name_en) || o.name_fr;
                return (
                  <li key={o.id}>
                    <Link
                      href={`/${locale}/rooms/${o.slug}`}
                      className={`group block overflow-hidden rounded-2xl bg-white no-underline ring-1 ring-[#0f3b2d]/[0.06] transition-shadow hover:shadow-[0_20px_40px_-20px_rgba(15,59,45,0.35)] ${focus}`}
                    >
                      <div className="aspect-[16/10] overflow-hidden">
                        <Photo src={roomPhotos(o)[0]} alt="" tone={i === 1 ? "gold" : "green"} icon="bed" className="h-full w-full rounded-none!" />
                      </div>
                      <div className="flex items-center justify-between gap-3 p-4">
                        <span className="font-semibold text-[#0f3b2d]">{oname}</span>
                        <span className="text-sm text-[#5d6b63]">
                          <strong className="text-[#0f3b2d]">{formatFcfa(o.price_per_night, locale)}</strong> {r.perNight}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
