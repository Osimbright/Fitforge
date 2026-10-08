"use client";

import { Clock, Dumbbell, Flame, Info, Repeat, Timer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/card";
import type { StoredPlanExercise, StoredWorkoutPlan } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import { StartWorkoutButton } from "./start-workout-button";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function PlanView({
  planId,
  plan: initialPlan,
  todayWeekday,
}: {
  planId: string;
  plan: StoredWorkoutPlan;
  todayWeekday: (typeof WEEK)[number];
}) {
  const [plan, setPlan] = useState(initialPlan);
  const todayIdx = plan.days.findIndex((d) => d.weekday === todayWeekday);
  const [selected, setSelected] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [swapping, setSwapping] = useState<number | null>(null);
  const day = plan.days[selected];

  async function swap(exerciseIndex: number) {
    setSwapping(exerciseIndex);
    try {
      const res = await fetch("/api/ai/swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "exercise", planId, dayIndex: selected, exerciseIndex }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPlan((p) => ({
        ...p,
        days: p.days.map((d, i) =>
          i === selected ? { ...d, exercises: d.exercises.map((e, j) => (j === exerciseIndex ? (json.exercise as StoredPlanExercise) : e)) } : d,
        ),
      }));
      toast.success(`Swapped to ${json.exercise.name}`, { description: json.reason });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSwapping(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEK.map((wd) => {
          const idx = plan.days.findIndex((d) => d.weekday === wd);
          const isRest = idx < 0;
          const active = idx === selected;
          return (
            <button
              key={wd}
              type="button"
              disabled={isRest}
              onClick={() => setSelected(idx)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-semibold transition-colors",
                active ? "border-lime bg-lime text-black" : isRest ? "border-line/60 text-muted/60" : "border-line bg-surface hover:border-lime/50 cursor-pointer",
              )}
            >
              <span>{wd}</span>
              <span className={cn("text-[10px] font-medium", active ? "text-black/70" : "text-muted")}>{isRest ? "Rest" : `Day ${idx + 1}`}</span>
              {wd === todayWeekday && <span className={cn("h-1 w-1 rounded-full", active ? "bg-black" : "bg-lime")} />}
            </button>
          );
        })}
      </div>

      {day && (
        <div className="card overflow-hidden">
          <div className="ember-gradient flex flex-col justify-between gap-4 border-b border-line p-5 md:flex-row md:items-center md:p-6">
            <div>
              <p className="text-sm font-semibold text-lime">
                {day.weekday === todayWeekday ? "Today" : day.weekday} · Day {selected + 1}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">{day.name}</h2>
              <p className="text-sm text-muted">{day.focus}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-fg/80">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {day.estimated_minutes} min</span>
                <span className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-ember" /> {day.estimated_calories} kcal</span>
                <span className="flex items-center gap-1.5"><Dumbbell className="h-4 w-4" /> {day.exercises.length} exercises</span>
              </div>
            </div>
            <StartWorkoutButton planId={planId} dayIndex={selected} size="lg" />
          </div>

          <div className="space-y-4 p-5 md:p-6">
            <div className="rounded-2xl bg-surface-2 p-4 text-sm">
              <span className="font-semibold text-lime">Warm-up · </span>
              <span className="text-fg/80">{day.warmup}</span>
            </div>
            <ol className="space-y-3">
              {day.exercises.map((ex, i) => (
                <li key={`${ex.exercise_id}-${i}`} className="flex gap-4 rounded-2xl border border-line p-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-3 sm:h-24 sm:w-28">
                    {ex.image ? (
                      <Image src={ex.image} alt={ex.name} fill sizes="112px" className="object-cover" />
                    ) : (
                      <Dumbbell className="m-auto h-full w-6 text-muted" />
                    )}
                    <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{ex.name}</p>
                        <p className="mt-0.5 truncate text-xs capitalize text-muted">
                          {ex.primary_muscles.join(", ")} · {ex.equipment ?? "bodyweight"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Link
                          href={`/exercises/${encodeURIComponent(ex.exercise_id)}`}
                          aria-label={`How to do ${ex.name}`}
                          className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg"
                        >
                          <Info className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => swap(i)}
                          disabled={swapping !== null}
                          aria-label={`Swap ${ex.name}`}
                          title="Swap for an alternative"
                          className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-lime disabled:opacity-40 cursor-pointer"
                        >
                          <Repeat className={cn("h-4 w-4", swapping === i && "animate-spin")} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone="lime">
                        {ex.sets} × {ex.reps}
                      </Badge>
                      <Badge>
                        <Timer className="h-3 w-3" /> {ex.rest_seconds}s rest
                      </Badge>
                    </div>
                    {ex.notes && <p className="mt-2 text-xs text-muted">💡 {ex.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="rounded-2xl bg-surface-2 p-4 text-sm">
              <span className="font-semibold text-sky">Cool-down · </span>
              <span className="text-fg/80">{day.cooldown}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
