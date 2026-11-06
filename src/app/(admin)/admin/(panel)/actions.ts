"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/data";
import { notifyGuestDecision } from "@/lib/notify";
import { sortAmenities } from "@/lib/amenities";
import type { Booking, BookingStatus } from "@/lib/types";

// IMPORTANT : chaque action commence par requireAdmin(). Une server action est
// un point d'entrée public (appelable par POST) : le layout admin ne la protège pas.

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const int = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Number(str(v));
  return Number.isFinite(n) && str(v) !== "" ? Math.round(n) : fallback;
};

// ─── Booking decisions ────────────────────────────────────────────────────────

type Decision = "confirmed" | "declined" | "cancelled";

/** Statuts de départ autorisés pour chaque décision. */
const allowedFrom: Record<Decision, BookingStatus[]> = {
  confirmed: ["pending", "awaiting_payment"],
  declined: ["pending", "awaiting_payment"],
  cancelled: ["pending", "awaiting_payment", "confirmed"],
};

export async function decideBooking(formData: FormData) {
  await requireAdmin();

  const id = str(formData.get("id"));
  const decision = str(formData.get("decision")) as Decision;
  if (!id || !Object.hasOwn(allowedFrom, decision)) redirect("/admin?error=invalid");

  const db = serviceClient();
  const { data: current, error: readErr } = await db.from("bookings").select("*").eq("id", id).maybeSingle();
  if (readErr || !current) redirect("/admin?error=not_found");
  const before = current as Booking;

  if (!allowedFrom[decision].includes(before.status)) redirect("/admin?error=state");

  // Refus ou annulation d'une réservation dont l'acompte est payé : remboursement à faire.
  // Si un paiement est encore en cours, le webhook passera en « à rembourser » à son arrivée.
  const update: Record<string, unknown> = { status: decision, updated_at: new Date().toISOString() };
  if (decision !== "confirmed" && before.payment_status === "paid") update.payment_status = "refund_due";
  if (decision !== "confirmed") update.hold_expires_at = null;

  const { data, error } = await db
    .from("bookings")
    .update(update)
    .eq("id", id)
    .eq("status", before.status) // évite d'écraser un changement fait entre-temps (webhook, autre onglet)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("decideBooking: update failed", error);
    redirect("/admin?error=state");
  }

  const booking = data as Booking;

  const [roomRes, settings] = await Promise.all([
    db.from("rooms").select("name_fr, name_en").eq("id", booking.room_id).single(),
    getSettings(),
  ]);
  const roomName = (booking.locale === "en" ? roomRes.data?.name_en : roomRes.data?.name_fr) ?? roomRes.data?.name_fr ?? "";

  // E-mail au client pour une confirmation ou un refus (pas pour une annulation faite par l'hôtel).
  if (decision === "confirmed" || decision === "declined") {
    await notifyGuestDecision(booking, roomName, settings, decision);
  }

  // Retour avec paramètres : la page propose un message WhatsApp de suivi.
  const params = new URLSearchParams({
    wa: booking.guest_phone.replace(/[^\d]/g, ""),
    ref: booking.reference,
    decision,
    room: roomName,
    checkin: booking.check_in,
    checkout: booking.check_out,
    locale: booking.locale,
  });
  redirect(`/admin?${params.toString()}`);
}

export async function markRefunded(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) redirect("/admin");

  const { error } = await serviceClient()
    .from("bookings")
    .update({ payment_status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("payment_status", "refund_due");

  if (error) {
    console.error("markRefunded: update failed", error);
    redirect("/admin?s=refund&error=save");
  }
  redirect("/admin?s=refund");
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const lang = str(formData.get("lang")) || "fr";
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const opt = (k: string) => str(formData.get(k)).trim() || null;

  const { error } = await serviceClient().from("settings").upsert({
    id: 1,
    hotel_name: str(formData.get("hotel_name")).trim() || "Complexe La Fleur - Obala",
    phone: opt("phone"),
    phone2: opt("phone2"),
    phone3: opt("phone3"),
    whatsapp: opt("whatsapp"),
    email: opt("email"),
    manager_email: opt("manager_email"),
    address: opt("address"),
    maps_url: opt("maps_url"),
    facebook_url: opt("facebook_url"),
    instagram_url: opt("instagram_url"),
    youtube_url: opt("youtube_url"),
    checkin_time: str(formData.get("checkin_time")) || "14:00",
    checkout_time: str(formData.get("checkout_time")) || "12:00",
    open_time: str(formData.get("open_time")) || "10:00",
    close_time: str(formData.get("close_time")) || "19:00",
    breakfast_start: opt("breakfast_start"),
    breakfast_end: opt("breakfast_end"),
    deposit_percent: clamp(int(formData.get("deposit_percent"), 30), 0, 100),
    hold_hours: clamp(int(formData.get("hold_hours"), 2), 1, 168),
    ...(lang === "en"
      ? { cancellation_policy_en: str(formData.get("cancellation_policy")) }
      : { cancellation_policy_fr: str(formData.get("cancellation_policy")) }),
  });
  if (error) {
    console.error("saveSettings failed", error);
    redirect("/admin/settings?error=1");
  }
  redirect("/admin/settings?saved=1");
}

// ─── Admin language ───────────────────────────────────────────────────────────

export async function setAdminLang(formData: FormData) {
  // Pas de données sensibles ici, mais on reste cohérent : réservé aux admins.
  await requireAdmin();
  const lang = str(formData.get("lang"));
  if (lang === "fr" || lang === "en") {
    const jar = await cookies();
    jar.set("admin_lang", lang, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  redirect("/admin");
}

// ─── Rooms ────────────────────────────────────────────────────────────────

const PHOTO_BUCKET = "room-photos";
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export type UploadTicket = { path: string; token: string; publicUrl: string };

/**
 * Prépare l'envoi des photos : renvoie une URL signée par fichier.
 * Le navigateur envoie ensuite les fichiers directement à Supabase Storage,
 * ce qui évite la limite de 4,5 Mo par requête des fonctions Vercel.
 */
export async function createRoomPhotoUploads(
  files: { type: string; size: number }[],
): Promise<{ tickets?: UploadTicket[]; error?: string }> {
  await requireAdmin();
  if (!Array.isArray(files) || files.length === 0) return { tickets: [] };
  if (files.length > 20) return { error: "too_many" };

  const db = serviceClient();
  const tickets: UploadTicket[] = [];
  for (const f of files) {
    const ext = PHOTO_TYPES[f?.type];
    if (!ext) return { error: "bad_type" };
    if (!(f.size > 0 && f.size <= PHOTO_MAX_BYTES)) return { error: "too_big" };
    const path = `rooms/${randomUUID()}.${ext}`;
    const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("createSignedUploadUrl failed", error);
      return { error: "storage" };
    }
    const { data: pub } = db.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    tickets.push({ path, token: data.token, publicUrl: pub.publicUrl });
  }
  return { tickets };
}

function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chambre"
  );
}

async function uniqueSlug(base: string) {
  const { data } = await serviceClient().from("rooms").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

/** Enregistre une chambre. Renvoie { error } en cas d'échec, sinon redirige. */
export async function saveRoom(formData: FormData): Promise<{ error?: string } | void> {
  await requireAdmin();

  const id = str(formData.get("id"));
  const lang = str(formData.get("lang")) || "fr";
  const name = str(formData.get("name")).trim();
  const description = str(formData.get("description")).trim();
  if (!name) return { error: "name" };

  // Photos : URL déjà en ligne (gardées + nouvellement envoyées), puis éventuelle URL collée.
  const images = formData
    .getAll("images_keep")
    .map((v) => str(v).trim())
    .filter((u) => /^https?:\/\//i.test(u) || u.startsWith("/"));
  const manual = str(formData.get("image_url_manual")).trim();
  if (manual && /^https?:\/\//i.test(manual) && !images.includes(manual)) images.push(manual);

  const payload: Record<string, unknown> = {
    price_per_night: Math.max(0, int(formData.get("price_per_night"), 0)),
    capacity: Math.max(1, int(formData.get("capacity"), 1)),
    quantity: Math.max(1, int(formData.get("quantity"), 1)),
    sort_order: int(formData.get("sort_order"), 0),
    // Cases cochées (catalogue) + « Autres équipements » saisis à la main, rangés dans l'ordre du catalogue
    amenities: sortAmenities([
      ...formData.getAll("amenities").map((v) => str(v).trim()),
      ...str(formData.get("amenities_other")).split(",").map((a) => a.trim()),
    ].filter(Boolean)),
    active: formData.get("active") === "on",
    images,
    image_url: images[0] || null,
    updated_at: new Date().toISOString(),
    ...(lang === "en"
      ? { name_en: name, description_en: description }
      : { name_fr: name, description_fr: description }),
  };

  const db = serviceClient();

  if (id) {
    const { error } = await db.from("rooms").update(payload).eq("id", id);
    if (error) {
      console.error("saveRoom update failed", error);
      return { error: "save" };
    }
  } else {
    // Nouvelle chambre : même texte dans les deux langues pour qu'aucune ne soit vide.
    payload.name_fr = payload.name_fr ?? name;
    payload.name_en = payload.name_en ?? name;
    payload.description_fr = payload.description_fr ?? description;
    payload.description_en = payload.description_en ?? description;
    payload.slug = await uniqueSlug(slugify(name));
    const { error } = await db.from("rooms").insert(payload);
    if (error) {
      console.error("saveRoom insert failed", error);
      return { error: "save" };
    }
  }
  redirect("/admin/rooms?saved=1");
}

export async function toggleRoomActive(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) redirect("/admin/rooms");
  const active = formData.get("active") === "true";
  const { error } = await serviceClient()
    .from("rooms")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("toggleRoomActive failed", error);
    redirect("/admin/rooms?error=1");
  }
  redirect("/admin/rooms");
}

export async function deleteRoom(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) redirect("/admin/rooms");
  const db = serviceClient();

  // Toute réservation (même ancienne) référence la chambre : on la masque au lieu de la supprimer,
  // sinon la suppression échoue (clé étrangère) et l'historique serait perdu.
  const { count, error: countErr } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("room_id", id);
  if (countErr) {
    console.error("deleteRoom count failed", countErr);
    redirect("/admin/rooms?error=1");
  }

  if (count && count > 0) {
    const { error } = await db.from("rooms").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) redirect("/admin/rooms?error=1");
    redirect("/admin/rooms?hidden=1");
  }

  const { error } = await db.from("rooms").delete().eq("id", id);
  if (error) {
    console.error("deleteRoom failed", error);
    redirect("/admin/rooms?error=1");
  }
  redirect("/admin/rooms?deleted=1");
}

// ─── Inquiries ───────────────────────────────────────────────────────────────

export async function toggleInquiry(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) redirect("/admin/inquiries");
  const handled = formData.get("handled") === "true";
  const { error } = await serviceClient()
    .from("inquiries")
    .update({ handled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("toggleInquiry failed", error);
    redirect("/admin/inquiries?error=1");
  }
  redirect("/admin/inquiries");
}
