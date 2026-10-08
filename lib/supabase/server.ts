import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClientRaw, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createDemoClient } from "@/lib/demo/client";
import { DEMO_MODE } from "@/lib/demo/mode";

/** Per-request Supabase client acting as the signed-in user (RLS applies). */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  if (DEMO_MODE) return createDemoClient(cookieStore) as unknown as SupabaseClient;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The proxy refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

export type AuthUser = { id: string; email?: string };

/**
 * Signed-in user from the session JWT. The project uses asymmetric signing keys, so this is
 * verified locally (JWKS is cached) instead of a ~0.5s round trip like `auth.getUser()`.
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims?.sub ? { id: claims.sub, email: claims.email } : null;
}

/** Anonymous client with no cookies, for public data on cacheable pages (RLS applies as `anon`). */
export function createPublicClient(): SupabaseClient {
  if (DEMO_MODE) return createDemoClient({ get: () => undefined, set: () => {} }) as unknown as SupabaseClient;
  return createAdminClientRaw(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Service-role client that bypasses RLS. Server-only; use sparingly (account deletion). */
export function createAdminClient(): SupabaseClient {
  if (DEMO_MODE) return createDemoClient({ get: () => undefined, set: () => {} }) as unknown as SupabaseClient;
  return createAdminClientRaw(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
