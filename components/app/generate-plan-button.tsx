"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Calls an AI plan endpoint and refreshes the page when done. */
export function GeneratePlanButton({
  kind,
  location,
  label,
  confirmText,
  ...props
}: {
  kind: "workout" | "diet";
  location?: "home" | "gym";
  label?: string;
  confirmText?: string;
} & Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setLoading(true);
    const id = toast.loading(kind === "workout" ? "Forging your workout plan… (up to a minute)" : "Cooking up your meal plan… (up to a minute)");
    try {
      const res = await fetch(`/api/ai/${kind === "workout" ? "workout-plan" : "diet-plan"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(location ? { location } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to generate plan");
      toast.success("Your new plan is ready!", { id });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate plan", { id });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={run} loading={loading} {...props}>
      {!loading && <Sparkles className="h-4 w-4" />}
      {label ?? (kind === "workout" ? "Generate workout plan" : "Generate diet plan")}
    </Button>
  );
}
