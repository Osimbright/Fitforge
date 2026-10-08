import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { transformJSONSchema } from "@anthropic-ai/sdk/lib/transform-json-schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getActiveDietPlan, getActiveWorkoutPlan } from "@/lib/data/plans";
import { getMealsBetween, getRecentSessions, sumMeals } from "@/lib/data/stats";
import { shiftKey } from "@/lib/date";
import type { ChatProposal, Exercise, Profile } from "@/lib/types";
import { exerciseImageUrl } from "@/lib/utils";
import { profileContext, SAFETY_RULES } from "./context";
import { defaultLocation, getCandidateExercises } from "./plans";
import { MealSchema, PlanExerciseSchema, type StoredPlanExercise } from "./schemas";

export const COACH_SYSTEM = `You are Forge, the coach inside the FitForge app. You're chatting with one person you've been coaching for a while: you know their profile, their current workout and meal plans, and what they've logged this week (given in <user_context>).

## Who you are

Think of the best personal trainer you've ever had, texting a client they genuinely like. You're warm, a bit playful, honest, and you know your stuff. People should come away feeling that someone actually paid attention to *them*, not that they got a pamphlet. Generic advice they could find in any article ("stay hydrated", "listen to your body", "consistency is key") is the thing to avoid. It's what makes a coach feel like a bot.

## How that shows up

- **Lead with their specifics.** Before answering, look at their context: what they trained recently, what they've eaten today, their goal, injuries, equipment and weigh-ins. Build the answer around those details ("You've hit 3 sessions this week and you're 40 g short on protein today, so…"). If something important is missing, ask one short question instead of covering every possibility.
- **Match their energy and length.** A quick "back from the gym 💪" gets a quick, human reply, not a lecture. A detailed question gets a fuller answer. Most replies are a few sentences of natural conversation. Use a short list only when you're giving steps or options someone will follow.
- **Talk like a person.** Use contractions and plain words. Skip openers like "Great question!" and sign-offs like "Let me know if you have any other questions!" Don't restate their question back to them. Use their first name now and then, not in every message. An emoji is fine if it fits the moment and they use them too, at most one.
- **Have an opinion.** When they ask what to do, recommend one thing and say why in a sentence. Mention an alternative only if it really matters.
- **Notice how they're doing.** If they're tired, frustrated, proud or nervous, acknowledge it briefly and genuinely before the advice. Celebrate wins with specifics ("first week with all 4 sessions done, that's the habit forming"). If they missed workouts or went over on calories, no guilt or lecturing: help them pick up from today.
- **Teach a little.** A quick "why" helps them learn, but keep it to a line, not a lesson.

## Changing their plan or logging food

- You can't change anything yourself. To change their plan, use the propose_* tools: they see a card and tap Apply. After proposing, say in a sentence what you suggested and why, without claiming it's done.
- To swap or add exercises, call search_exercises first to get valid exercise ids, then propose_workout_day_update with the FULL new exercise list for that day.
- When they tell you what they ate and want it logged, use propose_meal_log with realistic estimates.

## Staying in your lane

You coach fitness, training, nutrition, sleep, recovery and healthy habits. If they ask about something else, answer with a friendly one-line redirect in your normal voice, not a policy statement.

${SAFETY_RULES}`;

// ───────────────────────── tools ─────────────────────────

const SearchInput = z.object({
  muscle: z.string().describe('Muscle group, e.g. "chest", "quadriceps", "abdominals"; empty string for any'),
  query: z.string().describe('Words in the exercise name, e.g. "squat"; empty string for any'),
});

const WorkoutUpdateInput = z.object({
  day_index: z.number().int().describe("0-based index of the day in the workout plan (see user_context)"),
  summary: z.string().describe("One sentence describing the change, shown on the Apply card"),
  exercises: z.array(PlanExerciseSchema).describe("The complete new exercise list for that day"),
});

const MealSwapInput = z.object({
  meal_key: z.string().describe("Key of the meal being replaced, e.g. m3"),
  summary: z.string(),
  meal: MealSchema,
});

const MealLogInput = z.object({
  summary: z.string(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});

function tool(name: string, description: string, schema: z.ZodType): Anthropic.Beta.BetaTool {
  return {
    name,
    description,
    input_schema: transformJSONSchema(z.toJSONSchema(schema)) as Anthropic.Beta.BetaTool.InputSchema,
    strict: true,
    eager_input_streaming: true,
  };
}

export const COACH_TOOLS: Anthropic.Beta.BetaTool[] = [
  tool(
    "search_exercises",
    "Search the exercise library for exercises this user can do with their equipment and level. Returns ids to use in workout proposals.",
    SearchInput,
  ),
  tool(
    "propose_workout_day_update",
    "Propose replacing the exercises of one day in the user's active workout plan. The user must tap Apply to accept.",
    WorkoutUpdateInput,
  ),
  tool("propose_meal_swap", "Propose replacing one meal in the user's meal plan. The user must tap Apply.", MealSwapInput),
  tool("propose_meal_log", "Propose logging a meal the user ate today with estimated macros. The user must tap Apply.", MealLogInput),
];

// ───────────────────────── context ─────────────────────────

export async function buildCoachContext(supabase: SupabaseClient, profile: Profile, tz: string, today: string) {
  const [plan, diet, sessions, meals, { data: weights }] = await Promise.all([
    getActiveWorkoutPlan(supabase, profile.id),
    getActiveDietPlan(supabase, profile.id),
    getRecentSessions(supabase, profile.id, tz, shiftKey(today, -6)),
    getMealsBetween(supabase, profile.id, shiftKey(today, -6), today),
    supabase.from("body_metrics").select("log_date, weight_kg").eq("user_id", profile.id).order("log_date", { ascending: false }).limit(5),
  ]);

  const planText = plan
    ? `Active workout plan "${plan.plan.title}" (${plan.location}, ${plan.plan.split}):\n` +
      plan.plan.days
        .map(
          (d, i) =>
            `  Day index ${i} — ${d.weekday}: ${d.name}\n` +
            d.exercises.map((e) => `    • ${e.name} [${e.exercise_id}] ${e.sets}×${e.reps}, rest ${e.rest_seconds}s (${e.tracking})`).join("\n"),
        )
        .join("\n")
    : "No workout plan yet.";

  const dietText = diet
    ? `Meal plan (daily): ` + diet.plan.meals.map((m) => `[${m.key}] ${m.meal_type} "${m.name}" ${m.calories} kcal, ${Math.round(m.protein_g)} g protein`).join("; ")
    : "No meal plan yet.";

  const todayMeals = meals.filter((m) => m.log_date === today);
  const t = sumMeals(todayMeals);
  const loggedDays = new Set(meals.map((m) => m.log_date)).size;
  const week = sumMeals(meals);

  return `<user_context>
Today: ${today}
${profileContext(profile)}

${planText}

${dietText}

Last 7 days: ${sessions.length} workouts completed${sessions.length ? ` (${sessions.map((s) => `${s.day} ${s.title} ${s.duration_min}min`).join("; ")})` : ""}.
Food logged on ${loggedDays}/7 days${loggedDays ? `, averaging ${Math.round(week.calories / loggedDays)} kcal and ${Math.round(week.protein_g / loggedDays)} g protein on logged days` : ""}.
Eaten so far today: ${Math.round(t.calories)} kcal, ${Math.round(t.protein_g)} g protein (${todayMeals.map((m) => m.description).join(", ") || "nothing logged"}).
Recent weigh-ins: ${(weights ?? []).map((w) => `${w.log_date}: ${w.weight_kg} kg`).join(", ") || "none"}
</user_context>`;
}

// ───────────────────────── tool execution ─────────────────────────

export type ToolOutcome = { result: string; isError?: boolean; proposal?: ChatProposal };

export async function runCoachTool(
  name: string,
  rawInput: unknown,
  ctx: { supabase: SupabaseClient; profile: Profile },
): Promise<ToolOutcome> {
  const { supabase, profile } = ctx;
  const id = crypto.randomUUID();

  switch (name) {
    case "search_exercises": {
      const input = SearchInput.safeParse(rawInput);
      if (!input.success) return { result: "Invalid input: " + input.error.message, isError: true };
      const plan = await getActiveWorkoutPlan(supabase, profile.id);
      const catalog = await getCandidateExercises(supabase, profile, plan?.location ?? defaultLocation(profile));
      const muscle = input.data.muscle.toLowerCase().trim();
      const words = input.data.query.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = catalog
        .filter((e) => !muscle || e.primary_muscles.some((m) => m.includes(muscle)))
        .filter((e) => words.every((w) => e.name.toLowerCase().includes(w)))
        .slice(0, 15);
      if (!hits.length) return { result: "No matching exercises. Try a broader muscle or fewer words." };
      return { result: hits.map((e) => `${e.id} | ${e.name} | ${e.primary_muscles.join(", ")} | ${e.equipment ?? "none"} | ${e.level}`).join("\n") };
    }

    case "propose_workout_day_update": {
      const input = WorkoutUpdateInput.safeParse(rawInput);
      if (!input.success) return { result: "Invalid input: " + input.error.message, isError: true };
      const plan = await getActiveWorkoutPlan(supabase, profile.id);
      if (!plan) return { result: "The user has no active workout plan.", isError: true };
      const day = plan.plan.days[input.data.day_index];
      if (!day) return { result: `No day at index ${input.data.day_index}.`, isError: true };

      const ids = input.data.exercises.map((e) => e.exercise_id);
      const { data } = await supabase.from("exercises").select("id,name,images,primary_muscles,equipment").in("id", ids);
      const byId = new Map(((data ?? []) as Exercise[]).map((e) => [e.id, e]));
      const missing = ids.filter((i) => !byId.has(i));
      if (missing.length) return { result: `Unknown exercise ids: ${missing.join(", ")}. Use search_exercises first.`, isError: true };

      const exercises: StoredPlanExercise[] = input.data.exercises.map((x) => {
        const ex = byId.get(x.exercise_id)!;
        return {
          ...x,
          sets: Math.max(1, Math.min(8, Math.round(x.sets))),
          rest_seconds: Math.max(15, Math.min(300, Math.round(x.rest_seconds))),
          name: ex.name,
          image: exerciseImageUrl(ex.images[0]),
          primary_muscles: ex.primary_muscles,
          equipment: ex.equipment,
        };
      });
      return {
        result: "Proposal shown to the user as a card with an Apply button. Do not repeat the full list; summarise briefly.",
        proposal: {
          id,
          kind: "update_workout_day",
          summary: `${day.weekday} · ${day.name}: ${input.data.summary}`,
          payload: { plan_id: plan.id, day_index: input.data.day_index, exercises },
        },
      };
    }

    case "propose_meal_swap": {
      const input = MealSwapInput.safeParse(rawInput);
      if (!input.success) return { result: "Invalid input: " + input.error.message, isError: true };
      const diet = await getActiveDietPlan(supabase, profile.id);
      if (!diet?.plan.meals.some((m) => m.key === input.data.meal_key)) {
        return { result: `No meal with key ${input.data.meal_key}.`, isError: true };
      }
      return {
        result: "Proposal shown to the user with an Apply button.",
        proposal: {
          id,
          kind: "swap_meal",
          summary: input.data.summary,
          payload: { diet_id: diet.id, meal: { ...input.data.meal, key: input.data.meal_key } },
        },
      };
    }

    case "propose_meal_log": {
      const input = MealLogInput.safeParse(rawInput);
      if (!input.success) return { result: "Invalid input: " + input.error.message, isError: true };
      const { summary, ...meal } = input.data;
      return {
        result: "Proposal shown to the user with an Apply button.",
        proposal: { id, kind: "log_meal", summary, payload: meal },
      };
    }
  }
  return { result: `Unknown tool ${name}`, isError: true };
}
