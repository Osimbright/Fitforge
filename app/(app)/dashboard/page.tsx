import { Activity, Clock, Dumbbell, Flame, Scale, Sparkles, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/app/avatar";
import { FlexIcon } from "@/components/brand";
import { GeneratePlanButton } from "@/components/app/generate-plan-button";
import { StatCard } from "@/components/app/stat-card";
import { WaterCard } from "@/components/app/water-card";
import { BarSeries } from "@/components/charts/bar-series";
import { MacroDonut } from "@/components/charts/macro-donut";
import { Badge, Card, CardHeader, EmptyState, ProgressBar } from "@/components/ui/card";
import { StartWorkoutButton } from "@/components/workout/start-workout-button";
import { bmi, bmiCategory } from "@/lib/fitness/calculations";
import { requireOnboardedProfile } from "@/lib/data/profile";
import { getActiveDietPlan, getActiveWorkoutPlan, pickTodaysWorkout } from "@/lib/data/plans";
import { computeStreak, getMealsBetween, getRecentSessions, getWaterFor, pctChange, sumMeals, weekDays } from "@/lib/data/stats";
import { dateKeyIn, hourIn, shiftKey, userTimeZone, weekdayOf } from "@/lib/date";
import { firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { welcome } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedProfile();
  const tz = await userTimeZone();
  const today = dateKeyIn(tz);
  const week = weekDays(today);
  const lastWeekStart = shiftKey(week[0], -7);
  const since = shiftKey(today, -60);

  const [plan, diet, sessions, meals, waterMl, metrics] = await Promise.all([
    getActiveWorkoutPlan(supabase, user.id),
    getActiveDietPlan(supabase, user.id),
    getRecentSessions(supabase, user.id, tz, since),
    getMealsBetween(supabase, user.id, since, today),
    getWaterFor(supabase, user.id, today),
    supabase
      .from("body_metrics")
      .select("log_date, weight_kg")
      .eq("user_id", user.id)
      .not("weight_kg", "is", null)
      .order("log_date", { ascending: true })
      .then((r) => (r.data ?? []) as { log_date: string; weight_kg: number }[]),
  ]);

  // ── Weekly stats ──
  const thisWeek = sessions.filter((s) => s.day >= week[0]);
  const lastWeek = sessions.filter((s) => s.day >= lastWeekStart && s.day < week[0]);
  const minutes = (list: typeof sessions) => list.reduce((t, s) => t + (s.duration_min ?? 0), 0);
  const burned = (list: typeof sessions) => list.reduce((t, s) => t + (s.calories_est ?? 0), 0);
  const plannedThisWeek = thisWeek.filter((s) => s.type === "planned").length;

  const todayMeals = meals.filter((m) => m.log_date === today);
  const eaten = sumMeals(todayMeals);
  const activeDays = new Set([...sessions.map((s) => s.day), ...meals.map((m) => m.log_date)]);
  const streak = computeStreak(activeDays, today);

  const weeklyBars = week.map((d) => ({
    label: weekdayOf(d).slice(0, 3),
    sublabel: d,
    value: minutes(sessions.filter((s) => s.day === d)),
  }));

  // ── Challenges (computed from logs) ──
  const proteinDays = week.filter((d) => {
    const p = sumMeals(meals.filter((m) => m.log_date === d)).protein_g;
    return profile.protein_g ? p >= profile.protein_g * 0.9 : false;
  }).length;
  const challenges = [
    { emoji: "🔥", title: `${profile.days_per_week} workouts this week`, value: thisWeek.length, max: profile.days_per_week ?? 4 },
    { emoji: "🥩", title: "Hit protein goal 5 days", value: proteinDays, max: 5 },
    { emoji: "⚡", title: "7-day activity streak", value: Math.min(streak, 7), max: 7 },
  ];

  const todays = plan ? pickTodaysWorkout(plan.plan, weekdayOf(today)) : null;
  const startWeight = metrics[0]?.weight_kg ?? profile.weight_kg ?? 0;
  const currentWeight = metrics.at(-1)?.weight_kg ?? profile.weight_kg ?? 0;
  const weightDelta = Math.round((currentWeight - startWeight) * 10) / 10;
  const bmiValue = profile.height_cm ? bmi(currentWeight, profile.height_cm) : null;
  const heroImage = todays?.day.exercises.find((e) => e.image)?.image;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            {greet(hourIn(tz))}, {firstName(profile.full_name)}! <FlexIcon className="-mt-1.5 align-middle" />
          </h1>
          <p className="mt-1 text-muted">
            {streak > 1 ? `You're on a ${streak}-day streak. Keep it going!` : "Ready to crush your goals today?"}
          </p>
        </div>
        <Link href="/profile" className="lg:hidden" aria-label="Settings">
          <Avatar name={profile.full_name ?? "A"} />
        </Link>
      </div>

      {welcome && (
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-lime/30 bg-lime/10 p-5">
          <p className="flex items-center gap-2 font-semibold text-lime">
            <Sparkles className="h-4 w-4" /> Welcome to FitForge!
          </p>
          <p className="mt-1 text-sm text-fg/80">
            Your daily target is <b>{profile.calorie_target} kcal</b> with <b>{profile.protein_g} g protein</b>. Your workout and
            meal plans are ready — start with today&apos;s session below, or ask your AI coach anything.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard icon={Dumbbell} tone="lime" label="Workouts this week" value={thisWeek.length} unit={`/ ${profile.days_per_week}`} footnote={`${plannedThisWeek} from your plan`} />
        <StatCard icon={Flame} tone="ember" label="Calories eaten" value={Math.round(eaten.calories).toLocaleString("en-US")} unit={`/ ${profile.calorie_target}`} footnote={`${burned(thisWeek)} kcal burned this week`} />
        <StatCard icon={Clock} tone="sky" label="Workout time" value={minutes(thisWeek)} unit="min" change={pctChange(minutes(thisWeek), minutes(lastWeek))} />
        <StatCard icon={Activity} tone="violet" label="Streak" value={streak} unit={streak === 1 ? "day" : "days"} footnote="Workouts or meals logged" />
      </div>

      {/* Today's workout + weekly progress */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {todays && plan ? (
          <div className="card relative isolate overflow-hidden p-6 md:p-7">
            {heroImage && (
              <>
                <Image src={heroImage} alt="" fill sizes="(min-width: 1280px) 60vw, 100vw" className="-z-20 object-cover object-center opacity-40" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-surface via-surface/90 to-surface/30" />
              </>
            )}
            <p className="text-sm font-semibold text-lime">{todays.isToday ? "Today's Workout" : `Next up · ${todays.weekday}`}</p>
            <h2 className="mt-2 font-display text-3xl font-bold">{todays.day.name}</h2>
            <p className="mt-2 max-w-md text-sm text-muted">{todays.day.focus}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-fg/80">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {todays.day.estimated_minutes} min</span>
              <span className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-ember" /> {todays.day.estimated_calories} kcal</span>
              <span className="flex items-center gap-1.5"><Dumbbell className="h-4 w-4" /> {todays.day.exercises.length} exercises</span>
              <Badge tone="lime" className="capitalize">{plan.location}</Badge>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <StartWorkoutButton planId={plan.id} dayIndex={todays.dayIndex} />
              <Link href="/workouts" className="text-sm font-semibold text-muted hover:text-fg">
                View full plan →
              </Link>
            </div>
          </div>
        ) : (
          <Card className="flex items-center justify-center">
            <EmptyState
              icon={<Dumbbell className="h-6 w-6" />}
              title="No workout plan yet"
              body="Generate a personalized plan based on your profile, goal and equipment."
              action={<GeneratePlanButton kind="workout" />}
            />
          </Card>
        )}

        <Card>
          <CardHeader title="Weekly Progress" href="/progress" />
          <p className="-mt-2 mb-3 text-xs text-muted">Minutes trained per day</p>
          <BarSeries data={weeklyBars} unit="min" label="Workout time" highlightIndex={week.indexOf(today)} height={190} />
        </Card>
      </div>

      {/* Nutrition, water, body */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader title="Nutrition Summary" href="/diet" />
          <MacroDonut
            calories={eaten.calories}
            target={profile.calorie_target ?? 2000}
            protein={eaten.protein_g}
            carbs={eaten.carbs_g}
            fat={eaten.fat_g}
            targets={{ protein_g: profile.protein_g ?? 0, carbs_g: profile.carbs_g ?? 0, fat_g: profile.fat_g ?? 0 }}
          />
          {!diet && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
              <span className="text-muted">No meal plan yet</span>
              <GeneratePlanButton kind="diet" size="sm" />
            </div>
          )}
        </Card>

        <WaterCard ml={waterMl} target={profile.water_ml ?? 2500} />

        <Card className="flex flex-col">
          <h3 className="flex items-center gap-2 font-semibold">
            <Scale className="h-5 w-5 text-violet" /> Body
          </h3>
          <p className="mt-3 font-display text-3xl font-bold">
            {currentWeight}
            <span className="text-base font-normal text-muted"> kg</span>
          </p>
          <p className={`text-sm ${weightDelta === 0 ? "text-muted" : "text-fg/80"}`}>
            {weightDelta === 0 ? "No change yet" : `${weightDelta > 0 ? "+" : ""}${weightDelta} kg since you started`}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Target" value={`${profile.target_weight_kg} kg`} />
            {bmiValue && <Row label="BMI" value={`${bmiValue} · ${bmiCategory(bmiValue).label}`} />}
          </div>
          <Link href="/progress" className="mt-auto pt-4 text-sm font-semibold text-lime hover:underline">
            Log weight →
          </Link>
        </Card>
      </div>

      {/* Challenges + recent */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-lime" /> Challenges</span>} />
          <ul className="space-y-5">
            {challenges.map((c) => (
              <li key={c.title} className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-lg">{c.emoji}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{c.title}</span>
                    <span className="text-muted">{Math.min(100, Math.round((c.value / c.max) * 100))}%</span>
                  </div>
                  <p className="text-xs text-muted">
                    {Math.min(c.value, c.max)} / {c.max}
                  </p>
                  <ProgressBar value={c.value} max={c.max} className="mt-1.5" />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Recent Activity" href="/workouts/history" />
          {sessions.length === 0 ? (
            <EmptyState title="No workouts logged yet" body="Finish a workout or log an activity and it will show up here." />
          ) : (
            <ul className="divide-y divide-line">
              {sessions.slice(-5).reverse().map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime/10 text-lime">
                      <Dumbbell className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted">{s.day}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>{s.duration_min} min</p>
                    <p>{s.calories_est} kcal</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function greet(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}
