import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allowedEquipment, allowedLevels, needsUnavailableGear, PLAN_CATEGORIES } from "@/lib/fitness/equipment";
import type { Exercise, Profile } from "@/lib/types";
import { exerciseImageUrl } from "@/lib/utils";
import { AIError, generateStructured } from "./client";
import { profileContext, SAFETY_RULES } from "./context";
import {
  DietPlanSchema,
  ExerciseSwapSchema,
  MealSchema,
  WorkoutPlanSchema,
  type StoredDietPlan,
  type StoredMeal,
  type StoredPlanExercise,
  type StoredWorkoutPlan,
} from "./schemas";

export type Location = "home" | "gym";

export function defaultLocation(p: Profile): Location {
  return p.training_location === "home" ? "home" : "gym";
}

// ───────────────────────── exercise catalog ─────────────────────────

const CATALOG_COLUMNS = "id,name,level,equipment,category,mechanic,primary_muscles,secondary_muscles,images,force,instructions";

export async function getCandidateExercises(supabase: SupabaseClient, profile: Profile, location: Location) {
  const equipment = allowedEquipment(location, profile.equipment);
  const levels = allowedLevels(profile.experience_level ?? "beginner");

  const { data, error } = await supabase
    .from("exercises")
    .select(CATALOG_COLUMNS)
    .in("equipment", equipment)
    .in("level", levels)
    .in("category", PLAN_CATEGORIES)
    .order("id");
  if (error) throw new AIError("Couldn't load the exercise library. Has it been seeded?", 500);

  const all = (data as Exercise[]).filter((e) => location === "gym" || !needsUnavailableGear(e.name, profile.equipment));
  if (all.length < 15) throw new AIError("The exercise library looks empty. Run `npm run seed:exercises`.", 500);

  // Keep the catalog a predictable size: compounds first, then isolation, a few cardio & stretches.
  const strength = all.filter((e) => ["strength", "powerlifting", "olympic weightlifting"].includes(e.category));
  const compound = strength.filter((e) => e.mechanic === "compound");
  const other = strength.filter((e) => e.mechanic !== "compound");
  const conditioning = all.filter((e) => e.category === "cardio" || e.category === "plyometrics").slice(0, 30);
  const stretches = all.filter((e) => e.category === "stretching").slice(0, 25);
  return [...compound.slice(0, 140), ...other.slice(0, 100), ...conditioning, ...stretches];
}

function catalogText(exercises: Exercise[]) {
  return exercises
    .map((e) => `${e.id} | ${e.name} | ${e.primary_muscles.join(", ")} | ${e.equipment ?? "none"} | ${e.level} | ${e.category}`)
    .join("\n");
}

function enrich(ex: Exercise, fields: Omit<StoredPlanExercise, "name" | "image" | "primary_muscles" | "equipment">): StoredPlanExercise {
  return {
    ...fields,
    sets: clamp(fields.sets, 1, 8),
    rest_seconds: clamp(fields.rest_seconds, 15, 300),
    name: ex.name,
    image: exerciseImageUrl(ex.images[0]),
    primary_muscles: ex.primary_muscles,
    equipment: ex.equipment,
  };
}

// ───────────────────────── workout plan ─────────────────────────

const WORKOUT_SYSTEM = `You are FitForge's head strength & conditioning coach. You design safe, effective, evidence-based weekly training programs.

Programming principles:
- Match the split to training days: 2-3 days → full body; 4 days → upper/lower or full body; 5-6 days → push/pull/legs or upper/lower hybrids.
- Fit each session inside the user's session length (count ~2-3 min per working set incl. rest, plus 5-8 min warm-up).
- Beginners: 4-6 exercises/session, 2-3 sets, mostly 8-15 reps, simple movements, longer rest. Intermediate: 5-7 exercises, 3-4 sets. Advanced: 6-8 exercises, 3-5 sets, heavier compound work (4-8 reps) plus accessories.
- Goal emphasis: lose_fat → full-body strength + conditioning finishers; build_muscle → 10-20 hard sets/muscle/week, 6-15 reps; get_stronger → heavy compounds first, 3-6 reps, 2-4 min rest; endurance → circuits, higher reps, cardio days; stay_fit → balanced mix.
- Start each day with compound movements, then accessories, core last. Balance push/pull and cover all major muscle groups across the week.
- Spread training days through the week with rest days between hard sessions where possible.
- Use ONLY exercise ids from the provided catalog, copied exactly. Never invent exercises.
- Timed moves (planks, carries, cardio, stretches) use tracking "time" and reps like "30s" or "10 min".
- Calorie estimates should be realistic (roughly 5-8 kcal per minute for strength sessions depending on body weight).

${SAFETY_RULES}`;

export async function generateWorkoutPlan(supabase: SupabaseClient, profile: Profile, location: Location) {
  const catalog = await getCandidateExercises(supabase, profile, location);
  const byId = new Map(catalog.map((e) => [e.id, e]));

  const prompt = `Create a weekly ${location.toUpperCase()} workout plan for this user.

<user_profile>
${profileContext(profile)}
Training location for this plan: ${location}
</user_profile>

<exercise_catalog>
id | name | primary muscles | equipment | level | category
${catalogText(catalog)}
</exercise_catalog>

Return exactly ${profile.days_per_week} training days.`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const plan = await generateStructured({ schema: WorkoutPlanSchema, system: WORKOUT_SYSTEM, prompt, effort: "medium" });

    let dropped = 0;
    const days = plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.flatMap((x) => {
        const ex = byId.get(x.exercise_id);
        if (!ex) {
          dropped++;
          return [];
        }
        return [enrich(ex, x)];
      }),
    }));
    if (dropped > 0) console.warn(`[workout-plan] dropped ${dropped} unknown exercise ids`);
    if (days.length === 0 || days.some((d) => d.exercises.length < 2)) continue;

    const stored: StoredWorkoutPlan = { ...plan, days };
    return stored;
  }
  throw new AIError("The AI produced an invalid plan. Please try again.", 502);
}

export async function saveWorkoutPlan(supabase: SupabaseClient, userId: string, location: Location, plan: StoredWorkoutPlan) {
  await supabase.from("workout_plans").update({ is_active: false }).eq("user_id", userId).eq("location", location).eq("is_active", true);
  const { data, error } = await supabase
    .from("workout_plans")
    .insert({ user_id: userId, title: plan.title, location, plan, is_active: true })
    .select("id")
    .single();
  if (error) throw new AIError("Couldn't save your plan: " + error.message, 500);
  return data.id as string;
}

// ───────────────────────── exercise swap ─────────────────────────

export async function suggestExerciseSwap(
  supabase: SupabaseClient,
  profile: Profile,
  location: Location,
  current: StoredPlanExercise,
  excludeIds: string[],
) {
  const catalog = await getCandidateExercises(supabase, profile, location);
  const muscles = new Set(current.primary_muscles);
  const candidates = catalog
    .filter((e) => !excludeIds.includes(e.id) && e.primary_muscles.some((m) => muscles.has(m)))
    .slice(0, 40);
  if (candidates.length === 0) throw new AIError("No alternative exercises found for that muscle group.", 404);

  const result = await generateStructured({
    schema: ExerciseSwapSchema,
    model: "fast",
    maxTokens: 1024,
    system: `You pick the best substitute exercise. Choose one id from the candidates that trains the same muscles with a similar movement pattern, suits the user's level and injuries, and is different from the current exercise.\n\n${SAFETY_RULES}`,
    prompt: `<user_profile>\n${profileContext(profile)}\n</user_profile>\n\nCurrent exercise: ${current.name} (${current.primary_muscles.join(", ")}, ${current.equipment})\n\n<candidates>\n${catalogText(candidates)}\n</candidates>`,
  });

  const ex = candidates.find((e) => e.id === result.exercise_id) ?? candidates[0];
  const { exercise_id: _id, name: _n, image: _i, primary_muscles: _p, equipment: _e, ...rest } = current;
  return { exercise: enrich(ex, { ...rest, exercise_id: ex.id }), reason: result.reason };
}

// ───────────────────────── diet plan ─────────────────────────

const DIET_SYSTEM = `You are FitForge's registered-dietitian-level nutrition coach. You create practical, affordable, tasty daily meal plans.

Rules:
- Hit the daily calorie target within ±5% and protein within ±10 g. Carbs and fat should be close to target.
- Exactly match the requested number of meals per day (use "snack" for extra meals).
- Strictly respect the diet type (vegetarian = no meat/fish/eggs; eggetarian = vegetarian + eggs; vegan = no animal products; pescatarian = fish but no meat; keto = under ~30 g net carbs) and all allergies.
- Prefer the user's cuisine with common, easy-to-find ingredients. Give realistic portions in everyday units (grams, cups, pieces, rotis).
- Spread protein across meals. Put a carb-rich meal around typical workout times.
- Macros for each meal must be realistic for the listed foods, and meal calories must be consistent with macros (4/4/9 kcal per g).
- Grocery list covers one week of this plan, grouped by category.

${SAFETY_RULES}`;

export async function generateDietPlan(profile: Profile) {
  const targets = {
    calories: profile.calorie_target ?? 2000,
    protein_g: profile.protein_g ?? 120,
    carbs_g: profile.carbs_g ?? 200,
    fat_g: profile.fat_g ?? 60,
  };
  const prompt = `Create a one-day meal plan this user can repeat and vary through the week.

<user_profile>
${profileContext(profile)}
</user_profile>

Daily targets: ${targets.calories} kcal, ${targets.protein_g} g protein, ${targets.carbs_g} g carbs, ${targets.fat_g} g fat.
Meals per day: ${profile.meals_per_day ?? 4}.`;

  const plan = await generateStructured({ schema: DietPlanSchema, system: DIET_SYSTEM, prompt, effort: "medium" });
  const meals: StoredMeal[] = plan.meals.map((m, i) => ({ ...m, key: `m${i + 1}` }));
  const stored: StoredDietPlan = { ...plan, meals, targets };
  return stored;
}

export async function saveDietPlan(supabase: SupabaseClient, userId: string, plan: StoredDietPlan) {
  await supabase.from("diet_plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
  const { data, error } = await supabase
    .from("diet_plans")
    .insert({ user_id: userId, plan, calorie_target: plan.targets.calories, is_active: true })
    .select("id")
    .single();
  if (error) throw new AIError("Couldn't save your diet plan: " + error.message, 500);
  return data.id as string;
}

export async function suggestMealSwap(profile: Profile, meal: StoredMeal, request?: string) {
  const swapped = await generateStructured({
    schema: MealSchema,
    model: "fast",
    maxTokens: 2048,
    system: DIET_SYSTEM,
    prompt: `<user_profile>\n${profileContext(profile)}\n</user_profile>\n\nReplace this ${meal.meal_type} with a different meal that has about the same calories (${meal.calories} kcal ±10%) and protein (${meal.protein_g} g).\nCurrent meal: ${meal.name} — ${meal.items.map((i) => `${i.quantity} ${i.food}`).join(", ")}.${request ? `\nUser request: ${request.slice(0, 300)}` : ""}\nKeep meal_type "${meal.meal_type}" and time "${meal.time}".`,
  });
  return { ...swapped, key: meal.key } satisfies StoredMeal;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}
