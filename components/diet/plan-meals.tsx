"use client";

import { Check, ChefHat, Clock, Repeat } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { togglePlanMeal } from "@/app/(app)/actions/tracking";
import { Badge } from "@/components/ui/card";
import type { StoredMeal } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

const MEAL_EMOJI = { breakfast: "🍳", lunch: "🍛", dinner: "🍲", snack: "🍎" } as const;

export function PlanMeals({ meals: initial, eatenKeys, editable }: { meals: StoredMeal[]; eatenKeys: string[]; editable: boolean }) {
  const [meals, setMeals] = useState(initial);
  const [eaten, setEaten] = useState(new Set(eatenKeys));
  const [swapping, setSwapping] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (key: string) =>
    startTransition(async () => {
      setEaten((s) => {
        const n = new Set(s);
        if (n.has(key)) n.delete(key);
        else n.add(key);
        return n;
      });
      const res = await togglePlanMeal(key);
      if (!res.ok) {
        toast.error(res.error);
        setEaten(new Set(eatenKeys));
      }
    });

  async function swap(key: string) {
    const request = window.prompt("Any preference for the new meal? (optional, e.g. 'no paneer', 'quick to make')", "");
    if (request === null) return;
    setSwapping(key);
    try {
      const res = await fetch("/api/ai/swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "meal", mealKey: key, request: request || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMeals((ms) => ms.map((m) => (m.key === key ? json.meal : m)));
      toast.success(`Swapped to ${json.meal.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSwapping(null);
    }
  }

  return (
    <div className="space-y-3">
      {meals.map((m) => {
        const done = eaten.has(m.key);
        return (
          <div key={m.key} className={cn("card p-4 transition-colors md:p-5", done && "border-lime/40 bg-lime/[0.04]")}>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-xl">{MEAL_EMOJI[m.meal_type]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted">{m.meal_type}</p>
                  <span className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> {m.time}</span>
                </div>
                <p className="mt-0.5 font-semibold">{m.name}</p>
                <p className="mt-1 text-sm text-muted">{m.items.map((i) => `${i.quantity} ${i.food}`).join(" · ")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="ember">{m.calories} kcal</Badge>
                  <Badge>P {Math.round(m.protein_g)}g</Badge>
                  <Badge>C {Math.round(m.carbs_g)}g</Badge>
                  <Badge>F {Math.round(m.fat_g)}g</Badge>
                </div>
                <details className="group mt-2">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-lime [&::-webkit-details-marker]:hidden">
                    <ChefHat className="h-3.5 w-3.5" /> How to make it
                  </summary>
                  <p className="mt-1.5 text-sm text-fg/80">{m.recipe}</p>
                </details>
              </div>
              {editable && (
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(m.key)}
                    aria-label={done ? `Unmark ${m.name}` : `Mark ${m.name} as eaten`}
                    className={cn(
                      "flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors cursor-pointer",
                      done ? "bg-lime text-black" : "border border-line text-muted hover:text-fg",
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} /> {done ? "Eaten" : "Eat"}
                  </button>
                  <button
                    type="button"
                    onClick={() => swap(m.key)}
                    disabled={swapping !== null || done}
                    className="flex h-9 items-center justify-center gap-1 rounded-full text-xs font-medium text-muted hover:text-lime disabled:opacity-40 cursor-pointer"
                  >
                    <Repeat className={cn("h-3.5 w-3.5", swapping === m.key && "animate-spin")} /> Swap
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
