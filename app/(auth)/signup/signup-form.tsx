"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Divider, GoogleButton } from "@/components/auth/google-button";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { accountSchema, type AccountInput } from "@/lib/validations/onboarding";
import { signUp } from "../actions";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountInput>({ resolver: zodResolver(accountSchema) });

  const onSubmit = (values: AccountInput) =>
    startTransition(async () => {
      const res = await signUp(values);
      if (!res.ok) toast.error(res.error);
      else if (res.needsConfirmation) setSentTo(values.email);
    });

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime/15 text-lime">
          <MailCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Check your inbox</h1>
        <p className="mt-3 text-muted">
          We sent a confirmation link to <span className="font-semibold text-fg">{sentTo}</span>. Click it to verify
          your email and continue setting up your plan.
        </p>
        <p className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-muted">
          Open the link in <span className="text-fg">this same browser</span>. Can&apos;t find it? Check your spam or
          promotions folder — it comes from Supabase Auth.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <ResendConfirmation email={sentTo} />
          <button type="button" onClick={() => setSentTo(null)} className="cursor-pointer text-sm text-muted hover:text-fg">
            Wrong email? Start over
          </button>
          <Link href="/login" className="text-sm text-muted hover:text-fg">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepProgress step={1} />
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-2 text-muted">Step 1 of 6 — let&apos;s start with the basics.</p>

      <div className="mt-8">
        <GoogleButton next="/onboarding" />
      </div>
      <Divider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
          <Input id="full_name" autoComplete="name" placeholder="Benjamin Carter" aria-invalid={!!errors.full_name} {...register("full_name")} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} hint="Include your country code, e.g. +91 98765 43210">
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" aria-invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters with a letter and a number">
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              className="pr-12"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute inset-y-0 right-3 flex items-center px-1 text-muted hover:text-fg cursor-pointer"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          Create account
        </Button>
        <p className="text-center text-xs text-muted">
          You must be 18 or older. By creating an account you agree to our{" "}
          <Link href="/terms" className="underline hover:text-fg">Terms</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-fg">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-lime hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
