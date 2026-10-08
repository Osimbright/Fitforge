import { cookies } from "next/headers";
import { MobileNav } from "@/components/app/mobile-nav";
import { Sidebar } from "@/components/app/sidebar";
import { TimezoneSync } from "@/components/app/timezone-sync";
import { requireOnboardedProfile } from "@/lib/data/profile";
import { TZ_COOKIE } from "@/lib/date";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOnboardedProfile();
  const tz = (await cookies()).get(TZ_COOKIE)?.value ?? null;

  return (
    <div className="flex min-h-screen">
      <Sidebar name={profile.full_name ?? "Athlete"} level={profile.experience_level ?? "beginner"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 md:px-8 lg:pb-10">{children}</main>
      </div>
      <MobileNav />
      <TimezoneSync current={tz ? decodeURIComponent(tz) : null} saved={profile.timezone} />
    </div>
  );
}
