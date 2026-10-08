import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "@/components/profile/settings-form";
import { TestimonialForm } from "@/components/profile/testimonial-form";
import { Card } from "@/components/ui/card";
import { bmi, bmiCategory } from "@/lib/fitness/calculations";
import { requireOnboardedProfile } from "@/lib/data/profile";
import { EXPERIENCE } from "@/lib/fitness/options";
import { createClient } from "@/lib/supabase/server";
import type { Testimonial } from "@/lib/types";

const LOCATION_LABEL = { home: "Home", gym: "Gym", both: "Home + gym" } as const;

export const metadata: Metadata = { title: "Settings" };

export default async function ProfilePage() {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const { data: testimonial } = await supabase.from("testimonials").select("*").eq("user_id", user.id).maybeSingle<Testimonial>();

  // "Priya Nair" → "Priya N." keeps reviews personal without the full surname.
  const [first = "", last = ""] = (profile.full_name ?? "").trim().split(/\s+/);
  const suggestedName = last ? `${first} ${last[0].toUpperCase()}.` : first;
  const suggestedContext = [
    profile.training_location && LOCATION_LABEL[profile.training_location],
    EXPERIENCE.find((e) => e.value === profile.experience_level)?.label,
  ]
    .filter(Boolean)
    .join(" · ");

  const bmiValue = profile.height_cm && profile.weight_kg ? bmi(Number(profile.weight_kg), Number(profile.height_cm)) : null;

  const targets = [
    ["Calories", `${profile.calorie_target} kcal`],
    ["Protein", `${profile.protein_g} g`],
    ["Carbs", `${profile.carbs_g} g`],
    ["Fat", `${profile.fat_g} g`],
    ["Water", `${((profile.water_ml ?? 0) / 1000).toFixed(1)} L`],
    ["BMR / TDEE", `${profile.bmr} / ${profile.tdee}`],
    ["BMI", bmiValue ? `${bmiValue} (${bmiCategory(bmiValue).label})` : "—"],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Your profile drives every plan and target in FitForge." />
      <Card className="mb-6">
        <h2 className="font-semibold">Your daily targets</h2>
        <p className="mt-1 text-xs text-muted">Calculated with Mifflin–St Jeor and your activity level. They update automatically when you change your details or log your weight.</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {targets.map(([k, val]) => (
            <div key={k} className="rounded-2xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 font-semibold">{val}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <TestimonialForm existing={testimonial ?? null} suggestedName={suggestedName} suggestedContext={suggestedContext} />
      <SettingsForm profile={profile} email={user.email ?? ""} />
    </div>
  );
}
