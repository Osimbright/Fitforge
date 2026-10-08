import "server-only";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export async function authed() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export function fail(err: unknown): { ok: false; error: string } {
  const msg = err instanceof Error ? err.message : "Something went wrong";
  return { ok: false, error: msg };
}
