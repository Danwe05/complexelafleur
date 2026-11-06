import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { mapStatus, verifyWebhook } from "@/lib/camerpay";
import { notifyManagerNewBooking, notifyGuestBookingReceived } from "@/lib/notify";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isProd = process.env.VERCEL_ENV === "production";

export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifyWebhook(raw, req.headers)) {
    // On liste les NOMS des en-têtes reçus (jamais leurs valeurs) pour trouver
    // celui qui porte la signature, à mettre dans CAMERPAY_SIGNATURE_HEADER.
    console.warn("[camerpay-webhook] invalid_signature — rejected. Headers received:", [...req.headers.keys()].join(", "));
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const data: Record<string, any> = body.data && typeof body.data === "object" ? body.data : body;

  const transactionUuid: string | undefined = data.transaction_uuid ?? body.transaction_uuid;
  const invoiceId: string | undefined = data.merchant_invoice_id ?? body.merchant_invoice_id;
  let outcome = mapStatus(data.status ?? body.status);
  if (!isProd) console.log("[camerpay-webhook] parsed", { transactionUuid, invoiceId, outcome });

  const db = serviceClient();
  // Une erreur de base de données renvoie 500 : CamerPay pourra renvoyer le webhook.
  const dbError = (where: string, e: unknown) => {
    console.error(`[camerpay-webhook] db error: ${where}`, e);
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  };

  let payment: Record<string, any> | null = null;
  if (transactionUuid) {
    const res = await db.from("payments").select("*").eq("transaction_uuid", transactionUuid).maybeSingle();
    if (res.error) return dbError("payment by uuid", res.error);
    payment = res.data;
  }

  if (!payment && invoiceId) {
    const byBooking = await db.from("bookings").select("id").eq("reference", invoiceId).maybeSingle();
    if (byBooking.error) return dbError("booking by reference", byBooking.error);
    if (byBooking.data) {
      const res = await db
        .from("payments")
        .select("*")
        .eq("booking_id", byBooking.data.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res.error) return dbError("payment by booking", res.error);
      payment = res.data;
    }
  }

  if (!payment) {
    console.warn("[camerpay-webhook] unknown payment — ignored", { transactionUuid, invoiceId });
    return NextResponse.json({ ok: true, ignored: "unknown_payment" });
  }

  // Idempotence : un paiement déjà réglé n'est pas retraité.
  if (payment.status === "completed" || payment.status === "paid") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Montant : si CamerPay l'indique, il doit couvrir l'acompte attendu.
  const paidAmount = Number(data.amount ?? body.amount);
  if (outcome === "paid" && Number.isFinite(paidAmount) && paidAmount > 0 && paidAmount < Number(payment.amount)) {
    console.error("[camerpay-webhook] amount too low — not accepted", { paidAmount, expected: payment.amount, invoiceId });
    outcome = "pending";
  }

  const now = new Date().toISOString();
  let toNotify: Booking | null = null;

  if (outcome === "paid") {
    // Transaction SQL atomique : accepte l'acompte si la chambre est encore tenable,
    // sinon passe la réservation en « remboursement à faire » (pas de double réservation).
    const res = await db.rpc("mark_booking_paid", { p_booking: payment.booking_id });
    if (res.error) return dbError("mark_booking_paid", res.error);
    const result = res.data as string;
    if (!isProd) console.log("[camerpay-webhook] mark_booking_paid →", result);
    if (result === "pending") {
      const b = await db.from("bookings").select("*").eq("id", payment.booking_id).single();
      if (!b.error) toNotify = b.data as Booking;
    }
  } else if (outcome === "failed") {
    const res = await db
      .from("bookings")
      .update({ payment_status: "failed", updated_at: now })
      .eq("id", payment.booking_id)
      .eq("status", "awaiting_payment")
      .eq("payment_status", "pending");
    if (res.error) return dbError("set failed", res.error);
  }

  // Le paiement est marqué en dernier : si une étape précédente échoue, CamerPay renverra le webhook.
  const done = await db
    .from("payments")
    .update({
      status: outcome === "paid" ? "completed" : outcome === "failed" ? "failed" : "pending",
      raw: { ...(typeof payment.raw === "object" && payment.raw ? payment.raw : {}), webhook: body },
      updated_at: now,
    })
    .eq("id", payment.id);
  if (done.error) return dbError("update payment row", done.error);

  if (toNotify) {
    const { data: room } = await db.from("rooms").select("name_fr, name_en").eq("id", toNotify.room_id).single();
    const roomName = (toNotify.locale === "en" ? room?.name_en : room?.name_fr) ?? room?.name_fr ?? "";
    const s = await getSettings();
    await Promise.all([
      notifyManagerNewBooking(toNotify, roomName, s),
      notifyGuestBookingReceived(toNotify, roomName, s),
    ]);
  }

  return NextResponse.json({ ok: true });
}
