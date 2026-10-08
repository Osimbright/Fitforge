"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTestimonial, saveTestimonial } from "@/app/(app)/actions/testimonials";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { Testimonial, TestimonialStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { testimonialSchema } from "@/lib/validations/testimonial";

const STATUS: Record<TestimonialStatus, { label: string; className: string; note: string }> = {
  pending: {
    label: "Waiting for review",
    className: "bg-ember/15 text-ember",
    note: "We read every review before it goes on the site. Editing it sends it back for review.",
  },
  approved: {
    label: "Live on the homepage",
    className: "bg-lime/15 text-lime",
    note: "Thanks for sharing! Editing your review takes it off the site until it's approved again.",
  },
  rejected: {
    label: "Not published",
    className: "bg-danger/15 text-danger",
    note: "This one wasn't published. You can edit it and send it again.",
  },
};

export function TestimonialForm({
  existing,
  suggestedName,
  suggestedContext,
}: {
  existing: Testimonial | null;
  suggestedName: string;
  suggestedContext: string;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(existing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState({
    display_name: existing?.display_name ?? suggestedName,
    context: existing?.context ?? suggestedContext,
    result: existing?.result ?? "",
    quote: existing?.quote ?? "",
    rating: existing?.rating ?? 0,
    consent: existing?.consent ?? false,
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  function submit() {
    const parsed = testimonialSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await saveTestimonial(v);
      if (!res.ok) toast.error(res.error);
      else {
        setSaved(res.data ?? null);
        toast.success("Thanks! Your review was sent for approval.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteTestimonial();
      if (!res.ok) toast.error(res.error);
      else {
        setSaved(null);
        setV((s) => ({ ...s, result: "", quote: "", rating: 0, consent: false }));
        toast.success("Review deleted");
      }
    });
  }

  const status = saved ? STATUS[saved.status] : null;

  return (
    <Card className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Share your FitForge story</h2>
          <p className="mt-1 text-xs text-muted">
            {status?.note ?? "How has training with FitForge gone for you? Approved reviews appear on our homepage."}
          </p>
        </div>
        {status && <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", status.className)}>{status.label}</span>}
      </div>

      <Field label="Your rating" error={errors.rating}>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={v.rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => set("rating", n)}
              className="cursor-pointer rounded-md p-1 text-lime transition-transform hover:scale-110"
            >
              <Star className={cn("h-7 w-7", n <= v.rating ? "fill-current" : "text-muted/50")} />
            </button>
          ))}
        </div>
      </Field>

      <Field label="Your review" htmlFor="t-quote" error={errors.quote} hint={`${v.quote.trim().length}/600 — what changed for you, and what helped most?`}>
        <Textarea
          id="t-quote"
          rows={4}
          maxLength={600}
          value={v.quote}
          onChange={(e) => set("quote", e.target.value)}
          aria-invalid={!!errors.quote}
          placeholder="I'd never stuck with a plan before. The short home workouts fit around my job and…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name to show" htmlFor="t-name" error={errors.display_name} hint="First name and last initial works well">
          <Input id="t-name" maxLength={60} value={v.display_name} onChange={(e) => set("display_name", e.target.value)} aria-invalid={!!errors.display_name} />
        </Field>
        <Field label="How you train (optional)" htmlFor="t-context" error={errors.context}>
          <Input id="t-context" maxLength={60} value={v.context} onChange={(e) => set("context", e.target.value)} placeholder="Home · Beginner" />
        </Field>
      </div>
      <Field label="Your result (optional)" htmlFor="t-result" error={errors.result} hint="A short headline, e.g. “−5 kg in 10 weeks” or “First pull-up”">
        <Input id="t-result" maxLength={60} value={v.result} onChange={(e) => set("result", e.target.value)} />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={v.consent}
          onChange={(e) => set("consent", e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-lime"
        />
        <span className="text-fg/90">
          FitForge may show this review on its website and marketing with the name above.
          {errors.consent && <span className="mt-1 block text-xs text-danger">{errors.consent}</span>}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} loading={pending}>
          {saved ? "Update review" : "Submit review"}
        </Button>
        {saved && (
          <Button variant="ghost" onClick={remove} disabled={pending}>
            Delete review
          </Button>
        )}
      </div>
    </Card>
  );
}
