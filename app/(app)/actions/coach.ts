"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { StoredDietPlan, StoredMeal, StoredPlanExercise, StoredWorkoutPlan } from "@/lib/ai/schemas";
import { todayKey } from "@/lib/date";
import type { ChatProposal } from "@/lib/types";
import { authed, fail, type Result } from "./common";

/** Applies a change the coach proposed, then marks the proposal as applied. */
export async function applyProposal(messageId: string, proposalId: string): Promise<Result> {
  try {
    const { supabase, user } = await authed();
    const { data: msg } = await supabase
      .from("chat_messages")
      .select("id, proposals")
      .eq("id", z.uuid().parse(messageId))
      .single<{ id: string; proposals: ChatProposal[] }>();
    const proposal = msg?.proposals.find((p) => p.id === proposalId);
    if (!msg || !proposal) throw new Error("Proposal not found");
    if (proposal.applied) return { ok: true };

    if (proposal.kind === "update_workout_day") {
      const { plan_id, day_index, exercises } = proposal.payload as { plan_id: string; day_index: number; exercises: StoredPlanExercise[] };
      const { data: row } = await supabase.from("workout_plans").select("plan").eq("id", plan_id).single<{ plan: StoredWorkoutPlan }>();
      if (!row?.plan.days[day_index]) throw new Error("That workout day no longer exists");
      row.plan.days[day_index].exercises = exercises;
      const { error } = await supabase.from("workout_plans").update({ plan: row.plan }).eq("id", plan_id);
      if (error) throw error;
    } else if (proposal.kind === "swap_meal") {
      const { diet_id, meal } = proposal.payload as { diet_id: string; meal: StoredMeal };
      const { data: row } = await supabase.from("diet_plans").select("plan").eq("id", diet_id).single<{ plan: StoredDietPlan }>();
      const idx = row?.plan.meals.findIndex((m) => m.key === meal.key) ?? -1;
      if (!row || idx < 0) throw new Error("That meal is no longer in your plan");
      row.plan.meals[idx] = meal;
      const { error } = await supabase.from("diet_plans").update({ plan: row.plan }).eq("id", diet_id);
      if (error) throw error;
    } else if (proposal.kind === "log_meal") {
      const m = proposal.payload as { meal_type: string; description: string; calories: number; protein_g: number; carbs_g: number; fat_g: number };
      const { error } = await supabase.from("meal_logs").insert({
        user_id: user.id,
        log_date: await todayKey(),
        meal_type: m.meal_type,
        description: m.description.slice(0, 300),
        calories: Math.max(0, Math.round(m.calories)),
        protein_g: Math.max(0, m.protein_g),
        carbs_g: Math.max(0, m.carbs_g),
        fat_g: Math.max(0, m.fat_g),
        source: "ai",
      });
      if (error) throw error;
    }

    const proposals = msg.proposals.map((p) => (p.id === proposalId ? { ...p, applied: true } : p));
    await supabase.from("chat_messages").update({ proposals }).eq("id", msg.id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteConversation(id: string): Promise<Result> {
  try {
    const { supabase } = await authed();
    const { error } = await supabase.from("chat_conversations").delete().eq("id", z.uuid().parse(id));
    if (error) throw error;
    revalidatePath("/coach");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
