"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StoredWeeklyReview } from "@/lib/types";

/** Shows the latest saved review; each refresh stores a new one. */
export function WeeklyReview({ initial }: { initial: StoredWeeklyReview | null }) {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<StoredWeeklyReview | null>(initial);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/weekly-review", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReview(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet/15 blur-3xl" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-violet" /> AI weekly check-in
          </h3>
          <p className="text-sm text-muted">Your coach reviews the last 7 days of training, food and weight.</p>
        </div>
        <Button variant={review ? "secondary" : "primary"} onClick={run} loading={loading}>
          {review ? "Refresh review" : "Get my weekly review"}
        </Button>
      </div>

      {review && (
        <div className="mt-6 animate-fade-up space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-lime text-black">
              <span className="font-display text-2xl font-bold leading-none">{review.score}</span>
              <span className="text-[10px] font-semibold">/ 10</span>
            </div>
            <div>
              <p className="text-lg font-semibold">{review.headline}</p>
              <p className="text-xs text-muted">
                {fmt(review.period_start)} – {fmt(review.period_end)} · saved {fmt(review.created_at)}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <List title="✅ Wins" items={review.wins} />
            <List title="🎯 To improve" items={review.improvements} />
            <List title="🔧 Try next week" items={review.adjustments} />
          </div>
          <p className="rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed text-fg/85">{review.message}</p>
        </div>
      )}
    </Card>
  );
}

const fmt = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en", { day: "numeric", month: "short" });

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-fg/80">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}
