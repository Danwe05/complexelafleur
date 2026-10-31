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
 * Retourne l'utilisateur depuis les cookies déjà rafraîchis par le middleware.
 * Utilise getSession() (lecture locale) pour ne pas déclencher un second refresh
 * qui causerait l'erreur "refresh_token_already_used".
 */
export async function getAdminUser() {
  try {
    const client = await sessionClient();
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data.session?.user ?? null;
  } catch {
    return null;
  }
}

