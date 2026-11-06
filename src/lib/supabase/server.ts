import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Client lié à la session de l'utilisateur connecté (cookies). */
export async function sessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // En lecture seule depuis un Server Component – le middleware gère le refresh.
          }
        },
      },
    },
  );
}

/**
 * Retourne l'utilisateur connecté, VÉRIFIÉ auprès de Supabase Auth.
 *
 * getSession() se contente de lire le cookie, sans vérifier sa signature :
 * un cookie fabriqué à la main passait. getUser() valide le jeton côté serveur.
 * Le middleware a déjà rafraîchi le jeton s'il était proche de l'expiration,
 * donc cet appel ne déclenche pas de second refresh.
 */
export async function getAdminUser() {
  try {
    const client = await sessionClient();
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}
