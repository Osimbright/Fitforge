// Maps the user's equipment choices to free-exercise-db `equipment` values,
// so the AI only ever sees exercises the user can actually perform.
import type { ExperienceLevel } from "@/lib/types";

const HOME_MAP: Record<string, string[]> = {
  bodyweight: ["body only"],
  dumbbells: ["dumbbell"],
  bands: ["bands"],
  kettlebell: ["kettlebells"],
  barbell: ["barbell", "e-z curl bar"],
  exercise_ball: ["exercise ball"],
  // pull-up bar and bench unlock specific "body only"/"other"/dumbbell moves; handled by name below
};

export const GYM_EQUIPMENT = [
  "body only",
  "machine",
  "cable",
  "barbell",
  "dumbbell",
  "kettlebells",
  "bands",
  "e-z curl bar",
  "medicine ball",
  "exercise ball",
  "foam roll",
  "other",
];

export function allowedEquipment(location: "home" | "gym", homeEquipment: string[]): string[] {
  if (location === "gym") return GYM_EQUIPMENT;
  const set = new Set<string>(["body only"]);
  for (const item of homeEquipment) for (const e of HOME_MAP[item] ?? []) set.add(e);
  return [...set];
}

/** Exercises that need a bar or bench even though the library tags them otherwise. */
export function needsUnavailableGear(name: string, homeEquipment: string[]): boolean {
  const n = name.toLowerCase();
  const hasBar = homeEquipment.includes("pullup_bar");
  const hasBench = homeEquipment.includes("bench");
  if (!hasBar && /(pull-?up|chin-?up|hanging|muscle up)/.test(n)) return true;
  if (!hasBench && /(bench|incline|decline|preacher)/.test(n)) return true;
  return false;
}

export function allowedLevels(level: ExperienceLevel): string[] {
  if (level === "beginner") return ["beginner"];
  if (level === "intermediate") return ["beginner", "intermediate"];
  return ["beginner", "intermediate", "expert"];
}

export const PLAN_CATEGORIES = ["strength", "cardio", "plyometrics", "stretching", "powerlifting", "olympic weightlifting"];
