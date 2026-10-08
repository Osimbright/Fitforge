import { Building2, History, House, Plus, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GeneratePlanButton } from "@/components/app/generate-plan-button";
import { PageHeader } from "@/components/app/page-header";
import { Card, EmptyState } from "@/components/ui/card";
import { PlanView } from "@/components/workout/plan-view";
import { defaultLocation } from "@/lib/ai/plans";
import { requireOnboardedProfile } from "@/lib/data/profile";
import { getActiveWorkoutPlan } from "@/lib/data/plans";
import { todayKey, weekdayOf } from "@/lib/date";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Workouts" };

export default async function WorkoutsPage({ searchParams }: PageProps<"/workouts">) {
  const { loc } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedProfile();
  const location = loc === "home" || loc === "gym" ? loc : defaultLocation(profile);
  const plan = await getActiveWorkoutPlan(supabase, user.id, location);
  const today = weekdayOf(await todayKey());

  return (
    <div>
      <PageHeader
        title="Workouts"
        subtitle={plan ? plan.plan.title : "Your personalized training plan"}
        action={
          <>
            <Link href="/workouts/history" className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:border-lime/60">
              <History className="h-4 w-4" /> History
            </Link>
            <Link href="/workouts/log" className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:border-lime/60">
              <Plus className="h-4 w-4" /> Log activity
            </Link>
          </>
        }
      />

      {/* Home / Gym switch */}
      <div className="mb-6 inline-flex rounded-full border border-line bg-surface p-1">
        {(["gym", "home"] as const).map((l) => (
          <Link
            key={l}
            href={`/workouts?loc=${l}`}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold capitalize transition-colors",
              location === l ? "bg-lime text-black" : "text-muted hover:text-fg",
            )}
          >
            {l === "gym" ? <Building2 className="h-4 w-4" /> : <House className="h-4 w-4" />} {l}
          </Link>
        ))}
      </div>

      {plan ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <PlanView key={plan.id} planId={plan.id} plan={plan.plan} todayWeekday={today} />
          <aside className="space-y-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">{plan.plan.split}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg/85">{plan.plan.summary}</p>
            </Card>
            <Card>
              <h3 className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4 text-lime" /> How to progress
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-fg/80">
                {plan.plan.progression.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" /> {p}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="font-semibold">Coach tips</h3>
              <ul className="mt-3 space-y-2 text-sm text-fg/80">
                {plan.plan.tips.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            </Card>
            <Card className="space-y-3">
              <p className="text-sm text-muted">Changed your goal, schedule or equipment? Get a fresh plan.</p>
              <GeneratePlanButton
                kind="workout"
                location={location}
                label="Regenerate plan"
                variant="secondary"
                className="w-full"
                confirmText="Replace your current plan with a new AI-generated one?"
              />
            </Card>
          </aside>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={location === "gym" ? <Building2 className="h-6 w-6" /> : <House className="h-6 w-6" />}
            title={`No ${location} plan yet`}
            body={
              location === "home"
                ? "We'll build a plan using only the equipment you have at home (set it in Settings)."
                : "We'll build a gym plan using barbells, dumbbells, machines and cables."
            }
            action={<GeneratePlanButton kind="workout" location={location} label={`Generate ${location} plan`} />}
          />
        </Card>
      )}
    </div>
  );
}
