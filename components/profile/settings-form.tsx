"use client";

import { Download, LogOut } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePassword, signOut } from "@/app/(auth)/actions";
import { deleteAccount, updateProfile } from "@/app/(app)/actions/profile";
import { GeneratePlanButton } from "@/components/app/generate-plan-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, Segmented } from "@/components/ui/choice";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea, UnitInput } from "@/components/ui/input";
import { ACTIVITY, COMMON_ALLERGIES, CUISINES, DIET_TYPES, EXPERIENCE, GOALS, HOME_EQUIPMENT, SESSION_LENGTHS } from "@/lib/fitness/options";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile, email }: { profile: Profile; email: string }) {
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    gender: profile.gender ?? "male",
    dob: profile.dob ?? "",
    height_cm: Number(profile.height_cm ?? 170),
    weight_kg: Number(profile.weight_kg ?? 70),
    target_weight_kg: Number(profile.target_weight_kg ?? 70),
    experience_level: profile.experience_level ?? "beginner",
    goal: profile.goal ?? "stay_fit",
    days_per_week: profile.days_per_week ?? 4,
    session_minutes: profile.session_minutes ?? 45,
    training_location: profile.training_location ?? "gym",
    equipment: profile.equipment ?? [],
    injuries: profile.injuries ?? "",
    diet_type: profile.diet_type ?? "non_veg",
    allergies: profile.allergies ?? [],
    cuisine: profile.cuisine ?? "Any",
    meals_per_day: profile.meals_per_day ?? 4,
    activity_level: profile.activity_level ?? "light",
  });
  const [regen, setRegen] = useState<{ workout: boolean; diet: boolean } | null>(null);
  const [password, setPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const toggle = (k: "equipment" | "allergies", item: string) =>
    set(k, v[k].includes(item) ? v[k].filter((x) => x !== item) : [...v[k], item]);

  const save = () =>
    startTransition(async () => {
      const res = await updateProfile(v);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Profile saved — targets updated");
      if (res.data && (res.data.workoutChanged || res.data.dietChanged)) {
        setRegen({ workout: res.data.workoutChanged, diet: res.data.dietChanged });
      }
    });

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="font-semibold">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={v.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label="Phone"><Input type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email" hint="Email can't be changed here"><Input value={email} disabled /></Field>
          <Field label="Date of birth"><Input type="date" value={v.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
        </div>
        <Field label="Gender">
          <Segmented options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} value={v.gender} onChange={(g) => set("gender", g)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Height"><UnitInput unit="cm" value={v.height_cm} onChange={(e) => set("height_cm", Number(e.target.value))} /></Field>
          <Field label="Weight"><UnitInput unit="kg" step="0.1" value={v.weight_kg} onChange={(e) => set("weight_kg", Number(e.target.value))} /></Field>
          <Field label="Target weight"><UnitInput unit="kg" step="0.1" value={v.target_weight_kg} onChange={(e) => set("target_weight_kg", Number(e.target.value))} /></Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Training</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Experience">
            <Select value={v.experience_level} onChange={(e) => set("experience_level", e.target.value as typeof v.experience_level)}>
              {EXPERIENCE.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </Select>
          </Field>
          <Field label="Goal">
            <Select value={v.goal} onChange={(e) => set("goal", e.target.value as typeof v.goal)}>
              {GOALS.map((x) => <option key={x.value} value={x.value}>{x.emoji} {x.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Days per week">
          <Segmented options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: n }))} value={v.days_per_week} onChange={(n) => set("days_per_week", n)} />
        </Field>
        <Field label="Session length">
          <div className="flex flex-wrap gap-2">
            {SESSION_LENGTHS.map((m) => (
              <Chip key={m} selected={v.session_minutes === m} onClick={() => set("session_minutes", m)}>{m === 75 ? "60+ min" : `${m} min`}</Chip>
            ))}
          </div>
        </Field>
        <Field label="Where you train">
          <Segmented options={[{ value: "home", label: "Home" }, { value: "gym", label: "Gym" }, { value: "both", label: "Both" }]} value={v.training_location} onChange={(l) => set("training_location", l)} />
        </Field>
        {v.training_location !== "gym" && (
          <Field label="Home equipment">
            <div className="flex flex-wrap gap-2">
              {HOME_EQUIPMENT.map((e) => (
                <Chip key={e.value} selected={v.equipment.includes(e.value)} onClick={() => toggle("equipment", e.value)}>{e.label}</Chip>
              ))}
            </div>
          </Field>
        )}
        <Field label="Injuries or conditions"><Textarea value={v.injuries} maxLength={500} onChange={(e) => set("injuries", e.target.value)} /></Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Nutrition</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Diet type">
            <Select value={v.diet_type} onChange={(e) => set("diet_type", e.target.value)}>
              {DIET_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Cuisine">
            <Select value={v.cuisine} onChange={(e) => set("cuisine", e.target.value)}>
              {CUISINES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Meals per day">
            <Segmented options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: n }))} value={v.meals_per_day} onChange={(n) => set("meals_per_day", n)} />
          </Field>
          <Field label="Daily activity">
            <Select value={v.activity_level} onChange={(e) => set("activity_level", e.target.value as typeof v.activity_level)}>
              {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Allergies / avoid">
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGIES.map((a) => (
              <Chip key={a} selected={v.allergies.includes(a)} onClick={() => toggle("allergies", a)}>{a}</Chip>
            ))}
          </div>
        </Field>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
        <Button size="lg" onClick={save} loading={pending} className="shadow-2xl">Save changes</Button>
      </div>

      <Card className="space-y-4">
        <h2 className="font-semibold">Account</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="New password" className="flex-1">
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button
            variant="secondary"
            disabled={password.length < 8}
            onClick={() =>
              startTransition(async () => {
                const res = await updatePassword({ password });
                if (res.ok) {
                  toast.success("Password updated");
                  setPassword("");
                } else toast.error(res.error);
              })
            }
          >
            Change password
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <a href="/api/export" className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold hover:border-lime/60">
            <Download className="h-4 w-4" /> Export my data
          </a>
          <form action={signOut}>
            <Button type="submit" variant="ghost"><LogOut className="h-4 w-4" /> Log out</Button>
          </form>
          <Button variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>Delete account</Button>
        </div>
      </Card>

      <Dialog open={regen !== null} onClose={() => setRegen(null)} title="Update your plans?">
        <p className="text-sm text-muted">You changed details that affect your plans. Want fresh AI plans that match?</p>
        <div className="mt-5 flex flex-col gap-2">
          {regen?.workout && <GeneratePlanButton kind="workout" label="Regenerate workout plan" className="w-full" />}
          {regen?.diet && <GeneratePlanButton kind="diet" label="Regenerate diet plan" variant={regen.workout ? "secondary" : "primary"} className="w-full" />}
          <Button variant="ghost" onClick={() => setRegen(null)}>Not now</Button>
        </div>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <p className="text-sm text-muted">This permanently deletes your profile, plans, logs, chats and photos. This can&apos;t be undone.</p>
        <Field label='Type "DELETE" to confirm' className="mt-4">
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={confirmText !== "DELETE"}
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteAccount(confirmText);
                if (res && !res.ok) toast.error(res.error);
              })
            }
          >
            Delete forever
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
