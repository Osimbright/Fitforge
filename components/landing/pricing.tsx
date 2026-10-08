"use client";

import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { joinProWaitlist } from "@/app/actions/waitlist";
import { PRO_PRICE, PRO_YEARLY_SAVING } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

// Free = what the app does today (daily limits from lib/ai/quota.ts).
const FREE_FEATURES = [
  "AI workout & diet plans for home or gym",
  "AI coach — 50 messages a day",
  "Live workout tracker with rest timer",
  "Meal, water & weight logging",
  "Progress charts, photos & weekly AI review",
];

// Planned — Pro isn't sold yet, so the card is labelled "Coming soon".
const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited AI coach chats (fair use)",
  "Unlimited plan regenerations",
  "Plans that auto-adjust from your weekly review",
  "Advanced strength & body analytics",
  "Early access to new features + priority support",
];

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("yearly");

  return (
    <section id="pricing" className="mx-auto w-full max-w-7xl scroll-mt-8 px-5 py-24 md:px-8">
      <div className="flex flex-col items-center text-center">
        <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Pricing
        </span>
        <h2 className="mt-5 max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">
          Start free. <span className="text-lime">Go Pro</span> when you&apos;re ready.
        </h2>
        <p className="mt-4 max-w-lg text-muted">Everything you need to start training is free. Pro is coming soon — join the waitlist for early access.</p>

        <div className="mt-8 inline-flex rounded-full border border-line bg-surface p-1" role="radiogroup" aria-label="Billing period">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={billing === b}
              onClick={() => setBilling(b)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold capitalize transition-colors",
                billing === b ? "bg-lime text-black" : "text-muted hover:text-fg",
              )}
            >
              {b}
              {b === "yearly" && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", billing === b ? "bg-black/15" : "bg-lime/15 text-lime")}>
                  −{PRO_YEARLY_SAVING}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="card flex flex-col p-7">
          <h3 className="text-lg font-semibold">Free</h3>
          <p className="mt-1 text-sm text-muted">For getting started and building the habit.</p>
          <p className="mt-6 flex items-end gap-1">
            <span className="font-display text-5xl font-bold">$0</span>
            <span className="pb-1.5 text-sm text-muted">forever</span>
          </p>
          <FeatureList items={FREE_FEATURES} />
          <Link
            href="/signup"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-line font-semibold transition-colors hover:border-lime/60 hover:text-lime"
          >
            Start free
          </Link>
        </div>

        {/* Pro */}
        <div className="card relative flex flex-col overflow-hidden border-lime/40 bg-gradient-to-b from-lime/[0.08] to-transparent p-7 shadow-[0_0_60px_-20px_rgb(198_244_50/0.35)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Crown className="h-5 w-5 text-lime" /> Pro
            </h3>
            <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">Coming soon</span>
          </div>
          <p className="mt-1 text-sm text-muted">For serious progress with an always-on coach.</p>
          <p className="mt-6 flex items-end gap-1">
            <span className="font-display text-5xl font-bold">${billing === "monthly" ? PRO_PRICE.monthly : PRO_PRICE.yearly}</span>
            <span className="pb-1.5 text-sm text-muted">/{billing === "monthly" ? "month" : "year"}</span>
          </p>
          <p className="mt-1 h-5 text-xs text-lime">
            {billing === "yearly" ? `Just $${(PRO_PRICE.yearly / 12).toFixed(2)}/month, billed yearly` : ""}
          </p>
          <FeatureList items={PRO_FEATURES} highlight />
          <WaitlistForm billing={billing} />
        </div>
      </div>
    </section>
  );
}

function FeatureList({ items, highlight }: { items: string[]; highlight?: boolean }) {
  return (
    <ul className="mt-6 flex-1 space-y-3 text-sm">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-3">
          <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", highlight ? "bg-lime text-black" : "bg-lime/10 text-lime")}>
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span className="text-fg/90">{f}</span>
        </li>
      ))}
    </ul>
  );
}

function WaitlistForm({ billing }: { billing: Billing }) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { already: boolean }>(null);

  if (done) {
    return (
      <p className="mt-8 flex items-center gap-2 rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-fg" role="status">
        <Sparkles className="h-4 w-4 shrink-0 text-lime" />
        {done.already ? "You're already on the list — we'll email you when Pro launches." : "You're on the list! We'll email you when Pro launches."}
      </p>
    );
  }

  return (
    <form
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await joinProWaitlist({ email, billing, website });
          if (res.ok) setDone({ already: res.already });
          else setError(res.error);
        });
      }}
    >
      {/* Honeypot for bots — hidden from people and screen readers. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">Email</label>
        <input
          id="waitlist-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          className="h-12 min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-5 text-sm text-fg placeholder:text-muted/70 focus:border-lime/60 focus:outline-none focus:ring-2 focus:ring-lime/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-lime px-6 text-sm font-semibold text-black transition-colors hover:bg-[#d4ff4a] disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Join the waitlist
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-danger">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-muted">No payment now. We&apos;ll only email you about Pro.</p>
      )}
    </form>
  );
}
