import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminDict } from "@/lib/admin-i18n";
import { sessionClient } from "@/lib/supabase/server";
import { setAdminLang } from "./actions";

async function logout() {
  "use server";
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const { lang, t } = await getAdminDict();
  return (
    <>
      <header className="admin-bar">
        <div className="container">
          <Link href="/admin" className="brand" aria-label={t.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-emblem.png" alt="" width={33} height={36} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-wordmark.png" alt="" width={140} height={20} />
          </Link>
          <nav style={{ display: "flex", gap: 20, flexWrap: "wrap" }} aria-label={t.navLabel}>
            <Link href="/admin">{t.bookings}</Link>
            <Link href="/admin/rooms">{t.rooms}</Link>
            <Link href="/admin/inquiries">{t.inquiries}</Link>
            <Link href="/admin/settings">{t.settings}</Link>
            <Link href="/fr">{t.viewSite}</Link>
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <form action={setAdminLang} style={{ display: "flex", gap: 6 }} aria-label={t.language}>
              <button className="btn btn-ghost btn-sm" type="submit" name="lang" value="fr" aria-pressed={lang === "fr"} style={{ opacity: lang === "fr" ? 1 : 0.6 }}>FR</button>
              <button className="btn btn-ghost btn-sm" type="submit" name="lang" value="en" aria-pressed={lang === "en"} style={{ opacity: lang === "en" ? 1 : 0.6 }}>EN</button>
            </form>
            <form action={logout} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem", color: "#cfe3e1" }}>{user.email}</span>
              <button className="btn btn-ghost btn-sm" type="submit">{t.logout}</button>
            </form>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <div className="container">{children}</div>
      </main>
    </>
  );
}
