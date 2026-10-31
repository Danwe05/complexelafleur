import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/admin";
import { checkCmPhone } from "@/lib/cm-phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lance le paiement de l'acompte d'une réservation, avec le numéro Mobile Money
 * que le client vient de saisir (et non plus automatiquement à la création).
 * Corps : { reference, phone, method: "orange_money" | "mtn_momo" }
 */

const schema = z.object({
  reference: z.string().trim().min(3).max(40),
  phone: z.string().trim().max(30),
  method: z.enum(["orange_money", "mtn_momo"]),
});

const fail = (error: string, status: number, detail?: string) =>
  NextResponse.json({ error, ...(detail ? { detail } : {}) }, { status });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid_input", 400);
  const { reference, method } = parsed.data;

  // 1. Numéro au format CamerPay
  const phone = checkCmPhone(parsed.data.phone);
  if (!phone.ok) return fail(phone.reason === "unsupported" ? "unsupported_operator" : "invalid_phone", 400);

  // 2. Réservation encore payable
  const db = serviceClient();
  const { data: booking, error: dbErr } = await db
    .from("bookings")
    .select("id, reference, status, deposit_amount, hold_expires_at, guest_name, guest_email, locale")
    .eq("reference", reference.toUpperCase())
    .maybeSingle();
  if (dbErr) return fail("server_error", 500);
  if (!booking) return fail("not_found", 404);

  const expired = booking.hold_expires_at && new Date(booking.hold_expires_at) <= new Date();
  if (booking.status !== "awaiting_payment" || expired || booking.deposit_amount <= 0) {
    return fail("not_payable", 409);
  }

  // 3. Appel CamerPay
  const token = process.env.CAMERPAY_API_TOKEN;
  if (!token) return fail("payment_unavailable", 502, "CAMERPAY_API_TOKEN manquant");

  const base = (process.env.CAMERPAY_BASE_URL || "https://camerpay.biz").replace(/\/$/, "");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const statusPage = `${site}/${booking.locale === "en" ? "en" : "fr"}/booking/${booking.reference}`;

  const request = {
    payment_method: method,
    amount: booking.deposit_amount,
    currency: "XAF",
    customer_phone: phone.camerpay, // 2376XXXXXXXX, sans « + »
    customer_name: booking.guest_name?.slice(0, 255) || undefined,
    customer_email: booking.guest_email || undefined,
    merchant_invoice_id: booking.reference,
    merchant_callback_url: `${site}/api/payments/camerpay/webhook`,
    merchant_return_url: statusPage,
    // Une clé par numéro + opérateur : changer de numéro crée une nouvelle tentative
    // au lieu de renvoyer l'ancienne transaction (idempotence CamerPay).
    idempotency_key: `${booking.reference}-${method}-${phone.local}`,
    source: "site_reservation",
  };

  let json: Record<string, any> | null = null;
  let httpStatus = 0;
  try {
    const res = await fetch(`${base}/api/payment/initiate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
    httpStatus = res.status;
    json = await res.json().catch(() => null);
  } catch (err) {
    console.error("CamerPay injoignable", err);
    return fail("payment_unavailable", 502);
  }

  if (httpStatus < 200 || httpStatus >= 300 || !json || json.success === false) {
    const fieldErrors =
      json?.errors && typeof json.errors === "object"
        ? Object.entries(json.errors).map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(", ") : String(m)}`).join(" | ")
        : "";
    const detail = [json?.message, fieldErrors].filter(Boolean).join(" — ") || `HTTP ${httpStatus}`;
    console.error("CamerPay refus", httpStatus, detail, { customer_phone: request.customer_phone, method });
    // Le numéro refusé par l'opérateur est une erreur que le client peut corriger.
    if (httpStatus === 422 && /phone|téléphone|numero|numéro/i.test(detail)) return fail("invalid_phone", 400, detail);
    return fail("payment_unavailable", 502, detail);
  }

  const data: Record<string, any> = json.data && typeof json.data === "object" ? json.data : json;
  const transactionUuid: string | undefined = data.transaction_uuid;
  const payUrl: string | null = data.pay_url || data.redirect_url || null;
  if (!transactionUuid) return fail("payment_unavailable", 502, "transaction_uuid absent");

  // 4. Enregistrement (upsert : CamerPay peut renvoyer la même transaction en cas de rejeu)
  const now = new Date().toISOString();
  const { error: payErr } = await db.from("payments").upsert(
    {
      booking_id: booking.id,
      transaction_uuid: transactionUuid,
      amount: booking.deposit_amount,
      status: String(data.status ?? "pending"),
      pay_url: payUrl,
      raw: { request: { customer_phone: request.customer_phone, payment_method: method }, response: json },
      updated_at: now,
    },
    { onConflict: "transaction_uuid" },
  );
  if (payErr) console.error("payments upsert failed", payErr);

  await db.from("bookings").update({ payment_status: "pending", updated_at: now }).eq("id", booking.id);

  return NextResponse.json({ ok: true, payUrl });
}
