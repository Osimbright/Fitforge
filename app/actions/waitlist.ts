"use server";

import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/mode";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const waitlistSchema = z.object({
  email: z.email("Enter a valid email").max(254),
  billing: z.enum(["monthly", "yearly"]),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional(),
});

export type WaitlistResult = { ok: true; already: boolean } | { ok: false; error: string };

/** Adds an email to the Pro waitlist (works signed in or out). */
export async function joinProWaitlist(input: unknown): Promise<WaitlistResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    const bot = parsed.error.issues.some((i) => i.path[0] === "website");
    return bot ? { ok: true, already: false } : { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  // Demo mode has no shared database to keep visitor emails in.
  if (DEMO_MODE) return { ok: true, already: false };

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  // No .select(): visitors can add to the list but never read it back.
  const { error } = await supabase
    .from("pro_waitlist")
    .insert({ email: parsed.data.email.trim().toLowerCase(), billing: parsed.data.billing, user_id: user?.id ?? null });

  if (error?.code === "23505") return { ok: true, already: true }; // email already on the list
  if (error) {
    console.error("[waitlist]", error.message);
    return { ok: false, error: "Couldn't join the waitlist right now. Please try again." };
  }
  return { ok: true, already: false };
}
