import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { initiatePayment } from "@/lib/camerpay";
import { normalizeCmPhone } from "@/lib/format";
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
});

const knownErrors: Record<string, { status: number; code: string }> = {
  invalid_dates: { status: 400, code: "invalid_dates" },
  past_date: { status: 400, code: "invalid_dates" },
  room_not_found: { status: 404, code: "room_not_found" },
  too_many_guests: { status: 400, code: "too_many_guests" },
  unavailable: { status: 409, code: "unavailable" },
};

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const input = parsed.data;

  const settings = await getSettings();
  const db = serviceClient();

  const needsPayment = settings.deposit_percent > 0;
  const cmPhone = normalizeCmPhone(input.phone);
  if (needsPayment && !cmPhone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const phone = cmPhone ?? input.phone;

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
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const bookingPage = `/${input.locale}/booking/${booking.reference}`;

  // Pas d'acompte demandé : la réservation attend directement la validation de la réception.
  if (!needsPayment || booking.deposit_amount <= 0) {
    const { data: room } = await db.from("rooms").select("name_fr").eq("id", booking.room_id).single();
    const roomName = room?.name_fr ?? "";
    await Promise.all([
      notifyManagerNewBooking(booking, roomName, settings),
      notifyGuestBookingReceived(booking, roomName, settings),
    ]);
    return NextResponse.json({ reference: booking.reference, redirectUrl: bookingPage });
  }

  try {
    const payment = await initiatePayment({
      amount: booking.deposit_amount,
      customerPhone: phone,
      customerName: booking.guest_name,
      customerEmail: booking.guest_email || undefined,
      invoiceId: booking.reference,
      callbackUrl: `${site}/api/payments/camerpay/webhook`,
      returnUrl: `${site}${bookingPage}`,
    });

    await db.from("payments").insert({
      booking_id: booking.id,
      transaction_uuid: payment.transactionUuid,
      amount: booking.deposit_amount,
      status: payment.status,
      pay_url: payment.payUrl,
      raw: payment.raw as object,
    });

    // Le push USSD est déclenché dès l'appel initiate : on redirige
    // directement vers la page de statut. La pay_url est conservée en base
    // comme lien de secours (bouton "Reprendre le paiement").
    return NextResponse.json({ reference: booking.reference, redirectUrl: bookingPage });
  } catch (err) {
    console.error("payment initiation failed", err);
    // Payment gateway unavailable: downgrade to manual pending instead of cancelling.
    // The reception will contact the guest to arrange payment.
    // Still notify the guest so they have their reference number.
    const { data: room } = await db.from("rooms").select("name_fr").eq("id", booking.room_id).single();
    void notifyGuestBookingReceived(booking, room?.name_fr ?? "", settings);
    await db
      .from("bookings")
      .update({
        status: "pending",
        deposit_amount: 0,
        payment_status: "none",
        hold_expires_at: null,
        admin_note: `Paiement en ligne indisponible – à régler à l'accueil. Erreur : ${(err as Error).message}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    // Still redirect to the booking confirmation page
    return NextResponse.json({ reference: booking.reference, redirectUrl: bookingPage });
  }
}
