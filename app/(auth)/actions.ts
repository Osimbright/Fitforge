"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { accountSchema } from "@/lib/validations/onboarding";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// Phone keyboards often capitalise the first letter or add a trailing space.
const emailField = z.string().trim().toLowerCase().pipe(z.email());

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return h.get("origin") ?? `${proto}://${h.get("host")}`;
}

/** Only allow same-site relative redirects. */
function safeNext(next: unknown, fallback: string) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function signUp(input: unknown): Promise<ActionResult & { needsConfirmation?: boolean }> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  const { email, password, full_name, phone } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { ok: false, error: error.message };

  // Email confirmation disabled → we already have a session.
  if (data.session) redirect("/onboarding");
  return { ok: true, needsConfirmation: true };
}

export async function resendConfirmation(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ email: emailField }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "New confirmation link sent" };
}

const loginSchema = z.object({ email: emailField, password: z.string().min(1), next: z.string().optional() });

export async function signIn(input: unknown): Promise<ActionResult & { unconfirmed?: boolean }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter your email and password" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error?.code === "email_not_confirmed") {
    return { ok: false, unconfirmed: true, error: "Confirm your email first — check your inbox for the link." };
  }
  if (error) return { ok: false, error: error.message === "Invalid login credentials" ? "Wrong email or password" : error.message };

  redirect(safeNext(parsed.data.next, "/dashboard"));
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ email: emailField }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "If an account exists, a reset link is on its way." };
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ password: accountSchema.shape.password }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Password updated" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
