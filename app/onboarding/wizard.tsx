"use client";

import { ArrowLeft, ArrowRight, Building2, House, Sparkles, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ZodType } from "zod";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Button } from "@/components/ui/button";
import { ChoiceCard, Chip, Segmented } from "@/components/ui/choice";
import { Field, Input, Select, Textarea, UnitInput } from "@/components/ui/input";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "@/lib/fitness/calculations";
import {
  ACTIVITY,
  COMMON_ALLERGIES,
  CUISINES,
  DIET_TYPES,
  EXPERIENCE,
  GOALS,
  HOME_EQUIPMENT,
  SESSION_LENGTHS,
} from "@/lib/fitness/options";
import type { Profile } from "@/lib/types";
import {
  bodySchema,
  dietHealthSchema,
  experienceSchema,
  goalSchema,
  locationSchema,
} from "@/lib/validations/onboarding";
import { completeOnboarding, saveOnboardingStep } from "./actions";

type Data = {
  full_name: string;
  phone: string;
  gender?: "male" | "female" | "other";
  dob: string;
  height_cm?: number;
  weight_kg?: number;
  target_weight_kg?: number;
  units: "metric" | "imperial";
  experience_level?: "beginner" | "intermediate" | "advanced";
  training_months: number;
  goal?: "lose_fat" | "build_muscle" | "get_stronger" | "stay_fit" | "endurance";
  days_per_week: number;
  session_minutes: number;
  training_location?: "home" | "gym" | "both";
  equipment: string[];
  diet_type: string;
  allergies: string[];
  cuisine: string;
  meals_per_day: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  injuries: string;
  disclaimer: boolean;
};

// Wizard covers steps 2–6 (step 1 is account creation on /signup).
const STEP_SCHEMAS: Record<number, ZodType> = {
  2: bodySchema,
  3: experienceSchema,
  4: goalSchema,
  5: locationSchema,
  6: dietHealthSchema,
};

const STEP_TITLES: Record<number, [string, string]> = {
  2: ["Tell us about your body", "We use this to calculate your calories and macros accurately."],
  3: ["How experienced are you?", "This sets the difficulty and volume of your workouts."],
  4: ["What's your main goal?", "And how much time can you give it each week?"],
  5: ["Where will you train?", "Your plan will only include exercises you can actually do."],
  6: ["Your diet & health", "So your meal plan fits how you eat — and your plan stays safe."],
};

function initialData(p: Profile | null): Data {
  return {
    full_name: p?.full_name ?? "",
    phone: p?.phone ?? "",
    gender: p?.gender ?? undefined,
    dob: p?.dob ?? "",
    height_cm: p?.height_cm ?? undefined,
    weight_kg: p?.weight_kg ?? undefined,
    target_weight_kg: p?.target_weight_kg ?? undefined,
    units: p?.units ?? "metric",
    experience_level: p?.experience_level ?? undefined,
    training_months: p?.training_months ?? 0,
    goal: p?.goal ?? undefined,
    days_per_week: p?.days_per_week ?? 4,
    session_minutes: p?.session_minutes ?? 45,
    training_location: p?.training_location ?? undefined,
    equipment: p?.equipment ?? [],
    diet_type: p?.diet_type ?? "",
    allergies: p?.allergies ?? [],
    cuisine: p?.cuisine ?? "Indian",
    meals_per_day: p?.meals_per_day ?? 4,
    activity_level: p?.activity_level ?? "light",
    injuries: p?.injuries ?? "",
    disclaimer: false,
  };
}

const num = (v: string) => (v === "" ? undefined : Number(v));

export function OnboardingWizard({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(() => Math.min(6, Math.max(2, (profile?.onboarding_step ?? 1) + 1)));
  const [data, setData] = useState<Data>(() => initialData(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const needsContact = !profile?.phone || !profile?.full_name;

  const set = <K extends keyof Data>(key: K, value: Data[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const toggle = (key: "equipment" | "allergies", value: string) =>
    set(key, data[key].includes(value) ? data[key].filter((x) => x !== value) : [...data[key], value]);

  function validate(): boolean {
    const result = STEP_SCHEMAS[step].safeParse(data);
    const errs: Record<string, string> = {};
    if (!result.success) for (const issue of result.error.issues) errs[String(issue.path[0])] ??= issue.message;
    if (step === 2 && needsContact) {
      if (data.full_name.trim().length < 2) errs.full_name = "Please enter your full name";
      if (!/^\+?[0-9\s-]{7,18}$/.test(data.phone.trim())) errs.phone = "Enter a valid phone number with country code";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (!validate()) return;
    if (step < 6) {
      const { disclaimer: _d, ...rest } = data;
      void saveOnboardingStep(rest, step);
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    startTransition(async () => {
      const { disclaimer: _d, full_name: _f, phone: _p, ...payload } = data;
      const res = await completeOnboarding(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push("/onboarding/forging");
    });
  }

  const [title, subtitle] = STEP_TITLES[step];
  const imperial = data.units === "imperial";
  const ftIn = data.height_cm ? cmToFtIn(data.height_cm) : { ft: undefined, in: undefined };

  return (
    <div className="card p-6 md:p-8">
      <StepProgress step={step} />
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>

      <div key={step} className="mt-8 animate-fade-up space-y-6">
        {step === 2 && (
          <>
            {needsContact && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={errors.full_name}>
                  <Input value={data.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </Field>
                <Field label="Phone number" error={errors.phone}>
                  <Input type="tel" placeholder="+91 98765 43210" value={data.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Units</span>
              <Segmented
                options={[
                  { value: "metric", label: "kg / cm" },
                  { value: "imperial", label: "lb / ft" },
                ]}
                value={data.units}
                onChange={(v) => set("units", v)}
              />
            </div>
            <Field label="Gender" error={errors.gender}>
              <div className="grid grid-cols-3 gap-3">
                {(["male", "female", "other"] as const).map((g) => (
                  <ChoiceCard key={g} selected={data.gender === g} onClick={() => set("gender", g)} title={g[0].toUpperCase() + g.slice(1)} />
                ))}
              </div>
            </Field>
            <Field label="Date of birth" error={errors.dob}>
              <Input type="date" value={data.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set("dob", e.target.value)} />
            </Field>
            <Field label="Height" error={errors.height_cm}>
              {imperial ? (
                <div className="grid grid-cols-2 gap-3">
                  <UnitInput
                    unit="ft"
                    value={ftIn.ft ?? ""}
                    onChange={(e) => set("height_cm", ftInToCm(Number(e.target.value || 0), ftIn.in ?? 0))}
                  />
                  <UnitInput
                    unit="in"
                    value={ftIn.in ?? ""}
                    onChange={(e) => set("height_cm", ftInToCm(ftIn.ft ?? 0, Number(e.target.value || 0)))}
                  />
                </div>
              ) : (
                <UnitInput unit="cm" placeholder="175" value={data.height_cm ?? ""} onChange={(e) => set("height_cm", num(e.target.value))} />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current weight" error={errors.weight_kg}>
                <UnitInput
                  unit={imperial ? "lb" : "kg"}
                  placeholder={imperial ? "165" : "75"}
                  value={data.weight_kg === undefined ? "" : imperial ? kgToLb(data.weight_kg) : data.weight_kg}
                  onChange={(e) => {
                    const v = num(e.target.value);
                    set("weight_kg", v === undefined ? undefined : imperial ? lbToKg(v) : v);
                  }}
                />
              </Field>
              <Field label="Target weight" error={errors.target_weight_kg}>
                <UnitInput
                  unit={imperial ? "lb" : "kg"}
                  placeholder={imperial ? "155" : "70"}
                  value={data.target_weight_kg === undefined ? "" : imperial ? kgToLb(data.target_weight_kg) : data.target_weight_kg}
                  onChange={(e) => {
                    const v = num(e.target.value);
                    set("target_weight_kg", v === undefined ? undefined : imperial ? lbToKg(v) : v);
                  }}
                />
              </Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Field error={errors.experience_level}>
              <div className="space-y-3">
                {EXPERIENCE.map((x) => (
                  <ChoiceCard
                    key={x.value}
                    selected={data.experience_level === x.value}
                    onClick={() => set("experience_level", x.value)}
                    title={x.label}
                    hint={x.hint}
                    icon={x.value === "beginner" ? "🌱" : x.value === "intermediate" ? "⚡" : "🏆"}
                  />
                ))}
              </div>
            </Field>
            <Field label="How many months have you trained consistently?" hint="Rough guess is fine. 0 if you're just starting.">
              <UnitInput unit="months" min={0} value={data.training_months} onChange={(e) => set("training_months", Number(e.target.value || 0))} />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field error={errors.goal}>
              <div className="grid gap-3 sm:grid-cols-2">
                {GOALS.map((g) => (
                  <ChoiceCard key={g.value} selected={data.goal === g.value} onClick={() => set("goal", g.value)} title={g.label} hint={g.hint} icon={g.emoji} />
                ))}
              </div>
            </Field>
            <Field label="Workout days per week">
              <Segmented
                className="flex w-full justify-between"
                options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: n }))}
                value={data.days_per_week}
                onChange={(v) => set("days_per_week", v)}
              />
            </Field>
            <Field label="Time per session">
              <div className="flex flex-wrap gap-2">
                {SESSION_LENGTHS.map((m) => (
                  <Chip key={m} selected={data.session_minutes === m} onClick={() => set("session_minutes", m)}>
                    {m === 75 ? "60+ min" : `${m} min`}
                  </Chip>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 5 && (
          <>
            <Field error={errors.training_location}>
              <div className="grid gap-3 sm:grid-cols-3">
                <ChoiceCard selected={data.training_location === "home"} onClick={() => set("training_location", "home")} title="Home" hint="Living room, garage, park" icon={<House className="h-6 w-6 text-lime" />} />
                <ChoiceCard selected={data.training_location === "gym"} onClick={() => set("training_location", "gym")} title="Gym" hint="Full equipment access" icon={<Building2 className="h-6 w-6 text-lime" />} />
                <ChoiceCard selected={data.training_location === "both"} onClick={() => set("training_location", "both")} title="Both" hint="Switch any time" icon={<Shuffle className="h-6 w-6 text-lime" />} />
              </div>
            </Field>
            {data.training_location && data.training_location !== "gym" && (
              <Field label="What equipment do you have at home?" error={errors.equipment}>
                <div className="flex flex-wrap gap-2">
                  {HOME_EQUIPMENT.map((e) => (
                    <Chip key={e.value} selected={data.equipment.includes(e.value)} onClick={() => toggle("equipment", e.value)}>
                      {e.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        {step === 6 && (
          <>
            <Field label="Diet type" error={errors.diet_type}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {DIET_TYPES.map((d) => (
                  <ChoiceCard key={d.value} selected={data.diet_type === d.value} onClick={() => set("diet_type", d.value)} title={d.label} className="p-3" />
                ))}
              </div>
            </Field>
            <Field label="Allergies or foods to avoid">
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((a) => (
                  <Chip key={a} selected={data.allergies.includes(a)} onClick={() => toggle("allergies", a)}>
                    {a}
                  </Chip>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cuisine you enjoy">
                <Select value={data.cuisine} onChange={(e) => set("cuisine", e.target.value)}>
                  {CUISINES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Meals per day">
                <Segmented
                  className="flex w-full justify-between"
                  options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: n }))}
                  value={data.meals_per_day}
                  onChange={(v) => set("meals_per_day", v)}
                />
              </Field>
            </div>
            <Field label="Activity outside workouts">
              <Select value={data.activity_level} onChange={(e) => set("activity_level", e.target.value as Data["activity_level"])}>
                {ACTIVITY.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label} — {a.hint}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Injuries or medical conditions (optional)" hint="e.g. lower back pain, knee surgery 2023, asthma">
              <Textarea value={data.injuries} maxLength={500} onChange={(e) => set("injuries", e.target.value)} />
            </Field>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[#c6f432]"
                checked={data.disclaimer}
                onChange={(e) => set("disclaimer", e.target.checked)}
              />
              <span className="text-fg/85">
                I understand FitForge provides general fitness and nutrition guidance, not medical advice. I&apos;ll consult a
                doctor before starting if I have health conditions.
                {errors.disclaimer && <span className="mt-1 block text-xs text-danger">{errors.disclaimer}</span>}
              </span>
            </label>
          </>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        {step > 2 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}
        <Button size="lg" onClick={next} loading={pending}>
          {step === 6 ? (
            <>
              Forge my plan <Sparkles className="h-4 w-4" />
            </>
          ) : (
            <>
              Continue <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
