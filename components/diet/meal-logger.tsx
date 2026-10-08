"use client";

import { PenLine, Sparkles, Wand2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addMeal } from "@/app/(app)/actions/tracking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/choice";
import { Field, Input, Select, Textarea, UnitInput } from "@/components/ui/input";
import type { MealType } from "@/lib/types";

type Totals = { calories: number; protein_g: number; carbs_g: number; fat_g: number };
type Estimate = {
  items: { name: string; quantity: string; calories: number }[];
  confidence: "low" | "medium" | "high";
  note: string;
  totals: Totals;
};

function guessMealType(h: number): MealType {
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

export function MealLogger({ dateKey, hour, autoFocus }: { dateKey: string; hour: number; autoFocus?: boolean }) {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [mealType, setMealType] = useState<MealType>(() => guessMealType(hour));
  const [text, setText] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [totals, setTotals] = useState<Totals>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [desc, setDesc] = useState("");
  const [pending, startTransition] = useTransition();

  async function runEstimate() {
    setEstimating(true);
    try {
      const res = await fetch("/api/ai/estimate-meal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (!json.items.length) {
        toast.error(json.note || "Couldn't recognise any food there");
        return;
      }
      setEstimate(json);
      setTotals(json.totals);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Estimate failed");
    } finally {
      setEstimating(false);
    }
  }

  const reset = () => {
    setText("");
    setDesc("");
    setEstimate(null);
    setTotals({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  };

  const save = (source: "ai" | "manual") =>
    startTransition(async () => {
      const res = await addMeal({
        meal_type: mealType,
        description: (source === "ai" ? text : desc).trim(),
        ...totals,
        source,
        log_date: dateKey,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Meal logged 🍽️");
      reset();
    });

  const setTotal = (k: keyof Totals, v: string) => setTotals((t) => ({ ...t, [k]: Number(v) || 0 }));

  const macroInputs = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Calories"><UnitInput unit="kcal" value={totals.calories} onChange={(e) => setTotal("calories", e.target.value)} /></Field>
      <Field label="Protein"><UnitInput unit="g" value={totals.protein_g} onChange={(e) => setTotal("protein_g", e.target.value)} /></Field>
      <Field label="Carbs"><UnitInput unit="g" value={totals.carbs_g} onChange={(e) => setTotal("carbs_g", e.target.value)} /></Field>
      <Field label="Fat"><UnitInput unit="g" value={totals.fat_g} onChange={(e) => setTotal("fat_g", e.target.value)} /></Field>
    </div>
  );

  return (
    <Card id="log">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Log a meal</h3>
        <Segmented
          options={[
            { value: "ai", label: <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Describe</span> },
            { value: "manual", label: <span className="flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" /> Manual</span> },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            reset();
          }}
        />
      </div>

      <div className="space-y-4">
        <Field label="Meal">
          <Select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="snack">Snack</option>
            <option value="dinner">Dinner</option>
          </Select>
        </Field>

        {mode === "ai" ? (
          <>
            <Field label="What did you eat?" hint='Write it like you would say it, e.g. "2 rotis, a bowl of dal and some salad"'>
              <Textarea
                autoFocus={autoFocus}
                value={text}
                maxLength={500}
                onChange={(e) => {
                  setText(e.target.value);
                  setEstimate(null);
                }}
                placeholder="2 eggs scrambled, 2 slices of toast with butter, a glass of milk"
              />
            </Field>
            {!estimate ? (
              <Button onClick={runEstimate} loading={estimating} disabled={text.trim().length < 2} className="w-full">
                <Wand2 className="h-4 w-4" /> Estimate calories with AI
              </Button>
            ) : (
              <div className="space-y-4 rounded-2xl border border-lime/25 bg-lime/[0.04] p-4">
                <ul className="space-y-1 text-sm">
                  {estimate.items.map((i, idx) => (
                    <li key={idx} className="flex justify-between gap-3">
                      <span className="text-fg/85">
                        {i.quantity} {i.name}
                      </span>
                      <span className="text-muted">{Math.round(i.calories)} kcal</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">
                  Confidence: <span className="capitalize text-fg/80">{estimate.confidence}</span> · {estimate.note}
                </p>
                {macroInputs}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEstimate(null)}>Re-estimate</Button>
                  <Button className="flex-1" onClick={() => save("ai")} loading={pending}>Save meal</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Description">
              <Input value={desc} maxLength={300} onChange={(e) => setDesc(e.target.value)} placeholder="Chicken salad bowl" />
            </Field>
            {macroInputs}
            <Button className="w-full" onClick={() => save("manual")} loading={pending} disabled={!desc.trim()}>
              Save meal
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
