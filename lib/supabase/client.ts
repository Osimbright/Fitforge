import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDemoBrowserClient } from "@/lib/demo/browser";
import { DEMO_MODE } from "@/lib/demo/mode";

export function createClient(): SupabaseClient {
  if (DEMO_MODE) return createDemoBrowserClient() as unknown as SupabaseClient;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
