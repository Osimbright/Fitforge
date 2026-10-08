import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  lime: "bg-lime/15 text-lime",
  ember: "bg-ember/15 text-ember",
  sky: "bg-sky/15 text-sky",
  violet: "bg-violet/15 text-violet",
};

export function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  unit,
  change,
  footnote,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  label: string;
  value: string | number;
  unit?: string;
  change?: number | null;
  footnote?: string;
}) {
  return (
    <div className="card flex items-start gap-4 p-4 md:p-5">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", TONES[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted md:text-sm">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-bold leading-tight md:text-3xl">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
        </p>
        {change !== undefined && change !== null ? (
          <p className={cn("mt-1 flex items-center gap-0.5 text-xs", change >= 0 ? "text-success" : "text-ember")}>
            {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change)}% vs last week
          </p>
        ) : footnote ? (
          <p className="mt-1 text-xs text-muted">{footnote}</p>
        ) : null}
      </div>
    </div>
  );
}
