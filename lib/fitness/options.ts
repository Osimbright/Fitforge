// Option lists shared by onboarding, profile settings and AI prompts.
import type { ActivityLevel, ExperienceLevel, Goal } from "@/lib/types";

export const GOALS: { value: Goal; label: string; hint: string; emoji: string }[] = [
  { value: "lose_fat", label: "Lose fat", hint: "Burn fat, keep muscle", emoji: "🔥" },
  { value: "build_muscle", label: "Build muscle", hint: "Gain size and shape", emoji: "💪" },
  { value: "get_stronger", label: "Get stronger", hint: "Lift heavier", emoji: "🏋️" },
  { value: "stay_fit", label: "Stay fit", hint: "Feel good and healthy", emoji: "✨" },
  { value: "endurance", label: "Improve endurance", hint: "Better stamina and cardio", emoji: "🏃" },
];

export const EXPERIENCE: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "New to training or under 6 months" },
  { value: "intermediate", label: "Intermediate", hint: "6 months – 2 years of regular training" },
  { value: "advanced", label: "Advanced", hint: "2+ years, comfortable with heavy compound lifts" },
];

export const ACTIVITY: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, little walking" },
  { value: "light", label: "Lightly active", hint: "Some walking during the day" },
  { value: "moderate", label: "Moderately active", hint: "On your feet a fair bit" },
  { value: "active", label: "Active", hint: "Physical job or lots of walking" },
  { value: "very_active", label: "Very active", hint: "Hard physical work daily" },
];

export const HOME_EQUIPMENT = [
  { value: "bodyweight", label: "No equipment" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "bands", label: "Resistance bands" },
  { value: "pullup_bar", label: "Pull-up bar" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bench", label: "Bench" },
  { value: "barbell", label: "Barbell & plates" },
  { value: "exercise_ball", label: "Exercise ball" },
] as const;

export const DIET_TYPES = [
  { value: "non_veg", label: "Non-vegetarian" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "keto", label: "Keto" },
  { value: "pescatarian", label: "Pescatarian" },
] as const;

export const CUISINES = ["Indian", "Continental", "Mediterranean", "Asian", "Mexican", "Middle Eastern", "Any"] as const;

export const COMMON_ALLERGIES = ["Dairy", "Gluten", "Nuts", "Peanuts", "Eggs", "Soy", "Shellfish", "Fish"] as const;

export const SESSION_LENGTHS = [20, 30, 45, 60, 75] as const;

export function labelFor<T extends { value: string; label: string }>(list: readonly T[], value: string | null | undefined) {
  return list.find((x) => x.value === value)?.label ?? value ?? "—";
}
