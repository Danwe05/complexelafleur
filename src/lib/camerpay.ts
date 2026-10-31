import "server-only";
import crypto from "node:crypto";

/**
 * Intégration CamerPay (Orange Money, MTN MoMo, cartes).
 * Documentation : https://camerpay.biz/docs
 *
 * Flux :
 *  1. POST /api/payment/initiate -> { transaction_uuid, status, pay_url }
 *  2. Le client est redirigé vers pay_url et choisit son opérateur.
 *  3. CamerPay appelle merchant_callback_url avec un webhook signé HMAC-SHA256.
 */

const baseUrl = () => (process.env.CAMERPAY_BASE_URL || "https://camerpay.biz").replace(/\/$/, "");

export type InitiateInput = {
  amount: number;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  invoiceId: string;
  callbackUrl: string;
  returnUrl: string;
};

export type InitiateResult = {
  transactionUuid: string;
  status: string;
  payUrl: string;
  raw: unknown;
};

export async function initiatePayment(input: InitiateInput): Promise<InitiateResult> {
  const token = process.env.CAMERPAY_API_TOKEN;
  if (!token) throw new Error("CAMERPAY_API_TOKEN manquant");

  const res = await fetch(`${baseUrl()}/api/payment/initiate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: "XAF",
      // CamerPay attend le format « 237699000000 », sans le « + ».
      customer_phone: input.customerPhone.replace(/^\+/, ""),
      ...(input.customerName ? { customer_name: input.customerName.slice(0, 255) } : {}),
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      merchant_invoice_id: input.invoiceId,
      merchant_callback_url: input.callbackUrl,
      merchant_return_url: input.returnUrl,
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
    console.error("CamerPay refus", res.status, {
      sent: { amount: input.amount, customer_phone: input.customerPhone, merchant_invoice_id: input.invoiceId, callback: input.callbackUrl, return: input.returnUrl },
      body: text.slice(0, 600),
    });
    throw new Error(`CamerPay HTTP ${res.status}: ${reason}`);
  }

  const data = (json.data && typeof json.data === "object" ? json.data : json) as Record<string, any>;
  const payUrl: string | undefined = data.pay_url || data.redirect_url;
  const transactionUuid: string | undefined = data.transaction_uuid;
  if (!payUrl || !transactionUuid) throw new Error("CamerPay: réponse inattendue (pay_url ou transaction_uuid absent)");

  return { transactionUuid, status: String(data.status ?? "pending"), payUrl, raw: json };
}

/**
 * Vérifie la signature HMAC-SHA256 du corps brut du webhook.
 * Le nom de l'en-tête est configurable (CAMERPAY_SIGNATURE_HEADER) : à confirmer
 * dans la documentation webhooks de CamerPay.
 */
export function verifyWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.CAMERPAY_WEBHOOK_SECRET;
  if (!secret) return process.env.CAMERPAY_ALLOW_UNSIGNED === "true";

  const headerName = process.env.CAMERPAY_SIGNATURE_HEADER || "x-camerpay-signature";
  const received = headers.get(headerName)?.trim().replace(/^sha256=/i, "");
  if (!received) return process.env.CAMERPAY_ALLOW_UNSIGNED === "true";

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