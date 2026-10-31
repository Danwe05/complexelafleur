"use client";

import { useMemo, useState } from "react";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatDate, formatFcfa } from "@/lib/format";
import { Photo } from "./Photo";
import type { Locale } from "@/lib/types";
import { PaymentMethod } from "@/components/method";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "select" | "details" | "method" | "processing";

export type BookableRoom = {
  id: string;
  slug: string;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  remaining: number;
  images: string[];
};

type CheckoutSummary = {
  room: BookableRoom;
  nights: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  deposit: number;
  balance: number;
  depositPercent: number;
};

type GuestDetails = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

type Props = {
  locale: Locale;
  rooms: BookableRoom[];
  nights: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  depositPercent: number;
  policy: string;
  initialRoomSlug?: string;
};

// ─── Styles partagés (Tailwind) ──────────────────────────────────────────────
// Palette : vert #0f3b2d · vert bouton #0f4a38 · or #a8780f · or clair #f3ead3

const serif = "font-[family-name:var(--display)]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8962a]";
const card = "rounded-2xl bg-white ring-1 ring-[#0f3b2d]/[0.07]";
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f3b2d] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#a8780f] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#0f3b2d] ${focus}`;
const btnBack = `inline-flex items-center gap-1.5 rounded-xl px-4 py-3.5 text-sm font-medium text-[#0f3b2d] transition-colors hover:bg-[#eef2ec] ${focus}`;
const label = "text-[13px] font-semibold text-[#0f3b2d]";
const input =
  "min-h-12 w-full rounded-xl border border-[#d5ded7] bg-white px-4 py-3 text-[15px] text-[#1d2b25] placeholder:text-[#9aa8a0] transition-colors focus:border-[#a8780f] focus:outline-none focus:ring-4 focus:ring-[#a8780f]/15 aria-[invalid=true]:border-[#b3261e] aria-[invalid=true]:ring-[#b3261e]/10";
const help = "text-xs text-[#5d6b63]";
const fieldError = "text-xs font-medium text-[#b3261e]";

// ─── Icônes ──────────────────────────────────────────────────────────────────

const svg = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
const IconNext = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.5" {...svg} aria-hidden><path d="m9 18 6-6-6-6" /></svg>
);
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.5" {...svg} aria-hidden><path d="m15 18-6-6 6-6" /></svg>
);
const IconCheck = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="3" {...svg} aria-hidden><path d="m5 12 5 5L20 7" /></svg>
);
const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...svg} aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toneForIndex = (i: number) =>
  (["green", "gold", "water", "violet", "warm"] as const)[i % 5];

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className={`m-0 mb-6 ${serif} text-2xl font-bold leading-tight text-[#0f3b2d] sm:text-[28px]`}>
      <span className="sr-only">{n}. </span>
      {children}
    </h2>
  );
}

// ─── Étape 1 – Choix de la chambre ─────────────────────────────────────────

function RoomSelector({
  rooms,
  guests,
  nights,
  locale,
  selected,
  onSelect,
  onNext,
  t,
  d,
}: {
  rooms: BookableRoom[];
  guests: number;
  nights: number;
  locale: Locale;
  depositPercent: number;
  selected: BookableRoom | null;
  onSelect: (r: BookableRoom | null) => void;
  onNext: () => void;
  t: Dictionary["book"];
  d: Dictionary;
}) {
  const bookable = (r: BookableRoom) => r.remaining > 0 && r.capacity >= guests;

  return (
    <div id="step-select">
      <StepTitle n={1}>{locale === "fr" ? "Choisissez votre chambre" : "Choose your room"}</StepTitle>

      <div className="flex flex-col gap-4">
        {rooms.map((r, i) => {
          const ok = bookable(r);
          const isSel = selected?.id === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => ok && onSelect(isSel ? null : r)}
              aria-pressed={isSel}
              disabled={!ok}
              className={`group grid w-full grid-cols-[110px_1fr] overflow-hidden rounded-2xl bg-white text-left transition-all sm:grid-cols-[180px_1fr] ${focus} ${
                isSel
                  ? "ring-2 ring-[#0f4a38] shadow-[0_12px_32px_-16px_rgba(15,59,45,0.45)]"
                  : "ring-1 ring-[#0f3b2d]/[0.08] hover:ring-[#a8780f]/50 hover:shadow-[0_12px_32px_-18px_rgba(15,59,45,0.35)]"
              } ${ok ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            >
              <div className="relative min-h-32 sm:min-h-36">
                <div className="absolute inset-0">
                  <Photo images={r.images} alt={r.name} tone={toneForIndex(i)} icon="bed" className="h-full w-full rounded-none!" />
                </div>
                {!ok && (
                  <div className="absolute inset-0 z-10 grid place-items-center bg-black/50 px-2 text-center text-xs font-semibold text-white">
                    {t.soldOut}
                  </div>
                )}
                {isSel && (
                  <span className="absolute left-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-[#0f4a38] text-white shadow">
                    <IconCheck />
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-1 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                  <span className={`${serif} text-lg font-bold leading-tight text-[#0f3b2d] sm:text-xl`}>{r.name}</span>
                  {ok && r.remaining > 0 && r.remaining <= 2 && (
                    <span className="shrink-0 rounded-full bg-[#fdf1e4] px-2.5 py-1 text-[11px] font-semibold text-[#9a4d00]">
                      {t.left(r.remaining)}
                    </span>
                  )}
                </div>
                {r.description && <span className="line-clamp-2 text-[13px] leading-relaxed text-[#5d6b63]">{r.description}</span>}
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#5d6b63]">
                  <span className="text-[#a8780f]"><IconUsers /></span>
                  {r.capacity} {d.rooms.capacity}
                </span>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
                  <span className="leading-tight">
                    <span className="block text-lg font-bold text-[#0f3b2d]">{formatFcfa(r.pricePerNight * nights, locale)}</span>
                    <span className="text-xs text-[#5d6b63]">
                      {formatFcfa(r.pricePerNight, locale)} {d.rooms.perNight}
                    </span>
                  </span>
                  {isSel && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d6b3f]" aria-hidden>
                      <IconCheck size={12} /> {t.selected}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-6 flex justify-end">
          <button type="button" className={btnPrimary} onClick={onNext}>
            {locale === "fr" ? "Continuer" : "Continue"} <IconNext />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Étape 2 – Coordonnées ──────────────────────────────────────────────────

function GuestForm({
  locale,
  depositPercent,
  initial,
  onBack,
  onNext,
  t,
}: {
  locale: Locale;
  depositPercent: number;
  initial: GuestDetails;
  onBack: () => void;
  onNext: (d: GuestDetails) => void;
  t: Dictionary["book"];
}) {
  const [form, setForm] = useState<GuestDetails>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof GuestDetails, string>>>({});

  function set(k: keyof GuestDetails, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof GuestDetails, string>> = {};
    if (form.name.trim().length < 2) e.name = locale === "fr" ? "Nom requis (2 caractères min.)." : "Name required (2 chars min.).";
    if (!form.phone.trim()) e.phone = locale === "fr" ? "Numéro de téléphone requis." : "Phone number required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = locale === "fr" ? "E-mail invalide." : "Invalid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onNext(form);
  }

  return (
    <div id="step-details">
      <StepTitle n={2}>{t.yourDetails}</StepTitle>

      <form onSubmit={submit} noValidate className={`${card} p-5 sm:p-7`}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="co-name" className={label}>{t.name}</label>
            <input
              id="co-name" name="name" required minLength={2}
              autoComplete="name" value={form.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "co-name-err" : undefined}
              className={input}
            />
            {errors.name && <span id="co-name-err" className={fieldError}>{errors.name}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="co-phone" className={label}>{t.phone}</label>
            <input
              id="co-phone" name="phone" type="tel" required
              autoComplete="tel" inputMode="tel"
              placeholder="6 90 00 00 01"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "co-phone-err" : "co-phone-help"}
              className={input}
            />
            {errors.phone
              ? <span id="co-phone-err" className={fieldError}>{errors.phone}</span>
              : <span id="co-phone-help" className={help}>{t.phoneHelp}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="co-email" className={label}>{t.email}</label>
            <input
              id="co-email" name="email" type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "co-email-err" : "co-email-help"}
              className={input}
            />
            {errors.email
              ? <span id="co-email-err" className={fieldError}>{errors.email}</span>
              : <span id="co-email-help" className={help}>{t.emailHelp}</span>}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="co-notes" className={label}>{t.notes}</label>
            <textarea
              id="co-notes" name="notes" maxLength={1000}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${input} min-h-28 resize-y`}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1ec] pt-6">
          <button type="button" className={btnBack} onClick={onBack}>
            <IconBack /> {locale === "fr" ? "Retour" : "Back"}
          </button>
          <button type="submit" className={btnPrimary}>
            {depositPercent > 0
              ? (locale === "fr" ? "Choisir le paiement" : "Choose payment")
              : (locale === "fr" ? "Envoyer la demande" : "Send request")}
            <IconNext />
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Étape 3 – Récapitulatif + paiement ─────────────────────────────────────

function Row({ k, v, strong, tone }: { k: React.ReactNode; v: React.ReactNode; strong?: boolean; tone?: "gold" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="min-w-0 text-[#5d6b63]">{k}</dt>
      <dd className={`m-0 shrink-0 whitespace-nowrap text-right font-semibold ${strong ? "text-base text-[#0f3b2d]" : tone === "gold" ? "text-[#8a620b]" : "text-[#1d2b25]"}`}>
        {v}
      </dd>
    </div>
  );
}

function PayStep({
  locale,
  summary,
  guest,
  depositPercent,
  onBack,
  onPay,
  t,
  d,
}: {
  locale: Locale;
  summary: CheckoutSummary;
  guest: GuestDetails;
  depositPercent: number;
  onBack: () => void;
  onPay: (method: string) => void;
  t: Dictionary["book"];
  d: Dictionary;
}) {
  const [method, setMethod] = useState<string | null>(null);

  return (
    <div id="step-method">
      <StepTitle n={3}>{locale === "fr" ? "Récapitulatif & paiement" : "Review & payment"}</StepTitle>

      {/* Récap réservation */}
      <div className={`${card} p-5 sm:p-6`}>
        <dl className="m-0 grid gap-3">
          <Row k={locale === "fr" ? "Chambre" : "Room"} v={summary.room.name} />
          <Row k={d.search.checkIn} v={formatDate(summary.checkIn, locale)} />
          <Row k={d.search.checkOut} v={formatDate(summary.checkOut, locale)} />
          <Row k={d.search.guests} v={summary.guests} />
          <Row k={locale === "fr" ? "Durée" : "Length of stay"} v={t.nights(summary.nights)} />
        </dl>
        <hr className="my-4 border-0 border-t border-[#eef1ec]" />
        <dl className="m-0 grid gap-3">
          <Row k={t.total} v={formatFcfa(summary.total, locale)} strong />
          {depositPercent > 0 && (
            <>
              <Row k={t.deposit(depositPercent)} v={formatFcfa(summary.deposit, locale)} tone="gold" />
              <Row k={t.balance} v={formatFcfa(summary.balance, locale)} />
            </>
          )}
        </dl>
        <hr className="my-4 border-0 border-t border-[#eef1ec]" />
        <dl className="m-0 grid gap-3">
          <Row k={t.name} v={guest.name} />
          <Row k={t.phone} v={guest.phone} />
          {guest.email && <Row k={t.email} v={guest.email} />}
        </dl>
      </div>

      {/* Sélecteur de méthode */}
      {depositPercent > 0 ? (
        <div className="mt-8">
          <h3 className="m-0 mb-4 font-[family-name:var(--body)] text-base font-semibold text-[#0f3b2d]">
            {locale === "fr" ? "Moyen de paiement" : "Payment method"}
          </h3>
          <PaymentMethod locale={locale} selected={method} onSelect={setMethod} />
        </div>
      ) : (
        <p className="m-0 mt-6 flex items-start gap-3 rounded-xl bg-[#e9f5ee] p-4 text-sm text-[#1d6b3f] ring-1 ring-[#1d6b3f]/15">
          <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" {...svg} aria-hidden className="shrink-0">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
          </svg>
          {t.noDeposit}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={btnBack} onClick={onBack}>
          <IconBack /> {locale === "fr" ? "Retour" : "Back"}
        </button>
        <button
          type="button"
          className={btnPrimary}
          disabled={depositPercent > 0 && !method}
          onClick={() => onPay(method ?? "none")}
        >
          {depositPercent > 0 ? t.submitPay : t.submitSend}
        </button>
      </div>
    </div>
  );
}

// ─── Indicateur de progression ───────────────────────────────────────────────

function Stepper({ step, depositPercent, locale }: { step: Step; depositPercent: number; locale: Locale }) {
  const steps: Array<{ id: Step; labelFr: string; labelEn: string }> = [
    { id: "select", labelFr: "Chambre", labelEn: "Room" },
    { id: "details", labelFr: "Coordonnées", labelEn: "Details" },
    { id: "method", labelFr: depositPercent > 0 ? "Paiement" : "Confirmation", labelEn: depositPercent > 0 ? "Payment" : "Confirm" },
  ];

  // L'étape « processing » reste visuellement sur la dernière étape
  const currentIdx = step === "processing" ? steps.length - 1 : steps.findIndex((s) => s.id === step);

  return (
    <nav aria-label={locale === "fr" ? "Étapes de réservation" : "Booking steps"} className="mb-8">
      <ol className="m-0 flex list-none items-center p-0">
        {steps.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={s.id} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`} aria-current={active ? "step" : undefined}>
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
                  done
                    ? "bg-[#0f4a38] text-white"
                    : active
                      ? "bg-[#a8780f] text-white ring-4 ring-[#a8780f]/20"
                      : "bg-white text-[#5d6b63] ring-1 ring-[#d5ded7]"
                }`}
                aria-hidden
              >
                {done ? <IconCheck /> : i + 1}
              </span>
              <span
                className={`ml-2.5 hidden whitespace-nowrap text-sm font-semibold sm:inline ${
                  active ? "text-[#0f3b2d]" : done ? "text-[#0f4a38]" : "text-[#5d6b63]"
                }`}
              >
                {locale === "fr" ? s.labelFr : s.labelEn}
              </span>
              <span className="sr-only sm:hidden">{locale === "fr" ? s.labelFr : s.labelEn}</span>
              {i < steps.length - 1 && (
                <span aria-hidden className={`mx-3 h-0.5 flex-1 rounded-full transition-colors ${done ? "bg-[#0f4a38]" : "bg-[#dde4dc]"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function Checkout({
  locale,
  rooms,
  nights,
  checkIn,
  checkOut,
  guests,
  depositPercent,
  policy,
  initialRoomSlug,
}: Props) {
  const d = dictionaries[locale];
  const t = d.book;

  const bookable = (r: BookableRoom) => r.remaining > 0 && r.capacity >= guests;
  const preselected = rooms.find((r) => r.slug === initialRoomSlug && bookable(r)) ?? null;

  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<BookableRoom | null>(preselected);
  const [guest, setGuest] = useState<GuestDetails>({ name: "", phone: "", email: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const money = useMemo(() => {
    if (!selected) return null;
    const total = selected.pricePerNight * nights;
    const deposit = Math.ceil((total * depositPercent) / 100);
    return { total, deposit, balance: total - deposit };
  }, [selected, nights, depositPercent]);

  async function submit(_method: string) {
    if (!selected || !money) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selected.id,
          checkIn,
          checkOut,
          guests,
          name: guest.name,
          phone: guest.phone,
          email: guest.email || "",
          notes: guest.notes || "",
          locale,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.redirectUrl) {
        setError(t.errors[json.error] ?? t.errors.server_error);
        setSubmitting(false);
        setStep("method");
        return;
      }
      window.location.href = json.redirectUrl;
    } catch {
      setError(t.errors.server_error);
      setSubmitting(false);
      setStep("method");
    }
  }

  const summary: CheckoutSummary | null = selected && money
    ? { room: selected, nights, checkIn, checkOut, guests, ...money, depositPercent }
    : null;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      {/* Colonne principale */}
      <div className="min-w-0">
        <Stepper step={step} depositPercent={depositPercent} locale={locale} />

        {error && (
          <div role="alert" className="mb-6 rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-medium text-[#b3261e] ring-1 ring-[#b3261e]/20">
            {error}
          </div>
        )}

        {submitting && (
          <div role="status" aria-live="polite" className={`${card} flex flex-col items-center gap-4 px-6 py-14 text-center`}>
            <span aria-hidden className="h-12 w-12 animate-spin rounded-full border-4 border-[#dde4dc] border-t-[#a8780f] motion-reduce:animate-none" />
            <p className="m-0 text-sm font-medium text-[#0f3b2d]">{t.submitting}</p>
          </div>
        )}

        {!submitting && step === "select" && (
          <RoomSelector
            rooms={rooms} guests={guests} nights={nights}
            locale={locale} depositPercent={depositPercent}
            selected={selected}
            onSelect={setSelected}
            onNext={() => setStep("details")}
            t={t} d={d}
          />
        )}

        {!submitting && step === "details" && (
          <GuestForm
            locale={locale} depositPercent={depositPercent}
            initial={guest}
            onBack={() => setStep("select")}
            onNext={(g) => {
              setGuest(g);
              if (depositPercent > 0) setStep("method");
              else submit("none");
            }}
            t={t}
          />
        )}

        {!submitting && step === "method" && summary && (
          <PayStep
            locale={locale} summary={summary}
            guest={guest} depositPercent={depositPercent}
            onBack={() => setStep("details")}
            onPay={(m) => { setStep("processing"); submit(m); }}
            t={t} d={d}
          />
        )}
      </div>

      {/* Récapitulatif (colonne latérale) */}
      <aside aria-label={t.summary} className="lg:sticky lg:top-24">
        <div className={`${card} overflow-hidden shadow-[0_12px_32px_-18px_rgba(15,59,45,0.3)]`}>
          {selected ? (
            <div className="relative aspect-[16/9]">
              <div className="absolute inset-0">
                <Photo images={selected.images} alt={selected.name} tone={toneForIndex(rooms.indexOf(selected))} icon="bed" className="h-full w-full rounded-none!" />
              </div>
            </div>
          ) : (
            <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 bg-[#f4f6f2] p-6 text-center text-sm text-[#5d6b63]">
              <svg width="36" height="36" viewBox="0 0 24 24" strokeWidth="1.5" {...svg} aria-hidden>
                <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
              </svg>
              {locale === "fr" ? "Aucune chambre sélectionnée" : "No room selected"}
            </div>
          )}

          <div className="p-6">
            {selected && <p className={`m-0 mb-4 ${serif} text-xl font-bold text-[#0f3b2d]`}>{selected.name}</p>}

            <dl className="m-0 grid gap-2.5">
              <Row k={d.search.checkIn} v={formatDate(checkIn, locale)} />
              <Row k={d.search.checkOut} v={formatDate(checkOut, locale)} />
              <Row k={d.search.guests} v={guests} />
              <Row k={locale === "fr" ? "Durée" : "Length of stay"} v={t.nights(nights)} />
            </dl>

            {money && (
              <>
                <hr className="my-4 border-0 border-t border-[#eef1ec]" />
                <dl className="m-0 grid gap-2.5">
                  <Row k={t.total} v={formatFcfa(money.total, locale)} strong />
                  {depositPercent > 0 ? (
                    <>
                      <Row k={t.deposit(depositPercent)} v={formatFcfa(money.deposit, locale)} tone="gold" />
                      <Row k={t.balance} v={formatFcfa(money.balance, locale)} />
                    </>
                  ) : (
                    <p className="m-0 w-fit rounded-full bg-[#e9f5ee] px-3 py-1 text-xs font-semibold text-[#1d6b3f]">{t.noDeposit}</p>
                  )}
                </dl>
              </>
            )}

            {policy && (
              <>
                <hr className="my-4 border-0 border-t border-[#eef1ec]" />
                <p className="m-0 text-xs leading-relaxed text-[#5d6b63]">
                  <strong className="text-[#0f3b2d]">{t.cancelPolicy}.</strong> {policy}
                </p>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}