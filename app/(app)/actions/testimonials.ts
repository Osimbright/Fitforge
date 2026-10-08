"use server";

import { revalidatePath } from "next/cache";
import type { Testimonial } from "@/lib/types";
import { testimonialSchema } from "@/lib/validations/testimonial";
import { authed, fail, type Result } from "./common";

/** Creates or updates the user's review. Any edit goes back to 'pending' for approval. */
export async function saveTestimonial(input: unknown): Promise<Result<Testimonial>> {
  try {
    const parsed = testimonialSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review" };
    const { supabase, user } = await authed();

    const { data, error } = await supabase
      .from("testimonials")
      .upsert({ ...parsed.data, user_id: user.id, status: "pending" }, { onConflict: "user_id" })
      .select("*")
      .single<Testimonial>();
    if (error) throw error;
    revalidatePath("/profile");
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTestimonial(): Promise<Result> {
  try {
    const { supabase, user } = await authed();
    const { error } = await supabase.from("testimonials").delete().eq("user_id", user.id);
    if (error) throw error;
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
