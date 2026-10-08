// Deterministic health math. The AI never computes these — it receives them as context.
import type { ActivityLevel, Gender, Goal } from "@/lib/types";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Never recommend fewer calories than this, regardless of goal. */
export const MIN_CALORIES: Record<Gender, number> = { male: 1500, female: 1200, other: 1350 };

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

export function bmiCategory(value: number): { label: string; tone: "low" | "ok" | "high" | "very_high" } {
  if (value < 18.5) return { label: "Underweight", tone: "low" };
  if (value < 25) return { label: "Healthy", tone: "ok" };
  if (value < 30) return { label: "Overweight", tone: "high" };
  return { label: "Obese", tone: "very_high" };
}

/** Mifflin–St Jeor. "other" uses the midpoint of the male/female constants. */
export function bmr(weightKg: number, heightCm: number, ageYears: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const offset = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  return Math.round(base + offset);
}

export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return Math.round(bmrValue * ACTIVITY_MULTIPLIERS[activity]);
}

export function calorieTarget(tdeeValue: number, goal: Goal, gender: Gender): number {
  const factor: Record<Goal, number> = {
    lose_fat: 0.8,
    build_muscle: 1.1,
    get_stronger: 1.05,
    stay_fit: 1,
    endurance: 1.05,
  };
  const raw = Math.round((tdeeValue * factor[goal]) / 10) * 10;
  return Math.max(raw, MIN_CALORIES[gender]);
}

export interface Macros {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

/** Protein by goal (g/kg), fat at 25% of calories, carbs fill the rest. */
export function macros(calories: number, weightKg: number, goal: Goal): Macros {
  const proteinPerKg: Record<Goal, number> = {
    lose_fat: 2.0,
    build_muscle: 1.8,
    get_stronger: 1.8,
    stay_fit: 1.6,
    endurance: 1.6,
  };
  const protein_g = Math.round(weightKg * proteinPerKg[goal]);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  return { protein_g, fat_g, carbs_g };
}

export function waterTargetMl(weightKg: number): number {
  return Math.round((weightKg * 35) / 50) * 50;
}

export function ageFromDob(dob: string | Date, today: Date = new Date()): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export interface Targets extends Macros {
  bmr: number;
  tdee: number;
  calorie_target: number;
  water_ml: number;
}

export function computeTargets(input: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: Gender;
  activity: ActivityLevel;
  goal: Goal;
}): Targets {
  const b = bmr(input.weightKg, input.heightCm, input.ageYears, input.gender);
  const t = tdee(b, input.activity);
  const cal = calorieTarget(t, input.goal, input.gender);
  return {
    bmr: b,
    tdee: t,
    calorie_target: cal,
    ...macros(cal, input.weightKg, input.goal),
    water_ml: waterTargetMl(input.weightKg),
  };
}

// ── Training math ──

/** Epley estimated one-rep max. */
export function estimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return round1(weightKg * (1 + reps / 30));
}

/** Rough calories burned: MET × kg × hours. */
export function caloriesBurned(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

export const ACTIVITY_METS: Record<string, number> = {
  strength: 5,
  hiit: 8,
  running: 9.8,
  cycling: 7.5,
  walking: 3.5,
  yoga: 2.5,
  swimming: 7,
  sports: 7,
  other: 5,
};

// ── Unit conversions ──
export const kgToLb = (kg: number) => round1(kg * 2.20462);
export const lbToKg = (lb: number) => round1(lb / 2.20462);
export const cmToFtIn = (cm: number) => {
  const totalIn = cm / 2.54;
  let ft = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - ft * 12);
  if (inches === 12) {
    ft += 1;
    inches = 0;
  }
  return { ft, in: inches };
};
export const ftInToCm = (ft: number, inches: number) => round1((ft * 12 + inches) * 2.54);

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
