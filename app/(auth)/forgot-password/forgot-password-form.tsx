"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-muted">Enter your email and we&apos;ll send you a reset link.</p>
      {sent ? (
        <p className="mt-8 rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-lime">
          If an account exists for {email}, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await requestPasswordReset({ email });
              if (!res.ok) toast.error(res.error);
              else setSent(true);
            });
          }}
        >
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={pending}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-lime hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
