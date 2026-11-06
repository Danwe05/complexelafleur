import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { CamerPayError } from "@/lib/camerpay";
import { checkCmPhone } from "@/lib/cm-phone";
import { siteUrl, startDepositPayment } from "@/lib/payments";
import { notifyManagerNewBooking, notifyGuestBookingReceived } from "@/lib/notify";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  roomId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(20),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(25),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional(),
  locale: z.enum(["fr", "en"]).default("fr"),
  /** Opérateur choisi à l'étape paiement (obligatoire si un acompte est demandé). */
  method: z.enum(["orange_money", "mtn_momo"]).optional(),
});

const knownErrors: Record<string, { status: number; code: string }> = {
  invalid_dates: { status: 400, code: "invalid_dates" },
  past_date: { status: 400, code: "invalid_dates" },
  room_not_found: { status: 404, code: "room_not_found" },
  too_many_guests: { status: 400, code: "too_many_guests" },
  unavailable: { status: 409, code: "unavailable" },
};

async function roomNameFor(db: ReturnType<typeof serviceClient>, b: Booking) {
  const { data } = await db.from("rooms").select("name_fr, name_en").eq("id", b.room_id).single();
  return (b.locale === "en" ? data?.name_en : data?.name_fr) ?? data?.name_fr ?? "";
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const input = parsed.data;

  const settings = await getSettings();
  const db = serviceClient();
  const needsPayment = settings.deposit_percent > 0;

  // Le numéro sert au paiement Mobile Money : il doit être Orange ou MTN.
  const phoneCheck = checkCmPhone(input.phone);
  if (needsPayment) {
    if (!phoneCheck.ok) {
      const code = phoneCheck.reason === "unsupported" ? "unsupported_operator" : "invalid_phone";
      return NextResponse.json({ error: code }, { status: 400 });
    }
    if (!input.method) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const phone = phoneCheck.ok ? `+${phoneCheck.camerpay}` : input.phone;

  const { data, error } = await db.rpc("create_booking", {
    p_room: input.roomId,
    p_in: input.checkIn,
    p_out: input.checkOut,
    p_guests: input.guests,
    p_name: input.name,
    p_phone: phone,
    p_email: input.email ?? "",
    p_notes: input.notes ?? "",
    p_locale: input.locale,
    p_deposit_percent: settings.deposit_percent,
    p_hold_hours: settings.hold_hours,
  });

  if (error) {
    const key = Object.keys(knownErrors).find((k) => error.message.includes(k));
    if (key) return NextResponse.json({ error: knownErrors[key].code }, { status: knownErrors[key].status });
    console.error("create_booking failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const booking = data as Booking;
  const bookingPage = `/${input.locale}/booking/${booking.reference}`;

  // Pas d'acompte demandé : la réservation attend directement la validation de la réception.
  if (!needsPayment || booking.deposit_amount <= 0 || !phoneCheck.ok || !input.method) {
    const roomName = await roomNameFor(db, booking);
    await Promise.all([
      notifyManagerNewBooking(booking, roomName, settings),
      notifyGuestBookingReceived(booking, roomName, settings),
    ]);
    return NextResponse.json({ reference: booking.reference, redirectUrl: bookingPage });
  }

  try {
    // La demande de paiement (push USSD) part sur le téléphone avec l'opérateur choisi.
    await startDepositPayment(db, booking, phoneCheck, input.method, siteUrl(req));
    return NextResponse.json({ reference: booking.reference, redirectUrl: bookingPage });
  } catch (err) {
    // Numéro refusé par l'opérateur : la réservation reste bloquée, et la page de suivi
    // demande un autre numéro (aucun paiement enregistré => formulaire affiché).
    if (err instanceof CamerPayError && err.phoneRejected) {
      return NextResponse.json({ reference: booking.reference, redirectUrl: bookingPage });
    }

    console.error("payment initiation failed", err);
    // Passerelle indisponible : on bascule en validation manuelle au lieu d'annuler.
    // La réception contactera le client pour l'acompte ; les deux sont prévenus.
    const { data: updated } = await db
      .from("bookings")
      .update({
        status: "pending",
        deposit_amount: 0,
        payment_status: "none",
        hold_expires_at: null,
        admin_note: `Paiement en ligne indisponible – acompte à régler à l'accueil. Erreur : ${(err as Error).message}`.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .select("*")
      .single();
    const b = (updated as Booking | null) ?? booking;
    const roomName = await roomNameFor(db, b);
    await Promise.all([
      notifyManagerNewBooking(b, roomName, settings),
      notifyGuestBookingReceived(b, roomName, settings),
    ]);
    return NextResponse.json({ reference: booking.reference, redirectUrl: bookingPage });
  }
}
