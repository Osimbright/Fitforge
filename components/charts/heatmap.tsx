"use client";

import { cn } from "@/lib/utils";

// Sequential single-hue ramp (lime), light → strong, for minutes trained per day.
const STEPS = ["bg-surface-3", "bg-lime/25", "bg-lime/50", "bg-lime/75", "bg-lime"];

function step(minutes: number) {
  if (minutes <= 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 40) return 2;
  if (minutes < 60) return 3;
  return 4;
}

/** GitHub-style consistency grid: columns are weeks (Mon→Sun rows). */
export function Heatmap({ days }: { days: { date: string; minutes: number }[] }) {
  const weeks: { date: string; minutes: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        <div className="mr-1 grid grid-rows-7 gap-[3px] text-[10px] leading-3 text-muted">
          {["M", "", "W", "", "F", "", "S"].map((d, i) => (
            <span key={i} className="h-3">{d}</span>
          ))}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="grid grid-rows-7 gap-[3px]">
            {w.map((d) => (
              <span
                key={d.date}
                title={`${d.date}: ${d.minutes ? `${d.minutes} min` : "rest"}`}
                className={cn("h-3 w-3 rounded-[3px]", STEPS[step(d.minutes)])}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        Less
        {STEPS.map((s) => (
          <span key={s} className={cn("h-3 w-3 rounded-[3px]", s)} />
        ))}
        More
      </div>
    </div>
  );
}
