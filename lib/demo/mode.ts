/**
 * Demo mode: when Supabase isn't configured, the app runs on an in-memory backend
 * seeded with sample data, and AI features return canned responses. Adding the
 * Supabase keys to .env.local switches everything back to the real services.
 */
export const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cookie holding the signed-in demo user's id. */
export const DEMO_COOKIE = "ff_demo_uid";

/** Fixed id so the sample account survives dev-server restarts. */
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_EMAIL = "demo@fitforge.app";
