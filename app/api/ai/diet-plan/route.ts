import { generateDietPlan, saveDietPlan } from "@/lib/ai/plans";
import { consumeQuota } from "@/lib/ai/quota";
import { aiRoute } from "@/lib/ai/route";

export const maxDuration = 120;

export const POST = aiRoute(async ({ supabase, user, profile }) => {
  await consumeQuota(supabase, "plan");
  const plan = await generateDietPlan(profile);
  const id = await saveDietPlan(supabase, user.id, plan);
  return { id };
});
