import "server-only";
import type { StoredDietPlan, StoredMeal, StoredPlanExercise, StoredWorkoutPlan } from "@/lib/ai/schemas";
import { shiftKey, weekdayOf } from "@/lib/date";
import { computeTargets } from "@/lib/fitness/calculations";
import type { Exercise, Profile } from "@/lib/types";
import { exerciseImageUrl, toDateKey } from "@/lib/utils";
import exercisesJson from "./exercises.json";
import { DEMO_EMAIL, DEMO_USER_ID } from "./mode";

type Row = Record<string, unknown>;

export const EXERCISES = exercisesJson as Exercise[];
const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export interface DemoUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  created_at: string;
}

export interface DemoStore {
  users: DemoUser[];
  tables: Record<string, Row[]>;
}

export const USER_TABLES = [
  "workout_plans",
  "workout_sessions",
  "session_sets",
  "diet_plans",
  "meal_logs",
  "water_logs",
  "body_metrics",
  "progress_photos",
  "chat_conversations",
  "chat_messages",
  "weekly_reviews",
  "ai_generations",
  "testimonials",
  "pro_waitlist",
] as const;

/** A profile row as the signup trigger would create it. */
export function blankProfile(id: string, fullName: string | null, phone: string | null): Profile & { updated_at: string } {
  const now = new Date().toISOString();
  return {
    id,
    full_name: fullName,
    phone,
    gender: null,
    dob: null,
    height_cm: null,
    weight_kg: null,
    target_weight_kg: null,
    experience_level: null,
    training_months: null,
    goal: null,
    days_per_week: null,
    session_minutes: null,
    training_location: null,
    equipment: [],
    diet_type: null,
    allergies: [],
    cuisine: null,
    meals_per_day: null,
    injuries: null,
    activity_level: null,
    units: "metric",
    timezone: null,
    bmr: null,
    tdee: null,
    calorie_target: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    water_ml: null,
    onboarding_step: 0,
    onboarding_complete: false,
    created_at: now,
    updated_at: now,
  };
}

/** Plan exercise in its stored (enriched) shape. */
export function planExercise(
  id: string,
  sets: number,
  reps: string,
  rest_seconds: number,
  notes = "",
  tracking: "reps" | "time" = "reps",
): StoredPlanExercise {
  const ex = EXERCISE_BY_ID.get(id);
  if (!ex) throw new Error(`Demo seed: unknown exercise ${id}`);
  return {
    exercise_id: id,
    sets,
    reps,
    tracking,
    rest_seconds,
    notes,
    name: ex.name,
    image: exerciseImageUrl(ex.images[0]),
    primary_muscles: ex.primary_muscles,
    equipment: ex.equipment,
  };
}

const at = (key: string, time: string) => new Date(`${key}T${time}`).toISOString();

// ───────────────────────── sample plans ─────────────────────────

function demoWorkoutPlan(): StoredWorkoutPlan {
  return {
    title: "4-Day Upper/Lower Recomp",
    summary:
      "An upper/lower split lets you train each muscle twice a week inside 60-minute sessions. Heavy strength days protect muscle while you're in a calorie deficit, and higher-rep days add volume to keep you building.",
    split: "Upper/Lower",
    days: [
      {
        name: "Upper Strength",
        weekday: "Mon",
        focus: "Chest, back, shoulders — heavy compounds",
        estimated_minutes: 60,
        estimated_calories: 420,
        warmup: "5 min rower, band pull-aparts ×20, 2 light bench sets ramping up",
        exercises: [
          planExercise("Barbell_Bench_Press_-_Medium_Grip", 4, "5-6", 150, "Pause briefly on the chest, drive feet into the floor"),
          planExercise("Bent_Over_Barbell_Row", 4, "6-8", 120, "Flat back, pull to the lower ribs"),
          planExercise("Standing_Military_Press", 3, "6-8", 120, "Squeeze glutes so you don't lean back"),
          planExercise("Wide-Grip_Lat_Pulldown", 3, "8-10", 90, "Lead with the elbows"),
          planExercise("Dumbbell_Bicep_Curl", 2, "10-12", 60),
          planExercise("Triceps_Pushdown", 2, "10-12", 60, "Keep elbows pinned to your sides"),
        ],
        cooldown: "Doorway chest stretch and lat stretch, 30s each side",
      },
      {
        name: "Lower Strength",
        weekday: "Tue",
        focus: "Quads, hamstrings, glutes, core",
        estimated_minutes: 60,
        estimated_calories: 480,
        warmup: "5 min bike, bodyweight squats ×15, leg swings, 2 ramp-up squat sets",
        exercises: [
          planExercise("Barbell_Squat", 4, "5-6", 180, "Brace hard before each rep, hit depth"),
          planExercise("Romanian_Deadlift", 3, "6-8", 150, "Push hips back, soft knees, bar close to legs"),
          planExercise("Leg_Press", 3, "10-12", 120),
          planExercise("Lying_Leg_Curls", 3, "10-12", 75),
          planExercise("Standing_Calf_Raises", 3, "12-15", 60, "Full stretch at the bottom"),
          planExercise("Plank", 3, "45s", 45, "", "time"),
        ],
        cooldown: "Hip flexor and hamstring stretch, 30s each side",
      },
      {
        name: "Upper Hypertrophy",
        weekday: "Thu",
        focus: "Upper chest, mid-back, delts, arms",
        estimated_minutes: 55,
        estimated_calories: 380,
        warmup: "5 min easy cardio, band dislocates ×15, push-ups ×10",
        exercises: [
          planExercise("Incline_Dumbbell_Press", 4, "8-10", 90, "Control the lowering for 2 seconds"),
          planExercise("Seated_Cable_Rows", 4, "10-12", 90),
          planExercise("Dumbbell_Shoulder_Press", 3, "10-12", 90),
          planExercise("Side_Lateral_Raise", 3, "12-15", 45, "Light weight, no swinging"),
          planExercise("Face_Pull", 3, "15", 45, "Pull towards your forehead, thumbs back"),
          planExercise("Hanging_Leg_Raise", 3, "10-12", 60),
        ],
        cooldown: "Cross-body shoulder stretch and child's pose",
      },
      {
        name: "Lower Hypertrophy",
        weekday: "Fri",
        focus: "Glutes, quads, core",
        estimated_minutes: 55,
        estimated_calories: 440,
        warmup: "5 min incline walk, glute bridges ×15, walking lunges ×10",
        exercises: [
          planExercise("Barbell_Hip_Thrust", 4, "8-10", 120, "Pause one second at the top"),
          planExercise("Dumbbell_Lunges", 3, "10", 90, "10 per leg, long stride"),
          planExercise("Goblet_Squat", 3, "12", 75),
          planExercise("Leg_Extensions", 3, "12-15", 60),
          planExercise("Cable_Crunch", 3, "15", 45),
        ],
        cooldown: "Pigeon stretch and quad stretch, 30s each side",
      },
    ],
    progression: [
      "When you hit the top of the rep range on every set, add 2.5 kg next session.",
      "On strength days, keep 1-2 reps in reserve — no grinding reps.",
      "Every 6th week, drop all weights by 20% for a deload.",
      "If a lift stalls for 3 sessions, swap it for a close variation for 4 weeks.",
    ],
    tips: [
      "Log every set — progress you can see is progress you'll keep.",
      "Hit your protein target daily to hold on to muscle while cutting.",
      "Walk 8-10k steps on rest days to support fat loss without hurting recovery.",
      "Sleep 7-9 hours; strength drops fast when you're short on sleep.",
    ],
  };
}

const DEMO_MEALS: StoredMeal[] = [
  {
    key: "m1",
    meal_type: "breakfast",
    name: "Greek Yogurt Power Bowl",
    time: "8:00 AM",
    items: [
      { food: "Greek yogurt (2%)", quantity: "250 g" },
      { food: "Rolled oats", quantity: "50 g" },
      { food: "Blueberries", quantity: "1 cup" },
      { food: "Walnuts", quantity: "15 g" },
      { food: "Honey", quantity: "1 tsp" },
    ],
    calories: 560,
    protein_g: 38,
    carbs_g: 70,
    fat_g: 15,
    recipe: "Stir the oats into the yogurt and let it sit 5 minutes. Top with blueberries, crushed walnuts and a drizzle of honey.",
  },
  {
    key: "m2",
    meal_type: "lunch",
    name: "Chicken Shawarma Plate",
    time: "1:00 PM",
    items: [
      { food: "Grilled chicken thigh", quantity: "180 g" },
      { food: "Brown rice (cooked)", quantity: "1 cup" },
      { food: "Cucumber-tomato salad", quantity: "1 bowl" },
      { food: "Tahini sauce", quantity: "1 tbsp" },
    ],
    calories: 640,
    protein_g: 52,
    carbs_g: 62,
    fat_g: 19,
    recipe: "Marinate chicken in yogurt, garlic, cumin and paprika, then grill or pan-sear. Serve over rice with the salad and tahini.",
  },
  {
    key: "m3",
    meal_type: "snack",
    name: "Hummus & Protein Snack",
    time: "4:30 PM",
    items: [
      { food: "Whey protein shake", quantity: "1 scoop" },
      { food: "Hummus", quantity: "3 tbsp" },
      { food: "Carrot & pepper sticks", quantity: "1 cup" },
      { food: "Rice cakes", quantity: "2" },
    ],
    calories: 360,
    protein_g: 32,
    carbs_g: 34,
    fat_g: 10,
    recipe: "Shake the whey with water. Dip the veggies and rice cakes in hummus.",
  },
  {
    key: "m4",
    meal_type: "dinner",
    name: "Lemon-Herb Salmon & Potatoes",
    time: "7:30 PM",
    items: [
      { food: "Salmon fillet", quantity: "150 g" },
      { food: "Baby potatoes", quantity: "250 g" },
      { food: "Roasted zucchini & peppers", quantity: "1.5 cups" },
      { food: "Olive oil", quantity: "1 tsp" },
    ],
    calories: 640,
    protein_g: 42,
    carbs_g: 52,
    fat_g: 26,
    recipe: "Roast potatoes and vegetables at 220°C for 25 minutes. Add salmon with lemon, garlic and dill for the last 12 minutes.",
  },
];

function demoDietPlan(targets: StoredDietPlan["targets"]): StoredDietPlan {
  return {
    summary:
      "A high-protein Mediterranean day built around your 4-meal schedule. Most carbs land at lunch and dinner to fuel your evening training, and every meal has at least 30 g of protein.",
    meals: DEMO_MEALS,
    targets,
    grocery_list: [
      { category: "Protein", items: ["Chicken thighs (1.3 kg)", "Salmon fillets (1 kg)", "Greek yogurt (1.75 kg)", "Whey protein"] },
      { category: "Carbs", items: ["Rolled oats", "Brown rice", "Baby potatoes (1.75 kg)", "Rice cakes"] },
      { category: "Produce", items: ["Blueberries", "Cucumbers", "Tomatoes", "Carrots", "Bell peppers", "Zucchini", "Lemons", "Fresh dill"] },
      { category: "Pantry", items: ["Hummus", "Tahini", "Walnuts", "Honey", "Olive oil", "Cumin", "Paprika"] },
    ],
    tips: [
      "Batch-cook the chicken and rice on Sunday to cover lunches through Wednesday.",
      "Swap salmon for any white fish or chicken breast if you want to save money.",
      "Have the protein snack within an hour after training.",
    ],
  };
}

// ───────────────────────── demo account ─────────────────────────

const BASE_KG: Record<string, number> = {
  "Barbell_Bench_Press_-_Medium_Grip": 70,
  Bent_Over_Barbell_Row: 60,
  Standing_Military_Press: 40,
  "Wide-Grip_Lat_Pulldown": 55,
  Dumbbell_Bicep_Curl: 14,
  Triceps_Pushdown: 25,
  Barbell_Squat: 85,
  Romanian_Deadlift: 75,
  Leg_Press: 140,
  Lying_Leg_Curls: 40,
  Standing_Calf_Raises: 60,
  Incline_Dumbbell_Press: 26,
  Seated_Cable_Rows: 55,
  Dumbbell_Shoulder_Press: 22,
  Side_Lateral_Raise: 9,
  Face_Pull: 22,
  Barbell_Hip_Thrust: 90,
  Dumbbell_Lunges: 18,
  Goblet_Squat: 28,
  Leg_Extensions: 45,
  Cable_Crunch: 30,
};

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function seedStore(): DemoStore {
  const today = toDateKey();
  const uid = DEMO_USER_ID;
  const tables: DemoStore["tables"] = Object.fromEntries(
    ["profiles", ...USER_TABLES].map((t) => [t, [] as Row[]]),
  );

  // Weigh-ins: a steady cut over six weeks.
  const weights = [84.6, 84.1, 83.5, 83.2, 82.5, 82.0, 81.6];
  const waists = [92, 91.5, 91, 90.4, 89.8, 89.2, 88.6];
  weights.forEach((w, i) => {
    const key = shiftKey(today, -43 + i * 7);
    tables.body_metrics.push({
      id: crypto.randomUUID(),
      user_id: uid,
      log_date: key,
      weight_kg: w,
      waist_cm: waists[i],
      chest_cm: i % 3 === 0 ? 104 - i * 0.3 : null,
      arm_cm: i % 3 === 0 ? 37 + i * 0.1 : null,
      photo_path: null,
      created_at: at(key, "07:30:00"),
    });
  });

  // Progress photos every three weeks (paths map to sample images in the demo client).
  [0, 3, 6].forEach((i, n) => {
    const key = shiftKey(today, -43 + i * 7);
    tables.progress_photos.push({
      id: crypto.randomUUID(),
      user_id: uid,
      session_id: null,
      taken_on: key,
      path: `${uid}/demo-${n}.jpg`,
      caption: n === 0 ? "Day one" : null,
      created_at: at(key, "07:35:00"),
    });
  });

  const profile = {
    ...blankProfile(uid, "Alex Carter", "+1 555 0142"),
    gender: "male" as const,
    dob: "1996-04-12",
    height_cm: 178,
    weight_kg: weights.at(-1)!,
    target_weight_kg: 76,
    experience_level: "intermediate" as const,
    training_months: 14,
    goal: "lose_fat" as const,
    days_per_week: 4,
    session_minutes: 60,
    training_location: "gym" as const,
    diet_type: "non_veg",
    cuisine: "Mediterranean",
    meals_per_day: 4,
    injuries: null,
    activity_level: "moderate" as const,
    onboarding_step: 6,
    onboarding_complete: true,
    created_at: at(shiftKey(today, -45), "09:00:00"),
  };
  const targets = computeTargets({
    weightKg: profile.weight_kg,
    heightCm: profile.height_cm,
    ageYears: 30,
    gender: profile.gender,
    activity: profile.activity_level,
    goal: profile.goal,
  });
  tables.profiles.push({ ...profile, ...targets });

  // Plans
  const plan = demoWorkoutPlan();
  const planId = crypto.randomUUID();
  tables.workout_plans.push({
    id: planId,
    user_id: uid,
    title: plan.title,
    location: "gym",
    plan,
    is_active: true,
    created_at: at(shiftKey(today, -42), "09:05:00"),
  });
  const diet = demoDietPlan({
    calories: targets.calorie_target,
    protein_g: targets.protein_g,
    carbs_g: targets.carbs_g,
    fat_g: targets.fat_g,
  });
  tables.diet_plans.push({
    id: crypto.randomUUID(),
    user_id: uid,
    plan: diet,
    calorie_target: targets.calorie_target,
    is_active: true,
    created_at: at(shiftKey(today, -42), "09:06:00"),
  });

  // Four weeks of completed sessions (with a couple of missed days for realism).
  for (let d = -28; d <= -1; d++) {
    const key = shiftKey(today, d);
    const dayIndex = plan.days.findIndex((p) => p.weekday === weekdayOf(key));
    if (dayIndex < 0 || d === -17 || d === -9) continue;
    const day = plan.days[dayIndex];
    const week = Math.floor((d + 28) / 7);
    const sessionId = crypto.randomUUID();
    const start = new Date(at(key, "18:00:00"));
    const duration = day.estimated_minutes + ((d * 7) % 9) - 4;

    let volume = 0;
    let offset = 0;
    for (const ex of day.exercises) {
      const base = BASE_KG[ex.exercise_id];
      for (let s = 1; s <= ex.sets; s++) {
        offset += 2;
        const timed = ex.tracking === "time";
        const reps = timed ? null : Number(ex.reps.match(/\d+/)?.[0] ?? 10) + (s === ex.sets ? 0 : 1);
        const weight = base ? roundTo(base * (1 + 0.025 * week), base < 20 ? 1 : 2.5) : null;
        if (reps && weight) volume += reps * weight;
        tables.session_sets.push({
          id: crypto.randomUUID(),
          session_id: sessionId,
          user_id: uid,
          exercise_id: ex.exercise_id,
          exercise_name: ex.name,
          set_no: s,
          reps,
          weight_kg: weight,
          duration_sec: timed ? Number(ex.reps.match(/\d+/)?.[0] ?? 30) : null,
          completed: true,
          created_at: new Date(start.getTime() + offset * 60_000).toISOString(),
        });
      }
    }

    tables.workout_sessions.push({
      id: sessionId,
      user_id: uid,
      plan_id: planId,
      day_index: dayIndex,
      title: day.name,
      type: "planned",
      status: "completed",
      started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + duration * 60_000).toISOString(),
      duration_min: duration,
      calories_est: day.estimated_calories + ((d * 13) % 40),
      total_volume_kg: Math.round(volume),
      notes: null,
    });
  }

  // A 30-minute run as a custom session.
  {
    const key = shiftKey(today, -2);
    const start = new Date(at(key, "07:15:00"));
    tables.workout_sessions.push({
      id: crypto.randomUUID(),
      user_id: uid,
      plan_id: null,
      day_index: null,
      title: "Morning run",
      type: "custom",
      status: "completed",
      started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + 30 * 60_000).toISOString(),
      duration_min: 30,
      calories_est: 340,
      total_volume_kg: 0,
      notes: "Easy 5 km",
    });
  }

  // Food and water: the last 6 days mostly on-plan, plus breakfast today.
  const extras = [
    { meal_type: "snack", description: "Cappuccino and a banana", calories: 230, protein_g: 7, carbs_g: 38, fat_g: 6 },
    { meal_type: "dinner", description: "3 slices margherita pizza", calories: 810, protein_g: 33, carbs_g: 96, fat_g: 30 },
    { meal_type: "snack", description: "Protein bar", calories: 210, protein_g: 20, carbs_g: 22, fat_g: 7 },
  ];
  for (let d = -6; d <= 0; d++) {
    const key = shiftKey(today, d);
    const meals = d === 0 ? DEMO_MEALS.slice(0, 1) : DEMO_MEALS.filter((_, i) => !(d === -4 && i === 2));
    meals.forEach((m, i) => {
      const swapDinner = d === -3 && m.meal_type === "dinner";
      const meal = swapDinner ? extras[1] : m;
      tables.meal_logs.push({
        id: crypto.randomUUID(),
        user_id: uid,
        log_date: key,
        meal_type: meal.meal_type,
        description: "name" in meal ? meal.name : meal.description,
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        source: swapDinner ? "ai" : "plan",
        plan_meal_key: swapDinner ? null : m.key,
        created_at: at(key, `${String(8 + i * 4).padStart(2, "0")}:15:00`),
      });
    });
    if (d === -5 || d === -1) {
      const x = extras[d === -5 ? 0 : 2];
      tables.meal_logs.push({ id: crypto.randomUUID(), user_id: uid, log_date: key, ...x, source: "manual", plan_meal_key: null, created_at: at(key, "11:00:00") });
    }
    const water = d === 0 ? [500, 250] : [750, 500, 750, 500].slice(0, 2 + ((d + 6) % 3));
    water.forEach((ml, i) =>
      tables.water_logs.push({ id: crypto.randomUUID(), user_id: uid, log_date: key, ml, created_at: at(key, `${String(9 + i * 3).padStart(2, "0")}:00:00`) }),
    );
  }

  // Coach conversations
  const convo = (title: string, daysAgo: number, messages: [string, string][]) => {
    const id = crypto.randomUUID();
    const key = shiftKey(today, -daysAgo);
    tables.chat_conversations.push({ id, user_id: uid, title, created_at: at(key, "20:00:00"), updated_at: at(key, "20:03:00") });
    messages.forEach(([role, content], i) =>
      tables.chat_messages.push({
        id: crypto.randomUUID(),
        conversation_id: id,
        user_id: uid,
        role,
        content,
        proposals: [],
        created_at: at(key, `20:0${i}:00`),
      }),
    );
  };
  convo("My bench press has been stuck at 75 kg", 3, [
    ["user", "My bench press has been stuck at 75 kg for two weeks. What should I do?"],
    [
      "assistant",
      "Two weeks at the same weight while you're in a calorie deficit is normal, Alex — it's not a true plateau yet. A few things to try:\n\n- **Add reps before weight:** stay at 75 kg until you hit 4×6, then jump to 77.5 kg.\n- **Pause reps on Thursday:** 3×5 at 65 kg with a 2-second pause builds strength off the chest.\n- **Check your protein:** you averaged 158 g this week; aim for your 165 g target.\n\nIf it's still stuck in 3 weeks, we can swap in close-grip bench for a block.",
    ],
  ]);
  convo("Good post-workout meals?", 9, [
    ["user", "What should I eat after training in the evening?"],
    [
      "assistant",
      "Since you train around 6 PM, your **Lemon-Herb Salmon & Potatoes** dinner is already a great post-workout meal: 42 g protein plus starchy carbs to refill glycogen.\n\nIf dinner is more than 2 hours away, have your whey shake straight after training and move the hummus to dinner.",
    ],
  ]);

  return {
    users: [{ id: uid, email: DEMO_EMAIL, user_metadata: { full_name: profile.full_name }, created_at: profile.created_at }],
    tables,
  };
}
