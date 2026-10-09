import { z } from "zod";

export const accountSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,18}$/, "Enter a valid phone number with country code"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
});
export type AccountInput = z.infer<typeof accountSchema>;

export const bodySchema = z.object({
  gender: z.enum(["male", "female", "other"], { error: "Select an option" }),
  dob: z
    .string()
    .min(1, "Enter your date of birth")
    .refine((v) => {
      const age = (Date.now() - new Date(v).getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 18 && age <= 100;
    }, "You must be at least 18 to use FitForge"),
  height_cm: z.number({ error: "Enter your height" }).min(120, "Too short?").max(230, "Too tall?"),
  weight_kg: z.number({ error: "Enter your weight" }).min(30, "Check your weight").max(250, "Check your weight"),
  target_weight_kg: z.number({ error: "Enter a target weight" }).min(30).max(250),
  units: z.enum(["metric", "imperial"]),
});
export type BodyInput = z.infer<typeof bodySchema>;

export const experienceSchema = z.object({
  experience_level: z.enum(["beginner", "intermediate", "advanced"], { error: "Pick your level" }),
  training_months: z.number().int().min(0).max(600),
});
export type ExperienceInput = z.infer<typeof experienceSchema>;

export const goalSchema = z.object({
  goal: z.enum(["lose_fat", "build_muscle", "get_stronger", "stay_fit", "endurance"], { error: "Pick a goal" }),
  days_per_week: z.number().int().min(2).max(6),
  session_minutes: z.number().int().min(15).max(120),
});
export type GoalInput = z.infer<typeof goalSchema>;

export const locationSchema = z
  .object({
    training_location: z.enum(["home", "gym", "both"], { error: "Choose where you train" }),
    equipment: z.array(z.string()),
  })
  .refine((v) => v.training_location === "gym" || v.equipment.length > 0, {
    message: "Pick at least one option (choose “No equipment” if you have none)",
    path: ["equipment"],
  });
export type LocationInput = z.infer<typeof locationSchema>;

export const dietHealthSchema = z.object({
  diet_type: z.string().min(1, "Pick a diet type"),
  allergies: z.array(z.string()),
  cuisine: z.string().min(1),
  meals_per_day: z.number().int().min(2).max(6),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  injuries: z.string().max(500).optional().default(""),
  disclaimer: z.literal(true, { error: "Please confirm to continue" }),
});
export type DietHealthInput = z.infer<typeof dietHealthSchema>;

/** Everything the profile needs after onboarding (used by the server action). */
export const onboardingSchema = bodySchema
  .extend(experienceSchema.shape)
  .extend(goalSchema.shape)
  .extend({
    training_location: z.enum(["home", "gym", "both"]),
    equipment: z.array(z.string()),
  })
  .extend(dietHealthSchema.omit({ disclaimer: true }).shape);
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileUpdateSchema = onboardingSchema.partial().extend({
  full_name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional(),
});
