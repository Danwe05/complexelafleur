import type { Locale } from "./types";

export function formatFcfa(amount: number, locale: Locale = "fr") {
  const n = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(amount);
  return `${n.replace(/ | /g, " ")} FCFA`;
}

export function formatDate(iso: string, locale: Locale = "fr") {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

/** Normalise un numéro camerounais en +2376XXXXXXXX. Retourne null si invalide. */
export function normalizeCmPhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  const local = digits.startsWith("237") ? digits.slice(3) : digits;
  return /^6\d{8}$/.test(local) ? `+237${local}` : null;
}
