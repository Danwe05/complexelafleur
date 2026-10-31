"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { checkCmPhone, formatCmLocal, type Operator } from "@/lib/cm-phone";
import type { Locale } from "@/lib/types";

type Props = {
  locale: Locale;
  reference: string;
  /** Montant déjà formaté, ex. « 33 000 FCFA » */
  amountLabel: string;
  /** Numéro saisi lors de la réservation, proposé par défaut */
  defaultPhone?: string;
  defaultMethod?: Operator | null;
};

const L = {
  fr: {
    title: "Numéro Mobile Money pour le paiement",
    lead: (a: string) => `Indiquez le numéro qui paiera l'acompte de ${a}. Vous recevrez une demande de confirmation sur ce téléphone.`,
    operator: "Opérateur",
    phone: "Numéro de téléphone",
    help: "9 chiffres commençant par 6, par exemple 6 90 00 00 01.",
    detected: (op: string) => `Numéro ${op} détecté.`,
    mismatch: (op: string) => `Ce numéro ressemble à un numéro ${op}. Vérifiez l'opérateur choisi.`,
    submit: "Recevoir la demande de paiement",
    sending: "Envoi de la demande…",
    errors: {
      empty: "Entrez votre numéro Mobile Money.",
      format: "Numéro invalide : 9 chiffres commençant par 6 (ex. 6 90 00 00 01).",
      unsupported: "Seuls Orange Money et MTN MoMo sont acceptés.",
      unsupported_operator: "Seuls Orange Money et MTN MoMo sont acceptés.",
      invalid_phone: "Ce numéro a été refusé par l'opérateur. Vérifiez-le ou essayez un autre numéro.",
      not_payable: "Cette réservation ne peut plus être payée. Actualisez la page.",
      not_found: "Réservation introuvable.",
      payment_unavailable: "Le paiement est momentanément indisponible. Réessayez dans un instant.",
      server_error: "Une erreur est survenue. Réessayez dans un instant.",
      invalid_input: "Vérifiez le numéro et l'opérateur.",
      no_operator: "Choisissez votre opérateur.",
    } as Record<string, string>,
  },
  en: {
    title: "Mobile Money number for payment",
    lead: (a: string) => `Enter the number that will pay the ${a} deposit. You will receive a confirmation request on this phone.`,
    operator: "Operator",
    phone: "Phone number",
    help: "9 digits starting with 6, for example 6 90 00 00 01.",
    detected: (op: string) => `${op} number detected.`,
    mismatch: (op: string) => `This looks like a ${op} number. Check the selected operator.`,
    submit: "Receive the payment request",
    sending: "Sending the request…",
    errors: {
      empty: "Enter your Mobile Money number.",
      format: "Invalid number: 9 digits starting with 6 (e.g. 6 90 00 00 01).",
      unsupported: "Only Orange Money and MTN MoMo are accepted.",
      unsupported_operator: "Only Orange Money and MTN MoMo are accepted.",
      invalid_phone: "The operator rejected this number. Check it or try another number.",
      not_payable: "This booking can no longer be paid. Refresh the page.",
      not_found: "Booking not found.",
      payment_unavailable: "Payment is temporarily unavailable. Try again shortly.",
      server_error: "Something went wrong. Try again shortly.",
      invalid_input: "Check the number and the operator.",
      no_operator: "Choose your operator.",
    } as Record<string, string>,
  },
};

const OPS: { id: Operator; name: string; dot: string }[] = [
  { id: "orange_money", name: "Orange Money", dot: "bg-[#ff7900]" },
  { id: "mtn_momo", name: "MTN MoMo", dot: "bg-[#ffcc00]" },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8962a]";

export function PaymentPhoneForm({ locale, reference, amountLabel, defaultPhone = "", defaultMethod = null }: Props) {
  const t = L[locale];
  const router = useRouter();

  const initial = checkCmPhone(defaultPhone);
  const [phone, setPhone] = useState(initial.ok ? formatCmLocal(initial.local) : "");
  const [method, setMethod] = useState<Operator | null>(defaultMethod ?? (initial.ok ? initial.operator : null));
  const [methodTouched, setMethodTouched] = useState(!!defaultMethod);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const check = checkCmPhone(phone);
  const fieldError = touched && !check.ok ? t.errors[check.reason] : null;
  const detected = check.ok ? check.operator : null;
  const detectedName = OPS.find((o) => o.id === detected)?.name;
  const mismatch = detected && method && detected !== method;

  function onPhoneChange(v: string) {
    // On garde chiffres, espaces et « + » ; affichage groupé dès 9 chiffres locaux
    const cleaned = v.replace(/[^\d+\s]/g, "").slice(0, 20);
    setPhone(cleaned);
    setError(null);
    const c = checkCmPhone(cleaned);
    if (c.ok && c.operator && !methodTouched) setMethod(c.operator);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!check.ok) return;
    if (!method) {
      setError(t.errors.no_operator);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, phone: check.camerpay, method }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(t.errors[json.error] ?? t.errors.server_error);
        setSending(false);
        return;
      }
      // Retour à la page de suivi (sans ?change=1), qui affiche la demande envoyée
      router.replace(`/${locale}/booking/${reference}`);
      router.refresh();
    } catch {
      setError(t.errors.server_error);
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mb-6 rounded-2xl bg-white p-5 ring-1 ring-[#0f3b2d]/[0.08] shadow-[0_12px_32px_-18px_rgba(15,59,45,0.3)] sm:p-7"
    >
      <h2 className="m-0 font-[family-name:var(--display)] text-xl font-bold leading-tight text-[#0f3b2d] sm:text-2xl">{t.title}</h2>
      <p className="mt-2 mb-0 max-w-prose text-sm leading-relaxed text-[#5d6b63]">{t.lead(amountLabel)}</p>

      {/* Opérateur */}
      <fieldset className="mt-6 border-0 p-0">
        <legend className="mb-2 p-0 text-[13px] font-semibold text-[#0f3b2d]">{t.operator}</legend>
        <div className="grid grid-cols-2 gap-3">
          {OPS.map((op) => {
            const sel = method === op.id;
            return (
              <label
                key={op.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#0f3b2d] transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#c8962a] ${
                  sel ? "bg-[#f2f9f5] ring-2 ring-[#0f4a38]" : "bg-white ring-1 ring-[#d5ded7] hover:ring-[#a8780f]/60"
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={op.id}
                  checked={sel}
                  onChange={() => {
                    setMethod(op.id);
                    setMethodTouched(true);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <span aria-hidden className={`h-3.5 w-3.5 shrink-0 rounded-full ${op.dot} ring-2 ring-white shadow`} />
                {op.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Numéro */}
      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor="pay-phone" className="text-[13px] font-semibold text-[#0f3b2d]">{t.phone}</label>
        <div
          className={`flex min-h-12 items-stretch overflow-hidden rounded-xl border bg-white transition-colors focus-within:ring-4 ${
            fieldError ? "border-[#b3261e] focus-within:ring-[#b3261e]/10" : "border-[#d5ded7] focus-within:border-[#a8780f] focus-within:ring-[#a8780f]/15"
          }`}
        >
          <span className="flex items-center border-r border-[#e4ebe5] bg-[#f4f6f2] px-3.5 text-[15px] font-medium text-[#0f3b2d]">+237</span>
          <input
            id="pay-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="6 90 00 00 01"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            onBlur={() => {
              setTouched(true);
              if (check.ok) setPhone(formatCmLocal(check.local));
            }}
            aria-invalid={!!fieldError}
            aria-describedby="pay-phone-msg"
            className="min-h-12 w-full min-w-0 rounded-none border-0 bg-transparent px-3.5 text-[15px] tracking-wide text-[#1d2b25] placeholder:text-[#9aa8a0] focus:outline-none focus:ring-0"
          />
        </div>
        <span id="pay-phone-msg" aria-live="polite" className={`text-xs ${fieldError ? "font-medium text-[#b3261e]" : mismatch ? "font-medium text-[#9a4d00]" : "text-[#5d6b63]"}`}>
          {fieldError ?? (mismatch && detectedName ? t.mismatch(detectedName) : detectedName ? t.detected(detectedName) : t.help)}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-5 mb-0 rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-medium text-[#b3261e] ring-1 ring-[#b3261e]/20">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f3b2d] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#a8780f] disabled:cursor-wait disabled:opacity-70 sm:w-auto ${focus}`}
      >
        {sending && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />}
        {sending ? t.sending : t.submit}
      </button>
    </form>
  );
}
