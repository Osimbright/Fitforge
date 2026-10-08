import { Clock, Dumbbell, Flame, Weight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { requireOnboardedProfile } from "@/lib/data/profile";
import { dateKeyIn, userTimeZone } from "@/lib/date";
import type { SessionSet, WorkoutSession } from "@/lib/types";

export const metadata: Metadata = { title: "Workout history" };

export default async function HistoryPage() {
  const { supabase, user } = await requireOnboardedProfile();
  const tz = await userTimeZone();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(50);
  const list = (sessions ?? []) as WorkoutSession[];

  const { data: sets } = list.length
    ? await supabase.from("session_sets").select("*").in("session_id", list.map((s) => s.id)).order("set_no")
    : { data: [] };
  const bySession = new Map<string, SessionSet[]>();
  for (const s of (sets ?? []) as SessionSet[]) bySession.set(s.session_id, [...(bySession.get(s.session_id) ?? []), s]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Workout history" subtitle="Your last 50 sessions" />
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Dumbbell className="h-6 w-6" />}
            title="Nothing here yet"
            body="Complete a workout from your plan or log an activity."
            action={<Link href="/workouts" className="text-sm font-semibold text-lime hover:underline">Go to workouts →</Link>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((s) => {
            const sSets = bySession.get(s.id) ?? [];
            const grouped = new Map<string, SessionSet[]>();
            for (const x of sSets) grouped.set(x.exercise_name, [...(grouped.get(x.exercise_name) ?? []), x]);
            return (
              <details key={s.id} className="card group p-5">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-xs text-muted">
                      {new Date(dateKeyIn(tz, new Date(s.started_at)) + "T12:00:00").toLocaleDateString("en", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.type === "custom" && <Badge tone="violet">Activity</Badge>}
                    <Badge><Clock className="h-3 w-3" /> {s.duration_min} min</Badge>
                    <Badge tone="ember"><Flame className="h-3 w-3" /> {s.calories_est} kcal</Badge>
                    {Number(s.total_volume_kg) > 0 && <Badge tone="lime"><Weight className="h-3 w-3" /> {Number(s.total_volume_kg).toLocaleString("en-US")} kg</Badge>}
                  </div>
                </summary>
                {(grouped.size > 0 || s.notes) && (
                  <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
                    {[...grouped.entries()].map(([name, xs]) => (
                      <div key={name} className="flex flex-col justify-between gap-1 sm:flex-row">
                        <span className="font-medium">{name}</span>
                        <span className="text-muted">
                          {xs.map((x) => (x.duration_sec ? `${x.duration_sec}s` : `${x.weight_kg ?? 0}×${x.reps}`)).join(" · ")}
                        </span>
                      </div>
                    ))}
                    {s.notes && <p className="text-muted">📝 {s.notes}</p>}
                  </div>
                )}
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
