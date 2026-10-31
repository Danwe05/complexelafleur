import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getAdminDict } from "@/lib/admin-i18n";

async function login(formData: FormData) {
  "use server";
  const supabase = await sessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect("/admin/login?error=credentials");
  redirect("/admin");
}

async function switchLang(formData: FormData) {
  "use server";
  const lang = String(formData.get("lang")) === "en" ? "en" : "fr";
  (await cookies()).set("admin_lang", lang, { path: "/admin", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/admin/login");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { lang, t } = await getAdminDict();
  return (
    <main className="login-box">
      <form action={switchLang} style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} aria-label={t.language}>
        <button className="btn btn-ghost btn-ghost-dark btn-sm" type="submit" name="lang" value="fr" aria-pressed={lang === "fr"} style={{ opacity: lang === "fr" ? 1 : 0.6 }}>FR</button>
        <button className="btn btn-ghost btn-ghost-dark btn-sm" type="submit" name="lang" value="en" aria-pressed={lang === "en"} style={{ opacity: lang === "en" ? 1 : 0.6 }}>EN</button>
      </form>
      <h1 style={{ fontSize: "1.8rem" }}>{t.loginTitle}</h1>
      <p className="muted">{t.loginLead}</p>
      {error === "credentials" && <p className="alert alert-error">{t.loginBad}</p>}
      {error === "forbidden" && <p className="alert alert-error">{t.loginForbidden}</p>}
      <form action={login} style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <div className="field">
          <label htmlFor="email">{t.loginEmail}</label>
          <input id="email" name="email" type="email" required autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="password">{t.loginPassword}</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button type="submit" className="btn btn-primary">{t.loginSubmit}</button>
      </form>
    </main>
  );
}
