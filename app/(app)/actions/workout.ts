"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { StoredWorkoutPlan } from "@/lib/ai/schemas";
import { ACTIVITY_METS, caloriesBurned } from "@/lib/fitness/calculations";
import { todayKey } from "@/lib/date";
import { authed, fail, type Result } from "./common";

export async function startSession(planId: string, dayIndex: number): Promise<Result<{ id: string }>> {
  try {
    const { supabase, user } = await authed();
    z.uuid().parse(planId);

    // Resume an unfinished session for the same day instead of creating duplicates.
    const { data: open } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .eq("day_index", dayIndex)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open) return { ok: true, data: { id: open.id } };

    const { data: plan } = await supabase
      .from("workout_plans")
      .select("plan")
      .eq("id", planId)
      .single<{ plan: StoredWorkoutPlan }>();
    const day = plan?.plan.days[dayIndex];
    if (!day) throw new Error("Workout day not found");

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({ user_id: user.id, plan_id: planId, day_index: dayIndex, title: day.name, type: "planned" })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

const SetInput = z.object({
  id: z.uuid().optional(),
  session_id: z.uuid(),
  exercise_id: z.string().max(120).nullable(),
  exercise_name: z.string().max(200),
  set_no: z.number().int().min(1).max(20),
  reps: z.number().int().min(0).max(500).nullable(),
  weight_kg: z.number().min(0).max(1000).nullable(),
  duration_sec: z.number().int().min(0).max(36000).nullable(),
});

/** Creates or updates one logged set. Returns its id. */
export async function saveSet(input: z.input<typeof SetInput>): Promise<Result<{ id: string }>> {
  try {
    const { id, ...v } = SetInput.parse(input);
    const { supabase, user } = await authed();
    if (id) {
      const { error } = await supabase.from("session_sets").update(v).eq("id", id);
      if (error) throw error;
      return { ok: true, data: { id } };
    }
    const { data, error } = await supabase
      .from("session_sets")
      .insert({ ...v, user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteSet(id: string): Promise<Result> {
  try {
    const { supabase } = await authed();
    const { error } = await supabase.from("session_sets").delete().eq("id", z.uuid().parse(id));
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function finishSession(sessionId: string, notes?: string): Promise<Result<{ volume: number; minutes: number; calories: number }>> {
  try {
    const { supabase, user } = await authed();
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id, started_at")
      .eq("id", z.uuid().parse(sessionId))
      .single();
    if (!session) throw new Error("Session not found");

    const { data: sets } = await supabase.from("session_sets").select("reps, weight_kg").eq("session_id", sessionId);
    const volume = (sets ?? []).reduce((t, s) => t + (s.reps ?? 0) * Number(s.weight_kg ?? 0), 0);

    const { data: profile } = await supabase.from("profiles").select("weight_kg").eq("id", user.id).single();
    const minutes = Math.max(1, Math.min(240, Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)));
    const calories = caloriesBurned(ACTIVITY_METS.strength, Number(profile?.weight_kg ?? 70), minutes);

    const { error } = await supabase
      .from("workout_sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        duration_min: minutes,
        calories_est: calories,
        total_volume_kg: Math.round(volume * 10) / 10,
        notes: notes?.slice(0, 1000) || null,
      })
      .eq("id", sessionId);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, data: { volume: Math.round(volume), minutes, calories } };
  } catch (e) {
    return fail(e);
  }
}

export async function discardSession(sessionId: string): Promise<Result> {
  try {
    const { supabase } = await authed();
    const { error } = await supabase.from("workout_sessions").delete().eq("id", z.uuid().parse(sessionId));
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const CustomInput = z.object({
  title: z.string().trim().min(1).max(100),
  activity: z.enum(Object.keys(ACTIVITY_METS) as [string, ...string[]]),
  duration_min: z.number().int().min(1).max(600),
  notes: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Logs a freestyle activity (run, yoga, sport…) with an estimated calorie burn. */
export async function logCustomWorkout(input: z.input<typeof CustomInput>): Promise<Result> {
  try {
    const v = CustomInput.parse(input);
    const { supabase, user } = await authed();
    const { data: profile } = await supabase.from("profiles").select("weight_kg").eq("id", user.id).single();
    const calories = caloriesBurned(ACTIVITY_METS[v.activity], Number(profile?.weight_kg ?? 70), v.duration_min);

    const day = v.date ?? (await todayKey());
    // Anchor at local noon of the chosen day so it lands on the right calendar date.
    const ended = new Date(`${day}T12:00:00`);
    const started = new Date(ended.getTime() - v.duration_min * 60000);

    const { error } = await supabase.from("workout_sessions").insert({
      user_id: user.id,
      title: v.title,
      type: "custom",
      status: "completed",
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_min: v.duration_min,
      calories_est: calories,
      notes: v.notes || null,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
