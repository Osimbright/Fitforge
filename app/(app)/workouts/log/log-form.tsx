"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logCustomWorkout } from "@/app/(app)/actions/workout";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/choice";
import { Field, Input, Textarea, UnitInput } from "@/components/ui/input";

const ACTIVITIES = [
  { value: "running", label: "🏃 Running" },
  { value: "walking", label: "🚶 Walking" },
  { value: "cycling", label: "🚴 Cycling" },
  { value: "strength", label: "🏋️ Strength" },
  { value: "hiit", label: "⚡ HIIT" },
  { value: "yoga", label: "🧘 Yoga" },
  { value: "swimming", label: "🏊 Swimming" },
  { value: "sports", label: "⚽ Sports" },
  { value: "other", label: "✨ Other" },
];

export function LogActivityForm({ today }: { today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activity, setActivity] = useState("running");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");

  const submit = () =>
    startTransition(async () => {
      const label = ACTIVITIES.find((a) => a.value === activity)?.label.slice(2).trim() ?? "Activity";
      const res = await logCustomWorkout({
        title: title.trim() || label,
        activity,
        duration_min: Number(minutes),
        date,
        notes,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Activity logged 💪");
      router.push("/dashboard");
    });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Log an activity" subtitle="Anything outside your plan — a run, a match, a yoga class." />
      <Card className="space-y-6 p-6">
        <Field label="Activity type">
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map((a) => (
              <Chip key={a.value} selected={activity === a.value} onClick={() => setActivity(a.value)}>
                {a.label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Title (optional)">
          <Input placeholder="Evening 5K" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration">
            <UnitInput unit="min" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <Textarea value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button className="w-full" size="lg" onClick={submit} loading={pending} disabled={!Number(minutes)}>
          Save activity
        </Button>
      </Card>
    </div>
  );
}
