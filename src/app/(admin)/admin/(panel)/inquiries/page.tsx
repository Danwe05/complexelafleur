import { serviceClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { toggleInquiry } from "../actions";
import { getAdminDict } from "@/lib/admin-i18n";

type Inquiry = {
  id: string;
  kind: "contact" | "quote" | "spa";
  name: string;
  phone: string | null;
  email: string | null;
  event_type: string | null;
  event_date: string | null;
  guests: number | null;
  message: string | null;
  handled: boolean;
  created_at: string;
};

export default async function InquiriesPage() {
  const { data } = await serviceClient()
    .from("inquiries")
    .select("*")
    .order("handled")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Inquiry[];
  const { lang, t } = await getAdminDict();
  const locale = lang === "en" ? "en-GB" : "fr-FR";

  return (
    <>
      <h1 style={{ fontSize: "2rem" }}>{t.inquiries}</h1>
      <p className="muted">{t.inquiriesLead}</p>
      {rows.length === 0 && <p className="panel muted">{t.noInquiries}</p>}
      {rows.map((r) => (
        <article key={r.id} className="panel" style={{ opacity: r.handled ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <strong>{r.name}</strong>{" "}
              <span className="status-pill" data-status={r.handled ? "confirmed" : "pending"}>
                {r.kind === "quote" ? t.kindQuote : r.kind === "spa" ? t.kindSpa : t.kindContact}
              </span>
              <br />
              {r.phone && <a href={`tel:${r.phone}`}>{r.phone}</a>}
              {r.phone && r.email && " · "}
              {r.email && <a href={`mailto:${r.email}`}>{r.email}</a>}
            </div>
            <span className="muted">{new Date(r.created_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          {r.kind !== "contact" && (
            <p style={{ margin: "8px 0 0" }}>
              {r.event_type}
              {r.event_date ? `, ${t.onDate} ${formatDate(r.event_date)}` : ""}
              {r.guests ? `, ${r.guests} ${t.people}` : ""}
            </p>
          )}
          <p style={{ margin: "8px 0 12px", whiteSpace: "pre-wrap" }}>{r.message}</p>
          <form action={toggleInquiry}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="handled" value={String(!r.handled)} />
            <button className="btn btn-ghost btn-ghost-dark btn-sm" type="submit">
              {r.handled ? t.reopen : t.markHandled}
            </button>
          </form>
        </article>
      ))}
    </>
  );
}
