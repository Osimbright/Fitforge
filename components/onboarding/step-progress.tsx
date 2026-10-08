import { cn } from "@/lib/utils";

export const ONBOARDING_STEPS = ["Account", "Body", "Experience", "Goal", "Training", "Diet & health"] as const;

export function StepProgress({ step }: { step: number }) {
  return (
    <div>
      <div className="flex gap-1.5">
        {ONBOARDING_STEPS.map((label, i) => (
          <div
            key={label}
            className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i < step ? "bg-lime" : "bg-surface-3")}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted">
        Step {step} of {ONBOARDING_STEPS.length} · {ONBOARDING_STEPS[step - 1]}
      </p>
    </div>
  );
}
