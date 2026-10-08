"use server";

import { todayKey } from "@/lib/date";
import { ageFromDob, computeTargets } from "@/lib/fitness/calculations";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validations/onboarding";

type Result = { ok: true } | { ok: false; error: string };

const STEP_FIELDS = new Set([
  "full_name", "phone",
  "gender", "dob", "height_cm", "weight_kg", "target_weight_kg", "units",
  "experience_level", "training_months",
  "goal", "days_per_week", "session_minutes",
  "training_location", "equipment",
  "diet_type", "allergies", "cuisine", "meals_per_day", "activity_level", "injuries",
]);

/** Saves partial progress so users can resume onboarding later. */
export async function saveOnboardingStep(values: Record<string, unknown>, step: number): Promise<Result> {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, error: "Not signed in" };

  const patch: Record<string, unknown> = { onboarding_step: Math.max(0, Math.min(6, Math.floor(step))), updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(values)) if (STEP_FIELDS.has(k) && v !== undefined && v !== "") patch[k] = v;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function completeOnboarding(values: unknown): Promise<Result> {
  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your answers" };
  const v = parsed.data;

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, error: "Not signed in" };

  const targets = computeTargets({
    weightKg: v.weight_kg,
    heightCm: v.height_cm,
    ageYears: ageFromDob(v.dob),
    gender: v.gender,
    activity: v.activity_level,
    goal: v.goal,
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      ...v,
      equipment: v.training_location === "gym" ? [] : v.equipment,
      ...targets,
      onboarding_step: 6,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // Starting weight becomes the first progress data point.
  await supabase
    .from("body_metrics")
    .upsert({ user_id: user.id, log_date: await todayKey(), weight_kg: v.weight_kg }, { onConflict: "user_id,log_date" });
  return { ok: true };
}
