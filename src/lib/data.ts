import "server-only";
import { serviceClient } from "./supabase/admin";
import type { Room, Settings } from "./types";

const fallbackSettings: Settings = {
  id: 1,
  hotel_name: "Complexe Lafleur Obala",
  phone: "+237 694 744 321",
  phone2: "+237 655 243 107",
  whatsapp: "",
  email: "complexelafleur@gmail.com",
  address: "Quartier Chauffeur – Obala, Cameroun",
  maps_url: "",
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  checkin_time: "14:00",
  checkout_time: "12:00",
  deposit_percent: 30,
  hold_hours: 24,
  manager_email: "",
  cancellation_policy_fr: "",
  cancellation_policy_en: "",
};

export async function getSettings(): Promise<Settings> {
  try {
    const { data } = await serviceClient().from("settings").select("*").eq("id", 1).maybeSingle();
    return (data as Settings) ?? fallbackSettings;
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

/** Chambres restantes par catégorie pour une période (clé = room id). */
export async function getAvailability(checkIn: string, checkOut: string) {
  const { data } = await serviceClient().rpc("room_availability", { p_in: checkIn, p_out: checkOut });
  const map: Record<string, number> = {};
  (data as { room_id: string; remaining: number }[] | null)?.forEach((r) => {
    map[r.room_id] = r.remaining;
  });
  return map;
}
