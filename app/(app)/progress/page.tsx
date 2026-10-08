import { Camera, Medal, Ruler } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { BarSeries } from "@/components/charts/bar-series";
import { Heatmap } from "@/components/charts/heatmap";
import { LineSeries } from "@/components/charts/line-series";
import { LogMetricsForm } from "@/components/progress/log-metrics-form";
import { PhotoGallery, type GalleryPhoto } from "@/components/progress/photo-gallery";
import { StrengthChart } from "@/components/progress/strength-chart";
import { WeeklyReview } from "@/components/progress/weekly-review";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { estimated1RM } from "@/lib/fitness/calculations";
import { requireOnboardedProfile } from "@/lib/data/profile";
import { getRecentSessions, weekDays } from "@/lib/data/stats";
import { dateKeyIn, shiftKey, todayKey, userTimeZone, weekStartKey } from "@/lib/date";
import type { BodyMetric, ProgressPhoto, StoredWeeklyReview } from "@/lib/types";

export const metadata: Metadata = { title: "Progress" };

const short = (key: string) => new Date(key + "T12:00:00").toLocaleDateString("en", { day: "numeric", month: "short" });

export default async function ProgressPage() {
  const { supabase, user, profile } = await requireOnboardedProfile();
  const tz = await userTimeZone();
  const today = await todayKey();
  const heatStart = shiftKey(weekStartKey(today), -7 * 17); // 18 weeks
  const volumeStart = shiftKey(weekStartKey(today), -7 * 11); // 12 weeks

  const [{ data: metricsData }, sessions, { data: setsData }, { data: photoData }, { data: lastReview }] = await Promise.all([
    supabase.from("body_metrics").select("*").eq("user_id", user.id).order("log_date"),
    getRecentSessions(supabase, user.id, tz, heatStart),
    supabase
      .from("session_sets")
      .select("exercise_name, reps, weight_kg, created_at")
      .eq("user_id", user.id)
      .not("weight_kg", "is", null)
      .gt("weight_kg", 0)
      .order("created_at")
      .limit(3000),
    supabase.from("progress_photos").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
    supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<StoredWeeklyReview>(),
  ]);
  const metrics = (metricsData ?? []) as BodyMetric[];
  const weights = metrics.filter((m) => m.weight_kg !== null);

  // Weight trend
  const weightData = weights.map((m) => ({ label: short(m.log_date), sublabel: m.log_date, value: Number(m.weight_kg) }));
  const latestMeasure = [...metrics].reverse().find((m) => m.waist_cm || m.chest_cm || m.arm_cm);

  // Heatmap: minutes per day for 18 weeks
  const minutesByDay = new Map<string, number>();
  for (const s of sessions) minutesByDay.set(s.day, (minutesByDay.get(s.day) ?? 0) + (s.duration_min ?? 0));
  const heatDays = Array.from({ length: 18 * 7 }, (_, i) => {
    const d = shiftKey(heatStart, i);
    return { date: d, minutes: d > today ? 0 : (minutesByDay.get(d) ?? 0) };
  });
  const activeDaysThisWeek = weekDays(today).filter((d) => minutesByDay.has(d)).length;

  // Weekly volume (12 weeks)
  const volumeWeeks = Array.from({ length: 12 }, (_, i) => shiftKey(volumeStart, i * 7));
  const volumeData = volumeWeeks.map((w) => ({
    label: short(w),
    sublabel: `Week of ${short(w)}`,
    value: Math.round(sessions.filter((s) => s.day >= w && s.day < shiftKey(w, 7)).reduce((t, s) => t + Number(s.total_volume_kg ?? 0), 0)),
  }));

  // Strength: best estimated 1RM per lift per day, and PRs (heaviest set)
  const byLift = new Map<string, Map<string, number>>();
  const prs = new Map<string, { weight: number; reps: number; day: string }>();
  for (const s of setsData ?? []) {
    const w = Number(s.weight_kg);
    const day = dateKeyIn(tz, new Date(s.created_at));
    const e1 = estimated1RM(w, s.reps ?? 0);
    const lift = byLift.get(s.exercise_name) ?? new Map();
    lift.set(day, Math.max(lift.get(day) ?? 0, e1));
    byLift.set(s.exercise_name, lift);
    const pr = prs.get(s.exercise_name);
    if (!pr || w > pr.weight) prs.set(s.exercise_name, { weight: w, reps: s.reps ?? 0, day });
  }
  const lifts = [...byLift.entries()]
    .map(([name, days]) => ({
      name,
      points: [...days.entries()].map(([d, v]) => ({ label: short(d), sublabel: d, value: v })),
    }))
    .sort((a, b) => b.points.length - a.points.length);
  const prList = [...prs.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 8);

  // Progress photos (private bucket → short-lived signed URLs), tagged with the workout they followed
  const photoRows = (photoData ?? []) as ProgressPhoto[];
  const sessionIds = [...new Set(photoRows.map((p) => p.session_id).filter((id): id is string => !!id))];
  const [{ data: signed }, { data: photoSessions }] = await Promise.all([
    photoRows.length
      ? supabase.storage.from("progress-photos").createSignedUrls(photoRows.map((p) => p.path), 3600)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
    sessionIds.length
      ? supabase.from("workout_sessions").select("id, title").in("id", sessionIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const workoutTitle = new Map((photoSessions ?? []).map((s) => [s.id as string, s.title as string]));
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const photos: GalleryPhoto[] = photoRows.flatMap((p) => {
    const url = urlByPath.get(p.path);
    const workout = p.session_id ? (workoutTitle.get(p.session_id) ?? null) : null;
    return url ? [{ id: p.id, url, taken_on: p.taken_on, caption: p.caption, workout }] : [];
  });

  const startW = weights[0]?.weight_kg ? Number(weights[0].weight_kg) : null;
  const curW = weights.at(-1)?.weight_kg ? Number(weights.at(-1)!.weight_kg) : null;
  const toGo = curW !== null && profile.target_weight_kg ? Math.round((curW - Number(profile.target_weight_kg)) * 10) / 10 : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Progress" subtitle="Every rep and every meal adds up. Here's your proof." />

      <WeeklyReview initial={lastReview} />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Body weight" />
          <div className="-mt-2 mb-4 flex flex-wrap gap-6 text-sm">
            <Stat label="Start" value={startW ? `${startW} kg` : "—"} />
            <Stat label="Current" value={curW ? `${curW} kg` : "—"} />
            <Stat label="Goal" value={`${profile.target_weight_kg} kg`} />
            <Stat label="To go" value={toGo === null ? "—" : toGo === 0 ? "Goal hit! 🎉" : `${Math.abs(toGo)} kg`} />
          </div>
          {weightData.length >= 2 ? (
            <LineSeries data={weightData} unit="kg" label="Weight" goal={Number(profile.target_weight_kg)} />
          ) : (
            <EmptyState title="Log your weight a couple of times" body="Weigh in once or twice a week, same time of day, to see your trend." />
          )}
        </Card>
        <div className="space-y-6">
          <LogMetricsForm lastWeight={curW} />
          {latestMeasure && (
            <Card>
              <h3 className="flex items-center gap-2 font-semibold"><Ruler className="h-4 w-4 text-lime" /> Latest measurements</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Measure label="Waist" v={latestMeasure.waist_cm} />
                <Measure label="Chest" v={latestMeasure.chest_cm} />
                <Measure label="Arm" v={latestMeasure.arm_cm} />
              </div>
              <p className="mt-2 text-xs text-muted">From {short(latestMeasure.log_date)}</p>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader title="Consistency" action={<span className="text-sm text-muted">{activeDaysThisWeek} active days this week</span>} />
        <Heatmap days={heatDays} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Strength (estimated 1RM)" />
          {lifts.length ? (
            <StrengthChart lifts={lifts} />
          ) : (
            <EmptyState title="No weighted lifts yet" body="Log weights in your workout sessions to track strength over time." />
          )}
        </Card>
        <Card>
          <CardHeader title="Weekly training volume" />
          <p className="-mt-2 mb-3 text-xs text-muted">Total kg lifted (sets × reps × weight)</p>
          <BarSeries data={volumeData} unit="kg" label="Volume" highlightIndex={11} height={240} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Medal className="h-5 w-5 text-lime" /> Personal records</span>} />
          {prList.length ? (
            <ul className="divide-y divide-line">
              {prList.map(([name, pr]) => (
                <li key={name} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="font-medium">{name}</span>
                  <span className="text-right">
                    <span className="font-semibold">{pr.weight} kg × {pr.reps}</span>
                    <span className="block text-xs text-muted">{short(pr.day)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Your PRs will show up here" />
          )}
        </Card>
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Camera className="h-5 w-5 text-lime" /> Progress photos</span>}
            action={photos.length > 0 && <span className="text-sm text-muted">{photos.length} {photos.length === 1 ? "photo" : "photos"}</span>}
          />
          <PhotoGallery photos={photos} />
          <p className="mt-3 text-xs text-muted">
            {photos.length
              ? `Last photo ${short(photos[0].taken_on)} · only you can see these`
              : "Snap one after each session — same spot, same lighting — and watch the change add up. Only you can see these."}
          </p>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function Measure({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold">{v ? `${v} cm` : "—"}</p>
    </div>
  );
}
