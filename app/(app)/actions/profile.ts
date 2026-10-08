"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/mode";
import { ageFromDob, computeTargets } from "@/lib/fitness/calculations";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { profileUpdateSchema } from "@/lib/validations/onboarding";
import { authed, fail, type Result } from "./common";

const WORKOUT_FIELDS = ["experience_level", "goal", "days_per_week", "session_minutes", "training_location", "equipment", "injuries"] as const;
const DIET_FIELDS = ["goal", "weight_kg", "diet_type", "allergies", "cuisine", "meals_per_day", "activity_level"] as const;

export async function updateProfile(input: unknown): Promise<Result<{ workoutChanged: boolean; dietChanged: boolean }>> {
  try {
    const parsed = profileUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
    const { supabase, user } = await authed();

    const { data: current } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
    if (!current) throw new Error("Profile not found");
    const next = { ...current, ...parsed.data } as Profile;

    const changed = (k: keyof Profile) => JSON.stringify(current[k]) !== JSON.stringify(next[k]);
    const workoutChanged = WORKOUT_FIELDS.some(changed);
    const dietChanged = DIET_FIELDS.some(changed);

    const targets =
      next.weight_kg && next.height_cm && next.dob && next.gender && next.activity_level && next.goal
        ? computeTargets({
            weightKg: Number(next.weight_kg),
            heightCm: Number(next.height_cm),
            ageYears: ageFromDob(next.dob),
            gender: next.gender,
            activity: next.activity_level,
            goal: next.goal,
          })
        : {};

    const { error } = await supabase
      .from("profiles")
      .update({ ...parsed.data, ...targets, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, data: { workoutChanged, dietChanged } };
  } catch (e) {
    return fail(e);
  }
}

/** Permanently deletes the user and (via ON DELETE CASCADE) all their data. */
export async function deleteAccount(confirmation: string): Promise<Result> {
  if (confirmation !== "DELETE") return { ok: false, error: 'Type "DELETE" to confirm' };
  try {
    const { supabase, user } = await authed();
    if (!DEMO_MODE && !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Account deletion isn't configured (missing service role key).");

    // Remove private photos first; storage objects aren't covered by the cascade.
    const { data: files } = await supabase.storage.from("progress-photos").list(user.id, { limit: 10000 });
    if (files?.length) await supabase.storage.from("progress-photos").remove(files.map((f) => `${user.id}/${f.name}`));

    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
    await supabase.auth.signOut();
  } catch (e) {
    return fail(e);
  }
  redirect("/?deleted=1");
}

/** Saves the browser's IANA timezone on the profile. */
export async function saveTimezone(tz: string): Promise<Result> {
  try {
    const timezone = z
      .string()
      .max(64)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Unknown timezone")
      .parse(tz);
    const { supabase, user } = await authed();
    const { error } = await supabase.from("profiles").update({ timezone }).eq("id", user.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
