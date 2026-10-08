"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { StoredDietPlan } from "@/lib/ai/schemas";
import { ageFromDob, computeTargets } from "@/lib/fitness/calculations";
import { todayKey } from "@/lib/date";
import type { Profile } from "@/lib/types";
import { authed, fail, type Result } from "./common";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function logWater(ml: number): Promise<Result> {
  try {
    const amount = z.number().int().min(-2000).max(3000).parse(ml);
    const { supabase, user } = await authed();
    const { error } = await supabase.from("water_logs").insert({ user_id: user.id, ml: amount, log_date: await todayKey() });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const WeightInput = z.object({
  weight_kg: z.number().min(30).max(300),
  waist_cm: z.number().min(30).max(250).optional(),
  chest_cm: z.number().min(30).max(250).optional(),
  arm_cm: z.number().min(10).max(80).optional(),
  photo_path: z.string().max(300).optional(),
});

/** Logs body weight (and optional measurements) and refreshes calorie targets. */
export async function logWeight(input: z.input<typeof WeightInput>): Promise<Result> {
  try {
    const v = WeightInput.parse(input);
    const { supabase, user } = await authed();
    const log_date = await todayKey();

    // One entry per day (unique on user_id + log_date): replace today's.
    const { error } = await supabase.from("body_metrics").upsert(
      { waist_cm: null, chest_cm: null, arm_cm: null, photo_path: null, ...v, user_id: user.id, log_date },
      { onConflict: "user_id,log_date" },
    );
    if (error) throw error;

    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
    if (p?.height_cm && p.dob && p.gender && p.activity_level && p.goal) {
      const targets = computeTargets({
        weightKg: v.weight_kg,
        heightCm: p.height_cm,
        ageYears: ageFromDob(p.dob),
        gender: p.gender,
        activity: p.activity_level,
        goal: p.goal,
      });
      await supabase.from("profiles").update({ weight_kg: v.weight_kg, ...targets }).eq("id", user.id);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const MealInput = z.object({
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().trim().min(1).max(300),
  calories: z.number().min(0).max(5000),
  protein_g: z.number().min(0).max(500),
  carbs_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(500),
  source: z.enum(["plan", "ai", "manual"]).default("manual"),
  plan_meal_key: z.string().max(10).optional(),
  log_date: dateKey.optional(),
});

export async function addMeal(input: z.input<typeof MealInput>): Promise<Result> {
  try {
    const v = MealInput.parse(input);
    const { supabase, user } = await authed();
    const { error } = await supabase.from("meal_logs").insert({
      ...v,
      calories: Math.round(v.calories),
      user_id: user.id,
      log_date: v.log_date ?? (await todayKey()),
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMeal(id: string): Promise<Result> {
  try {
    const { supabase } = await authed();
    const { error } = await supabase.from("meal_logs").delete().eq("id", z.uuid().parse(id));
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Marks a planned meal as eaten today (or un-marks it). */
export async function togglePlanMeal(mealKey: string): Promise<Result<{ eaten: boolean }>> {
  try {
    const { supabase, user } = await authed();
    const log_date = await todayKey();

    const { data: existing } = await supabase
      .from("meal_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("log_date", log_date)
      .eq("plan_meal_key", mealKey)
      .maybeSingle();
    if (existing) {
      await supabase.from("meal_logs").delete().eq("id", existing.id);
      revalidatePath("/", "layout");
      return { ok: true, data: { eaten: false } };
    }

    const { data: plan } = await supabase
      .from("diet_plans")
      .select("plan")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single<{ plan: StoredDietPlan }>();
    const meal = plan?.plan.meals.find((m) => m.key === mealKey);
    if (!meal) throw new Error("Meal not found in your plan");

    const { error } = await supabase.from("meal_logs").insert({
      user_id: user.id,
      log_date,
      meal_type: meal.meal_type,
      description: meal.name,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      source: "plan",
      plan_meal_key: meal.key,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, data: { eaten: true } };
  } catch (e) {
    return fail(e);
  }
}
