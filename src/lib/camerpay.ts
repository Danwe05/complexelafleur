import "server-only";
import crypto from "node:crypto";

/**
 * Intégration CamerPay (Orange Money, MTN MoMo).
 * Documentation : https://camerpay.biz/docs
 *
 * Flux :
 *  1. POST /api/payment/initiate -> { transaction_uuid, status, pay_url }
 *     Avec payment_method, la demande (push USSD) part directement sur le téléphone.
 *  2. CamerPay appelle merchant_callback_url avec un webhook signé HMAC-SHA256.
 *
 * C'est le SEUL endroit qui appelle CamerPay (création de réservation et
 * nouvelle tentative depuis la page de suivi passent toutes les deux ici).
 */

const baseUrl = () => (process.env.CAMERPAY_BASE_URL || "https://camerpay.biz").replace(/\/$/, "");

export type PaymentMethod = "orange_money" | "mtn_momo";

export type InitiateInput = {
  amount: number;
  /** Format CamerPay : 2376XXXXXXXX (sans « + »). */
  customerPhone: string;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerEmail?: string;
  invoiceId: string;
  callbackUrl: string;
  returnUrl: string;
  idempotencyKey?: string;
};

export type InitiateResult = {
  transactionUuid: string;
  status: string;
  payUrl: string | null;
  raw: unknown;
};

export class CamerPayError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    /** Le numéro a été refusé : le client peut le corriger. */
    public phoneRejected = false,
  ) {
    super(message);
  }
}

export async function initiatePayment(input: InitiateInput): Promise<InitiateResult> {
  const token = process.env.CAMERPAY_API_TOKEN;
  if (!token) throw new CamerPayError("CAMERPAY_API_TOKEN manquant", 0);

  const res = await fetch(`${baseUrl()}/api/payment/initiate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      payment_method: input.paymentMethod,
      amount: input.amount,
      currency: "XAF",
      customer_phone: input.customerPhone.replace(/^\+/, ""),
      ...(input.customerName ? { customer_name: input.customerName.slice(0, 255) } : {}),
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      merchant_invoice_id: input.invoiceId,
      merchant_callback_url: input.callbackUrl,
      merchant_return_url: input.returnUrl,
      ...(input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : {}),
      source: "site_reservation",
    }),
    cache: "no-store",
  });

  const text = await res.text();
  let json: Record<string, any> | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!res.ok || !json || json.success === false) {
    // Les erreurs 422 détaillent le champ refusé dans `errors` : on les remonte.
    const fieldErrors =
      json?.errors && typeof json.errors === "object"
        ? Object.entries(json.errors)
            .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(", ") : String(msg)}`)
            .join(" | ")
        : "";
    const reason = [json?.message || json?.error, fieldErrors].filter(Boolean).join(" — ") || text.slice(0, 300) || `HTTP ${res.status}`;
    console.error("CamerPay refus", res.status, { invoice: input.invoiceId, method: input.paymentMethod, reason });
    const phoneRejected = res.status === 422 && /phone|téléphone|numero|numéro/i.test(reason);
    throw new CamerPayError(`CamerPay HTTP ${res.status}: ${reason}`, res.status, phoneRejected);
  }

  const data = (json.data && typeof json.data === "object" ? json.data : json) as Record<string, any>;
  const transactionUuid: string | undefined = data.transaction_uuid;
  if (!transactionUuid) throw new CamerPayError("CamerPay: réponse inattendue (transaction_uuid absent)", res.status);

  return {
    transactionUuid,
    status: String(data.status ?? "pending"),
    payUrl: data.pay_url || data.redirect_url || null,
    raw: json,
  };
}

/** En production, un webhook non signé n'est JAMAIS accepté, quelle que soit la variable. */
export function unsignedAllowed() {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.CAMERPAY_ALLOW_UNSIGNED === "true";
}

/**
 * Vérifie la signature HMAC-SHA256 du corps brut du webhook.
 * Le nom de l'en-tête est configurable (CAMERPAY_SIGNATURE_HEADER) : à confirmer
 * dans la documentation webhooks de CamerPay.
 */
export function verifyWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.CAMERPAY_WEBHOOK_SECRET;
  if (!secret) return unsignedAllowed();

  const headerName = process.env.CAMERPAY_SIGNATURE_HEADER || "x-camerpay-signature";
  const received = headers.get(headerName)?.trim().replace(/^sha256=/i, "");
  if (!received) return unsignedAllowed();

  const hex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const b64 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return [hex, b64].some((expected) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

/** Normalise le statut CamerPay vers nos statuts internes. */
export function mapStatus(status: unknown): "paid" | "failed" | "pending" {
  const s = String(status ?? "").toLowerCase();
  if (["completed", "success", "successful", "paid"].includes(s)) return "paid";
  if (["failed", "cancelled", "canceled", "expired", "rejected", "refused"].includes(s)) return "failed";
  return "pending";
}
