import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "./supabase/server";
import { serviceClient } from "./supabase/admin";

/** Utilisateur connecté ET présent dans la table admins, sinon null. */
export const getVerifiedAdmin = cache(async () => {
  const user = await getAdminUser();
  if (!user) return null;
  const { data: row, error } = await serviceClient()
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !row) return null;
  return user;
});

/**
 * Retourne l'utilisateur admin, ou redirige vers la page de connexion.
 * À appeler dans CHAQUE server action et chaque page admin : un layout
 * ne protège pas les server actions (elles s'exécutent avant le rendu).
 */
export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const admin = await getVerifiedAdmin();
  if (!admin) redirect("/admin/login?error=forbidden");
  return admin;
}
