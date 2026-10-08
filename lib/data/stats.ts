import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dateKeyIn, shiftKey, weekStartKey } from "@/lib/date";
import type { MealLog } from "@/lib/types";

export interface SessionLite {
  id: string;
  title: string;
  type: "planned" | "custom";
  started_at: string;
  duration_min: number | null;
  calories_est: number | null;
  total_volume_kg: number | null;
  day: string; // local date key
}

export async function getRecentSessions(supabase: SupabaseClient, userId: string, tz: string, sinceKey: string) {
  const { data } = await supabase
    .from("workout_sessions")
    .select("id, title, type, started_at, duration_min, calories_est, total_volume_kg")
    .eq("user_id", userId)
    .eq("status", "completed")
    // Pad a day either side; exact local-day filtering happens below.
    .gte("started_at", shiftKey(sinceKey, -1) + "T00:00:00Z")
    .order("started_at", { ascending: true });
  return (data ?? [])
    .map((s) => ({ ...s, day: dateKeyIn(tz, new Date(s.started_at)) }) as SessionLite)
    .filter((s) => s.day >= sinceKey);
}

export async function getMealsBetween(supabase: SupabaseClient, userId: string, fromKey: string, toKey: string) {
  const { data } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", fromKey)
    .lte("log_date", toKey)
    .order("created_at", { ascending: true });
  return (data ?? []) as MealLog[];
}

export async function getWaterFor(supabase: SupabaseClient, userId: string, dayKey: string) {
  const { data } = await supabase.from("water_logs").select("ml").eq("user_id", userId).eq("log_date", dayKey);
  return Math.max(0, (data ?? []).reduce((t, r) => t + r.ml, 0));
}

export function sumMeals(meals: Pick<MealLog, "calories" | "protein_g" | "carbs_g" | "fat_g">[]) {
  return meals.reduce(
    (t, m) => ({
      calories: t.calories + Number(m.calories),
      protein_g: t.protein_g + Number(m.protein_g),
      carbs_g: t.carbs_g + Number(m.carbs_g),
      fat_g: t.fat_g + Number(m.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

/** Consecutive active days (workout or meal logged) ending today, or yesterday if today is still empty. */
export function computeStreak(activeDays: Set<string>, today: string): number {
  let day = activeDays.has(today) ? today : shiftKey(today, -1);
  let streak = 0;
  while (activeDays.has(day)) {
    streak++;
    day = shiftKey(day, -1);
  }
  return streak;
}

export function weekDays(today: string) {
  const start = weekStartKey(today);
  return Array.from({ length: 7 }, (_, i) => shiftKey(start, i));
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
