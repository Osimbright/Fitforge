import { z } from "zod";
import { AIError } from "@/lib/ai/client";
import { logGeneration } from "@/lib/ai/log";
import { suggestExerciseSwap, suggestMealSwap } from "@/lib/ai/plans";
import { consumeQuota } from "@/lib/ai/quota";
import { aiRoute } from "@/lib/ai/route";
import type { StoredDietPlan, StoredWorkoutPlan } from "@/lib/ai/schemas";

export const maxDuration = 60;

const Body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("exercise"), planId: z.uuid(), dayIndex: z.number().int().min(0), exerciseIndex: z.number().int().min(0) }),
  z.object({ type: z.literal("meal"), mealKey: z.string().max(10), request: z.string().max(300).optional() }),
]);

export const POST = aiRoute(async ({ supabase, user, profile, body }) => {
  const input = Body.parse(body);
  await consumeQuota(supabase, "swap");

  if (input.type === "exercise") {
    const { data: row } = await supabase
      .from("workout_plans")
      .select("id, location, plan")
      .eq("id", input.planId)
      .eq("user_id", user.id)
      .single<{ id: string; location: "home" | "gym"; plan: StoredWorkoutPlan }>();
    if (!row) throw new AIError("Plan not found", 404);

    const day = row.plan.days[input.dayIndex];
    const current = day?.exercises[input.exerciseIndex];
    if (!current) throw new AIError("Exercise not found", 404);

    const { exercise, reason } = await suggestExerciseSwap(
      supabase,
      profile,
      row.location,
      current,
      day.exercises.map((e) => e.exercise_id),
    );
    day.exercises[input.exerciseIndex] = exercise;
    await supabase.from("workout_plans").update({ plan: row.plan }).eq("id", row.id);
    await logGeneration(supabase, user.id, "exercise_swap", { ...input, replaced: current }, { exercise, reason });
    return { exercise, reason };
  }

  const { data: row } = await supabase
    .from("diet_plans")
    .select("id, plan")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single<{ id: string; plan: StoredDietPlan }>();
  if (!row) throw new AIError("No active diet plan", 404);

  const idx = row.plan.meals.findIndex((m) => m.key === input.mealKey);
  if (idx < 0) throw new AIError("Meal not found", 404);

  const replaced = row.plan.meals[idx];
  const meal = await suggestMealSwap(profile, replaced, input.request);
  row.plan.meals[idx] = meal;
  await supabase.from("diet_plans").update({ plan: row.plan }).eq("id", row.id);
  await logGeneration(supabase, user.id, "meal_swap", { ...input, diet_id: row.id, replaced }, { meal });
  return { meal };
});
