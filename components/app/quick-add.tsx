"use client";

import { Droplets, Dumbbell, Scale, Utensils } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logWater, logWeight } from "@/app/(app)/actions/tracking";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { UnitInput } from "@/components/ui/input";

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [weight, setWeight] = useState("");

  const water = () =>
    startTransition(async () => {
      const res = await logWater(250);
      if (res.ok) toast.success("+250 ml water 💧");
      else toast.error(res.error);
    });

  const saveWeight = () =>
    startTransition(async () => {
      const res = await logWeight({ weight_kg: Number(weight) });
      if (res.ok) {
        toast.success("Weight logged");
        setWeight("");
        onClose();
      } else toast.error(res.error);
    });

  return (
    <Dialog open={open} onClose={onClose} title="Quick add">
      <div className="grid grid-cols-2 gap-3">
        <Link href="/workouts" onClick={onClose} className="card flex flex-col items-start gap-3 p-4 hover:border-lime/40">
          <Dumbbell className="h-6 w-6 text-lime" />
          <span className="text-sm font-semibold">Start workout</span>
        </Link>
        <Link href="/diet?log=1" onClick={onClose} className="card flex flex-col items-start gap-3 p-4 hover:border-lime/40">
          <Utensils className="h-6 w-6 text-ember" />
          <span className="text-sm font-semibold">Log a meal</span>
        </Link>
        <button type="button" onClick={water} disabled={pending} className="card flex flex-col items-start gap-3 p-4 text-left hover:border-lime/40 cursor-pointer">
          <Droplets className="h-6 w-6 text-sky" />
          <span className="text-sm font-semibold">+250 ml water</span>
        </button>
        <Link href="/workouts/log" onClick={onClose} className="card flex flex-col items-start gap-3 p-4 hover:border-lime/40">
          <span className="text-2xl leading-6">🏃</span>
          <span className="text-sm font-semibold">Log activity</span>
        </Link>
      </div>
      <div className="mt-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Scale className="h-4 w-4 text-violet" /> Log today&apos;s weight
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <UnitInput unit="kg" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="72.5" />
          </div>
          <Button onClick={saveWeight} disabled={!weight} loading={pending}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
