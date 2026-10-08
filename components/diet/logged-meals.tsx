"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteMeal } from "@/app/(app)/actions/tracking";
import { Badge } from "@/components/ui/card";
import type { MealLog } from "@/lib/types";

const ORDER = ["breakfast", "lunch", "snack", "dinner"] as const;

export function LoggedMeals({ meals }: { meals: MealLog[] }) {
  const [pending, startTransition] = useTransition();
  if (meals.length === 0) return <p className="py-6 text-center text-sm text-muted">Nothing logged for this day yet.</p>;

  return (
    <div className="space-y-4">
      {ORDER.filter((t) => meals.some((m) => m.meal_type === t)).map((type) => (
        <div key={type}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{type}</p>
          <ul className="space-y-2">
            {meals
              .filter((m) => m.meal_type === type)
              .map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.description}</p>
                    <p className="text-xs text-muted">
                      P {Math.round(m.protein_g)}g · C {Math.round(m.carbs_g)}g · F {Math.round(m.fat_g)}g
                    </p>
                  </div>
                  {m.source !== "manual" && <Badge tone={m.source === "plan" ? "lime" : "violet"}>{m.source === "plan" ? "Plan" : "AI"}</Badge>}
                  <span className="text-sm font-semibold">{m.calories}</span>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`Delete ${m.description}`}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await deleteMeal(m.id);
                        if (!res.ok) toast.error(res.error);
                      })
                    }
                    className="rounded-full p-1.5 text-muted hover:bg-surface-3 hover:text-danger cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
