"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { resendConfirmation } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const COOLDOWN_S = 60;

/** "Resend link" button with a cooldown so people can't trip Supabase's email rate limit. */
export function ResendConfirmation({ email, className }: { email: string; className?: string }) {
  const [pending, startTransition] = useTransition();
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  return (
    <button
      type="button"
      disabled={pending || wait > 0}
      onClick={() =>
        startTransition(async () => {
          const res = await resendConfirmation({ email });
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Link sent");
            setWait(COOLDOWN_S);
          }
        })
      }
      className={cn(
        "cursor-pointer text-sm font-semibold text-lime hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline",
        className,
      )}
    >
      {pending ? "Sending…" : wait > 0 ? `Resend link in ${wait}s` : "Resend confirmation link"}
    </button>
  );
}
