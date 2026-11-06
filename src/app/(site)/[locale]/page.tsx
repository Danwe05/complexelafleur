import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Photo, type Tone } from "@/components/Photo";
import { SearchBar } from "@/components/SearchBar";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getRooms, getSettings } from "@/lib/data";
import { directionsHref, displayPhone, formatHour, telHref, waBookingMessage, waHref } from "@/lib/contact";
import { formatFcfa } from "@/lib/format";
import { amenityIcon, amenityLabel, guestRange, roomPhotos } from "@/lib/rooms-ui";

const heroIcons: IconName[] = ["bed", "utensils", "waves", "lotus", "users"];
const stripIcons: IconName[] = ["snowflake", "wifi", "shield", "parking", "headset"];
const tileMeta: { id: string; src: string; tone: Tone; icon: IconName }[] = [
  { id: "piscine", src: "/images/wellness/piscine.jpg", tone: "water", icon: "waves" },
  { id: "jacuzzi", src: "/images/wellness/jacuzzi.jpg", tone: "violet", icon: "jacuzzi" },
  { id: "hammam", src: "/images/wellness/hammam.jpg", tone: "warm", icon: "steam" },
  { id: "sauna", src: "/images/wellness/sauna.jpg", tone: "gold", icon: "flame" },
];
const eventIcons: IconName[] = ["rings", "cake", "presentation", "sparkles"];

/*
 * Palette : vert #0f3b2d · vert profond #0a2a1e · or bouton #a8780f · or titre #b8861b · or clair #e8c766
 * Une seule famille de cartes : rounded-2xl, bordure très légère, ombre douce.
 */
const wrap = "mx-auto w-full max-w-[1280px] px-5 lg:px-8";
const serif = "font-[family-name:var(--display)]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8962a]";
const card = "overflow-hidden rounded-2xl bg-white ring-1 ring-[#0f3b2d]/[0.06] shadow-[0_1px_2px_rgba(15,59,45,0.04),0_12px_32px_-16px_rgba(15,59,45,0.22)]";
const btnGold = `inline-flex items-center gap-2 rounded-full bg-[#a8780f] px-5 py-2.5 text-[13px] font-medium text-white no-underline transition-colors hover:bg-[#8a620b] ${focus}`;
const btnWa = `inline-flex min-h-12 items-center gap-2.5 rounded-full bg-[#0d7a4f] px-6 py-3 text-[15px] font-semibold text-white no-underline shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-colors hover:bg-[#095c3b] ${focus}`;
const btnLight = `inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-[#0f3b2d] no-underline transition-colors hover:bg-[#f3efe4] ${focus}`;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  const h = t.home;
  const [allRooms, s] = await Promise.all([getRooms(), getSettings()]);
  const rooms = allRooms.slice(0, 3);
  const waNumber = s.whatsapp || s.phone2;
  const reception = s.phone;
  const bookingPhones = [s.phone2, s.phone3].filter((p): p is string => !!p);
  const directions = directionsHref(s.maps_url);
  // Atouts : les 5 fixes + le petit-déjeuner si ses horaires sont renseignés dans l'admin
  const services: { title: string; text: string; icon: IconName }[] = h.strip.map((x, i) => ({ ...x, icon: stripIcons[i] }));
  if (s.breakfast_start && s.breakfast_end) {
    services.push({ ...h.breakfast(formatHour(s.breakfast_start, locale), formatHour(s.breakfast_end, locale)), icon: "coffee" });
  }
  const roomTypes = allRooms.map((r) => (locale === "fr" ? r.name_fr : r.name_en)).filter(Boolean);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-[#0f3b2d] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/hero.jpg)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a2a1e]/90 via-[#0a2a1e]/55 to-transparent"
        />
        <div className={`${wrap} pb-28 pt-12 lg:pb-32 lg:pt-16`}>
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e8c766] lg:text-xs">{s.hotel_name}</p>
          <h1 className={`mt-4 mb-0 max-w-3xl ${serif} text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-[60px]`}>
            {h.headA}
            <span className="block text-[#e8c766]">{h.headB}</span>
          </h1>
          <p className="mt-5 mb-0 max-w-md text-[15px] leading-relaxed text-white/85 lg:text-base">{h.lead}</p>

          {reception && (
            <div className="mt-8">
              <a
                href={telHref(reception)}
                className={`inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-white/70 px-5 py-2.5 text-[14px] font-semibold text-white no-underline transition-colors hover:border-white hover:bg-white/10 ${focus}`}
              >
                <Icon name="phone" size={18} /> {h.callCta}
              </a>
            </div>
          )}
          <ul className="mt-8 flex list-none flex-wrap gap-x-8 gap-y-4 p-0">
            {h.features.map((f, i) => (
              <li key={f.title} className="flex items-center gap-2.5 text-xs leading-tight text-white/90">
                <Icon name={heroIcons[i]} size={26} className="shrink-0 text-[#e8c766]" />
                <span>
                  {f.title}
                  <br />
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Recherche ---------- */}
      <div className={`${wrap} relative z-10 -mt-14 lg:px-16 xl:px-28`}>
        <SearchBar locale={locale} t={t.search} whatsapp={waNumber} />
      </div>

      {/* ---------- Atouts ---------- */}
      <ul className={`${wrap} m-0 grid list-none grid-cols-2 gap-x-4 gap-y-8 pt-12 pb-10 sm:grid-cols-3 ${services.length === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
        {services.map((sv) => (
          <li key={sv.title} className="flex flex-col items-center text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f3ead3] text-[#a8780f]">
              <Icon name={sv.icon} size={22} />
            </span>
            <p className="mt-3 mb-0 text-[13px] font-semibold text-[#0f3b2d]">{sv.title}</p>
            <p className="mt-1 mb-0 max-w-[22ch] text-xs leading-snug text-[#5d6b63]">{sv.text}</p>
          </li>
        ))}
      </ul>

      {/* ---------- Informations utiles ---------- */}
      <section aria-labelledby="infos" className={`${wrap} pb-14`}>
        <div className={`${card} grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-[1fr_1.1fr_1.3fr_auto] lg:items-center lg:gap-8 lg:p-7`}>
          <h2 id="infos" className="sr-only">{h.infoTitle}</h2>

          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f3ead3] text-[#a8780f]">
              <Icon name="clock" size={20} />
            </span>
            <p className="m-0 leading-snug">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d6b63]">{h.hoursLabel}</span>
              <span className="mt-1 block text-[15px] font-semibold text-[#0f3b2d]">
                {h.hours(formatHour(s.open_time, locale), formatHour(s.close_time, locale))}
              </span>
              <span className="block text-[13px] text-[#5d6b63]">{h.reception247}</span>
            </p>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f3ead3] text-[#a8780f]">
              <Icon name="pin" size={20} />
            </span>
            <p className="m-0 leading-snug">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d6b63]">{h.addressLabel}</span>
              <span className="mt-1 block text-[15px] font-semibold text-[#0f3b2d]">{s.address}</span>
              <span className="block text-[13px] text-[#5d6b63]">{h.distance}</span>
            </p>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f3ead3] text-[#a8780f]">
              <Icon name="phone" size={20} />
            </span>
            <div className="leading-snug">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d6b63]">{h.phonesLabel}</span>
            <dl className="m-0 mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[14px]">
              {reception && (
                <>
                  <dt className="text-[#5d6b63]">{h.reception}</dt>
                  <dd className="m-0">
                    <a href={telHref(reception)} className={`font-semibold text-[#0f3b2d] no-underline hover:underline ${focus}`}>{displayPhone(reception)}</a>
                  </dd>
                </>
              )}
              {bookingPhones.length > 0 && (
                <>
                  <dt className="text-[#5d6b63]">{h.bookings}</dt>
                  <dd className="m-0 flex flex-wrap gap-x-2">
                    {bookingPhones.map((p, i) => (
                      <span key={p}>
                        <a href={telHref(p)} className={`font-semibold text-[#0f3b2d] no-underline hover:underline ${focus}`}>{displayPhone(p)}</a>
                        {i < bookingPhones.length - 1 && <span aria-hidden="true" className="text-[#5d6b63]"> /</span>}
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 sm:col-span-2 lg:col-span-1 lg:flex-col">
            {reception && (
              <a href={telHref(reception)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0f3b2d] px-5 text-[13px] font-semibold text-white no-underline transition-colors hover:bg-[#0a2a1e] ${focus}`}>
                <Icon name="phone" size={16} /> {h.call}
              </a>
            )}
            <a href={directions} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[#0f3b2d] px-5 text-[13px] font-semibold text-[#0f3b2d] no-underline transition-colors hover:bg-[#eef2ec] ${focus}`}>
              <Icon name="route" size={16} /> {h.directions}
            </a>

          </div>
        </div>
      </section>

      {/* ---------- Rangée 1 : Hébergements | Restaurant & Bar ---------- */}
      <div className={`${wrap} grid gap-6 pb-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`}>
        <section aria-labelledby="hebergements" className="flex flex-col">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="hebergements" className={`m-0 ${serif} text-3xl font-bold leading-tight text-[#0f3b2d] lg:text-[34px]`}>
                {h.lodgingA} <span className="text-[#b8861b]">{h.lodgingB}</span>
              </h2>
              <p className="mt-2 mb-0 max-w-md text-sm leading-relaxed text-[#5d6b63]">{h.lodgingLead}</p>
              {/* Catégories : les chambres actives de l'admin, dans l'ordre choisi */}
              {roomTypes.length > 0 && (
                <p className="mt-2 mb-0 max-w-xl text-[13px] leading-relaxed text-[#0f3b2d]">
                  <span className="font-semibold">{h.roomTypes} :</span>{" "}
                  {roomTypes.map((n, i) => (
                    <span key={n}>
                      {i > 0 && <span aria-hidden="true" className="text-[#b8861b]"> · </span>}
                      {n}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <Link
              href={`/${locale}/rooms`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-[#a8780f] px-4 text-[13px] font-semibold text-[#8a620b] no-underline transition-colors hover:bg-[#a8780f] hover:text-white ${focus}`}
            >
              {h.allRooms} <Icon name="arrow" size={14} />
            </Link>
          </div>

          <div className="mt-6 grid flex-1 gap-5 sm:grid-cols-3">
            {rooms.map((room, i) => {
              const name = locale === "fr" ? room.name_fr : room.name_en;
              const [min, max] = guestRange(room.capacity);
              return (
                <article key={room.id} className={`${card} flex flex-col`}>
                  <div className="aspect-[16/10] overflow-hidden sm:aspect-[4/3]">
                    <Photo images={roomPhotos(room)} alt={name} tone={i === 2 ? "gold" : "green"} icon="bed" className="h-full w-full" />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="m-0 font-[family-name:var(--body)] text-[15px] font-semibold text-[#0f3b2d]">{name}</h3>
                    <ul className="mt-2 mb-4 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[11px] text-[#5d6b63]">
                      <li className="inline-flex items-center gap-1">
                        <Icon name="user" size={12} className="text-[#b8861b]" /> {t.rooms.persons(min, max)}
                      </li>
                      {room.amenities.slice(0, 2).map((a) => (
                        <li key={a} className="inline-flex items-center gap-1">
                          <Icon name={amenityIcon(a)} size={12} className="text-[#b8861b]" /> {amenityLabel(a, locale)}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#eef1ec] pt-3.5">
                      <p className="m-0 leading-tight">
                        <span className="block text-base font-bold text-[#0f3b2d]">{formatFcfa(room.price_per_night, locale)}</span>
                        <span className="text-[11px] text-[#5d6b63]">{t.rooms.perNight}</span>
                      </p>
                      <Link
                        href={`/${locale}/rooms/${room.slug}`}
                        aria-label={`${h.details} : ${name}`}
                        title={h.details}
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0f4a38] text-white transition-colors hover:bg-[#0f3b2d] ${focus}`}
                      >
                        <Icon name="arrow" size={16} />
                      </Link>
                    </div>
                    {/* Réserver cette chambre : WhatsApp (chambre pré-remplie) ou en ligne */}
                    {waNumber && (
                      <a
                        href={waHref(waNumber, waBookingMessage(locale, { room: name }))}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t.rooms.waBook} : ${name}`}
                        className={`mt-3.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[#0d7a4f] bg-white px-4 text-[13px] font-semibold text-[#0d7a4f] no-underline transition-colors hover:bg-[#0d7a4f] hover:text-white ${focus}`}
                      >
                        <Icon name="whatsapp" size={16} /> {t.rooms.waBook}
                      </a>
                    )}
                    <Link
                      href={`/${locale}/book?room=${room.slug}`}
                      aria-label={`${t.rooms.bookOnline} : ${name}`}
                      className={`mt-2 inline-flex min-h-9 items-center justify-center self-center text-[12px] font-medium text-[#8a620b] underline-offset-2 hover:underline ${focus}`}
                    >
                      {t.rooms.or} {t.rooms.bookOnline.toLowerCase()}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Carte photo : Restaurant & Bar */}
        <section
          aria-labelledby="restaurant"
          className="relative isolate flex min-h-[380px] flex-col justify-end overflow-hidden rounded-2xl text-white"
        >
          <div className="absolute inset-0 -z-10 [&_.photo-icon]:hidden">
            <Photo src="/images/restaurant.jpg" alt="" tone="warm" icon="utensils" className="h-full w-full" />
          </div>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06150f]/95 via-[#06150f]/45 to-transparent" />
          <div className="p-6 lg:p-7">
            <h2 id="restaurant" className={`m-0 ${serif} text-2xl font-bold leading-tight text-[#e8c766] lg:text-[28px]`}>
              {h.diningTitle}
            </h2>
            <p className="mt-2 mb-0 max-w-xs text-sm leading-relaxed text-white/85">{h.diningText}</p>
            <Link href={`/${locale}/dining`} className={`${btnLight} mt-5`}>
              {h.diningCta} <Icon name="arrow" size={14} />
            </Link>
          </div>
        </section>
      </div>

      {/* ---------- Rangée 2 : Piscine & Bien-être | Événements ---------- */}
      <div className={`${wrap} grid gap-6 pb-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`}>
        {/* Panneau mis en avant : Spa & Bien-être */}
        <section aria-labelledby="bien-etre" className="flex flex-col gap-6 rounded-2xl bg-[#0f3b2d] p-6 text-white lg:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-md">
              <h2 id="bien-etre" className={`m-0 ${serif} text-2xl font-bold leading-tight text-white lg:text-[28px]`}>
                {h.wellA} <span className="whitespace-nowrap text-[#e8c766]">{h.wellB}</span>
              </h2>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-white/75">{h.wellText}</p>
            </div>
            <Link href={`/${locale}/wellness`} className={`${btnGold} whitespace-nowrap`}>
              {h.wellCta} <Icon name="arrow" size={14} />
            </Link>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            {h.tiles.map((tile, i) => (
              <Link
                key={tile.title}
                href={`/${locale}/wellness#${tileMeta[i].id}`}
                className={`relative block aspect-[4/3] overflow-hidden rounded-xl text-white no-underline ring-1 ring-white/10 sm:aspect-auto sm:min-h-36 ${focus}`}
              >
                <Photo src={tileMeta[i].src} alt={tile.title} tone={tileMeta[i].tone} icon={tileMeta[i].icon} className="h-full w-full">
                  <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10">
                    <p className="m-0 text-sm font-semibold leading-tight">{tile.title}</p>
                    <p className="m-0 mt-0.5 text-[11px] leading-tight text-white/80">{tile.text}</p>
                  </div>
                </Photo>
              </Link>
            ))}
          </div>
        </section>

        {/* Carte photo : Événements */}
        <section
          aria-labelledby="evenements"
          className="relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl text-white"
        >
          <div className="absolute inset-0 -z-10 [&_.photo-icon]:hidden">
            <Photo src="/images/events.jpg" alt="" tone="violet" icon="sparkles" className="h-full w-full" />
          </div>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06150f]/95 via-[#06150f]/45 to-transparent" />
          <div className="p-6 lg:p-7">
            <h2 id="evenements" className={`m-0 ${serif} text-2xl font-bold leading-tight text-[#e8c766] lg:text-[28px]`}>
              {h.eventsTitle}
            </h2>
            <p className="mt-2 mb-0 max-w-xs text-sm leading-relaxed text-white/85">{h.eventsText}</p>
            <ul className="mt-3 mb-0 flex list-none flex-wrap gap-1.5 p-0">
              {h.eventTypes.map((e, i) => (
                <li key={e} className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
                  <Icon name={eventIcons[i]} size={13} className="text-[#e8c766]" />
                  {e}
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/events`} className={`${btnLight} mt-5`}>
              {h.eventsCta} <Icon name="arrow" size={14} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}