import { AIError, generateStructured } from "@/lib/ai/client";
import { profileContext, SAFETY_RULES } from "@/lib/ai/context";
import { consumeQuota } from "@/lib/ai/quota";
import { aiRoute } from "@/lib/ai/route";
import { WeeklyReviewSchema } from "@/lib/ai/schemas";
import { getMealsBetween, getRecentSessions, sumMeals } from "@/lib/data/stats";
import { shiftKey, todayKey, userTimeZone } from "@/lib/date";
import type { StoredWeeklyReview } from "@/lib/types";

export const maxDuration = 90;

const SYSTEM = `You are FitForge's encouraging but honest coach doing a weekly check-in.
Review the user's last 7 days against their plan and targets. Be specific and reference real numbers from the data.
Celebrate consistency. Keep each list item to one short sentence. Adjustments must be concrete and doable.
If there's very little data, say so kindly and focus on simple next steps to build the habit.

${SAFETY_RULES}`;

export const POST = aiRoute(async ({ supabase, user, profile }) => {
  await consumeQuota(supabase, "review");
  const tz = await userTimeZone();
  const today = await todayKey();
  const from = shiftKey(today, -6);

  const [sessions, meals, { data: weights }] = await Promise.all([
    getRecentSessions(supabase, user.id, tz, from),
    getMealsBetween(supabase, user.id, from, today),
    supabase
      .from("body_metrics")
      .select("log_date, weight_kg")
      .eq("user_id", user.id)
      .gte("log_date", shiftKey(today, -13))
      .order("log_date"),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => shiftKey(from, i));
  const dailyFood = days.map((d) => {
    const dayMeals = meals.filter((m) => m.log_date === d);
    const t = sumMeals(dayMeals);
    return dayMeals.length
      ? `${d}: ${Math.round(t.calories)} kcal, ${Math.round(t.protein_g)} g protein (${dayMeals.length} entries)`
      : `${d}: nothing logged`;
  });

  const prompt = `<user_profile>
${profileContext(profile)}
</user_profile>

<last_7_days from="${from}" to="${today}">
Workouts completed: ${sessions.length} (planned target: ${profile.days_per_week}/week)
${sessions.map((s) => `- ${s.day}: ${s.title}, ${s.duration_min} min, ~${s.calories_est} kcal${Number(s.total_volume_kg) > 0 ? `, volume ${s.total_volume_kg} kg` : ""}`).join("\n") || "- none"}

Food log:
${dailyFood.join("\n")}

Weight entries (last 14 days): ${(weights ?? []).map((w) => `${w.log_date}: ${w.weight_kg} kg`).join(", ") || "none"}
</last_7_days>

Write the weekly review.`;

  const review = await generateStructured({ schema: WeeklyReviewSchema, system: SYSTEM, prompt, effort: "medium", maxTokens: 8000 });

  const { data: saved, error } = await supabase
    .from("weekly_reviews")
    .insert({
      user_id: user.id,
      period_start: from,
      period_end: today,
      ...review,
      score: Math.max(1, Math.min(10, Math.round(review.score))),
    })
    .select("*")
    .single<StoredWeeklyReview>();
  if (error) throw new AIError("Couldn't save your review: " + error.message, 500);
  return saved;
});
