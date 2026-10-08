import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { logGeneration } from "@/lib/ai/log";
import { consumeQuota } from "@/lib/ai/quota";
import { aiRoute } from "@/lib/ai/route";
import { MealEstimateSchema } from "@/lib/ai/schemas";

export const maxDuration = 30;

const Body = z.object({ text: z.string().trim().min(2).max(500) });

const SYSTEM = `You are a nutrition database assistant. Estimate calories and macros for foods a user describes in everyday language.
- Split the description into individual items with realistic default portions when a quantity isn't given (e.g. 1 roti ≈ 40 g ≈ 120 kcal; 1 cup cooked rice ≈ 200 kcal).
- Recognise regional dishes (Indian, Asian, Western, etc.) and typical home-cooked preparations.
- Values per item must be internally consistent (calories ≈ 4×protein + 4×carbs + 9×fat).
- If the text isn't food, return an empty items list with confidence "low" and explain in the note.`;

export const POST = aiRoute(async ({ supabase, user, body }) => {
  const { text } = Body.parse(body);
  await consumeQuota(supabase, "meal");
  const estimate = await generateStructured({
    schema: MealEstimateSchema,
    model: "fast",
    maxTokens: 2048,
    system: SYSTEM,
    prompt: `Food eaten: ${text}`,
  });
  const totals = estimate.items.reduce(
    (t, i) => ({
      calories: t.calories + i.calories,
      protein_g: t.protein_g + i.protein_g,
      carbs_g: t.carbs_g + i.carbs_g,
      fat_g: t.fat_g + i.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  const result = {
    ...estimate,
    totals: {
      calories: Math.round(totals.calories),
      protein_g: Math.round(totals.protein_g * 10) / 10,
      carbs_g: Math.round(totals.carbs_g * 10) / 10,
      fat_g: Math.round(totals.fat_g * 10) / 10,
    },
  };
  await logGeneration(supabase, user.id, "meal_estimate", { text }, result);
  return result;
});
