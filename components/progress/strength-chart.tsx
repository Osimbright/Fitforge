"use client";

import { useState } from "react";
import { LineSeries } from "@/components/charts/line-series";
import { Select } from "@/components/ui/input";

/** Estimated 1RM over time for one lift at a time (single series → no legend needed). */
export function StrengthChart({ lifts }: { lifts: { name: string; points: { label: string; sublabel: string; value: number }[] }[] }) {
  const [selected, setSelected] = useState(lifts[0]?.name ?? "");
  const lift = lifts.find((l) => l.name === selected) ?? lifts[0];
  if (!lift) return null;

  return (
    <div>
      <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="mb-4 h-10 max-w-xs">
        {lifts.map((l) => (
          <option key={l.name}>{l.name}</option>
        ))}
      </Select>
      {lift.points.length < 2 ? (
        <p className="py-10 text-center text-sm text-muted">Log this lift in at least two workouts to see a trend.</p>
      ) : (
        <LineSeries data={lift.points} unit="kg" label="Estimated 1RM" height={220} />
      )}
    </div>
  );
}
