import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/admin";
import { checkCmPhone } from "@/lib/cm-phone";
import { CamerPayError } from "@/lib/camerpay";
import { siteUrl, startDepositPayment } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Nouvelle tentative de paiement de l'acompte depuis la page de suivi
 * (après un échec, ou pour changer de numéro / d'opérateur).
 * Corps : { reference, phone, method: "orange_money" | "mtn_momo" }
 */

const schema = z.object({
  reference: z.string().trim().min(3).max(40),
  phone: z.string().trim().max(30),
  method: z.enum(["orange_money", "mtn_momo"]),
});

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid_input", 400);
  const { reference, method } = parsed.data;

  const phone = checkCmPhone(parsed.data.phone);
  if (!phone.ok) return fail(phone.reason === "unsupported" ? "unsupported_operator" : "invalid_phone", 400);

  const db = serviceClient();
  const { data: booking, error: dbErr } = await db
    .from("bookings")
    .select("id, reference, status, deposit_amount, hold_expires_at, guest_name, guest_email, locale")
    .eq("reference", reference.toUpperCase())
    .maybeSingle();
  if (dbErr) return fail("server_error", 500);
  if (!booking) return fail("not_found", 404);

  const expired = !booking.hold_expires_at || new Date(booking.hold_expires_at) <= new Date();
  if (booking.status !== "awaiting_payment" || expired || booking.deposit_amount <= 0) {
    return fail("not_payable", 409);
  }

  try {
    const payment = await startDepositPayment(db, booking, phone, method, siteUrl(req));
    return NextResponse.json({ ok: true, payUrl: payment.payUrl });
  } catch (err) {
    if (err instanceof CamerPayError && err.phoneRejected) return fail("invalid_phone", 400);
    console.error("payment initiation failed", err);
    return fail("payment_unavailable", 502);
  }
}
