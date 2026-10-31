import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const locales = ["fr", "en"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // -----------------------------------------------------------------------
  // Espace admin : le middleware est l'unique endroit qui rafraîchit la
  // session Supabase. Les Server Components ne font que lire les cookies
  // déjà mis à jour pour éviter la race condition "refresh_token_already_used".
  // -----------------------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    // On crée la réponse; setAll l'enrichit avec les nouveaux cookies de session
    // si le token a été rafraîchi. req est NextRequest — il expose bien .cookies.
    let res = NextResponse.next({ request: req });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll(list) {
            // Propager les nouveaux tokens vers la requête et la réponse.
            list.forEach(({ name, value }) => req.cookies.set(name, value));
            res = NextResponse.next({ request: req });
            list.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // 1. Lire la session locale depuis les cookies (aucun appel réseau)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session || sessionError) {
      const redirectRes = NextResponse.redirect(new URL("/admin/login", req.url));
      req.cookies.getAll().forEach((c) => {
        if (c.name.startsWith("sb-")) {
          redirectRes.cookies.set(c.name, "", { maxAge: 0, path: "/" });
        }
      });
      return redirectRes;
    }

    // 2. Si le token est encore valide (> 60s restantes), pas besoin d'appel réseau.
    // Cela évite la race condition "refresh_token_already_used" lors de requêtes simultanées.
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;
    const isCloseToExpiry = expiresAt - now < 60;

    if (!isCloseToExpiry) {
      return res;
    }

    // 3. Token expiré ou sur le point de l'être : on appelle getUser() pour déclencher le refresh.
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        const redirectRes = NextResponse.redirect(new URL("/admin/login", req.url));
        req.cookies.getAll().forEach((c) => {
          if (c.name.startsWith("sb-")) {
            redirectRes.cookies.set(c.name, "", { maxAge: 0, path: "/" });
          }
        });
        return redirectRes;
      }
      return res;
    } catch {
      const redirectRes = NextResponse.redirect(new URL("/admin/login", req.url));
      req.cookies.getAll().forEach((c) => {
        if (c.name.startsWith("sb-")) {
          redirectRes.cookies.set(c.name, "", { maxAge: 0, path: "/" });
        }
      });
      return redirectRes;
    }
  }

  // Site public : redirection vers la langue préférée.
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    return NextResponse.next();
  }

  const accept = req.headers.get("accept-language")?.toLowerCase() ?? "";
  const locale = accept.startsWith("en") ? "en" : "fr";
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)",],
};
