import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { type AuthUser, createClient, getAuthUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { AIError } from "./client";

type Ctx = { supabase: SupabaseClient; user: AuthUser; profile: Profile; body: unknown };

/** Wraps an AI route: auth + onboarded profile + JSON body + uniform error responses. */
export function aiRoute(handler: (ctx: Ctx) => Promise<unknown>) {
  return async (request: Request) => {
    try {
      const supabase = await createClient();
      const user = await getAuthUser(supabase);
      if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
      if (!profile?.onboarding_complete) {
        return NextResponse.json({ error: "Finish onboarding first." }, { status: 400 });
      }

      const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
      const result = await handler({ supabase, user, profile, body });
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (err) {
      if (err instanceof AIError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid request" }, { status: 400 });
      }
      console.error("[ai-route]", err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
