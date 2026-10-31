import "server-only";
import { redirect } from "next/navigation";
import { getAdminUser } from "./supabase/server";
import { serviceClient } from "./supabase/admin";

/** Retourne l'utilisateur admin, ou redirige vers la page de connexion. */
export async function requireAdmin() {
  // Utilise getSession() en interne (lecture des cookies) pour ne pas concurrencer
  // le refresh du middleware ("refresh_token_already_used").
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const { data: row } = await serviceClient()
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) redirect("/admin/login?error=forbidden");

  return user;
}

