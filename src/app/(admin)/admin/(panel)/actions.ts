"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { notifyGuestDecision } from "@/lib/notify";
import type { Booking } from "@/lib/types";

// ─── Booking decisions ────────────────────────────────────────────────────────

type Decision = "confirmed" | "declined" | "cancelled";

export async function decideBooking(formData: FormData) {
  const id = formData.get("id") as string | null;
  const decision = formData.get("decision") as Decision | null;

  if (!id || !decision || !["confirmed", "declined", "cancelled"].includes(decision)) {
    return;
  }

  const db = serviceClient();
  const now = new Date().toISOString();

  const newStatus =
    decision === "confirmed" ? "confirmed" : decision === "cancelled" ? "cancelled" : "declined";

  const { data, error } = await db
    .from("bookings")
    .update({ status: newStatus, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("decideBooking: update failed", error);
    redirect("/admin");
  }

  const booking = data as Booking;

  const [roomRes, settings] = await Promise.all([
    db.from("rooms").select("name_fr").eq("id", booking.room_id).single(),
    getSettings(),
  ]);
  const roomName = roomRes.data?.name_fr ?? "";

  // Send guest email for confirmed and declined (not cancelled — that's admin-initiated).
  if (decision === "confirmed" || decision === "declined") {
    await notifyGuestDecision(booking, roomName, settings, decision);
  }

  // Redirect back with query params so the page can surface a WhatsApp follow-up banner.
  const wa = booking.guest_phone.replace(/[^\d]/g, "");
  const params = new URLSearchParams({
    wa,
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
  const id = formData.get("id") as string | null;
  if (!id) return;

  const db = serviceClient();
  const { error } = await db
    .from("bookings")
    .update({ payment_status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) console.error("markRefunded: update failed", error);
  redirect("/admin");
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function saveSettings(formData: FormData) {
  const lang = (formData.get("lang") as string) || "fr";
  const db = serviceClient();
  await db.from("settings").upsert({
    id: 1,
    hotel_name: formData.get("hotel_name") as string,
    phone: (formData.get("phone") as string) || null,
    phone2: (formData.get("phone2") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    email: (formData.get("email") as string) || null,
    manager_email: (formData.get("manager_email") as string) || null,
    address: (formData.get("address") as string) || null,
    maps_url: (formData.get("maps_url") as string) || null,
    facebook_url: (formData.get("facebook_url") as string) || null,
    instagram_url: (formData.get("instagram_url") as string) || null,
    youtube_url: (formData.get("youtube_url") as string) || null,
    checkin_time: (formData.get("checkin_time") as string) || "14:00",
    checkout_time: (formData.get("checkout_time") as string) || "12:00",
    deposit_percent: Number(formData.get("deposit_percent") ?? 0),
    hold_hours: Number(formData.get("hold_hours") ?? 24),
    ...(lang === "en"
      ? { cancellation_policy_en: formData.get("cancellation_policy") as string }
      : { cancellation_policy_fr: formData.get("cancellation_policy") as string }),
  });
  redirect("/admin/settings?saved=1");
}

// ─── Admin language ───────────────────────────────────────────────────────────

export async function setAdminLang(formData: FormData) {
  const lang = formData.get("lang") as string;
  if (lang === "fr" || lang === "en") {
    const jar = await cookies();
    jar.set("admin_lang", lang, { path: "/", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  }
  redirect("/admin");
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function saveRoom(formData: FormData) {
  const id = formData.get("id") as string | null;
  const lang = (formData.get("lang") as string) || "fr";
  const name = (formData.get("name") as string).trim();
  const description = ((formData.get("description") as string) || "").trim();
  const imagesKeep = formData.getAll("images_keep") as string[];
  const imageUrlManual = (formData.get("image_url_manual") as string) || "";

  // Build the images array: kept URLs first, then any manually entered URL.
  const images: string[] = [...imagesKeep.filter(Boolean)];
  if (imageUrlManual && !images.includes(imageUrlManual)) images.push(imageUrlManual);

  const payload: Record<string, unknown> = {
    price_per_night: Number(formData.get("price_per_night") ?? 0),
    capacity: Number(formData.get("capacity") ?? 1),
    quantity: Number(formData.get("quantity") ?? 1),
    sort_order: Number(formData.get("sort_order") ?? 0),
    amenities: ((formData.get("amenities") as string) || "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),
    active: formData.get("active") === "on",
    images,
    image_url: images[0] || null,
    ...(lang === "en"
      ? { name_en: name, description_en: description }
      : { name_fr: name, description_fr: description }),
  };

  const db = serviceClient();

  if (id) {
    await db.from("rooms").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id);
    redirect("/admin/rooms?saved=1");
  } else {
    // New room: copy the name/description to both language fields so neither is empty.
    payload.name_fr = payload.name_fr ?? name;
    payload.name_en = payload.name_en ?? name;
    payload.description_fr = payload.description_fr ?? description;
    payload.description_en = payload.description_en ?? description;
    await db.from("rooms").insert(payload);
    redirect("/admin/rooms?saved=1");
  }
}

export async function toggleRoomActive(formData: FormData) {
  const id = formData.get("id") as string | null;
  const active = formData.get("active") === "true";
  if (!id) return;
  const db = serviceClient();
  await db
    .from("rooms")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  redirect("/admin/rooms");
}

export async function deleteRoom(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;
  const db = serviceClient();

  // Check if the room has any non-closed bookings; if so, hide instead of delete.
  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("room_id", id)
    .in("status", ["pending", "awaiting_payment", "confirmed"]);

  if (count && count > 0) {
    await db
      .from("rooms")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    redirect("/admin/rooms?hidden=1");
  } else {
    await db.from("rooms").delete().eq("id", id);
    redirect("/admin/rooms?deleted=1");
  }
}

// ─── Inquiries ────────────────────────────────────────────────────────────────

export async function toggleInquiry(formData: FormData) {
  const id = formData.get("id") as string | null;
  const handled = formData.get("handled") === "true";
  if (!id) return;
  const db = serviceClient();
  await db
    .from("inquiries")
    .update({ handled, updated_at: new Date().toISOString() })
    .eq("id", id);
  redirect("/admin/inquiries");
}
