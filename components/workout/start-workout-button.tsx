"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { startSession } from "@/app/(app)/actions/workout";
import { Button, type ButtonProps } from "@/components/ui/button";

export function StartWorkoutButton({
  planId,
  dayIndex,
  label = "Start Workout",
  ...props
}: { planId: string; dayIndex: number; label?: string } & Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      {...props}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await startSession(planId, dayIndex);
          if (!res.ok || !res.data) {
            toast.error(res.ok ? "Couldn't start workout" : res.error);
            return;
          }
          router.push(`/workouts/session/${res.data.id}`);
        })
      }
    >
      {!pending && <Play className="h-4 w-4 fill-current" />}
      {label}
    </Button>
  );
}
