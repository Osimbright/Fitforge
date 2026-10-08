"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Large selectable tile used for single- or multi-choice questions. */
export function ChoiceCard({
  selected,
  onClick,
  title,
  hint,
  icon,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer",
        selected ? "border-lime bg-lime/[0.07] glow-lime" : "border-line bg-surface-2 hover:border-fg/20",
        className,
      )}
    >
      {icon && <span className="text-2xl leading-none">{icon}</span>}
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-lime bg-lime text-black" : "border-line",
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

/** Compact pill toggle, e.g. for allergies or equipment. */
export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
        selected ? "border-lime bg-lime text-black" : "border-line bg-surface-2 text-fg/80 hover:border-fg/25",
      )}
    >
      {children}
    </button>
  );
}

/** Segmented control for small option sets (units, days/week). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-full border border-line bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer",
            value === o.value ? "bg-lime text-black" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
