"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Divider, GoogleButton } from "@/components/auth/google-button";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signIn } from "../actions";

export function LoginForm({ next, error }: { next?: string; error?: string }) {
  const [pending, startTransition] = useTransition();
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<{ email: string; password: string }>();

  const onSubmit = (values: { email: string; password: string }) =>
    startTransition(async () => {
      const res = await signIn({ ...values, next });
      if (res && !res.ok) {
        if (res.unconfirmed) setUnconfirmedEmail(values.email);
        else toast.error(res.error);
      }
    });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back 👋</h1>
      <p className="mt-2 text-muted">Log in to continue your training.</p>
      {error && (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}
      {unconfirmedEmail && (
        <div className="mt-4 rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm">
          <p className="text-fg">
            Your email isn&apos;t confirmed yet. Click the link we sent to <b>{unconfirmedEmail}</b>, or get a new one.
          </p>
          <ResendConfirmation email={unconfirmedEmail} className="mt-2" />
        </div>
      )}

      <div className="mt-8">
        <GoogleButton next={next ?? "/dashboard"} />
      </div>
      <Divider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required placeholder="you@example.com" {...register("email")} />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required {...register("password")} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-muted hover:text-lime">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to FitForge?{" "}
        <Link href="/signup" className="font-semibold text-lime hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
