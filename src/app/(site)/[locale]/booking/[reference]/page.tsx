import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { serviceClient } from "@/lib/supabase/admin";
import { formatDate, formatFcfa } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { PaymentPhoneForm } from "@/components/PaymentPhoneForm";
import { checkCmPhone, type Operator } from "@/lib/cm-phone";

export const metadata: Metadata = { robots: { index: false } };

// Cette page est accessible à quiconque connaît la référence : on n'y affiche
// jamais les coordonnées complètes du client.
function maskPhone(p: string) {
  const d = p.replace(/\D/g, "");
  const local = d.startsWith("237") && d.length === 12 ? d.slice(3) : d;
  if (local.length < 4) return "••••";
  return `${local.length === 9 ? "+237 " : ""}${local[0]}•• •• •• ${local.slice(-2)}`;
}
function maskEmail(e: string) {
  const [u, dom] = e.split("@");
  if (!dom) return "••••";
  return `${u.slice(0, 1)}•••@${dom}`;
}
function maskName(n: string) {
  const parts = n.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.slice(1).map((x) => x[0] + ".").join(" ")}` : parts[0];
}

// ─── Icônes de statut ────────────────────────────────────────────────────────

function IconConfirmed() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconPending() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconPayment() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function IconDeclined() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// ─── Étapes de progression ───────────────────────────────────────────────────

type ProgressStep = "pending" | "confirmed" | "done";

function BookingProgress({
  status,
  locale,
}: {
  status: string;
  locale: "fr" | "en";
}) {
  const steps =
    locale === "fr"
      ? ["Demande reçue", "Confirmation", "Séjour"]
      : ["Request received", "Confirmed", "Stay"];

  let activeIdx = 0;
  if (status === "confirmed") activeIdx = 1;
  if (status === "declined" || status === "cancelled" || status === "expired") activeIdx = -1;

  return (
    <div className="booking-progress" aria-label={locale === "fr" ? "Progression de la réservation" : "Booking progress"}>
      {steps.map((label, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={label} className="bp-step" data-done={done} data-active={active}>
            <div className="bp-dot" aria-hidden>
              {done ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5L20 7" />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <span className="bp-label">{label}</span>
            {i < steps.length - 1 && (
              <div className="bp-line" data-done={i < activeIdx} aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default async function BookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<{ change?: string }>;
}) {
  const { locale, reference } = await params;
  const { change } = await searchParams;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale].status;
  const db = serviceClient();

  const { data } = await db
    .from("bookings")
    .select("*, rooms(name_fr, name_en)")
    .eq("reference", reference.toUpperCase())
    .maybeSingle();

  // ─── Réservation introuvable ─────────────────────────────────────────────

  if (!data) {
    return (
      <>
        <div className="page-head">
          <div className="container">
            <h1>{t.title}</h1>
          </div>
        </div>
        <section className="section">
          <div className="container" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
            <div className="status-icon-wrap" data-status="declined">
              <IconDeclined />
            </div>
            <h2 style={{ marginTop: 20 }}>{t.notFound}</h2>
            <div style={{ marginTop: 24 }}>
              <Link href={`/${locale}/book`} className="btn btn-primary">
                {t.rebook}
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  // ─── Données ─────────────────────────────────────────────────────────────

  const booking = data as Booking & { rooms: { name_fr: string; name_en: string } | null };
  const expired =
    booking.status === "awaiting_payment" &&
    booking.hold_expires_at &&
    new Date(booking.hold_expires_at) < new Date();
  const status = expired ? "expired" : booking.status;

  // Dernière demande de paiement envoyée (numéro + opérateur saisis par le client)
  let payUrl: string | null = null;
  let paidFrom: string | null = null;
  let lastMethod: Operator | null = null;
  let askPhone = false;
  if (status === "awaiting_payment") {
    const { data: payment } = await db
      .from("payments")
      .select("pay_url, status, raw")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    payUrl = payment?.pay_url ?? null;
    const req = (payment?.raw as { request?: { customer_phone?: string; payment_method?: Operator } } | null)?.request;
    const used = checkCmPhone(req?.customer_phone ?? "");
    paidFrom = used.ok ? maskPhone(`+237${used.local}`) : null;
    lastMethod = req?.payment_method ?? null;
    // On demande le numéro tant qu'aucune demande n'est partie, après un échec,
    // ou quand le client veut changer de numéro.
    askPhone = !payment || payment.status === "failed" || booking.payment_status === "failed" || change === "1";
  }

  const roomName = booking.rooms
    ? locale === "fr"
      ? booking.rooms.name_fr
      : booking.rooms.name_en
    : "";

  // ─── Statut visuel ───────────────────────────────────────────────────────

  const statusMeta: Record<
    string,
    { icon: React.ReactNode; tone: "ok" | "gold" | "danger" | "neutral" }
  > = {
    confirmed:        { icon: <IconConfirmed />, tone: "ok" },
    pending:          { icon: <IconPending />, tone: "gold" },
    awaiting_payment: { icon: <IconPayment />, tone: "gold" },
    declined:         { icon: <IconDeclined />, tone: "danger" },
    cancelled:        { icon: <IconDeclined />, tone: "danger" },
    expired:          { icon: <IconDeclined />, tone: "danger" },
  };
  const meta = statusMeta[status] ?? { icon: <IconPending />, tone: "neutral" };

  return (
    <>
      {/* En-tête */}
      <div className="status-hero" data-tone={meta.tone}>
        <div className="container">
          <div className="status-hero-inner">
            <div className="status-icon-wrap" data-tone={meta.tone} aria-hidden>
              {meta.icon}
            </div>
            <div>
              <div className="status-ref" aria-label={`${t.reference} ${booking.reference}`}>
                <span>{t.reference}</span>
                <strong>{booking.reference}</strong>
              </div>
              <h1 style={{ margin: "8px 0 4px" }}>{t.title}</h1>
              <div>
                <span className="status-pill" data-status={status}>{t.labels[status]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corps */}
      <section className="section">
        <div className="container status-layout">

          {/* Colonne principale */}
          <div className="status-main">
            {/* Hint */}
            <div className="status-hint" data-tone={meta.tone}>
              <p>{t.hints[status]}</p>
            </div>

            {/* Barre de progression */}
            {!["declined", "cancelled", "expired"].includes(status) && (
              <div style={{ margin: "28px 0" }}>
                <BookingProgress status={status} locale={locale} />
              </div>
            )}

            {/* Étape 1 : saisie du numéro Mobile Money (format CamerPay) */}
            {status === "awaiting_payment" && askPhone && (
              <PaymentPhoneForm
                locale={locale}
                reference={booking.reference}
                amountLabel={formatFcfa(booking.deposit_amount, locale)}
                defaultMethod={lastMethod}
              />
            )}

            {/* Étape 2 : demande envoyée, confirmation sur le téléphone */}
            {status === "awaiting_payment" && !askPhone && (
              <div className="ussd-banner">
                <div className="ussd-phone-icon" aria-hidden>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="20" x="5" y="2" rx="2" />
                    <path d="M12 18h.01" />
                  </svg>
                </div>
                <div className="ussd-body">
                  <strong className="ussd-title">
                    {locale === "fr"
                      ? "Confirmez le paiement sur votre téléphone"
                      : "Confirm the payment on your phone"}
                  </strong>
                  <p className="ussd-desc">
                    {locale === "fr"
                      ? `Un message a été envoyé au ${paidFrom ?? maskPhone(booking.guest_phone)}. Entrez votre code PIN Mobile Money pour valider l'acompte de ${formatFcfa(booking.deposit_amount, locale)}.`
                      : `A prompt was sent to ${paidFrom ?? maskPhone(booking.guest_phone)}. Enter your Mobile Money PIN to confirm the deposit of ${formatFcfa(booking.deposit_amount, locale)}.`}
                  </p>
                  <p className="ussd-fallback">
                    {locale === "fr" ? "Vous n'avez rien reçu ? " : "Didn't receive anything? "}
                    <Link href={`/${locale}/booking/${booking.reference}?change=1`} className="ussd-fallback-link">
                      {locale === "fr" ? "Changer de numéro" : "Use another number"}
                    </Link>
                    {payUrl && (
                      <>
                        {locale === "fr" ? " ou " : " or "}
                        <a href={payUrl} className="ussd-fallback-link">
                          {locale === "fr" ? "payer sur la page CamerPay" : "pay on the CamerPay page"}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="status-actions">
              {/* Refresh uniquement pour les statuts actifs */}
              {(status === "awaiting_payment" && !askPhone) || status === "pending" ? (
                <Link
                  href={`/${locale}/booking/${booking.reference}`}
                  className="btn btn-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 2v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
                  </svg>
                  {t.refresh}
                </Link>
              ) : null}
            </div>

            {/* Bannière de relance pour les statuts terminaux */}
            {(status === "expired" || status === "declined" || status === "cancelled") && (() => {
              const rebookUrl = `/${locale}/book?checkIn=${booking.check_in}&checkOut=${booking.check_out}&guests=${booking.guests}`;
              return (
                <div className="rebook-banner">
                  <div className="rebook-banner-icon" aria-hidden>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M8 16H3v5" />
                    </svg>
                  </div>
                  <div className="rebook-banner-body">
                    <strong>
                      {locale === "fr"
                        ? status === "expired"
                          ? "Votre délai de paiement a expiré"
                          : "Votre réservation n'a pas abouti"
                        : status === "expired"
                          ? "Your payment window has expired"
                          : "Your booking was not completed"}
                    </strong>
                    <p>
                      {locale === "fr"
                        ? "Vous pouvez refaire une réservation avec les mêmes dates en un clic."
                        : "You can retry with the same dates in one click."}
                    </p>
                    <Link href={rebookUrl} className="btn btn-primary">
                      {locale === "fr" ? "Refaire la réservation" : "Retry this booking"}
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Carte récapitulatif */}
          <div className="status-card">
            <h2 className="status-card-title">
              {locale === "fr" ? "Détails de la réservation" : "Booking details"}
            </h2>

            <dl className="status-dl">
              <div>
                <dt>{t.room}</dt>
                <dd>{roomName}</dd>
              </div>
              <div>
                <dt>{locale === "fr" ? "Arrivée" : "Check-in"}</dt>
                <dd>{formatDate(booking.check_in, locale)}</dd>
              </div>
              <div>
                <dt>{locale === "fr" ? "Départ" : "Check-out"}</dt>
                <dd>{formatDate(booking.check_out, locale)}</dd>
              </div>
              <div>
                <dt>{t.guests}</dt>
                <dd>{booking.guests}</dd>
              </div>
              <div>
                <dt>{locale === "fr" ? "Nuits" : "Nights"}</dt>
                <dd>{booking.nights}</dd>
              </div>
            </dl>

            <hr className="status-sep" />

            <dl className="status-dl">
              <div className="status-dl-total">
                <dt>{t.total}</dt>
                <dd>{formatFcfa(booking.total_amount, locale)}</dd>
              </div>
              {booking.deposit_amount > 0 && (
                <div>
                  <dt>{t.deposit}</dt>
                  <dd>
                    {formatFcfa(booking.deposit_amount, locale)}
                    {booking.payment_status === "paid" && (
                      <span className="paid-badge">{t.paid}</span>
                    )}
                  </dd>
                </div>
              )}
              {booking.deposit_amount > 0 && booking.payment_status !== "paid" && (
                <div>
                  <dt>{locale === "fr" ? "Solde à régler" : "Balance due"}</dt>
                  <dd>{formatFcfa(booking.total_amount - booking.deposit_amount, locale)}</dd>
                </div>
              )}
            </dl>

            <hr className="status-sep" />

            <dl className="status-dl">
              <div>
                <dt>{locale === "fr" ? "Nom" : "Name"}</dt>
                <dd>{maskName(booking.guest_name)}</dd>
              </div>
              {booking.guest_email && (
                <div>
                  <dt>{locale === "fr" ? "E-mail" : "Email"}</dt>
                  <dd>{maskEmail(booking.guest_email)}</dd>
                </div>
              )}
              <div>
                <dt>{locale === "fr" ? "Téléphone" : "Phone"}</dt>
                <dd>{maskPhone(booking.guest_phone)}</dd>
              </div>
            </dl>

            {/* QR / référence imprimable */}
            {(status === "confirmed" || status === "pending") && (
              <div className="status-ref-box">
                <div className="status-ref-code">{booking.reference}</div>
                <p className="status-ref-hint">
                  {locale === "fr"
                    ? "Présentez cette référence à votre arrivée."
                    : "Show this reference upon arrival."}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
