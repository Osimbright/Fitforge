import "server-only";
import type { ZodType } from "zod";
import {
  DietPlanSchema,
  ExerciseSwapSchema,
  MealEstimateSchema,
  MealSchema,
  WeeklyReviewSchema,
  WorkoutPlanSchema,
  type DietPlanAI,
  type MealAI,
  type MealEstimate,
  type WorkoutPlanAI,
} from "@/lib/ai/schemas";
import type { MealType } from "@/lib/types";
import { DEMO_MODE } from "./mode";

/** Canned AI is used only in demo mode without an Anthropic key; add the key to get real Claude responses on demo data. */
export const DEMO_AI = DEMO_MODE && !process.env.ANTHROPIC_API_KEY;

/**
 * Canned AI responses for demo mode. Each one is built from the same prompt the
 * real model would get, so plans fit the user's schedule, catalog and targets.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const num = (prompt: string, re: RegExp, fallback: number) => Number(prompt.match(re)?.[1] ?? fallback);

export async function demoStructured(schema: ZodType<unknown>, prompt: string): Promise<unknown> {
  const slow = schema === WorkoutPlanSchema || schema === DietPlanSchema || schema === WeeklyReviewSchema;
  await wait(slow ? 2500 : 900);

  let result: unknown;
  if (schema === WorkoutPlanSchema) result = workoutPlan(prompt);
  else if (schema === ExerciseSwapSchema) result = exerciseSwap(prompt);
  else if (schema === DietPlanSchema) result = dietPlan(prompt);
  else if (schema === MealSchema) result = mealSwap(prompt);
  else if (schema === MealEstimateSchema) result = estimateMeal(prompt.replace(/^Food eaten:\s*/, ""));
  else if (schema === WeeklyReviewSchema) result = weeklyReview(prompt);
  else throw new Error("Demo AI has no canned response for this request");

  return schema.parse(result);
}

// ───────────────────────── workout plans ─────────────────────────

interface CatalogLine {
  id: string;
  name: string;
  muscles: string[];
  category: string;
}

function parseCatalog(prompt: string): CatalogLine[] {
  return prompt.split("\n").flatMap((line) => {
    const p = line.split(" | ");
    if (p.length !== 6 || p[0] === "id") return [];
    return [{ id: p[0].trim(), name: p[1], muscles: p[2].split(", ").filter(Boolean), category: p[5].trim() }];
  });
}

const DAY_TEMPLATES: Record<string, { focus: string; muscles: string[] }> = {
  "Full Body": { focus: "Legs, chest, back, shoulders, core", muscles: ["quadriceps", "chest", "middle back", "hamstrings", "shoulders", "abdominals"] },
  Upper: { focus: "Chest, back, shoulders, arms", muscles: ["chest", "middle back", "shoulders", "lats", "biceps", "triceps"] },
  Lower: { focus: "Quads, hamstrings, glutes, calves, core", muscles: ["quadriceps", "hamstrings", "glutes", "calves", "abdominals"] },
  Push: { focus: "Chest, shoulders, triceps", muscles: ["chest", "shoulders", "chest", "triceps", "abdominals"] },
  Pull: { focus: "Back, rear delts, biceps", muscles: ["lats", "middle back", "traps", "biceps", "lower back"] },
  Legs: { focus: "Quads, hamstrings, glutes, calves", muscles: ["quadriceps", "hamstrings", "glutes", "calves", "abdominals"] },
};

const WEEKDAYS: Record<number, WorkoutPlanAI["days"][number]["weekday"][]> = {
  1: ["Mon"],
  2: ["Mon", "Thu"],
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Thu", "Fri"],
  5: ["Mon", "Tue", "Wed", "Fri", "Sat"],
  6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  7: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

function workoutPlan(prompt: string): WorkoutPlanAI {
  const catalog = parseCatalog(prompt).filter((e) => !["stretching", "cardio"].includes(e.category));
  const n = Math.max(1, Math.min(7, num(prompt, /Return exactly (\d+) training days/, 3)));
  const minutes = num(prompt, /(\d+) min per session/, 45);
  const goal = prompt.match(/Goal: (.+)/)?.[1]?.trim() ?? "your goal";
  const split = n <= 3 ? "Full Body" : n === 4 ? "Upper/Lower" : "Push/Pull/Legs";
  const order = n <= 3 ? ["Full Body"] : n === 4 ? ["Upper", "Lower"] : ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body"];
  const perDay = minutes <= 30 ? 4 : minutes <= 45 ? 5 : 6;

  const days = WEEKDAYS[n].map((weekday, i) => {
    const name = order[i % order.length];
    const template = DAY_TEMPLATES[name];
    const used = new Set<string>();
    const exercises = template.muscles.slice(0, perDay).flatMap((muscle) => {
      const options = catalog.filter((e) => e.muscles[0] === muscle && !used.has(e.id));
      if (!options.length) return [];
      const ex = pick(options.slice(0, 12));
      used.add(ex.id);
      const timed = /plank|hold|carry/i.test(ex.name);
      return [
        {
          exercise_id: ex.id,
          sets: 3,
          reps: timed ? "40s" : muscle === "abdominals" || muscle === "calves" ? "12-15" : "8-12",
          tracking: (timed ? "time" : "reps") as "time" | "reps",
          rest_seconds: timed ? 45 : 90,
          notes: "",
        },
      ];
    });
    return {
      name: n <= 3 ? `Full Body ${String.fromCharCode(65 + i)}` : name,
      weekday,
      focus: template.focus,
      estimated_minutes: minutes,
      estimated_calories: Math.round(minutes * 7),
      warmup: "5 min easy cardio, dynamic stretches, 1-2 light sets of the first exercise",
      exercises,
      cooldown: "5 min of light stretching for the muscles you trained",
    };
  });

  return {
    title: `${n}-Day ${split} Plan`,
    summary: `A ${split.toLowerCase()} split that trains every major muscle group across your ${n} days, sized for ${minutes}-minute sessions. Compound lifts come first while you're fresh, with accessories and core work to finish — built around your goal: ${goal.toLowerCase()}.`,
    split,
    days,
    progression: [
      "When you hit the top of the rep range on all sets, add a little weight next time.",
      "Leave 1-2 reps in reserve on most sets.",
      "Every 6th week, reduce weights by about 20% to recover.",
    ],
    tips: ["Log every set so you can beat it next week.", "Warm up properly before your first heavy lift.", "Aim for 7-9 hours of sleep to recover well."],
  };
}

function exerciseSwap(prompt: string) {
  const candidates = parseCatalog(prompt);
  const current = prompt.match(/Current exercise: (.+?) \(/)?.[1] ?? "the current exercise";
  const choice = pick(candidates.slice(0, 10));
  return {
    exercise_id: choice?.id ?? "",
    reason: `${choice?.name ?? "This"} hits the same muscles as ${current} with a slightly different movement pattern — a fresh stimulus without changing the rest of your day.`,
  };
}

// ───────────────────────── nutrition ─────────────────────────

type Base = Omit<MealAI, "time" | "meal_type">;
const MEALS: Record<MealType, Base[]> = {
  breakfast: [
    { name: "Greek Yogurt Power Bowl", items: [{ food: "Greek yogurt", quantity: "250 g" }, { food: "Rolled oats", quantity: "50 g" }, { food: "Berries", quantity: "1 cup" }], calories: 520, protein_g: 36, carbs_g: 66, fat_g: 12, recipe: "Stir the oats into the yogurt and top with berries." },
    { name: "Veggie Omelette & Toast", items: [{ food: "Eggs", quantity: "3" }, { food: "Spinach & peppers", quantity: "1 cup" }, { food: "Wholegrain toast", quantity: "2 slices" }], calories: 480, protein_g: 30, carbs_g: 38, fat_g: 22, recipe: "Sauté the vegetables, pour over the beaten eggs and cook until set. Serve with toast." },
    { name: "Peanut Butter Banana Oats", items: [{ food: "Rolled oats", quantity: "70 g" }, { food: "Milk", quantity: "250 ml" }, { food: "Banana", quantity: "1" }, { food: "Peanut butter", quantity: "1 tbsp" }], calories: 560, protein_g: 22, carbs_g: 82, fat_g: 16, recipe: "Simmer the oats in milk for 5 minutes, then top with sliced banana and peanut butter." },
  ],
  lunch: [
    { name: "Chicken Rice Bowl", items: [{ food: "Grilled chicken breast", quantity: "150 g" }, { food: "Rice (cooked)", quantity: "1 cup" }, { food: "Mixed salad", quantity: "1 bowl" }], calories: 600, protein_g: 50, carbs_g: 65, fat_g: 14, recipe: "Grill seasoned chicken and serve over rice with salad." },
    { name: "Lentil & Paneer Wrap", items: [{ food: "Wholewheat wrap", quantity: "2" }, { food: "Spiced lentils", quantity: "1 cup" }, { food: "Paneer", quantity: "80 g" }], calories: 620, protein_g: 34, carbs_g: 70, fat_g: 22, recipe: "Pan-fry paneer cubes, warm the lentils and fill the wraps." },
    { name: "Tuna Pasta Salad", items: [{ food: "Wholewheat pasta (cooked)", quantity: "1.5 cups" }, { food: "Tuna", quantity: "1 can" }, { food: "Cherry tomatoes & cucumber", quantity: "1 cup" }], calories: 580, protein_g: 44, carbs_g: 68, fat_g: 12, recipe: "Toss pasta, tuna and vegetables with lemon and a little olive oil." },
  ],
  dinner: [
    { name: "Salmon, Potatoes & Greens", items: [{ food: "Salmon fillet", quantity: "150 g" }, { food: "Baby potatoes", quantity: "250 g" }, { food: "Green beans", quantity: "1 cup" }], calories: 620, protein_g: 40, carbs_g: 50, fat_g: 26, recipe: "Roast the potatoes for 25 minutes, adding the salmon and beans for the last 12." },
    { name: "Beef & Veggie Stir-Fry", items: [{ food: "Lean beef strips", quantity: "150 g" }, { food: "Stir-fry vegetables", quantity: "2 cups" }, { food: "Noodles (cooked)", quantity: "1 cup" }], calories: 640, protein_g: 42, carbs_g: 60, fat_g: 22, recipe: "Stir-fry the beef on high heat, add vegetables and noodles, finish with soy and ginger." },
    { name: "Chickpea & Tofu Curry", items: [{ food: "Firm tofu", quantity: "150 g" }, { food: "Chickpeas", quantity: "1 cup" }, { food: "Basmati rice (cooked)", quantity: "1 cup" }], calories: 610, protein_g: 32, carbs_g: 78, fat_g: 18, recipe: "Simmer tofu and chickpeas in a tomato-onion curry base for 15 minutes; serve with rice." },
  ],
  snack: [
    { name: "Protein Shake & Fruit", items: [{ food: "Whey protein", quantity: "1 scoop" }, { food: "Apple", quantity: "1" }], calories: 220, protein_g: 25, carbs_g: 26, fat_g: 2, recipe: "Shake the whey with water or milk." },
    { name: "Cottage Cheese & Nuts", items: [{ food: "Cottage cheese", quantity: "150 g" }, { food: "Almonds", quantity: "15 g" }], calories: 240, protein_g: 20, carbs_g: 8, fat_g: 14, recipe: "Top cottage cheese with almonds." },
    { name: "Hummus & Veggie Sticks", items: [{ food: "Hummus", quantity: "4 tbsp" }, { food: "Carrot & cucumber", quantity: "1 cup" }, { food: "Rice cakes", quantity: "2" }], calories: 260, protein_g: 9, carbs_g: 32, fat_g: 11, recipe: "Dip and enjoy." },
  ],
};

const MEAT_OR_FISH = /chicken|beef|salmon|tuna|fish/i;

/** Library meals that fit the diet named in the prompt (plant-based diets skip meat and fish). */
function mealsFor(prompt: string, type: MealType): Base[] {
  const plantBased = /Diet: (Vegetarian|Vegan|Eggetarian)/i.test(prompt);
  return plantBased ? MEALS[type].filter((m) => !m.items.some((i) => MEAT_OR_FISH.test(i.food))) : MEALS[type];
}

const SLOTS: Record<number, MealType[]> = {
  2: ["lunch", "dinner"],
  3: ["breakfast", "lunch", "dinner"],
  4: ["breakfast", "lunch", "snack", "dinner"],
  5: ["breakfast", "snack", "lunch", "snack", "dinner"],
  6: ["breakfast", "snack", "lunch", "snack", "dinner", "snack"],
};
const SHARE: Record<MealType, number> = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.12 };
const TIMES: Record<MealType, string[]> = { breakfast: ["8:00 AM"], lunch: ["1:00 PM"], dinner: ["7:30 PM"], snack: ["11:00 AM", "4:30 PM", "9:30 PM"] };

/** Scales a meal's macros to the given targets; calories follow from 4/4/9. */
function scaled(base: Base, p: number, c: number, f: number) {
  const protein_g = Math.round(p);
  const carbs_g = Math.round(c);
  const fat_g = Math.round(f);
  return { ...base, protein_g, carbs_g, fat_g, calories: protein_g * 4 + carbs_g * 4 + fat_g * 9 };
}

function dietPlan(prompt: string): DietPlanAI {
  const [, kcal, protein, carbs, fat] = (prompt.match(/Daily targets: (\d+) kcal, (\d+) g protein, (\d+) g carbs, (\d+) g fat/) ?? []).map(Number);
  const slots = SLOTS[Math.max(2, Math.min(6, num(prompt, /Meals per day: (\d+)/, 4)))];
  const total = slots.reduce((t, s) => t + SHARE[s], 0);
  let snack = 0;

  const meals = slots.map((type, i) => {
    const share = SHARE[type] / total;
    const options = mealsFor(prompt, type);
    const base = options[i % options.length];
    const time = type === "snack" ? TIMES.snack[snack++ % 3] : TIMES[type][0];
    return { meal_type: type, time, ...scaled(base, (protein || 140) * share, (carbs || 200) * share, (fat || 60) * share) };
  });

  return {
    summary: `A ${slots.length}-meal day built to land close to ${kcal || 2000} kcal and ${protein || 140} g protein, with protein spread evenly so every meal keeps you full.`,
    meals,
    grocery_list: [
      { category: "Protein", items: ["Chicken breast", "Salmon", "Greek yogurt", "Eggs", "Whey protein"] },
      { category: "Carbs", items: ["Rolled oats", "Rice", "Potatoes", "Wholegrain bread"] },
      { category: "Produce", items: ["Berries", "Bananas", "Spinach", "Peppers", "Green beans", "Tomatoes"] },
      { category: "Pantry", items: ["Olive oil", "Peanut butter", "Almonds", "Hummus"] },
    ],
    tips: ["Prep proteins in bulk twice a week.", "Drink a glass of water with every meal.", "Swap any meal with the swap button if you get bored."],
  };
}

function mealSwap(prompt: string): MealAI {
  const type = (prompt.match(/Replace this (breakfast|lunch|dinner|snack)/)?.[1] ?? "snack") as MealType;
  const kcal = num(prompt, /about the same calories \((\d+) kcal/, 500);
  const protein = num(prompt, /and protein \(([\d.]+) g\)/, 30);
  const time = prompt.match(/time "([^"]+)"/)?.[1] ?? TIMES[type][0];
  const current = prompt.match(/Current meal: (.+?) —/)?.[1];
  const options = mealsFor(prompt, type);
  const base = pick(options.filter((m) => m.name !== current)) ?? options[0];
  // Keep protein, fill the remaining calories with carbs and fat in the base meal's ratio.
  const rest = Math.max(0, kcal - protein * 4);
  const carbShare = (base.carbs_g * 4) / Math.max(1, base.carbs_g * 4 + base.fat_g * 9);
  return { meal_type: type, time, ...scaled(base, protein, (rest * carbShare) / 4, (rest * (1 - carbShare)) / 9) };
}

const FOODS: [RegExp, string, number, number, number, number][] = [
  // pattern, default portion, kcal, protein, carbs, fat (per portion)
  [/egg/, "1 large", 78, 6, 0.6, 5],
  [/rice/, "1 cup cooked", 205, 4, 45, 0.4],
  [/roti|chapati/, "1 piece", 120, 3, 20, 3],
  [/chicken/, "150 g", 250, 46, 0, 6],
  [/salmon|fish/, "150 g", 300, 32, 0, 18],
  [/steak|beef/, "150 g", 330, 38, 0, 19],
  [/paneer/, "100 g", 290, 18, 4, 22],
  [/dal|lentil/, "1 cup", 230, 18, 40, 1],
  [/oat/, "1 bowl", 300, 11, 54, 5],
  [/banana/, "1 medium", 105, 1.3, 27, 0.4],
  [/apple/, "1 medium", 95, 0.5, 25, 0.3],
  [/yog(h)?urt/, "1 cup", 150, 15, 10, 4],
  [/milk|latte|cappuccino/, "1 cup", 130, 8, 12, 5],
  [/coffee|tea/, "1 cup", 30, 1, 4, 1],
  [/toast|bread/, "2 slices", 160, 6, 28, 2],
  [/pizza/, "2 slices", 540, 22, 64, 20],
  [/burger/, "1 burger", 550, 28, 45, 28],
  [/pasta|noodle/, "1.5 cups", 330, 12, 64, 3],
  [/salad/, "1 bowl", 150, 4, 12, 9],
  [/protein shake|whey|shake/, "1 scoop", 120, 24, 3, 1.5],
  [/peanut butter/, "1 tbsp", 95, 4, 3, 8],
  [/avocado/, "half", 120, 1.5, 6, 11],
  [/potato|fries/, "1 medium", 160, 4, 37, 0.2],
  [/sandwich/, "1 sandwich", 350, 18, 38, 13],
];

export function estimateMeal(text: string): MealEstimate {
  const parts = text
    .toLowerCase()
    .split(/,|\band\b|\bwith\b|\+|&/)
    .map((s) => s.trim())
    .filter(Boolean);
  const items = parts.map((part) => {
    const qty = Number(part.match(/^(\d+(?:\.\d+)?)\s/)?.[1] ?? 1);
    const food = FOODS.find(([re]) => re.test(part));
    const name = part.replace(/^\d+(?:\.\d+)?\s*/, "") || part;
    if (!food) return { name, quantity: "1 serving", calories: 200, protein_g: 8, carbs_g: 24, fat_g: 8 };
    const [, portion, kcal, p, c, f] = food;
    const m = Math.min(qty, 10);
    return { name, quantity: m === 1 ? portion : `${m} × ${portion}`, calories: Math.round(kcal * m), protein_g: p * m, carbs_g: c * m, fat_g: f * m };
  });
  const known = parts.filter((p) => FOODS.some(([re]) => re.test(p))).length;
  return {
    items,
    confidence: known === parts.length ? "medium" : "low",
    note: "Demo estimate using typical portions — connect the AI for real estimates.",
  };
}

function weeklyReview(prompt: string) {
  const done = num(prompt, /Workouts completed: (\d+)/, 0);
  const target = num(prompt, /planned target: (\d+)/, 4);
  const name = prompt.match(/Name: (\S+)/)?.[1] ?? "there";
  const loggedDays = (prompt.match(/^\d{4}-\d{2}-\d{2}: \d+ kcal/gm) ?? []).length;
  const score = Math.max(3, Math.min(10, Math.round(4 + (done / Math.max(1, target)) * 4 + loggedDays / 4)));
  return {
    headline: done >= target ? "A fully consistent week — this is how progress happens" : `${done} of ${target} workouts done — solid foundation to build on`,
    score,
    wins: [
      `You completed ${done} workout${done === 1 ? "" : "s"} this week.`,
      `Food was logged on ${loggedDays} of 7 days, which makes your targets far easier to hit.`,
      "Your training weights are trending up on the main lifts.",
    ],
    improvements: [
      loggedDays < 7 ? "A couple of days had no food logged — weekends are the usual gap." : "Protein was a little under target on two days.",
      "Water intake dipped mid-week.",
    ],
    adjustments: [
      "Log breakfast before you leave home so the day starts tracked.",
      "Add a 20-minute walk on one rest day.",
      "Keep a protein shake in your gym bag for days you run late.",
    ],
    message: `Great work this week, ${name}. Small, repeatable wins like these add up — let's make next week even more consistent.`,
  };
}
