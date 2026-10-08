import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const TABLES = ["workout_plans", "workout_sessions", "session_sets", "diet_plans", "meal_logs", "water_logs", "body_metrics", "progress_photos", "chat_conversations", "chat_messages", "weekly_reviews", "ai_generations", "testimonials", "pro_waitlist"];

/** Downloads all of the signed-in user's data as JSON. */
export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const entries = await Promise.all(
    TABLES.map(async (t) => [t, (await supabase.from(t).select("*").eq("user_id", user.id)).data ?? []] as const),
  );

  const body = JSON.stringify({ exported_at: new Date().toISOString(), email: user.email, profile, ...Object.fromEntries(entries) }, null, 2);
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="fitforge-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
