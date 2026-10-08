import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, DEMO_MODE } from "@/lib/demo/mode";

// Signed-out visitors to these sections are sent to /login. Anything else (including unknown URLs) renders
// normally, so typos get the 404 page. The pages still enforce auth themselves (getSessionProfile), and RLS
// guards the data, so a section missing here is never exposed — it just skips the friendly redirect.
const PROTECTED_PATHS = ["/dashboard", "/workouts", "/exercises", "/diet", "/progress", "/coach", "/profile", "/onboarding", "/reset-password"];
const AUTH_PAGES = ["/login", "/signup"];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Refreshes the Supabase session cookie on every request and does an
 * optimistic auth redirect. Real authorization still happens via RLS.
 */
export async function updateSession(request: NextRequest) {
  // When a redirect URL isn't on Supabase's allow-list, email links fall back to the bare Site URL
  // (e.g. "/?code=…"). Hand those to the callback so the sign-in still completes.
  const { searchParams } = request.nextUrl;
  if (request.nextUrl.pathname === "/" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.has("next")) url.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(url);
  }
  // Expired/used links come back as "/?error=…&error_description=…" — show that on the login page.
  if (request.nextUrl.pathname === "/" && searchParams.has("error_description")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", searchParams.get("error_description")!);
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  // Demo mode (no Supabase keys): the session is a cookie with the demo user's id.
  // Pages re-check it, so signed-in users aren't bounced off /login here — a stale
  // cookie after a dev-server restart would otherwise cause a redirect loop.
  if (DEMO_MODE) {
    const { pathname } = request.nextUrl;
    if (!request.cookies.get(DEMO_COOKIE)?.value && isProtected(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // Must run before any response is produced so refreshed tokens are written back.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!signedIn && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (signedIn && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
