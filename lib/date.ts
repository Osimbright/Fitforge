import "server-only";
import { cookies } from "next/headers";

export const TZ_COOKIE = "ff_tz";

/** The user's IANA timezone (set by <TimezoneSync/>), falling back to UTC. */
export async function userTimeZone(): Promise<string> {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  if (tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    } catch {
      /* invalid tz cookie */
    }
  }
  return "UTC";
}

/** YYYY-MM-DD for `date` in the given timezone. */
export function dateKeyIn(tz: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export async function todayKey(): Promise<string> {
  return dateKeyIn(await userTimeZone());
}

/** Date key `n` days before the given key. */
export function shiftKey(key: string, days: number): string {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `key`. */
export function weekStartKey(key: string): string {
  const d = new Date(key + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return shiftKey(key, -dow);
}

/** Short weekday name ("Mon") for a date key. */
export function weekdayOf(key: string): "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun" {
  return (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[new Date(key + "T12:00:00Z").getUTCDay()];
}

/** Local hour of day for greetings. */
export function hourIn(tz: string, date: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(date));
}
