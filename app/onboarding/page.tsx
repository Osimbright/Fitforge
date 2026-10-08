import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand";
import { getSessionProfile } from "@/lib/data/profile";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Set up your plan" };

export default async function OnboardingPage() {
  const { profile } = await getSessionProfile();
  if (profile?.onboarding_complete) redirect("/dashboard");

  return (
    <div className="hero-gradient min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Logo href="/onboarding" />
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16">
        <OnboardingWizard profile={profile} />
      </main>
    </div>
  );
}
