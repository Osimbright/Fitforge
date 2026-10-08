import "server-only";
import { ageFromDob, bmi } from "@/lib/fitness/calculations";
import { labelFor, ACTIVITY, DIET_TYPES, GOALS, HOME_EQUIPMENT } from "@/lib/fitness/options";
import type { Profile } from "@/lib/types";

/** Compact, human-readable profile block given to the AI as context. */
export function profileContext(p: Profile): string {
  const age = p.dob ? ageFromDob(p.dob) : null;
  const lines = [
    `Name: ${p.full_name ?? "User"}`,
    `Age: ${age ?? "unknown"}, Gender: ${p.gender ?? "unknown"}`,
    `Height: ${p.height_cm} cm, Weight: ${p.weight_kg} kg, Target weight: ${p.target_weight_kg} kg` +
      (p.height_cm && p.weight_kg ? `, BMI: ${bmi(p.weight_kg, p.height_cm)}` : ""),
    `Experience: ${p.experience_level} (${p.training_months ?? 0} months of training)`,
    `Goal: ${labelFor(GOALS, p.goal)}`,
    `Schedule: ${p.days_per_week} days/week, ${p.session_minutes} min per session`,
    `Trains at: ${p.training_location}` +
      (p.training_location !== "gym" && p.equipment.length
        ? ` (home equipment: ${p.equipment.map((e) => labelFor(HOME_EQUIPMENT, e)).join(", ")})`
        : ""),
    `Daily activity outside workouts: ${labelFor(ACTIVITY, p.activity_level)}`,
    `Diet: ${labelFor(DIET_TYPES, p.diet_type)}, cuisine preference: ${p.cuisine}, ${p.meals_per_day} meals/day`,
    `Allergies / avoid: ${p.allergies.length ? p.allergies.join(", ") : "none"}`,
    `Injuries / conditions: ${p.injuries?.trim() || "none reported"}`,
    `Calculated targets: ${p.calorie_target} kcal/day (BMR ${p.bmr}, TDEE ${p.tdee}), protein ${p.protein_g} g, carbs ${p.carbs_g} g, fat ${p.fat_g} g, water ${p.water_ml} ml`,
  ];
  return lines.join("\n");
}

export const SAFETY_RULES = `Safety rules (always follow):
- You give general fitness and nutrition guidance, not medical advice. Never diagnose conditions.
- For pain (especially sharp, joint or chest pain), injuries, dizziness, or medical conditions, recommend seeing a doctor or physiotherapist, and suggest gentler alternatives meanwhile.
- Respect reported injuries: avoid exercises that load the injured area and prefer low-impact options.
- Never recommend fewer than 1200 kcal/day (women) or 1500 kcal/day (men), extreme fasting, or rapid weight loss beyond ~1% bodyweight per week.
- Never recommend steroids, prescription drugs or unregulated supplements. Basic supplements (whey, creatine, vitamin D) are fine to mention.
- If someone shows signs of disordered eating, respond with care, avoid numbers-focused advice, and gently suggest professional support.`;
