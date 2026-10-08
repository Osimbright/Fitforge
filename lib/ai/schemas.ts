// Zod schemas for every structured AI output. Kept permissive on numbers so
// minor model variance never fails parsing; we sanity-check values in code.
import { z } from "zod";

export const PlanExerciseSchema = z.object({
  exercise_id: z.string().describe("Exact id from the provided exercise catalog"),
  sets: z.number().int(),
  reps: z.string().describe('Rep target like "8-12" or "10", or a duration like "30s" for timed moves'),
  tracking: z.enum(["reps", "time"]),
  rest_seconds: z.number().int(),
  notes: z.string().describe("One short coaching cue; empty string if none"),
});

export const WorkoutPlanSchema = z.object({
  title: z.string().describe('Short plan name, e.g. "4-Day Upper/Lower Builder"'),
  summary: z.string().describe("2-3 sentences explaining why this plan fits the user"),
  split: z.string().describe('e.g. "Full Body", "Upper/Lower", "Push/Pull/Legs"'),
  days: z.array(
    z.object({
      name: z.string().describe('e.g. "Upper Body Strength"'),
      weekday: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
      focus: z.string().describe("Muscles or qualities trained"),
      estimated_minutes: z.number().int(),
      estimated_calories: z.number().int(),
      warmup: z.string(),
      exercises: z.array(PlanExerciseSchema),
      cooldown: z.string(),
    }),
  ),
  progression: z.array(z.string()).describe("3-4 concrete progression rules"),
  tips: z.array(z.string()).describe("3-4 short tips for this user"),
});
export type WorkoutPlanAI = z.infer<typeof WorkoutPlanSchema>;

const FoodItem = z.object({ food: z.string(), quantity: z.string() });

export const MealSchema = z.object({
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string(),
  time: z.string().describe('Suggested time like "8:00 AM"'),
  items: z.array(FoodItem),
  calories: z.number().int(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  recipe: z.string().describe("Brief preparation steps in 1-3 sentences"),
});
export type MealAI = z.infer<typeof MealSchema>;

export const DietPlanSchema = z.object({
  summary: z.string(),
  meals: z.array(MealSchema),
  grocery_list: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  tips: z.array(z.string()),
});
export type DietPlanAI = z.infer<typeof DietPlanSchema>;

export const MealEstimateSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  confidence: z.enum(["low", "medium", "high"]),
  note: z.string().describe("Assumptions made, in one short sentence"),
});
export type MealEstimate = z.infer<typeof MealEstimateSchema>;

export const ExerciseSwapSchema = z.object({
  exercise_id: z.string(),
  reason: z.string(),
});

export const WeeklyReviewSchema = z.object({
  headline: z.string(),
  score: z.number().int().describe("1-10 rating of the week"),
  wins: z.array(z.string()),
  improvements: z.array(z.string()),
  adjustments: z.array(z.string()).describe("Specific changes to try next week"),
  message: z.string().describe("Short motivating note addressed to the user by first name"),
});
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;

// ── Stored shapes (AI output enriched with exercise details) ──

export interface StoredPlanExercise extends z.infer<typeof PlanExerciseSchema> {
  name: string;
  image: string | null;
  primary_muscles: string[];
  equipment: string | null;
}

export interface StoredWorkoutPlan extends Omit<WorkoutPlanAI, "days"> {
  days: (Omit<WorkoutPlanAI["days"][number], "exercises"> & { exercises: StoredPlanExercise[] })[];
}

export interface StoredMeal extends MealAI {
  key: string;
}

export interface StoredDietPlan extends Omit<DietPlanAI, "meals"> {
  meals: StoredMeal[];
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}
