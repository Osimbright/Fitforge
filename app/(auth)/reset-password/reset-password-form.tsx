"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { updatePassword } from "../actions";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-2 text-muted">At least 8 characters with a letter and a number.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await updatePassword({ password });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success("Password updated");
              router.push("/dashboard");
            }
          });
        }}
      >
        <Field label="New password" htmlFor="password">
          <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
