/**
 * Liens de contact (appel, WhatsApp, itinéraire). Utilisable côté serveur et navigateur.
 */

export const HOTEL_NAME = "Complexe La Fleur - Obala";

/** Chiffres au format international (237XXXXXXXXX) à partir d'un numéro saisi librement. */
export function intlDigits(phone: string | null | undefined) {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 9) return `237${d}`;
  if (d.startsWith("00")) return d.slice(2);
  return d;
}

/** Numéro affiché sans l'indicatif : « 6 51 60 13 55 ». */
export function displayPhone(phone: string | null | undefined) {
  const d = intlDigits(phone);
  const local = d.startsWith("237") && d.length === 12 ? d.slice(3) : d;
  return local.length === 9 ? local.replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5") : phone || "";
}

export const telHref = (phone: string | null | undefined) => {
  const d = intlDigits(phone);
  return d ? `tel:+${d}` : "";
};

export function waHref(phone: string | null | undefined, text?: string) {
  const d = intlDigits(phone);
  if (!d) return "";
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Lien « Itinéraire » : le lien Google Maps de l'admin, sinon un calcul d'itinéraire vers le complexe. */
export function directionsHref(mapsUrl: string | null | undefined) {
  if (mapsUrl) return mapsUrl;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Complexe La Fleur, Obala, Cameroun")}`;
}

/** « 10:00 » → « 10h » (fr) / « 10 am » (en). */
export function formatHour(time: string, locale: "fr" | "en") {
  const [h, m] = time.split(":").map((x) => Number(x));
  if (!Number.isFinite(h)) return time;
  if (locale === "fr") return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
}

function frDate(iso: string) {
  const [y, mo, d] = iso.split("-");
  return y && mo && d ? `${d}/${mo}/${y}` : iso;
}

/** Message pré-rempli pour une demande de réservation WhatsApp. */
export function waBookingMessage(
  locale: "fr" | "en",
  opts: { checkIn?: string; checkOut?: string; guests?: number | string; room?: string } = {},
) {
  const lines =
    locale === "fr"
      ? [
          `Bonjour ${HOTEL_NAME},`,
          `Je souhaite réserver${opts.room ? ` : ${opts.room}` : "."}`,
          opts.checkIn ? `• Arrivée : ${frDate(opts.checkIn)}` : "",
          opts.checkOut ? `• Départ : ${frDate(opts.checkOut)}` : "",
          opts.guests ? `• Nombre de personnes : ${opts.guests}` : "",
          `Pouvez-vous me confirmer la disponibilité et le tarif ? Merci.`,
        ]
      : [
          `Hello ${HOTEL_NAME},`,
          `I would like to book${opts.room ? `: ${opts.room}` : "."}`,
          opts.checkIn ? `• Check-in: ${frDate(opts.checkIn)}` : "",
          opts.checkOut ? `• Check-out: ${frDate(opts.checkOut)}` : "",
          opts.guests ? `• Number of guests: ${opts.guests}` : "",
          `Could you confirm availability and the rate? Thank you.`,
        ];
  return lines.filter(Boolean).join("\n");
}
