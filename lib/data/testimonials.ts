import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import type { PublicTestimonial } from "@/lib/types";

// Throws on error so a failed lookup isn't cached; only successful results are kept.
const fetchApproved = unstable_cache(
  async (): Promise<PublicTestimonial[]> => {
    const { data, error } = await createPublicClient().rpc("public_testimonials", { max_rows: 12 });
    if (error) throw new Error(error.message);
    return (data ?? []) as PublicTestimonial[];
  },
  ["approved-testimonials"],
  { revalidate: 300, tags: ["testimonials"] },
);

/**
 * Approved reviews for the landing page. Cached for 5 minutes, so a review you
 * approve in the Supabase dashboard shows up within that window.
 */
export async function getApprovedTestimonials(): Promise<PublicTestimonial[]> {
  try {
    return await fetchApproved();
  } catch (e) {
    // e.g. migration 0004 not applied yet: the landing page falls back to its sample section.
    console.error("public_testimonials failed:", e instanceof Error ? e.message : e);
    return [];
  }
}
