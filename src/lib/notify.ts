import "server-only";
import { Resend } from "resend";
import type { Booking, Settings } from "./types";
import { formatDate, formatFcfa } from "./format";

/** Envoi d'e-mail via Resend. Sans RESEND_API_KEY, les notifications sont simplement ignorées. */
async function sendEmail(to: string | null | undefined, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM || "Complexe La Fleur <onboarding@resend.dev>",
    to: [to],
    subject,
    text,
  });
  if (error) console.error("sendEmail failed", error);
}

export async function notifyGuestBookingReceived(b: Booking, roomName: string, s: Settings) {
  if (!b.guest_email) return;
  const fr = b.locale === "fr";
  const subject = fr
    ? `Demande de réservation ${b.reference} – ${s.hotel_name}`
    : `Booking request ${b.reference} – ${s.hotel_name}`;
  const dates = `${formatDate(b.check_in, b.locale)} → ${formatDate(b.check_out, b.locale)}`;
  const body = fr
    ? [
        `Bonjour ${b.guest_name},`,
        ``,
        `Nous avons bien reçu votre demande de réservation (réf. ${b.reference}).`,
        ``,
        `Chambre : ${roomName}`,
        `Séjour : ${dates} (${b.nights} nuit(s), ${b.guests} pers.)`,
        `Montant total : ${formatFcfa(b.total_amount)}`,
        b.deposit_amount > 0 ? `Acompte : ${formatFcfa(b.deposit_amount)}` : "",
        ``,
        `Notre équipe va examiner votre demande et vous confirmera rapidement.`,
        ``,
        s.hotel_name,
        s.phone ?? "",
      ].filter(l => l !== undefined).join("\n")
    : [
        `Hello ${b.guest_name},`,
        ``,
        `We have received your booking request (ref. ${b.reference}).`,
        ``,
        `Room: ${roomName}`,
        `Stay: ${dates} (${b.nights} night(s), ${b.guests} guest(s))`,
        `Total amount: ${formatFcfa(b.total_amount)}`,
        b.deposit_amount > 0 ? `Deposit: ${formatFcfa(b.deposit_amount)}` : "",
        ``,
        `Our team will review your request and confirm shortly.`,
        ``,
        s.hotel_name,
        s.phone ?? "",
      ].filter(l => l !== undefined).join("\n");
  await sendEmail(b.guest_email, subject, body);
}

export async function notifyManagerNewBooking(b: Booking, roomName: string, s: Settings) {
  await sendEmail(
    s.manager_email,
    `Nouvelle réservation ${b.reference}`,
    [
      `Nouvelle demande de réservation ${b.reference}`,
      `Client : ${b.guest_name} (${b.guest_phone}${b.guest_email ? `, ${b.guest_email}` : ""})`,
      `Chambre : ${roomName} — ${b.guests} pers.`,
      `Séjour : ${formatDate(b.check_in)} → ${formatDate(b.check_out)} (${b.nights} nuit(s))`,
      `Total : ${formatFcfa(b.total_amount)} — acompte payé : ${b.payment_status === "paid" ? formatFcfa(b.deposit_amount) : "non"}`,
      b.notes ? `Remarques : ${b.notes}` : "",
      "",
      "À valider dans l'espace admin.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export async function notifyGuestDecision(b: Booking, roomName: string, s: Settings, decision: "confirmed" | "declined") {
  if (!b.guest_email) return;
  const fr = b.locale === "fr";
  const subject = fr
    ? decision === "confirmed" ? `Réservation ${b.reference} confirmée` : `Réservation ${b.reference} non retenue`
    : decision === "confirmed" ? `Booking ${b.reference} confirmed` : `Booking ${b.reference} declined`;
  const dates = `${formatDate(b.check_in, b.locale)} → ${formatDate(b.check_out, b.locale)}`;
  const body = fr
    ? decision === "confirmed"
      ? `Bonjour ${b.guest_name},\n\nVotre réservation ${b.reference} est confirmée.\n${roomName} · ${dates}\nArrivée à partir de ${s.checkin_time}, départ avant ${s.checkout_time}.\n\nÀ bientôt au ${s.hotel_name}.`
      : `Bonjour ${b.guest_name},\n\nNous ne pouvons pas donner suite à la réservation ${b.reference} (${dates}).${b.payment_status === "paid" ? "\nVotre acompte vous sera remboursé : nous vous contacterons." : ""}\n\n${s.hotel_name}`
    : decision === "confirmed"
      ? `Hello ${b.guest_name},\n\nYour booking ${b.reference} is confirmed.\n${roomName} · ${dates}\nCheck-in from ${s.checkin_time}, check-out before ${s.checkout_time}.\n\nSee you soon at ${s.hotel_name}.`
      : `Hello ${b.guest_name},\n\nWe are unable to accept booking ${b.reference} (${dates}).${b.payment_status === "paid" ? "\nYour deposit will be refunded: we will contact you." : ""}\n\n${s.hotel_name}`;
  await sendEmail(b.guest_email, subject, body);
}
