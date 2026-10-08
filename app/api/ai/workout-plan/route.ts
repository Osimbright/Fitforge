import { z } from "zod";
import { defaultLocation, generateWorkoutPlan, saveWorkoutPlan } from "@/lib/ai/plans";
import { consumeQuota } from "@/lib/ai/quota";
import { aiRoute } from "@/lib/ai/route";

export const maxDuration = 120;

const Body = z.object({ location: z.enum(["home", "gym"]).optional() });

export const POST = aiRoute(async ({ supabase, user, profile, body }) => {
  const { location = defaultLocation(profile) } = Body.parse(body ?? {});
  await consumeQuota(supabase, "plan");
  const plan = await generateWorkoutPlan(supabase, profile, location);
  const id = await saveWorkoutPlan(supabase, user.id, location, plan);
  return { id, location };
});
