import { z } from "zod";

// Limits mirror the checks in supabase/migrations/0004_testimonials.sql.
const optional = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .max(max, msg)
    .transform((s) => s || null);

export const testimonialSchema = z.object({
  display_name: z.string().trim().min(2, "Enter the name to show").max(60, "Keep the name under 60 characters"),
  context: optional(60, "Keep this under 60 characters"),
  result: optional(60, "Keep this under 60 characters"),
  quote: z.string().trim().min(20, "Write at least 20 characters").max(600, "Keep your review under 600 characters"),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  consent: z.literal(true, "Please agree so we can show your review"),
});

export type TestimonialInput = z.input<typeof testimonialSchema>;
