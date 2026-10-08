import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AIError } from "./client";

/** Daily per-user AI limits (free plan). */
export const AI_LIMITS = {
  plan: 10,
  chat: 50,
  meal: 60,
  swap: 40,
  review: 5,
} as const;

export async function consumeQuota(supabase: SupabaseClient, kind: keyof typeof AI_LIMITS) {
  const { data, error } = await supabase.rpc("consume_ai_quota", { p_kind: kind, p_limit: AI_LIMITS[kind] });
  if (error) {
    console.error("[quota]", error.message);
    throw new AIError("Couldn't check your AI usage. Is the database set up?", 500);
  }
  if (data !== true) {
    throw new AIError(`You've reached today's limit for this AI feature (${AI_LIMITS[kind]}/day). It resets tomorrow.`, 429);
  }
}
