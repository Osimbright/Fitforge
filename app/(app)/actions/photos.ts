"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayKey } from "@/lib/date";
import { authed, fail, type Result } from "./common";

const BUCKET = "progress-photos";
// Photos are downscaled in the browser first, so this is only a backstop.
const MAX_BYTES = 6 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const Meta = z.object({
  caption: z.string().trim().max(200).optional(),
  session_id: z.uuid().optional(),
});

/** Uploads a progress photo to the private bucket and records it. Expects `file`, plus optional `caption` and `session_id`. */
export async function addProgressPhoto(form: FormData): Promise<Result<{ id: string }>> {
  try {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a photo first");
    const ext = TYPES[file.type];
    if (!ext) throw new Error("Use a JPG, PNG or WebP image");
    if (file.size > MAX_BYTES) throw new Error("Photo must be under 6 MB");

    const meta = Meta.parse({
      caption: form.get("caption") || undefined,
      session_id: form.get("session_id") || undefined,
    });
    const { supabase, user } = await authed();

    if (meta.session_id) {
      const { data: session } = await supabase.from("workout_sessions").select("id").eq("id", meta.session_id).eq("user_id", user.id).maybeSingle();
      if (!session) throw new Error("Workout not found");
    }

    // Storage policies only allow writes inside the user's own folder.
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) throw new Error("Upload failed: " + upErr.message);

    const { data, error } = await supabase
      .from("progress_photos")
      .insert({ user_id: user.id, path, taken_on: await todayKey(), caption: meta.caption || null, session_id: meta.session_id ?? null })
      .select("id")
      .single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }
    revalidatePath("/progress");
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProgressPhoto(id: string): Promise<Result> {
  try {
    const { supabase, user } = await authed();
    const { data: photo } = await supabase.from("progress_photos").select("path").eq("id", z.uuid().parse(id)).eq("user_id", user.id).maybeSingle();
    if (!photo) throw new Error("Photo not found");
    await supabase.storage.from(BUCKET).remove([photo.path as string]);
    const { error } = await supabase.from("progress_photos").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/progress");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
