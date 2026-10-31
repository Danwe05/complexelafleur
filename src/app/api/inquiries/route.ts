import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";

export const runtime = "nodejs";

const schema = z.object({
  kind: z.enum(["contact", "quote", "spa"]),
  locale: z.enum(["fr", "en"]).default("fr"),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  eventType: z.string().trim().max(80).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.number().int().min(1).max(2000).optional(),
  message: z.string().trim().min(2).max(2000),
  website: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const d = parsed.data;

  // Piège à robots : on répond OK sans rien enregistrer.
  if (d.website) return NextResponse.json({ ok: true });

  const { error } = await serviceClient().from("inquiries").insert({
    kind: d.kind,
    name: d.name,
    phone: d.phone || null,
    email: d.email || null,
    event_type: d.eventType ?? null,
    event_date: d.eventDate ?? null,
    guests: d.guests ?? null,
    message: d.message,
    locale: d.locale,
  });
  if (error) {
    console.error("inquiry insert failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const settings = await getSettings();
  if (process.env.RESEND_API_KEY && settings.manager_email) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Complexe La Fleur <onboarding@resend.dev>",
        to: [settings.manager_email],
        subject: d.kind === "quote" ? `Demande de devis — ${d.name}` : d.kind === "spa" ? `Séance bien-être — ${d.name}` : `Message — ${d.name}`,
        text: `${d.name}\n${d.phone || ""} ${d.email || ""}\n${d.eventType ? `${d.eventType} · ${d.eventDate ?? ""} · ${d.guests ?? ""} pers.\n` : ""}\n${d.message}`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
