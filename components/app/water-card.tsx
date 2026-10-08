"use client";

import { Droplets, Minus, Plus } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { logWater } from "@/app/(app)/actions/tracking";
import { Card } from "@/components/ui/card";

export function WaterCard({ ml, target }: { ml: number; target: number }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, add] = useOptimistic(ml, (cur, delta: number) => Math.max(0, cur + delta));
  const pct = Math.min(100, Math.round((optimistic / Math.max(1, target)) * 100));
  const glasses = Math.round(target / 250);
  const filled = Math.floor(optimistic / 250);

  const change = (delta: number) =>
    startTransition(async () => {
      add(delta);
      const res = await logWater(delta);
      if (!res.ok) toast.error(res.error);
    });

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <Droplets className="h-5 w-5 text-sky" /> Water
        </h3>
        <span className="text-sm text-muted">{pct}%</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">
        {(optimistic / 1000).toFixed(2)}
        <span className="text-base font-normal text-muted"> / {(target / 1000).toFixed(1)} L</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden>
        {Array.from({ length: glasses }, (_, i) => (
          <span key={i} className={`h-6 w-3.5 rounded-sm transition-colors ${i < filled ? "bg-sky" : "bg-surface-3"}`} />
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-5">
        <button
          type="button"
          aria-label="Remove 250 ml"
          disabled={pending || optimistic <= 0}
          onClick={() => change(-250)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted hover:text-fg disabled:opacity-40 cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => change(250)}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-sky/15 text-sm font-semibold text-sky hover:bg-sky/25 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> 250 ml
        </button>
      </div>
    </Card>
  );
}
