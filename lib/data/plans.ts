import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredDietPlan, StoredWorkoutPlan } from "@/lib/ai/schemas";

export interface WorkoutPlanRow {
  id: string;
  title: string;
  location: "home" | "gym";
  plan: StoredWorkoutPlan;
  created_at: string;
}

export async function getActiveWorkoutPlan(supabase: SupabaseClient, userId: string, location?: "home" | "gym") {
  let q = supabase
    .from("workout_plans")
    .select("id, title, location, plan, created_at")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (location) q = q.eq("location", location);
  const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle<WorkoutPlanRow>();
  return data;
}

export async function getActiveDietPlan(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("diet_plans")
    .select("id, plan, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; plan: StoredDietPlan; created_at: string }>();
  return data;
}

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Today's planned day, or the next upcoming one if today is a rest day. */
export function pickTodaysWorkout(plan: StoredWorkoutPlan, weekday: (typeof WEEK)[number]) {
  const todayIdx = WEEK.indexOf(weekday);
  for (let offset = 0; offset < 7; offset++) {
    const wd = WEEK[(todayIdx + offset) % 7];
    const dayIndex = plan.days.findIndex((d) => d.weekday === wd);
    if (dayIndex >= 0) return { dayIndex, day: plan.days[dayIndex], isToday: offset === 0, weekday: wd };
  }
  return plan.days[0] ? { dayIndex: 0, day: plan.days[0], isToday: false, weekday: plan.days[0].weekday } : null;
}
