import type { IconName } from "@/components/Icon";

/**
 * Catalogue des équipements de chambre.
 * La valeur enregistrée en base est le libellé français (`fr`) : les chambres
 * existantes restent compatibles, et le site affiche la traduction et l'icône.
 */
export type Amenity = { fr: string; en: string; icon: IconName; aliases?: string[] };

export const AMENITY_GROUPS: { fr: string; en: string; items: Amenity[] }[] = [
  {
    fr: "Confort",
    en: "Comfort",
    items: [
      { fr: "Climatisation", en: "Air conditioning", icon: "snowflake", aliases: ["clim", "climatisé"] },
      { fr: "Ventilateur", en: "Fan", icon: "fan" },
      { fr: "Lit double", en: "Double bed", icon: "bed" },
      { fr: "Lit king size", en: "King-size bed", icon: "bed", aliases: ["king size", "grand lit"] },
      { fr: "Lits jumeaux", en: "Twin beds", icon: "bed", aliases: ["deux lits"] },
      { fr: "Salon privé", en: "Private lounge", icon: "sofa", aliases: ["salon"] },
      { fr: "Balcon", en: "Balcony", icon: "sun", aliases: ["terrasse"] },
      { fr: "Vue sur la piscine", en: "Pool view", icon: "waves", aliases: ["vue piscine"] },
      { fr: "Moustiquaire", en: "Mosquito net", icon: "shield" },
    ],
  },
  {
    fr: "Salle de bain",
    en: "Bathroom",
    items: [
      { fr: "Salle de bain privée", en: "Private bathroom", icon: "bath", aliases: ["salle d'eau", "salle de bain"] },
      { fr: "Eau chaude", en: "Hot water", icon: "droplet" },
      { fr: "Baignoire", en: "Bathtub", icon: "bath" },
      { fr: "Serviettes et produits de toilette", en: "Towels and toiletries", icon: "sparkles", aliases: ["serviettes"] },
    ],
  },
  {
    fr: "Équipements",
    en: "In-room",
    items: [
      { fr: "Wi-Fi gratuit", en: "Free Wi-Fi", icon: "wifi", aliases: ["wi-fi", "wifi"] },
      { fr: "Télévision", en: "TV", icon: "tv", aliases: ["tv", "télé"] },
      { fr: "Chaînes satellite", en: "Satellite channels", icon: "tv", aliases: ["canal+", "canal +", "satellite"] },
      { fr: "Réfrigérateur", en: "Fridge", icon: "fridge", aliases: ["frigo", "mini-bar", "minibar"] },
      { fr: "Bureau", en: "Desk", icon: "desk" },
      { fr: "Coffre-fort", en: "Safe", icon: "lock", aliases: ["coffre"] },
      { fr: "Penderie", en: "Wardrobe", icon: "check", aliases: ["armoire", "placard"] },
      { fr: "Électricité 24h/24", en: "24/7 power", icon: "bolt", aliases: ["groupe électrogène", "électricité"] },
    ],
  },
  {
    fr: "Services",
    en: "Services",
    items: [
      { fr: "Petit-déjeuner inclus", en: "Breakfast included", icon: "coffee", aliases: ["petit-déjeuner", "petit déjeuner"] },
      { fr: "Service en chambre", en: "Room service", icon: "bell", aliases: ["room service"] },
      { fr: "Ménage quotidien", en: "Daily housekeeping", icon: "sparkles", aliases: ["ménage"] },
      { fr: "Parking privé", en: "Private parking", icon: "parking", aliases: ["parking"] },
    ],
  },
];

export const AMENITIES: Amenity[] = AMENITY_GROUPS.flatMap((g) => g.items);

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Retrouve l'équipement du catalogue correspondant à une valeur saisie (même ancienne). */
export function findAmenity(value: string): Amenity | undefined {
  const v = norm(value);
  return AMENITIES.find((a) => norm(a.fr) === v || norm(a.en) === v || a.aliases?.some((x) => norm(x) === v));
}

/** Libellé affiché sur le site dans la langue de la page. */
export function amenityLabel(value: string, locale: "fr" | "en") {
  const a = findAmenity(value);
  return a ? a[locale] : value;
}

export function amenityIconFor(value: string): IconName {
  return findAmenity(value)?.icon ?? "check";
}

/** Range les équipements : ceux du catalogue dans l'ordre du catalogue, puis les autres. */
export function sortAmenities(values: string[]) {
  const known = AMENITIES.filter((a) => values.some((v) => findAmenity(v) === a)).map((a) => a.fr);
  const other = values.filter((v) => !findAmenity(v));
  return [...known, ...Array.from(new Set(other))];
}
