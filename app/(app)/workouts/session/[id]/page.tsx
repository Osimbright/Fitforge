import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SessionTracker, type PrevSet } from "@/components/workout/session-tracker";
import type { StoredWorkoutPlan } from "@/lib/ai/schemas";
import { requireOnboardedProfile } from "@/lib/data/profile";
import type { SessionSet, WorkoutSession } from "@/lib/types";

export const metadata: Metadata = { title: "Workout in progress" };

export default async function SessionPage({ params }: PageProps<"/workouts/session/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireOnboardedProfile();

  const { data: session } = await supabase.from("workout_sessions").select("*").eq("id", id).maybeSingle<WorkoutSession>();
  if (!session) notFound();
  if (session.status === "completed") redirect("/workouts/history");
  if (!session.plan_id || session.day_index === null) redirect("/workouts");

  const [{ data: planRow }, { data: sets }] = await Promise.all([
    supabase.from("workout_plans").select("plan").eq("id", session.plan_id).single<{ plan: StoredWorkoutPlan }>(),
    supabase.from("session_sets").select("*").eq("session_id", id).order("set_no"),
  ]);
  const day = planRow?.plan.days[session.day_index];
  if (!day) redirect("/workouts");

  // Previous performance for each exercise (most recent other session) + all-time best weight.
  const ids = day.exercises.map((e) => e.exercise_id);
  const { data: history } = await supabase
    .from("session_sets")
    .select("session_id, exercise_id, set_no, reps, weight_kg, duration_sec, created_at")
    .eq("user_id", user.id)
    .in("exercise_id", ids)
    .neq("session_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  const previous: Record<string, PrevSet[]> = {};
  const bestWeight: Record<string, number> = {};
  const lastSession: Record<string, string> = {};
  for (const h of history ?? []) {
    if (!h.exercise_id) continue;
    bestWeight[h.exercise_id] = Math.max(bestWeight[h.exercise_id] ?? 0, Number(h.weight_kg ?? 0));
    lastSession[h.exercise_id] ??= h.session_id;
    if (lastSession[h.exercise_id] === h.session_id) {
      (previous[h.exercise_id] ??= []).push({
        set_no: h.set_no,
        reps: h.reps,
        weight_kg: h.weight_kg === null ? null : Number(h.weight_kg),
        duration_sec: h.duration_sec,
      });
    }
  }

  return (
    <SessionTracker
      sessionId={session.id}
      startedAt={session.started_at}
      day={day}
      savedSets={(sets ?? []) as SessionSet[]}
      previous={previous}
      bestWeight={bestWeight}
    />
  );
}
