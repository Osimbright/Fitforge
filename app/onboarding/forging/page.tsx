"use client";

import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "pending" | "done" | "error";

const MESSAGES = [
  "Calculating your calorie and macro targets…",
  "Matching exercises to your equipment…",
  "Balancing your weekly training split…",
  "Building meals around your diet preferences…",
  "Adding progression rules so you keep improving…",
  "Final polish…",
];

async function post(url: string) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Request failed");
}

export default function ForgingPage() {
  const router = useRouter();
  const [workout, setWorkout] = useState<Status>("pending");
  const [diet, setDiet] = useState<Status>("pending");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState(0);
  const started = useRef(false);

  const run = useCallback(async (which: { workout: boolean; diet: boolean }) => {
    setError(null);
    const tasks: Promise<void>[] = [];
    if (which.workout) {
      setWorkout("pending");
      tasks.push(post("/api/ai/workout-plan").then(() => setWorkout("done"), (e: Error) => { setWorkout("error"); throw e; }));
    }
    if (which.diet) {
      setDiet("pending");
      tasks.push(post("/api/ai/diet-plan").then(() => setDiet("done"), (e: Error) => { setDiet("error"); throw e; }));
    }
    const results = await Promise.allSettled(tasks);
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed) setError(failed.reason?.message ?? "Something went wrong");
    else setTimeout(() => router.replace("/dashboard?welcome=1"), 900);
  }, [router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run({ workout: true, diet: true });
  }, [run]);

  useEffect(() => {
    const t = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, []);

  const allDone = workout === "done" && diet === "done";

  return (
    <div className="hero-gradient flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center">
      <div className={cn("relative rounded-3xl", !error && !allDone && "animate-pulse-ring")}>
        <LogoMark className="h-20 w-20" />
      </div>
      <h1 className="mt-10 font-display text-4xl font-bold tracking-tight md:text-5xl">
        {allDone ? "Your plan is ready!" : error ? "Almost there…" : "Forging your plan"}
      </h1>
      <p className="mt-3 h-6 text-muted">{allDone ? "Taking you to your dashboard" : error ? "One part needs another try." : MESSAGES[msg]}</p>

      <div className="mt-10 w-full max-w-sm space-y-3 text-left">
        <Row label="Personalized workout plan" status={workout} />
        <Row label="Personalized diet plan" status={diet} />
      </div>

      {error && (
        <div className="mt-8 max-w-sm space-y-4">
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => run({ workout: workout === "error", diet: diet === "error" })}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
            <Button variant="ghost" onClick={() => router.replace("/dashboard")}>
              Skip for now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, status }: { label: string; status: Status }) {
  return (
    <div className="card flex items-center justify-between px-5 py-4">
      <span className="font-medium">{label}</span>
      {status === "pending" && <Loader2 className="h-5 w-5 animate-spin text-lime" />}
      {status === "done" && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime text-black">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
      {status === "error" && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger/20 text-danger">
          <X className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
