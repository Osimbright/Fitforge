import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Kind = "meal_estimate" | "exercise_swap" | "meal_swap";

/** Records a one-off AI result in `ai_generations`. Never fails the request it belongs to. */
export async function logGeneration(supabase: SupabaseClient, userId: string, kind: Kind, input: unknown, output: unknown) {
  const { error } = await supabase.from("ai_generations").insert({ user_id: userId, kind, input, output });
  if (error) console.error("[ai-log]", kind, error.message);
}
