import Link from "next/link";
import { serviceClient } from "@/lib/supabase/admin";
import { formatDate, formatFcfa } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { getAdminDict } from "@/lib/admin-i18n";
import { decideBooking, markRefunded } from "./actions";

const filterKeys = ["pending", "awaiting_payment", "confirmed", "refund", "closed", "all"] as const;

type Row = Booking & { rooms: { name_fr: string } | null };

type SearchParams = { s?: string; wa?: string; ref?: string; decision?: string; room?: string; checkin?: string; checkout?: string; locale?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { s, wa, ref: waRef, decision: waDecision, room: waRoom, checkin: waCheckin, checkout: waCheckout, locale: waLocale } = sp;
  const { lang, t } = await getAdminDict();
  const filters = filterKeys.map((k) => [k, t.filters[k]] as const);
  const statusLabel = t.status;
  const paymentLabel = t.payment;
  const locale = lang === "en" ? "en-GB" : "fr-FR";
  const filter = filters.some(([k]) => k === s) ? (s as string) : "pending";
  const db = serviceClient();

  await db
    .from("bookings")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("status", "awaiting_payment")
    .lte("hold_expires_at", new Date().toISOString());

  let q = db.from("bookings").select("*, rooms(name_fr)").order("created_at", { ascending: false }).limit(200);
  if (filter === "pending" || filter === "awaiting_payment" || filter === "confirmed") q = q.eq("status", filter);
  if (filter === "closed") q = q.in("status", ["declined", "cancelled", "expired"]);
  if (filter === "refund") q = q.eq("payment_status", "refund_due");
  const { data } = await q;
  const rows = (data ?? []) as Row[];

  const { count: toValidate } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending");

  // Build WhatsApp notify URL if the receptionist just confirmed/declined a booking.
  let waNotifyUrl: string | null = null;
  let waNotifyLabel: string | null = null;
  if (wa && waRef && waDecision) {
    const guestLang = waLocale === "en" ? "en" : "fr";
    const dates = waCheckin && waCheckout
      ? `${formatDate(waCheckin, guestLang)} → ${formatDate(waCheckout, guestLang)}`
      : "";
    const msg =
      guestLang === "fr"
        ? waDecision === "confirmed"
          ? `Bonjour, votre réservation ${waRef} au Complexe La Fleur est confirmée !✅\n${waRoom ? waRoom + "\n" : ""}${dates}\nÀ bientôt !`
          : `Bonjour, nous sommes désolés, nous ne pouvons pas donner suite à votre réservation ${waRef} (${dates}). N'hésitez pas à nous recontacter.`
        : waDecision === "confirmed"
          ? `Hello, your booking ${waRef} at Complexe La Fleur is confirmed! ✅\n${waRoom ? waRoom + "\n" : ""}${dates}\nSee you soon!`
          : `Hello, we're sorry but we cannot accept your booking ${waRef} (${dates}). Please feel free to contact us again.`;
    waNotifyUrl = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
    waNotifyLabel = waDecision === "confirmed" ? t.waNotifyConfirmed : t.waNotifyDeclined;
  }

  return (
    <>
      {waNotifyUrl && (
        <div className="wa-notify-banner" role="alert">
          <div className="wa-notify-content">
            <span className="wa-notify-icon">💬</span>
            <div>
              <strong>{waNotifyLabel}</strong>
              <span className="muted" style={{ marginLeft: 8 }}>{waRef} · +{wa}</span>
            </div>
            <a href={waNotifyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-wa">
              {t.waNotifyBtn}
            </a>
            <Link href="/admin" className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }}>×</Link>
          </div>
        </div>
      )}
      <h1 style={{ fontSize: "2rem" }}>{t.bookings}</h1>
      <p className="muted">
        {toValidate ? `${toValidate} ${toValidate > 1 ? t.toValidateMany : t.toValidateOne}` : t.nothingToValidate}
      </p>
      <nav className="tabs" aria-label={t.filtersLabel}>
        {filters.map(([key, label]) => (
          <Link key={key} href={`/admin?s=${key}`} aria-current={filter === key}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="panel table-wrap">
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>{t.emptyList}</p>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>{t.colRef}</th>
                <th>{t.colGuest}</th>
                <th>{t.colStay}</th>
                <th>{t.colAmounts}</th>
                <th>{t.colStatus}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const wa = b.guest_phone.replace(/[^\d]/g, "");
                const canDecide = ["pending", "awaiting_payment"].includes(b.status);
                return (
                  <tr key={b.id}>
                    <td data-label={t.colRef}>
                      <strong>{b.reference}</strong>
                      <br />
                      <span className="muted">{new Date(b.created_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}</span>
                    </td>
                    <td data-label={t.colGuest}>
                      {b.guest_name}
                      <br />
                      <a href={`tel:${b.guest_phone}`}>{b.guest_phone}</a>
                      {" · "}
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                      {b.guest_email && (
                        <>
                          <br />
                          <a href={`mailto:${b.guest_email}`}>{b.guest_email}</a>
                        </>
                      )}
                      {b.notes && (
                        <>
                          <br />
                          <em className="muted">{b.notes}</em>
                        </>
                      )}
                    </td>
                    <td data-label={t.colStay}>
                      {b.rooms?.name_fr}
                      <br />
                      {formatDate(b.check_in)} → {formatDate(b.check_out)}
                      <br />
                      <span className="muted">{b.nights} {t.nights}, {b.guests} {t.persons}</span>
                    </td>
                    <td data-label={t.colAmounts}>
                      {formatFcfa(b.total_amount)}
                      <br />
                      <span className="muted">
                        {b.deposit_amount > 0 ? `${t.deposit} ${formatFcfa(b.deposit_amount)}` : t.noDeposit}
                      </span>
                      <br />
                      <span className="muted">{paymentLabel[b.payment_status]}</span>
                    </td>
                    <td data-label={t.colStatus}>
                      <span className="status-pill" data-status={b.status}>{statusLabel[b.status]}</span>
                    </td>
                    <td data-label={t.colActions}>
                      <div className="row-actions">
                        {canDecide && (
                          <form action={decideBooking}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="decision" value="confirmed" />
                            <button className="btn btn-ok btn-sm" type="submit">{t.confirm}</button>
                          </form>
                        )}
                        {["pending", "awaiting_payment", "confirmed"].includes(b.status) && (
                          <form action={decideBooking}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="decision" value={b.status === "confirmed" ? "cancelled" : "declined"} />
                            <button className="btn btn-danger btn-sm" type="submit">
                              {b.status === "confirmed" ? t.cancel : t.decline}
                            </button>
                          </form>
                        )}
                        {b.payment_status === "refund_due" && (
                          <form action={markRefunded}>
                            <input type="hidden" name="id" value={b.id} />
                            <button className="btn btn-ghost btn-ghost-dark btn-sm" type="submit">{t.markRefunded}</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
