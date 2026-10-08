import { ChevronLeft, ChevronRight, ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GeneratePlanButton } from "@/components/app/generate-plan-button";
import { PageHeader } from "@/components/app/page-header";
import { WaterCard } from "@/components/app/water-card";
import { MacroDonut } from "@/components/charts/macro-donut";
import { LoggedMeals } from "@/components/diet/logged-meals";
import { MealLogger } from "@/components/diet/meal-logger";
import { PlanMeals } from "@/components/diet/plan-meals";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { requireOnboardedProfile } from "@/lib/data/profile";
import { getActiveDietPlan } from "@/lib/data/plans";
import { getMealsBetween, getWaterFor, sumMeals } from "@/lib/data/stats";
import { hourIn, shiftKey, todayKey, userTimeZone } from "@/lib/date";

export const metadata: Metadata = { title: "Nutrition" };

export default async function DietPage({ searchParams }: PageProps<"/diet">) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireOnboardedProfile();
  const today = await todayKey();
  const hour = hourIn(await userTimeZone());
  const requested = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const day = requested > today ? today : requested;
  const isToday = day === today;

  const [diet, meals, water] = await Promise.all([
    getActiveDietPlan(supabase, user.id),
    getMealsBetween(supabase, user.id, day, day),
    getWaterFor(supabase, user.id, day),
  ]);
  const totals = sumMeals(meals);
  const target = profile.calorie_target ?? 2000;
  const remaining = Math.round(target - totals.calories);
  const label = isToday
    ? "Today"
    : new Date(day + "T12:00:00").toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div>
      <PageHeader
        title="Nutrition"
        subtitle={`${target} kcal · ${profile.protein_g} g protein · ${profile.carbs_g} g carbs · ${profile.fat_g} g fat per day`}
        action={
          diet ? (
            <GeneratePlanButton kind="diet" label="New meal plan" variant="secondary" size="sm" confirmText="Replace your meal plan with a new AI-generated one?" />
          ) : undefined
        }
      />

      {/* Day switcher */}
      <div className="mb-5 flex items-center gap-2">
        <Link href={`/diet?date=${shiftKey(day, -1)}`} aria-label="Previous day" className="rounded-full border border-line p-2 hover:border-lime/60">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="min-w-36 text-center font-semibold">{label}</span>
        {isToday ? (
          <span className="rounded-full border border-line/40 p-2 text-muted/40"><ChevronRight className="h-4 w-4" /></span>
        ) : (
          <Link href={`/diet?date=${shiftKey(day, 1)}`} aria-label="Next day" className="rounded-full border border-line p-2 hover:border-lime/60">
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Summary</h3>
              <span className={`text-sm font-semibold ${remaining >= 0 ? "text-lime" : "text-ember"}`}>
                {remaining >= 0 ? `${remaining} kcal left` : `${-remaining} kcal over`}
              </span>
            </div>
            <MacroDonut
              calories={totals.calories}
              target={target}
              protein={totals.protein_g}
              carbs={totals.carbs_g}
              fat={totals.fat_g}
              targets={{ protein_g: profile.protein_g ?? 0, carbs_g: profile.carbs_g ?? 0, fat_g: profile.fat_g ?? 0 }}
            />
          </Card>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold">Your meal plan</h2>
            {diet ? (
              <>
                <p className="mb-4 text-sm text-muted">{diet.plan.summary}</p>
                <PlanMeals
                  key={diet.id}
                  meals={diet.plan.meals}
                  eatenKeys={meals.filter((m) => m.plan_meal_key).map((m) => m.plan_meal_key!)}
                  editable={isToday}
                />
              </>
            ) : (
              <Card>
                <EmptyState
                  title="No meal plan yet"
                  body={`We'll build meals around ${target} kcal that match your ${profile.diet_type?.replace("_", "-")} diet and ${profile.cuisine} taste.`}
                  action={<GeneratePlanButton kind="diet" />}
                />
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <MealLogger dateKey={day} hour={hour} autoFocus={sp.log === "1"} />
          <Card>
            <CardHeader title={`Logged ${isToday ? "today" : "this day"}`} />
            <LoggedMeals meals={meals} />
          </Card>
          {isToday && <WaterCard ml={water} target={profile.water_ml ?? 2500} />}
          {diet && (
            <Card>
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
                  <ShoppingBasket className="h-5 w-5 text-lime" /> Weekly grocery list
                </summary>
                <div className="mt-4 space-y-4">
                  {diet.plan.grocery_list.map((g) => (
                    <div key={g.category}>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{g.category}</p>
                      <ul className="mt-1.5 space-y-1 text-sm">
                        {g.items.map((i) => (
                          <li key={i} className="flex items-center gap-2">
                            <input type="checkbox" className="accent-[#c6f432]" aria-label={i} /> {i}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
              {diet.plan.tips.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm text-fg/80">
                  {diet.plan.tips.map((t) => <li key={t}>💡 {t}</li>)}
                </ul>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
