import "server-only";
import { serviceClient } from "./supabase/admin";
import type { Room, Settings } from "./types";

const fallbackSettings: Settings = {
  id: 1,
  hotel_name: "Complexe La Fleur - Obala",
  phone: "+237 6 20 21 18 22", // réception
  phone2: "+237 6 51 60 13 55", // réservation (WhatsApp)
  phone3: "+237 6 59 67 61 97", // réservation
  whatsapp: "+237 6 51 60 13 55",
  email: "complexelafleur@gmail.com",
  address: "Quartier Chauffeur – Obala, Cameroun",
  maps_url: "",
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  checkin_time: "14:00",
  checkout_time: "12:00",
  open_time: "10:00",
  close_time: "19:00",
  breakfast_start: "07:00",
  breakfast_end: "10:00",
  deposit_percent: 30,
  hold_hours: 2,
  manager_email: "",
  cancellation_policy_fr: "",
  cancellation_policy_en: "",
};

export async function getSettings(): Promise<Settings> {
  try {
    const { data } = await serviceClient().from("settings").select("*").eq("id", 1).maybeSingle();
    // Colonnes ajoutées par la migration 0005 : valeurs par défaut si elle n'a pas encore été exécutée.
    return data ? ({ ...fallbackSettings, ...(data as Settings), phone3: (data as Settings).phone3 ?? null, ...("breakfast_start" in (data as object) ? {} : { breakfast_start: "07:00", breakfast_end: "10:00" }) } as Settings) : fallbackSettings;
  } catch {
    return fallbackSettings;
  }
}

export async function getRooms(): Promise<Room[]> {
  try {
    const { data } = await serviceClient()
      .from("rooms")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("price_per_night");
    return (data as Room[]) ?? [];
  } catch {
    return [];
  }
}

/** Une chambre active par son slug (page de détail), sinon null. */
export async function getRoomBySlug(slug: string): Promise<Room | null> {
  const rooms = await getRooms();
  return rooms.find((r) => r.slug === slug) ?? null;
}

/** Chambres restantes par catégorie pour une période (clé = room id). */
export async function getAvailability(checkIn: string, checkOut: string) {
  const { data } = await serviceClient().rpc("room_availability", { p_in: checkIn, p_out: checkOut });
  const map: Record<string, number> = {};
  (data as { room_id: string; remaining: number }[] | null)?.forEach((r) => {
    map[r.room_id] = r.remaining;
  });
  return map;
}
