import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Signed-in user + profile, deduplicated per request. Redirects to /login when signed out. */
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return { supabase, user, profile };
});

/** Same as above but also requires finished onboarding. */
export async function requireOnboardedProfile() {
  const ctx = await getSessionProfile();
  if (!ctx.profile?.onboarding_complete) redirect("/onboarding");
  return { ...ctx, profile: ctx.profile };
}
