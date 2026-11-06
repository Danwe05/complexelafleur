import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { initiatePayment, type PaymentMethod } from "./camerpay";

type PayableBooking = {
  id: string;
  reference: string;
  deposit_amount: number;
  guest_name: string | null;
  guest_email: string | null;
  locale: string;
};

/** URL publique du site, sans slash final. */
export function siteUrl(req: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
}

/**
 * Lance la demande de paiement de l'acompte et l'enregistre.
 * `raw.request` garde le numéro et l'opérateur : la page de suivi les affiche.
 */
export async function startDepositPayment(
  db: SupabaseClient,
  booking: PayableBooking,
  phone: { camerpay: string; local: string },
  method: PaymentMethod,
  site: string,
) {
  const statusPage = `${site}/${booking.locale === "en" ? "en" : "fr"}/booking/${booking.reference}`;
  const payment = await initiatePayment({
    amount: booking.deposit_amount,
    customerPhone: phone.camerpay,
    paymentMethod: method,
    customerName: booking.guest_name || undefined,
    customerEmail: booking.guest_email || undefined,
    invoiceId: booking.reference,
    callbackUrl: `${site}/api/payments/camerpay/webhook`,
    returnUrl: statusPage,
    // Une clé par numéro + opérateur : changer de numéro crée une nouvelle tentative.
    idempotencyKey: `${booking.reference}-${method}-${phone.local}`,
  });

  const now = new Date().toISOString();
  const { error } = await db.from("payments").upsert(
    {
      booking_id: booking.id,
      transaction_uuid: payment.transactionUuid,
      amount: booking.deposit_amount,
      status: payment.status,
      pay_url: payment.payUrl,
      raw: { request: { customer_phone: phone.camerpay, payment_method: method }, response: payment.raw },
      updated_at: now,
    },
    { onConflict: "transaction_uuid" },
  );
  if (error) console.error("payments upsert failed", error);

  await db.from("bookings").update({ payment_status: "pending", updated_at: now }).eq("id", booking.id);
  return payment;
}
