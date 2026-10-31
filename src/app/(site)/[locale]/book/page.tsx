import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Checkout, type BookableRoom } from "@/components/checkout";
import { SearchBar } from "@/components/SearchBar";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { getAvailability, getRooms, getSettings } from "@/lib/data";
import { isIsoDate, nightsBetween, todayIso } from "@/lib/format";
import { roomPhotos } from "@/lib/rooms-ui";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? dictionaries[locale].book.title : undefined };
}

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionaries[locale];
  const t = d.book;
  const sp = await searchParams;

  const checkIn = first(sp.checkIn);
  const checkOut = first(sp.checkOut);
  const guests = Math.min(Math.max(parseInt(first(sp.guests) ?? "2", 10) || 2, 1), 20);
  const room = first(sp.room);

  const hasDates = isIsoDate(checkIn) && isIsoDate(checkOut);
  const validDates = hasDates && checkOut > checkIn && checkIn >= todayIso();

  let content: React.ReactNode;
  if (!checkIn && !checkOut) {
    content = <p className="muted">{t.noDates}</p>;
  } else if (!validDates) {
    content = <p className="alert alert-error">{t.invalidDates}</p>;
  } else {
    const [rooms, settings, availability] = await Promise.all([
      getRooms(),
      getSettings(),
      getAvailability(checkIn!, checkOut!),
    ]);
    const options: BookableRoom[] = rooms.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: locale === "fr" ? r.name_fr : r.name_en,
      description: locale === "fr" ? r.description_fr : r.description_en,
      pricePerNight: r.price_per_night,
      capacity: r.capacity,
      remaining: availability[r.id] ?? 0,
      images: roomPhotos(r),
    }));
    content = (
      <Checkout
        // La clé relance l'état quand la recherche change.
        key={`${checkIn}-${checkOut}-${guests}`}
        locale={locale}
        rooms={options}
        nights={nightsBetween(checkIn!, checkOut!)}
        checkIn={checkIn!}
        checkOut={checkOut!}
        guests={guests}
        depositPercent={settings.deposit_percent}
        policy={(locale === "fr" ? settings.cancellation_policy_fr : settings.cancellation_policy_en) ?? ""}
        initialRoomSlug={room}
      />
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>{t.title}</h1>
          <p className="lead">{t.lead}</p>
        </div>
      </div>
      <section className="section">
        <div className="container">
          <div style={{ marginBottom: 40 }}>
            <SearchBar
              key={`${checkIn}-${checkOut}-${guests}`}
              locale={locale}
              t={d.search}
              flat
              initial={{ checkIn: hasDates ? checkIn : undefined, checkOut: hasDates ? checkOut : undefined, guests }}
            />
          </div>
          {content}
        </div>
      </section>
    </>
  );
}
