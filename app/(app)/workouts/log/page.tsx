import type { Metadata } from "next";
import { todayKey } from "@/lib/date";
import { LogActivityForm } from "./log-form";

export const metadata: Metadata = { title: "Log activity" };

export default async function LogActivityPage() {
  // "Today" comes from the user's timezone cookie, so server and browser agree on the date.
  return <LogActivityForm today={await todayKey()} />;
}
