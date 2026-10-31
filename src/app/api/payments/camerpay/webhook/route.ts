import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { mapStatus, verifyWebhook } from "@/lib/camerpay";
import { notifyManagerNewBooking, notifyGuestBookingReceived } from "@/lib/notify";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();

  // Log the raw webhook for diagnosis (truncated for safety).
  console.log("[camerpay-webhook] received", {
    headers: Object.fromEntries(
      ["content-type", "x-camerpay-signature", "x-signature", "authorization"].map((h) => [
        h,
        req.headers.get(h) ?? "(absent)",
      ])
    ),
    body: raw.slice(0, 400),
  });

  if (!verifyWebhook(raw, req.headers)) {
    console.warn("[camerpay-webhook] invalid_signature — rejecting");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(raw);
  } catch {
    console.warn("[camerpay-webhook] invalid_json");
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const data: Record<string, any> = body.data && typeof body.data === "object" ? body.data : body;

  const transactionUuid: string | undefined = data.transaction_uuid ?? body.transaction_uuid;
  const invoiceId: string | undefined = data.merchant_invoice_id ?? body.merchant_invoice_id;
  const outcome = mapStatus(data.status ?? body.status);
  console.log("[camerpay-webhook] parsed", { transactionUuid, invoiceId, outcome });

  const db = serviceClient();

  // Une erreur de base de données renvoie 500 : CamerPay pourra ainsi renvoyer le webhook.
  const dbError = () => NextResponse.json({ error: "database_error" }, { status: 500 });

  let payment: Record<string, any> | null = null;
  if (transactionUuid) {
    const res = await db.from("payments").select("*").eq("transaction_uuid", transactionUuid).maybeSingle();
    if (res.error) { console.error("[camerpay-webhook] db error looking up payment by uuid", res.error); return dbError(); }
    payment = res.data;
  }

  if (!payment && invoiceId) {
    const byBooking = await db.from("bookings").select("id").eq("reference", invoiceId).maybeSingle();
    if (byBooking.error) { console.error("[camerpay-webhook] db error looking up booking", byBooking.error); return dbError(); }
    if (byBooking.data) {
      const res = await db
        .from("payments")
        .select("*")
        .eq("booking_id", byBooking.data.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res.error) { console.error("[camerpay-webhook] db error looking up payment by booking", res.error); return dbError(); }
      payment = res.data;
    }
  }

  if (!payment) {
    console.warn("[camerpay-webhook] unknown payment — ignored", { transactionUuid, invoiceId });
    return NextResponse.json({ ok: true, ignored: "unknown_payment" });
  }

  // Idempotence : un paiement déjà réglé n'est pas retraité.
  if (payment.status === "completed" || payment.status === "paid") {
    console.log("[camerpay-webhook] duplicate — already processed");
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const now = new Date().toISOString();
  const bookingRes = await db.from("bookings").select("*").eq("id", payment.booking_id).single();
  if (bookingRes.error || !bookingRes.data) { console.error("[camerpay-webhook] booking not found", payment.booking_id); return dbError(); }
  const b = bookingRes.data as Booking;
  console.log("[camerpay-webhook] booking", { id: b.id, status: b.status, payment_status: b.payment_status, outcome });

  let toNotify: Booking | null = null;

  if (outcome === "paid") {
    if (b.status === "awaiting_payment") {
      // Acompte reçu : la réservation attend la validation de la réception.
      const res = await db
        .from("bookings")
        .update({ status: "pending", payment_status: "paid", hold_expires_at: null, updated_at: now })
        .eq("id", b.id)
        .eq("status", "awaiting_payment")
        .select("*")
        .single();
      if (res.error) { console.error("[camerpay-webhook] failed to update booking to pending", res.error); return dbError(); }
      toNotify = res.data as Booking;
      console.log("[camerpay-webhook] booking moved to pending, payment_status=paid");
    } else if (!["paid", "refund_due", "refunded"].includes(b.payment_status)) {
      // Paiement arrivé après expiration ou annulation : à rembourser manuellement.
      const res = await db
        .from("bookings")
        .update({ payment_status: "refund_due", updated_at: now })
        .eq("id", b.id);
      if (res.error) { console.error("[camerpay-webhook] failed to set refund_due", res.error); return dbError(); }
      console.log("[camerpay-webhook] late payment — set payment_status=refund_due");
    }
  } else if (outcome === "failed" && b.status === "awaiting_payment") {
    const res = await db.from("bookings").update({ payment_status: "failed", updated_at: now }).eq("id", b.id);
    if (res.error) { console.error("[camerpay-webhook] failed to set payment failed", res.error); return dbError(); }
    console.log("[camerpay-webhook] payment failed — updated booking");
  }

  // Le paiement est marqué en dernier : si une étape précédente échoue, CamerPay renverra le webhook.
  const done = await db
    .from("payments")
    .update({
      status: outcome === "paid" ? "completed" : outcome === "failed" ? "failed" : "pending",
      raw: body,
      updated_at: now,
    })
    .eq("id", payment.id);
  if (done.error) { console.error("[camerpay-webhook] failed to update payment row", done.error); return dbError(); }

  if (toNotify) {
    const { data: room } = await db.from("rooms").select("name_fr").eq("id", toNotify.room_id).single();
    const roomName = room?.name_fr ?? "";
    const s = await getSettings();
    await Promise.all([
      notifyManagerNewBooking(toNotify, roomName, s),
      notifyGuestBookingReceived(toNotify, roomName, s),
    ]);
  }

  return NextResponse.json({ ok: true });
}
