import { DEMO_COOKIE, DEMO_USER_ID } from "./mode";

/** Demo stand-in for the browser Supabase client (Google sign-in). */
export function createDemoBrowserClient() {
  return {
    auth: {
      // "Continue with Google" signs straight in to the sample account.
      signInWithOAuth: async ({ options }: { provider: string; options?: { redirectTo?: string } }) => {
        document.cookie = `${DEMO_COOKIE}=${DEMO_USER_ID}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
        const next = options?.redirectTo ? new URL(options.redirectTo).searchParams.get("next") : null;
        window.location.assign(next ?? "/dashboard");
        return { data: { provider: "google", url: null }, error: null };
      },
    },
  };
}
