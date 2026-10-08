"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { saveTimezone } from "@/app/(app)/actions/profile";

/**
 * Stores the browser's timezone in a cookie so server-rendered "today" matches the user's day,
 * and on the profile so it's kept with the rest of the user's data.
 */
export function TimezoneSync({ current, saved }: { current: string | null; saved: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    if (tz !== saved) void saveTimezone(tz);
    if (tz !== current) {
      document.cookie = `ff_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [current, saved, router]);
  return null;
}
