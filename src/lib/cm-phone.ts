/**
 * Numéros Mobile Money camerounais, au format attendu par CamerPay.
 * CamerPay veut « 237 » + 9 chiffres, sans « + » ni espace : 237699000000.
 * Utilisable côté client (validation en direct) et côté serveur (contrôle final).
 */

export type Operator = "orange_money" | "mtn_momo";

export type PhoneCheck =
  | { ok: true; local: string; camerpay: string; operator: Operator | null }
  | { ok: false; reason: "empty" | "format" | "unsupported" };

// Préfixes indicatifs : ils servent à présélectionner l'opérateur, pas à bloquer.
const MTN = /^6(5[0-4]|7\d|8[0-3])/;
const ORANGE = /^6(5[5-9]|9\d|8[6-9])/;
// Opérateurs que CamerPay n'encaisse pas (Nexttel 66x, Camtel 62x).
const UNSUPPORTED = /^6(6|2)\d/;

/** Valide et normalise un numéro saisi librement (« 6 90 00 00 01 », « +237 690… », « 00237… »). */
export function checkCmPhone(raw: string): PhoneCheck {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return { ok: false, reason: "empty" };
  if (d.startsWith("00237")) d = d.slice(5);
  else if (d.startsWith("237") && d.length === 12) d = d.slice(3);

  if (!/^6\d{8}$/.test(d)) return { ok: false, reason: "format" };
  if (UNSUPPORTED.test(d)) return { ok: false, reason: "unsupported" };

  const operator: Operator | null = MTN.test(d) ? "mtn_momo" : ORANGE.test(d) ? "orange_money" : null;
  return { ok: true, local: d, camerpay: `237${d}`, operator };
}

/** 690000001 → « 6 90 00 00 01 » (affichage). */
export function formatCmLocal(local: string) {
  const d = local.replace(/\D/g, "").slice(0, 9);
  return [d.slice(0, 1), d.slice(1, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
}
